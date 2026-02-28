const bcrypt = require('bcryptjs');
const db = require('better-sqlite3')('learning_platform.db');

try {
    const hash = bcrypt.hashSync('Admin123!', 12);

    // Check if 'admin' user already exists
    const existing = db.prepare("SELECT id FROM users WHERE username = 'admin' OR email = 'admin@admin.com'").get();

    let userId;
    if (existing) {
        userId = existing.id;
        console.log('User "admin" already exists with ID:', userId);
    } else {
        const result = db.prepare(
            'INSERT INTO users (email, username, password_hash, is_verified) VALUES (?, ?, ?, ?)'
        ).run('admin@admin.com', 'admin', hash, 1);
        userId = result.lastInsertRowid;
        console.log('User created with ID:', userId);
    }

    // Check if already has admin role
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get();
    if (!adminRole) {
        console.error('No admin role found in the database!');
        process.exit(1);
    }

    const hasRole = db.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?').get(userId, adminRole.id);
    if (!hasRole) {
        db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, adminRole.id);
        console.log('Admin role assigned.');
    } else {
        console.log('User already has admin role.');
    }

    console.log('');
    console.log('=== Admin Account Ready ===');
    console.log('Email:    admin@admin.com');
    console.log('Username: admin');
    console.log('Password: Admin123!');
} catch (error) {
    console.error('Error:', error.message);
} finally {
    db.close();
}
