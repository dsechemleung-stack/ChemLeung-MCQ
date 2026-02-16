/**
 * Reset Time Travel - Clear all time travel modifications
 */

// Clear localStorage data
localStorage.removeItem('timeTravelDate');
localStorage.removeItem('debug_srs');

// Reset Date functions to original
const originalDateConstructor = window.Date;
const originalDateNow = Date.now;

// Restore Date.now if it was overridden
if (Date.now.toString().includes('targetDate')) {
  Date.now = originalDateNow;
}

// Restore Date constructor if it was overridden
try {
  // Test if Date is working normally
  const testDate = new Date();
  if (testDate.toString() === 'Invalid Date') {
    // Date is broken, try to restore it
    window.Date = originalDateConstructor;
  }
} catch (error) {
  // If there's an error, restore Date completely
  window.Date = originalDateConstructor;
}

console.log('⏰ Time travel reset complete');
console.log('📅 Current date:', new Date().toISOString().split('T')[0]);

// Reload page to ensure clean state
setTimeout(() => {
  console.log('🔄 Reloading page to apply changes...');
  location.reload();
}, 1000);
