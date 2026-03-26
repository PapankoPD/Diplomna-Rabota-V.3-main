const { db } = require('./src/config/database');

try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    console.log("Successfully created missing 'groups' table to satisfy constraints!");
} catch (e) {
    console.error("Failed:", e.message);
}
