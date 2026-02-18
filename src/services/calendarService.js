/**
 * Calendar Service - FIXED FOR COMPLETIONS
 * 
 * KEY FIX: Now properly reads and returns completion events!
 */

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { performanceService } from './performanceService';
import { getNow } from '../utils/timeTravel';
import { formatHKDateKey } from '../utils/hkTime';

export const EVENT_TYPES = {
  MAJOR_EXAM: 'major_exam',
  SMALL_QUIZ: 'small_quiz',
  STUDY_SUGGESTION: 'study_suggestion',
  SPACED_REPETITION: 'spaced_repetition',
  AI_RECOMMENDATION: 'ai_recommendation',
  COMPLETION: 'completion'  // ✅ ADDED!
};

// ... (keeping all existing functions: addMajorExam, addSmallQuiz, etc.)

/**
 * 🔧 FIXED: Get calendar data for a specific month
 * 
 * NOW INCLUDES COMPLETIONS! 🎉
 */
export async function getCalendarData(userId, year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log('📅 Loading calendar for:', { userId, year, month, startDateStr, endDateStr });

  // Query events for this user and date range
  const eventsQuery = query(
    collection(db, 'calendar_events'),
    where('userId', '==', userId),
    where('date', '>=', startDateStr),
    where('date', '<=', endDateStr)
  );

  const eventsSnapshot = await getDocs(eventsQuery);
  
  console.log('📊 Found', eventsSnapshot.size, 'events');

  // Organize by date
  const calendarData = {};

  eventsSnapshot.forEach(doc => {
    const event = { id: doc.id, ...doc.data() };
    
    if (!calendarData[event.date]) {
      calendarData[event.date] = {
        exams: [],
        quizzes: [],
        suggestions: [],
        repetitions: [],
        aiRecommendations: [],
        completions: []  // ✅ ADDED!
      };
    }

    // Sort events by type
    if (event.type === EVENT_TYPES.MAJOR_EXAM) {
      calendarData[event.date].exams.push(event);
    } else if (event.type === EVENT_TYPES.SMALL_QUIZ) {
      calendarData[event.date].quizzes.push(event);
    } else if (event.type === EVENT_TYPES.STUDY_SUGGESTION) {
      calendarData[event.date].suggestions.push(event);
    } else if (event.type === EVENT_TYPES.SPACED_REPETITION) {
      calendarData[event.date].repetitions.push(event);
    } else if (event.type === EVENT_TYPES.AI_RECOMMENDATION) {
      calendarData[event.date].aiRecommendations.push(event);
    } else if (event.type === EVENT_TYPES.COMPLETION) {  // ✅ ADDED!
      calendarData[event.date].completions.push(event);
    }
  });

  console.log('✅ Calendar data organized:', Object.keys(calendarData).length, 'days with events');

  return calendarData;
}

/**
 * Add a major exam to the calendar
 */
export async function addMajorExam(userId, examData) {
  const { date, title, topics, subtopics } = examData;
  
  const examEvent = {
    id: `exam_${Date.now()}`,
    userId,
    type: EVENT_TYPES.MAJOR_EXAM,
    date,
    title,
    topics,
    subtopics,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('📝 Creating exam event:', examEvent);

  await setDoc(
    doc(db, 'calendar_events', examEvent.id),
    examEvent
  );

  // Generate study plan (10-day)
  const studyPlan = generateMajorExamPlan(examEvent);
  
  // Save study suggestions
  for (const suggestion of studyPlan) {
    await setDoc(
      doc(db, 'calendar_events', suggestion.id),
      suggestion
    );
  }

  console.log('✅ Created exam + study plan:', { exam: examEvent.id, suggestions: studyPlan.length });

  return { examEvent, studyPlan };
}

/**
 * Add a small quiz to the calendar
 */
export async function addSmallQuiz(userId, quizData) {
  const { date, title, topics, subtopics } = quizData;
  
  const quizEvent = {
    id: `quiz_${Date.now()}`,
    userId,
    type: EVENT_TYPES.SMALL_QUIZ,
    date,
    title,
    topics,
    subtopics,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('📝 Creating quiz event:', quizEvent);

  await setDoc(
    doc(db, 'calendar_events', quizEvent.id),
    quizEvent
  );

  // Generate study plan (3-day)
  const studyPlan = generateSmallQuizPlan(quizEvent);
  
  // Save study suggestions
  for (const suggestion of studyPlan) {
    await setDoc(
      doc(db, 'calendar_events', suggestion.id),
      suggestion
    );
  }

  console.log('✅ Created quiz + study plan:', { quiz: quizEvent.id, suggestions: studyPlan.length });

  return { quizEvent, studyPlan };
}

/**
 * Generate major exam study plan (10 days before)
 */
function generateMajorExamPlan(examEvent) {
  const examDate = new Date(examEvent.date);
  const suggestions = [];
  
  const schedule = [
    { days: [10, 9, 8, 7], count: 10, phase: 'Warm-up' },
    { days: [6, 5, 4], count: 20, phase: 'Consolidation' },
    { days: [3, 2, 1], count: 40, phase: 'Sprint' }
  ];
  
  schedule.forEach(({ days, count, phase }) => {
    days.forEach(daysBefore => {
      const suggestionDate = new Date(examDate);
      suggestionDate.setDate(suggestionDate.getDate() - daysBefore);
      
      suggestions.push({
        id: `suggestion_${examEvent.id}_day${daysBefore}`,
        userId: examEvent.userId,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        parentEventId: examEvent.id,
        linkedEventId: examEvent.id,
        date: suggestionDate.toISOString().split('T')[0],
        title: `${phase} - ${count} MCQs`,
        description: `Day ${daysBefore} before exam`,
        questionCount: count,
        phase,
        topics: examEvent.topics,
        subtopics: examEvent.subtopics,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  });
  
  return suggestions;
}

/**
 * Generate small quiz study plan (3 days before)
 */
function generateSmallQuizPlan(quizEvent) {
  const quizDate = new Date(quizEvent.date);
  const suggestions = [];
  
  const schedule = [
    { day: 3, count: 5, phase: 'Initial Review' },
    { day: 2, count: 10, phase: 'Topic Focus' },
    { day: 1, count: 15, phase: 'Final Polish' }
  ];
  
  schedule.forEach(({ day, count, phase }) => {
    const suggestionDate = new Date(quizDate);
    suggestionDate.setDate(suggestionDate.getDate() - day);
    
    suggestions.push({
      id: `suggestion_${quizEvent.id}_day${day}`,
      userId: quizEvent.userId,
      type: EVENT_TYPES.STUDY_SUGGESTION,
      parentEventId: quizEvent.id,
      linkedEventId: quizEvent.id,
      date: suggestionDate.toISOString().split('T')[0],
      title: `${phase} - ${count} MCQs`,
      description: `Day ${day} before quiz`,
      questionCount: count,
      phase,
      topics: quizEvent.topics,
      subtopics: quizEvent.subtopics,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
  
  return suggestions;
}

/**
 * Create AI recommendation as calendar event
 */
export async function createAIRecommendationEvent(userId, recommendation) {
  const aiEvent = {
    id: `ai_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: EVENT_TYPES.AI_RECOMMENDATION,
    date: recommendation.suggestedDate,
    title: `AI: ${recommendation.subtopic}`,
    description: recommendation.reason,
    topic: recommendation.topic,
    subtopic: recommendation.subtopic,
    questionCount: recommendation.questionCount,
    priority: recommendation.priority,
    currentAccuracy: recommendation.currentAccuracy,
    sourceRecommendationId: recommendation.id,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('🤖 Creating AI recommendation event:', aiEvent);

  await setDoc(
    doc(db, 'calendar_events', aiEvent.id),
    aiEvent
  );

  await performanceService.acceptRecommendation(userId, recommendation.id);

  console.log('✅ AI recommendation added to calendar');

  return aiEvent;
}

/**
 * Mark an event as completed
 */
export async function markEventCompleted(eventId, completionData = {}) {
  try {
    const eventRef = doc(db, 'calendar_events', eventId);
    
    await updateDoc(eventRef, {
      completed: true,
      completedAt: new Date().toISOString(),
      completionData,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Event marked as completed:', eventId);
  } catch (error) {
    console.error('❌ Error marking event as completed:', error);
    throw error;
  }
}

/**
 * Delete an event and its children
 */
export async function deleteEvent(eventId, cascadeDelete = true) {
  try {
    console.log('🗑️ Deleting event:', eventId, '(cascade:', cascadeDelete, ')');

    const eventRef = doc(db, 'calendar_events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();
    
    await deleteDoc(eventRef);
    console.log('✅ Deleted main event:', eventId);

    if (cascadeDelete) {
      const childrenQuery = query(
        collection(db, 'calendar_events'),
        where('userId', '==', eventData.userId),
        where('linkedEventId', '==', eventId)
      );
      
      const childrenSnapshot = await getDocs(childrenQuery);
      
      console.log('🔍 Found', childrenSnapshot.size, 'child events to delete');
      
      const batch = writeBatch(db);
      childrenSnapshot.forEach((childDoc) => {
        batch.delete(childDoc.ref);
      });
      
      if (childrenSnapshot.size > 0) {
        await batch.commit();
        console.log('✅ Deleted', childrenSnapshot.size, 'child events');
      }
    }

    console.log('✅ Event deletion complete');
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    throw error;
  }
}

/**
 * Schedule spaced repetition events based on SRS system
 * 
 * @param {string} userId - User ID
 * @param {Object} params - Scheduling parameters
 * @returns {Promise<Object>} Scheduling results
 */
export async function scheduleSpacedRepetition(userId, params) {
  try {
    console.log('🧠 Scheduling SRS events for user:', userId);
    
    // Import SRS service dynamically to avoid circular dependencies
    const { srsService } = await import('./srsService');
    
    // Schedule only cards due exactly today (avoid scheduling a large overdue backlog)
    const todayStr = formatHKDateKey(getNow());
    const dueCards = await srsService.getCardsDueOnDate(userId, todayStr);
    
    if (dueCards.length === 0) {
      console.log('✅ No due SRS cards found');
      return { scheduled: 0, events: [], message: 'No due cards found' };
    }

    console.log(`📊 Found ${dueCards.length} SRS cards due today (${todayStr})`);

    // Create calendar events for due cards
    const events = [];

    const batch = writeBatch(db);
    for (const card of dueCards) {
      // Deterministic ID to prevent duplicates for the same card+date
      const eventId = `srs_${card.id}_${card.nextReviewDate}`;

      const calendarEvent = {
        id: eventId,
        userId,
        type: EVENT_TYPES.SPACED_REPETITION,
        date: card.nextReviewDate,
        title: `SRS Review: ${card.subtopic || card.topic}`,
        description: `Spaced repetition review (Interval: ${card.interval} days)`,
        topic: card.topic,
        subtopic: card.subtopic,
        questionId: card.questionId,
        srsCardId: card.id,
        difficulty: card.difficulty ?? null,
        interval: card.interval,
        easeFactor: card.easeFactor,
        reviewCount: card.repetitionCount ?? 0,
        priority: getPriorityFromDifficulty(card.difficulty ?? null),
        completed: false,
        createdAt: getNow().toISOString(),
        updatedAt: getNow().toISOString()
      };

      // Save to user's calendar subcollection (matches optimized calendar reader)
      batch.set(doc(db, 'users', userId, 'calendar_events', eventId), calendarEvent, { merge: true });
      events.push(calendarEvent);
    }

    await batch.commit();
    
    console.log(`✅ Created ${events.length} SRS calendar events`);
    
    return {
      scheduled: events.length,
      events,
      message: `Scheduled ${events.length} SRS reviews`
    };
    
  } catch (error) {
    console.error('❌ Error scheduling SRS events:', error);
    throw error;
  }
}

/**
 * Get priority level based on SRS difficulty
 */
function getPriorityFromDifficulty(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'hard': return 'high';
    case 'medium': return 'medium';
    case 'easy': return 'low';
    default: return 'medium';
  }
}

export const calendarService = {
  addMajorExam,
  addSmallQuiz,
  createAIRecommendationEvent,
  markEventCompleted,
  deleteEvent,
  getCalendarData,
  scheduleSpacedRepetition
};

export default calendarService;