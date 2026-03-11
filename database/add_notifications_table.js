/**
 * Migration: Add notifications table
 * Run once: node database/add_notifications_table.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../learning_platform.db');
const db = new Database(DB_PATH);

try {
    // Check if table already exists
    const tables = db.pragma('table_list');
    const tableExists = tables.some(t => t.name === 'notifications');

    if (tableExists) {
        console.log('✅ notifications table already exists — nothing to do.');
    } else {
        db.exec(`
            CREATE TABLE notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX idx_notifications_is_read ON notifications(is_read);
        `);
        console.log('✅ Created notifications table.');
    }
} catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
} finally {
    db.close();
}
