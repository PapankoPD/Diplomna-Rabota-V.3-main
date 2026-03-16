const { db } = require('./src/config/database');
const jwt = require('jsonwebtoken');
const { generateTokenPair } = require('./src/config/jwt');

async function uploadApiTest() {
    try {
        const admin = db.prepare(`
            SELECT u.id, u.email, u.username 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'admin'
            LIMIT 1
        `).get();
        if (!admin) {
            console.error('No admin user found to upload material.');
            return;
        }

        const { accessToken: adminToken } = generateTokenPair(admin);

        const classRow = db.prepare("SELECT id FROM grade_classes WHERE name = '8-A'").get();
        if (!classRow) {
            console.error('Class 8-A not found!');
            return;
        }

        console.log(`Uploading as ${admin.username} to class 8-A (ID: ${classRow.id})...`);

        // Node.js 18+ native FormData and File
        const form = new FormData();
        form.append('title', `Express WebSocket Test - ${new Date().toLocaleTimeString()}`);
        form.append('description', 'Testing if WebSocket pushes to the frontend.');
        form.append('isPublic', 'false');
        form.append('classId', classRow.id.toString());
        
        // Native Blob/File
        const fileContent = new Blob(['This is a test document from HTTP.'], { type: 'text/plain' });
        form.append('file', fileContent, 'socket_test.txt');

        const res = await fetch('http://localhost:3000/api/materials', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            body: form
        });

        const result = await res.json();
        if (res.ok && result.success) {
            console.log('✅ Upload successful via API! Real-time notification emitted to Socket.io!');
            console.log('Material Details:', result.data.material.title);
        } else {
            console.error('❌ API Upload Failed:', result);
        }

    } catch (err) {
        console.error('Script Error:', err);
    }
}

uploadApiTest();
