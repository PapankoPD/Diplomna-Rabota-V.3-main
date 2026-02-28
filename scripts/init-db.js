const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../learning_platform.db');
const SCHEMA_PATH = path.join(__dirname, '../database/sqlite_schema.sql');

console.log('Initializing SQLite database...');
console.log(`Database path: ${DB_PATH}`);
console.log(`Schema path: ${SCHEMA_PATH}`);

try {
    // Delete existing DB if it exists (optional, maybe check first?)
    if (fs.existsSync(DB_PATH)) {
        console.log('Existing database found. Deleting to start fresh...');
        fs.unlinkSync(DB_PATH);
    }

    const db = new Database(DB_PATH);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Read and execute schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);

    console.log('Database initialized successfully!');

    // Verify tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Created tables:', tables.map(t => t.name).join(', '));

    db.close();
} catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
}
