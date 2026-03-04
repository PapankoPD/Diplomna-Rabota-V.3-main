const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const crypto = require('crypto');

const adminOnly = [authenticate, requirePermission('users:read')];

/**
 * GET /api/admin/teacher-codes
 * List all teacher registration codes
 */
router.get('/teacher-codes', adminOnly, async (req, res) => {
    try {
        const result = await query(`
            SELECT trc.id, trc.code, trc.is_used, trc.created_at, trc.expires_at,
                creator.username AS created_by_username,
                used_user.username AS used_by_username
            FROM teacher_registration_codes trc
            LEFT JOIN users creator ON trc.created_by = creator.id
            LEFT JOIN users used_user ON trc.used_by = used_user.id
            ORDER BY trc.created_at DESC
        `);
        res.json({ success: true, data: { codes: result.rows } });
    } catch (error) {
        console.error('List teacher codes error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve codes' });
    }
});

/**
 * POST /api/admin/teacher-codes
 * Generate a new teacher registration code
 */
router.post('/teacher-codes', adminOnly, async (req, res) => {
    try {
        const { expiresInDays } = req.body;
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const expiresAt = expiresInDays
            ? new Date(Date.now() + parseInt(expiresInDays) * 86400000).toISOString()
            : null;

        const result = await query(
            `INSERT INTO teacher_registration_codes (code, created_by, expires_at) VALUES ($1, $2, $3)
             RETURNING id, code, created_at, expires_at`,
            [code, req.user.userId, expiresAt]
        );

        res.status(201).json({ success: true, data: { code: result.rows[0] } });
    } catch (error) {
        console.error('Generate teacher code error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate code' });
    }
});

/**
 * DELETE /api/admin/teacher-codes/:id
 * Delete (revoke) a teacher registration code
 */
router.delete('/teacher-codes/:id', adminOnly, async (req, res) => {
    try {
        await query('DELETE FROM teacher_registration_codes WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Code deleted' });
    } catch (error) {
        console.error('Delete teacher code error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete code' });
    }
});

module.exports = router;
