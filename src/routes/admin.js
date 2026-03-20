const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { emitNotificationToUser } = require('../config/socketManager');

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

        // Ensure user is not suspended if they were suspended during request phase
        await query(
            'UPDATE users SET is_suspended = 0 WHERE id = $1',
            [roleReq.user_id]
        );

        // Notify user about approval
        const message = `Your request for the ${roleReq.requested_role} role was approved!`;
        const link = '/profile';
        const notificationType = 'role_request_approved';

        const notifResult = await query(
            `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING *`,
            [roleReq.user_id, notificationType, message, link]
        );
        emitNotificationToUser(roleReq.user_id, notifResult.rows[0]);

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
        const reqRow = await query(`SELECT id, status, user_id, requested_role FROM role_requests WHERE id = $1`, [req.params.id]);
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

        // Suspend the user account as per request policy
        await query(
            'UPDATE users SET is_suspended = 1 WHERE id = $1',
            [reqRow.rows[0].user_id]
        );

        // Notify user about rejection (though they won't see it until reactivated)
        const message = `Your request for the ${reqRow.rows[0].requested_role} role was declined and your account has been suspended.`;
        const link = '/profile';
        const notificationType = 'role_request_rejected';

        const notifResult = await query(
            `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING *`,
            [reqRow.rows[0].user_id, notificationType, message, link]
        );
        emitNotificationToUser(reqRow.rows[0].user_id, notifResult.rows[0]);

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        console.error('Reject role request error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject request' });
    }
});

module.exports = router;

