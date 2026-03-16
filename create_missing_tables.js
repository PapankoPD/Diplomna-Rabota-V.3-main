// Script to create missing database tables
const { db } = require('./src/config/database');

console.log('Creating missing tables...');

const tables = [
    // material_permissions - for fine-grained access control
    `CREATE TABLE IF NOT EXISTS material_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        permission_type TEXT NOT NULL CHECK(permission_type IN ('view', 'edit', 'delete')),
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_id, user_id, role_id, group_id, permission_type)
    )`,
    
    // material_tags - for categorizing materials
    `CREATE TABLE IF NOT EXISTS material_tags (
        material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL,
        PRIMARY KEY (material_id, category_id)
    )`,
    
    // material_versions - for version history
    `CREATE TABLE IF NOT EXISTS material_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        file_path TEXT,
        file_name TEXT,
        file_size INTEGER,
        change_reason TEXT,
        changed_by INTEGER REFERENCES users(id),
        changed_by_username TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
];

for (const sql of tables) {
    try {
        db.prepare(sql).run();
        // Extract table name from SQL
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        console.log('✓ Created table:', match ? match[1] : 'unknown');
    } catch (e) {
        console.error('Error creating table:', e.message);
    }
}

console.log('\nAll done!');
process.exit(0);
