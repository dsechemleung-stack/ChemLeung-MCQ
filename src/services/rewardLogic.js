// ============================================================================
// REWARD LOGIC - Token Awards with Anti-Cheat
// ============================================================================

import { awardTokens, canClaimReward, recordRewardClaim, recordRewardClaimsBatch } from './tokenService';

// ────────────────────────────────────────────────────────────────────────────
// REWARD TIERS
// ────────────────────────────────────────────────────────────────────────────

const REWARDS = {
  // Per-question rewards
  FIRST_CORRECT: 2,
  CORRECTED_MISTAKE: 1,

  // Quiz completion bonus (only if totalQuestions >= 10)
  QUIZ_BONUS_100: 20,
  QUIZ_BONUS_80: 15,
  QUIZ_BONUS_50: 10,

  // Streak Bonuses
  STREAK_WEEK: 15,      // 7-day streak
  STREAK_MONTH: 50,     // 30-day streak

  // Special Events
  FIRST_QUIZ: 20,       // First quiz completion
  FORUM_POST: 2,        // Per helpful post (manual approval)
};

// ────────────────────────────────────────────────────────────────────────────
// MCQ COMPLETION REWARDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award tokens for MCQ quiz completion
 */
export async function rewardMCQCompletion(userId, attemptData) {
  try {
    const { percentage, totalQuestions, correctAnswers, topics, attemptId } = attemptData;

    let tokensAwarded = 0;
    let rewardTier = '';

    // Quiz completion bonus only applies if quiz has 10+ questions
    if (totalQuestions >= 10) {
      if (percentage === 100) {
        tokensAwarded = REWARDS.QUIZ_BONUS_100;
        rewardTier = '100% Bonus';
      } else if (percentage >= 80) {
        tokensAwarded = REWARDS.QUIZ_BONUS_80;
        rewardTier = '80% Bonus';
      } else if (percentage >= 50) {
        tokensAwarded = REWARDS.QUIZ_BONUS_50;
        rewardTier = '50% Bonus';
      } else {
        tokensAwarded = 0;
        rewardTier = 'No Bonus';
      }
    } else {
      tokensAwarded = 0;
      rewardTier = 'No Bonus (min 10 questions)';
    }

    const reason = `MCQ Completed (${percentage}%) - ${rewardTier}`;
    
    if (tokensAwarded > 0) {
      await awardTokens(userId, tokensAwarded, reason, {
        category: 'quiz_bonus',
        percentage,
        totalQuestions,
        correctAnswers,
        topics,
        attemptId
      });
    }

    return {
      success: true,
      tokensAwarded,
      message: tokensAwarded > 0 ? `+${tokensAwarded} tokens! ${rewardTier}` : `No token bonus (${rewardTier})`
    };
  } catch (error) {
    console.error('Error rewarding MCQ completion:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MISTAKE NOTEBOOK REWARDS (with Anti-Cheat)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reward clearing a mistake (once per question per 24h)
 */
export async function rewardMistakeCleared(userId, questionId) {
  try {
    const rewardKey = `mistake_${questionId}`;
    
    // Anti-cheat: Check cooldown
    const { canClaim, hoursRemaining } = await canClaimReward(userId, rewardKey);
    
    if (!canClaim) {
      return {
        success: false,
        message: `You can claim this reward again in ${hoursRemaining}h`,
        tokensAwarded: 0
      };
    }

    // This reward is now handled by per-question corrected-mistake logic.
    return {
      success: false,
      tokensAwarded: 0
    };
  } catch (error) {
    console.error('Error rewarding mistake cleared:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// LEADERBOARD REWARDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award tokens for leaderboard placement
 */
export async function rewardLeaderboardPlacement(userId, rank, period = 'weekly') {
  try {
    let tokensAwarded = 0;
    const weekly = Math.max(0, 11 - Number(rank || 0));
    if (period === 'weekly') {
      tokensAwarded = weekly;
    } else if (period === 'monthly') {
      tokensAwarded = weekly * 3;
    }

    if (tokensAwarded === 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const reason = `Leaderboard Reward: ${period} #${rank}`;

    await awardTokens(userId, tokensAwarded, reason, {
      category: 'leaderboard',
      rank,
      period
    });

    return {
      success: true,
      tokensAwarded,
      message: `+${tokensAwarded} tokens!`
    };
  } catch (error) {
    console.error('Error rewarding leaderboard placement:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PER-QUESTION REWARDS (First-correct + corrected mistakes)
// ────────────────────────────────────────────────────────────────────────────

export async function rewardQuizQuestionTokens(userId, questions = [], answers = {}, quizMode = 'practice') {
  try {
    if (!userId || !Array.isArray(questions) || questions.length === 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const isMistakeLikeMode = ['mistakes', 'spaced-repetition'].includes(quizMode);

    const firstCorrectRewardKeys = [];
    const correctedRewardKeys = [];

    const checks = await Promise.all(
      questions.map(async (q) => {
        const qid = q?.ID;
        if (!qid) return null;
        const wasCorrect = answers[qid] && answers[qid] === q.CorrectOption;
        if (!wasCorrect) return null;

        const firstKey = `first_correct_${qid}`;
        const correctedKey = `corrected_${qid}`;

        const [first, corrected] = await Promise.all([
          canClaimReward(userId, firstKey),
          isMistakeLikeMode ? canClaimReward(userId, correctedKey) : Promise.resolve({ canClaim: false })
        ]);

        return { qid, firstKey, correctedKey, canFirst: !!first?.canClaim, canCorrected: !!corrected?.canClaim };
      })
    );

    checks.filter(Boolean).forEach((c) => {
      if (c.canFirst) firstCorrectRewardKeys.push(c.firstKey);
      if (c.canCorrected) correctedRewardKeys.push(c.correctedKey);
    });

    const firstCount = firstCorrectRewardKeys.length;
    const correctedCount = correctedRewardKeys.length;
    const tokensAwarded = (firstCount * REWARDS.FIRST_CORRECT) + (correctedCount * REWARDS.CORRECTED_MISTAKE);

    if (tokensAwarded <= 0) {
      return { success: true, tokensAwarded: 0 };
    }

    const reason = `MCQ Rewards: ${firstCount} first-correct, ${correctedCount} corrected`;
    await awardTokens(userId, tokensAwarded, reason, {
      category: 'mcq_per_question',
      quizMode,
      firstCorrectCount: firstCount,
      correctedCount
    });

    // first-correct should never be claimable again; corrected has 24h cooldown
    await recordRewardClaimsBatch(userId, firstCorrectRewardKeys, 99999);
    await recordRewardClaimsBatch(userId, correctedRewardKeys, 24);

    return { success: true, tokensAwarded };
  } catch (error) {
    console.error('Error rewarding per-question tokens:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// STREAK REWARDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award tokens for study streaks
 */
export async function rewardStreak(userId, streakDays) {
  try {
    let tokensAwarded = 0;
    let milestone = '';

    if (streakDays === 7) {
      tokensAwarded = REWARDS.STREAK_WEEK;
      milestone = '7-Day Streak! 🔥';
    } else if (streakDays === 30) {
      tokensAwarded = REWARDS.STREAK_MONTH;
      milestone = '30-Day Streak! 🔥🔥🔥';
    } else if (streakDays % 7 === 0 && streakDays > 7) {
      // Bonus for every week after first
      tokensAwarded = Math.floor(REWARDS.STREAK_WEEK * 1.5);
      milestone = `${streakDays}-Day Streak! 🔥`;
    }

    if (tokensAwarded === 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const rewardKey = `streak_${streakDays}`;
    
    // Check if already claimed
    const { canClaim } = await canClaimReward(userId, rewardKey);
    if (!canClaim) {
      return { success: false, message: 'Streak reward already claimed' };
    }

    const reason = `Study Streak: ${milestone}`;

    await awardTokens(userId, tokensAwarded, reason, {
      category: 'streak',
      streakDays
    });

    // Record to prevent duplicate claims
    await recordRewardClaim(userId, rewardKey, 720); // 30 days

    return {
      success: true,
      tokensAwarded,
      message: `${milestone} - +${tokensAwarded} tokens!`
    };
  } catch (error) {
    console.error('Error rewarding streak:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SPECIAL MILESTONE REWARDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award first-time achievement bonuses
 */
export async function rewardFirstTimeAchievement(userId, achievementType) {
  try {
    const rewardKey = `first_${achievementType}`;
    
    const { canClaim } = await canClaimReward(userId, rewardKey);
    if (!canClaim) {
      return { success: false, message: 'Achievement already unlocked' };
    }

    let tokensAwarded = 0;
    let message = '';

    switch (achievementType) {
      case 'quiz':
        tokensAwarded = REWARDS.FIRST_QUIZ;
        message = 'First Quiz Completed! 🎉';
        break;
      case 'forum_post':
        tokensAwarded = REWARDS.FORUM_POST;
        message = 'Forum Contributor! 💬';
        break;
      default:
        return { success: false };
    }

    const reason = `First Time: ${message}`;

    await awardTokens(userId, tokensAwarded, reason, {
      category: 'first_time',
      achievementType
    });

    await recordRewardClaim(userId, rewardKey, 99999); // Never reset

    return {
      success: true,
      tokensAwarded,
      message: `${message} - +${tokensAwarded} tokens!`
    };
  } catch (error) {
    console.error('Error rewarding first-time achievement:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export const REWARD_AMOUNTS = REWARDS;

export default {
  rewardMCQCompletion,
  rewardMistakeCleared,
  rewardLeaderboardPlacement,
  rewardStreak,
  rewardFirstTimeAchievement,
  REWARDS
};