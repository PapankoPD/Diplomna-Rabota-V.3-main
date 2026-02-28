const fs = require('fs');
const http = require('http');
const path = require('path');

// Mock a file upload using boundary
const boundary = '--------------------------' + Date.now().toString(16);
const filename = 'test-app.apk';
const fileContent = 'PK\x03\x04\x14\x00\x00\x00\x08\x00'; // Fake zip/apk header

const postDataStart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="title"`,
    '',
    'Test APK Upload',
    `--${boundary}`,
    `Content-Disposition: form-data; name="isPublic"`,
    '',
    'true',
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: application/vnd.android.package-archive`, // Correct mime type
    '',
    ''
].join('\r\n');

const postDataEnd = [
    '',
    `--${boundary}--`,
    ''
].join('\r\n');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/materials',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(postDataStart) + Buffer.byteLength(fileContent) + Buffer.byteLength(postDataEnd),
        'Authorization': 'Bearer ' + (process.argv[2] || 'YOUR_ACCESS_TOKEN_HERE')
    }
};

console.log('Testing upload with MIME type: application/vnd.android.package-archive');

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.write(postDataStart);
req.write(fileContent);
req.write(postDataEnd);
req.end();
