const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testAllFeatures() {
    console.log('='.repeat(60));
    console.log('TESTING ALL FEATURES');
    console.log('='.repeat(60));

    let accessToken = null;
    let refreshToken = null;

    // Test 1: Health Check
    console.log('\n1. Testing Health Check...');
    try {
        const health = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET'
        });
        console.log('   Status:', health.status, health.status === 200 ? '✓' : '✗');
    } catch (e) {
        console.log('   ERROR:', e.message);
    }

    // Test 2: Register
    console.log('\n2. Testing Registration...');
    let newUserId = null;
    try {
        const register = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/register',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            username: 'testuser' + Date.now(),
            email: `test${Date.now()}@test.com`,
            password: 'TestPass123!'
        });
        console.log('   Status:', register.status, register.status === 201 ? '✓' : '✗');
        if (register.data.data?.accessToken) {
            accessToken = register.data.data.accessToken;
            refreshToken = register.data.data.refreshToken;
            newUserId = register.data.data.user?.id;
            console.log('   Got access token');
        }
    } catch (e) {
        console.log('   ERROR:', e.message);
    }

    // Test 3: Get Current User (using fresh token from registration)
    console.log('\n3. Testing Get Current User...');
    if (accessToken) {
        try {
            const me = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/me',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', me.status, me.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 4: Get Materials (public - no auth required)
    console.log('\n4. Testing Get Materials (Public)...');
    try {
        const materials = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/materials',
            method: 'GET'
        });
        console.log('   Status:', materials.status, materials.status === 200 ? '✓' : '✗');
        console.log('   Count:', Array.isArray(materials.data.data) ? materials.data.data.length : 'N/A');
    } catch (e) {
        console.log('   ERROR:', e.message);
    }

    // Test 5: Get Subjects (authenticated)
    console.log('\n5. Testing Get Subjects...');
    if (accessToken) {
        try {
            const subjects = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/taxonomy/subjects',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', subjects.status, subjects.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 6: Get Topics (authenticated)
    console.log('\n6. Testing Get Topics...');
    if (accessToken) {
        try {
            const topics = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/taxonomy/topics',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', topics.status, topics.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 7: Get Grades (authenticated)
    console.log('\n7. Testing Get Grades...');
    if (accessToken) {
        try {
            const grades = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/taxonomy/grades',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', grades.status, grades.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 8: Search
    console.log('\n8. Testing Search...');
    try {
        const search = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/search?q=test',
            method: 'GET'
        });
        console.log('   Status:', search.status, search.status === 200 ? '✓' : '✗');
    } catch (e) {
        console.log('   ERROR:', e.message);
    }

    // Test 9: Get Comments for material (correct endpoint)
    console.log('\n9. Testing Get Comments...');
    try {
        const comments = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/comments/material/1',
            method: 'GET'
        });
        console.log('   Status:', comments.status, comments.status === 200 || comments.status === 404 ? '✓' : '✗');
        console.log('   Message:', comments.data.message || 'OK');
    } catch (e) {
        console.log('   ERROR:', e.message);
    }

    // Test 10: Get Ratings (new endpoint)
    console.log('\n10. Testing Get Ratings...');
    try {
        const ratings = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/ratings/1',
            method: 'GET'
        });
        console.log('   Status:', ratings.status, ratings.status === 200 || ratings.status === 404 ? '✓' : '✗');
    } catch (e) {
        console.log('   ERROR:', e.message);
    }

    // Test 11: Get Users (requires admin permission)
    console.log('\n11. Testing Get Users...');
    if (accessToken) {
        try {
            const users = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/users',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', users.status, '(may be 403 if not admin)');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 12: Get Roles
    console.log('\n12. Testing Get Roles...');
    if (accessToken) {
        try {
            const roles = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/roles',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', roles.status, '(may be 403 if not admin)');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 13: Get Groups
    console.log('\n13. Testing Get Groups...');
    if (accessToken) {
        try {
            const groups = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/groups',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', groups.status, groups.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 14: Recommendations
    console.log('\n14. Testing Recommendations...');
    if (accessToken) {
        try {
            const recs = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/recommendations',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log('   Status:', recs.status, recs.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No access token');
    }

    // Test 15: Token Refresh
    console.log('\n15. Testing Token Refresh...');
    if (refreshToken) {
        try {
            const refresh = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/refresh',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { refreshToken });
            console.log('   Status:', refresh.status, refresh.status === 200 ? '✓' : '✗');
        } catch (e) {
            console.log('   ERROR:', e.message);
        }
    } else {
        console.log('   SKIPPED: No refresh token');
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

testAllFeatures().catch(console.error);
