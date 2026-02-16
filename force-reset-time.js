/**
 * Force Reset Time Travel - Complete time restoration
 */

console.log('🔧 Starting force time reset...');

// 1. Clear all localStorage data
localStorage.removeItem('timeTravelDate');
localStorage.removeItem('debug_srs');
sessionStorage.clear();

// 2. Force restore Date.now by getting the original function
const originalDateNow = (function() {
  const original = Date.now;
  // Create a fresh Date.now function
  return function() {
    return new Date().getTime();
  };
})();

// 3. Force restore Date constructor
const OriginalDate = (function() {
  // Create a completely fresh Date constructor
  function FreshDate(...args) {
    if (args.length === 0) {
      return new originalDateConstructor();
    }
    return new originalDateConstructor(...args);
  }
  
  // Copy all static methods from the real Date
  const realDate = window.Date;
  Object.getOwnPropertyNames(realDate).forEach(name => {
    if (typeof realDate[name] === 'function') {
      FreshDate[name] = realDate[name];
    }
  });
  
  return FreshDate;
})();

// 4. Get the real original Date constructor from an iframe
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.appendChild(iframe);

const originalDateConstructor = iframe.contentWindow.Date;
const originalDateNowFromIframe = iframe.contentWindow.Date.now;

// Remove iframe
document.body.removeChild(iframe);

// 5. Force restore both functions
window.Date.now = originalDateNowFromIframe;
window.Date = originalDateConstructor;

// 6. Test and verify
console.log('🧪 Testing date functions...');
try {
  const testNow = Date.now();
  const testDate = new Date();
  const testDateStr = testDate.toISOString().split('T')[0];
  
  console.log('✅ Date.now():', testNow);
  console.log('✅ new Date():', testDate);
  console.log('✅ Date string:', testDateStr);
  
  // Verify it's working correctly
  const realToday = new originalDateConstructor();
  const realTodayStr = realToday.toISOString().split('T')[0];
  
  if (testDateStr === realTodayStr) {
    console.log('✅ Time successfully reset to:', testDateStr);
  } else {
    console.log('❌ Time reset failed. Expected:', realTodayStr, 'Got:', testDateStr);
  }
  
} catch (error) {
  console.error('❌ Error during reset:', error);
}

// 7. Clear any remaining time travel variables
delete window.timeTravel;
delete window.SRSTimeTravel;
delete window.TimeTravelScenarios;
delete window.debugSRS;

// 8. Force reload after a short delay
console.log('🔄 Reloading page in 2 seconds...');
setTimeout(() => {
  location.reload();
}, 2000);
