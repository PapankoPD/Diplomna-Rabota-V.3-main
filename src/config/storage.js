const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

// Upload directory configuration
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || 'uploads';
const MATERIALS_DIR = path.join(UPLOAD_BASE_DIR, 'materials');

// File size limits (in bytes)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',

    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',

    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',

    // Archives
    'application/zip',
    'application/x-zip-compressed',

    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    // Android Apps
    'application/vnd.android.package-archive'
];

// File extension to MIME type mapping
const EXTENSION_MIME_MAP = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'zip': 'application/zip',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'apk': 'application/vnd.android.package-archive'
};

/**
 * Ensure upload directories exist
 */
const ensureUploadDirs = () => {
    if (!fs.existsSync(UPLOAD_BASE_DIR)) {
        fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
    }
    if (!fs.existsSync(MATERIALS_DIR)) {
        fs.mkdirSync(MATERIALS_DIR, { recursive: true });
    }
};

/**
 * Generate unique filename
 * @param {String} originalName - Original filename
 * @returns {String} Unique filename with UUID
 */
const generateUniqueFilename = (originalName) => {
    const ext = path.extname(originalName);
    const uniqueId = crypto.randomUUID();
    return `${uniqueId}${ext}`;
};

/**
 * Get storage path for a file (organized by year/month)
 * @returns {String} Relative storage path
 */
const getStoragePath = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return path.join(year.toString(), month);
};

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDirs();

        // Create year/month subdirectories
        const storagePath = getStoragePath();
        const fullPath = path.join(MATERIALS_DIR, storagePath);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const uniqueFilename = generateUniqueFilename(file.originalname);
        cb(null, uniqueFilename);
    }
});

/**
 * File filter to validate file types
 */
const fileFilter = (req, file, cb) => {
    // Debug logging
    console.log(`Processing upload: ${file.originalname} (${file.mimetype})`);

    // Check MIME type
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // Check file extension as fallback
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        if (EXTENSION_MIME_MAP[ext]) {
            // Override MIME type if extension is valid
            console.log(`Overriding MIME type for .${ext} to ${EXTENSION_MIME_MAP[ext]}`);
            file.mimetype = EXTENSION_MIME_MAP[ext];
            cb(null, true);
        } else {
            console.error(`File rejected: ${file.originalname} (${file.mimetype})`);
            cb(new Error(`File type not allowed: ${file.mimetype}. Allowed types: PDF, Word, PowerPoint, images, videos, archives.`), false);
        }
    }
};

/**
 * Multer upload configuration
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10 // Up to 10 files per batch upload
    },
    fileFilter: fileFilter
});

/**
 * Get full file path from relative path
 * @param {String} relativePath - Relative path from database
 * @returns {String} Full absolute path
 */
const getFullPath = (relativePath) => {
    return path.join(MATERIALS_DIR, relativePath);
};

/**
 * Delete a file from storage
 * @param {String} relativePath - Relative path from database
 * @returns {Promise<Boolean>} True if deleted successfully
 */
const deleteFile = async (relativePath) => {
    try {
        const fullPath = getFullPath(relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

/**
 * Check if file exists
 * @param {String} relativePath - Relative path from database
 * @returns {Boolean} True if file exists
 */
const fileExists = (relativePath) => {
    const fullPath = getFullPath(relativePath);
    return fs.existsSync(fullPath);
};

/**
 * Get file stats
 * @param {String} relativePath - Relative path from database
 * @returns {Object} File stats (size, etc.)
 */
const getFileStats = (relativePath) => {
    const fullPath = getFullPath(relativePath);
    if (fs.existsSync(fullPath)) {
        return fs.statSync(fullPath);
    }
    return null;
};

module.exports = {
    upload,
    generateUniqueFilename,
    getStoragePath,
    getFullPath,
    deleteFile,
    fileExists,
    getFileStats,
    MATERIALS_DIR,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES
};
