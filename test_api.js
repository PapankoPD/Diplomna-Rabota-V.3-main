const http = require('http');

async function testFetch() {
    try {
        const loginPayload = JSON.stringify({ email: 'admin@admin.com', password: 'admin123' });

        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginPayload)
            }
        };

        const loginRes = await new Promise((resolve, reject) => {
            const req = http.request(loginOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.write(loginPayload);
            req.end();
        });

        if (!loginRes.success) {
            console.error("Login failed:", loginRes);
            return;
        }

        const token = loginRes.token;

        const matOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/materials/76',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const matRes = await new Promise((resolve, reject) => {
            const req = http.request(matOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.end();
        });

        console.log("Response:", JSON.stringify(matRes, null, 2));

    } catch (e) {
        console.error(e);
    }
}

testFetch();
