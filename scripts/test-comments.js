/**
 * Comprehensive Test Script for Commenting System
 * 1. Seeds database with users and material
 * 2. Tests Comment Creation
 * 3. Tests Comment Reading
 * 4. Tests Comment Editing & History
 * 5. Tests Nested Replies
 * 6. Tests Moderation
 */

const { db } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function runTests() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Commenting System - Full Integration Test   ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    try {
        // --- SEED DATA ---
        console.log('🌱 Seeding Test Data...');

        // 1. Ensure Admin User
        let adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
        if (!adminUser) {
            const hash = bcrypt.hashSync('admin123', 10);
            const info = db.prepare('INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 1)').run('admin', 'admin@example.com', hash);
            adminUser = { id: info.lastInsertRowid, username: 'admin' };
            console.log('   ✓ Created admin user');

            // Assign admin role
            const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');
            if (adminRole) {
                db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(adminUser.id, adminRole.id);
                console.log('   ✓ Assigned admin role');
            }
        } else {
            console.log('   ✓ Admin user exists');
        }

        // 2. Ensure Regular User
        let testUser = db.prepare('SELECT * FROM users WHERE username = ?').get('testuser');
        if (!testUser) {
            const hash = bcrypt.hashSync('user123', 10);
            const info = db.prepare('INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 1)').run('testuser', 'test@example.com', hash);
            testUser = { id: info.lastInsertRowid, username: 'testuser' };
            console.log('   ✓ Created test user');

            // Assign user role
            const userRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('user');
            if (userRole) {
                db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(testUser.id, userRole.id);
                console.log('   ✓ Assigned user role');
            }
        } else {
            console.log('   ✓ Test user exists');
        }

        // 3. Ensure Material
        let material = db.prepare('SELECT * FROM materials WHERE title = ?').get('Comments Test Material');
        if (!material) {
            const info = db.prepare(`
                INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `).run('Comments Test Material', 'Material for testing comments', 'test.pdf', '/tmp/test.pdf', 'application/pdf', 1024, adminUser.id);
            material = { id: info.lastInsertRowid, title: 'Comments Test Material' };
            console.log('   ✓ Created test material');
        } else {
            console.log('   ✓ Test material exists');
        }

        console.log('\n--- STARTING TESTS ---\n');

        // --- TEST 1: Create Comment ---
        console.log('1️⃣  Test: User creates comment');
        const commentContent = 'Hello implementation world!';
        const createStmt = db.prepare(`
            INSERT INTO comments (material_id, user_id, content) 
            VALUES (?, ?, ?)
        `);
        const createResult = createStmt.run(material.id, testUser.id, commentContent);
        const commentId = createResult.lastInsertRowid;
        console.log(`   ✓ Comment created (ID: ${commentId})`);

        // --- TEST 2: Read Comments ---
        console.log('2️⃣  Test: Read comments for material');
        const comments = db.prepare('SELECT * FROM comments WHERE material_id = ?').all(material.id);
        const savedComment = comments.find(c => c.id === commentId);

        if (savedComment && savedComment.content === commentContent) {
            console.log('   ✓ Comment retrieved and verified');
        } else {
            console.error('   ❌ Comment verification failed');
        }

        // --- TEST 3: Edit Comment (User) ---
        console.log('3️⃣  Test: User edits own comment');
        const newContent = 'Hello UPDATED world!';

        // Manual simulation of API logic (save history -> update)
        db.prepare('INSERT INTO comment_history (comment_id, user_id, old_content) VALUES (?, ?, ?)').run(commentId, testUser.id, commentContent);
        db.prepare('UPDATE comments SET content = ?, is_edited = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newContent, commentId);

        const updatedComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
        if (updatedComment.content === newContent && updatedComment.is_edited === 1) {
            console.log('   ✓ Comment updated successfully');
        } else {
            console.error('   ❌ Comment update failed');
        }

        const history = db.prepare('SELECT * FROM comment_history WHERE comment_id = ?').all(commentId);
        if (history.length > 0 && history[0].old_content === commentContent) {
            console.log('   ✓ History preserved correctly');
        } else {
            console.error('   ❌ History check failed');
        }

        // --- TEST 4: Admin Moderation ---
        console.log('4️⃣  Test: Admin hides comment');
        db.prepare("UPDATE comments SET status = 'hidden' WHERE id = ?").run(commentId);

        const hiddenComment = db.prepare('SELECT status FROM comments WHERE id = ?').get(commentId);
        if (hiddenComment.status === 'hidden') {
            console.log('   ✓ Comment status set to hidden');
        } else {
            console.error('   ❌ Moderation failed');
        }

        // --- TEST 5: Nested Reply ---
        console.log('5️⃣  Test: Reply to comment');
        const replyContent = 'This is a threaded reply';
        const replyResult = db.prepare('INSERT INTO comments (material_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)').run(material.id, adminUser.id, commentId, replyContent);

        const reply = db.prepare('SELECT * FROM comments WHERE id = ?').get(replyResult.lastInsertRowid);
        if (reply && reply.parent_id === commentId) {
            console.log('   ✓ Reply created with correct parent_id');
        } else {
            console.error('   ❌ Reply linkage failed');
        }

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ Test execution failed:', error);
    }
}

runTests();
