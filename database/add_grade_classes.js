const { query } = require('../src/config/database');

async function migrate() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS grade_classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(grade_id, name)
            )
        `);
        console.log('grade_classes table created successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
