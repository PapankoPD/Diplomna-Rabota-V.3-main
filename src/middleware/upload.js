const { upload } = require('../config/storage');

/**
 * Upload middleware with error handling
 */
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, (err) => {
        if (err) {
            // Multer errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds limit (50MB maximum)'
                });
            }

            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected file field. Use "file" as the field name.'
                });
            }

            // Custom validation errors
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload failed'
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please attach a file.'
            });
        }

        next();
    });
};

module.exports = {
    uploadMiddleware
};
