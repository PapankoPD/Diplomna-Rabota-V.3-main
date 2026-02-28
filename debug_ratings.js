const API_URL = 'http://localhost:3000/api';
let authToken = '';
let materialId = 1;

async function request(url, method = 'GET', data = null, headers = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(url, options);
        const jsonData = await response.json();
        if (!response.ok) {
            throw new Error(jsonData.message || response.statusText);
        }
        return jsonData;
    } catch (error) {
        throw error;
    }
}

async function runTests() {
    try {
        if (!authToken) {
            console.log('1. Logging in...');
            const loginRes = await request(`${API_URL}/auth/login`, 'POST', {
                email: 'admin@example.com',
                password: 'Admin123!@#'
            });
            authToken = loginRes.data.accessToken;
            console.log('   Login successful');
        } else {
            console.log('1. Already logged in via registration');
        }

        try {
            const mats = await request(`${API_URL}/materials?limit=1`);
            if (mats.data.length > 0) {
                materialId = mats.data[0].id;
                console.log(`   Using material ID: ${materialId}`);
            }
        } catch (e) {
            console.log('   Error getting materials, sticking to ID 1');
        }

        console.log('\n2. Getting initial rating stats...');
        try {
            const stats = await request(`${API_URL}/ratings/${materialId}`);
            console.log('   Initial stats:', stats.data);
        } catch (e) {
            console.log('   Failed to get stats', e.message);
        }

        console.log('\n3. Submitting 5-star rating...');
        try {
            const rateRes = await request(
                `${API_URL}/ratings`,
                'POST',
                { materialId, rating: 5 },
                { Authorization: `Bearer ${authToken}` }
            );
            console.log('   Rating submitted:', rateRes);
        } catch (e) {
            console.error('   Failed to submit rating:', e.message);
        }

        console.log('\n4. Verifying stats after 5-star rating...');
        const statsAfter = await request(`${API_URL}/ratings/${materialId}`);
        console.log('   Stats after:', statsAfter.data);

        console.log('\n5. Updating to 3-star rating...');
        try {
            const rateRes = await request(
                `${API_URL}/ratings`,
                'POST',
                { materialId, rating: 3 },
                { Authorization: `Bearer ${authToken}` }
            );
            console.log('   Rating updated:', rateRes);
        } catch (e) {
            console.error('   Failed to update rating:', e.message);
        }

        console.log('\n6. Verifying stats after 3-star rating...');
        const statsUpdate = await request(`${API_URL}/ratings/${materialId}`);
        console.log('   Stats after update:', statsUpdate.data);

        console.log('\n7. Deleting rating...');
        try {
            const deleteRes = await request(
                `${API_URL}/ratings/${materialId}`,
                'DELETE',
                null,
                { Authorization: `Bearer ${authToken}` }
            );
            console.log('   Rating deleted:', deleteRes);
        } catch (e) {
            console.error('   Failed to delete rating:', e.message);
        }

        console.log('\n8. Final stats check...');
        const statsFinal = await request(`${API_URL}/ratings/${materialId}`);
        console.log('   Final stats:', statsFinal.data);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function registerAndRun() {
    try {
        const username = 'ratertest' + Date.now();
        const email = `rater${Date.now()}@test.com`;

        console.log('0. Registering new test user...');
        const regRes = await request(`${API_URL}/auth/register`, 'POST', {
            username,
            email,
            password: 'TestUser123!@#'
        });
        authToken = regRes.data.accessToken;
        console.log('   Registered and logged in as', username);

        try {
            const mats = await request(`${API_URL}/materials?limit=1`);
            if (mats.data.length > 0) {
                materialId = mats.data[0].id;
                console.log(`   Using material ID: ${materialId}`);
            }
        } catch (e) { }

        await runTests();

    } catch (e) {
        console.log('Registration failed:', e.message);
        console.log('Trying login with existing...');
        await runTests();
    }
}

registerAndRun();
