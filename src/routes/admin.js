const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const adminOnly = [authenticate, requirePermission('users:read')];

/**
 * GET /api/admin/role-requests
 * List all role requests (pending first, then reviewed)
 */
router.get('/role-requests', adminOnly, async (req, res) => {
    try {
        const result = await query(`
            SELECT rr.id, rr.requested_role, rr.status, rr.message, rr.created_at, rr.updated_at,
                u.id AS user_id, u.username, u.email,
                reviewer.username AS reviewed_by_username
            FROM role_requests rr
            JOIN users u ON rr.user_id = u.id
            LEFT JOIN users reviewer ON rr.reviewed_by = reviewer.id
            ORDER BY
                CASE rr.status WHEN 'pending' THEN 0 ELSE 1 END,
                rr.created_at DESC
        `);
        res.json({ success: true, data: { requests: result.rows } });
    } catch (error) {
        console.error('List role requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve requests' });
    }
});

/**
 * POST /api/admin/role-requests/:id/approve
 * Approve a role request – grants the role to the user
 */
router.post('/role-requests/:id/approve', adminOnly, async (req, res) => {
    try {
        const reqRow = await query(
            `SELECT rr.*, u.id AS uid FROM role_requests rr JOIN users u ON rr.user_id = u.id WHERE rr.id = $1`,
            [req.params.id]
        );
        if (reqRow.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        const roleReq = reqRow.rows[0];
        if (roleReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request already reviewed' });
        }

        // Find the role
        const roleResult = await query(`SELECT id FROM roles WHERE name = $1`, [roleReq.requested_role]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: `Role '${roleReq.requested_role}' not found in database` });
        }
        const roleId = roleResult.rows[0].id;

        // Grant role (ignore if already has it)
        await query(
            `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
            [roleReq.user_id, roleId]
        );

        // Mark as approved
        await query(
            `UPDATE role_requests SET status = 'approved', reviewed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [req.user.userId, req.params.id]
        );

        res.json({ success: true, message: 'Request approved' });
    } catch (error) {
        console.error('Approve role request error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve request' });
    }
});

/**
 * POST /api/admin/role-requests/:id/reject
 * Reject a role request
 */
router.post('/role-requests/:id/reject', adminOnly, async (req, res) => {
    try {
        const reqRow = await query(`SELECT id, status FROM role_requests WHERE id = $1`, [req.params.id]);
        if (reqRow.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (reqRow.rows[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request already reviewed' });
        }

        await query(
            `UPDATE role_requests SET status = 'rejected', reviewed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [req.user.userId, req.params.id]
        );

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        console.error('Reject role request error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject request' });
    }
});

module.exports = router;

