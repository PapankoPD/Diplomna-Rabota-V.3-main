const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateTokenPair, verifyRefreshToken, hashToken } = require('../config/jwt');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const {
    validateRegistration,
    validateLogin,
    validateRefreshToken
} = require('../middleware/validation');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
    const client = await getClient();

    try {
        const { email, username, password, role, subjectIds, teacherCode } = req.body;

        await client.query('BEGIN');

        const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const usernameCheck = await client.query('SELECT id FROM users WHERE username = $1', [username]);
        if (usernameCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Username already taken' });
        }

        // Validate teacher code if registering as teacher
        let validCode = null;
        if (role === 'teacher') {
            if (!teacherCode) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'A teacher registration code is required' });
            }

            const codeRes = await client.query(
                `SELECT id, is_used, expires_at FROM teacher_registration_codes WHERE code = $1`,
                [teacherCode.trim().toUpperCase()]
            );

            if (codeRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Invalid teacher registration code' });
            }

            const codeRow = codeRes.rows[0];

            if (codeRow.is_used) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'This code has already been used' });
            }

            if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'This code has expired' });
            }

            validCode = codeRow.id;
        }

        const passwordHash = await hashPassword(password);

        const userResult = await client.query(
            `INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)
             RETURNING id, email, username, created_at`,
            [email, username, passwordHash]
        );

        const user = userResult.rows[0];

        // Determine role: 'teacher' or default 'student'
        const roleName = role === 'teacher' ? 'teacher' : 'student';
        const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);

        // Fallback to student role if not found
        const finalRoleRes = roleResult.rows.length > 0
            ? roleResult
            : await client.query('SELECT id FROM roles WHERE name = $1', ['student']);

        if (finalRoleRes.rows.length > 0) {
            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                [user.id, finalRoleRes.rows[0].id]
            );
        }

        // Save teacher subjects
        if (roleName === 'teacher' && Array.isArray(subjectIds) && subjectIds.length > 0) {
            for (const subjectId of subjectIds) {
                await client.query(
                    'INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)',
                    [user.id, subjectId]
                );
            }
        }

        // Mark code as used
        if (validCode) {
            await client.query(
                `UPDATE teacher_registration_codes SET is_used = 1, used_by = $1 WHERE id = $2`,
                [user.id, validCode]
            );
        }

        await client.query('COMMIT');


        const { accessToken, refreshToken } = generateTokenPair(user);
        const tokenHash = hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [user.id, tokenHash, expiresAt]
        );

        const userRolesResult = await query(
            `SELECT r.id, r.name, r.description FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
            [user.id]
        );

        const userPermissionsResult = await query(
            `SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = $1`,
            [user.id]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.created_at,
                    roles: userRolesResult.rows,
                    permissions: userPermissionsResult.rows
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        let message = 'Registration failed';
        let statusCode = 500;
        if (error.message?.includes('UNIQUE constraint failed: users.email')) { message = 'Email already registered'; statusCode = 409; }
        else if (error.message?.includes('UNIQUE constraint failed: users.username')) { message = 'Username already taken'; statusCode = 409; }
        else if (error.message) { message = `Registration failed: ${error.message}`; }
        res.status(statusCode).json({ success: false, message });
    } finally {
        client.release();
    }
});

/**
 * GET /api/auth/my-subjects
 * Returns subjects assigned to the current teacher
 */
router.get('/my-subjects', authenticate, async (req, res) => {
    try {
        const result = await query(
            `SELECT s.id, s.name, s.code, s.description
             FROM subjects s
             INNER JOIN teacher_subjects ts ON s.id = ts.subject_id
             WHERE ts.teacher_id = $1`,
            [req.user.userId]
        );
        res.json({ success: true, data: { subjects: result.rows } });
    } catch (error) {
        console.error('Get teacher subjects error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve subjects' });
    }
});


/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', authLimiter, validateLogin, async (req, res) => {

    try {
        const { email, password } = req.body;

        // Get user from database
        const userResult = await query(
            `SELECT id, email, username, password_hash, failed_login_attempts, locked_until
             FROM users WHERE email = $1`,
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = userResult.rows[0];

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return res.status(403).json({
                success: false,
                message: `Account is locked. Please try again in ${minutesLeft} minutes.`
            });
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password_hash);

        if (!isValidPassword) {
            // Increment failed login attempts
            const newAttempts = user.failed_login_attempts + 1;
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
            const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15');

            if (newAttempts >= maxAttempts) {
                const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
                await query(
                    `UPDATE users 
                     SET failed_login_attempts = $1, locked_until = $2
                     WHERE id = $3`,
                    [newAttempts, lockedUntil, user.id]
                );

                return res.status(403).json({
                    success: false,
                    message: `Account locked due to too many failed attempts. Please try again in ${lockoutMinutes} minutes.`
                });
            } else {
                await query(
                    'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
                    [newAttempts, user.id]
                );

                return res.status(401).json({
                    success: false,
                    message: `Invalid email or password. ${maxAttempts - newAttempts} attempts remaining.`
                });
            }
        }

        // Reset failed login attempts on successful login
        await query(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
            [user.id]
        );

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user);

        // Store refresh token hash
        const tokenHash = hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, tokenHash, expiresAt]
        );

        // Get user's roles
        const rolesResult = await query(
            `SELECT r.id, r.name, r.description
             FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [user.id]
        );

        // Get user's permissions
        const permissionsResult = await query(
            `SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = $1`,
            [user.id]
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: rolesResult.rows,
                    permissions: permissionsResult.rows
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', validateRefreshToken, async (req, res) => {
    const client = await getClient();

    try {
        const { refreshToken } = req.body;

        // Verify refresh token
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        await client.query('BEGIN');

        // Check if token exists and is not revoked
        const tokenHash = hashToken(refreshToken);
        const tokenResult = await client.query(
            `SELECT id, is_revoked, expires_at 
             FROM refresh_tokens 
             WHERE token_hash = $1 AND user_id = $2`,
            [tokenHash, decoded.userId]
        );

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const token = tokenResult.rows[0];

        if (token.is_revoked) {
            await client.query('ROLLBACK');
            return res.status(401).json({
                success: false,
                message: 'Refresh token has been revoked'
            });
        }

        if (new Date(token.expires_at) < new Date()) {
            await client.query('ROLLBACK');
            return res.status(401).json({
                success: false,
                message: 'Refresh token has expired'
            });
        }

        // Revoke old refresh token (token rotation)
        await client.query(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1',
            [token.id]
        );

        // Get user info
        const userResult = await client.query(
            'SELECT id, email, username FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

        // Store new refresh token hash
        const newTokenHash = hashToken(newRefreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, newTokenHash, expiresAt]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken,
                refreshToken: newRefreshToken
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Token refresh failed'
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Revoke the refresh token
        const tokenHash = hashToken(refreshToken);
        await query(
            `UPDATE refresh_tokens 
             SET is_revoked = TRUE 
             WHERE token_hash = $1 AND user_id = $2`,
            [tokenHash, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        // Get user with roles and permissions
        const userResult = await query(
            `SELECT u.id, u.email, u.username, u.is_verified, u.created_at
             FROM users u
             WHERE u.id = $1`,
            [req.user.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get user's roles
        const rolesResult = await query(
            `SELECT r.id, r.name, r.description
             FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [req.user.userId]
        );

        // Get user's permissions
        const permissionsResult = await query(
            `SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = $1`,
            [req.user.userId]
        );

        res.json({
            success: true,
            data: {
                user: {
                    ...user,
                    roles: rolesResult.rows,
                    permissions: permissionsResult.rows
                }
            }
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update current user profile (username, email)
 */
router.put('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, email } = req.body;

        // Validate input
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                message: 'At least one field (username or email) is required'
            });
        }

        // Check username uniqueness if being changed
        if (username) {
            if (username.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Username must be at least 3 characters'
                });
            }
            const usernameCheck = await query(
                'SELECT id FROM users WHERE username = $1 AND id != $2',
                [username, userId]
            );
            if (usernameCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Username already taken'
                });
            }
        }

        // Check email uniqueness if being changed
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
            const emailCheck = await query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered'
                });
            }
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (username) {
            updates.push(`username = $${paramIndex++}`);
            values.push(username);
        }
        if (email) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        const result = await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, username, created_at, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's roles
        const rolesResult = await query(
            `SELECT r.id, r.name, r.description
             FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );

        // Get user's permissions
        const permissionsResult = await query(
            `SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    ...result.rows[0],
                    roles: rolesResult.rows,
                    permissions: permissionsResult.rows
                }
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * PUT /api/auth/password
 * Change current user password
 */
router.put('/password', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }

        // Get current password hash
        const userResult = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, userResult.rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password and update
        const newHash = await hashPassword(newPassword);
        await query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newHash, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

module.exports = router;
