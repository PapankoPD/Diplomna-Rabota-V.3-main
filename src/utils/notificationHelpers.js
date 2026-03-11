const { query } = require('../config/database');

/**
 * Creates a new notification for a user
 * @param {number} userId - ID of the user to receive the notification
 * @param {string} type - 'comment_reply', 'system', 'material_update'
 * @param {string} message - The text of the notification
 * @param {string} link - The internal URL to redirect to upon click
 * @returns {Promise<Object>} The created notification
 */
const createNotification = async (userId, type, message, link = null) => {
    try {
        const result = await query(
            `INSERT INTO notifications (user_id, type, message, link)
             VALUES ($1, $2, $3, $4)
             RETURNING id, user_id, type, message, link, is_read, created_at`,
            [userId, type, message, link]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Failed to create notification:', error);
        throw error;
    }
};

module.exports = {
    createNotification
};
