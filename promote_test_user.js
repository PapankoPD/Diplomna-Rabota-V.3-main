const db = require('better-sqlite3')('learning_platform.db');

try {
    // Get user
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('testregistration2@example.com');

    if (user) {
        // Get admin role
        const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get();

        // Assign admin role
        db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(user.id, adminRole.id);
        console.log('Promoted test user to admin');
    }
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
