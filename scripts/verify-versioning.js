const fs = require('fs');
const path = require('path');
// Node 18+ has global fetch, FormData, and Blob
const { Blob } = require('buffer'); // Explicit import for Blob if needed, or rely on global

const API_URL = 'http://localhost:3002/api';
let AUTH_TOKEN = '';

async function login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
        AUTH_TOKEN = data.data.accessToken;
        return data.data.user.id;
    }
    throw new Error(`Login failed: ${data.message} ${JSON.stringify(data)}`);
}

async function register(username, email, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await response.json();
    console.log('Registration response:', data);
    return data;
}

async function uploadMaterial() {
    // Create a dummy file
    const filePath = path.join(__dirname, 'test-version.txt');
    fs.writeFileSync(filePath, 'Version 1 Content');

    const formData = new FormData();
    formData.append('title', 'Version Test Material');
    formData.append('description', 'Original Description');
    formData.append('isPublic', 'false');

    // Node.js fetch + FormData with fs stream
    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent], { type: 'text/plain' });
    formData.append('file', blob, 'test-version.txt');

    const response = await fetch(`${API_URL}/materials`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: formData
    });

    const data = await response.json();
    fs.unlinkSync(filePath); // Cleanup

    if (data.success) {
        return data.data.material.id;
    }
    throw new Error(`Upload failed: ${JSON.stringify(data)}`);
}

async function updateMaterial(id, title, description) {
    const response = await fetch(`${API_URL}/materials/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ title, description, changeReason: 'Automated Test Update' })
    });
    return response.json();
}

async function getVersions(id) {
    const response = await fetch(`${API_URL}/materials/${id}/versions`, {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    });
    return response.json();
}

async function restoreVersion(materialId, versionId) {
    const response = await fetch(`${API_URL}/materials/${materialId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    });
    return response.json();
}

async function getMaterial(id) {
    const response = await fetch(`${API_URL}/materials/${id}`, {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    });
    return response.json();
}

async function main() {
    try {
        console.log('1. Registering/Logging in user...');
        const timestamp = Date.now();
        const email = `versionuser${timestamp}@example.com`;
        await register(`versionuser${timestamp}`, email, 'Password123!');
        await login(email, 'Password123!');

        console.log('2. Uploading material...');
        const materialId = await uploadMaterial();
        console.log(`   Material ID: ${materialId}`);

        console.log('3. Updating material (Triggering Version 1)...');
        const updateResp = await updateMaterial(materialId, 'Updated Title v2', 'Updated Desc v2');
        console.log('   Update response:', JSON.stringify(updateResp));

        console.log('4. Checking versions...');
        let versionsData = await getVersions(materialId);
        console.log('   Versions response:', JSON.stringify(versionsData));

        if (!versionsData.success) throw new Error(`Get versions failed: ${versionsData.message}`);

        let versions = versionsData.data.versions;
        console.log(`   Found ${versions.length} versions`);
        if (versions.length !== 1) throw new Error('Expected 1 version');
        if (versions[0].title !== 'Version Test Material') throw new Error('Version 1 title mismatch');

        console.log('5. Updating material again (Triggering Version 2)...');
        await updateMaterial(materialId, 'Updated Title v3', 'Updated Desc v3');

        versionsData = await getVersions(materialId);
        versions = versionsData.data.versions;
        console.log(`   Found ${versions.length} versions`);
        if (versions.length !== 2) throw new Error('Expected 2 versions');

        console.log('6. Restoring to Version 1 (Original)...');
        // Version 1 is the one with version_number 1. In list it might be at index 1 (desc order) or 0? 
        // getVersions sorts by version_number DESC. So index 1 is version 1.

        const version1 = versions.find(v => v.version_number === 1);
        if (!version1) throw new Error('Version 1 not found in list');

        await restoreVersion(materialId, version1.id);

        console.log('7. Verifying restoration...');
        const materialData = await getMaterial(materialId);
        const material = materialData.data.material; // Modified check, API structure might be different
        if (material.title !== 'Version Test Material') throw new Error(`Restored title mismatch. Got: ${material.title}`);

        console.log('8. Checking post-restore versions...');
        versionsData = await getVersions(materialId);
        versions = versionsData.data.versions;
        // Should have 3 versions now (Snapshot of v3 state was created before restore)
        console.log(`   Found ${versions.length} versions`);
        if (versions.length !== 3) throw new Error('Expected 3 versions');

        console.log('✅ Versioning Verification Passed!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

main();
