/**
 * SRS Algorithm - Anki/SM-2 Inspired Just-in-Time Scheduler
 * 
 * CRITICAL RULES:
 * 1. Never pre-schedule multiple reviews
 * 2. Only calculate next_review_date after user submits attempt
 * 3. Failed cards ALWAYS reset to interval=1 (tomorrow)
 * 4. Ease factor decreases on failure, never increases
 */

// SRS Constants
const SRS_CONFIG = {
  // Initial values for new cards
  INITIAL_INTERVAL: 1,           // days
  INITIAL_EASE_FACTOR: 2.5,      // multiplier
  INITIAL_REPETITION_COUNT: 0,
  
  // Learning phase intervals
  FIRST_SUCCESS_INTERVAL: 1,     // After first correct: 1 day
  SECOND_SUCCESS_INTERVAL: 6,    // After second correct: 6 days
  
  // Ease factor adjustments
  EASE_PENALTY: 0.20,            // Subtract on failure
  MIN_EASE_FACTOR: 1.3,          // Floor (never go below)
  MAX_EASE_FACTOR: 2.5,          // Ceiling (never go above)
  
  // Graduation threshold
  GRADUATION_THRESHOLD: 5,       // After 5 successful reviews, consider "mastered"
  
  // Status states
  STATUS: {
    NEW: 'new',                  // Never reviewed
    LEARNING: 'learning',        // Failed recently, needs practice
    REVIEW: 'review',            // Graduated to spaced intervals
    GRADUATED: 'graduated'       // Mastered (optional: archive)
  }
};

/**
 * Calculate next interval based on SRS state and result
 * 
 * @param {Object} currentState - Current SRS state
 * @param {number} currentState.interval - Current interval in days
 * @param {number} currentState.easeFactor - Current ease factor
 * @param {number} currentState.repetitionCount - Number of successful reviews
 * @param {string} currentState.status - Current status
 * @param {boolean} wasCorrect - Did user answer correctly?
 * @returns {Object} New SRS state
 */
export function calculateNextInterval(currentState, wasCorrect) {
  const {
    interval = SRS_CONFIG.INITIAL_INTERVAL,
    easeFactor = SRS_CONFIG.INITIAL_EASE_FACTOR,
    repetitionCount = SRS_CONFIG.INITIAL_REPETITION_COUNT,
    status = SRS_CONFIG.STATUS.NEW
  } = currentState;

  // SUCCESS CASE
  if (wasCorrect) {
    let nextInterval;
    let nextStatus;
    const nextRepetitionCount = repetitionCount + 1;
    
    // First successful review: 1 day
    if (repetitionCount === 0) {
      nextInterval = SRS_CONFIG.FIRST_SUCCESS_INTERVAL;
      nextStatus = SRS_CONFIG.STATUS.LEARNING;
    }
    // Second successful review: 6 days
    else if (repetitionCount === 1) {
      nextInterval = SRS_CONFIG.SECOND_SUCCESS_INTERVAL;
      nextStatus = SRS_CONFIG.STATUS.REVIEW;
    }
    // Third+ successful review: multiply by ease factor
    else {
      nextInterval = Math.round(interval * easeFactor);
      nextStatus = SRS_CONFIG.STATUS.REVIEW;
      
      // Check for graduation
      if (nextRepetitionCount >= SRS_CONFIG.GRADUATION_THRESHOLD) {
        nextStatus = SRS_CONFIG.STATUS.GRADUATED;
      }
    }
    
    return {
      interval: nextInterval,
      easeFactor: easeFactor, // Unchanged on success
      repetitionCount: nextRepetitionCount,
      status: nextStatus
    };
  }
  
  // FAILURE CASE
  else {
    // Calculate new ease factor (decrease, but respect floor)
    const newEaseFactor = Math.max(
      SRS_CONFIG.MIN_EASE_FACTOR,
      easeFactor - SRS_CONFIG.EASE_PENALTY
    );
    
    return {
      interval: 1,                              // Reset to tomorrow
      easeFactor: newEaseFactor,                // Reduced ease
      repetitionCount: 0,                       // Reset progress
      status: SRS_CONFIG.STATUS.LEARNING        // Back to learning
    };
  }
}

/**
 * Calculate the next review date
 * 
 * @param {number} intervalDays - Number of days to add
 * @param {Date} fromDate - Base date (defaults to today)
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function calculateNextReviewDate(intervalDays, fromDate = new Date()) {
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Check if a card is due for review
 * 
 * @param {string} nextReviewDate - ISO date string
 * @param {Date} now - Current date (defaults to today)
 * @returns {boolean} True if due
 */
export function isCardDue(nextReviewDate, now = new Date()) {
  const reviewDate = new Date(nextReviewDate);
  const today = new Date(now.toISOString().split('T')[0]); // Strip time
  return reviewDate <= today;
}

/**
 * Create initial SRS state for a new card
 * 
 * @param {Object} questionData - Question metadata
 * @returns {Object} Initial card state
 */
export function createNewCard(questionData) {
  const { questionId, userId, topic, subtopic, sessionId, attemptId } = questionData;
  
  const now = new Date();
  const nextReviewDate = calculateNextReviewDate(SRS_CONFIG.INITIAL_INTERVAL, now);
  
  return {
    // Identity
    id: `card_${userId}_${questionId}_${sessionId}`,
    userId,
    questionId,
    
    // Session tracking
    sessionId,
    createdFromAttemptId: attemptId,
    
    // Question metadata
    topic,
    subtopic,
    
    // SRS state (NEW card defaults)
    interval: SRS_CONFIG.INITIAL_INTERVAL,
    easeFactor: SRS_CONFIG.INITIAL_EASE_FACTOR,
    repetitionCount: SRS_CONFIG.INITIAL_REPETITION_COUNT,
    
    // Scheduling
    nextReviewDate,
    lastReviewedAt: null,
    
    // Status
    status: SRS_CONFIG.STATUS.NEW,
    currentAttemptNumber: 0,
    
    // Performance
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    
    // Flags
    isActive: true,
    isDue: isCardDue(nextReviewDate, now),
    
    // Audit
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

/**
 * Update card state after review attempt
 * 
 * @param {Object} card - Current card state
 * @param {boolean} wasCorrect - Did user answer correctly?
 * @returns {Object} Updated card state
 */
export function updateCardAfterReview(card, wasCorrect) {
  const now = new Date();
  
  // Calculate new SRS state
  const currentState = {
    interval: card.interval,
    easeFactor: card.easeFactor,
    repetitionCount: card.repetitionCount,
    status: card.status
  };
  
  const newState = calculateNextInterval(currentState, wasCorrect);
  
  // Calculate next review date
  const nextReviewDate = calculateNextReviewDate(newState.interval, now);
  
  // Update performance counters
  const totalAttempts = (card.totalAttempts || 0) + 1;
  const successfulAttempts = wasCorrect 
    ? (card.successfulAttempts || 0) + 1 
    : (card.successfulAttempts || 0);
  const failedAttempts = !wasCorrect 
    ? (card.failedAttempts || 0) + 1 
    : (card.failedAttempts || 0);
  
  return {
    ...card,
    
    // Updated SRS state
    interval: newState.interval,
    easeFactor: newState.easeFactor,
    repetitionCount: newState.repetitionCount,
    status: newState.status,
    
    // Updated scheduling
    nextReviewDate,
    lastReviewedAt: now.toISOString(),
    isDue: false, // Just reviewed, not due yet
    
    // Updated attempt tracking
    currentAttemptNumber: (card.currentAttemptNumber || 0) + 1,
    totalAttempts,
    successfulAttempts,
    failedAttempts,
    
    // Audit
    updatedAt: now.toISOString()
  };
}

/**
 * Check if card should be archived (graduated)
 * 
 * @param {Object} card - Card state
 * @returns {boolean} True if should be archived
 */
export function shouldArchiveCard(card) {
  return card.status === SRS_CONFIG.STATUS.GRADUATED;
}

// Export config for reference
export { SRS_CONFIG };