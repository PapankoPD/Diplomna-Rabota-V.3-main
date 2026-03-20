/**
 * Migration: create role_requests table
 * Run once: node scripts/add_role_requests_table.js
 */
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../learning_platform.db');

const db = new Database(DB_PATH);

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS role_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            requested_role TEXT NOT NULL CHECK(requested_role IN ('teacher', 'admin')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            message TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('✓ role_requests table created (or already exists)');
} catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
} finally {
    db.close();
}
