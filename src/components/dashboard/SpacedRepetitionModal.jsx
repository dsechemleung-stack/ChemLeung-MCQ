import React, { useState, useMemo } from 'react';
import { X, Play, Eye, CheckSquare, Filter, Tag, Layers, ArrowRight, Timer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * SpacedRepetitionModal - COMPLETE ENHANCED VERSION
 * 
 * FEATURES:
 * ✅ Default: "5-Mistake Review" - AI selects 5 random questions
 * ✅ Question number selector (1 to all available)
 * ✅ Auto-select all topics → auto-select all subtopics → auto-select all questions
 * ✅ Timer and timed mode options for all review modes
 * ✅ Improved side-by-side topic/subtopic layout
 * ✅ Single question review option
 * ✅ Custom batch review with full filtering
 */
export default function SpacedRepetitionModal({ 
  repetition, 
  allRepetitions = [], 
  questions = [],
  onClose, 
  onStartReview 
}) {
  // Review modes: '5-mistake' (default), 'single', 'batch'
  const [reviewMode, setReviewMode] = useState('5-mistake');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTopicFilters, setSelectedTopicFilters] = useState([]);
  const [selectedSubtopicFilters, setSelectedSubtopicFilters] = useState([]);
  const [enableTimer, setEnableTimer] = useState(true);
  const [timedMode, setTimedMode] = useState(true);
  
  const currentQuestion = questions.find(q => q.ID === repetition.questionId);
  
  // Get all non-completed reviews
  const availableReviews = useMemo(() => {
    return allRepetitions.filter(r => !r.completed);
  }, [allRepetitions]);

  // Get unique topics
  const availableTopics = useMemo(() => {
    const topics = new Set();
    availableReviews.forEach(rep => {
      const question = questions.find(q => q.ID === rep.questionId);
      if (question?.Topic) topics.add(question.Topic);
    });
    return Array.from(topics).sort();
  }, [availableReviews, questions]);

  // Get subtopics based on selected topics
  const availableSubtopics = useMemo(() => {
    const subtopics = new Set();
    availableReviews.forEach(rep => {
      const question = questions.find(q => q.ID === rep.questionId);
      if (question?.Subtopic) {
        if (selectedTopicFilters.length === 0 || selectedTopicFilters.includes(question.Topic)) {
          subtopics.add(question.Subtopic);
        }
      }
    });
    return Array.from(subtopics).sort();
  }, [availableReviews, questions, selectedTopicFilters]);

  // Filtered reviews based on topic/subtopic selection
  const filteredReviews = useMemo(() => {
    return availableReviews.filter(rep => {
      const question = questions.find(q => q.ID === rep.questionId);
      if (!question) return false;
      if (selectedTopicFilters.length > 0 && !selectedTopicFilters.includes(question.Topic)) return false;
      if (selectedSubtopicFilters.length > 0 && !selectedSubtopicFilters.includes(question.Subtopic)) return false;
      return true;
    });
  }, [availableReviews, questions, selectedTopicFilters, selectedSubtopicFilters]);

  // Auto-select all topics in batch mode
  React.useEffect(() => {
    if (reviewMode === 'batch' && selectedTopicFilters.length === 0) {
      setSelectedTopicFilters(availableTopics);
    }
  }, [reviewMode, availableTopics]);

  // Auto-select all subtopics when topics change
  React.useEffect(() => {
    if (reviewMode === 'batch') {
      setSelectedSubtopicFilters(availableSubtopics);
    }
  }, [selectedTopicFilters, availableSubtopics, reviewMode]);

  // Adjust question count when filtered reviews change
  React.useEffect(() => {
    if (questionCount > filteredReviews.length) {
      setQuestionCount(filteredReviews.length);
    }
  }, [filteredReviews.length]);

  const toggleTopicFilter = (topic) => {
    setSelectedTopicFilters(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const toggleSubtopicFilter = (subtopic) => {
    setSelectedSubtopicFilters(prev => 
      prev.includes(subtopic) ? prev.filter(s => s !== subtopic) : [...prev, subtopic]
    );
  };

  const selectTopicsUpTo = (targetTopic) => {
    const targetIndex = availableTopics.indexOf(targetTopic);
    if (targetIndex === -1) return;
    setSelectedTopicFilters(availableTopics.slice(0, targetIndex + 1));
  };

  const selectSubtopicsUpTo = (targetSubtopic) => {
    const targetIndex = availableSubtopics.indexOf(targetSubtopic);
    if (targetIndex === -1) return;
    setSelectedSubtopicFilters(availableSubtopics.slice(0, targetIndex + 1));
  };

  // Get random N questions from filtered reviews
  const getRandomQuestions = (count) => {
    const shuffled = [...filteredReviews].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(r => r.questionId);
  };

  const handleStartReview = () => {
    let questionsToReview = [];
    
    if (reviewMode === '5-mistake') {
      questionsToReview = getRandomQuestions(questionCount);
    } else if (reviewMode === 'single') {
      questionsToReview = [repetition.questionId];
    } else { // batch
      questionsToReview = filteredReviews.slice(0, questionCount).map(r => r.questionId);
    }
    
    onStartReview(reviewMode, questionsToReview, {
      enableTimer,
      timedMode
    });
  };

  const effectiveQuestionCount = reviewMode === 'single' ? 1 : Math.min(questionCount, filteredReviews.length);

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Spaced Repetition Review</h2>
            <p className="text-sm text-slate-600 mt-1">
              {availableReviews.length} question{availableReviews.length !== 1 ? 's' : ''} need review
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Review Mode Selector */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
              Review Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Quick Review (5-Mistake Default) */}
              <button
                onClick={() => setReviewMode('5-mistake')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === '5-mistake' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={reviewMode === '5-mistake' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${reviewMode === '5-mistake' ? 'text-purple-900' : 'text-slate-600'}`}>
                    Quick Review
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  AI selects random questions
                </div>
                {reviewMode === '5-mistake' && (
                  <div className="mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-bold inline-block">
                    ✓ DEFAULT
                  </div>
                )}
              </button>

              {/* Single Question */}
              <button
                onClick={() => setReviewMode('single')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === 'single' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye className={reviewMode === 'single' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${reviewMode === 'single' ? 'text-purple-900' : 'text-slate-600'}`}>
                    Single Question
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">Review this specific mistake</div>
              </button>

              {/* Custom Batch */}
              <button
                onClick={() => setReviewMode('batch')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === 'batch' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className={reviewMode === 'batch' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${reviewMode === 'batch' ? 'text-purple-900' : 'text-slate-600'}`}>
                    Custom Batch
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">Filter by topics/subtopics</div>
              </button>
            </div>
          </div>

          {/* Question Count Selector (for 5-mistake and batch modes) */}
          {reviewMode !== 'single' && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
              <label className="block text-sm font-black text-purple-900 mb-3 flex items-center gap-2">
                <CheckSquare size={16} />
                Number of Questions
              </label>
              <div className="flex items-center gap-4 mb-3">
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, filteredReviews.length)}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, filteredReviews.length)}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, filteredReviews.length)))}
                    className="w-20 px-3 py-2 border-2 border-purple-300 rounded-lg font-bold text-center text-purple-900 bg-white"
                  />
                  <span className="text-sm text-purple-700 font-semibold whitespace-nowrap">
                    / {filteredReviews.length}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setQuestionCount(5)} 
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-all"
                >
                  5 Questions
                </button>
                <button 
                  onClick={() => setQuestionCount(10)} 
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-all"
                >
                  10 Questions
                </button>
                <button 
                  onClick={() => setQuestionCount(filteredReviews.length)} 
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-all"
                >
                  All ({filteredReviews.length})
                </button>
              </div>
            </div>
          )}

          {/* Timer Settings */}
          <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="text-blue-600" size={20} />
              <h3 className="font-black text-blue-900">Timer Settings</h3>
            </div>
            
            <div className="space-y-3">
              {/* Enable Timer */}
              <button
                onClick={() => setEnableTimer(!enableTimer)}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  enableTimer 
                    ? 'bg-blue-100 border-blue-500' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  enableTimer ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {enableTimer && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`font-bold flex-1 text-left ${enableTimer ? 'text-blue-900' : 'text-slate-600'}`}>
                  Enable Timer
                </span>
                {enableTimer && (
                  <span className="text-xs bg-white px-2 py-1 rounded font-bold text-blue-700">ON</span>
                )}
              </button>

              {/* Timed Mode */}
              <button
                onClick={() => setTimedMode(!timedMode)}
                disabled={!enableTimer}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  timedMode && enableTimer
                    ? 'bg-amber-100 border-amber-500' 
                    : 'bg-white border-slate-200'
                } ${!enableTimer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  timedMode && enableTimer ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                }`}>
                  {timedMode && enableTimer && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`font-bold flex-1 text-left ${timedMode && enableTimer ? 'text-amber-900' : 'text-slate-600'}`}>
                  Timed Mode (60s per question)
                </span>
                {timedMode && enableTimer && (
                  <span className="text-xs bg-white px-2 py-1 rounded font-bold text-amber-700">⏱️ ON</span>
                )}
              </button>

              <p className="text-xs text-blue-700 italic pl-8">
                💡 {timedMode && enableTimer 
                  ? 'You must answer within 60 seconds per question' 
                  : enableTimer 
                  ? 'Timer tracks your speed but no time limit' 
                  : 'No timer tracking'}
              </p>
            </div>
          </div>

          {/* Single Question Preview */}
          {reviewMode === 'single' && currentQuestion && (
            <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                <Eye size={18} />
                Question Preview
              </h3>
              <div className="text-sm text-purple-800 mb-2 flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                  {currentQuestion.Topic}
                </span>
                {currentQuestion.Subtopic && (
                  <>
                    <span className="text-purple-400">→</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      {currentQuestion.Subtopic}
                    </span>
                  </>
                )}
              </div>
              <div 
                className="text-sm text-slate-700 line-clamp-3 bg-white p-3 rounded-lg border border-purple-200"
                dangerouslySetInnerHTML={{ __html: currentQuestion.Question }}
              />
              <div className="mt-3 text-xs text-purple-600 flex items-center gap-4">
                <span>📅 Interval: Day {repetition.interval}</span>
                <span>🔄 Attempt #{repetition.attemptNumber || 1}</span>
              </div>
            </div>
          )}

          {/* Batch Review Filters */}
          {reviewMode === 'batch' && (
            <div className="bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} className="text-slate-600" />
                <h3 className="font-black text-slate-800">Filter Questions</h3>
                <span className="ml-auto text-xs bg-white px-3 py-1 rounded-full font-bold text-slate-600 border border-slate-200">
                  {filteredReviews.length} / {availableReviews.length} questions
                </span>
              </div>
              
              {/* Side-by-side Topics and Subtopics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Topics Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                      <Tag size={12} />
                      Topics ({selectedTopicFilters.length})
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedTopicFilters(availableTopics)}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedTopicFilters([])}
                        className="px-2 py-0.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded text-xs font-bold transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="border-2 border-slate-200 rounded-lg p-2 h-64 overflow-y-auto bg-white">
                    {availableTopics.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No topics available</p>
                    ) : (
                      <div className="space-y-1">
                        {availableTopics.map((topic) => (
                          <div key={topic} className="flex items-center gap-1">
                            <button
                              onClick={() => toggleTopicFilter(topic)}
                              className={`flex-1 px-2 py-1.5 rounded transition-all flex items-center gap-2 text-xs ${
                                selectedTopicFilters.includes(topic)
                                  ? 'bg-indigo-100 border border-indigo-500 text-indigo-900'
                                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedTopicFilters.includes(topic)
                                  ? 'border-indigo-600 bg-indigo-600'
                                  : 'border-slate-300'
                              }`}>
                                {selectedTopicFilters.includes(topic) && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="font-semibold truncate">{topic}</span>
                            </button>
                            <button
                              onClick={() => selectTopicsUpTo(topic)}
                              className="px-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-all flex-shrink-0"
                              title={`Select up to ${topic}`}
                            >
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtopics Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                      <Layers size={12} />
                      Subtopics ({selectedSubtopicFilters.length})
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedSubtopicFilters(availableSubtopics)}
                        disabled={availableSubtopics.length === 0}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition-all disabled:opacity-50"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedSubtopicFilters([])}
                        className="px-2 py-0.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded text-xs font-bold transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="border-2 border-slate-200 rounded-lg p-2 h-64 overflow-y-auto bg-white">
                    {availableSubtopics.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">
                        {selectedTopicFilters.length === 0 ? 'Select topics first' : 'No subtopics available'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {availableSubtopics.map((subtopic) => (
                          <div key={subtopic} className="flex items-center gap-1">
                            <button
                              onClick={() => toggleSubtopicFilter(subtopic)}
                              className={`flex-1 px-2 py-1.5 rounded transition-all flex items-center gap-2 text-xs ${
                                selectedSubtopicFilters.includes(subtopic)
                                  ? 'bg-purple-100 border border-purple-500 text-purple-900'
                                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedSubtopicFilters.includes(subtopic)
                                  ? 'border-purple-600 bg-purple-600'
                                  : 'border-slate-300'
                              }`}>
                                {selectedSubtopicFilters.includes(subtopic) && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="font-semibold truncate">{subtopic}</span>
                            </button>
                            <button
                              onClick={() => selectSubtopicsUpTo(subtopic)}
                              className="px-1.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded transition-all flex-shrink-0"
                              title={`Select up to ${subtopic}`}
                            >
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {filteredReviews.length === 0 && (
                <div className="mt-4 text-center py-6 bg-white rounded-lg border-2 border-dashed border-slate-300">
                  <Filter size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-semibold">No questions match your filters</p>
                  <button
                    onClick={() => {
                      setSelectedTopicFilters(availableTopics);
                      setSelectedSubtopicFilters(availableSubtopics);
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 text-sm transition-all"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Start Review Button */}
        <div className="border-t p-6 flex-shrink-0 bg-slate-50">
          <button
            onClick={handleStartReview}
            disabled={effectiveQuestionCount === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
          >
            <Play size={22} fill="currentColor" />
            {reviewMode === '5-mistake' 
              ? `Start Quick Review (${effectiveQuestionCount} ${effectiveQuestionCount === 1 ? 'Question' : 'Questions'})` 
              : reviewMode === 'single'
              ? 'Start Single Review'
              : `Start Batch Review (${effectiveQuestionCount} ${effectiveQuestionCount === 1 ? 'Question' : 'Questions'})`}
          </button>
          
          {/* Settings Summary */}
          <div className="text-center mt-3 text-xs text-slate-600 flex items-center justify-center gap-3 flex-wrap">
            {enableTimer && (
              <span className="flex items-center gap-1">
                <Timer size={12} />
                {timedMode ? 'Timed Mode: 60s/question' : 'Timer tracking enabled'}
              </span>
            )}
            {!enableTimer && <span className="text-slate-400">No timer</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}