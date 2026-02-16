/**
 * Time Travel Utilities for Testing SRS UI
 * 
 * This utility allows you to simulate different dates to test:
 * - Overdue counts at different time periods
 * - Archiving behavior
 * - UI display of overdue notifications
 */

class SRSTimeTravel {
  constructor() {
    this.originalDate = new Date();
    this.currentDate = new Date();
    this.isTimeTraveling = false;
    this.originalDateNow = Date.now;
    this.originalDateConstructor = window.Date;
  }

  /**
   * Travel to a specific date
   * @param {Date|string} date - Date to travel to
   */
  travelTo(date) {
    const targetDate = new Date(date);
    console.log(`⏰ Time traveling to: ${targetDate.toISOString().split('T')[0]}`);
    
    this.currentDate = targetDate;
    this.isTimeTraveling = true;
    
    // Override Date.now()
    Date.now = () => this.currentDate.getTime();
    
    // Override new Date() constructor
    window.Date = function(...args) {
      if (args.length === 0) {
        return new window.SRSDate(SRSTimeTravel.instance.currentDate);
      }
      return new SRSTimeTravel.instance.originalDateConstructor(...args);
    };
    
    // Copy static methods from original Date
    Object.setPrototypeOf(window.Date, SRSTimeTravel.instance.originalDateConstructor);
    Object.getOwnPropertyNames(SRSTimeTravel.instance.originalDateConstructor).forEach(name => {
      if (typeof SRSTimeTravel.instance.originalDateConstructor[name] === 'function') {
        window.Date[name] = SRSTimeTravel.instance.originalDateConstructor[name];
      }
    });
    
    console.log(`⏰ Current simulated time: ${this.currentDate.toISOString()}`);
    
    // Trigger UI update
    this.triggerUIUpdate();
  }

  /**
   * Travel to today (relative to original date)
   */
  travelToToday() {
    this.travelTo(this.originalDate);
  }

  /**
   * Travel to yesterday
   */
  travelToYesterday() {
    const yesterday = new Date(this.originalDate);
    yesterday.setDate(yesterday.getDate() - 1);
    this.travelTo(yesterday);
  }

  /**
   * Travel to 7 days ago
   */
  travelToSevenDaysAgo() {
    const sevenDaysAgo = new Date(this.originalDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    this.travelTo(sevenDaysAgo);
  }

  /**
   * Travel to 14 days ago
   */
  travelToTwoWeeksAgo() {
    const twoWeeksAgo = new Date(this.originalDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    this.travelTo(twoWeeksAgo);
  }

  /**
   * Travel to specific date string (YYYY-MM-DD)
   * @param {string} dateString - Date in YYYY-MM-DD format
   */
  travelToDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date format. Use YYYY-MM-DD');
      return;
    }
    this.travelTo(date);
  }

  /**
   * Reset time to original
   */
  reset() {
    console.log('⏰ Resetting time to present');
    this.isTimeTraveling = false;
    this.currentDate = new Date(this.originalDate);
    
    // Restore original Date functions
    Date.now = this.originalDateNow;
    window.Date = this.originalDateConstructor;
    
    console.log(`⏰ Time reset to: ${this.originalDate.toISOString()}`);
    
    // Trigger UI update
    this.triggerUIUpdate();
  }

  /**
   * Get current simulated date
   */
  now() {
    return new Date(this.currentDate);
  }

  /**
   * Get current date string
   */
  today() {
    return this.currentDate.toISOString().split('T')[0];
  }

  /**
   * Check if currently time traveling
   */
  isActive() {
    return this.isTimeTraveling;
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isTimeTraveling: this.isTimeTraveling,
      originalDate: this.originalDate.toISOString().split('T')[0],
      currentDate: this.currentDate.toISOString().split('T')[0],
      daysDiff: Math.floor((this.currentDate - this.originalDate) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Trigger UI update by dispatching custom event
   */
  triggerUIUpdate() {
    window.dispatchEvent(new CustomEvent('timeTravelUpdate', {
      detail: {
        currentDate: this.currentDate,
        isTimeTraveling: this.isTimeTraveling
      }
    }));
  }

  /**
   * Log current SRS state (for debugging)
   */
  async logSRSState() {
    if (!window.srsService) {
      console.log('❌ SRS service not available');
      return;
    }

    const currentUser = window.currentUser || { uid: 'test_user' };
    const today = this.today();
    
    console.log(`📊 SRS State for ${today}:`);
    
    try {
      const overdueCount = await window.srsService.getOverdueCount(currentUser.uid);
      const allCards = await window.srsService.getAllCards(currentUser.uid);
      const archivedCards = await window.srsService.getArchivedCards(currentUser.uid);
      
      console.log(`  Overdue count: ${overdueCount}`);
      console.log(`  Total cards: ${allCards.length}`);
      console.log(`  Archived cards: ${archivedCards.length}`);
      
      // Show breakdown
      const activeCards = allCards.filter(c => c.isActive);
      const overdueCards = activeCards.filter(c => c.nextReviewDate < today);
      const veryOverdueCards = activeCards.filter(c => {
        const sevenDaysAgo = new Date(this.currentDate);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return c.nextReviewDate < sevenDaysAgo.toISOString().split('T')[0];
      });
      
      console.log(`  Active cards: ${activeCards.length}`);
      console.log(`  Overdue cards: ${overdueCards.length}`);
      console.log(`  Very overdue (>7 days): ${veryOverdueCards.length}`);
      
    } catch (error) {
      console.error('❌ Error getting SRS state:', error);
    }
  }
}

// Custom Date class that maintains our time travel state
class SRSDate extends Date {
  constructor(date) {
    super(date);
  }
}

// Singleton instance
SRSTimeTravel.instance = new SRSTimeTravel();

// Make available globally
window.SRSTimeTravel = SRSTimeTravel;
window.timeTravel = SRSTimeTravel.instance;

// Predefined time travel scenarios for testing
window.TimeTravelScenarios = {
  // Test scenario: Today (should show normal overdue count)
  today: () => {
    console.log('🎯 Scenario: Today');
    window.timeTravel.travelToToday();
  },

  // Test scenario: Yesterday (60 overdue should show)
  yesterday: () => {
    console.log('🎯 Scenario: Yesterday (60 overdue reviews)');
    window.timeTravel.travelToYesterday();
  },

  // Test scenario: 7 days ago (all cards should be archived)
  sevenDaysAgo: () => {
    console.log('🎯 Scenario: 7 days ago (all cards should be archived)');
    window.timeTravel.travelToSevenDaysAgo();
  },

  // Test scenario: 14 days ago (all cards should be archived)
  twoWeeksAgo: () => {
    console.log('🎯 Scenario: 14 days ago (all cards should be archived)');
    window.timeTravel.travelToTwoWeeksAgo();
  },

  // Test scenario: Specific date for debugging
  date: (dateString) => {
    console.log(`🎯 Scenario: Custom date ${dateString}`);
    window.timeTravel.travelToDate(dateString);
  },

  // Reset to present
  reset: () => {
    console.log('🎯 Scenario: Reset to present');
    window.timeTravel.reset();
  }
};

// Console helper functions
window.debugSRS = {
  status: () => {
    console.log('⏰ Time Travel Status:');
    console.table(window.timeTravel.getStatus());
  },

  logState: () => {
    window.timeTravel.logSRSState();
  },

  help: () => {
    console.log('🔧 SRS Time Travel Debug Commands:');
    console.log('Basic scenarios:');
    console.log('  window.TimeTravelScenarios.today()');
    console.log('  window.TimeTravelScenarios.yesterday()');
    console.log('  window.TimeTravelScenarios.sevenDaysAgo()');
    console.log('  window.TimeTravelScenarios.twoWeeksAgo()');
    console.log('  window.TimeTravelScenarios.reset()');
    console.log('');
    console.log('Custom date:');
    console.log('  window.TimeTravelScenarios.date("2026-02-16")');
    console.log('');
    console.log('Utilities:');
    console.log('  window.debugSRS.status() - Show time travel status');
    console.log('  window.debugSRS.logState() - Show current SRS state');
    console.log('  window.debugSRS.help() - Show this help');
  }
};

// Auto-show help on load
console.log('🔧 SRS Time Travel Debug System Loaded!');
console.log('Type window.debugSRS.help() for commands');

// Listen for time travel updates
window.addEventListener('timeTravelUpdate', (event) => {
  console.log('🔄 Time travel update detected, UI should refresh');
  
  // If there's a React app, try to force re-render
  if (window.React && window.document.querySelector('[data-reactroot]')) {
    // Force React re-render by updating state if possible
    console.log('🔄 Triggering React re-render...');
  }
});

export { SRSTimeTravel, SRSDate };
