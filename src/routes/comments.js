const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateUUID, validatePagination } = require('../middleware/validation');

/**
 * GET /api/comments/material/:materialId
 * Get comments for a material (hierarchical)
 */
router.get('/material/:materialId', optionalAuth, validatePagination, async (req, res) => {
    try {
        const materialId = req.params.materialId;
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '50'); // Higher limit for comments
        const offset = (page - 1) * limit;

        // Check if material exists
        const materialCheck = await query('SELECT 1 FROM materials WHERE id = $1', [materialId]);
        if (materialCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Get comments (only active ones unless moderator)
        // If user is moderator, they can see hidden/deleted comments
        let canModerate = false;
        if (req.user) {
            // Check moderation permission
            const modCheck = await query(
                `SELECT 1 FROM user_roles ur
                 JOIN role_permissions rp ON ur.role_id = rp.role_id
                 JOIN permissions p ON rp.permission_id = p.id
                 WHERE ur.user_id = $1 AND p.name = 'comments:moderate'`,
                [req.user.userId]
            );
            canModerate = modCheck.rows.length > 0;
        }

        const statusFilter = canModerate ? '' : " AND c.status = 'active'";

        const commentsResult = await query(
            `SELECT c.id, c.parent_id, c.content, c.is_edited, c.status, c.created_at, c.updated_at,
                    u.id as user_id, u.username,
                    (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id ${statusFilter.replace('c.', 'r.')}) as reply_count
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.material_id = $1 ${statusFilter}
             ORDER BY c.created_at ASC
             LIMIT $2 OFFSET $3`,
            [materialId, limit, offset]
        );

        // Count total
        const countResult = await query(
            `SELECT COUNT(*) as total FROM comments c WHERE material_id = $1 ${statusFilter}`,
            [materialId]
        );

        // Organize into hierarchy
        const comments = commentsResult.rows;

        // Process comments for display
        comments.forEach(comment => {
            // If deleted/hidden and user is not mod, show placeholder
            if (comment.status !== 'active' && !canModerate) {
                comment.content = '[Comment unavailable]';
            }
        });

        res.json({
            success: true,
            data: {
                comments: comments,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.rows[0].total),
                    totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve comments'
        });
    }
});

/**
 * POST /api/comments/:materialId
 * Create a new comment
 */
router.post('/:materialId', authenticate, requirePermission('comments:create'), async (req, res) => {
    try {
        const materialId = req.params.materialId;
        const { content, parentId } = req.body;
        const userId = req.user.userId;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        // Validate material exists
        const materialCheck = await query('SELECT 1 FROM materials WHERE id = $1', [materialId]);
        if (materialCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Validate parent if provided
        if (parentId) {
            const parentCheck = await query('SELECT material_id FROM comments WHERE id = $1', [parentId]);
            if (parentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent comment not found'
                });
            }
            // Ensure parent belongs to same material
            if (parentCheck.rows[0].material_id != materialId) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent comment belongs to a different material'
                });
            }
        }

        const result = await query(
            `INSERT INTO comments (material_id, user_id, parent_id, content)
             VALUES ($1, $2, $3, $4)
             RETURNING id, material_id, user_id, parent_id, content, created_at, status`,
            [materialId, userId, parentId || null, content]
        );

        const newComment = result.rows[0];

        // Add username for immediate display
        const userResult = await query('SELECT username FROM users WHERE id = $1', [userId]);
        newComment.username = userResult.rows[0].username;

        res.status(201).json({
            success: true,
            data: {
                comment: newComment
            }
        });

    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create comment'
        });
    }
});

/**
 * PUT /api/comments/:id
 * Edit a comment
 */
router.put('/:id', authenticate, requirePermission('comments:update'), async (req, res) => {
    try {
        const commentId = req.params.id;
        const { content } = req.body;
        const userId = req.user.userId;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        // Get existing comment
        const commentResult = await query('SELECT * FROM comments WHERE id = $1', [commentId]);
        if (commentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const comment = commentResult.rows[0];

        // Check ownership (or moderator permission)
        let canEdit = comment.user_id == userId;

        if (!canEdit) {
            // Check if moderator
            const modCheck = await query(
                `SELECT 1 FROM user_roles ur
                 JOIN role_permissions rp ON ur.role_id = rp.role_id
                 JOIN permissions p ON rp.permission_id = p.id
                 WHERE ur.user_id = $1 AND p.name = 'comments:moderate'`,
                [userId]
            );
            if (modCheck.rows.length > 0) {
                canEdit = true;
            }
        }

        if (!canEdit) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own comments'
            });
        }

        // Save history before updating
        await query(
            `INSERT INTO comment_history (comment_id, user_id, old_content)
             VALUES ($1, $2, $3)`,
            [commentId, userId, comment.content]
        );

        // Update comment
        const updateResult = await query(
            `UPDATE comments 
             SET content = $1, is_edited = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [content, commentId]
        );

        res.json({
            success: true,
            data: {
                comment: updateResult.rows[0]
            }
        });

    } catch (error) {
        console.error('Edit comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to edit comment'
        });
    }
});

/**
 * DELETE /api/comments/:id
 * Delete (soft delete) a comment
 */
router.delete('/:id', authenticate, requirePermission('comments:delete'), async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.userId;

        // Get existing comment
        const commentResult = await query('SELECT * FROM comments WHERE id = $1', [commentId]);
        if (commentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const comment = commentResult.rows[0];

        // Check ownership or moderator
        let canDelete = comment.user_id == userId;

        if (!canDelete) {
            const modCheck = await query(
                `SELECT 1 FROM user_roles ur
                 JOIN role_permissions rp ON ur.role_id = rp.role_id
                 JOIN permissions p ON rp.permission_id = p.id
                 WHERE ur.user_id = $1 AND p.name = 'comments:moderate'`,
                [userId]
            );
            if (modCheck.rows.length > 0) {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own comments'
            });
        }

        // Soft delete
        await query(
            `UPDATE comments SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [commentId]
        );

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
});

/**
 * PATCH /api/comments/:id/moderate
 * Moderate a comment (hide/restore) - Moderators only
 */
router.patch('/:id/moderate', authenticate, requirePermission('comments:moderate'), async (req, res) => {
    try {
        const commentId = req.params.id;
        const { status } = req.body; // 'active', 'hidden', 'deleted'

        if (!['active', 'hidden', 'deleted'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active, hidden, or deleted'
            });
        }

        const result = await query(
            `UPDATE comments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [status, commentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        res.json({
            success: true,
            message: `Comment status updated to ${status}`,
            data: {
                comment: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Moderate comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to moderate comment'
        });
    }
});

/**
 * GET /api/comments/:id/history
 * Get edit history for a comment
 */
router.get('/:id/history', authenticate, async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.userId;

        // Check permission (only view history if allowed to view comment)
        // For now, assume if you can view the material, you can view the history

        const historyResult = await query(
            `SELECT ch.id, ch.old_content, ch.created_at, u.username
             FROM comment_history ch
             JOIN users u ON ch.user_id = u.id
             WHERE ch.comment_id = $1
             ORDER BY ch.created_at DESC`,
            [commentId]
        );

        res.json({
            success: true,
            data: {
                history: historyResult.rows
            }
        });

    } catch (error) {
        console.error('Get comment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve comment history'
        });
    }
});

module.exports = router;
