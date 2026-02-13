import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ResultsSummary from '../components/ResultsSummary';
import { quizStorage } from '../utils/quizStorage';
import { quizService } from '../services/quizService';
import { quizCompletionService } from '../services/quizCompletionService';
import { calendarService } from '../services/calendarService';

/**
 * ResultsPage - FIXED VERSION
 * 
 * FIXES:
 * 1. ✅ Saves detailed completion to calendar with full metadata
 * 2. ✅ Creates individualized spaced repetition for each attempt
 * 3. ✅ Links completion to attempt ID for viewing results later
 */
export default function ResultsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const hasSavedRef = useRef(false);

  const questions = quizStorage.getSelectedQuestions();
  const userAnswers = quizStorage.getUserAnswers();
  const questionTimes = quizStorage.getQuestionTimes();

  useEffect(() => {
    if (!questions || questions.length === 0 || Object.keys(userAnswers).length === 0) {
      navigate('/');
    }
  }, [navigate, questions, userAnswers]);

  useEffect(() => {
    async function saveAttemptToFirebase() {
      if (hasSavedRef.current) return;
      if (!currentUser || !questions || questions.length === 0) return;
      if (Object.keys(userAnswers).length === 0) return;

      hasSavedRef.current = true;
      setSaving(true);

      try {
        // Calculate results
        const totalQuestions = questions.length;
        const correctAnswers = questions.reduce((acc, q) => {
          return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
        }, 0);
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);
        const subtopics = [...new Set(questions.map(q => q.Subtopic).filter(Boolean))];
        const timeSpent = questionTimes
          ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
          : null;

        const attemptData = {
          score: percentage,
          totalQuestions,
          correctAnswers,
          percentage,
          topics,
          subtopics,
          timeSpent,
          questionTimes,
          answers: userAnswers,
          questions,
        };

        // STEP 1: Save the quiz attempt to Firestore
        console.log('💾 Saving attempt to Firestore...');
        const savedAttempt = await quizService.saveAttempt(currentUser.uid, attemptData);
        const generatedAttemptId = savedAttempt.id || `attempt_${Date.now()}`;
        setAttemptId(generatedAttemptId);
        setSaved(true);
        console.log('✅ Attempt saved with ID:', generatedAttemptId);

        // STEP 2: Process quiz completion (performance + individualized spaced repetition)
        console.log('🔄 Starting post-quiz processing...');
        
        const processingResults = await quizCompletionService.processQuizCompletion(
          currentUser.uid,
          questions,
          userAnswers,
          generatedAttemptId  // 🎯 Pass attempt ID for individualized reviews
        );

        console.log('📊 Post-quiz processing complete:', processingResults);
        
        if (processingResults.performanceRecorded) {
          console.log('✅ Performance data recorded for AI recommendations');
        }
        
        if (processingResults.repetitionsScheduled > 0) {
          console.log(`✅ Scheduled ${processingResults.repetitionsScheduled} individualized review(s)`);
        }
        
        if (processingResults.errors.length > 0) {
          console.warn('⚠️ Some processing steps failed:', processingResults.errors);
        }

        // STEP 3: Log DETAILED completion to calendar
        console.log('📝 Logging detailed completion to calendar...');
        
        const quizMode = localStorage.getItem('quiz_mode');
        const eventId = localStorage.getItem('quiz_event_id');
        
        await quizCompletionService.logDetailedCompletion(
          currentUser.uid,
          generatedAttemptId,
          {
            totalQuestions,
            correctAnswers,
            percentage,
            topics,
            subtopics,
            timeSpent,
            mode: quizMode,
            eventId
          }
        );
        
        console.log('✅ Detailed completion logged to calendar');

        // STEP 4: Mark calendar event as complete if this was a study plan session or review
        try {
          if (quizMode === 'study-plan' && eventId) {
            console.log('📝 Marking study session as complete:', eventId);
            await calendarService.markEventCompleted(eventId, {
              completedAt: new Date().toISOString(),
              questionCount: totalQuestions,
              correctCount: correctAnswers,
              accuracy: correctAnswers / totalQuestions,
              attemptId: generatedAttemptId
            });
            console.log('✅ Study session marked complete');
          }
          
          if (quizMode === 'spaced-repetition') {
            // Handle multiple event IDs for batch review
            const eventIdsJson = localStorage.getItem('quiz_event_ids');
            if (eventIdsJson) {
              const eventIds = JSON.parse(eventIdsJson);
              for (const id of eventIds) {
                // Determine if this specific question was correct
                const isCorrect = userAnswers[questions[0]?.ID] === questions[0]?.CorrectOption;
                
                await calendarService.markEventCompleted(id, {
                  completedAt: new Date().toISOString(),
                  wasCorrect: isCorrect,
                  attemptId: generatedAttemptId
                });
                
                // 🎯 Handle review progression
                await quizCompletionService.handleReviewCompletion(id, isCorrect);
              }
              console.log(`✅ Marked ${eventIds.length} review(s) complete`);
            } else if (eventId) {
              // Single review
              const isCorrect = correctAnswers === totalQuestions;
              
              await calendarService.markEventCompleted(eventId, {
                completedAt: new Date().toISOString(),
                wasCorrect: isCorrect,
                attemptId: generatedAttemptId
              });
              
              // 🎯 Handle review progression
              await quizCompletionService.handleReviewCompletion(eventId, isCorrect);
              
              console.log('✅ Review marked complete');
            }
          }
        } catch (error) {
          console.error('⚠️ Error marking event complete:', error);
          // Don't throw - this is non-critical
        }

        setProcessingComplete(true);

      } catch (error) {
        console.error('❌ Error saving attempt:', error);
        hasSavedRef.current = false;
      } finally {
        setSaving(false);
      }
    }

    saveAttemptToFirebase();
  }, [currentUser, questions, userAnswers, questionTimes, navigate]);

  if (!questions || questions.length === 0) return null;

  const handleRestart = () => {
    quizStorage.clearQuizData();
    
    // Clear quiz params
    localStorage.removeItem('quiz_mode');
    localStorage.removeItem('quiz_event_id');
    localStorage.removeItem('quiz_event_ids');
    localStorage.removeItem('quiz_event_phase');
    localStorage.removeItem('quiz_timer_enabled');
    localStorage.removeItem('quiz_review_mode');
    
    navigate('/');
  };

  return (
    <div className="relative">
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="font-semibold">
            {t('results.savingToProfile')}
          </span>
        </div>
      )}

      {/* Saved indicator */}
      {saved && !saving && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">
            {t('results.savedToProfile')}
          </span>
        </div>
      )}

      {/* Processing complete indicator */}
      {processingComplete && (
        <div className="fixed top-32 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-semibold">
            Individualized reviews scheduled!
          </span>
        </div>
      )}

      <ResultsSummary
        questions={questions}
        userAnswers={userAnswers}
        questionTimes={questionTimes}
        onRestart={handleRestart}
      />
    </div>
  );
}