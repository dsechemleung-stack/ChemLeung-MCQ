import { performanceService } from './performanceService';
import { calendarService } from './calendarService';

/**
 * Quiz Completion Service
 * Handles all post-quiz processing: performance tracking and spaced repetition
 */
export const quizCompletionService = {
  
  /**
   * Process quiz completion - records performance and schedules reviews
   */
  async processQuizCompletion(userId, questions, answers) {
    if (!userId || !questions || !answers) {
      console.error('❌ Missing required data for quiz completion processing');
      return {
        performanceRecorded: false,
        repetitionsScheduled: 0,
        errors: ['Missing required data']
      };
    }

    const results = {
      performanceRecorded: false,
      repetitionsScheduled: 0,
      errors: []
    };

    // STEP 1: Record Performance (for AI recommendations)
    try {
      console.log('📊 Recording performance data...');
      await performanceService.recordQuizResults(userId, questions, answers);
      results.performanceRecorded = true;
      console.log('✅ Performance data recorded successfully');
    } catch (error) {
      console.error('❌ Error recording performance:', error);
      results.errors.push(`Performance recording failed: ${error.message}`);
    }

    // STEP 2: Schedule Spaced Repetition for Mistakes
    try {
      console.log('📅 Scheduling spaced repetition for mistakes...');
      
      const mistakes = questions.filter(q => {
        const userAnswer = answers[q.ID];
        return userAnswer && userAnswer !== q.CorrectOption;
      });

      console.log(`Found ${mistakes.length} mistake(s) to schedule`);

      if (mistakes.length === 0) {
        console.log('🎉 No mistakes - perfect score!');
        return results;
      }

      const improvements = JSON.parse(
        localStorage.getItem('mistake_improvements') || '{}'
      );

      let scheduledCount = 0;
      const batchSize = 5;
      
      for (let i = 0; i < mistakes.length; i += batchSize) {
        const batch = mistakes.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (mistake) => {
            try {
              const improvementCount = improvements[mistake.ID]?.correctCount || 0;
              
              if (improvementCount < 3) {
                // Schedule ALL future reviews at once
                const scheduled = await calendarService.scheduleSpacedRepetition(userId, {
                  questionId: mistake.ID,
                  topic: mistake.Topic,
                  subtopic: mistake.Subtopic,
                  attemptCount: improvementCount + 1 // Current attempt number
                });
                
                if (scheduled && scheduled.length > 0) {
                  scheduledCount += scheduled.length;
                }
              } else {
                console.log(`⏭️ Skipping ${mistake.ID} - already mastered`);
              }
            } catch (error) {
              console.error(`❌ Failed to schedule ${mistake.ID}:`, error);
              results.errors.push(`Question ${mistake.ID}: ${error.message}`);
            }
          })
        );
        
        if (i + batchSize < mistakes.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      results.repetitionsScheduled = scheduledCount;
      console.log(`✅ Successfully scheduled ${scheduledCount} spaced repetition review(s)`);

    } catch (error) {
      console.error('❌ Error in spaced repetition scheduling:', error);
      results.errors.push(`Spaced repetition failed: ${error.message}`);
    }

    return results;
  },

  async refreshAIRecommendations(userId) {
    try {
      console.log('🔄 Forcing AI recommendation refresh...');
      await performanceService.generateAIRecommendations(userId);
      console.log('✅ AI recommendations refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error refreshing AI recommendations:', error);
      return false;
    }
  }
};