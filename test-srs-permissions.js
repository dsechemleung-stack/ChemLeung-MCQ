/**
 * Test SRS Permissions - Simple diagnostic tool
 * 
 * Run this to debug Firebase permissions for SRS system
 */

// Fix import path for Node.js
import { srsService } from './src/services/srsService.js';

async function testSRSPermissions() {
  console.log('🧪 Testing SRS Permissions...');
  
  // Test user ID (replace with actual user ID)
  const testUserId = 'test_user_permissions';
  
  try {
    console.log('1. Testing getAllCards...');
    const allCards = await srsService.getAllCards(testUserId);
    console.log('✅ getAllCards works:', allCards.length, 'cards');
    
    console.log('2. Testing getDueCards...');
    const dueCards = await srsService.getDueCards(testUserId);
    console.log('✅ getDueCards works:', dueCards.length, 'due cards');
    
    console.log('3. Testing createCardsFromMistakes...');
    const testQuestions = [
      { ID: 'test_perm_q1', Topic: 'Chemistry', Subtopic: 'Test Topic', attemptCount: 1 }
    ];
    
    const cards = await srsService.createCardsFromMistakes(
      testUserId, 
      testQuestions, 
      `test_session_${Date.now()}`, 
      `test_attempt_${Date.now()}`
    );
    
    console.log('✅ createCardsFromMistakes works:', cards.length, 'cards created');
    
    // Show the actual card data being created
    if (cards.length > 0) {
      console.log('📄 Card data structure:');
      console.log(JSON.stringify(cards[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Permission test failed:', error);
    
    // Detailed error analysis
    if (error.code) {
      console.log('🔍 Firebase Error Code:', error.code);
      console.log('🔍 Firebase Error Message:', error.message);
    }
    
    if (error.details) {
      console.log('🔍 Error Details:', error.details);
    }
  }
}

// Run if executed directly
if (typeof window === 'undefined') {
  testSRSPermissions()
    .then(() => {
      console.log('🎉 Permission test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Permission test failed:', error);
      process.exit(1);
    });
}

export { testSRSPermissions };
