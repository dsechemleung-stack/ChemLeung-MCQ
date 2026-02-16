/**
 * SRS Debug Panel - Simple SRS Testing Tools
 * 
 * Focus on testing SRS system with real date changes
 * Shows actual calendar updates
 */

import React, { useMemo, useState } from 'react';
import { 
  Brain, 
  Play, 
  Calendar, 
  RefreshCw, 
  Database, 
  AlertTriangle,
  Eye
} from 'lucide-react';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { calendarService } from '../../services/calendarService';
import { calendarServiceOptimized } from '../../services/calendarServiceOptimized';
import { srsService } from '../../services/srsService';
import { getNow, getTimeTravelOffsetDays, resetTimeTravel, setTimeTravelOffsetDays } from '../../utils/timeTravel';
import { db } from '../../firebase/config';

export default function SRSDebugPanel({ userId, questions = [] }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const simulatedDateStr = useMemo(() => getNow().toISOString().split('T')[0], []);
  const offsetDays = useMemo(() => getTimeTravelOffsetDays(), []);

  const realQuestionSamples = useMemo(() => {
    if (!Array.isArray(questions) || questions.length === 0) return [];
    const withId = questions.filter((q) => q?.ID != null);
    const pick = (arr, n) => arr.slice(0, Math.min(n, arr.length));
    return pick(withId.length ? withId : questions, 3).map((q) => ({
      ID: String(q.ID ?? q.id ?? ''),
      Topic: q.Topic || q.topic || 'Chemistry',
      Subtopic: q.Subtopic || q.subtopic || null,
      attemptCount: 1
    })).filter((x) => x.ID);
  }, [questions]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const cleanupFakeTestData = async () => {
    setIsLoading(true);
    addLog('🧹 Cleaning up fake/non-reviewable SRS test data...', 'warning');

    try {
      const isFakeQuestionId = (qid) => {
        const s = String(qid || '');
        return (
          s.startsWith('perm_test_') ||
          s.startsWith('debug_fake_') ||
          s.startsWith('debug_q') ||
          s.startsWith('date_test_q')
        );
      };

      // 1) Delete fake SRS cards
      const allCards = await srsService.getAllCards(userId);
      const fakeCards = allCards.filter((c) => isFakeQuestionId(c?.questionId));

      let deletedCards = 0;
      if (fakeCards.length) {
        const batch = writeBatch(db);
        fakeCards.forEach((c) => {
          if (!c?.id) return;
          batch.delete(doc(db, 'spaced_repetition_cards', c.id));
        });
        await batch.commit();
        deletedCards = fakeCards.length;
      }

      // 2) Delete fake calendar SRS events in user subcollection
      const eventsQ = query(
        collection(db, 'users', userId, 'calendar_events'),
        where('type', '==', 'spaced_repetition')
      );
      const eventsSnap = await getDocs(eventsQ);
      const fakeEvents = eventsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => isFakeQuestionId(e?.questionId));

      let deletedEvents = 0;
      if (fakeEvents.length) {
        const batch2 = writeBatch(db);
        fakeEvents.forEach((e) => {
          batch2.delete(doc(db, 'users', userId, 'calendar_events', e.id));
        });
        await batch2.commit();
        deletedEvents = fakeEvents.length;
      }

      addLog(`✅ Cleanup done. Deleted cards=${deletedCards}, deleted calendar SRS events=${deletedEvents}`, 'success');
      addLog('➡️ Now re-run: SRS Permission Test or Test SRS Integration (will create reviewable cards using real question IDs).', 'info');

      setTestResults({
        type: 'cleanup-fake-srs',
        success: true,
        deletedCards,
        deletedEvents,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      addLog(`❌ Cleanup error: ${error.message}`, 'error');
      setTestResults({
        type: 'cleanup-fake-srs',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSRSStats = async () => {
    setIsLoading(true);
    addLog('📊 Getting SRS stats...', 'info');

    try {
      const now = getNow();
      const nowStr = now.toISOString().split('T')[0];

      const [reviewStats, allCards, dueCards, recentAttempts] = await Promise.all([
        srsService.getReviewStats(userId),
        srsService.getAllCards(userId),
        srsService.getDueCards(userId),
        srsService.getRecentReviewAttempts(userId, 30)
      ]);

      const byRepetitionCount = {
        '0': 0,
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5+': 0
      };

      allCards.forEach((c) => {
        const n = Number(c?.repetitionCount ?? 0);
        if (!Number.isFinite(n) || n <= 0) byRepetitionCount['0'] += 1;
        else if (n === 1) byRepetitionCount['1'] += 1;
        else if (n === 2) byRepetitionCount['2'] += 1;
        else if (n === 3) byRepetitionCount['3'] += 1;
        else if (n === 4) byRepetitionCount['4'] += 1;
        else byRepetitionCount['5+'] += 1;
      });

      const attemptsCorrect = recentAttempts.filter((a) => a?.wasCorrect === true).length;
      const attemptsWrong = recentAttempts.filter((a) => a?.wasCorrect === false).length;

      addLog(`📅 Simulated today: ${nowStr}`, 'info');
      addLog(`🧠 Cards: total=${reviewStats.total}, active=${reviewStats.active}, archived=${reviewStats.archived}`, 'info');
      addLog(`🧠 Status: new=${reviewStats.new}, learning=${reviewStats.learning}, review=${reviewStats.review}, graduated=${reviewStats.graduated}`, 'info');
      addLog(`🧠 Due (query): ${dueCards.length} due cards`, 'info');
      addLog(`🧠 Due flag (stored): ${reviewStats.dueToday} (note: requires running updateDueFlags to be accurate)`, 'warning');
      addLog(`✅ Recent attempts (30d): correct=${attemptsCorrect}, wrong=${attemptsWrong}, total=${recentAttempts.length}`, 'info');
      addLog(`🔁 repetitionCount distribution: 0=${byRepetitionCount['0']}, 1=${byRepetitionCount['1']}, 2=${byRepetitionCount['2']}, 3=${byRepetitionCount['3']}, 4=${byRepetitionCount['4']}, 5+=${byRepetitionCount['5+']}`, 'info');

      const result = {
        type: 'srs-stats',
        success: true,
        simulatedToday: nowStr,
        reviewStats,
        dueCardsCount: dueCards.length,
        recentAttempts: {
          days: 30,
          total: recentAttempts.length,
          correct: attemptsCorrect,
          wrong: attemptsWrong
        },
        repetitionCountDistribution: byRepetitionCount,
        timestamp: new Date().toISOString()
      };

      setTestResults(result);
      addLog('✅ SRS stats loaded', 'success');
    } catch (error) {
      addLog(`❌ SRS stats error: ${error.message}`, 'error');
      setTestResults({
        type: 'srs-stats',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const applyTimeTravel = (days) => {
    setTimeTravelOffsetDays(days);
    // Don't reload immediately - let state update first
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const clearTimeTravel = () => {
    resetTimeTravel();
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const setSpecificDate = (dateStr) => {
    const targetDate = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    // Clear time portion for accurate day calculation
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    console.log('Setting specific date:', dateStr, 'diffDays:', diffDays);
    setTimeTravelOffsetDays(diffDays);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Test SRS with real date manipulation
  const testSRSWithRealDate = async () => {
    setIsLoading(true);
    addLog('🧠 Testing SRS with real date changes...', 'info');
    
    try {
      // 1. Get current SRS status
      addLog('📊 Getting current SRS status...', 'info');
      const allCards = await srsService.getAllCards(userId);
      const dueCards = await srsService.getDueCards(userId);
      addLog(`📋 Current: ${allCards.length} total cards, ${dueCards.length} due`, 'info');
      
      // 2. Create test cards if needed
      if (dueCards.length === 0) {
        addLog('⚠️ No due cards found. Creating test cards...', 'warning');

        const testQuestions = realQuestionSamples.length
          ? realQuestionSamples
          : [
              { ID: `debug_fake_${Date.now()}`, Topic: 'Chemistry', Subtopic: 'Debug', attemptCount: 1 }
            ];

        if (!realQuestionSamples.length) {
          addLog('⚠️ No real question bank provided. Created a fake questionId (not reviewable).', 'warning');
        } else {
          addLog(`✅ Using real question IDs for debug cards: ${testQuestions.map((q) => q.ID).join(', ')}`, 'success');
        }

        const cards = await srsService.createCardsFromMistakes(
          userId,
          testQuestions,
          `debug_session_${Date.now()}`,
          `debug_attempt_${Date.now()}`
        );
        addLog(`📝 Created ${cards.length} test SRS cards`, 'success');
      }
      
      // 3. Schedule SRS events (this creates real calendar events)
      addLog('📅 Scheduling SRS calendar events...', 'info');
      const scheduleResult = await calendarService.scheduleSpacedRepetition(userId, {});
      addLog(`✅ Scheduled ${scheduleResult.scheduled} SRS events to calendar`, 'success');

      // Notify calendar UI to refresh immediately
      window.dispatchEvent(new Event('calendar:refresh'));
      
      // 4. Show calendar impact
      calendarServiceOptimized.clearCalendarCache();
      const today = getNow();
      const calendarData = await calendarServiceOptimized.getCalendarData(userId, today.getFullYear(), today.getMonth());
      
      const srsEvents = Object.values(calendarData)
        .flatMap(day => day.repetitions || [])
        .filter(event => event.type === 'spaced_repetition');
      
      addLog(`📅 Calendar now has ${srsEvents.length} SRS events`, 'success');
      
      // 5. Show upcoming dates
      if (srsEvents.length > 0) {
        addLog('📋 Upcoming SRS reviews:', 'info');
        srsEvents.forEach(event => {
          addLog(`  • ${event.date} - ${event.title}`, 'info');
        });
      }
      
      setTestResults({
        type: 'srs-test',
        success: true,
        totalCards: allCards.length,
        dueCards: dueCards.length,
        scheduledEvents: scheduleResult.scheduled,
        calendarEvents: srsEvents.length,
        upcomingDates: srsEvents.map(e => ({ date: e.date, title: e.title })),
        timestamp: new Date().toISOString()
      });
      
      addLog('🎉 SRS test completed! Check your calendar.', 'success');
      
    } catch (error) {
      addLog(`❌ SRS Test Error: ${error.message}`, 'error');
      setTestResults({
        type: 'srs-test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Force create SRS events for specific dates
  const createSRSForSpecificDates = async () => {
    setIsLoading(true);
    addLog('📅 Creating SRS events for specific dates...', 'info');
    
    try {
      const today = new Date();
      const dates = [];
      
      // Create events for today, tomorrow, and next week
      for (let i = 0; i <= 7; i++) {
        const testDate = new Date(today);
        testDate.setDate(testDate.getDate() + i);
        dates.push(testDate.toISOString().split('T')[0]);
      }
      
      addLog(`📋 Target dates: ${dates.join(', ')}`, 'info');
      
      // Get SRS cards and modify their next review dates
      const allCards = await srsService.getAllCards(userId);
      
      if (allCards.length === 0) {
        addLog('⚠️ No SRS cards found. Creating test cards first...', 'warning');
        
        const testQuestions = [
          { ID: 'date_test_q1', Topic: 'Chemistry', Subtopic: 'Test Topic 1', attemptCount: 1 },
          { ID: 'date_test_q2', Topic: 'Chemistry', Subtopic: 'Test Topic 2', attemptCount: 1 }
        ];
        
        await srsService.createCardsFromMistakes(
          userId, 
          testQuestions, 
          `date_test_session_${Date.now()}`, 
          `date_test_attempt_${Date.now()}`
        );
        
        // Get the newly created cards
        const newCards = await srsService.getAllCards(userId);
        
        // Update their review dates to spread across the week
        for (let i = 0; i < Math.min(newCards.length, dates.length); i++) {
          const card = newCards[i];
          // This would require a direct update to the card's nextReviewDate
          addLog(`📝 Would update card ${card.id} to ${dates[i]}`, 'info');
        }
      }
      
      // Schedule events (will use current card dates)
      const scheduleResult = await calendarService.scheduleSpacedRepetition(userId, {});
      addLog(`✅ Created ${scheduleResult.scheduled} SRS events`, 'success');
      
      // Refresh calendar to show new events
      addLog('🔄 Refresh calendar to see new events...', 'info');
      
      setTestResults({
        type: 'date-specific',
        success: true,
        targetDates: dates,
        scheduledEvents: scheduleResult.scheduled,
        timestamp: new Date().toISOString()
      });
      
      addLog('🎉 Date-specific SRS events created!', 'success');
      
    } catch (error) {
      addLog(`❌ Date-specific Error: ${error.message}`, 'error');
      setTestResults({
        type: 'date-specific',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkCalendarState = async () => {
    setIsLoading(true);
    addLog('🔍 Checking current calendar state...', 'info');
    
    try {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Get calendar data for current month
      calendarServiceOptimized.clearCalendarCache();
      const simNow = getNow();
      const calendarData = await calendarServiceOptimized.getCalendarData(userId, simNow.getFullYear(), simNow.getMonth());
      
      // Count different event types
      let totalEvents = 0;
      let srsEvents = 0;
      let examEvents = 0;
      let quizEvents = 0;
      let suggestionEvents = 0;
      let aiEvents = 0;
      
      const eventsByDate = {};
      
      Object.entries(calendarData).forEach(([date, dayData]) => {
        const dayEvents = [
          ...(dayData.exams || []),
          ...(dayData.quizzes || []),
          ...(dayData.suggestions || []),
          ...(dayData.repetitions || []),
          ...(dayData.aiRecommendations || []),
          ...(dayData.completions || [])
        ];
        
        totalEvents += dayEvents.length;
        examEvents += dayData.exams?.length || 0;
        quizEvents += dayData.quizzes?.length || 0;
        suggestionEvents += dayData.suggestions?.length || 0;
        srsEvents += dayData.repetitions?.length || 0;
        aiEvents += dayData.aiRecommendations?.length || 0;
        
        if (dayEvents.length > 0) {
          eventsByDate[date] = dayEvents.map(e => ({
            type: e.type,
            title: e.title,
            completed: e.completed
          }));
        }
      });
      
      addLog(`📊 Calendar Summary:`, 'info');
      addLog(`  Total Events: ${totalEvents}`, 'info');
      addLog(`  SRS Events: ${srsEvents}`, 'info');
      addLog(`  Exams: ${examEvents}`, 'info');
      addLog(`  Quizzes: ${quizEvents}`, 'info');
      addLog(`  Study Suggestions: ${suggestionEvents}`, 'info');
      addLog(`  AI Recommendations: ${aiEvents}`, 'info');
      
      // Show events by date
      addLog('📅 Events by date:', 'info');
      Object.entries(eventsByDate).forEach(([date, events]) => {
        addLog(`  ${date}:`, 'info');
        events.forEach(event => {
          const status = event.completed ? '✅' : '⏳';
          addLog(`    ${status} ${event.type}: ${event.title}`, 'info');
        });
      });
      
      setTestResults({
        type: 'calendar-state',
        success: true,
        summary: {
          totalEvents,
          srsEvents,
          examEvents,
          quizEvents,
          suggestionEvents,
          aiEvents
        },
        eventsByDate,
        month: currentMonth,
        year: currentYear,
        timestamp: new Date().toISOString()
      });
      
      addLog('✅ Calendar state check completed!', 'success');
      
    } catch (error) {
      addLog(`❌ Calendar State Error: ${error.message}`, 'error');
      setTestResults({
        type: 'calendar-state',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="w-4 h-4" />
          <span>Please log in to use SRS debug tools</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SRS Debug Panel</h3>
            <p className="text-sm text-gray-600">Test SRS system with real calendar updates</p>
          </div>
        </div>
        <button
          onClick={clearLogs}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear Logs
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-purple-900">Time Travel (Debug)</div>
            <div className="text-xs text-purple-800 mt-1">
              Simulated today: <span className="font-mono">{simulatedDateStr}</span> (offset: {offsetDays} day(s))
            </div>
            <div className="text-xs text-purple-700 mt-1">
              This changes the date only inside the app (SRS due checks + scheduling), not your Mac clock.
            </div>
            
            {/* Direct date input */}
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-purple-700">Jump to date:</label>
              <input
                type="date"
                value={simulatedDateStr}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="px-2 py-1 text-xs border border-purple-300 rounded bg-white text-purple-900"
              />
              <button
                onClick={() => setSpecificDate('2026-02-18')}
                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                type="button"
              >
                Go to 18/2
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => applyTimeTravel(1)}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              type="button"
            >
              +1 day
            </button>
            <button
              onClick={() => applyTimeTravel(-1)}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              type="button"
            >
              -1 day
            </button>
            <button
              onClick={() => applyTimeTravel(7)}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              type="button"
            >
              +7 days
            </button>
            <button
              onClick={clearTimeTravel}
              className="px-3 py-1 text-xs bg-white text-purple-700 border border-purple-300 rounded hover:bg-purple-100 transition-colors"
              type="button"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        <button
          onClick={cleanupFakeTestData}
          disabled={isLoading}
          className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="font-medium">Cleanup Fake Test Cards</span>
        </button>

        <button
          onClick={getSRSStats}
          disabled={isLoading}
          className="flex items-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
          <Database className="w-4 h-4" />
          <span className="font-medium">Get SRS Stats</span>
        </button>

        <button
          onClick={testSRSWithRealDate}
          disabled={isLoading}
          className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span className="font-medium">Test SRS Integration</span>
        </button>

        <button
          onClick={createSRSForSpecificDates}
          disabled={isLoading}
          className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          <span className="font-medium">Create SRS for This Week</span>
        </button>

        <button
          onClick={checkCalendarState}
          disabled={isLoading}
          className="flex items-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span className="font-medium">Check Calendar State</span>
        </button>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Test Results
          </h4>
          <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-48">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-3">Debug Logs</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-400 text-sm">No logs yet. Run a test to see logs.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-gray-500 font-mono text-xs">{log.timestamp}</span>
                <span className={`flex-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
