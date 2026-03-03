const { query } = require('../src/config/database');

async function migrate() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS material_grade_classes (
                material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
                class_id INTEGER NOT NULL REFERENCES grade_classes(id) ON DELETE CASCADE,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (material_id, class_id)
            )
        `);
        console.log('material_grade_classes table created successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
