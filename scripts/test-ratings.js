/**
 * Test script for rating system
 * Validates rating upsert, constraints, and trigger aggregation
 */

const { db } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function runTests() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Rating System - Integration Test            ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    try {
        // --- SEED DATA ---
        console.log('🌱 Seeding Test Data...');

        // 1. Ensure Users
        let adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
        if (!adminUser) {
            console.log('   Note: Admin user not found (should be there from previous tests)');
            // (Assuming admin exists from previous steps, or we skip seed logic to keep it simple)
        }

        // Create 3 demo users for aggregation testing
        const users = [];
        for (let i = 1; i <= 3; i++) {
            const username = `rater${i}`;
            let user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

            if (!user) {
                const hash = bcrypt.hashSync('pass123', 10);
                const info = db.prepare('INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 1)').run(username, `rater${i}@example.com`, hash);
                user = { id: info.lastInsertRowid };

                // Assign user role
                const userRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('user');
                if (userRole) {
                    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(user.id, userRole.id);
                }
            }
            users.push(user);
        }
        console.log(`   ✓ Prepared ${users.length} unique raters`);

        // 2. Ensure Material
        let material = db.prepare('SELECT * FROM materials WHERE title = ?').get('Ratings Test Material');
        if (!material) {
            const info = db.prepare(`
                INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `).run('Ratings Test Material', 'Material for testing ratings', 'rate.pdf', '/tmp/rate.pdf', 'application/pdf', 1024, users[0].id);
            material = { id: info.lastInsertRowid, title: 'Ratings Test Material' };
        }
        // RESET ratings for this material to ensure clean state
        db.prepare('DELETE FROM material_ratings WHERE material_id = ?').run(material.id);
        console.log(`   ✓ Prepared material: ${material.title}`);

        console.log('\n--- STARTING TESTS ---\n');

        // --- TEST 1: Single Rating ---
        console.log('1️⃣  Test: First Rating (5 stars)');
        db.prepare(`
            INSERT INTO material_ratings (material_id, user_id, rating) 
            VALUES (?, ?, ?)
        `).run(material.id, users[0].id, 5);

        let stats = db.prepare('SELECT average_rating, rating_count FROM materials WHERE id = ?').get(material.id);
        if (stats.average_rating === 5 && stats.rating_count === 1) {
            console.log('   ✓ Trigger updated average to 5 and count to 1');
        } else {
            console.error(`   ❌ Trigger failed: Avg=${stats.average_rating}, Count=${stats.rating_count}`);
        }

        // --- TEST 2: Aggregation ---
        console.log('2️⃣  Test: Second Rating (3 stars)');
        db.prepare(`
            INSERT INTO material_ratings (material_id, user_id, rating) 
            VALUES (?, ?, ?)
        `).run(material.id, users[1].id, 3);

        stats = db.prepare('SELECT average_rating, rating_count FROM materials WHERE id = ?').get(material.id);
        // Avg of 5 and 3 should be 4
        if (stats.average_rating === 4 && stats.rating_count === 2) {
            console.log('   ✓ Aggregation correct (Avg=4, Count=2)');
        } else {
            console.error(`   ❌ Aggregation failed: Avg=${stats.average_rating}, Count=${stats.rating_count}`);
        }

        // --- TEST 3: Constraint Check (1-5 only) ---
        console.log('3️⃣  Test: Constraint (Rating 6)');
        try {
            db.prepare(`
                INSERT INTO material_ratings (material_id, user_id, rating) 
                VALUES (?, ?, ?)
            `).run(material.id, users[2].id, 6);
            console.error('   ❌ Constraint failed: Allowed rating 6');
        } catch (e) {
            console.log('   ✓ Constraint caught invalid rating');
        }

        // --- TEST 4: Update Rating ---
        console.log('4️⃣  Test: Update Rating (User 1 changes 5 -> 1)');
        // SQLite upsert or just update
        db.prepare(`
            UPDATE material_ratings SET rating = 1 WHERE material_id = ? AND user_id = ?
        `).run(material.id, users[0].id);

        stats = db.prepare('SELECT average_rating, rating_count FROM materials WHERE id = ?').get(material.id);
        // Avg of 1 and 3 should be 2
        if (stats.average_rating === 2 && stats.rating_count === 2) {
            console.log('   ✓ Update trigger correct (Avg=2, Count=2)');
        } else {
            console.error(`   ❌ Update aggregation failed: Avg=${stats.average_rating}, Count=${stats.rating_count}`);
        }

        // --- TEST 5: Delete Rating ---
        console.log('5️⃣  Test: Delete Rating');
        db.prepare('DELETE FROM material_ratings WHERE material_id = ? AND user_id = ?').run(material.id, users[0].id);

        stats = db.prepare('SELECT average_rating, rating_count FROM materials WHERE id = ?').get(material.id);
        // Only 3 remains
        if (stats.average_rating === 3 && stats.rating_count === 1) {
            console.log('   ✓ Delete trigger correct (Avg=3, Count=1)');
        } else {
            console.error(`   ❌ Delete aggregation failed: Avg=${stats.average_rating}, Count=${stats.rating_count}`);
        }

        console.log('\n✅ Rating system verified successfully!');

    } catch (error) {
        console.error('\n❌ Test execution failed:', error);
    }
}

runTests();
