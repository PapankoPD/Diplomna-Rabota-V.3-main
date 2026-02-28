/**
 * Group Access Control Verification Script
 * Tests:
 * 1. User creation (Owner, Member, Non-Member)
 * 2. Group creation
 * 3. Group membership management
 * 4. Material creation (Private)
 * 5. Access checks before sharing
 * 6. Sharing material with group
 * 7. Access checks after sharing
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3002/api';
let ownerToken, memberToken, otherToken;
let ownerId, memberId, otherId;
let groupId, materialId;

// Helper wrapper for fetch
async function request(url, method = 'GET', body = null, token = null, isMultipart = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let options = {
        method,
        headers
    };

    if (body) {
        if (isMultipart) {
            options.body = body;
            // Fetch automatically sets Content-Type for FormData
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.response = { status: response.status, data };
        throw error;
    }

    return { data };
}

async function runTests() {
    try {
        console.log('Starting Group Access Control Verification...');

        // 1. Setup Users
        console.log('\n--- Setting up users ---');
        ownerId = await registerUser('group_owner', 'owner@test.com', 'Password123!', 'owner');
        memberId = await registerUser('group_member', 'member@test.com', 'Password123!', 'member');
        otherId = await registerUser('other_user', 'other@test.com', 'Password123!', 'other');

        // 2. Create Group
        console.log('\n--- Creating Group ---');
        const uniqueGroupName = `Study Group A ${Date.now()}`;
        const groupRes = await request(`${API_URL}/groups`, 'POST', {
            name: uniqueGroupName,
            description: 'A test group for verification',
            isPublic: false
        }, ownerToken);
        groupId = groupRes.data.data.id;
        console.log(`Group created: ID ${groupId} (${uniqueGroupName})`);

        // 3. Add Member to Group
        console.log('\n--- Adding Member to Group ---');
        await request(`${API_URL}/groups/${groupId}/members`, 'POST', {
            userId: memberId,
            role: 'member'
        }, ownerToken);
        console.log(`User ${memberId} added to group ${groupId}`);

        // 4. Create Private Material via FormData
        console.log('\n--- Creating Private Material ---');

        try {
            const formData = new FormData();
            fs.writeFileSync('test_doc.txt', 'This is a test document content.');
            const fileContent = fs.readFileSync('test_doc.txt');
            const fileBlob = new Blob([fileContent], { type: 'text/plain' });
            formData.append('file', fileBlob, 'test_doc.txt');
            formData.append('title', 'Private Group Doc');
            formData.append('isPublic', 'false');

            const uploadRes = await request(`${API_URL}/materials`, 'POST', formData, ownerToken, true);
            materialId = uploadRes.data.data.material.id;
            console.log(`Private material created: ID ${materialId}`);
        } catch (e) {
            console.log('FormData upload failed:', e.message);
            throw e;
        }

        // 5. Verify No Access for Member (Before Sharing)
        console.log('\n--- Verifying No Access Before Sharing ---');
        try {
            await request(`${API_URL}/materials/${materialId}`, 'GET', null, memberToken);
            console.error('FAIL: Member should NOT see private material yet');
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.log('PASS: Member correctly denied access (403)');
            } else {
                console.error(`FAIL: Unexpected error ${e.message}`);
            }
        }

        // 6. Share Material with Group
        console.log('\n--- Sharing Material with Group ---');
        await request(`${API_URL}/materials/${materialId}/permissions`, 'POST', {
            groupId: groupId,
            permissionType: 'view'
        }, ownerToken);
        console.log(`Material ${materialId} shared with group ${groupId}`);

        // 7. Verify Access for Member (After Sharing)
        console.log('\n--- Verifying Access After Sharing ---');
        try {
            await request(`${API_URL}/materials/${materialId}`, 'GET', null, memberToken);
            console.log('PASS: Member successfully accessed material via group permission');
        } catch (e) {
            console.error(`FAIL: Member denied access: ${e.message}`);
            if (e.response) console.error(e.response.data);
        }

        // 8. Verify No Access for Non-Member
        console.log('\n--- Verifying No Access for Non-Member ---');
        try {
            await request(`${API_URL}/materials/${materialId}`, 'GET', null, otherToken);
            console.error('FAIL: Non-member should NOT see private material');
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.log('PASS: Non-member correctly denied access (403)');
            } else {
                console.error(`FAIL: Unexpected error ${e.message}`);
            }
        }

        // Cleanup
        try { fs.unlinkSync('test_doc.txt'); } catch (e) { }
        console.log('\nTest Completed.');

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response data:', error.response.data);
    }
}

async function registerUser(usernameRoot, emailRoot, password, roleKey) {
    // Generate unique user info to avoid conflicts on repeated runs
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000);
    const username = `${usernameRoot}_${uniqueSuffix}`;
    const email = `${uniqueSuffix}_${emailRoot}`;

    try {
        const res = await request(`${API_URL}/auth/register`, 'POST', {
            username,
            email,
            password
        });

        const token = res.data.data.accessToken;
        if (roleKey === 'owner') ownerToken = token;
        if (roleKey === 'member') memberToken = token;
        if (roleKey === 'other') otherToken = token;

        return res.data.data.user.id;
    } catch (error) {
        console.error(`Failed to register ${username}:`, error.message);
        throw error;
    }
}

runTests();
