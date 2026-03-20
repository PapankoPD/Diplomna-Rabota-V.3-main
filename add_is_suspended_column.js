const { db } = require('./src/config/database');

try {
    console.log('--- Adding is_suspended column to users table ---');
    db.prepare('ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0').run();
    console.log('✓ Successfully added is_suspended column');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('! is_suspended column already exists');
    } else {
        console.error('Failed to add column:', error);
    }
}

process.exit(0);
