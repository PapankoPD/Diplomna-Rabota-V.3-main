const http = require('http');

const data = JSON.stringify({
    email: 'testregistration2@example.com',
    username: 'TestUser456',
    password: 'TestPass1!@'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log('Response:', body);
        }
    });
});

req.on('error', (e) => {
    console.log('Request error:', e.message);
});

req.write(data);
req.end();
