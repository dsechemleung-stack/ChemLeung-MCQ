/**
 * Migration Script: Move calendar events from global collection to user subcollections
 * 
 * This script migrates existing calendar_events to users/{uid}/calendar_events
 * Run this once to migrate all existing data.
 */

import { db } from './src/firebase/config';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore';

/**
 * Migrate all calendar events to user subcollections
 */
async function migrateCalendarEvents() {
  console.log('🚀 Starting calendar events migration...');
  
  try {
    // Get all calendar events from global collection
    const globalEventsRef = collection(db, 'calendar_events');
    const globalEventsSnapshot = await getDocs(globalEventsRef);
    
    console.log(`📊 Found ${globalEventsSnapshot.size} events to migrate`);
    
    // Group events by user for batch processing
    const eventsByUser = {};
    
    globalEventsSnapshot.forEach(doc => {
      const event = doc.data();
      const userId = event.userId;
      
      if (!eventsByUser[userId]) {
        eventsByUser[userId] = [];
      }
      
      eventsByUser[userId].push({
        id: doc.id,
        ...event
      });
    });
    
    console.log(`👥 Found events for ${Object.keys(eventsByUser).length} users`);
    
    // Process each user's events
    let totalMigrated = 0;
    let totalErrors = 0;
    
    for (const [userId, userEvents] of Object.entries(eventsByUser)) {
      console.log(`👤 Migrating ${userEvents.length} events for user ${userId}`);
      
      try {
        // Process in batches of 500 (Firestore limit)
        const batchSize = 500;
        
        for (let i = 0; i < userEvents.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchEvents = userEvents.slice(i, i + batchSize);
          
          batchEvents.forEach(event => {
            const userEventRef = doc(db, 'users', userId, 'calendar_events', event.id);
            batch.set(userEventRef, event);
          });
          
          await batch.commit();
          console.log(`✅ Migrated batch ${Math.floor(i/batchSize) + 1} (${batchEvents.length} events) for user ${userId}`);
        }
        
        totalMigrated += userEvents.length;
        console.log(`✅ Successfully migrated all events for user ${userId}`);
        
      } catch (error) {
        console.error(`❌ Error migrating events for user ${userId}:`, error);
        totalErrors++;
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`- Total events migrated: ${totalMigrated}`);
    console.log(`- Users with errors: ${totalErrors}`);
    console.log(`- Success rate: ${((totalMigrated / globalEventsSnapshot.size) * 100).toFixed(2)}%`);
    
    // Optional: Delete old global events after verification
    console.log('\n⚠️  IMPORTANT: Verify migration success before deleting old events');
    console.log('To delete old events, uncomment and run the cleanup function below');
    
    // await cleanupGlobalEvents();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

/**
 * Optional: Clean up old global events after verification
 * ONLY RUN THIS AFTER VERIFYING MIGRATION SUCCESS
 */
async function cleanupGlobalEvents() {
  console.log('🗑️ Cleaning up old global calendar events...');
  
  try {
    const globalEventsRef = collection(db, 'calendar_events');
    const globalEventsSnapshot = await getDocs(globalEventsRef);
    
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < globalEventsSnapshot.size; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = globalEventsSnapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`🗑️ Deleted batch ${Math.floor(i/batchSize) + 1} (${batchDocs.length} events)`);
    }
    
    console.log(`✅ Deleted ${deletedCount} old global events`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Verify migration by comparing counts
 */
async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  try {
    // Count global events
    const globalEventsRef = collection(db, 'calendar_events');
    const globalEventsSnapshot = await getDocs(globalEventsRef);
    const globalCount = globalEventsSnapshot.size;
    
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUserEvents = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userEventsRef = collection(db, 'users', userDoc.id, 'calendar_events');
      const userEventsSnapshot = await getDocs(userEventsRef);
      totalUserEvents += userEventsSnapshot.size;
    }
    
    console.log(`📊 Verification Results:`);
    console.log(`- Global collection events: ${globalCount}`);
    console.log(`- User subcollection events: ${totalUserEvents}`);
    console.log(`- Match: ${globalCount === totalUserEvents ? '✅' : '❌'}`);
    
    if (globalCount !== totalUserEvents) {
      console.log(`⚠️  Difference: ${Math.abs(globalCount - totalUserEvents)} events`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run migration if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  migrateCalendarEvents()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateCalendarEvents, verifyMigration, cleanupGlobalEvents };
