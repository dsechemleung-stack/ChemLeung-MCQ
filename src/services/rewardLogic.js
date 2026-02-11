// ============================================================================
// REWARD LOGIC - Weekly & Monthly Rewards (Replaces Daily)
// ============================================================================

import { doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Reward amounts
const WEEKLY_REWARD = 100;
const MONTHLY_REWARD = 500;

/**
 * Check and award weekly reward if eligible
 */
export async function checkWeeklyReward(userId, userProfile) {
  try {
    const now = new Date();
    const weekStart = getWeekStart(now);
    
    const lastWeeklyReward = userProfile.lastWeeklyReward;
    
    // Check if user is eligible (hasn't claimed this week)
    if (!lastWeeklyReward || lastWeeklyReward.toDate() < weekStart) {
      // Award tokens
      await updateDoc(doc(db, 'users', userId), {
        tokens: increment(WEEKLY_REWARD),
        lastWeeklyReward: Timestamp.now()
      });
      
      return { 
        earned: true, 
        amount: WEEKLY_REWARD,
        message: `Weekly reward claimed! +${WEEKLY_REWARD} tokens`
      };
    }
    
    return { 
      earned: false,
      message: 'Weekly reward already claimed this week'
    };
  } catch (error) {
    console.error('Error checking weekly reward:', error);
    throw error;
  }
}

/**
 * Check and award monthly reward if eligible
 */
export async function checkMonthlyReward(userId, userProfile) {
  try {
    const now = new Date();
    const monthStart = getMonthStart(now);
    
    const lastMonthlyReward = userProfile.lastMonthlyReward;
    
    // Check if user is eligible (hasn't claimed this month)
    if (!lastMonthlyReward || lastMonthlyReward.toDate() < monthStart) {
      // Award tokens
      await updateDoc(doc(db, 'users', userId), {
        tokens: increment(MONTHLY_REWARD),
        lastMonthlyReward: Timestamp.now()
      });
      
      return { 
        earned: true, 
        amount: MONTHLY_REWARD,
        message: `Monthly reward claimed! +${MONTHLY_REWARD} tokens`
      };
    }
    
    return { 
      earned: false,
      message: 'Monthly reward already claimed this month'
    };
  } catch (error) {
    console.error('Error checking monthly reward:', error);
    throw error;
  }
}

/**
 * Get time remaining until next weekly reward
 */
export function getTimeUntilNextWeeklyReset() {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + (7 - now.getDay()));
  nextWeek.setHours(0, 0, 0, 0);
  
  const diff = nextWeek - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
}

/**
 * Get time remaining until next monthly reward
 */
export function getTimeUntilNextMonthlyReset() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const diff = nextMonth - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  return `${days}d`;
}

/**
 * Get start of current week (Sunday at 00:00)
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of current month
 */
function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Check if weekly reward is available
 */
export function isWeeklyRewardAvailable(userProfile) {
  if (!userProfile || !userProfile.lastWeeklyReward) return true;
  
  const weekStart = getWeekStart();
  return userProfile.lastWeeklyReward.toDate() < weekStart;
}

/**
 * Check if monthly reward is available
 */
export function isMonthlyRewardAvailable(userProfile) {
  if (!userProfile || !userProfile.lastMonthlyReward) return true;
  
  const monthStart = getMonthStart();
  return userProfile.lastMonthlyReward.toDate() < monthStart;
}

// ============================================================================
// LEGACY QUIZ REWARDS (Keep these for quiz completion rewards)
// ============================================================================

/**
 * Award tokens for quiz performance
 */
export async function awardQuizTokens(userId, score, totalQuestions) {
  const percentage = (score / totalQuestions) * 100;
  let tokens = 0;
  
  if (percentage === 100) {
    tokens = 50; // Perfect score
  } else if (percentage >= 80) {
    tokens = 30; // Excellent
  } else if (percentage >= 60) {
    tokens = 15; // Good
  } else if (percentage >= 40) {
    tokens = 5; // Pass
  }
  
  if (tokens > 0) {
    await updateDoc(doc(db, 'users', userId), {
      tokens: increment(tokens)
    });
  }
  
  return { tokens, percentage };
}

/**
 * Award tokens for clearing a mistake
 */
export async function awardMistakeClearTokens(userId) {
  const MISTAKE_CLEAR_TOKENS = 10;
  
  await updateDoc(doc(db, 'users', userId), {
    tokens: increment(MISTAKE_CLEAR_TOKENS)
  });
  
  return { tokens: MISTAKE_CLEAR_TOKENS };
}

/**
 * Award streak bonus tokens
 */
export async function awardStreakTokens(userId, streakDays) {
  let tokens = 0;
  
  if (streakDays === 7) tokens = 50;
  else if (streakDays === 14) tokens = 100;
  else if (streakDays === 30) tokens = 250;
  else if (streakDays === 60) tokens = 500;
  else if (streakDays === 100) tokens = 1000;
  
  if (tokens > 0) {
    await updateDoc(doc(db, 'users', userId), {
      tokens: increment(tokens)
    });
  }
  
  return { tokens, streakDays };
}