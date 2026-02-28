const testAuth = async () => {
    try {
        console.log('--- Testing Auth Flow ---');

        // 1. Login
        console.log(' attempting login...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });

        const loginData = await loginRes.json();

        if (loginData.success) {
            console.log('Login successful!');
            const token = loginData.data.accessToken;
            console.log('Token received:', token.substring(0, 20) + '...');

            // 2. Access Protected Route
            console.log('Accessing protected route (taxonomy/subjects)...');
            const subjectsRes = await fetch('http://localhost:3000/api/taxonomy/subjects', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const subjectsData = await subjectsRes.json();

            if (subjectsData.success) {
                console.log('Subject access successful!');
                console.log('Subjects count:', subjectsData.data.subjects.length);
                console.log('Subjects:', subjectsData.data.subjects.map(s => s.name).join(', '));
            } else {
                console.log('Subject access failed:', subjectsData);
            }

        } else {
            console.log('Login failed:', loginData);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
};

testAuth();
