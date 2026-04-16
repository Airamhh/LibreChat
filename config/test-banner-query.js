const path = require('path');
const mongoose = require('mongoose');
const { Banner, User } = require('@librechat/data-schemas').createModels(mongoose);
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');

// Import getActiveBanners method
const { createBannerMethods } = require('../packages/data-schemas/dist/methods/banner.cjs');
const { getActiveBanners } = createBannerMethods(mongoose);

async function testBannerQuery() {
  try {
    console.log('Connecting to database...');
    await connect();
    
    // Get a sample user (you)
    const users = await User.find().limit(5).lean();
    
    if (users.length === 0) {
      console.log('No users found. Testing with null user (unauthenticated)...');
      const banners = await getActiveBanners(null, { limit: 20 });
      console.log(`\n=== BANNERS FOR UNAUTHENTICATED USER ===`);
      console.log(`Found ${banners.length} banners:\n`);
      banners.forEach((b, idx) => {
        console.log(`${idx + 1}. [P${b.priority}] ${b.message.substring(0, 70)}`);
        console.log(`   Audience: ${b.audienceMode || 'legacy'}, Public: ${b.isPublic || false}`);
      });
      process.exit(0);
    }
    
    console.log(`\nFound ${users.length} users. Testing with each:\n`);
    
    for (const user of users) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`USER: ${user.email || user.username || user._id}`);
      console.log(`Role: ${user.role || 'none'}`);
      console.log(`ID: ${user._id}`);
      console.log('='.repeat(80));
      
      const banners = await getActiveBanners(user, { limit: 20 });
      
      console.log(`\nFound ${banners.length} banners for this user:\n`);
      
      if (banners.length === 0) {
        console.log('❌ NO BANNERS - This is the problem!');
        console.log('\nPossible reasons:');
        console.log('- User role does not match banner targetRoleIds');
        console.log('- User is not in any targetGroupIds');
        console.log('- No global banners exist');
        console.log('- Banner dates are outside range');
      } else {
        banners.forEach((b, idx) => {
          console.log(`${idx + 1}. [${b.audienceMode || 'legacy'}] P${b.priority || 50} ${b.persistable ? '🔒' : '✕'}`);
          console.log(`   ${b.message.substring(0, 80)}`);
          if (b.targetRoleIds?.length) {
            console.log(`   Roles: ${JSON.stringify(b.targetRoleIds)}`);
          }
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testBannerQuery();
