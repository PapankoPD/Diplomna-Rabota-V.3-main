/**
 * Migration script to remove the 'guest' role
 * Run with: node scripts/remove-guest-role.js
 */

const { query } = require('../src/config/database');

async function removeGuestRole() {
    console.log('Starting guest role removal...\n');

    try {
        // 1. Find the guest role ID
        const roleResult = await query("SELECT id FROM roles WHERE name = 'guest'");

        if (roleResult.rows.length === 0) {
            console.log("Role 'guest' not found. Nothing to do.");
            process.exit(0);
        }

        const guestRoleId = roleResult.rows[0].id;
        console.log(`Found 'guest' role with ID: ${guestRoleId}`);

        // 2. Remove user assignments for this role
        console.log("Removing user assignments...");
        await query('DELETE FROM user_roles WHERE role_id = $1', [guestRoleId]);
        console.log("   ✓ User assignments removed");

        // 3. Remove permission assignments for this role
        console.log("Removing permission assignments...");
        await query('DELETE FROM role_permissions WHERE role_id = $1', [guestRoleId]);
        console.log("   ✓ Permission assignments removed");

        // 4. Remove the role itself
        console.log("Removing the role...");
        await query('DELETE FROM roles WHERE id = $1', [guestRoleId]);
        console.log("   ✓ 'guest' role removed");

        // Verification
        console.log('\n=== Verification ===\n');
        const rolesResult = await query('SELECT id, name, description FROM roles ORDER BY id');
        console.log('Remaining Roles:');
        rolesResult.rows.forEach(r => console.log(`  - ${r.name}: ${r.description}`));

        console.log('\n✓ Removal completed successfully!');

    } catch (error) {
        console.error('Removal failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

removeGuestRole();
