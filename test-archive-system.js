/**
 * Test script for SRS archiving system
 * 
 * This script tests:
 * 1. Archiving overdue cards older than 7 days
 * 2. Updated overdue count logic
 * 3. Retrieving archived cards
 * 4. Restoring archived cards
 */

import { srsService } from './src/services/srsService.js';
import { getAuth } from './src/contexts/AuthContext.js';

// Test configuration
const TEST_USER_ID = 'test_user_' + Date.now();

async function runArchiveTests() {
  console.log('🧪 Starting SRS Archive System Tests...\n');
  
  try {
    // Test 1: Create some test cards with different overdue periods
    console.log('📝 Test 1: Creating test cards...');
    await createTestCards();
    
    // Test 2: Check overdue count before archiving
    console.log('\n📊 Test 2: Checking overdue count before archiving...');
    const overdueBefore = await srsService.getOverdueCount(TEST_USER_ID);
    console.log(`Overdue count before: ${overdueBefore}`);
    
    // Test 3: Run archive process
    console.log('\n🗄️ Test 3: Running archive process...');
    const archivedCount = await srsService.archiveOverdueCards(TEST_USER_ID);
    console.log(`Archived ${archivedCount} cards`);
    
    // Test 4: Check overdue count after archiving
    console.log('\n📊 Test 4: Checking overdue count after archiving...');
    const overdueAfter = await srsService.getOverdueCount(TEST_USER_ID);
    console.log(`Overdue count after: ${overdueAfter}`);
    
    // Test 5: Retrieve archived cards
    console.log('\n📋 Test 5: Retrieving archived cards...');
    const archivedCards = await srsService.getArchivedCards(TEST_USER_ID);
    console.log(`Found ${archivedCards.length} archived cards`);
    archivedCards.forEach(card => {
      console.log(`  - ${card.questionId} (archived: ${card.archivedAt}, reason: ${card.archiveReason})`);
    });
    
    // Test 6: Restore a card
    if (archivedCards.length > 0) {
      console.log('\n♻️ Test 6: Restoring a card...');
      const cardToRestore = archivedCards[0];
      await srsService.restoreArchivedCard(cardToRestore.id);
      console.log(`Restored card: ${cardToRestore.questionId}`);
      
      // Verify restoration
      const restoredCard = await srsService.getCard(cardToRestore.id);
      console.log(`Card active status: ${restoredCard.isActive}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function createTestCards() {
  // This would normally be done through the SRS service
  // For testing, we'll create mock data directly in Firestore
  console.log('Creating test cards with different overdue periods...');
  
  const testCards = [
    {
      id: `test_card_1_${Date.now()}`,
      userId: TEST_USER_ID,
      questionId: 'test_q_1',
      topic: 'Test Topic',
      subtopic: 'Test Subtopic',
      nextReviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
      isActive: true,
      status: 'review',
      interval: 6,
      easeFactor: 2.5,
      repetitionCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `test_card_2_${Date.now()}`,
      userId: TEST_USER_ID,
      questionId: 'test_q_2',
      topic: 'Test Topic',
      subtopic: 'Test Subtopic',
      nextReviewDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 days ago
      isActive: true,
      status: 'review',
      interval: 4,
      easeFactor: 2.3,
      repetitionCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `test_card_3_${Date.now()}`,
      userId: TEST_USER_ID,
      questionId: 'test_q_3',
      topic: 'Test Topic',
      subtopic: 'Test Subtopic',
      nextReviewDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
      isActive: true,
      status: 'learning',
      interval: 1,
      easeFactor: 2.0,
      repetitionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  // Save test cards to Firestore
  for (const card of testCards) {
    await srsService.saveCard(card);
    console.log(`Created test card: ${card.questionId} (due: ${card.nextReviewDate})`);
  }
}

// Helper function to save a card (would need to be added to srsService)
async function saveCardDirectly(card) {
  // This would need to be implemented or use existing srsService methods
  console.log(`Would save card: ${card.id}`);
}

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  runArchiveTests().catch(console.error);
} else {
  // Browser environment - expose to window for manual testing
  window.testArchiveSystem = runArchiveTests;
  console.log('Test function available as window.testArchiveSystem()');
}
