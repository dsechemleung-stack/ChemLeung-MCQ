/**
 * Debug System for SRS Overdue Reviews Simulation
 * 
 * This script creates test data to simulate:
 * - 60 overdue reviews on 16/2 (should show in overdue count)
 * - 20 overdue reviews on 15/2 or before (should be archived)
 * 
 * Also includes time travel functionality to test UI at different dates
 */

import { db } from './src/firebase/config.js';
import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Test configuration
const TEST_USER_ID = 'debug_test_user_' + Date.now();

// Mock question data
const mockQuestions = [
  { ID: 'chem_001', Topic: 'Atomic Structure', Subtopic: 'Electron Configuration' },
  { ID: 'chem_002', Topic: 'Atomic Structure', Subtopic: 'Periodic Trends' },
  { ID: 'chem_003', Topic: 'Bonding', Subtopic: 'Covalent Bonds' },
  { ID: 'chem_004', Topic: 'Bonding', Subtopic: 'Ionic Bonds' },
  { ID: 'chem_005', Topic: 'Thermodynamics', Subtopic: 'Enthalpy' },
  { ID: 'chem_006', Topic: 'Thermodynamics', Subtopic: 'Entropy' },
  { ID: 'chem_007', Topic: 'Kinetics', Subtopic: 'Reaction Rates' },
  { ID: 'chem_008', Topic: 'Kinetics', Subtopic: 'Activation Energy' },
  { ID: 'chem_009', Topic: 'Equilibrium', Subtopic: 'Le Chatelier' },
  { ID: 'chem_010', Topic: 'Equilibrium', Subtopic: 'Equilibrium Constants' }
];

/**
 * Create SRS cards with specific overdue dates
 */
async function createOverdueCards() {
  console.log('🔧 Creating debug SRS cards...\n');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1); // 15/2 if today is 16/2
  
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // 13/2 or before
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
  
  console.log(`📅 Today: ${todayStr}`);
  console.log(`📅 Yesterday: ${yesterdayStr}`);
  console.log(`📅 Three days ago: ${threeDaysAgoStr}`);
  
  const cards = [];
  
  // Create 60 cards overdue on 16/2 (yesterday - should show in overdue count)
  console.log('\n📝 Creating 60 cards overdue on 16/2...');
  for (let i = 0; i < 60; i++) {
    const question = mockQuestions[i % mockQuestions.length];
    const card = {
      id: `debug_card_16feb_${i}`,
      userId: TEST_USER_ID,
      questionId: `${question.ID}_${i}`,
      topic: question.Topic,
      subtopic: question.Subtopic,
      sessionId: `debug_session_${Date.now()}`,
      attemptId: `debug_attempt_${Date.now()}`,
      
      // SRS properties
      nextReviewDate: yesterdayStr, // Due yesterday (16/2)
      isActive: true,
      status: 'review',
      interval: Math.floor(Math.random() * 10) + 1,
      easeFactor: 2.0 + Math.random() * 0.5,
      repetitionCount: Math.floor(Math.random() * 5),
      
      // Timestamps
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    cards.push(card);
  }
  
  // Create 20 cards overdue on 15/2 or before (should be archived)
  console.log('📝 Creating 20 cards overdue on 15/2 or before...');
  for (let i = 0; i < 20; i++) {
    const question = mockQuestions[i % mockQuestions.length];
    const overdueDays = Math.floor(Math.random() * 5) + 3; // 3-7 days ago
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - overdueDays);
    const overdueDateStr = overdueDate.toISOString().split('T')[0];
    
    const card = {
      id: `debug_card_old_${i}`,
      userId: TEST_USER_ID,
      questionId: `${question.ID}_old_${i}`,
      topic: question.Topic,
      subtopic: question.Subtopic,
      sessionId: `debug_session_${Date.now()}`,
      attemptId: `debug_attempt_${Date.now()}`,
      
      // SRS properties
      nextReviewDate: overdueDateStr, // Due 3-7 days ago (should be archived)
      isActive: true,
      status: 'review',
      interval: Math.floor(Math.random() * 15) + 5,
      easeFactor: 1.8 + Math.random() * 0.7,
      repetitionCount: Math.floor(Math.random() * 8) + 2,
      
      // Timestamps
      createdAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    cards.push(card);
  }
  
  // Save cards to Firestore in batches
  const batchSize = 500;
  let savedCount = 0;
  
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchCards = cards.slice(i, i + batchSize);
    
    batchCards.forEach(card => {
      const cardRef = doc(db, 'spaced_repetition_cards', card.id);
      batch.set(cardRef, card);
    });
    
    await batch.commit();
    savedCount += batchCards.length;
    console.log(`📦 Saved batch of ${batchCards.length} cards (total: ${savedCount})`);
  }
  
  console.log(`\n✅ Successfully created ${cards.length} debug cards`);
  console.log(`  - 60 cards overdue on 16/2 (will show in overdue count)`);
  console.log(`  - 20 cards overdue on 15/2 or before (will be archived)`);
  
  return { TEST_USER_ID, cards };
}

/**
 * Check current overdue counts
 */
async function checkOverdueCounts(userId) {
  console.log('\n📊 Checking overdue counts...\n');
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  // Get all cards for the user
  const cardsQuery = query(
    collection(db, 'spaced_repetition_cards'),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(cardsQuery);
  const allCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`Total cards: ${allCards.length}`);
  
  // Count overdue cards (old logic - all overdue)
  const overdueOld = allCards.filter(card => 
    card.isActive && card.nextReviewDate < todayStr
  );
  console.log(`Overdue (old logic): ${overdueOld.length}`);
  
  // Count overdue cards (new logic - < 7 days)
  const overdueNew = allCards.filter(card => 
    card.isActive && 
    card.nextReviewDate < todayStr && 
    card.nextReviewDate >= sevenDaysAgoStr
  );
  console.log(`Overdue (new logic): ${overdueNew.length}`);
  
  // Count cards that should be archived (> 7 days overdue)
  const shouldArchive = allCards.filter(card => 
    card.isActive && card.nextReviewDate < sevenDaysAgoStr
  );
  console.log(`Should be archived (>7 days): ${shouldArchive.length}`);
  
  // Show breakdown by date
  const overdueByDate = {};
  overdueOld.forEach(card => {
    overdueByDate[card.nextReviewDate] = (overdueByDate[card.nextReviewDate] || 0) + 1;
  });
  
  console.log('\n📅 Overdue by date:');
  Object.entries(overdueByDate).sort().forEach(([date, count]) => {
    console.log(`  ${date}: ${count} cards`);
  });
  
  return {
    total: allCards.length,
    overdueOld: overdueOld.length,
    overdueNew: overdueNew.length,
    shouldArchive: shouldArchive.length,
    overdueByDate
  };
}

/**
 * Time travel utility for testing
 */
class TimeTravel {
  constructor() {
    this.originalDate = new Date();
    this.currentDate = new Date();
  }
  
  // Travel to specific date
  travelTo(date) {
    console.log(`⏰ Time traveling to: ${date.toISOString().split('T')[0]}`);
    this.currentDate = new Date(date);
    
    // Override Date.now() and new Date() for the app
    const originalNow = Date.now;
    const originalDateConstructor = globalThis.Date;
    
    Date.now = () => this.currentDate.getTime();
    
    globalThis.Date = function(...args) {
      if (args.length === 0) {
        return new TimeTravelDate(this.currentDate);
      }
      return new originalDateConstructor(...args);
    };
    
    // Copy static methods
    Object.setPrototypeOf(globalThis.Date, originalDateConstructor);
    Object.getOwnPropertyNames(originalDateConstructor).forEach(name => {
      if (typeof originalDateConstructor[name] === 'function') {
        globalThis.Date[name] = originalDateConstructor[name];
      }
    });
    
    console.log(`⏰ Current time: ${this.currentDate.toISOString()}`);
  }
  
  // Reset to original time
  reset() {
    console.log('⏰ Resetting time to present');
    this.currentDate = new Date(this.originalDate);
    location.reload(); // Simple way to reset Date overrides
  }
  
  // Get current simulated date
  now() {
    return new Date(this.currentDate);
  }
}

// Helper class to override Date behavior
class TimeTravelDate extends Date {
  constructor(date) {
    super(date);
  }
}

/**
 * Run complete debug scenario
 */
async function runDebugScenario() {
  console.log('🚀 Starting SRS Overdue Debug Scenario\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create test data
    const { TEST_USER_ID } = await createOverdueCards();
    
    // Step 2: Check initial counts
    const counts = await checkOverdueCounts(TEST_USER_ID);
    
    // Step 3: Initialize time travel
    const timeTravel = new TimeTravel();
    
    console.log('\n⏰ Time Travel Instructions:');
    console.log('Open browser console and run:');
    console.log(`window.timeTravel = new TimeTravel();`);
    console.log(`window.timeTravel.travelTo(new Date('2026-02-16'));`);
    console.log(`window.timeTravel.travelTo(new Date('2026-02-14'));`);
    console.log(`window.timeTravel.reset();`);
    
    // Make time travel available globally
    if (typeof window !== 'undefined') {
      window.debugData = {
        TEST_USER_ID,
        counts,
        timeTravel
      };
    }
    
    console.log('\n✅ Debug scenario setup complete!');
    console.log(`Test User ID: ${TEST_USER_ID}`);
    console.log('Use the time travel functions to test UI at different dates');
    
  } catch (error) {
    console.error('❌ Debug scenario failed:', error);
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.runDebugScenario = runDebugScenario;
  window.TimeTravel = TimeTravel;
  console.log('Debug functions available in window:');
  console.log('- runDebugScenario()');
  console.log('- TimeTravel class');
}

// Run if in Node.js
if (typeof window === 'undefined') {
  runDebugScenario().catch(console.error);
}
