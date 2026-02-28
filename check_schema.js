const db = require('better-sqlite3')('learning_platform.db');

// Check table schemas
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('users', 'roles', 'user_roles', 'refresh_tokens', 'permissions', 'role_permissions')").all();
tables.forEach(t => {
    console.log('--- ' + t.name + ' ---');
    console.log(t.sql);
    console.log();
});

// Check if roles exist
const roles = db.prepare("SELECT * FROM roles").all();
console.log('--- Roles ---');
console.log(roles);

// Check existing users
const users = db.prepare("SELECT id, email, username FROM users LIMIT 5").all();
console.log('\n--- Users (first 5) ---');
console.log(users);

// Test RETURNING clause
try {
    const testSql = "INSERT INTO users (email, username, password_hash) VALUES ('test_check@test.com', 'testcheck123', 'fakehash') RETURNING id, email, username, created_at";
    const stmt = db.prepare(testSql);
    console.log('\n--- RETURNING clause test: prepare succeeded ---');
    // Don't actually run it, just check if it prepares
} catch (e) {
    console.log('\n--- RETURNING clause test FAILED ---');
    console.log(e.message);
}

db.close();
