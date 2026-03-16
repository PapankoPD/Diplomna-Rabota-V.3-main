const { db } = require('./src/config/database');
const { searchMaterials, listMaterials } = require('./src/utils/search');

async function runTests() {
    try {
        console.log('--- Setting up test data ---');
        // Find Grade 8
        const grade8 = db.prepare('SELECT id FROM grades WHERE name = ?').get('Grade 8');
        if (!grade8) throw new Error('Grade 8 not found');
        
        // Find or create classes 8-A and 8-B
        let class8A = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-A');
        if (!class8A) {
            db.prepare('INSERT INTO grade_classes (grade_id, name) VALUES (?, ?)').run(grade8.id, '8-A');
            class8A = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-A');
        }
        
        let class8B = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-B');
        if (!class8B) {
            db.prepare('INSERT INTO grade_classes (grade_id, name) VALUES (?, ?)').run(grade8.id, '8-B');
            class8B = db.prepare('SELECT id FROM grade_classes WHERE name = ?').get('8-B');
        }

        // Create 3 public materials
        const m1 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('Material for 8-A', 'm1.txt', 'text/plain', 10, 1, 1, 'path/m1');
        const m2 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('Material for 8-B', 'm2.txt', 'text/plain', 10, 1, 1, 'path/m2');
        const m3 = db.prepare('INSERT INTO materials (title, file_name, file_type, file_size, uploaded_by, is_public, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get('General Public Material', 'm3.txt', 'text/plain', 10, 1, 1, 'path/m3');
        
        // Ensure no FTS error
        db.prepare('INSERT OR IGNORE INTO materials_fts (rowid, title) VALUES (?, ?)').run(m1.id, 'Material for 8-A');
        db.prepare('INSERT OR IGNORE INTO materials_fts (rowid, title) VALUES (?, ?)').run(m2.id, 'Material for 8-B');
        db.prepare('INSERT OR IGNORE INTO materials_fts (rowid, title) VALUES (?, ?)').run(m3.id, 'General Public Material');

        // Assign to classes
        db.prepare('INSERT INTO material_grade_classes (material_id, class_id) VALUES (?, ?)').run(m1.id, class8A.id);
        db.prepare('INSERT INTO material_grade_classes (material_id, class_id) VALUES (?, ?)').run(m2.id, class8B.id);

        console.log('--- Running logic tests ---');
        
        // Test Strict Student assigned to 8-A
        const studentAOpts = {
            isStrictStudent: true,
            studentClassId: class8A.id,
            limit: 100
        };

        const resultStudentA = await listMaterials(studentAOpts);
        const titlesA = resultStudentA.map(r => r.title);
        console.log('Student A (in 8-A) can see:');
        console.log(titlesA.filter(t => t.includes('8-A') || t.includes('8-B') || t.includes('General Public Material')));

        // Test Strict Student NOT assigned to any class
        const studentNoneOpts = {
            isStrictStudent: true,
            studentClassId: null,
            limit: 100
        };

        const resultStudentNone = await listMaterials(studentNoneOpts);
        const titlesNone = resultStudentNone.map(r => r.title);
        console.log('Student with NO CLASS can see:');
        console.log(titlesNone.filter(t => t.includes('8-A') || t.includes('8-B') || t.includes('General Public Material')));

        // Test Non-Strict Student or Admin
        const nonStrictOpts = {
            isStrictStudent: false,
            limit: 100
        };
        const resultAdmin = await listMaterials(nonStrictOpts);
        const titlesAdmin = resultAdmin.map(r => r.title);
        console.log('Admin can see:');
        console.log(titlesAdmin.filter(t => t.includes('8-A') || t.includes('8-B') || t.includes('General Public Material')));

        // Cleanup
        db.prepare('DELETE FROM material_grade_classes WHERE material_id IN (?, ?)').run(m1.id, m2.id);
        db.prepare('DELETE FROM materials WHERE id IN (?, ?, ?)').run(m1.id, m2.id, m3.id);
        db.prepare('DELETE FROM materials_fts WHERE rowid IN (?, ?, ?)').run(m1.id, m2.id, m3.id);
        
        console.log('--- Cleanup complete ---');

    } catch (e) {
        console.error(e);
    }
}

runTests();
