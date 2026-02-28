/**
 * Test script for recommendation engine
 * Seeds sample user activity data and tests recommendation endpoints
 */

const { db } = require('../src/config/database');
const { trackView, trackDownload, trackSearch, updateUserPreferences } = require('../src/utils/activityTracker');
const {
    getHybridRecommendations,
    getTrendingMaterials,
    getPopularMaterials,
    getSimilarMaterials
} = require('../src/utils/recommendations');

async function seedActivityData() {
    console.log('🌱 Seeding sample activity data...\n');

    try {
        // Get some users and materials from database
        const users = db.prepare('SELECT id, username FROM users LIMIT 5').all();
        const materials = db.prepare('SELECT id, title FROM materials WHERE is_public = 1 LIMIT 20').all();

        if (users.length === 0 || materials.length === 0) {
            console.log('⚠️  Warning: Not enough users or materials in database');
            console.log(`   Users: ${users.length}, Materials: ${materials.length}`);
            console.log('   Please ensure you have users and materials created first.\n');
            return false;
        }

        console.log(`✓ Found ${users.length} users and ${materials.length} materials\n`);

        // Simulate different user behaviors
        let activityCount = 0;

        // User 1: Interested in Mathematics and Science
        if (users[0]) {
            const mathMaterials = materials.slice(0, 8);
            for (const material of mathMaterials) {
                await trackView(users[0].id, material.id, Math.floor(Math.random() * 300) + 60);
                activityCount++;
                if (Math.random() > 0.7) {
                    await trackDownload(users[0].id, material.id);
                    activityCount++;
                }
            }
            await trackSearch(users[0].id, 'algebra', { subjectId: 1 });
            await trackSearch(users[0].id, 'calculus', { subjectId: 1 });
            activityCount += 2;
            console.log(`✓ User ${users[0].username}: ${activityCount} activities (Math/Science focus)`);
        }

        // User 2: Interested in Technology
        if (users[1]) {
            let userActivities = 0;
            const techMaterials = materials.slice(5, 15);
            for (const material of techMaterials) {
                await trackView(users[1].id, material.id, Math.floor(Math.random() * 200) + 30);
                userActivities++;
                if (Math.random() > 0.6) {
                    await trackDownload(users[1].id, material.id);
                    userActivities++;
                }
            }
            await trackSearch(users[1].id, 'programming', { subjectId: 6 });
            await trackSearch(users[1].id, 'web development', {});
            userActivities += 2;
            console.log(`✓ User ${users[1].username}: ${userActivities} activities (Tech focus)`);
        }

        // User 3: Broad interests
        if (users[2]) {
            let userActivities = 0;
            const randomMaterials = materials.sort(() => Math.random() - 0.5).slice(0, 12);
            for (const material of randomMaterials) {
                await trackView(users[2].id, material.id, Math.floor(Math.random() * 150) + 20);
                userActivities++;
                if (Math.random() > 0.8) {
                    await trackDownload(users[2].id, material.id);
                    userActivities++;
                }
            }
            await trackSearch(users[2].id, 'biology', {});
            userActivities++;
            console.log(`✓ User ${users[2].username}: ${userActivities} activities (Broad interests)`);
        }

        // User 4: Light activity
        if (users[3]) {
            let userActivities = 0;
            const fewMaterials = materials.slice(0, 3);
            for (const material of fewMaterials) {
                await trackView(users[3].id, material.id, Math.floor(Math.random() * 100) + 10);
                userActivities++;
            }
            console.log(`✓ User ${users[3].username}: ${userActivities} activities (Light user)`);
        }

        // User 5: New user with no activity (for testing empty state)
        if (users[4]) {
            console.log(`✓ User ${users[4].username}: 0 activities (New user)`);
        }

        console.log(`\n✅ Successfully seeded activity data!\n`);
        return true;

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        return false;
    }
}

async function testRecommendations() {
    console.log('🧪 Testing recommendation endpoints...\n');

    try {
        const users = db.prepare('SELECT id, username FROM users LIMIT 5').all();

        if (users.length === 0) {
            console.log('⚠️  No users found for testing\n');
            return;
        }

        // Test 1: Update user preferences
        console.log('1️⃣  Testing user preference calculation...');
        for (const user of users) {
            await updateUserPreferences(user.id);
        }
        const prefCount = db.prepare('SELECT COUNT(*) as count FROM user_preferences').get();
        console.log(`   ✓ Calculated preferences for ${prefCount.count} users\n`);

        // Test 2: Hybrid recommendations
        console.log('2️⃣  Testing hybrid recommendations...');
        const user = users[0];
        const recommendations = await getHybridRecommendations(user.id, 5);
        console.log(`   ✓ Generated ${recommendations.length} recommendations for ${user.username}`);
        if (recommendations.length > 0) {
            console.log(`   Top recommendation: "${recommendations[0].title}" (score: ${recommendations[0].score.toFixed(2)})`);
            console.log(`   Reasons: ${recommendations[0].reasons.join(', ')}\n`);
        } else {
            console.log(`   ℹ️  No recommendations (user may need more activity or similar users)\n`);
        }

        // Test 3: Trending materials
        console.log('3️⃣  Testing trending materials...');
        const trending = await getTrendingMaterials(5);
        console.log(`   ✓ Found ${trending.length} trending materials`);
        if (trending.length > 0) {
            console.log(`   Top trending: "${trending[0].title}" (score: ${trending[0].trendingScore.toFixed(2)})`);
            console.log(`   ${trending[0].uniqueUsers} unique users, ${trending[0].totalInteractions} interactions\n`);
        } else {
            console.log(`   ℹ️  No trending materials (no recent activity)\n`);
        }

        // Test 4: Popular materials
        console.log('4️⃣  Testing popular materials...');
        const popular = await getPopularMaterials(5);
        console.log(`   ✓ Found ${popular.length} popular materials`);
        if (popular.length > 0) {
            console.log(`   Most popular: "${popular[0].title}" (total score: ${popular[0].totalScore.toFixed(2)})`);
            console.log(`   ${popular[0].uniqueUsers} unique users\n`);
        } else {
            console.log(`   ℹ️  No popular materials (no interactions)\n`);
        }

        // Test 5: Similar materials
        console.log('5️⃣  Testing similar materials...');
        const materials = db.prepare('SELECT id, title FROM materials LIMIT 1').all();
        if (materials.length > 0) {
            const similar = await getSimilarMaterials(materials[0].id, 3);
            console.log(`   ✓ Found ${similar.length} materials similar to "${materials[0].title}"`);
            if (similar.length > 0) {
                console.log(`   Most similar: "${similar[0].title}" (score: ${similar[0].similarityScore})\n`);
            }
        }

        // Test 6: Check database state
        console.log('6️⃣  Database statistics:');
        const activityCount = db.prepare('SELECT COUNT(*) as count FROM user_activities').get();
        const interactionCount = db.prepare('SELECT COUNT(*) as count FROM user_material_interactions').get();
        console.log(`   • Total activities logged: ${activityCount.count}`);
        console.log(`   • User-material interactions: ${interactionCount.count}`);
        console.log(`   • User preferences calculated: ${prefCount.count}\n`);

        console.log('✅ All tests completed!\n');

    } catch (error) {
        console.error('❌ Error testing recommendations:', error);
    }
}

async function runTests() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Recommendation Engine - Test & Validation  ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const seeded = await seedActivityData();

    if (seeded) {
        // Wait a moment for triggers to process
        await new Promise(resolve => setTimeout(resolve, 500));

        await testRecommendations();
    }

    console.log('═══════════════════════════════════════════════');
    console.log('Test complete! You can now test the API endpoints:');
    console.log('  GET /api/recommendations/personalized');
    console.log('  GET /api/recommendations/trending');
    console.log('  GET /api/recommendations/popular');
    console.log('  GET /api/recommendations/similar/:materialId');
    console.log('═══════════════════════════════════════════════\n');
}

// Run if executed directly
if (require.main === module) {
    runTests().then(() => {
        console.log('✨ Done!\n');
        process.exit(0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { seedActivityData, testRecommendations };
