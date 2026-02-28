const path = require('path');
const fs = require('fs');

/**
 * Format file size to human-readable format
 * @param {Number} bytes - File size in bytes
 * @returns {String} Formatted file size (e.g., "1.5 MB")
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {String} filename - Filename with extension
 * @returns {String} File extension without dot
 */
const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase().slice(1);
};

/**
 * Get MIME type category (document, image, video, etc.)
 * @param {String} mimeType - MIME type
 * @returns {String} Category
 */
const getMimeTypeCategory = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.startsWith('text/')) return 'text';
    return 'other';
};

/**
 * Validate filename (no dangerous characters)
 * @param {String} filename - Filename to validate
 * @returns {Boolean} True if valid
 */
const isValidFilename = (filename) => {
    // Disallow path traversal and dangerous characters
    const dangerousPattern = /[<>:"|?*\x00-\x1F]|\.\.|\//;
    return !dangerousPattern.test(filename);
};

/**
 * Sanitize filename
 * @param {String} filename - Original filename
 * @returns {String} Sanitized filename
 */
const sanitizeFilename = (filename) => {
    // Remove dangerous characters
    let sanitized = filename.replace(/[<>:"|?*\x00-\x1F]/g, '_');
    // Remove path separators
    sanitized = sanitized.replace(/[\/\\]/g, '_');
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
    // Limit length
    if (sanitized.length > 255) {
        const ext = path.extname(sanitized);
        const name = path.basename(sanitized, ext);
        sanitized = name.substring(0, 255 - ext.length) + ext;
    }
    return sanitized;
};

/**
 * Create directory recursively if it doesn't exist
 * @param {String} dirPath - Directory path
 */
const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Check if path is safe (no directory traversal)
 * @param {String} filePath - File path to check
 * @param {String} baseDir - Base directory that path should be within
 * @returns {Boolean} True if path is safe
 */
const isSafePath = (filePath, baseDir) => {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedPath.startsWith(resolvedBase);
};

/**
 * Get content type for download
 * @param {String} mimeType - MIME type
 * @returns {String} Content type with charset if applicable
 */
const getContentType = (mimeType) => {
    if (mimeType.startsWith('text/')) {
        return `${mimeType}; charset=utf-8`;
    }
    return mimeType;
};

/**
 * Generate download headers
 * @param {String} filename - Filename for download
 * @param {String} mimeType - MIME type
 * @returns {Object} Headers object
 */
const getDownloadHeaders = (filename, mimeType) => {
    return {
        'Content-Type': getContentType(mimeType),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Content-Type-Options': 'nosniff'
    };
};

module.exports = {
    formatFileSize,
    getFileExtension,
    getMimeTypeCategory,
    isValidFilename,
    sanitizeFilename,
    ensureDirectory,
    isSafePath,
    getContentType,
    getDownloadHeaders
};
