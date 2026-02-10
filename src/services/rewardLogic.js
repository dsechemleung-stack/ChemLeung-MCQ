// ============================================================================
// REWARD LOGIC - Token Awards with Anti-Cheat
// ============================================================================

import { awardTokens, canClaimReward, recordRewardClaim } from './tokenService';

// ────────────────────────────────────────────────────────────────────────────
// REWARD TIERS
// ────────────────────────────────────────────────────────────────────────────

const REWARDS = {
  // MCQ Completion Rewards (based on percentage)
  MCQ_PERFECT: 10,      // 100%
  MCQ_EXCELLENT: 5,     // 80-99%
  MCQ_GOOD: 2,          // 60-79%
  MCQ_COMPLETE: 1,      // < 60% (participation)

  // Mistake Book Rewards
  MISTAKE_CLEARED: 1,   // Per unique question (24h cooldown)

  // Leaderboard Rewards (Weekly)
  LEADERBOARD_GOLD_WEEKLY: 60,
  LEADERBOARD_SILVER_WEEKLY: 40,
  LEADERBOARD_BRONZE_WEEKLY: 20,

  // Leaderboard Rewards (Daily - via Weekly/7)
  LEADERBOARD_GOLD_DAILY: 10,
  LEADERBOARD_SILVER_DAILY: 6,
  LEADERBOARD_BRONZE_DAILY: 3,

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

    // Determine reward tier
    if (percentage === 100) {
      tokensAwarded = REWARDS.MCQ_PERFECT;
      rewardTier = 'Perfect Score! 🏆';
    } else if (percentage >= 80) {
      tokensAwarded = REWARDS.MCQ_EXCELLENT;
      rewardTier = 'Excellent! ⭐';
    } else if (percentage >= 60) {
      tokensAwarded = REWARDS.MCQ_GOOD;
      rewardTier = 'Good Work! 👍';
    } else {
      tokensAwarded = REWARDS.MCQ_COMPLETE;
      rewardTier = 'Keep Practicing! 💪';
    }

    // Bonus for completing many questions
    if (totalQuestions >= 40) {
      tokensAwarded += 3;
      rewardTier += ' +3 Marathon Bonus';
    } else if (totalQuestions >= 20) {
      tokensAwarded += 1;
      rewardTier += ' +1 Length Bonus';
    }

    const reason = `MCQ Completed (${percentage}%) - ${rewardTier}`;
    
    await awardTokens(userId, tokensAwarded, reason, {
      category: 'mcq_completion',
      percentage,
      totalQuestions,
      correctAnswers,
      topics,
      attemptId
    });

    return {
      success: true,
      tokensAwarded,
      message: `+${tokensAwarded} tokens! ${rewardTier}`
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

    // Award token
    const tokensAwarded = REWARDS.MISTAKE_CLEARED;
    const reason = `Mistake Cleared: Question ${questionId.substring(0, 8)}`;

    await awardTokens(userId, tokensAwarded, reason, {
      category: 'mistake_cleared',
      questionId
    });

    // Record cooldown
    await recordRewardClaim(userId, rewardKey, 24);

    return {
      success: true,
      tokensAwarded,
      message: `+${tokensAwarded} token for mastering this question!`
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
    let medal = '';

    if (period === 'weekly') {
      if (rank === 1) {
        tokensAwarded = REWARDS.LEADERBOARD_GOLD_WEEKLY;
        medal = '🥇 Weekly Gold';
      } else if (rank === 2) {
        tokensAwarded = REWARDS.LEADERBOARD_SILVER_WEEKLY;
        medal = '🥈 Weekly Silver';
      } else if (rank === 3) {
        tokensAwarded = REWARDS.LEADERBOARD_BRONZE_WEEKLY;
        medal = '🥉 Weekly Bronze';
      }
    } else if (period === 'daily') {
      if (rank === 1) {
        tokensAwarded = REWARDS.LEADERBOARD_GOLD_DAILY;
        medal = '🥇 Daily Gold';
      } else if (rank === 2) {
        tokensAwarded = REWARDS.LEADERBOARD_SILVER_DAILY;
        medal = '🥈 Daily Silver';
      } else if (rank === 3) {
        tokensAwarded = REWARDS.LEADERBOARD_BRONZE_DAILY;
        medal = '🥉 Daily Bronze';
      }
    }

    if (tokensAwarded === 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const reason = `Leaderboard Reward: ${medal}`;

    await awardTokens(userId, tokensAwarded, reason, {
      category: 'leaderboard',
      rank,
      period
    });

    return {
      success: true,
      tokensAwarded,
      message: `${medal} - +${tokensAwarded} tokens!`
    };
  } catch (error) {
    console.error('Error rewarding leaderboard placement:', error);
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