/**
 * Quiz Completion Tracker
 * Handles logging completed quiz sessions to calendar with proper scoring
 */

import { calendarService } from '../services/calendarService';

// Session types
export const SESSION_TYPES = {
  TOPICAL: 'Topical Practice',
  MISTAKE_REVIEW: 'Mistake Book Review',
  SPACED_REPETITION: 'Spaced Repetition',
  STUDY_PLAN: 'Study Plan Session',
  AI_RECOMMENDATION: 'AI Recommendation',
  PRACTICE_MODE: 'Practice Mode',
  TIMED_PRACTICE: 'Timed Practice'
};

/**
 * Log completed quiz session to calendar
 * 
 * @param {Object} quizData - Quiz completion data
 * @param {string} quizData.sessionType - Type of session (from SESSION_TYPES)
 * @param {number} quizData.questionCount - Total questions in the session
 * @param {number} quizData.correctAnswers - Number of correct answers
 * @param {number} quizData.timeSpent - Time spent in milliseconds
 * @param {Array<string>} quizData.topics - Topics covered
 * @param {Array<string>} quizData.subtopics - Subtopics covered
 * @param {Date} quizData.date - Date of completion (defaults to today)
 * @param {string} quizData.userId - User ID
 * @param {string} quizData.eventId - Optional event ID if linked to a calendar event
 * @param {Object} quizData.settings - Quiz settings (timer, timed mode, etc.)
 */
export async function logQuizCompletion(quizData) {
  const {
    userId,
    sessionType = SESSION_TYPES.PRACTICE_MODE,
    questionCount = 0,
    correctAnswers = 0,
    timeSpent = 0,
    topics = [],
    subtopics = [],
    date = new Date(),
    eventId = null,
    settings = {}
  } = quizData;

  if (!userId) {
    console.error('Cannot log quiz completion: userId is required');
    return false;
  }

  // Calculate accuracy percentage
  const accuracy = questionCount > 0 ? Math.round((correctAnswers / questionCount) * 100) : 0;

  // Format date as YYYY-MM-DD
  const dateStr = date instanceof Date 
    ? date.toISOString().split('T')[0]
    : new Date(date).toISOString().split('T')[0];

  // Prepare completion data
  const completionData = {
    sessionType,
    questionCount,
    correctAnswers,
    accuracy,
    timeSpent,
    topics,
    subtopics,
    timestamp: new Date().toISOString(),
    settings
  };

  try {
    // Add to calendar
    await calendarService.addCompletedSession(userId, dateStr, completionData);
    
    // If linked to an event, mark the event as completed
    if (eventId) {
      await calendarService.completeEvent(eventId, completionData);
    }

    console.log('✅ Quiz completion logged to calendar:', {
      date: dateStr,
      sessionType,
      score: `${correctAnswers}/${questionCount} (${accuracy}%)`
    });

    return true;
  } catch (error) {
    console.error('❌ Failed to log quiz completion:', error);
    return false;
  }
}

/**
 * Auto-detect session type from quiz parameters
 */
export function detectSessionType(params = {}) {
  const {
    mode,
    includeMistakeReview,
    isSpacedRepetition,
    eventId,
    timedMode,
    topicId
  } = params;

  if (isSpacedRepetition || mode === 'spaced-repetition') {
    return SESSION_TYPES.SPACED_REPETITION;
  }
  
  if (includeMistakeReview || mode === 'mistake-review') {
    return SESSION_TYPES.MISTAKE_REVIEW;
  }
  
  if (eventId || mode === 'study-plan') {
    return SESSION_TYPES.STUDY_PLAN;
  }
  
  if (mode === 'ai-recommendation') {
    return SESSION_TYPES.AI_RECOMMENDATION;
  }
  
  if (topicId || mode === 'topical') {
    return SESSION_TYPES.TOPICAL;
  }
  
  if (timedMode) {
    return SESSION_TYPES.TIMED_PRACTICE;
  }

  return SESSION_TYPES.PRACTICE_MODE;
}

/**
 * Automatically log quiz completion from quiz results
 * Use this in your quiz completion page
 * 
 * @param {Object} quizResults - Results from completed quiz
 * @param {string} userId - User ID
 * @param {Object} quizParams - Parameters from localStorage or query params
 */
export async function autoLogQuizCompletion(quizResults, userId, quizParams = {}) {
  const sessionType = detectSessionType(quizParams);
  
  const quizData = {
    userId,
    sessionType,
    questionCount: quizResults.totalQuestions || 0,
    correctAnswers: quizResults.correctAnswers || 0,
    timeSpent: quizResults.timeSpent || 0,
    topics: quizResults.topics || [],
    subtopics: quizResults.subtopics || [],
    date: new Date(),
    eventId: quizParams.eventId || null,
    settings: {
      timerEnabled: quizParams.timerEnabled || false,
      timedMode: quizParams.timedMode || false,
      reviewMode: quizParams.reviewMode || 'normal'
    }
  };

  return await logQuizCompletion(quizData);
}

/**
 * Get completion statistics for a date range
 * 
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
export async function getCompletionStats(userId, startDate, endDate) {
  try {
    const stats = await calendarService.getCompletionStats(userId, startDate, endDate);
    return stats;
  } catch (error) {
    console.error('Failed to get completion stats:', error);
    return null;
  }
}

/**
 * Example usage in quiz completion page:
 * 
 * ```javascript
 * import { autoLogQuizCompletion } from './utils/quizCompletionTracker';
 * 
 * // When quiz finishes:
 * const quizResults = {
 *   totalQuestions: 10,
 *   correctAnswers: 8,
 *   timeSpent: 300000, // 5 minutes in ms
 *   topics: ['Organic Chemistry', 'Inorganic Chemistry'],
 *   subtopics: ['Alcohols', 'Coordination Compounds']
 * };
 * 
 * const quizParams = {
 *   mode: localStorage.getItem('quiz_mode'),
 *   eventId: localStorage.getItem('quiz_event_id'),
 *   timedMode: localStorage.getItem('quiz_timer_enabled') === 'true'
 * };
 * 
 * await autoLogQuizCompletion(quizResults, currentUser.uid, quizParams);
 * ```
 */

export default {
  logQuizCompletion,
  autoLogQuizCompletion,
  detectSessionType,
  getCompletionStats,
  SESSION_TYPES
};