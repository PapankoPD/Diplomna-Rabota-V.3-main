const { query } = require('../src/config/database');
const crypto = require('crypto');

async function migrate() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS teacher_registration_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                is_used INTEGER DEFAULT 0,
                used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            )
        `);
        console.log('teacher_registration_codes table created.');

        // Seed 3 starter codes so admin can test immediately
        const codes = [
            crypto.randomBytes(4).toString('hex').toUpperCase(),
            crypto.randomBytes(4).toString('hex').toUpperCase(),
            crypto.randomBytes(4).toString('hex').toUpperCase(),
        ];
        for (const code of codes) {
            await query(
                `INSERT OR IGNORE INTO teacher_registration_codes (code) VALUES ($1)`,
                [code]
            );
            console.log('Seeded code:', code);
        }
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}
migrate();
