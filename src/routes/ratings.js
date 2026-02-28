const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * GET /api/ratings/:materialId
 * Get rating statistics for a material
 */
router.get('/:materialId', async (req, res) => {
    try {
        const materialId = req.params.materialId;

        // Check if material exists and get its stats
        const result = await query(
            'SELECT average_rating, rating_count FROM materials WHERE id = $1',
            [materialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        res.json({
            success: true,
            data: {
                materialId: parseInt(materialId),
                averageRating: result.rows[0].average_rating,
                ratingCount: result.rows[0].rating_count
            }
        });
    } catch (error) {
        console.error('Get rating stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get rating statistics'
        });
    }
});

/**
 * POST /api/ratings/:materialId
 * Rate a material (1-5 stars)
 * Upserts the rating (insert or update)
 */
router.post('/:materialId', authenticate, requirePermission('ratings:create'), async (req, res) => {
    try {
        const materialId = req.params.materialId;
        const userId = req.user.userId;
        const { rating } = req.body;

        // Validation
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be an integer between 1 and 5'
            });
        }

        // Check if material exists
        const materialCheck = await query('SELECT 1 FROM materials WHERE id = $1', [materialId]);
        if (materialCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Upsert Rating (SQLite specific: INSERT OR REPLACE or ON CONFLICT)
        // Using ON CONFLICT DO UPDATE for SQLite 3.24+
        await query(
            `INSERT INTO material_ratings (material_id, user_id, rating, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT(material_id, user_id) 
             DO UPDATE SET rating = excluded.rating, updated_at = CURRENT_TIMESTAMP`,
            [materialId, userId, rating]
        );

        // Get updated stats immediately to return to client
        const statsCheck = await query(
            'SELECT average_rating, rating_count FROM materials WHERE id = $1',
            [materialId]
        );

        res.json({
            success: true,
            message: 'Rating submitted successfully',
            data: {
                rating: rating,
                materialStats: statsCheck.rows[0]
            }
        });

    } catch (error) {
        console.error('Rate material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit rating'
        });
    }
});

/**
 * DELETE /api/ratings/:materialId
 * Remove a user's rating
 */
router.delete('/:materialId', authenticate, requirePermission('ratings:create'), async (req, res) => {
    try {
        const materialId = req.params.materialId;
        const userId = req.user.userId;

        const result = await query(
            'DELETE FROM material_ratings WHERE material_id = $1 AND user_id = $2',
            [materialId, userId]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found'
            });
        }

        // Get updated stats
        const statsCheck = await query(
            'SELECT average_rating, rating_count FROM materials WHERE id = $1',
            [materialId]
        );

        res.json({
            success: true,
            message: 'Rating removed successfully',
            data: {
                materialStats: statsCheck.rows[0]
            }
        });

    } catch (error) {
        console.error('Delete rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete rating'
        });
    }
});

/**
 * GET /api/ratings/:materialId/user
 * Get the current user's rating for a material
 */
router.get('/:materialId/user', authenticate, async (req, res) => {
    try {
        const materialId = req.params.materialId;
        const userId = req.user.userId;

        const result = await query(
            'SELECT rating FROM material_ratings WHERE material_id = $1 AND user_id = $2',
            [materialId, userId]
        );

        res.json({
            success: true,
            data: {
                rating: result.rows.length > 0 ? result.rows[0].rating : null
            }
        });

    } catch (error) {
        console.error('Get user rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user rating'
        });
    }
});

module.exports = router;
