const bcrypt = require('bcryptjs');
const db = require('better-sqlite3')('learning_platform.db');

try {
    const hash = bcrypt.hashSync('Admin123!', 12);

    // Create the user (id is INTEGER autoincrement)
    const result = db.prepare(
        'INSERT INTO users (email, username, password_hash, is_verified) VALUES (?, ?, ?, ?)'
    ).run('newadmin@example.com', 'newadmin', hash, 1);

    const userId = result.lastInsertRowid;
    console.log('User created with ID:', userId);

    // Assign admin role
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get();
    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, adminRole.id);

    console.log('');
    console.log('Admin account created successfully!');
    console.log('Email:    newadmin@example.com');
    console.log('Password: Admin123!');
} catch (error) {
    console.error('Error:', error.message);
} finally {
    db.close();
}
