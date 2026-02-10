import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function QuestionCard({ question, selectedOption, onSelect }) {
  // If no question is passed, or if the question object is empty, show nothing.
  if (!question || !question.Question) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-slate-400 font-medium">Loading question content...</p>
      </div>
    );
  }

  // We use the keys defined in our useQuizData.js mapping
  const options = [
    { key: 'A', text: question.OptionA },
    { key: 'B', text: question.OptionB },
    { key: 'C', text: question.OptionC },
    { key: 'D', text: question.OptionD },
  ];

  // NEW: Toggle answer - if clicking the same answer again, deselect it
  const handleOptionClick = (optionKey) => {
    if (selectedOption === optionKey) {
      // Clicking the same answer again deselects it
      onSelect(null);
    } else {
      // Select the new answer
      onSelect(optionKey);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Info Bar */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-lab-blue uppercase tracking-tighter">
            {question.Topic || 'General Chemistry'}
          </span>
          <span className="text-xs text-slate-500 font-medium italic">
            {question.Subtopic}
          </span>
        </div>
        {question.DSEcode && (
          <span className="bg-blue-100 text-lab-blue px-2 py-1 rounded text-[10px] font-bold">
            {question.DSEcode}
          </span>
        )}
      </div>

      <div className="p-6 md:p-8">
        {/* Image Display Logic */}
        {question.Pictureurl && (
          <div className="mb-8 flex justify-center bg-white p-4 rounded-xl border border-slate-50 shadow-inner">
            <img 
              src={question.Pictureurl} 
              alt="Chemistry Diagram" 
              className="max-w-full h-auto max-h-[300px] object-contain rounded-md"
              onError={(e) => {
                console.warn("Image load failed for URL:", question.Pictureurl);
                e.target.parentElement.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Question Text - UPDATED with whitespace-pre-wrap for line breaks */}
        <div className="mb-8">
          <div 
            className="text-lg md:text-xl font-semibold leading-relaxed text-slate-800 prose prose-slate max-w-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: question.Question }}
          />
        </div>

        {/* MCQ Options Grid */}
        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleOptionClick(opt.key)}
              className={`group flex items-center text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedOption === opt.key
                  ? 'border-lab-blue bg-blue-50/50 ring-1 ring-lab-blue'
                  : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Option Letter Bubble */}
              <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg font-bold mr-4 transition-colors ${
                selectedOption === opt.key
                  ? 'bg-lab-blue text-white'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}>
                {opt.key}
              </div>

              {/* Option Text - UPDATED with whitespace-pre-wrap for line breaks */}
              <div 
                className={`text-base md:text-lg whitespace-pre-wrap ${
                  selectedOption === opt.key ? 'text-lab-blue font-medium' : 'text-slate-700'
                }`}
                dangerouslySetInnerHTML={{ __html: opt.text }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Footer Instruction */}
      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
        <HelpCircle size={14} className="text-slate-400" />
        <span className="text-[11px] text-slate-400 font-medium italic">
          Select the most appropriate answer. Click again to deselect. All chemical equations should be assumed to occur at r.t.p. unless stated otherwise.
        </span>
      </div>
    </div>
  );
}