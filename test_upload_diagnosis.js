/**
 * Diagnostic script for upload issue
 * Tests each middleware in the POST /api/materials chain
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE = 'http://localhost:3000';

// Generate a fresh valid token
const accessSecret = process.env.JWT_ACCESS_SECRET;
const token = jwt.sign(
    { userId: 5, email: 'admin@example.com', username: 'admin' },
    accessSecret,
    { expiresIn: '15m', audience: 'auth-rbac-users', issuer: 'auth-rbac-system' }
);

console.log('=== Upload Diagnosis ===\n');

async function makeRequest(method, urlPath, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                ...headers,
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, headers: res.headers, body: data });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) req.write(body);
        req.end();
    });
}

async function testMultipartUpload() {
    return new Promise((resolve, reject) => {
        const boundary = '----TestBoundary' + Date.now();

        const fileContent = 'Hello, this is a test file for upload diagnosis.';

        let body = '';
        // file field
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n`;
        body += `Content-Type: text/plain\r\n\r\n`;
        body += fileContent;
        body += `\r\n`;
        // title field
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="title"\r\n\r\n`;
        body += `Test Upload`;
        body += `\r\n`;
        // isPublic field
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="isPublic"\r\n\r\n`;
        body += `true`;
        body += `\r\n`;
        body += `--${boundary}--\r\n`;

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/materials',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(body),
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    // Test 1: Is the server reachable?
    try {
        console.log('1. Testing server connectivity...');
        const health = await makeRequest('GET', '/health');
        console.log(`   Status: ${health.status}, Body: ${health.body}\n`);
    } catch (err) {
        console.log(`   FAILED: Server not reachable - ${err.message}\n`);
        console.log('   >>> DIAGNOSIS: Backend server is NOT running on port 3000!');
        return;
    }

    // Test 2: Is the auth token valid?
    try {
        console.log('2. Testing authentication with fresh token...');
        const auth = await makeRequest('GET', '/api/users', {
            'Authorization': `Bearer ${token}`
        });
        console.log(`   Status: ${auth.status}, Body: ${auth.body.substring(0, 200)}\n`);

        if (auth.status === 401) {
            console.log('   >>> DIAGNOSIS: Token is rejected. JWT secret might be wrong.');
            return;
        }
        if (auth.status === 403) {
            console.log('   >>> DIAGNOSIS: User lacks permissions to list users.');
        }
    } catch (err) {
        console.log(`   FAILED: ${err.message}\n`);
    }

    // Test 3: Test the actual upload
    try {
        console.log('3. Testing file upload POST /api/materials...');
        const upload = await testMultipartUpload();
        console.log(`   Status: ${upload.status}`);
        console.log(`   Body: ${upload.body}\n`);

        if (upload.status === 201) {
            console.log('   >>> Upload SUCCEEDED! The issue might be frontend-specific or CORS-related.');
        } else if (upload.status === 401) {
            console.log('   >>> DIAGNOSIS: Authentication failed (401). Token may be expired or invalid.');
        } else if (upload.status === 403) {
            console.log('   >>> DIAGNOSIS: Permission denied (403). User lacks materials:create permission.');
        } else if (upload.status === 400) {
            console.log('   >>> DIAGNOSIS: Bad request (400). Check file validation or missing fields.');
        } else if (upload.status === 500) {
            console.log('   >>> DIAGNOSIS: Server error (500). Check server logs for the error details.');
        }
    } catch (err) {
        console.log(`   FAILED: ${err.message}\n`);
        console.log('   >>> DIAGNOSIS: Could not connect to upload endpoint.');
    }

    // Test 4: Check if uploads directory exists and is writable
    console.log('4. Checking uploads directory...');
    const uploadsDir = path.join(__dirname, 'uploads', 'materials');
    console.log(`   Path: ${uploadsDir}`);
    console.log(`   Exists: ${fs.existsSync(uploadsDir)}`);
    if (fs.existsSync(uploadsDir)) {
        try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
            console.log('   Writable: true\n');
        } catch {
            console.log('   Writable: false\n');
            console.log('   >>> DIAGNOSIS: Uploads directory is not writable!');
        }
    } else {
        console.log('   (Will be created on first upload)\n');
    }

    // Test 5: Check database tables
    console.log('5. Checking materials table exists...');
    try {
        const Database = require('better-sqlite3');
        const dbPath = process.env.DB_PATH || path.join(__dirname, 'learning_platform.db');
        const db = new Database(dbPath);
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='materials'").all();
        console.log(`   materials table exists: ${tables.length > 0}`);

        if (tables.length > 0) {
            const cols = db.prepare("PRAGMA table_info(materials)").all();
            console.log(`   Columns: ${cols.map(c => c.name).join(', ')}`);
        }

        // Check permissions for user 5
        const perms = db.prepare(`
            SELECT DISTINCT p.name 
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `).all(5);
        console.log(`\n   User 5 permissions: ${perms.map(p => p.name).join(', ')}`);

        const hasCreatePerm = perms.some(p => p.name === 'materials:create');
        console.log(`   Has materials:create: ${hasCreatePerm}`);

        if (!hasCreatePerm) {
            console.log('\n   >>> DIAGNOSIS: User 5 does NOT have materials:create permission!');
        }

        db.close();
    } catch (err) {
        console.log(`   FAILED: ${err.message}`);
    }
}

run().catch(console.error);
