const { query } = require('../src/config/database');

async function migrate() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS teacher_class_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                class_id INTEGER NOT NULL REFERENCES grade_classes(id) ON DELETE CASCADE,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(teacher_id, class_id)
            )
        `);
        console.log('teacher_class_assignments table created.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}
migrate();
