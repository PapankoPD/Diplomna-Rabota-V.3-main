/**
 * Migration: Add is_archived column to materials table
 * Run once: node add_archive_column.js
 */
const path = require('path');
require('dotenv').config();
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'learning_platform.db');
const db = new Database(DB_PATH);

try {
    // Check if column already exists
    const cols = db.pragma('table_info(materials)');
    const alreadyExists = cols.some(c => c.name === 'is_archived');

    if (alreadyExists) {
        console.log('✅ is_archived column already exists — nothing to do.');
    } else {
        db.exec(`ALTER TABLE materials ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;`);
        console.log('✅ Added is_archived column to materials table.');
    }
} catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
} finally {
    db.close();
}
