const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'learning_platform.db');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath, { verbose: console.log });

try {
    const count = db.prepare('SELECT COUNT(*) as count FROM materials').get();
    console.log('Total materials:', count.count);

    const materials = db.prepare('SELECT id, title, is_public, uploaded_by FROM materials LIMIT 5').all();
    console.log('Sample materials:', materials);

    const users = db.prepare('SELECT id, username FROM users').all();
    console.log('Users:', users);
} catch (error) {
    console.error('Error:', error);
}
