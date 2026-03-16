// Quick API test to check user.id and material.uploaded_by types
async function diagnose() {
    const base = 'http://localhost:3000/api';
    
    // 1. Login as admin
    const loginRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@admin.com', password: 'Admin123!' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        console.error('Login failed:', loginData.message);
        return;
    }
    const token = loginData.data.accessToken;
    console.log('Logged in. Token starts with:', token.slice(0, 30));
    
    // 2. Get current user
    const meRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const me = await meRes.json();
    const user = me.data?.user;
    console.log('\nuser.id:', user?.id, '(type:', typeof user?.id, ')');
    console.log('user.roles:', user?.roles?.map(r => r.name));
    
    // 3. Get first material
    const matRes = await fetch(`${base}/materials`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const mats = await matRes.json();
    const mat = mats.data?.[0];
    if (mat) {
        console.log('\nFirst material:');
        console.log('  id:', mat.id, '(type:', typeof mat.id, ')');
        console.log('  uploaded_by:', mat.uploaded_by, '(type:', typeof mat.uploaded_by, ')');
        console.log('  uploaded_by === user.id:', mat.uploaded_by === user.id);
        console.log('  uploaded_by == user.id:', mat.uploaded_by == user.id);
        
        // 4. Try to delete the material
        console.log('\nAttempting DELETE on material', mat.id);
        const delRes = await fetch(`${base}/materials/${mat.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const delData = await delRes.json();
        console.log('DELETE result:', delRes.status, delData);
    }
}

diagnose().catch(console.error);
