/**
 * Force Reset to Today - Aggressive time restoration to 16/2 HK time
 */

console.log('🔧 Force resetting to today (16/2 HK time)...');

// 1. Clear ALL storage completely
localStorage.clear();
sessionStorage.clear();

// 2. Remove all time travel related variables
delete window.timeTravel;
delete window.SRSTimeTravel;
delete window.TimeTravelScenarios;
delete window.debugSRS;
delete window.debugData;
delete window.runDebugScenario;

// 3. Get the real current time from an external source
const getRealTime = () => {
  // Use WorldTimeAPI to get current HK time
  return fetch('https://worldtimeapi.org/api/timezone/Asia/Hong_Kong')
    .then(response => response.json())
    .then(data => {
      const datetime = data.datetime;
      console.log('🌍 Real HK time from API:', datetime);
      return new Date(datetime);
    })
    .catch(error => {
      console.log('⚠️ Could not fetch time, using system time');
      return new Date();
    });
};

// 4. Create completely fresh Date constructor
function createFreshDateConstructor(targetDate) {
  function FreshDate(...args) {
    if (args.length === 0) {
      return new targetDate.constructor(targetDate);
    }
    return new targetDate.constructor(...args);
  }
  
  // Copy all static methods from the real Date
  const realDate = targetDate.constructor;
  Object.getOwnPropertyNames(realDate).forEach(name => {
    if (typeof realDate[name] === 'function') {
      FreshDate[name] = realDate[name];
    }
  });
  
  // Override now() to return target time
  FreshDate.now = () => targetDate.getTime();
  
  return FreshDate;
}

// 5. Apply the reset
getRealTime().then(realTime => {
  console.log('📅 Real time obtained:', realTime.toISOString());
  
  // Format to YYYY-MM-DD
  const todayStr = realTime.toISOString().split('T')[0];
  console.log('🎯 Target date:', todayStr);
  
  // Create fresh Date constructor with real time
  const FreshDate = createFreshDateConstructor(realTime);
  
  // Replace global Date
  window.Date = FreshDate;
  
  // Test the reset
  console.log('🧪 Testing reset...');
  const testNow = Date.now();
  const testDate = new Date();
  const testDateStr = testDate.toISOString().split('T')[0];
  
  console.log('✅ Date.now():', testNow);
  console.log('✅ new Date():', testDate.toISOString());
  console.log('✅ Date string:', testDateStr);
  
  if (testDateStr === todayStr) {
    console.log('✅ SUCCESS! Time reset to today:', todayStr);
  } else {
    console.log('❌ Reset failed. Expected:', todayStr, 'Got:', testDateStr);
  }
  
  // Force reload after showing results
  console.log('🔄 Reloading page in 3 seconds...');
  setTimeout(() => {
    location.reload();
  }, 3000);
  
}).catch(error => {
  console.error('❌ Failed to get real time:', error);
  
  // Fallback: Use system time
  const systemTime = new Date();
  const todayStr = systemTime.toISOString().split('T')[0];
  console.log('🔄 Using system time as fallback:', todayStr);
  
  const FreshDate = createFreshDateConstructor(systemTime);
  window.Date = FreshDate;
  
  setTimeout(() => {
    location.reload();
  }, 2000);
});

// 6. Additional cleanup - remove any remaining time travel scripts
document.querySelectorAll('script').forEach(script => {
  if (script.src && (script.src.includes('time') || script.src.includes('debug'))) {
    script.remove();
    console.log('🗑️ Removed script:', script.src);
  }
});

console.log('🎉 Force reset initiated!');
