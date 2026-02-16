/**
 * Calendar Cleanup Service - Automated Daily Cleanup
 * 
 * Automatically deletes unfinished events when the day passes
 * Preserves completed records for history and analytics
 */

import { db } from '../firebase/config';
import { 
  collection, 
  doc,
  getDocs, 
  deleteDoc,
  query, 
  where, 
  writeBatch,
  Timestamp
} from 'firebase/firestore';

export const CLEANUP_CONFIG = {
  // Run cleanup at 2 AM server time
  cleanupHour: 2,
  
  // Delete events older than this many days
  daysToKeep: 0, // Delete yesterday's unfinished events
  
  // Types of events to clean up (if not completed and past)
  cleanupEventTypes: [
    'study_suggestion',
    'ai_recommendation'
  ],

  // Keep spaced repetition events for this many days (even if unfinished and past)
  spacedRepetitionDaysToKeep: 7,
  
  // Never delete these event types (even if incomplete and past)
  preserveEventTypes: [
    'major_exam',
    'small_quiz',
    'completion'  // Always preserve completion records
  ]
};

/**
 * Get all users who have calendar events
 */
async function getAllUsersWithCalendarEvents() {
  try {
    // Get all users from the users collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('❌ Error getting users:', error);
    return [];
  }
}

/**
 * Clean up unfinished events for a specific user
 */
async function cleanupUserEvents(userId, cutoffDate) {
  try {
    console.log(`🧹 Cleaning up events for user ${userId}...`);

    const today = new Date();
    const keepSrsFrom = new Date(today);
    keepSrsFrom.setDate(keepSrsFrom.getDate() - CLEANUP_CONFIG.spacedRepetitionDaysToKeep);
    const keepSrsFromStr = keepSrsFrom.toISOString().split('T')[0];
    
    // Query user's calendar events before cutoff date
    const eventsQuery = query(
      collection(db, 'users', userId, 'calendar_events'),
      where('date', '<', cutoffDate)
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    
    if (eventsSnapshot.empty) {
      console.log(`✅ No old events found for user ${userId}`);
      return { deleted: 0, preserved: 0 };
    }
    
    let toDelete = [];
    let toPreserve = [];
    
    // Categorize events
    eventsSnapshot.forEach(doc => {
      const event = doc.data();
      
      // Always preserve completed events
      if (event.completed === true) {
        toPreserve.push({ id: doc.id, ...event });
        return;
      }
      
      // Never delete major exams, small quizzes, and completion records (even if incomplete and past)
      if (CLEANUP_CONFIG.preserveEventTypes.includes(event.type)) {
        toPreserve.push({ id: doc.id, ...event });
        return;
      }
      
      // Preserve spaced repetition events within the last N days
      if (event.type === 'spaced_repetition' && event.date >= keepSrsFromStr) {
        toPreserve.push({ id: doc.id, ...event });
        return;
      }

      // Delete cleanup-eligible events that are not completed (study suggestions, AI recommendations)
      if (CLEANUP_CONFIG.cleanupEventTypes.includes(event.type)) {
        toDelete.push({ id: doc.id, ...event });
        return;
      }

      // Delete spaced repetition events older than the keep window
      if (event.type === 'spaced_repetition') {
        toDelete.push({ id: doc.id, ...event });
      } else {
        // Preserve unknown event types
        toPreserve.push({ id: doc.id, ...event });
      }
    });
    
    // Batch delete events
    let deletedCount = 0;
    if (toDelete.length > 0) {
      const batchSize = 500; // Firestore batch limit
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchToDelete = toDelete.slice(i, i + batchSize);
        
        batchToDelete.forEach(event => {
          const eventRef = doc(db, 'users', userId, 'calendar_events', event.id);
          batch.delete(eventRef);
        });
        
        await batch.commit();
        deletedCount += batchToDelete.length;
      }
    }
    
    console.log(`📊 User ${userId} cleanup:`, {
      deleted: deletedCount,
      preserved: toPreserve.length,
      total: eventsSnapshot.size
    });
    
    return { deleted: deletedCount, preserved: toPreserve.length };
    
  } catch (error) {
    console.error(`❌ Error cleaning up user ${userId}:`, error);
    return { deleted: 0, preserved: 0, error: error.message };
  }
}

/**
 * Main cleanup function - runs for all users
 */
export async function runDailyCleanup() {
  console.log('🚀 Starting daily calendar cleanup...');
  
  try {
    // Calculate cutoff date (yesterday)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.daysToKeep - 1);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    console.log(`📅 Cleaning events before: ${cutoffDateStr}`);
    
    // Get all users
    const userIds = await getAllUsersWithCalendarEvents();
    console.log(`👥 Found ${userIds.length} users to process`);
    
    // Clean up events for each user
    let totalDeleted = 0;
    let totalPreserved = 0;
    let errors = [];
    
    for (const userId of userIds) {
      const result = await cleanupUserEvents(userId, cutoffDateStr);
      totalDeleted += result.deleted;
      totalPreserved += result.preserved;
      
      if (result.error) {
        errors.push({ userId, error: result.error });
      }
    }
    
    // Generate cleanup report
    const report = {
      timestamp: new Date().toISOString(),
      cutoffDate: cutoffDateStr,
      usersProcessed: userIds.length,
      totalDeleted,
      totalPreserved,
      errors: errors.length,
      costSavings: calculateCostSavings(totalDeleted)
    };
    
    console.log('\n📊 CLEANUP REPORT');
    console.log('='.repeat(50));
    console.log(`📅 Cutoff Date: ${report.cutoffDate}`);
    console.log(`👥 Users Processed: ${report.usersProcessed}`);
    console.log(`🗑️  Events Deleted: ${report.totalDeleted}`);
    console.log(`💾 Events Preserved: ${report.totalPreserved}`);
    console.log(`❌ Errors: ${report.errors}`);
    console.log(`💰 Cost Savings: ${report.costSavings}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ userId, error }) => {
        console.log(`  User ${userId}: ${error}`);
      });
    }
    
    return report;
    
  } catch (error) {
    console.error('❌ Daily cleanup failed:', error);
    throw error;
  }
}

/**
 * Clean up events for a specific user (manual trigger)
 */
export async function cleanupUserCalendar(userId, daysToKeep = 0) {
  console.log(`🧹 Manual cleanup for user ${userId}...`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep - 1);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const result = await cleanupUserEvents(userId, cutoffDateStr);
  
  console.log(`📊 Cleanup complete for user ${userId}:`, result);
  return result;
}

/**
 * Calculate cost savings from cleanup
 */
function calculateCostSavings(deletedEvents) {
  // Firestore storage cost: $0.18 per GB per month
  // Assume average event size: 1KB
  const gbPerEvent = 0.000001; // 1KB in GB
  const monthlyStorageCost = deletedEvents * gbPerEvent * 0.18;
  
  // Read cost savings: $0.06 per 100,000 reads
  // Assume each deleted event would be read once per month
  const monthlyReadCost = (deletedEvents / 100000) * 0.06;
  
  const totalMonthlySavings = monthlyStorageCost + monthlyReadCost;
  
  return {
    monthly: `$${totalMonthlySavings.toFixed(4)}`,
    yearly: `$${(totalMonthlySavings * 12).toFixed(2)}`
  };
}

/**
 * Schedule automatic cleanup (runs daily at 2 AM)
 */
export function scheduleAutoCleanup() {
  console.log('⏰ Scheduling automatic daily cleanup at 2 AM...');
  
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(CLEANUP_CONFIG.cleanupHour, 0, 0, 0);
  
  // If 2 AM has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  const msUntilCleanup = scheduledTime.getTime() - now.getTime();
  
  console.log(`📅 Next cleanup scheduled for: ${scheduledTime.toISOString()}`);
  console.log(`⏱️  Time until cleanup: ${Math.floor(msUntilCleanup / (1000 * 60 * 60))} hours`);
  
  setTimeout(async () => {
    console.log('⏰ Running scheduled cleanup...');
    try {
      await runDailyCleanup();
      console.log('✅ Scheduled cleanup completed');
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
    
    // Schedule next day's cleanup
    scheduleAutoCleanup();
  }, msUntilCleanup);
}

/**
 * Get cleanup statistics for a user
 */
export async function getCleanupStats(userId) {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const eventsQuery = query(
      collection(db, 'users', userId, 'calendar_events'),
      where('date', '<', yesterday.toISOString().split('T')[0])
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    
    let completed = 0;
    let unfinished = 0;
    let deletable = 0;
    
    eventsSnapshot.forEach(doc => {
      const event = doc.data();
      
      if (event.completed) {
        completed++;
      } else {
        unfinished++;
        
        if (CLEANUP_CONFIG.cleanupEventTypes.includes(event.type)) {
          deletable++;
        }
      }
    });
    
    return {
      total: eventsSnapshot.size,
      completed,
      unfinished,
      deletable,
      deletableTypes: CLEANUP_CONFIG.cleanupEventTypes
    };
    
  } catch (error) {
    console.error('❌ Error getting cleanup stats:', error);
    return null;
  }
}

export const calendarCleanupService = {
  runDailyCleanup,
  cleanupUserCalendar,
  scheduleAutoCleanup,
  getCleanupStats,
  CLEANUP_CONFIG
};

export default calendarCleanupService;
