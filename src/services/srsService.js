/**
 * SRS Service - Firestore Integration
 * 
 * Manages spaced repetition cards using Just-in-Time scheduling
 * 
 * CRITICAL: This service NEVER pre-schedules multiple reviews.
 * Reviews are created ONE AT A TIME as users complete them.
 */

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc,
  query, 
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import {
  createNewCard,
  updateCardAfterReview,
  isCardDue,
  shouldArchiveCard,
  SRS_CONFIG
} from './srsAlgorithm';

// Collection names
const COLLECTIONS = {
  CARDS: 'spaced_repetition_cards',
  ATTEMPTS: 'review_attempts',
  SESSIONS: 'review_sessions'
};

/**
 * Create SRS cards for wrong answers from a quiz
 * 
 * @param {string} userId - User ID
 * @param {Array} wrongQuestions - Questions answered incorrectly
 * @param {string} sessionId - Original quiz session ID
 * @param {string} attemptId - Original quiz attempt ID
 * @returns {Promise<Array>} Created cards
 */
export async function createCardsFromMistakes(userId, wrongQuestions, sessionId, attemptId) {
  const batch = writeBatch(db);
  const createdCards = [];
  
  console.log(`📝 Creating ${wrongQuestions.length} SRS cards for user ${userId}`);
  
  for (const question of wrongQuestions) {
    // Check if card already exists for this user+question combination
    const existingCardId = `card_${userId}_${question.ID}_${sessionId}`;
    const existingCardRef = doc(db, COLLECTIONS.CARDS, existingCardId);
    const existingCardSnap = await getDoc(existingCardRef);
    
    if (existingCardSnap.exists()) {
      console.log(`⚠️ Card already exists: ${existingCardId}, skipping`);
      continue;
    }
    
    // Create new card
    const card = createNewCard({
      questionId: question.ID,
      userId,
      topic: question.Topic,
      subtopic: question.Subtopic || null,
      sessionId,
      attemptId
    });
    
    batch.set(doc(db, COLLECTIONS.CARDS, card.id), card);
    createdCards.push(card);
    
    console.log(`✅ Created SRS card: ${card.id} (review on ${card.nextReviewDate})`);
  }
  
  if (createdCards.length > 0) {
    await batch.commit();
    console.log(`🎉 Successfully created ${createdCards.length} SRS cards`);
  }
  
  return createdCards;
}

/**
 * Get all cards due for review (JIT query)
 * 
 * @param {string} userId - User ID
 * @param {Date} asOf - Check for cards due as of this date (defaults to today)
 * @returns {Promise<Array>} Due cards
 */
export async function getDueCards(userId, asOf = new Date()) {
  const today = asOf.toISOString().split('T')[0];
  
  console.log(`🔍 Fetching due cards for ${userId} as of ${today}`);
  
  const cardsQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('nextReviewDate', '<=', today),
    orderBy('nextReviewDate', 'asc')
  );
  
  const snapshot = await getDocs(cardsQuery);
  const dueCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`📊 Found ${dueCards.length} cards due for review`);
  
  return dueCards;
}

/**
 * Get specific card by ID
 * 
 * @param {string} cardId - Card ID
 * @returns {Promise<Object|null>} Card or null
 */
export async function getCard(cardId) {
  const cardRef = doc(db, COLLECTIONS.CARDS, cardId);
  const cardSnap = await getDoc(cardRef);
  
  if (!cardSnap.exists()) {
    return null;
  }
  
  return { id: cardSnap.id, ...cardSnap.data() };
}

/**
 * Submit a review attempt (CORE SRS FUNCTION)
 * 
 * This is where the magic happens:
 * 1. Records the attempt
 * 2. Updates card state based on result
 * 3. Calculates ONLY the next single review date
 * 
 * @param {string} cardId - Card ID
 * @param {boolean} wasCorrect - Did user answer correctly?
 * @param {Object} attemptData - Additional attempt data
 * @returns {Promise<Object>} Updated card and attempt record
 */
export async function submitReview(cardId, wasCorrect, attemptData = {}) {
  console.log(`📝 Processing review: ${cardId}, correct: ${wasCorrect}`);
  
  // 1. Get current card state
  const card = await getCard(cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }
  
  // 2. Create attempt record (for audit trail)
  const attemptId = `attempt_${cardId}_${Date.now()}`;
  const attempt = {
    id: attemptId,
    cardId,
    userId: card.userId,
    questionId: card.questionId,
    
    // Attempt details
    attemptNumber: (card.currentAttemptNumber || 0) + 1,
    wasCorrect,
    userAnswer: attemptData.userAnswer || null,
    correctAnswer: attemptData.correctAnswer || null,
    
    // Timing
    timeSpent: attemptData.timeSpent || null,
    attemptedAt: new Date().toISOString(),
    
    // State before attempt (audit)
    stateBefore: {
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetitionCount: card.repetitionCount,
      status: card.status
    },
    
    // Review session
    reviewSessionId: attemptData.reviewSessionId || null,
    
    // Audit
    createdAt: new Date().toISOString()
  };
  
  // 3. Calculate new card state
  const updatedCard = updateCardAfterReview(card, wasCorrect);
  
  // Add state after to attempt record
  attempt.stateAfter = {
    interval: updatedCard.interval,
    easeFactor: updatedCard.easeFactor,
    repetitionCount: updatedCard.repetitionCount,
    status: updatedCard.status
  };
  
  // 4. Save both records in a batch
  const batch = writeBatch(db);
  
  // Save attempt
  batch.set(doc(db, COLLECTIONS.ATTEMPTS, attemptId), attempt);
  
  // Update card
  batch.set(doc(db, COLLECTIONS.CARDS, cardId), updatedCard);
  
  await batch.commit();
  
  console.log(`✅ Review processed successfully:`, {
    cardId,
    wasCorrect,
    nextReview: updatedCard.nextReviewDate,
    newInterval: updatedCard.interval,
    newStatus: updatedCard.status
  });
  
  // 5. Archive if graduated
  if (shouldArchiveCard(updatedCard)) {
    console.log(`🎓 Card graduated! Archiving: ${cardId}`);
    await archiveCard(cardId);
  }
  
  return {
    card: updatedCard,
    attempt
  };
}

/**
 * Submit multiple reviews in one session
 * 
 * @param {string} userId - User ID
 * @param {Array} reviews - Array of {cardId, wasCorrect, userAnswer}
 * @param {string} sessionType - Session type identifier
 * @returns {Promise<Object>} Session summary
 */
export async function submitReviewSession(userId, reviews, sessionType = 'spaced_repetition') {
  const sessionId = `review_session_${Date.now()}`;
  const startTime = new Date();
  
  console.log(`🎯 Starting review session: ${sessionId} with ${reviews.length} cards`);
  
  let cardsCorrect = 0;
  let cardsFailed = 0;
  const results = [];
  
  // Process each review
  for (const review of reviews) {
    try {
      const result = await submitReview(review.cardId, review.wasCorrect, {
        userAnswer: review.userAnswer,
        correctAnswer: review.correctAnswer,
        timeSpent: review.timeSpent,
        reviewSessionId: sessionId
      });
      
      results.push(result);
      
      if (review.wasCorrect) {
        cardsCorrect++;
      } else {
        cardsFailed++;
      }
    } catch (error) {
      console.error(`❌ Error processing review for card ${review.cardId}:`, error);
      cardsFailed++;
    }
  }
  
  const endTime = new Date();
  const totalTimeSpent = Math.floor((endTime - startTime) / 1000);
  
  // Create session record
  const session = {
    id: sessionId,
    userId,
    
    // Stats
    cardsReviewed: reviews.length,
    cardsCorrect,
    cardsFailed,
    totalTimeSpent,
    
    // Metadata
    sessionType,
    startedAt: startTime.toISOString(),
    completedAt: endTime.toISOString(),
    
    // Audit
    createdAt: new Date().toISOString()
  };
  
  // Save session
  await setDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), session);
  
  console.log(`✅ Review session completed:`, session);
  
  return {
    session,
    results
  };
}

/**
 * Archive a graduated card
 * 
 * @param {string} cardId - Card ID
 */
async function archiveCard(cardId) {
  const cardRef = doc(db, COLLECTIONS.CARDS, cardId);
  await updateDoc(cardRef, {
    isActive: false,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

/**
 * Get review statistics for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics
 */
export async function getReviewStats(userId) {
  // Get all cards
  const cardsQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId)
  );
  
  const cardsSnapshot = await getDocs(cardsQuery);
  const cards = cardsSnapshot.docs.map(doc => doc.data());
  
  const stats = {
    total: cards.length,
    active: cards.filter(c => c.isActive).length,
    archived: cards.filter(c => !c.isActive).length,
    
    // By status
    new: cards.filter(c => c.status === SRS_CONFIG.STATUS.NEW).length,
    learning: cards.filter(c => c.status === SRS_CONFIG.STATUS.LEARNING).length,
    review: cards.filter(c => c.status === SRS_CONFIG.STATUS.REVIEW).length,
    graduated: cards.filter(c => c.status === SRS_CONFIG.STATUS.GRADUATED).length,
    
    // Due today
    dueToday: cards.filter(c => c.isActive && c.isDue).length,
    
    // Performance
    totalAttempts: cards.reduce((sum, c) => sum + (c.totalAttempts || 0), 0),
    successRate: calculateSuccessRate(cards)
  };
  
  return stats;
}

function calculateSuccessRate(cards) {
  const totalAttempts = cards.reduce((sum, c) => sum + (c.totalAttempts || 0), 0);
  const successfulAttempts = cards.reduce((sum, c) => sum + (c.successfulAttempts || 0), 0);
  
  if (totalAttempts === 0) return 0;
  return Math.round((successfulAttempts / totalAttempts) * 100);
}

/**
 * Update isDue flags for all cards (run daily)
 * 
 * @param {string} userId - User ID
 */
export async function updateDueFlags(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const cardsQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(cardsQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(docSnap => {
    const card = docSnap.data();
    const isDue = isCardDue(card.nextReviewDate, new Date(today));
    
    if (card.isDue !== isDue) {
      batch.update(docSnap.ref, { isDue });
    }
  });
  
  await batch.commit();
}

export const srsService = {
  createCardsFromMistakes,
  getDueCards,
  getCard,
  submitReview,
  submitReviewSession,
  getReviewStats,
  updateDueFlags
};

export default srsService;