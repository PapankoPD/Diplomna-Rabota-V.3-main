const { db } = require('./src/config/database');

async function runTests() {
    try {
        console.log('--- Uploading Test File for 8-A ---');
        
        let class8A = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-A');
        
        if (!class8A) {
            console.log("Class 8-A not found in database.");
            return;
        }

        const admin = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();

        const title = `Test Upload - Class 8-A - ${new Date().toLocaleTimeString()}`;

        // Insert material
        const m1 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get(title, 'test.txt', 'text/plain', 10, admin.id, 1, 'path/test');
        
        // Link to 8-A
        db.prepare('INSERT INTO material_grade_classes (material_id, class_id) VALUES (?, ?)').run(m1.id, class8A.id);

        // Fetch students and insert notifications
        const students = db.prepare('SELECT student_id FROM student_class_enrollments WHERE class_id = ?').all(class8A.id);
        
        let notifsCreated = 0;
        for (const student of students) {
            db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
              .run(student.student_id, 'material_upload', `New material uploaded to your class: ${title}`, `/materials`);
            notifsCreated++;
        }

        console.log(`Success! Created material "${title}".`);
        console.log(`Delivered ${notifsCreated} notifications to students in 8-A.`);
        console.log(`\nCheck your student account notifications now!`);

    } catch (e) {
        console.error(e);
    }
}

runTests();
