const http = require('http');

// 1. Login to get token
const loginData = JSON.stringify({
    email: 'papankoivanov@gmail.com',
    password: 'TestPass1!@' // Assuming this is the password used, or I'll use the one from my earlier test user
});

// Actually let's use the test user I created earlier "testregistration2@example.com"
const testUserLogin = JSON.stringify({
    email: 'testregistration2@example.com',
    password: 'TestPass1!@'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': testUserLogin.length
    }
};

const loginReq = http.request(loginOptions, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.log('Login failed:', body);
            return;
        }

        const token = JSON.parse(body).data.accessToken;
        console.log('Got token, starting upload...');
        uploadFile(token);
    });
});

loginReq.write(testUserLogin);
loginReq.end();

function uploadFile(token) {
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
        `Content-Type: application/vnd.android.package-archive`,
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
            'Authorization': 'Bearer ' + token
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('Upload Status:', res.statusCode);
            console.log('Upload Response:', body);
        });
    });

    req.write(postDataStart);
    req.write(fileContent);
    req.write(postDataEnd);
    req.end();
}
