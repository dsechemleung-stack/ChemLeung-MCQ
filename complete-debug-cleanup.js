/**
 * Complete Debug Cleanup - Remove all debug data and reset time
 */

console.log('🧹 Starting complete debug cleanup...');

// 1. Clear all storage
localStorage.removeItem('timeTravelDate');
localStorage.removeItem('debug_srs');
sessionStorage.clear();

// Clear any debug-related data
Object.keys(localStorage).forEach(key => {
  if (key.includes('debug') || key.includes('test') || key.includes('time')) {
    localStorage.removeItem(key);
    console.log('🗑️ Removed:', key);
  }
});

// 2. Get fresh Date functions from iframe
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.appendChild(iframe);

const originalDateConstructor = iframe.contentWindow.Date;
const originalDateNow = iframe.contentWindow.Date.now;
const originalDateParse = iframe.contentWindow.Date.parse;

// Remove iframe
document.body.removeChild(iframe);

// 3. Force restore Date functions
window.Date.now = originalDateNow;
window.Date.parse = originalDateParse;
window.Date = originalDateConstructor;

// 4. Clear all debug variables
delete window.timeTravel;
delete window.SRSTimeTravel;
delete window.TimeTravelScenarios;
delete window.debugSRS;
delete window.debugData;
delete window.runDebugScenario;

// 5. Remove debug scripts from DOM
document.querySelectorAll('script').forEach(script => {
  if (script.src.includes('debug') || script.src.includes('time-travel')) {
    script.remove();
    console.log('🗑️ Removed script:', script.src);
  }
});

// 6. Clear debug data from Firestore (if possible)
async function clearDebugData() {
  try {
    // Check if we have access to srsService
    if (window.srsService && window.currentUser) {
      console.log('🗑️ Clearing debug SRS cards...');
      
      const allCards = await window.srsService.getAllCards(window.currentUser.uid);
      const debugCards = allCards.filter(card => 
        card.id && (card.id.includes('debug_card_') || card.id.includes('test_'))
      );
      
      console.log(`Found ${debugCards.length} debug cards to delete`);
      
      for (const card of debugCards) {
        try {
          await window.srsService.deleteCard(card.id);
          console.log('🗑️ Deleted debug card:', card.id);
        } catch (error) {
          console.log('⚠️ Could not delete card:', card.id, error.message);
        }
      }
      
      console.log('✅ Debug cards cleanup completed');
    }
  } catch (error) {
    console.log('⚠️ Could not clear debug data:', error.message);
  }
}

// 7. Verify time reset
console.log('🧪 Verifying time reset...');
try {
  const testNow = Date.now();
  const testDate = new Date();
  const testDateStr = testDate.toISOString().split('T')[0];
  
  console.log('✅ Current time:', testDateStr);
  console.log('✅ Date.now():', testNow);
  console.log('✅ new Date():', testDate.toISOString());
  
  // Get actual today's date
  const realToday = new originalDateConstructor();
  const realTodayStr = realToday.toISOString().split('T')[0];
  
  if (testDateStr === realTodayStr) {
    console.log('✅ Time successfully reset to today:', realTodayStr);
  } else {
    console.log('❌ Time reset issue. Expected:', realTodayStr, 'Got:', testDateStr);
  }
  
} catch (error) {
  console.error('❌ Error verifying time:', error);
}

// 8. Run debug data cleanup and then reload
clearDebugData().then(() => {
  console.log('🔄 Cleanup complete. Reloading page in 2 seconds...');
  setTimeout(() => {
    location.reload();
  }, 2000);
}).catch(error => {
  console.log('⚠️ Debug cleanup failed, but reloading anyway:', error);
  setTimeout(() => {
    location.reload();
  }, 2000);
});

console.log('🎉 Debug cleanup initiated!');
