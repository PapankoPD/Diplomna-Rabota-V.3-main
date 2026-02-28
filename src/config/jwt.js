const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// JWT Configuration
const config = {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

// Validate that secrets are set
if (!config.accessSecret || !config.refreshSecret) {
    console.error('ERROR: JWT secrets are not configured. Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env');
    process.exit(1);
}

// Validate secret strength (minimum 256 bits = 32 bytes = 64 hex chars)
if (config.accessSecret.length < 64 || config.refreshSecret.length < 64) {
    console.warn('WARNING: JWT secrets should be at least 256 bits (64 characters) for production use');
}

/**
 * Generate an access token
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.accessSecret, {
        expiresIn: config.accessExpiresIn,
        issuer: 'auth-rbac-system',
        audience: 'auth-rbac-users'
    });
};

/**
 * Generate a refresh token
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, config.refreshSecret, {
        expiresIn: config.refreshExpiresIn,
        issuer: 'auth-rbac-system',
        audience: 'auth-rbac-users'
    });
};

/**
 * Verify an access token
 * @param {String} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, config.accessSecret, {
            issuer: 'auth-rbac-system',
            audience: 'auth-rbac-users'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Access token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid access token');
        }
        throw error;
    }
};

/**
 * Verify a refresh token
 * @param {String} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.refreshSecret, {
            issuer: 'auth-rbac-system',
            audience: 'auth-rbac-users'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};

/**
 * Generate a secure hash for token storage
 * @param {String} token - Token to hash
 * @returns {String} SHA256 hash of the token
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing accessToken and refreshToken
 */
const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        username: user.username
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return { accessToken, refreshToken };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    hashToken,
    generateTokenPair,
    config
};
