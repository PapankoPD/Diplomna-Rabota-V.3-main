const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'learning_platform.db');
const db = new Database(dbPath);

try {
    console.log('Resetting ratings...');

    // Begin transaction
    const updateMaterials = db.prepare('UPDATE materials SET average_rating = 0, rating_count = 0');
    const deleteRatings = db.prepare('DELETE FROM material_ratings');

    db.transaction(() => {
        const resultMaterials = updateMaterials.run();
        console.log(`Updated ${resultMaterials.changes} materials to 0 rating.`);

        // Check if material_ratings table exists before trying to delete
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_ratings'").get();

        if (tableExists) {
            const resultRatings = deleteRatings.run();
            console.log(`Deleted ${resultRatings.changes} acts of rating from material_ratings table.`);
        } else {
            console.log('material_ratings table does not exist, skipping deletion.');
        }
    })();

    console.log('Ratings reset successfully.');

} catch (error) {
    console.error('Error resetting ratings:', error);
} finally {
    db.close();
}
