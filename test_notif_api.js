async function testNotifs() {
    try {
        // 1. Log in to get the real token
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ikolev270@gmail.com', password: 'password123' }) // student 24
        });
        
        const loginData = await loginRes.json();
        
        if (!loginData.success) {
            console.error('Login failed:', loginData);
            return;
        }
        
        const token = loginData.data.accessToken;
        console.log('Got token for student NIK');
        
        // 2. Fetch unread count
        const countRes = await fetch('http://localhost:3000/api/notifications/unread-count', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const countData = await countRes.json();
        console.log('Unread Count:', countData);

        // 3. Fetch notifications
        const res = await fetch('http://localhost:3000/api/notifications', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Notifications (first few):', data.data.notifications.map(n => n.message));

    } catch (e) {
        console.error('API Error:', e.message);
    }
}

testNotifs();
