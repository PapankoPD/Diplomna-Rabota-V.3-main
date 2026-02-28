const { verifyAccessToken } = require('../config/jwt');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }

        // Check if header starts with "Bearer "
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization format. Use: Bearer <token>'
            });
        }

        // Extract token
        const token = authHeader.substring(7);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verify token
        try {
            const decoded = verifyAccessToken(token);

            // Attach user info to request object
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                username: decoded.username
            };

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Invalid or expired token'
            });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            try {
                const decoded = verifyAccessToken(token);
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    username: decoded.username
                };
            } catch (error) {
                // Token is invalid, but we don't fail - just continue without user
                req.user = null;
            }
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth
};
