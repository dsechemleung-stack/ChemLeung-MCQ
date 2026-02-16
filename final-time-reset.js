/**
 * Final Time Reset - Force back to current date (16/2)
 */

console.log('🔥 FINAL TIME RESET - Forcing back to 16/2...');

// 1. Complete storage wipe
localStorage.clear();
sessionStorage.clear();
clearAllTimeouts();
clearAllIntervals();

// 2. Remove all time travel variables
delete window.timeTravel;
delete window.SRSTimeTravel;
delete window.TimeTravelScenarios;
delete window.debugSRS;
delete window.debugData;
delete window.runDebugScenario;

// 3. Get the iframe with fresh Date
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.appendChild(iframe);

const cleanWindow = iframe.contentWindow;
const OriginalDate = cleanWindow.Date;
const OriginalDateNow = cleanWindow.Date.now;

// Remove iframe
document.body.removeChild(iframe);

// 4. Force restore Date using multiple methods
window.Date = OriginalDate;
window.Date.now = OriginalDateNow;

// 5. Additional force restore
const systemDate = new Date();
const todayStr = systemDate.toISOString().split('T')[0];

console.log('🎯 Target date:', todayStr);
console.log('📅 System date:', systemDate.toISOString());

// 6. Create a completely new Date function
function FixedDate(...args) {
  if (args.length === 0) {
    return new OriginalDate(systemDate);
  }
  return new OriginalDate(...args);
}

// Copy all static methods
Object.getOwnPropertyNames(OriginalDate).forEach(name => {
  if (typeof OriginalDate[name] === 'function') {
    FixedDate[name] = OriginalDate[name];
  }
});

// Override now() to return current time
FixedDate.now = () => systemDate.getTime();

// Replace Date
window.Date = FixedDate;

// 7. Test the reset multiple ways
console.log('🧪 Testing reset...');

const test1 = Date.now();
const test2 = new Date();
const test3 = test2.toISOString().split('T')[0];

console.log('✅ Date.now():', test1);
console.log('✅ new Date():', test2.toISOString());
console.log('✅ Date string:', test3);

// 8. Verify with system time
const systemCheck = new OriginalDate().toISOString().split('T')[0];
console.log('🔍 System check:', systemCheck);
console.log('🔍 Our check:', test3);

if (test3 === systemCheck && test3 === todayStr) {
  console.log('✅✅✅ SUCCESS! Time reset to current date:', test3);
} else {
  console.log('❌ Reset failed');
  console.log('Expected:', todayStr);
  console.log('System:', systemCheck);
  console.log('Got:', test3);
}

// 9. Remove any remaining time travel elements
document.querySelectorAll('script').forEach(script => {
  if (script.src && (script.src.includes('time') || script.src.includes('debug'))) {
    script.remove();
  }
});

// 10. Clear any remaining event listeners
window.removeEventListener('timeTravelUpdate', () => {});

// 11. Force reload
console.log('🔄 Final reload in 2 seconds...');
setTimeout(() => {
  location.reload();
}, 2000);

console.log('🎉 FINAL TIME RESET COMPLETE!');
