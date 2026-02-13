import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Flag, Calendar as CalendarIcon, BookOpen, Brain, CheckCircle, Trash2, X, Sparkles, ThumbsUp, ThumbsDown, Play, Info, Target, Clock, Eye } from 'lucide-react';
import { calendarService, EVENT_TYPES } from '../../services/calendarService';
import { performanceService } from '../../services/performanceService';
import { quizStorage } from '../../utils/quizStorage';
import { motion, AnimatePresence } from 'framer-motion';
import SpacedRepetitionModal from './SpacedRepetitionModal';

/**
 * SmartMonthlyCalendar - COMPLETE FIX VERSION
 * 
 * FIXES:
 * 1. ✅ Batch review now properly loads ALL repetitions for the selected date
 *    - Fixed line 291: Use repetition.date directly instead of parsing
 * 2. ✅ Better error handling for event deletion with detailed messages
 * 3. ✅ Enhanced console logging for debugging
 */
export default function SmartMonthlyCalendar({ userId, questions = [], onAddEvent }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [aiRecommendations, setAIRecommendations] = useState([]);
  const [suggestionPreview, setSuggestionPreview] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Load calendar data and AI recommendations
  useEffect(() => {
    loadCalendarData();
    loadAIRecommendations();
  }, [userId, year, month]);

  async function loadCalendarData() {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await calendarService.getCalendarData(userId, year, month);
      console.log('📅 Calendar data loaded:', data);
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAIRecommendations() {
    if (!userId) return;
    
    try {
      const recommendations = await performanceService.getRecommendations(userId);
      console.log('🤖 AI Recommendations loaded:', recommendations);
      setAIRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
    }
  }

  // Helper function to format time
  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const grid = [];
    let week = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }
    
    // Add remaining days to complete the last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }
    
    return grid;
  }, [year, month]);

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().split('T')[0];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function getDateString(day) {
    if (!day) return null;
    return new Date(year, month, day).toISOString().split('T')[0];
  }

  function getDayEvents(day) {
    const dateStr = getDateString(day);
    if (!dateStr) return null;
    return calendarData[dateStr] || null;
  }

  function isToday(day) {
    return getDateString(day) === today;
  }

  function isPast(day) {
    if (!day) return false;
    return getDateString(day) < today;
  }

  // Get available questions for a suggestion
  function getAvailableQuestions(suggestion) {
    if (!questions || questions.length === 0) {
      return { filtered: [], count: 0 };
    }

    let filtered = [...questions];
    
    if (suggestion.topic) {
      filtered = filtered.filter(q => q.Topic === suggestion.topic);
    }
    
    if (suggestion.subtopic) {
      filtered = filtered.filter(q => q.Subtopic === suggestion.subtopic);
    }
    
    return {
      filtered: filtered.slice(0, suggestion.questionCount),
      count: filtered.length,
      requested: suggestion.questionCount
    };
  }

  // Preview suggestion details
  function handleSuggestionPreview(suggestion, event) {
    event?.stopPropagation();
    const questionInfo = getAvailableQuestions(suggestion);
    setSuggestionPreview({ ...suggestion, questionInfo });
  }

  /**
   * Accept an AI recommendation and add it to the calendar
   * @param {Object} recommendation - The AI recommendation to accept
   * @param {Event} event - The click event
   */
  async function handleAcceptRecommendation(recommendation, event) {
    event?.stopPropagation();
    
    try {
      console.log('✅ Accepting AI recommendation:', recommendation);
      
      // Use the service method to create calendar event
      await calendarService.createAIRecommendationEvent(userId, recommendation);
      
      // Reload calendar and recommendations
      await loadCalendarData();
      await loadAIRecommendations();
      
      alert('✅ AI recommendation added to your calendar!');
    } catch (error) {
      console.error('❌ Error accepting recommendation:', error);
      alert('Failed to add recommendation to calendar:\n\n' + error.message);
    }
  }

  async function handleDismissRecommendation(recommendationId, event) {
    event?.stopPropagation();
    
    try {
      await performanceService.dismissRecommendation(userId, recommendationId);
      await loadAIRecommendations();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  }

  async function handleAIRecommendationClick(aiRec) {
    try {
      let filteredQuestions = questions;
      
      if (aiRec.topic) {
        filteredQuestions = filteredQuestions.filter(q => q.Topic === aiRec.topic);
      }
      
      if (aiRec.subtopic) {
        filteredQuestions = filteredQuestions.filter(q => q.Subtopic === aiRec.subtopic);
      }

      const selectedQuestions = filteredQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(aiRec.questionCount, filteredQuestions.length));

      if (selectedQuestions.length === 0) {
        alert(`No questions available for ${aiRec.topic || 'this topic'}${aiRec.subtopic ? ' - ' + aiRec.subtopic : ''}.`);
        return;
      }

      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(selectedQuestions);
      localStorage.setItem('quiz_mode', 'ai-recommendation');
      localStorage.setItem('quiz_event_id', aiRec.id);
      localStorage.setItem('quiz_timer_enabled', 'true');
      navigate('/quiz');
    } catch (error) {
      console.error('Error starting AI recommendation session:', error);
      alert('Failed to start study session. Please try again.');
    }
  }

  async function handleStudySuggestionClick(suggestion) {
    try {
      // Check if questions are loaded
      if (!questions || questions.length === 0) {
        alert('Questions are still loading. Please wait a moment and try again.');
        return;
      }

      // Filter questions by topic/subtopic if specified
      let filteredQuestions = [...questions];
      
      if (suggestion.topic) {
        filteredQuestions = filteredQuestions.filter(q => q.Topic === suggestion.topic);
      }
      
      if (suggestion.subtopic) {
        filteredQuestions = filteredQuestions.filter(q => q.Subtopic === suggestion.subtopic);
      }

      if (filteredQuestions.length === 0) {
        alert(
          `No questions available for ${suggestion.topic || 'all topics'}${
            suggestion.subtopic ? ' - ' + suggestion.subtopic : ''
          }.\n\nPlease check that your question database includes this topic.`
        );
        return;
      }

      // Select random questions up to the suggested count
      const selectedQuestions = filteredQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(suggestion.questionCount, filteredQuestions.length));

      // Save to quiz storage and navigate
      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(selectedQuestions);
      localStorage.setItem('quiz_mode', 'study-plan');
      localStorage.setItem('quiz_event_id', suggestion.id);
      localStorage.setItem('quiz_event_phase', suggestion.phase || '');
      localStorage.setItem('quiz_timer_enabled', 'true');
      navigate('/quiz');
    } catch (error) {
      console.error('Error starting study session:', error);
      alert('Failed to start study session. Please try again.');
    }
  }

  /**
   * 🔧 KEY FIX: Spaced repetition click handler
   * 
   * OLD (BROKEN) LINE 291:
   * const dateStr = getDateString(parseInt(repetition.date?.split('-')[2]) || new Date().getDate());
   * ❌ This was trying to parse just the day (e.g., "14") and then reconstruct the date
   * ❌ This caused it to look at the wrong date in calendarData
   * 
   * NEW (FIXED):
   * const dateStr = repetition.date;
   * ✅ Use the full date string directly from the repetition (e.g., "2026-02-14")
   * ✅ This matches the keys in calendarData correctly
   */
  function handleSpacedRepetitionClick(repetition, event) {
    event?.stopPropagation();
    
    // 🎯 FIX: Use the date directly from repetition
    const dateStr = repetition.date; // e.g., "2026-02-14"
    
    // Get ALL repetitions for this date
    const allRepsForDay = calendarData[dateStr]?.repetitions || [];
    
    console.log('🔍 Opening review modal:', {
      clickedRep: repetition,
      dateStr,
      totalRepsForDay: allRepsForDay.length,
      allReps: allRepsForDay.map(r => ({ 
        id: r.id, 
        questionId: r.questionId, 
        completed: r.completed,
        topic: r.topic,
        subtopic: r.subtopic
      }))
    });
    
    // Ensure we have the questions array
    if (!questions || questions.length === 0) {
      alert('Questions are still loading. Please wait a moment and try again.');
      return;
    }
    
    // Verify we have repetitions to show
    if (allRepsForDay.length === 0) {
      console.warn('⚠️ No repetitions found for date:', dateStr);
      alert('No review sessions found for this day. This might be a data issue.');
      return;
    }
    
    console.log(`✅ Found ${allRepsForDay.length} repetition(s) for ${dateStr}`);
    
    setReviewModal({
      repetition,
      allRepetitions: allRepsForDay,  // 🎯 Pass ALL repetitions
      dateStr
    });
  }

  /**
   * Handle starting review from modal
   */
  async function handleStartReview(reviewMode, questionIds) {
    try {
      console.log('🎯 Starting review:', { reviewMode, questionIds });
      
      const reviewQuestions = questions.filter(q => questionIds.includes(q.ID));
      
      if (reviewQuestions.length === 0) {
        alert('Questions not found in database.');
        return;
      }

      console.log(`✅ Found ${reviewQuestions.length} questions for review`);

      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(reviewQuestions);
      localStorage.setItem('quiz_mode', 'spaced-repetition');
      localStorage.setItem('quiz_review_mode', reviewMode);
      localStorage.setItem('quiz_event_ids', JSON.stringify(
        reviewModal.allRepetitions
          .filter(r => questionIds.includes(r.questionId))
          .map(r => r.id)
      ));
      localStorage.setItem('quiz_timer_enabled', 'true');
      setReviewModal(null);
      navigate('/quiz');
    } catch (error) {
      console.error('Error starting review:', error);
      alert('Failed to start review. Please try again.');
    }
  }

  /**
   * 🔧 IMPROVED: Delete event with better error handling
   */
  async function handleDeleteEvent(eventId, eventType, event) {
    event.stopPropagation();
    
    const eventTypeLabel = eventType === EVENT_TYPES.MAJOR_EXAM ? 'Major Exam' : 
                          eventType === EVENT_TYPES.SMALL_QUIZ ? 'Small Quiz' : 'Event';
    
    if (!window.confirm(`Delete this ${eventTypeLabel}? This will also remove all linked study suggestions and reviews.`)) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting event:', eventId);
      await calendarService.deleteEvent(eventId, true); // true = cascade delete
      console.log('✅ Event deleted successfully');
      await loadCalendarData();
      setSelectedDate(null);
      alert('Event deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      
      // More detailed error message
      let errorMsg = 'Failed to delete event. ';
      if (error.message.includes('permission')) {
        errorMsg += 'Please check that you have permission to delete this event.';
      } else if (error.message.includes('not found')) {
        errorMsg += 'Event not found. It may have already been deleted.';
      } else {
        errorMsg += error.message;
      }
      
      alert(errorMsg);
    }
  }

  // Render day cell content
  function renderDayCell(day) {
    if (!day) return null;
    
    const dateStr = getDateString(day);
    const events = getDayEvents(day);
    const isSelectedDate = selectedDate === dateStr;
    const isHovered = hoveredDate === dateStr;
    const isTodayDate = isToday(day);
    const isPastDate = isPast(day);
    
    const hasExam = events?.exams?.length > 0;
    const hasQuiz = events?.quizzes?.length > 0;
    const hasSuggestions = events?.suggestions?.length > 0;
    const hasRepetitions = events?.repetitions?.length > 0;
    const hasCompletions = events?.completions?.length > 0;
    const hasAIRecommendations = events?.aiRecommendations?.length > 0;
    
    const totalEvents = (events?.exams?.length || 0) + 
                       (events?.quizzes?.length || 0) + 
                       (events?.suggestions?.length || 0) + 
                       (events?.repetitions?.length || 0) +
                       (events?.aiRecommendations?.length || 0);

    return (
      <div className="flex flex-col h-full p-1">
        {/* Day number */}
        <div className={`text-sm font-bold mb-1 ${
          isTodayDate ? 'text-blue-600' : isPastDate ? 'text-slate-400' : 'text-slate-700'
        }`}>
          {day}
        </div>
        
        {/* Event markers */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
          {/* Major Exam */}
          {hasExam && events.exams.map((exam, idx) => (
            <div
              key={`exam-${idx}`}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors cursor-pointer group relative"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(dateStr);
              }}
            >
              <Flag size={10} className="flex-shrink-0" />
              <span className="truncate flex-1">{exam.title}</span>
              {!exam.completed && (
                <button
                  onClick={(e) => handleDeleteEvent(exam.id, EVENT_TYPES.MAJOR_EXAM, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          
          {/* Small Quiz */}
          {hasQuiz && events.quizzes.map((quiz, idx) => (
            <div
              key={`quiz-${idx}`}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-colors cursor-pointer group relative"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(dateStr);
              }}
            >
              <BookOpen size={10} className="flex-shrink-0" />
              <span className="truncate flex-1">{quiz.title}</span>
              {!quiz.completed && (
                <button
                  onClick={(e) => handleDeleteEvent(quiz.id, EVENT_TYPES.SMALL_QUIZ, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          
          {/* Study Suggestions */}
          {hasSuggestions && events.suggestions.slice(0, 2).map((suggestion, idx) => (
            <button
              key={`suggestion-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSuggestionPreview(suggestion, e);
              }}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors group"
            >
              <CalendarIcon size={10} className="flex-shrink-0" />
              <span className="truncate flex-1">{suggestion.questionCount} MCQs</span>
              {suggestion.completed && <CheckCircle size={10} className="text-blue-600" />}
            </button>
          ))}
          
          {/* UPDATED: Spaced Repetition */}
          {hasRepetitions && events.repetitions.slice(0, 1).map((rep, idx) => (
            <button
              key={`rep-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSpacedRepetitionClick(rep, e);
              }}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition-colors"
            >
              <Brain size={10} className="flex-shrink-0" />
              <span className="truncate flex-1">Review</span>
              {rep.completed && <CheckCircle size={10} className="text-purple-600" />}
            </button>
          ))}

          {/* AI Recommendations */}
          {hasAIRecommendations && events.aiRecommendations.slice(0, 1).map((aiRec, idx) => (
            <button
              key={`ai-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAIRecommendationClick(aiRec);
              }}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-semibold hover:from-purple-200 hover:to-pink-200 transition-colors border border-purple-300"
            >
              <Sparkles size={10} className="flex-shrink-0" />
              <span className="truncate flex-1">AI: {aiRec.questionCount} MCQs</span>
              {aiRec.completed && <CheckCircle size={10} className="text-purple-600" />}
            </button>
          ))}
          
          {/* Overflow indicator */}
          {totalEvents > 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(dateStr);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-1"
            >
              +{totalEvents - 3} more
            </button>
          )}
          
          {/* Completion dots */}
          {hasCompletions && events.completions.length <= 3 && (
            <div className="flex gap-0.5 mt-auto">
              {events.completions.slice(0, 3).map((comp, idx) => (
                <div
                  key={`comp-${idx}`}
                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                  title={`Completed: ${comp.questionCount} questions`}
                />
              ))}
            </div>
          )}
          {hasCompletions && events.completions.length > 3 && (
            <div className="text-xs text-green-600 font-bold px-1">
              ✓ {events.completions.length}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <CalendarIcon className="text-blue-600" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Smart Study Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">{monthName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
          <button
            onClick={onAddEvent}
            className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add Event
          </button>
        </div>
      </div>

      {/* AI Recommendations Panel */}
      {aiRecommendations.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-600" size={24} />
            <h4 className="text-lg font-black text-purple-900">AI Study Recommendations</h4>
            <span className="ml-auto text-xs font-bold text-purple-600 bg-white px-2 py-1 rounded-full">
              {aiRecommendations.length} suggestions
            </span>
          </div>
          
          <div className="space-y-2">
            {aiRecommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-lg p-3 border border-purple-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        rec.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="font-bold text-sm text-slate-800">
                        {rec.subtopic}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{rec.reason}</p>
                    <div className="flex gap-2 mt-2 text-xs text-slate-500">
                      <span>📅 Suggested: {new Date(rec.suggestedDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>📊 Current: {rec.currentAccuracy}%</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-3">
                    <button
                      onClick={(e) => handleAcceptRecommendation(rec, e)}
                      className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all"
                      title="Add to calendar"
                    >
                      <ThumbsUp size={16} className="text-purple-600" />
                    </button>
                    <button
                      onClick={(e) => handleDismissRecommendation(rec.id, e)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                      title="Dismiss"
                    >
                      <ThumbsDown size={16} className="text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {aiRecommendations.length > 3 && (
            <div className="text-center mt-3">
              <button
                className="text-sm font-bold text-purple-600 hover:text-purple-700"
                onClick={() => {/* Show all recommendations modal */}}
              >
                View all {aiRecommendations.length} recommendations →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Flag size={12} className="text-red-600" />
          <span className="text-slate-600 font-semibold">Major Exam</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen size={12} className="text-amber-600" />
          <span className="text-slate-600 font-semibold">Quiz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarIcon size={12} className="text-blue-600" />
          <span className="text-slate-600 font-semibold">Study Plan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain size={12} className="text-purple-600" />
          <span className="text-slate-600 font-semibold">Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-purple-600" />
          <span className="text-slate-600 font-semibold">AI Suggestion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-600 font-semibold">Completed</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b-2 border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-black text-slate-600 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar body */}
        {calendarGrid.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-200 last:border-b-0">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                onMouseEnter={() => day && setHoveredDate(getDateString(day))}
                onMouseLeave={() => setHoveredDate(null)}
                onClick={() => day && setSelectedDate(getDateString(day))}
                className={`min-h-[100px] border-r border-slate-200 last:border-r-0 transition-all cursor-pointer ${
                  day ? 'hover:bg-slate-50' : 'bg-slate-50/30'
                } ${
                  isToday(day) ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''
                } ${
                  isPast(day) ? 'opacity-60' : ''
                }`}
              >
                {renderDayCell(day)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Suggestion Preview Modal */}
      <AnimatePresence>
        {suggestionPreview && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSuggestionPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">Study Session Preview</h3>
                <button
                  onClick={() => setSuggestionPreview(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Session Info */}
                <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2">{suggestionPreview.title}</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={16} />
                      <span>Phase: <strong>{suggestionPreview.phase}</strong></span>
                    </div>
                    {suggestionPreview.topic && (
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} />
                        <span>
                          <strong>{suggestionPreview.topic}</strong>
                          {suggestionPreview.subtopic && ` → ${suggestionPreview.subtopic}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Questions Available */}
                <div className={`p-4 rounded-lg border-2 ${
                  suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={18} className={
                      suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                        ? 'text-green-600'
                        : 'text-amber-600'
                    } />
                    <span className={`font-bold ${
                      suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                        ? 'text-green-900'
                        : 'text-amber-900'
                    }`}>
                      Questions Available
                    </span>
                  </div>
                  <p className={`text-sm ${
                    suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                      ? 'text-green-800'
                      : 'text-amber-800'
                  }`}>
                    <strong>{suggestionPreview.questionInfo.count}</strong> questions found
                    {suggestionPreview.questionInfo.count < suggestionPreview.questionInfo.requested && (
                      <span> (requested: {suggestionPreview.questionInfo.requested})</span>
                    )}
                  </p>
                  
                  {suggestionPreview.questionInfo.count === 0 && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ No questions available for this topic/subtopic combination.
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    handleStudySuggestionClick(suggestionPreview);
                    setSuggestionPreview(null);
                  }}
                  disabled={suggestionPreview.questionInfo.count === 0}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={18} fill="currentColor" />
                  Start Practice ({Math.min(suggestionPreview.questionInfo.count, suggestionPreview.questionInfo.requested)} Questions)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {calendarData[selectedDate] ? (
                  <>
                    {/* UPDATED: Exams with event type delete */}
                    {calendarData[selectedDate].exams?.map((exam) => (
                      <div key={exam.id} className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Flag className="text-red-600" size={20} />
                            <span className="font-bold text-red-900">{exam.title}</span>
                          </div>
                          {!exam.completed && (
                            <button
                              onClick={(e) => handleDeleteEvent(exam.id, EVENT_TYPES.MAJOR_EXAM, e)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-all"
                              title="Delete exam and study plan"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          )}
                        </div>
                        {exam.topic && (
                          <div className="text-sm text-red-700">
                            📚 Topic: {exam.topic}
                            {exam.subtopic && ` → ${exam.subtopic}`}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* UPDATED: Quizzes with event type delete */}
                    {calendarData[selectedDate].quizzes?.map((quiz) => (
                      <div key={quiz.id} className="p-4 rounded-lg bg-amber-50 border-2 border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="text-amber-600" size={20} />
                            <span className="font-bold text-amber-900">{quiz.title}</span>
                          </div>
                          {!quiz.completed && (
                            <button
                              onClick={(e) => handleDeleteEvent(quiz.id, EVENT_TYPES.SMALL_QUIZ, e)}
                              className="p-2 hover:bg-amber-100 rounded-lg transition-all"
                              title="Delete quiz and study plan"
                            >
                              <Trash2 size={16} className="text-amber-600" />
                            </button>
                          )}
                        </div>
                        {quiz.topic && (
                          <div className="text-sm text-amber-700">
                            📚 Topic: {quiz.topic}
                            {quiz.subtopic && ` → ${quiz.subtopic}`}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Study Suggestions */}
                    {calendarData[selectedDate].suggestions?.map((suggestion) => {
                      const questionInfo = getAvailableQuestions(suggestion);
                      return (
                        <div
                          key={suggestion.id}
                          className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarIcon className="text-blue-600" size={20} />
                            <span className="font-bold text-blue-900">{suggestion.title}</span>
                            {suggestion.completed && <CheckCircle size={16} className="text-blue-600 ml-auto" />}
                          </div>
                          <div className="text-sm text-blue-700 mb-3 space-y-1">
                            <div>📝 {suggestion.questionCount} questions • Phase: {suggestion.phase}</div>
                            {suggestion.topic && (
                              <div>📚 {suggestion.topic}{suggestion.subtopic && ` → ${suggestion.subtopic}`}</div>
                            )}
                            <div className={questionInfo.count >= questionInfo.requested ? 'text-green-600' : 'text-amber-600'}>
                              ✓ {questionInfo.count} questions available
                            </div>
                          </div>
                          {!suggestion.completed && (
                            <button
                              onClick={() => {
                                handleStudySuggestionClick(suggestion);
                                setSelectedDate(null);
                              }}
                              disabled={questionInfo.count === 0}
                              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play size={16} fill="currentColor" />
                              Start Practice
                            </button>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* UPDATED: Spaced Repetitions */}
                    {calendarData[selectedDate].repetitions?.map((rep) => (
                      <button
                        key={rep.id}
                        onClick={(e) => {
                          handleSpacedRepetitionClick(rep, e);
                          setSelectedDate(null);
                        }}
                        className="w-full p-4 rounded-lg bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="text-purple-600" size={20} />
                          <span className="font-bold text-purple-900">{rep.title}</span>
                          {rep.completed && <CheckCircle size={16} className="text-purple-600 ml-auto" />}
                        </div>
                        <div className="text-sm text-purple-700">
                          Review interval: {rep.interval} days • Attempt #{rep.attemptCount}
                        </div>
                      </button>
                    ))}

                    {/* AI Recommendations */}
                    {calendarData[selectedDate].aiRecommendations?.map((aiRec) => (
                      <div
                        key={aiRec.id}
                        className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="text-purple-600" size={20} />
                          <span className="font-bold text-purple-900">{aiRec.title}</span>
                        </div>
                        <div className="text-sm text-purple-700 mb-3">
                          {aiRec.description}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleAIRecommendationClick(aiRec);
                              setSelectedDate(null);
                            }}
                            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Play size={16} fill="currentColor" />
                            Start Practice
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* UPDATED: Completion Events with Link to Results */}
                    {calendarData[selectedDate].completions?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-700 text-sm mb-2">
                          📊 Completed Sessions ({calendarData[selectedDate].completions.length})
                        </h4>
                        
                        {calendarData[selectedDate].completions.map((comp, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-green-50 border-2 border-green-200 hover:border-green-400 transition-all"
                          >
                            {/* Header with Score */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="text-green-600" size={20} />
                                <span className="font-bold text-green-900">
                                  {comp.title || `Session ${idx + 1}`}
                                </span>
                              </div>
                              <div className={`px-3 py-1 rounded-lg font-black text-lg ${
                                comp.percentage >= 70 ? 'bg-green-600 text-white' :
                                comp.percentage >= 50 ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              }`}>
                                {comp.percentage}%
                              </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1 text-sm text-green-700 mb-3">
                              <div className="flex items-center gap-2">
                                <Target size={14} />
                                <span>
                                  <strong>{comp.correctAnswers}/{comp.totalQuestions}</strong> correct
                                  {comp.timeSpent && (
                                    <> • <Clock size={12} className="inline" /> {formatTime(comp.timeSpent)}</>
                                  )}
                                </span>
                              </div>
                              
                              {/* Topics covered */}
                              {comp.topics && comp.topics.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <BookOpen size={14} className="mt-0.5" />
                                  <div className="flex-1">
                                    <div className="flex flex-wrap gap-1">
                                      {comp.topics.map((topic, i) => (
                                        <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                    {comp.subtopics && comp.subtopics.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {comp.subtopics.map((subtopic, i) => (
                                          <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                            {subtopic}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Completion time */}
                              <div className="flex items-center gap-2 text-xs text-green-600">
                                <Calendar size={12} />
                                <span>
                                  Completed: {new Date(comp.completedAt).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Action Button - View Results */}
                            {comp.attemptId && (
                              <button
                                onClick={() => {
                                  // Navigate to results page for this specific attempt
                                  navigate(`/history?attempt=${comp.attemptId}`);
                                }}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <Eye size={16} />
                                View Full Results
                              </button>
                            )}
                            
                            {/* If no attemptId, just show info */}
                            {!comp.attemptId && (
                              <div className="text-xs text-green-600 text-center italic">
                                Results not available for this session
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No events scheduled for this day
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW: Spaced Repetition Review Modal */}
      {reviewModal && (
        <SpacedRepetitionModal
          repetition={reviewModal.repetition}
          allRepetitions={reviewModal.allRepetitions}
          questions={questions}
          onClose={() => setReviewModal(null)}
          onStartReview={handleStartReview}
        />
      )}
    </div>
  );
}