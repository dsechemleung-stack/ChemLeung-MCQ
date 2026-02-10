import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ResultsSummary from '../components/ResultsSummary';
import { quizStorage } from '../utils/quizStorage';
import { quizService } from '../services/quizService';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Load data from storage
  const questions = quizStorage.getSelectedQuestions();
  const userAnswers = quizStorage.getUserAnswers();
  const questionTimes = quizStorage.getQuestionTimes();

  // Redirect if no data
  useEffect(() => {
    if (!questions || questions.length === 0 || Object.keys(userAnswers).length === 0) {
      navigate('/');
    }
  }, [questions, userAnswers, navigate]);

  // Save attempt to Firebase on mount
  useEffect(() => {
    async function saveAttemptToFirebase() {
      if (!currentUser || !questions || questions.length === 0 || saved || saving) {
        return;
      }

      setSaving(true);
      
      try {
        // Calculate results
        const totalQuestions = questions.length;
        const correctAnswers = questions.reduce((acc, q) => {
          return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
        }, 0);
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);

        // Get unique topics
        const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);

        // Calculate total time spent
        const timeSpent = questionTimes 
          ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
          : null;

        // Save to Firebase
        const attemptData = {
          score: percentage,
          totalQuestions: totalQuestions,
          correctAnswers: correctAnswers,
          percentage: percentage,
          topics: topics,
          timeSpent: timeSpent,
          questionTimes: questionTimes,
          answers: userAnswers
        };

        await quizService.saveAttempt(currentUser.uid, attemptData);
        setSaved(true);
        console.log('✅ Attempt saved to Firebase successfully!');
      } catch (error) {
        console.error('❌ Error saving attempt to Firebase:', error);
        // Don't block the user from seeing results even if save fails
      } finally {
        setSaving(false);
      }
    }

    saveAttemptToFirebase();
  }, [currentUser, questions, userAnswers, questionTimes, saved, saving]);

  if (!questions || questions.length === 0) {
    return null; // Will redirect in useEffect
  }

  const handleRestart = () => {
    // Clear all quiz data
    quizStorage.clearQuizData();
    
    // Navigate back to topic selection
    navigate('/');
  };

  return (
    <div className="relative">
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="font-semibold">Saving to your profile...</span>
        </div>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-right">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Saved to your profile!</span>
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