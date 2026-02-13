/**
 * Calendar Service - FIXED FOR FLAT FIRESTORE STRUCTURE
 * 
 * CRITICAL FIXES:
 * 1. ✅ Uses /calendar_events/{eventId} instead of /calendar/{userId}/events/{eventId}
 * 2. ✅ Properly stores userId as a field
 * 3. ✅ Fixed AI recommendation to calendar conversion
 * 4. ✅ Fixed spaced repetition visibility
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
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { performanceService } from './performanceService';

export const EVENT_TYPES = {
  MAJOR_EXAM: 'major_exam',
  SMALL_QUIZ: 'small_quiz',
  STUDY_SUGGESTION: 'study_suggestion',
  SPACED_REPETITION: 'spaced_repetition',
  AI_RECOMMENDATION: 'ai_recommendation'
};

/**
 * Add a major exam to the calendar
 */
export async function addMajorExam(userId, examData) {
  const { date, title, topics, subtopics } = examData;
  
  const examEvent = {
    id: `exam_${Date.now()}`,
    userId,  // CRITICAL: Add userId as field
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

  // Save main event to flat collection
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
    userId,  // CRITICAL: Add userId as field
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

  // Save main event
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
  
  // 10-day plan with scaled intensity
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
        userId: examEvent.userId,  // CRITICAL: Include userId
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
      userId: quizEvent.userId,  // CRITICAL: Include userId
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
 * 🔧 NEW: Create AI recommendation as calendar event
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

  // Mark recommendation as accepted
  await performanceService.acceptRecommendation(userId, recommendation.id);

  console.log('✅ AI recommendation added to calendar');

  return aiEvent;
}

/**
 * 🔧 NEW: Create spaced repetition event
 */
export async function createSpacedRepetitionEvent(userId, mistakeData) {
  const { questionId, topic, subtopic, interval, attemptCount } = mistakeData;
  
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + interval);
  
  const repEvent = {
    id: `rep_${questionId}_${Date.now()}`,
    userId,
    type: EVENT_TYPES.SPACED_REPETITION,
    date: reviewDate.toISOString().split('T')[0],
    title: 'Review Mistake',
    description: `${topic} → ${subtopic}`,
    topic,
    subtopic,
    questionId,
    interval,
    attemptCount: attemptCount || 0,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('🧠 Creating spaced repetition event:', repEvent);

  await setDoc(
    doc(db, 'calendar_events', repEvent.id),
    repEvent
  );

  return repEvent;
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

    // Get the event first to check userId
    const eventRef = doc(db, 'calendar_events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();
    
    // Delete main event
    await deleteDoc(eventRef);
    console.log('✅ Deleted main event:', eventId);

    // Delete child events if cascade
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
 * Get calendar data for a specific month
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
        aiRecommendations: []
      };
    }

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
    }
  });

  console.log('✅ Calendar data organized:', Object.keys(calendarData).length, 'days with events');

  return calendarData;
}

/**
 * 🔧 NEW: Log quiz completion with performance tracking
 */
export async function logCompletion(userId, dateStr, sessionData, questions = [], answers = {}) {
  try {
    console.log('📝 Logging completion:', { userId, date: dateStr, sessionData });

    // First, record performance if questions and answers provided
    if (questions.length > 0 && Object.keys(answers).length > 0) {
      console.log('📊 Recording performance data...');
      await performanceService.recordQuizResults(userId, questions, answers);
    }

    // Note: We're not creating completion events in calendar_events
    // Completions are tracked by marking existing events as completed
    
    console.log('✅ Completion logged successfully');
  } catch (error) {
    console.error('❌ Error logging completion:', error);
    throw error;
  }
}

export const calendarService = {
  addMajorExam,
  addSmallQuiz,
  createAIRecommendationEvent,
  createSpacedRepetitionEvent,
  markEventCompleted,
  deleteEvent,
  getCalendarData,
  logCompletion
};

export default calendarService;