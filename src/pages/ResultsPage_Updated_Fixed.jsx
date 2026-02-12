import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ResultsSummary from '../components/ResultsSummary';
import { quizStorage } from '../utils/quizStorage';
import { quizService } from '../services/quizService';
import { quizCompletionService } from '../services/quizCompletionService';
import { calendarService } from '../services/calendarService';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const hasSavedRef = useRef(false);

  const questions = quizStorage.getSelectedQuestions();
  const userAnswers = quizStorage.getUserAnswers();
  const questionTimes = quizStorage.getQuestionTimes();

  useEffect(() => {
    if (!questions || questions.length === 0 || Object.keys(userAnswers).length === 0) {
      navigate('/');
    }
  }, []);

  useEffect(() => {
    async function saveAttemptToFirebase() {
      if (hasSavedRef.current) return;
      if (!currentUser || !questions || questions.length === 0) return;
      if (Object.keys(userAnswers).length === 0) return;

      hasSavedRef.current = true;
      setSaving(true);

      try {
        const totalQuestions = questions.length;
        const correctAnswers = questions.reduce((acc, q) => {
          return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
        }, 0);
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);
        const timeSpent = questionTimes
          ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
          : null;

        const attemptData = {
          score: percentage,
          totalQuestions,
          correctAnswers,
          percentage,
          topics,
          timeSpent,
          questionTimes,
          answers: userAnswers,
          questions,
        };

        // Save the quiz attempt
        await quizService.saveAttempt(currentUser.uid, attemptData);
        setSaved(true);
        console.log('✅ Attempt saved to Firestore');

        // POST-QUIZ PROCESSING
        console.log('🔄 Starting post-quiz processing...');
        
        // 1. Performance tracking + Spaced repetition
        const processingResults = await quizCompletionService.processQuizCompletion(
          currentUser.uid,
          questions,
          userAnswers
        );

        console.log('📊 Post-quiz processing complete:', processingResults);
        
        if (processingResults.performanceRecorded) {
          console.log('✅ Performance data recorded for AI recommendations');
        }
        
        if (processingResults.repetitionsScheduled > 0) {
          console.log(`✅ Scheduled ${processingResults.repetitionsScheduled} spaced repetition review(s)`);
        }
        
        if (processingResults.errors.length > 0) {
          console.warn('⚠️ Some processing steps failed:', processingResults.errors);
        }

        // 2. Mark calendar event as complete if this was a study plan session or review
        try {
          const quizMode = localStorage.getItem('quiz_mode');
          const eventId = localStorage.getItem('quiz_event_id');
          
          if (quizMode === 'study-plan' && eventId) {
            console.log('📝 Marking study session as complete:', eventId);
            await calendarService.markEventComplete(eventId, {
              completedAt: new Date().toISOString(),
              questionCount: totalQuestions,
              correctCount: correctAnswers,
              accuracy: correctAnswers / totalQuestions
            });
            console.log('✅ Study session marked complete');
          }
          
          if (quizMode === 'spaced-repetition') {
            // Handle multiple event IDs for batch review
            const eventIdsJson = localStorage.getItem('quiz_event_ids');
            if (eventIdsJson) {
              const eventIds = JSON.parse(eventIdsJson);
              for (const id of eventIds) {
                await calendarService.markEventComplete(id, {
                  completedAt: new Date().toISOString(),
                  questionCount: 1,
                  correctCount: userAnswers[questions[0]?.ID] === questions[0]?.CorrectOption ? 1 : 0
                });
              }
              console.log(`✅ Marked ${eventIds.length} review(s) complete`);
            } else if (eventId) {
              // Single review
              await calendarService.markEventComplete(eventId, {
                completedAt: new Date().toISOString(),
                questionCount: 1,
                wasCorrect: correctAnswers === totalQuestions
              });
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
    navigate('/');
  };

  return (
    <div className="relative">
      {saving && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="font-semibold">
            {t('results.savingToProfile')}
          </span>
        </div>
      )}

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

      {processingComplete && (
        <div className="fixed top-32 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-semibold">
            Review sessions scheduled!
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