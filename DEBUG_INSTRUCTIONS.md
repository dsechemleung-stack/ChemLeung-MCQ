# SRS Overdue Debug System

This debug system allows you to test the SRS archiving functionality by simulating overdue reviews and traveling through time to see how the UI behaves.

## 🎯 What We're Testing

The archiving system should:
- **Show overdue count** only for cards overdue < 7 days
- **Archive automatically** cards overdue > 7 days  
- **Display archived cards** in the mistake notebook with restore option

## 📊 Test Scenario

We'll create:
- **60 cards** overdue on 16/2 (should show in overdue count)
- **20 cards** overdue on 15/2 or before (should be archived)

### Expected Results:
- **Today (17/2):** 60 overdue, 20 archived
- **Yesterday (16/2):** 0 overdue, 0 archived  
- **7 days ago (10/2):** 0 overdue, 80 archived

## 🚀 Quick Start

### Option 1: HTML Debug Tool (Easiest)

1. Open `create-debug-data.html` in your browser
2. Click "🚀 Create Debug Data"
3. Use time travel buttons to test different dates
4. Open your main app in another tab to see the UI changes

### Option 2: Browser Console

1. Open your main application
2. Open browser console (F12)
3. Load the debug script:
   ```javascript
   const script = document.createElement('script');
   script.src = '/time-travel-utils.js';
   document.head.appendChild(script);
   ```

4. Run debug commands:
   ```javascript
   // Create test data (you'll need Firebase access)
   window.debugSRS.help();
   
   // Time travel to different dates
   window.TimeTravelScenarios.yesterday();  // 16/2
   window.TimeTravelScenarios.today();     // 17/2
   window.TimeTravelScenarios.sevenDaysAgo(); // 10/2
   
   // Check current state
   window.debugSRS.status();
   window.debugSRS.logState();
   ```

## 🔧 Debug Commands

### Time Travel Scenarios
```javascript
// Go to specific dates
window.TimeTravelScenarios.today();        // 17/2
window.TimeTravelScenarios.yesterday();    // 16/2  
window.TimeTravelScenarios.date('2026-02-15'); // 15/2
window.TimeTravelScenarios.sevenDaysAgo(); // 10/2
window.TimeTravelScenarios.reset();        // Back to present
```

### Utilities
```javascript
window.debugSRS.status();   // Show time travel status
window.debugSRS.logState(); // Show current SRS state
window.debugSRS.help();     // Show all commands
```

## 📍 What to Check

### 1. Overdue Count Display
- **SpacedRepetitionModal:** Check the overdue notice
- **Dashboard:** Look for overdue indicators
- **Expected:** Should only show cards overdue < 7 days

### 2. Archive Tab in Mistake Notebook  
- Navigate to `/notebook`
- Click "Archive" tab
- **Expected:** Should show archived cards with restore buttons

### 3. Auto-Archiving
- When loading the mistake notebook, check console for:
  ```
  🗄️ Auto-archived X overdue cards
  ```

## 🧪 Step-by-Step Testing

### Step 1: Create Test Data
1. Use the HTML tool or console to create 80 test cards
2. Verify creation succeeded

### Step 2: Test Today (17/2)
1. Travel to 17/2 or ensure current date is 17/2
2. Check overdue count: Should show **60**
3. Check archive tab: Should show **20** cards
4. Verify no auto-archiving happens (cards are already properly categorized)

### Step 3: Test Yesterday (16/2)  
1. Time travel to 16/2
2. Check overdue count: Should show **0**
3. Check archive tab: Should show **0** cards
4. Reload UI to see changes

### Step 4: Test 7 Days Ago (10/2)
1. Time travel to 10/2
2. Check overdue count: Should show **0** 
3. Check archive tab: Should show **80** cards
4. All cards should now be archived

### Step 5: Test Restore Functionality
1. Go to archive tab
2. Click "Restore" on any archived card
3. Card should disappear from archive and reappear in active cards

## 🔍 Troubleshooting

### If overdue count doesn't change:
- Check browser console for errors
- Verify Firebase connection
- Ensure time travel is active (`window.debugSRS.status()`)

### If cards don't appear in archive:
- Check that auto-archiving ran (look for console messages)
- Manually trigger archiving: `window.srsService.archiveOverdueCards(userId)`

### If time travel doesn't work:
- Reload the page
- Re-initialize: `window.timeTravel = new SRSTimeTravel()`
- Check for script errors in console

## 📝 Expected Console Output

When working correctly, you should see:
```
🔧 SRS Time Travel Debug System Loaded!
⏰ Time traveling to: 2026-02-16
📊 SRS State for 2026-02-16:
  Overdue count: 60
  Total cards: 80
  Archived cards: 20
🗄️ Auto-archived 20 overdue cards
```

## 🧹 Cleanup

When done testing:
```javascript
// Clear debug data (if using HTML tool)
// Click "🗑️ Clear Debug Data" button

// Reset time
window.TimeTravelScenarios.reset();
```

## 📚 Files Created

- `debug-srs-overdue.js` - Core debug functionality
- `time-travel-utils.js` - Time travel utilities  
- `create-debug-data.html` - User-friendly debug interface
- `DEBUG_INSTRUCTIONS.md` - This documentation

Happy debugging! 🚀
