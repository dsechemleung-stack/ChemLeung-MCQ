import React, { useState } from 'react';
import { X, Play, Eye, CheckSquare, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SpacedRepetitionModal({ 
  repetition, 
  allRepetitions = [], 
  questions = [],
  onClose, 
  onStartReview 
}) {
  const [reviewMode, setReviewMode] = useState('single');
  const [selectedQuestions, setSelectedQuestions] = useState(new Set([repetition.questionId]));
  
  const currentQuestion = questions.find(q => q.ID === repetition.questionId);
  const availableReviews = allRepetitions.filter(r => !r.completed);
  
  const toggleQuestion = (questionId) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };
  
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
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="border-b p-6 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Spaced Repetition Review</h2>
            <p className="text-sm text-slate-500 mt-1">Choose your review mode</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
              Review Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReviewMode('single')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === 'single' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Eye className={reviewMode === 'single' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className="font-bold">Single Question</span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  Review just this specific mistake
                </div>
              </button>

              <button
                onClick={() => setReviewMode('batch')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === 'batch' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <CheckSquare className={reviewMode === 'batch' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className="font-bold">Batch Review</span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  Review multiple questions together
                </div>
              </button>
            </div>
          </div>

          {reviewMode === 'single' && currentQuestion && (
            <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-2">Question Preview</h3>
              <div className="text-sm text-purple-800 mb-2">
                <strong>Topic:</strong> {currentQuestion.Topic} → {currentQuestion.Subtopic}
              </div>
              <div 
                className="text-sm text-slate-700 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: currentQuestion.Question }}
              />
              <div className="mt-3 text-xs text-purple-600">
                📅 Interval: Day {repetition.interval}
              </div>
            </div>
          )}

          {reviewMode === 'batch' && (
            <div>
              <h3 className="font-bold text-slate-800 mb-3">
                Select Questions ({selectedQuestions.size} selected)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableReviews.map((rep) => {
                  const question = questions.find(q => q.ID === rep.questionId);
                  if (!question) return null;
                  
                  const isSelected = selectedQuestions.has(rep.questionId);
                  
                  return (
                    <button
                      key={rep.id}
                      onClick={() => toggleQuestion(rep.questionId)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className="mt-1" />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-600 mb-1">
                            {question.Topic} → {question.Subtopic}
                          </div>
                          <div 
                            className="text-sm text-slate-800 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: question.Question }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => onStartReview(reviewMode, Array.from(selectedQuestions))}
            disabled={reviewMode === 'batch' && selectedQuestions.size === 0}
            className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={20} fill="currentColor" />
            Start Review ({reviewMode === 'single' ? '1' : selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''})
          </button>
        </div>
      </motion.div>
    </div>
  );
}