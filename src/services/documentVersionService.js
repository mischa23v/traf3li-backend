const Document = require('../models/document.model');
const DocumentVersion = require('../models/documentVersion.model');

/**
 * Document Version Service
 * Handles document version management operations
 */
class DocumentVersionService {
  /**
   * Upload a new version of a document
   * Saves the current version to history before updating
   * SECURITY: Requires firmId for multi-tenant isolation
   * @param {string} documentId - The document ID
   * @param {Object} file - The uploaded file object
   * @param {string} userId - The user uploading the new version
   * @param {string} changeNote - Optional note describing the changes
   * @param {string} firmId - The firm ID for multi-tenant isolation
   * @returns {Promise<Object>} - The updated document
   */
  static async uploadVersion(documentId, file, userId, changeNote, firmId = null) {
    // SECURITY: Build query with firmId for multi-tenant isolation
    const query = { _id: documentId };
    if (firmId) {
      query.firmId = firmId;
    }
    const document = await Document.findOne(query);
    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Save current version to standalone version history
    await DocumentVersion.create({
      documentId,
      version: document.version || 1,
      originalName: document.originalName,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.fileType,
      fileType: document.fileType,
      storageKey: document.fileKey,
      url: document.url,
      uploadedBy: document.uploadedBy,
      changeNote: document.lastChangeNote || 'Initial version'
    });

    // Also save to embedded versions array for backwards compatibility
    document.versions.push({
      version: document.version || 1,
      fileName: document.fileName,
      originalName: document.originalName,
      fileSize: document.fileSize,
      url: document.url,
      fileKey: document.fileKey,
      uploadedBy: document.uploadedBy,
      changeNote: document.lastChangeNote || 'Initial version'
    });

    // Update document with new version
    document.version = (document.version || 1) + 1;
    document.originalName = file.originalname || file.originalName;
    document.fileName = file.filename || file.fileName;
    document.fileSize = file.size || file.fileSize;
    document.fileType = file.mimetype || file.mimeType || file.fileType;
    document.fileKey = file.key || file.fileKey || file.storageKey;
    document.url = file.url || file.location;
    document.uploadedBy = userId;
    document.lastChangeNote = changeNote;
    document.updatedAt = new Date();

    await document.save();
    return document;
  }

  /**
   * Get version history for a document
   * Combines standalone versions and embedded versions for complete history
   * SECURITY: Requires firmId for multi-tenant isolation
   * @param {string} documentId - The document ID
   * @param {string} firmId - The firm ID for multi-tenant isolation
   * @returns {Promise<Array>} - Array of versions
   */
  static async getVersions(documentId, firmId = null) {
    // Get standalone versions
    const standaloneVersions = await DocumentVersion.getVersionHistory(documentId);

    // SECURITY: Build query with firmId for multi-tenant isolation
    const query = { _id: documentId };
    if (firmId) {
      query.firmId = firmId;
    }
    const document = await Document.findOne(query)
      .populate('versions.uploadedBy', 'firstName lastName fullName')
      .lean();

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Combine versions, preferring standalone versions
    const standaloneVersionNumbers = new Set(standaloneVersions.map(v => v.version));
    const embeddedVersions = (document.versions || [])
      .filter(v => !standaloneVersionNumbers.has(v.version))
      .map(v => ({
        ...v,
        documentId,
        storageKey: v.fileKey,
        mimeType: document.fileType,
        isEmbedded: true
      }));

    // Add current version info
    const currentVersion = {
      documentId,
      version: document.version || 1,
      originalName: document.originalName,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.fileType,
      fileType: document.fileType,
      storageKey: document.fileKey,
      url: document.url,
      uploadedBy: document.uploadedBy,
      changeNote: document.lastChangeNote,
      createdAt: document.updatedAt || document.createdAt,
      isCurrent: true
    };

    // Combine and sort all versions
    const allVersions = [currentVersion, ...standaloneVersions, ...embeddedVersions]
      .sort((a, b) => b.version - a.version);

    // Remove duplicates by version number
    const uniqueVersions = [];
    const seenVersions = new Set();
    for (const version of allVersions) {
      if (!seenVersions.has(version.version)) {
        seenVersions.add(version.version);
        uniqueVersions.push(version);
      }
    }

    return uniqueVersions;
  }

  /**
   * Restore a previous version
   * SECURITY: Requires firmId for multi-tenant isolation
   * @param {string} documentId - The document ID
   * @param {string} versionId - The version ID to restore
   * @param {string} userId - The user restoring the version
   * @param {string} firmId - The firm ID for multi-tenant isolation
   * @returns {Promise<Object>} - The updated document
   */
  static async restoreVersion(documentId, versionId, userId, firmId = null) {
    // Try to find the version in standalone versions
    let version = await DocumentVersion.findById(versionId);

    // SECURITY: Build query with firmId for multi-tenant isolation
    const query = { _id: documentId };
    if (firmId) {
      query.firmId = firmId;
    }

    // If not found in standalone, check embedded versions
    if (!version) {
      const document = await Document.findOne(query);
      if (!document) {
        throw new Error('Document not found or access denied');
      }

      const embeddedVersion = document.versions.id(versionId);
      if (!embeddedVersion) {
        throw new Error('Version not found');
      }

      // Convert embedded version to version-like object
      version = {
        version: embeddedVersion.version,
        originalName: embeddedVersion.originalName,
        fileName: embeddedVersion.fileName,
        fileSize: embeddedVersion.fileSize,
        storageKey: embeddedVersion.fileKey,
        url: embeddedVersion.url,
        uploadedBy: embeddedVersion.uploadedBy
      };
    }

    // SECURITY: Use firmId query for multi-tenant isolation
    const document = await Document.findOne(query);
    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Save current version to history before restoring
    await DocumentVersion.create({
      documentId,
      version: document.version,
      originalName: document.originalName,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.fileType,
      fileType: document.fileType,
      storageKey: document.fileKey,
      url: document.url,
      uploadedBy: document.uploadedBy,
      changeNote: `Replaced by restore of v${version.version}`
    });

    // Also save to embedded versions
    document.versions.push({
      version: document.version,
      fileName: document.fileName,
      originalName: document.originalName,
      fileSize: document.fileSize,
      url: document.url,
      fileKey: document.fileKey,
      uploadedBy: document.uploadedBy,
      changeNote: `Replaced by restore of v${version.version}`
    });

    // Restore the old version
    document.version += 1;
    document.originalName = version.originalName;
    document.fileName = version.fileName;
    document.fileSize = version.fileSize;
    document.fileType = version.mimeType || version.fileType || document.fileType;
    document.fileKey = version.storageKey || version.fileKey;
    document.url = version.url;
    document.uploadedBy = userId;
    document.lastChangeNote = `Restored from v${version.version}`;

    await document.save();
    return document;
  }

  /**
   * Get a specific version by version number
   * SECURITY: Requires firmId for multi-tenant isolation
   * @param {string} documentId - The document ID
   * @param {number} versionNumber - The version number
   * @param {string} firmId - The firm ID for multi-tenant isolation
   * @returns {Promise<Object>} - The version
   */
  static async getVersionByNumber(documentId, versionNumber, firmId = null) {
    // First check standalone versions
    const standaloneVersion = await DocumentVersion.getVersion(documentId, versionNumber);
    if (standaloneVersion) {
      return standaloneVersion;
    }

    // SECURITY: Build query with firmId for multi-tenant isolation
    const query = { _id: documentId };
    if (firmId) {
      query.firmId = firmId;
    }
    const document = await Document.findOne(query)
      .populate('versions.uploadedBy', 'firstName lastName fullName')
      .lean();

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // If requesting current version
    if (versionNumber === document.version) {
      return {
        documentId,
        version: document.version,
        originalName: document.originalName,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.fileType,
        storageKey: document.fileKey,
        url: document.url,
        uploadedBy: document.uploadedBy,
        createdAt: document.updatedAt || document.createdAt,
        isCurrent: true
      };
    }

    // Find in embedded versions
    const embeddedVersion = document.versions.find(v => v.version === versionNumber);
    if (embeddedVersion) {
      return {
        ...embeddedVersion,
        documentId,
        storageKey: embeddedVersion.fileKey,
        isEmbedded: true
      };
    }

    return null;
  }
}

module.exports = DocumentVersionService;
