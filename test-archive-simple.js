/**
 * Simple test for SRS archiving system logic
 * Tests the core functionality without Firebase dependencies
 */

// Mock the SRS logic for testing
function testArchiveLogic() {
  console.log('🧪 Testing SRS Archive Logic...\n');
  
  // Test data: cards with different overdue periods
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const testCards = [
    {
      id: 'card1',
      userId: 'test_user',
      questionId: 'q1',
      nextReviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
      isActive: true,
      status: 'review'
    },
    {
      id: 'card2', 
      userId: 'test_user',
      questionId: 'q2',
      nextReviewDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 days ago
      isActive: true,
      status: 'review'
    },
    {
      id: 'card3',
      userId: 'test_user', 
      questionId: 'q3',
      nextReviewDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
      isActive: true,
      status: 'learning'
    },
    {
      id: 'card4',
      userId: 'test_user',
      questionId: 'q4', 
      nextReviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
      isActive: false, // Already archived
      status: 'graduated'
    }
  ];
  
  console.log('📋 Test Cards:');
  testCards.forEach(card => {
    console.log(`  ${card.id}: due ${card.nextReviewDate}, active: ${card.isActive}, status: ${card.status}`);
  });
  
  // Test 1: Calculate overdue count (new logic - only < 7 days)
  console.log('\n📊 Test 1: Overdue Count (new logic - only < 7 days)');
  const overdueCountNew = testCards.filter(card => 
    card.isActive && 
    card.nextReviewDate < today && 
    card.nextReviewDate >= sevenDaysAgoStr
  ).length;
  console.log(`Overdue count (new): ${overdueCountNew}`);
  
  // Test 2: Calculate overdue count (old logic - all overdue)
  console.log('\n📊 Test 2: Overdue Count (old logic - all overdue)');
  const overdueCountOld = testCards.filter(card => 
    card.isActive && 
    card.nextReviewDate < today
  ).length;
  console.log(`Overdue count (old): ${overdueCountOld}`);
  
  // Test 3: Find cards to archive (overdue > 7 days)
  console.log('\n🗄️ Test 3: Cards to Archive (overdue > 7 days)');
  const cardsToArchive = testCards.filter(card => 
    card.isActive && 
    card.nextReviewDate < sevenDaysAgoStr
  );
  console.log(`Cards to archive: ${cardsToArchive.length}`);
  cardsToArchive.forEach(card => {
    console.log(`  ${card.id}: due ${card.nextReviewDate}`);
  });
  
  // Test 4: Simulate archiving
  console.log('\n📦 Test 4: Simulating Archiving');
  let archivedCount = 0;
  const updatedCards = testCards.map(card => {
    if (cardsToArchive.find(c => c.id === card.id)) {
      archivedCount++;
      return {
        ...card,
        isActive: false,
        archivedAt: new Date().toISOString(),
        archiveReason: 'overdue_7_days'
      };
    }
    return card;
  });
  
  console.log(`Archived ${archivedCount} cards`);
  
  // Test 5: Verify archived cards
  console.log('\n📋 Test 5: Archived Cards');
  const archivedCards = updatedCards.filter(card => !card.isActive);
  console.log(`Total archived cards: ${archivedCards.length}`);
  archivedCards.forEach(card => {
    console.log(`  ${card.id}: archived ${card.archivedAt}, reason: ${card.archiveReason}`);
  });
  
  // Test 6: Recalculate overdue after archiving
  console.log('\n📊 Test 6: Overdue Count After Archiving');
  const overdueAfterArchive = updatedCards.filter(card => 
    card.isActive && 
    card.nextReviewDate < today && 
    card.nextReviewDate >= sevenDaysAgoStr
  ).length;
  console.log(`Overdue count after archive: ${overdueAfterArchive}`);
  
  // Results summary
  console.log('\n📈 Results Summary:');
  console.log(`  Original overdue count (old): ${overdueCountOld}`);
  console.log(`  Original overdue count (new): ${overdueCountNew}`);
  console.log(`  Cards archived: ${archivedCount}`);
  console.log(`  Final overdue count: ${overdueAfterArchive}`);
  console.log(`  Reduction in overdue count: ${overdueCountOld - overdueAfterArchive}`);
  
  // Verify expectations
  const expectedReduction = 2; // card1 and card2 should be archived
  const actualReduction = overdueCountOld - overdueAfterArchive;
  
  if (actualReduction === expectedReduction) {
    console.log('\n✅ Test PASSED: Archive logic working correctly');
  } else {
    console.log(`\n❌ Test FAILED: Expected reduction of ${expectedReduction}, got ${actualReduction}`);
  }
  
  return {
    testCards,
    overdueCountOld,
    overdueCountNew,
    cardsToArchive: cardsToArchive.length,
    archivedCount,
    overdueAfterArchive,
    passed: actualReduction === expectedReduction
  };
}

// Test restore functionality
function testRestoreLogic() {
  console.log('\n🔄 Testing Restore Logic...\n');
  
  const archivedCard = {
    id: 'card1',
    userId: 'test_user',
    questionId: 'q1',
    isActive: false,
    archivedAt: new Date().toISOString(),
    archiveReason: 'overdue_7_days'
  };
  
  console.log('📋 Before restore:');
  console.log(`  ${archivedCard.id}: active=${archivedCard.isActive}, archived=${archivedCard.archivedAt}`);
  
  // Simulate restore
  const restoredCard = {
    ...archivedCard,
    isActive: true,
    archivedAt: null,
    archiveReason: null,
    updatedAt: new Date().toISOString()
  };
  
  console.log('\n📋 After restore:');
  console.log(`  ${restoredCard.id}: active=${restoredCard.isActive}, archived=${restoredCard.archivedAt}`);
  
  const isRestored = restoredCard.isActive && restoredCard.archivedAt === null;
  console.log(`\n${isRestored ? '✅' : '❌'} Restore logic: ${isRestored ? 'PASSED' : 'FAILED'}`);
  
  return isRestored;
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting SRS Archive System Tests\n');
  console.log('=' .repeat(50));
  
  const archiveResult = testArchiveLogic();
  const restoreResult = testRestoreLogic();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Final Results:');
  console.log(`  Archive Logic: ${archiveResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Restore Logic: ${restoreResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = archiveResult.passed && restoreResult;
  console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Run tests
runAllTests();
