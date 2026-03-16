const { db } = require('./src/config/database');

async function runTests() {
    try {
        console.log('--- Setting up test data for Notifications ---');
        
        let class8A = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-A');
        
        // Find admin to upload
        let admin = db.prepare('SELECT id FROM users WHERE username = ?').get('test_admin_ac');
        
        // Find student in 8-A to receive
        let studentA = db.prepare('SELECT id FROM users WHERE username = ?').get('test_student_a_ac');

        if (!admin || !studentA || !class8A) {
            console.log("Test users/class not found. Please ensure test_access_control.js created them or run this test on a known DB state.");
            return;
        }

        console.log('--- Simulating Single Upload Logic ---');
        // Simulate single upload logic
        const m1 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('Notif Material', 'm.txt', 'text/plain', 10, admin.id, 1, 'path/m');
        
        db.prepare('INSERT INTO material_grade_classes (material_id, class_id) VALUES (?, ?)').run(m1.id, class8A.id);

        const students = db.prepare('SELECT student_id FROM student_class_enrollments WHERE class_id = ?').all(class8A.id);
        let notifsCreated = 0;
        for (const student of students) {
            db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
              .run(student.student_id, 'material_upload', `New material uploaded to your class: Notif Material`, `/materials`);
            notifsCreated++;
        }

        console.log(`Created ${notifsCreated} notifications for single upload.`);

        // Verify notification exists
        const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1').get(studentA.id, 'material_upload');
        console.log("Latest notification for student A:", notif);

        // Cleanup
        db.prepare('DELETE FROM notifications WHERE id = ?').run(notif.id);
        db.prepare('DELETE FROM material_grade_classes WHERE material_id = ?').run(m1.id);
        db.prepare('DELETE FROM materials WHERE id = ?').run(m1.id);

        console.log('--- Cleanup complete ---');

    } catch (e) {
        console.error(e);
    }
}

runTests();
