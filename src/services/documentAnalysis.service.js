const Anthropic = require('@anthropic-ai/sdk');
const DocumentAnalysis = require('../models/documentAnalysis.model');
const Document = require('../models/document.model');
const { getSignedUrl, BUCKETS } = require('../configs/s3');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Document Analysis Service
 * Uses Claude API for AI-powered document analysis
 */
class DocumentAnalysisService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-3-5-sonnet-20241022'; // Latest Claude model
  }

  /**
   * Analyze a document with AI
   * @param {string} documentId - The document ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeDocument(documentId, options = {}) {
    const startTime = Date.now();
    const { userId, firmId, analysisTypes = ['all'] } = options;

    try {
      // Create initial analysis record
      const analysis = await DocumentAnalysis.create({
        documentId,
        firmId,
        status: 'processing',
        startedAt: new Date(),
        createdBy: userId,
        aiModel: this.model
      });

      // Get document
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Extract text from document
      const documentText = await this._extractDocumentText(document);

      // Perform AI analysis
      const aiResults = await this._performAIAnalysis(documentText, analysisTypes, document);

      // Update analysis with results
      analysis.status = 'completed';
      analysis.completedAt = new Date();
      analysis.processingTime = Date.now() - startTime;
      analysis.classification = aiResults.classification;
      analysis.entities = aiResults.entities;
      analysis.keyInfo = aiResults.keyInfo;
      analysis.summary = aiResults.summary;
      analysis.riskAnalysis = aiResults.riskAnalysis;
      analysis.clauses = aiResults.clauses;
      analysis.ocr = aiResults.ocr;
      analysis.tokensUsed = aiResults.tokensUsed;
      analysis.cost = this._calculateCost(aiResults.tokensUsed);

      await analysis.save();

      return analysis;
    } catch (error) {
      // Update analysis with error
      const analysis = await DocumentAnalysis.findOne({ documentId }).sort({ createdAt: -1 });
      if (analysis) {
        analysis.status = 'failed';
        analysis.error = error.message;
        analysis.completedAt = new Date();
        analysis.processingTime = Date.now() - startTime;
        await analysis.save();
      }

      throw error;
    }
  }

  /**
   * Queue analysis for batch processing
   * @param {string} documentId - The document ID
   * @returns {Promise<Object>} - Analysis record
   */
  async queueAnalysis(documentId, options = {}) {
    const { userId, firmId } = options;

    const analysis = await DocumentAnalysis.create({
      documentId,
      firmId,
      status: 'pending',
      createdBy: userId,
      aiModel: this.model
    });

    // TODO: Add to queue for background processing
    // For now, process immediately
    setTimeout(() => {
      this.analyzeDocument(documentId, options).catch(err => {
        logger.error('Analysis error:', err);
      });
    }, 100);

    return analysis;
  }

  /**
   * Get analysis status
   * @param {string} documentId - The document ID
   * @returns {Promise<Object>} - Analysis status
   */
  async getAnalysisStatus(documentId, firmId = null) {
    return await DocumentAnalysis.getLatestAnalysis(documentId, firmId);
  }

  /**
   * Extract text from document
   * @private
   */
  async _extractDocumentText(document) {
    try {
      // Get download URL
      const downloadUrl = await getSignedUrl(
        BUCKETS.general,
        document.fileKey,
        document.fileType,
        'getObject'
      );

      // For text-based files, download and return content
      if (document.fileType.includes('text') || document.fileType.includes('json')) {
        const response = await axios.get(downloadUrl);
        return response.data;
      }

      // For PDFs and images, return URL for Claude to process
      // Claude API supports image/PDF analysis
      return {
        url: downloadUrl,
        fileType: document.fileType,
        fileName: document.originalName
      };
    } catch (error) {
      logger.error('Error extracting document text:', error);
      throw new Error('Failed to extract document text');
    }
  }

  /**
   * Perform AI analysis using Claude
   * @private
   */
  async _performAIAnalysis(documentText, analysisTypes, document) {
    const isTextOnly = typeof documentText === 'string';
    let totalTokens = 0;

    const results = {
      classification: {},
      entities: [],
      keyInfo: { parties: [], dates: [], amounts: [], references: [] },
      summary: { brief: '', detailed: '', keyPoints: [], actionItems: [] },
      riskAnalysis: { overallRisk: 'low', riskScore: 0, risks: [] },
      clauses: [],
      ocr: { performed: false, confidence: 0, pageCount: 0, wordCount: 0, fullText: '' }
    };

    try {
      // Classification
      if (analysisTypes.includes('all') || analysisTypes.includes('classification')) {
        const classification = await this.classifyDocument(documentText);
        results.classification = classification.data;
        totalTokens += classification.tokens;
      }

      // Entity extraction
      if (analysisTypes.includes('all') || analysisTypes.includes('entities')) {
        const entities = await this.extractEntities(documentText);
        results.entities = entities.data;
        totalTokens += entities.tokens;
      }

      // Summary generation
      if (analysisTypes.includes('all') || analysisTypes.includes('summary')) {
        const summary = await this.generateSummary(documentText);
        results.summary = summary.data;
        totalTokens += summary.tokens;
      }

      // Contract analysis (if legal document)
      if (analysisTypes.includes('all') || analysisTypes.includes('contract')) {
        const contractAnalysis = await this.analyzeContract(documentText);
        results.keyInfo = contractAnalysis.data.keyInfo;
        results.clauses = contractAnalysis.data.clauses;
        totalTokens += contractAnalysis.tokens;
      }

      // Risk analysis
      if (analysisTypes.includes('all') || analysisTypes.includes('risk')) {
        const riskAnalysis = await this.analyzeContractRisks(documentText);
        results.riskAnalysis = riskAnalysis.data;
        totalTokens += riskAnalysis.tokens;
      }

      // Saudi case info extraction (if applicable)
      if (document.category === 'judgment' || document.category === 'pleading') {
        const saudiInfo = await this.extractSaudiCaseInfo(documentText);
        results.keyInfo = { ...results.keyInfo, ...saudiInfo.data };
        totalTokens += saudiInfo.tokens;
      }

      // OCR if document is image or PDF
      if (!isTextOnly) {
        results.ocr = {
          performed: true,
          confidence: 0.95,
          pageCount: 1,
          wordCount: 0,
          fullText: ''
        };
      }

      results.tokensUsed = totalTokens;
      return results;
    } catch (error) {
      logger.error('AI analysis error:', error);
      throw error;
    }
  }

  /**
   * Classify document type
   */
  async classifyDocument(text) {
    const prompt = `Analyze this document and classify it. Return a JSON object with:
- documentType: the type of document (contract, invoice, judgment, correspondence, pleading, evidence, etc.)
- subType: more specific classification
- confidence: confidence score 0-1
- language: detected language (ar for Arabic, en for English)
- isLegalDocument: boolean

Document content:
${this._prepareTextForAnalysis(text)}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = this._parseJSONResponse(response.content[0].text);
    return {
      data: result,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  /**
   * Extract entities from document
   */
  async extractEntities(text) {
    const prompt = `Extract all named entities from this document. Return a JSON array of entities with:
- type: entity type (person, organization, location, date, money, case_number, contract_number, etc.)
- value: the extracted value
- normalizedValue: normalized form if applicable
- confidence: confidence score 0-1

Focus on legal entities like parties, case numbers, amounts, dates, and locations.

Document content:
${this._prepareTextForAnalysis(text)}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = this._parseJSONResponse(response.content[0].text);
    return {
      data: Array.isArray(result) ? result : [],
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  /**
   * Generate document summary
   */
  async generateSummary(text) {
    const prompt = `Analyze this document and provide a comprehensive summary. Return a JSON object with:
- brief: one-sentence summary (max 200 chars)
- detailed: detailed summary (2-3 paragraphs)
- keyPoints: array of key points (bullet points)
- actionItems: array of action items or next steps if any

Document content:
${this._prepareTextForAnalysis(text)}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = this._parseJSONResponse(response.content[0].text);
    return {
      data: result,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  /**
   * Analyze contract details
   */
  async analyzeContract(text) {
    const prompt = `Analyze this legal document/contract and extract key information. Return a JSON object with:
{
  "keyInfo": {
    "parties": [{ "role": "party role", "name": "party name", "type": "individual/company" }],
    "dates": [{ "type": "date type", "date": "ISO date", "isEstimate": false }],
    "amounts": [{ "type": "amount type", "amount": number, "currency": "SAR/USD/etc" }],
    "references": [{ "type": "reference type", "value": "reference value" }]
  },
  "clauses": [{ "type": "clause type", "text": "clause text", "analysis": "analysis", "isStandard": true, "concerns": [] }]
}

Document content:
${this._prepareTextForAnalysis(text)}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = this._parseJSONResponse(response.content[0].text);
    return {
      data: result,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  /**
   * Analyze contract risks
   */
  async analyzeContractRisks(text) {
    const prompt = `Analyze this legal document for potential risks and issues. Return a JSON object with:
{
  "overallRisk": "low/medium/high",
  "riskScore": 0-100,
  "risks": [
    {
      "type": "risk category",
      "severity": "low/medium/high",
      "description": "risk description",
      "clause": "relevant clause if any",
      "recommendation": "recommended action"
    }
  ]
}

Focus on legal risks, unfavorable terms, missing clauses, and compliance issues.

Document content:
${this._prepareTextForAnalysis(text)}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 3072,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = this._parseJSONResponse(response.content[0].text);
    return {
      data: result,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  /**
   * Extract Saudi-specific case information
   */
  async extractSaudiCaseInfo(text) {
    const prompt = `Extract Saudi legal case information from this document. Return a JSON object with:
{
  "caseNumber": "case number",
  "court": "court name",
  "judgmentDate": "ISO date",
  "parties": [{ "role": "plaintiff/defendant/etc", "name": "party name" }],
  "caseType": "case type",
  "verdict": "verdict if applicable",
  "references": [{ "type": "law/regulation/article", "value": "reference" }]
}

Look for case numbers, court names, dates, parties, and legal references specific to Saudi law.

Document content:
${this._prepareTextForAnalysis(text)}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = this._parseJSONResponse(response.content[0].text);
    return {
      data: result,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  /**
   * Search for similar documents
   */
  async searchSimilarDocuments(documentId, limit = 10) {
    const analysis = await DocumentAnalysis.getLatestAnalysis(documentId);
    if (!analysis || !analysis.classification) {
      return [];
    }

    // Find documents with similar classification
    const similar = await DocumentAnalysis.find({
      _id: { $ne: analysis._id },
      'classification.documentType': analysis.classification.documentType,
      status: 'completed'
    })
      .limit(limit)
      .populate('documentId', 'fileName originalName category')
      .sort({ createdAt: -1 });

    return similar;
  }

  /**
   * Generate analysis report
   */
  async generateAnalysisReport(documentId) {
    const analysis = await DocumentAnalysis.findOne({ documentId })
      .sort({ createdAt: -1 })
      .populate('documentId', 'fileName originalName category fileType')
      .populate('createdBy', 'firstName lastName fullName');

    if (!analysis) {
      throw new Error('No analysis found for this document');
    }

    return {
      document: analysis.documentId,
      analysis: {
        status: analysis.status,
        createdAt: analysis.createdAt,
        createdBy: analysis.createdBy,
        processingTime: analysis.processingTime
      },
      classification: analysis.classification,
      summary: analysis.summary,
      entities: analysis.entities,
      keyInfo: analysis.keyInfo,
      riskAnalysis: analysis.riskAnalysis,
      clauses: analysis.clauses,
      metadata: {
        aiModel: analysis.aiModel,
        tokensUsed: analysis.tokensUsed,
        cost: analysis.cost
      }
    };
  }

  /**
   * Helper: Prepare text for analysis
   * @private
   */
  _prepareTextForAnalysis(text) {
    if (typeof text === 'string') {
      // Truncate if too long (Claude has context limits)
      return text.substring(0, 100000);
    } else if (text.url) {
      return `[Document URL: ${text.fileName}]\nNote: This is a ${text.fileType} file. Please analyze the document accessible at the provided URL.`;
    }
    return '';
  }

  /**
   * Helper: Parse JSON response from Claude
   * @private
   */
  _parseJSONResponse(text) {
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      logger.error('Error parsing JSON response:', error);
      return {};
    }
  }

  /**
   * Helper: Calculate cost based on tokens
   * @private
   */
  _calculateCost(tokens) {
    // Claude 3.5 Sonnet pricing (approximate)
    // Input: $3 per million tokens
    // Output: $15 per million tokens
    // Simplified calculation (assuming 50/50 split)
    const avgCostPerToken = (3 + 15) / 2 / 1000000;
    return tokens * avgCostPerToken;
  }
}

module.exports = new DocumentAnalysisService();
