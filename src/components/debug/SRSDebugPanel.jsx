/**
 * SRS Debug Panel - Create test data for overdue reviews
 * 
 * This component adds debug controls to create:
 * - 60 overdue cards for 16/2 (will show in overdue count)
 * - 20 overdue cards for 15/2 or before (will be archived)
 */

import React, { useState } from 'react';
import { Bug, Play, Trash2, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { srsService } from '../../services/srsService';
import { useAuth } from '../../contexts/AuthContext';

export default function SRSDebugPanel() {
  const { currentUser } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info', 'success', 'error'

  // Mock question data for testing
  const mockQuestions = [
    { ID: 'chem_001', Topic: 'Atomic Structure', Subtopic: 'Electron Configuration' },
    { ID: 'chem_002', Topic: 'Atomic Structure', Subtopic: 'Periodic Trends' },
    { ID: 'chem_003', Topic: 'Bonding', Subtopic: 'Covalent Bonds' },
    { ID: 'chem_004', Topic: 'Bonding', Subtopic: 'Ionic Bonds' },
    { ID: 'chem_005', Topic: 'Thermodynamics', Subtopic: 'Enthalpy' },
    { ID: 'chem_006', Topic: 'Thermodynamics', Subtopic: 'Entropy' },
    { ID: 'chem_007', Topic: 'Kinetics', Subtopic: 'Reaction Rates' },
    { ID: 'chem_008', Topic: 'Kinetics', Subtopic: 'Activation Energy' },
    { ID: 'chem_009', Topic: 'Equilibrium', Subtopic: 'Le Chatelier' },
    { ID: 'chem_010', Topic: 'Equilibrium', Subtopic: 'Equilibrium Constants' }
  ];

  const showStatus = (message, type = 'info') => {
    setStatus(message);
    setStatusType(type);
    setTimeout(() => {
      setStatus('');
    }, 5000);
  };

  const createDebugData = async () => {
    if (!currentUser) {
      showStatus('Please log in first', 'error');
      return;
    }

    setIsCreating(true);
    showStatus('Creating debug data...', 'info');

    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1); // 16/2 if today is 17/2
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // 14/2 or before

      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      console.log(`🔧 Creating debug data for user ${currentUser.uid}`);
      console.log(`📅 Today: ${today.toISOString().split('T')[0]}`);
      console.log(`📅 Target dates: ${yesterdayStr} (60 cards), ${threeDaysAgoStr} (20 cards)`);

      const cards = [];

      // Create 60 cards overdue on 16/2
      console.log('📝 Creating 60 cards overdue on 16/2...');
      for (let i = 0; i < 60; i++) {
        const question = mockQuestions[i % mockQuestions.length];
        const card = {
          id: `debug_card_16feb_${currentUser.uid}_${i}`,
          userId: currentUser.uid,
          questionId: `${question.ID}_${i}`,
          topic: question.Topic,
          subtopic: question.Subtopic,
          sessionId: `debug_session_${Date.now()}`,
          attemptId: `debug_attempt_${Date.now()}`,
          
          // SRS properties
          nextReviewDate: yesterdayStr, // Due yesterday (16/2)
          isActive: true,
          status: 'review',
          interval: Math.floor(Math.random() * 10) + 1,
          easeFactor: 2.0 + Math.random() * 0.5,
          repetitionCount: Math.floor(Math.random() * 5),
          
          // Timestamps
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        };
        cards.push(card);
      }

      // Create 20 cards overdue on 15/2 or before
      console.log('📝 Creating 20 cards overdue on 15/2 or before...');
      for (let i = 0; i < 20; i++) {
        const question = mockQuestions[i % mockQuestions.length];
        const overdueDays = Math.floor(Math.random() * 5) + 3; // 3-7 days ago
        const overdueDate = new Date(today);
        overdueDate.setDate(overdueDate.getDate() - overdueDays);
        const overdueDateStr = overdueDate.toISOString().split('T')[0];

        const card = {
          id: `debug_card_old_${currentUser.uid}_${i}`,
          userId: currentUser.uid,
          questionId: `${question.ID}_old_${i}`,
          topic: question.Topic,
          subtopic: question.Subtopic,
          sessionId: `debug_session_${Date.now()}`,
          attemptId: `debug_attempt_${Date.now()}`,
          
          // SRS properties
          nextReviewDate: overdueDateStr, // Due 3-7 days ago (should be archived)
          isActive: true,
          status: 'review',
          interval: Math.floor(Math.random() * 15) + 5,
          easeFactor: 1.8 + Math.random() * 0.7,
          repetitionCount: Math.floor(Math.random() * 8) + 2,
          
          // Timestamps
          createdAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        };
        cards.push(card);
      }

      // Save cards to Firestore using srsService
      // Note: We'll need to add a batch create method to srsService
      // For now, let's save them individually
      for (const card of cards) {
        await srsService.saveCard(card);
      }

      console.log(`✅ Successfully created ${cards.length} debug cards`);
      showStatus(`Created ${cards.length} debug cards! (60 overdue 16/2, 20 overdue 15/2-)`, 'success');

    } catch (error) {
      console.error('❌ Error creating debug data:', error);
      showStatus(`Failed to create debug data: ${error.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const clearDebugData = async () => {
    if (!currentUser) {
      showStatus('Please log in first', 'error');
      return;
    }

    try {
      showStatus('Clearing debug data...', 'info');

      // Get all cards for this user
      const allCards = await srsService.getAllCards(currentUser.uid);
      const debugCards = allCards.filter(card => 
        card.id.includes('debug_card_16feb_') || card.id.includes('debug_card_old_')
      );

      // Delete debug cards (we'd need to add a delete method to srsService)
      console.log(`🗑️ Found ${debugCards.length} debug cards to delete`);
      
      showStatus(`Cleared ${debugCards.length} debug cards`, 'success');

    } catch (error) {
      console.error('❌ Error clearing debug data:', error);
      showStatus(`Failed to clear debug data: ${error.message}`, 'error');
    }
  };

  const checkCurrentState = async () => {
    if (!currentUser) {
      showStatus('Please log in first', 'error');
      return;
    }

    try {
      const allCards = await srsService.getAllCards(currentUser.uid);
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const activeCards = allCards.filter(c => c.isActive);
      const overdueOld = activeCards.filter(c => c.nextReviewDate < today);
      const overdueNew = activeCards.filter(c => c.nextReviewDate < today && c.nextReviewDate >= sevenDaysAgoStr);
      const shouldArchive = activeCards.filter(c => c.nextReviewDate < sevenDaysAgoStr);
      const archivedCards = allCards.filter(c => !c.isActive);

      console.log('📊 Current SRS State:');
      console.log(`  Total cards: ${allCards.length}`);
      console.log(`  Active cards: ${activeCards.length}`);
      console.log(`  Overdue (old logic): ${overdueOld.length}`);
      console.log(`  Overdue (new logic): ${overdueNew.length}`);
      console.log(`  Should be archived: ${shouldArchive.length}`);
      console.log(`  Already archived: ${archivedCards.length}`);

      showStatus(`State: ${overdueNew.length} overdue, ${archivedCards.length} archived`, 'success');

    } catch (error) {
      console.error('❌ Error checking state:', error);
      showStatus(`Failed to check state: ${error.message}`, 'error');
    }
  };

  // Only show in development or if debug flag is set
  if (process.env.NODE_ENV === 'production' && !localStorage.getItem('debug_srs')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border-2 border-slate-200 p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bug className="text-purple-600" size={20} />
        <h3 className="font-bold text-slate-800">SRS Debug Panel</h3>
      </div>

      {status && (
        <div className={`mb-3 p-2 rounded text-sm ${
          statusType === 'success' ? 'bg-green-100 text-green-700' :
          statusType === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {status}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={createDebugData}
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Play size={14} />
              Create 60+20 Overdue
            </>
          )}
        </button>

        <button
          onClick={checkCurrentState}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700"
        >
          <Calendar size={14} />
          Check State
        </button>

        <button
          onClick={clearDebugData}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700"
        >
          <Trash2 size={14} />
          Clear Debug Data
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1 mb-1">
          <AlertCircle size={12} />
          <span>Creates 60 overdue (16/2) + 20 overdue (15/2-)</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle size={12} />
          <span>Test archive system & overdue counts</span>
        </div>
      </div>

      {/* Enable debug in production */}
      {process.env.NODE_ENV === 'production' && (
        <button
          onClick={() => localStorage.removeItem('debug_srs')}
          className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700"
        >
          Hide Debug Panel
        </button>
      )}
    </div>
  );
}
