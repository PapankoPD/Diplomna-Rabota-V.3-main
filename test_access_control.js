const { db } = require('./src/config/database');
const { checkMaterialAccess } = require('./src/middleware/accessControl');

async function runTests() {
    try {
        console.log('--- Setting up test data for Access Control ---');
        
        // Find Grade 8
        const grade8 = db.prepare('SELECT id FROM grades WHERE name = ?').get('Grade 8');
        let class8A = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-A');
        let class8B = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-B');
        
        // Find or create test users
        // Create an admin
        let admin = db.prepare('SELECT id FROM users WHERE username = ?').get('test_admin_ac');
        if (!admin) {
            db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('test_admin_ac', 'admin_ac@test.com', 'hash');
            admin = db.prepare('SELECT id FROM users WHERE username = ?').get('test_admin_ac');
            const role = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');
            db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(admin.id, role.id);
        }

        // Create student in 8-A
        let studentA = db.prepare('SELECT id FROM users WHERE username = ?').get('test_student_a_ac');
        if (!studentA) {
            db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('test_student_a_ac', 'student_a@test.com', 'hash');
            studentA = db.prepare('SELECT id FROM users WHERE username = ?').get('test_student_a_ac');
            const role = db.prepare('SELECT id FROM roles WHERE name = ?').get('student');
            db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(studentA.id, role.id);
            db.prepare('INSERT INTO student_class_enrollments (student_id, class_id) VALUES (?, ?)').run(studentA.id, class8A.id);
        }

        // Create 3 public materials
        const m1 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('AC Material for 8-A', 'm1.txt', 'text/plain', 10, admin.id, 1, 'path/m1');
        const m2 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('AC Material for 8-B', 'm2.txt', 'text/plain', 10, admin.id, 1, 'path/m2');
        const m3 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('AC General Public Material', 'm3.txt', 'text/plain', 10, admin.id, 1, 'path/m3');
        
        // Assign to classes
        db.prepare('INSERT INTO material_grade_classes (material_id, class_id) VALUES (?, ?)').run(m1.id, class8A.id);
        db.prepare('INSERT INTO material_grade_classes (material_id, class_id) VALUES (?, ?)').run(m2.id, class8B.id);

        console.log('--- Running logic tests ---');
        
        const canViewM1A = await checkMaterialAccess(m1.id, studentA.id, 'view');
        const canViewM2A = await checkMaterialAccess(m2.id, studentA.id, 'view');
        const canViewM3A = await checkMaterialAccess(m3.id, studentA.id, 'view');
        const canViewM2Admin = await checkMaterialAccess(m2.id, admin.id, 'view');

        console.log(`Student in 8-A can view material for 8-A: ${canViewM1A}`); // Should be true
        console.log(`Student in 8-A can view material for 8-B: ${canViewM2A}`); // Should be false
        console.log(`Student in 8-A can view general public material: ${canViewM3A}`); // Should be true
        console.log(`Admin can view material for 8-B: ${canViewM2Admin}`); // Should be true

        // Cleanup
        db.prepare('DELETE FROM material_grade_classes WHERE material_id IN (?, ?)').run(m1.id, m2.id);
        db.prepare('DELETE FROM materials WHERE id IN (?, ?, ?)').run(m1.id, m2.id, m3.id);
        db.prepare('DELETE FROM student_class_enrollments WHERE student_id = ?').run(studentA.id);
        db.prepare('DELETE FROM user_roles WHERE user_id IN (?, ?)').run(admin.id, studentA.id);
        db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(admin.id, studentA.id);
        
        console.log('--- Cleanup complete ---');

    } catch (e) {
        console.error(e);
    }
}

runTests();
