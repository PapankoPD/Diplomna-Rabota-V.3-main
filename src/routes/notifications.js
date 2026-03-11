const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Fetch user notifications with pagination
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const offset = (page - 1) * limit;

        const result = await query(
            `SELECT id, type, message, link, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await query(
            `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                notifications: result.rows,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.rows[0].total),
                    totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get the unread notification count
 */
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;

        const countResult = await query(
            `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = 0`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                count: parseInt(countResult.rows[0].total)
            }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve unread count' });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;

        await query(
            `UPDATE notifications SET is_read = 1 WHERE user_id = $1 AND is_read = 0`,
            [userId]
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Read all error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = req.params.id;

        const result = await query(
            `UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2 RETURNING id`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Read notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = req.params.id;

        const result = await query(
            `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
});

module.exports = router;
