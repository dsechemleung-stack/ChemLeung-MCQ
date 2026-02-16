/**
 * Setup Calendar Cleanup - One-time setup script
 * 
 * This script sets up the automatic daily cleanup system
 * and can be run as a scheduled job or cloud function
 */

import { calendarCleanupService } from './src/services/calendarCleanupService';

/**
 * Setup and start automatic cleanup
 */
async function setupAutoCleanup() {
  console.log('🚀 Setting up automatic calendar cleanup...');
  
  try {
    // Start the scheduling system
    calendarCleanupService.scheduleAutoCleanup();
    
    console.log('✅ Automatic cleanup scheduled successfully');
    console.log('📅 Cleanup will run daily at 2 AM server time');
    console.log('🔄 The system will automatically reschedule after each run');
    
  } catch (error) {
    console.error('❌ Failed to setup automatic cleanup:', error);
  }
}

/**
 * Run one-time cleanup immediately
 */
async function runImmediateCleanup() {
  console.log('🧹 Running immediate calendar cleanup...');
  
  try {
    const report = await calendarCleanupService.runDailyCleanup();
    
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log(`✅ Processed ${report.usersProcessed} users`);
    console.log(`🗑️  Deleted ${report.totalDeleted} unfinished events`);
    console.log(`💾 Preserved ${report.totalPreserved} events`);
    console.log(`💰 Monthly savings: ${report.costSavings.monthly}`);
    
    if (report.errors > 0) {
      console.log(`⚠️  ${report.errors} errors occurred`);
    }
    
    return report;
    
  } catch (error) {
    console.error('❌ Immediate cleanup failed:', error);
    throw error;
  }
}

/**
 * Test cleanup on a specific user
 */
async function testUserCleanup(userId) {
  console.log(`🧪 Testing cleanup for user: ${userId}`);
  
  try {
    // Get stats before cleanup
    const beforeStats = await calendarCleanupService.getCleanupStats(userId);
    console.log('📊 Before cleanup:', beforeStats);
    
    // Run cleanup
    const result = await calendarCleanupService.cleanupUserCalendar(userId, 0);
    console.log('🧹 Cleanup result:', result);
    
    // Get stats after cleanup
    const afterStats = await calendarCleanupService.getCleanupStats(userId);
    console.log('📊 After cleanup:', afterStats);
    
    return { beforeStats, result, afterStats };
    
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
    throw error;
  }
}

// Command line interface
if (typeof window === 'undefined') {
  const command = process.argv[2];
  const userId = process.argv[3];
  
  switch (command) {
    case 'setup':
      setupAutoCleanup()
        .then(() => {
          console.log('✅ Setup complete');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'run':
      runImmediateCleanup()
        .then(() => {
          console.log('✅ Cleanup complete');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Cleanup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'test':
      if (!userId) {
        console.error('❌ Please provide a userId for testing');
        console.log('Usage: node setup-calendar-cleanup.js test <userId>');
        process.exit(1);
      }
      
      testUserCleanup(userId)
        .then(() => {
          console.log('✅ Test complete');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Test failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('📋 Available commands:');
      console.log('  setup  - Schedule automatic daily cleanup');
      console.log('  run    - Run cleanup immediately');
      console.log('  test   - Test cleanup for specific user');
      console.log('');
      console.log('Usage:');
      console.log('  node setup-calendar-cleanup.js setup');
      console.log('  node setup-calendar-cleanup.js run');
      console.log('  node setup-calendar-cleanup.js test <userId>');
      process.exit(0);
  }
}

export { setupAutoCleanup, runImmediateCleanup, testUserCleanup };
