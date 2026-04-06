const { getClient } = require('../src/config/database');

async function migrate() {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        
        console.log('Creating material_files table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS material_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Check if there are existing materials to migrate
        console.log('Migrating existing files...');
        const materials = await client.query('SELECT id, file_name, file_path, file_type, file_size FROM materials');
        for (const m of materials.rows) {
            // Check if already in material_files (idempotent)
            const exists = await client.query('SELECT 1 FROM material_files WHERE material_id = $1 AND file_path = $2', [m.id, m.file_path]);
            if (exists.rows.length === 0) {
                await client.query(
                    `INSERT INTO material_files (material_id, file_name, file_path, file_type, file_size) VALUES ($1, $2, $3, $4, $5)`,
                    [m.id, m.file_name, m.file_path, m.file_type, m.file_size]
                );
            }
        }
        
        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
