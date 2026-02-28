const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../learning_platform.db');
const db = new Database(dbPath);

const username = process.argv[2];

if (!username) {
    console.error('Please provide a username.');
    console.log('Usage: node scripts/make_admin.js <username>');
    process.exit(1);
}

try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (!user) {
        console.error(`User '${username}' not found.`);
        process.exit(1);
    }

    const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');

    if (!adminRole) {
        console.error("Role 'admin' not found.");
        process.exit(1);
    }

    // Check if willing to promote
    const existingRole = db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?').get(user.id, adminRole.id);

    if (existingRole) {
        console.log(`User '${username}' is already an admin.`);
    } else {
        db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(user.id, adminRole.id);
        console.log(`Successfully promoted '${username}' to admin.`);
    }

} catch (error) {
    console.error('An error occurred:', error.message);
} finally {
    db.close();
}
