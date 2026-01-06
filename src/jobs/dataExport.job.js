/**
 * Data Export Job
 * Processes large export jobs asynchronously
 */

const dataExportService = require('../services/dataExport.service');
const ExportJob = require('../models/exportJob.model');
const logger = require('../utils/logger');
const archiver = require('archiver');
const fs = require('fs').promises;
const path = require('path');
const cloudStorageService = require('../services/cloudStorage.service');

/**
 * Process export job
 * @param {string} jobId - Export job ID
 * @returns {Promise<Object>}
 */
async function processExportJob(jobId) {
  logger.info('='.repeat(80));
  logger.info('DATA EXPORT JOB STARTED');
  logger.info(`Job ID: ${jobId}`);
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info('='.repeat(80));

  let job = null;

  try {
    // Get job details
    job = await ExportJob.findById(jobId);
    if (!job) {
      throw new Error('Export job not found');
    }

    // CRITICAL: Verify firmId is present for multi-tenant isolation
    if (!job.firmId) {
      throw new Error('Export job missing firmId - security violation');
    }

    // Update status to processing
    job.status = 'processing';
    job.startedAt = new Date();
    job.progress = 10;
    await job.save();

    logger.info(`Processing export for entity type: ${job.entityType}`);
    logger.info(`Format: ${job.format}`);
    logger.info(`Firm ID: ${job.firmId}`);

    let buffer;
    let fileName;
    let recordCount = 0;

    // Process based on entity type
    switch (job.entityType) {
      case 'invoices':
        logger.info('Exporting invoices...');
        buffer = await dataExportService.exportInvoices(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `invoices_${Date.now()}.${job.format}`;
        break;

      case 'clients':
        logger.info('Exporting clients...');
        buffer = await dataExportService.exportClients(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `clients_${Date.now()}.${job.format}`;
        break;

      case 'time_entries':
        logger.info('Exporting time entries...');
        buffer = await dataExportService.exportTimeEntries(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `time_entries_${Date.now()}.${job.format}`;
        break;

      case 'expenses':
        logger.info('Exporting expenses...');
        buffer = await dataExportService.exportExpenses(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `expenses_${Date.now()}.${job.format}`;
        break;

      case 'payments':
        logger.info('Exporting payments...');
        buffer = await dataExportService.exportPayments(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `payments_${Date.now()}.${job.format}`;
        break;

      case 'cases':
        logger.info('Exporting cases...');
        buffer = await dataExportService.exportCases(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `cases_${Date.now()}.${job.format}`;
        break;

      case 'audit_logs':
        logger.info('Exporting audit logs...');
        buffer = await dataExportService.exportAuditLog(
          job.firmId,
          job.filters || {},
          job.format
        );
        fileName = `audit_logs_${Date.now()}.${job.format}`;
        break;

      case 'financial_report':
        logger.info('Exporting financial report...');
        buffer = await dataExportService.exportFinancialReport(
          job.firmId,
          job.filters?.dateRange || {},
          job.format
        );
        fileName = `financial_report_${Date.now()}.${job.format}`;
        break;

      case 'ar_aging':
        logger.info('Exporting AR aging report...');
        buffer = await dataExportService.exportARAgingReport(
          job.firmId,
          job.format
        );
        fileName = `ar_aging_${Date.now()}.${job.format}`;
        break;

      case 'trust_account':
        logger.info('Exporting trust account report...');
        buffer = await dataExportService.exportTrustAccountReport(
          job.firmId,
          job.filters?.dateRange || {},
          job.format
        );
        fileName = `trust_account_${Date.now()}.${job.format}`;
        break;

      case 'productivity':
        logger.info('Exporting productivity report...');
        buffer = await dataExportService.exportProductivityReport(
          job.firmId,
          job.filters?.dateRange || {},
          job.format
        );
        fileName = `productivity_${Date.now()}.${job.format}`;
        break;

      default:
        throw new Error(`Unsupported entity type: ${job.entityType}`);
    }

    // Update progress
    job.progress = 60;
    await job.save();

    // Upload to cloud storage
    logger.info('Uploading export file to cloud storage...');
    const uploadResult = await uploadExportFile(buffer, fileName, job);

    // Update progress
    job.progress = 90;
    await job.save();

    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.fileUrl = uploadResult.url;
    job.fileName = fileName;
    job.fileSize = buffer.length;
    job.totalRecords = recordCount;
    job.completedAt = new Date();
    await job.save();

    logger.info('Export completed successfully');
    logger.info(`File URL: ${uploadResult.url}`);
    logger.info(`File size: ${buffer.length} bytes`);
    logger.info('='.repeat(80));

    return {
      success: true,
      jobId: job._id,
      fileUrl: uploadResult.url,
      fileName: fileName,
      fileSize: buffer.length
    };
  } catch (error) {
    logger.error('Export job failed:', error);

    if (job) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      await job.save();
    }

    logger.error('='.repeat(80));
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process bulk export (multiple entity types)
 * @param {string} jobId - Export job ID
 * @param {Array} entityTypes - Array of entity types to export
 * @returns {Promise<Object>}
 */
async function processBulkExport(jobId, entityTypes) {
  logger.info('='.repeat(80));
  logger.info('BULK DATA EXPORT JOB STARTED');
  logger.info(`Job ID: ${jobId}`);
  logger.info(`Entity Types: ${entityTypes.join(', ')}`);
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info('='.repeat(80));

  let job = null;

  try {
    job = await ExportJob.findById(jobId);
    if (!job) {
      throw new Error('Export job not found');
    }

    // CRITICAL: Verify firmId is present for multi-tenant isolation
    if (!job.firmId) {
      throw new Error('Export job missing firmId - security violation');
    }

    job.status = 'processing';
    job.startedAt = new Date();
    job.progress = 5;
    await job.save();

    const tmpDir = path.join('/tmp', `export_${jobId}`);
    await fs.mkdir(tmpDir, { recursive: true });

    const files = [];
    const totalEntities = entityTypes.length;

    // Export each entity type
    for (let i = 0; i < entityTypes.length; i++) {
      const entityType = entityTypes[i];
      logger.info(`Exporting ${entityType} (${i + 1}/${totalEntities})...`);

      let buffer;
      let fileName;

      switch (entityType) {
        case 'invoices':
          buffer = await dataExportService.exportInvoices(job.firmId, job.filters || {}, job.format);
          fileName = `invoices.${job.format}`;
          break;
        case 'clients':
          buffer = await dataExportService.exportClients(job.firmId, job.filters || {}, job.format);
          fileName = `clients.${job.format}`;
          break;
        case 'time_entries':
          buffer = await dataExportService.exportTimeEntries(job.firmId, job.filters || {}, job.format);
          fileName = `time_entries.${job.format}`;
          break;
        case 'expenses':
          buffer = await dataExportService.exportExpenses(job.firmId, job.filters || {}, job.format);
          fileName = `expenses.${job.format}`;
          break;
        case 'payments':
          buffer = await dataExportService.exportPayments(job.firmId, job.filters || {}, job.format);
          fileName = `payments.${job.format}`;
          break;
        case 'cases':
          buffer = await dataExportService.exportCases(job.firmId, job.filters || {}, job.format);
          fileName = `cases.${job.format}`;
          break;
        default:
          logger.warn(`Skipping unsupported entity type: ${entityType}`);
          continue;
      }

      // Save file to temp directory
      const filePath = path.join(tmpDir, fileName);
      await fs.writeFile(filePath, buffer);
      files.push({ path: filePath, name: fileName });

      // Update progress
      job.progress = 10 + Math.floor((i + 1) / totalEntities * 60);
      await job.save();
    }

    // Create ZIP archive
    logger.info('Creating ZIP archive...');
    const zipPath = path.join('/tmp', `export_${jobId}.zip`);
    await createZipArchive(files, zipPath);

    job.progress = 80;
    await job.save();

    // Upload ZIP to cloud storage
    logger.info('Uploading ZIP to cloud storage...');
    const zipBuffer = await fs.readFile(zipPath);
    const uploadResult = await uploadExportFile(
      zipBuffer,
      `export_${Date.now()}.zip`,
      job
    );

    // Cleanup temp files
    logger.info('Cleaning up temporary files...');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.unlink(zipPath).catch(() => {});

    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.fileUrl = uploadResult.url;
    job.fileName = `export_${Date.now()}.zip`;
    job.fileSize = zipBuffer.length;
    job.completedAt = new Date();
    await job.save();

    logger.info('Bulk export completed successfully');
    logger.info('='.repeat(80));

    return {
      success: true,
      jobId: job._id,
      fileUrl: uploadResult.url,
      fileName: job.fileName,
      fileSize: zipBuffer.length
    };
  } catch (error) {
    logger.error('Bulk export job failed:', error);

    if (job) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      await job.save();
    }

    logger.error('='.repeat(80));
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create ZIP archive from files
 * @param {Array} files - Array of file objects with path and name
 * @param {string} outputPath - Output ZIP file path
 * @returns {Promise<void>}
 */
async function createZipArchive(files, outputPath) {
  return new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      logger.info(`ZIP created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add files to archive
    files.forEach(file => {
      archive.file(file.path, { name: file.name });
    });

    archive.finalize();
  });
}

/**
 * Upload export file to cloud storage
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - File name
 * @param {Object} job - Export job
 * @returns {Promise<Object>}
 */
async function uploadExportFile(buffer, fileName, job) {
  try {
    // Check if cloud storage service is available
    if (cloudStorageService && cloudStorageService.uploadFile) {
      // Upload to cloud storage (S3, etc.)
      const result = await cloudStorageService.uploadFile({
        buffer: buffer,
        fileName: fileName,
        folder: `exports/${job.firmId}`,
        contentType: getContentType(fileName)
      });

      return {
        url: result.url || result.Location,
        key: result.key || result.Key
      };
    } else {
      // Fallback: Save to local filesystem
      const exportDir = path.join(process.cwd(), 'uploads', 'exports', job.firmId.toString());
      await fs.mkdir(exportDir, { recursive: true });

      const filePath = path.join(exportDir, fileName);
      await fs.writeFile(filePath, buffer);

      return {
        url: `/exports/${job.firmId}/${fileName}`,
        key: fileName
      };
    }
  } catch (error) {
    logger.error('Error uploading export file:', error);
    throw error;
  }
}

/**
 * Get content type based on file extension
 * @param {string} fileName - File name
 * @returns {string}
 */
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Process export with chunking (for very large datasets)
 * @param {string} jobId - Export job ID
 * @param {number} chunkSize - Number of records per chunk
 * @returns {Promise<Object>}
 */
async function processExportWithChunking(jobId, chunkSize = 1000) {
  logger.info('Processing export with chunking...');
  logger.info(`Chunk size: ${chunkSize} records`);

  // This is a placeholder for chunked processing
  // Implementation would involve:
  // 1. Query data in batches
  // 2. Process each batch
  // 3. Append to export file
  // 4. Update progress after each chunk

  return processExportJob(jobId);
}

module.exports = {
  processExportJob,
  processBulkExport,
  processExportWithChunking
};

// Allow running directly from command line
if (require.main === module) {
  const jobId = process.argv[2];

  if (!jobId) {
    console.error('Usage: node dataExport.job.js <jobId>');
    // Delay exit to allow async operations to complete
    setTimeout(() => process.exit(1), 100);
    return;
  }

  const mongoose = require('mongoose');
  const config = require('../configs/database.config');

  mongoose
    .connect(config.mongoURI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => {
      logger.info('Connected to MongoDB');
      return processExportJob(jobId);
    })
    .then((result) => {
      logger.info('Standalone job completed:', result);
      // Delay exit to allow async operations to complete
      setTimeout(() => process.exit(result.success ? 0 : 1), 100);
    })
    .catch((error) => {
      logger.error('Standalone job failed:', error);
      // Delay exit to allow async operations to complete
      setTimeout(() => process.exit(1), 100);
    });
}
