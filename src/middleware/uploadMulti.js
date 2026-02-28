const { upload } = require('../config/storage');

/**
 * Multi-file upload middleware with error handling
 * Accepts up to 10 files under the field name 'files'
 */
const uploadMultiMiddleware = (req, res, next) => {
    const uploadMultiple = upload.array('files', 10);

    uploadMultiple(req, res, (err) => {
        if (err) {
            // Multer errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'One or more files exceed the size limit (50MB maximum per file)'
                });
            }

            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum 10 files per upload.'
                });
            }

            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected file field. Use "files" as the field name.'
                });
            }

            // Custom validation errors (e.g., file type not allowed)
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload failed'
            });
        }

        // Check if at least one file was uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded. Please attach at least one file.'
            });
        }

        next();
    });
};

module.exports = {
    uploadMultiMiddleware
};
