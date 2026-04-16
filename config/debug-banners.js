const path = require('path');
const mongoose = require('mongoose');
const { Banner } = require('@librechat/data-schemas').createModels(mongoose);
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');

async function debugBanners() {
  try {
    console.log('Connecting to database...');
    await connect();
    
    // Get all TEST banners
    const banners = await Banner.find(
      { message: /^\[TEST\]/ }
    )
      .sort({ priority: -1, displayFrom: -1 })
      .lean();
    
    console.log('\n=== ALL TEST BANNERS ===\n');
    
    const now = new Date();
    banners.forEach((b, idx) => {
      const withinDates = 
        b.displayFrom <= now && 
        (!b.displayTo || b.displayTo >= now);
      
      console.log(`${idx + 1}. ${b.message.substring(0, 60)}`);
      console.log(`   Audience: ${b.audienceMode || 'legacy'}`);
      console.log(`   Priority: ${b.priority || 50}`);
      console.log(`   Active: ${b.isActive !== false ? 'YES' : 'NO'}`);
      console.log(`   Within dates: ${withinDates ? 'YES' : 'NO'}`);
      console.log(`   From: ${b.displayFrom?.toISOString()}`);
      console.log(`   To: ${b.displayTo?.toISOString() || 'null'}`);
      console.log(`   Persistable: ${b.persistable || false}`);
      if (b.targetRoleIds?.length) {
        console.log(`   Roles: ${JSON.stringify(b.targetRoleIds)}`);
      }
      if (b.targetGroupIds?.length) {
        console.log(`   Groups: ${JSON.stringify(b.targetGroupIds)}`);
      }
      if (b.targetUserIds?.length) {
        console.log(`   Users: ${JSON.stringify(b.targetUserIds)}`);
      }
      console.log('');
    });
    
    // Count by status
    const active = banners.filter(b => b.isActive !== false);
    const withinDates = banners.filter(b => 
      b.displayFrom <= now && (!b.displayTo || b.displayTo >= now)
    );
    const shouldBeVisible = banners.filter(b => 
      b.isActive !== false &&
      b.displayFrom <= now && 
      (!b.displayTo || b.displayTo >= now)
    );
    
    console.log('=== SUMMARY ===');
    console.log(`Total: ${banners.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Within date range: ${withinDates.length}`);
    console.log(`Should be visible (active + dates): ${shouldBeVisible.length}`);
    
    // Show which ones should be visible
    console.log('\n=== SHOULD BE VISIBLE NOW ===\n');
    shouldBeVisible.forEach((b, idx) => {
      console.log(`${idx + 1}. [${b.audienceMode || 'legacy'}] P${b.priority || 50} - ${b.message.substring(0, 70)}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugBanners();
