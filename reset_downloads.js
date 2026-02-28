const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'learning_platform.db');
const db = new Database(dbPath);

try {
    console.log('Resetting download counts...');

    // Update materials table
    const updateDownloads = db.prepare('UPDATE materials SET download_count = 0');

    // Check if material_stats table exists (if downloads are tracked there too)
    // Assuming simple structure for now based on materials table schema seen earlier

    const result = updateDownloads.run();
    console.log(`Updated ${result.changes} materials to 0 downloads.`);

    console.log('Download counts reset successfully.');

} catch (error) {
    console.error('Error resetting downloads:', error);
} finally {
    db.close();
}
