// localStorage utility for managing quiz state across pages

const STORAGE_KEYS = {
  SELECTED_QUESTIONS: 'quiz_selected_questions',
  USER_ANSWERS: 'quiz_user_answers',
  QUESTION_TIMES: 'quiz_question_times',
  FLAGGED: 'quiz_flagged',
  CURRENT_INDEX: 'quiz_current_index',
  TIMER_ENABLED: 'quiz_timer_enabled',
  SESSION_START: 'quiz_session_start'
};

export const quizStorage = {
  // Save selected questions for the quiz
  saveSelectedQuestions: (questions) => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_QUESTIONS, JSON.stringify(questions));
  },

  getSelectedQuestions: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SELECTED_QUESTIONS);
    return data ? JSON.parse(data) : null;
  },

  // Save user answers
  saveUserAnswers: (answers) => {
    localStorage.setItem(STORAGE_KEYS.USER_ANSWERS, JSON.stringify(answers));
  },

  getUserAnswers: () => {
    const data = localStorage.getItem(STORAGE_KEYS.USER_ANSWERS);
    return data ? JSON.parse(data) : {};
  },

  // Save question times
  saveQuestionTimes: (times) => {
    localStorage.setItem(STORAGE_KEYS.QUESTION_TIMES, JSON.stringify(times));
  },

  getQuestionTimes: () => {
    const data = localStorage.getItem(STORAGE_KEYS.QUESTION_TIMES);
    return data ? JSON.parse(data) : {};
  },

  // Save flagged questions
  saveFlagged: (flaggedSet) => {
    localStorage.setItem(STORAGE_KEYS.FLAGGED, JSON.stringify(Array.from(flaggedSet)));
  },

  getFlagged: () => {
    const data = localStorage.getItem(STORAGE_KEYS.FLAGGED);
    return data ? new Set(JSON.parse(data)) : new Set();
  },

  // Save current question index
  saveCurrentIndex: (index) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, index.toString());
  },

  getCurrentIndex: () => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX);
    return data ? parseInt(data) : 0;
  },

  // Save timer settings
  saveTimerEnabled: (enabled) => {
    localStorage.setItem(STORAGE_KEYS.TIMER_ENABLED, JSON.stringify(enabled));
  },

  getTimerEnabled: () => {
    const data = localStorage.getItem(STORAGE_KEYS.TIMER_ENABLED);
    return data ? JSON.parse(data) : null;
  },

  saveSessionStart: (timestamp) => {
    localStorage.setItem(STORAGE_KEYS.SESSION_START, timestamp.toString());
  },

  getSessionStart: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION_START);
    return data ? parseInt(data) : null;
  },

  // Clear all quiz data (use when starting new quiz)
  clearQuizData: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Clear only progress data (keep selected questions)
  clearProgressData: () => {
    localStorage.removeItem(STORAGE_KEYS.USER_ANSWERS);
    localStorage.removeItem(STORAGE_KEYS.QUESTION_TIMES);
    localStorage.removeItem(STORAGE_KEYS.FLAGGED);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_INDEX);
    localStorage.removeItem(STORAGE_KEYS.TIMER_ENABLED);
    localStorage.removeItem(STORAGE_KEYS.SESSION_START);
  }
};