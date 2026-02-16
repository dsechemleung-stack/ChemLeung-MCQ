/**
 * SRS Permission Test Component - Browser-based testing
 * 
 * Test Firebase permissions for SRS system in the browser
 */

import React, { useMemo, useState } from 'react';
import { Bug, Play, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { srsService } from '../../services/srsService';

export default function SRSPermissionTest({ userId, questions = [] }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const realQuestionSample = useMemo(() => {
    if (!Array.isArray(questions) || questions.length === 0) return null;
    const q = questions.find((x) => x?.ID != null) || questions[0];
    if (!q) return null;
    return {
      ID: String(q.ID),
      Topic: q.Topic || q.topic || 'Chemistry',
      Subtopic: q.Subtopic || q.subtopic || null,
      attemptCount: 1
    };
  }, [questions]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testSRSPermissions = async () => {
    setIsLoading(true);
    addLog('🧪 Starting SRS Permission Test...', 'info');
    
    try {
      // Use actual logged-in user ID
      const testUserId = userId || 'current_user';
      addLog(`👤 Testing with user ID: ${testUserId}`, 'info');
      
      // Test 1: getAllCards
      addLog('1️⃣ Testing getAllCards...', 'info');
      const allCards = await srsService.getAllCards(testUserId);
      addLog(`✅ getAllCards SUCCESS: ${allCards.length} cards found`, 'success');
      
      // Test 2: getDueCards
      addLog('2️⃣ Testing getDueCards...', 'info');
      const dueCards = await srsService.getDueCards(testUserId);
      addLog(`✅ getDueCards SUCCESS: ${dueCards.length} due cards`, 'success');
      
      // Test 3: createCardsFromMistakes
      addLog('3️⃣ Testing createCardsFromMistakes...', 'info');
      const testQuestions = realQuestionSample
        ? [realQuestionSample]
        : [
            {
              ID: `perm_test_${Date.now()}`,
              Topic: 'Chemistry',
              Subtopic: 'Permission Test',
              attemptCount: 1
            }
          ];

      if (!realQuestionSample) {
        addLog('⚠️ No real question bank provided to test. Created a fake questionId (not reviewable).', 'warning');
      } else {
        addLog(`✅ Using real question ID for test: ${testQuestions[0].ID}`, 'success');
      }
      
      const cards = await srsService.createCardsFromMistakes(
        testUserId, 
        testQuestions, 
        `perm_session_${Date.now()}`, 
        `perm_attempt_${Date.now()}`
      );
      
      addLog(`✅ createCardsFromMistakes SUCCESS: ${cards.length} cards created`, 'success');
      
      // Show card data structure
      if (cards.length > 0) {
        addLog('📄 Card data structure:', 'info');
        const cardData = cards[0];
        
        // Validate required fields for Firebase rules
        const requiredFields = ['userId', 'questionId', 'interval', 'easeFactor', 'repetitionCount', 'nextReviewDate', 'status'];
        const hasAllFields = requiredFields.every(field => cardData.hasOwnProperty(field));
        
        addLog(`  • Has all required fields: ${hasAllFields ? '✅' : '❌'}`, hasAllFields ? 'success' : 'error');
        
        requiredFields.forEach(field => {
          const value = cardData[field];
          const hasField = cardData.hasOwnProperty(field);
          addLog(`  • ${field}: ${hasField ? value : 'MISSING'}`, hasField ? 'info' : 'error');
        });
        
        // Check status value against Firebase rules
        const validStatuses = ['new', 'learning', 'review', 'graduated'];
        const statusValid = validStatuses.includes(cardData.status);
        addLog(`  • Status "${cardData.status}" is valid: ${statusValid ? '✅' : '❌'}`, statusValid ? 'success' : 'error');
        
        // Check data types
        addLog(`  • userId (string): ${typeof cardData.userId === 'string' ? '✅' : '❌'}`, typeof cardData.userId === 'string' ? 'success' : 'error');
        addLog(`  • questionId (string): ${typeof cardData.questionId === 'string' ? '✅' : '❌'}`, typeof cardData.questionId === 'string' ? 'success' : 'error');
        addLog(`  • interval (number): ${typeof cardData.interval === 'number' ? '✅' : '❌'}`, typeof cardData.interval === 'number' ? 'success' : 'error');
        addLog(`  • easeFactor (number): ${typeof cardData.easeFactor === 'number' ? '✅' : '❌'}`, typeof cardData.easeFactor === 'number' ? 'success' : 'error');
        addLog(`  • repetitionCount (number): ${typeof cardData.repetitionCount === 'number' ? '✅' : '❌'}`, typeof cardData.repetitionCount === 'number' ? 'success' : 'error');
        addLog(`  • nextReviewDate (string): ${typeof cardData.nextReviewDate === 'string' ? '✅' : '❌'}`, typeof cardData.nextReviewDate === 'string' ? 'success' : 'error');
      }
      
      setTestResults({
        success: true,
        allCardsCount: allCards.length,
        dueCardsCount: dueCards.length,
        createdCardsCount: cards.length,
        cardData: cards[0] || null,
        timestamp: new Date().toISOString()
      });
      
      addLog('🎉 ALL TESTS PASSED! SRS permissions are working correctly.', 'success');
      
    } catch (error) {
      addLog(`❌ TEST FAILED: ${error.message}`, 'error');
      
      // Detailed error analysis
      if (error.code) {
        addLog(`🔍 Firebase Error Code: ${error.code}`, 'error');
        addLog(`🔍 Firebase Error Message: ${error.message}`, 'error');
      }
      
      if (error.details) {
        addLog(`🔍 Error Details: ${JSON.stringify(error.details)}`, 'error');
      }
      
      // Common permission issues
      if (error.message.includes('Missing or insufficient permissions')) {
        addLog('💡 This usually means:', 'warning');
        addLog('  • Firebase rules are not deployed', 'warning');
        addLog('  • User is not authenticated', 'warning');
        addLog('  • Rules don\'t allow this operation', 'warning');
      }
      
      setTestResults({
        success: false,
        error: error.message,
        code: error.code,
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
          <span>Please log in to test SRS permissions</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Bug className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SRS Permission Test</h3>
            <p className="text-sm text-gray-600">Test Firebase permissions for SRS system</p>
          </div>
        </div>
        <button
          onClick={clearLogs}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear Logs
        </button>
      </div>

      <button
        onClick={testSRSPermissions}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
      >
        <Play className="w-4 h-4" />
        <span className="font-medium">
          {isLoading ? 'Testing...' : 'Run SRS Permission Test'}
        </span>
      </button>

      {/* Test Results */}
      {testResults && (
        <div className={`rounded-lg p-4 mb-6 ${
          testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
            testResults.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {testResults.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            Test Results
          </h4>
          <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-48">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-3">Test Logs</h4>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-400 text-sm">Click "Run SRS Permission Test" to see logs.</div>
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
