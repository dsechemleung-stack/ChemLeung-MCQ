import React, { useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

export default function ProbabilityModal({ correctOption, options, onClose }) {
  const { t, tf } = useLanguage();
  const [showChart, setShowChart] = useState(false);
  const [probabilities, setProbabilities] = useState({});

  useEffect(() => {
    // Generate probabilities with correct answer having 65-75% chance
    const correctProb = 65 + Math.random() * 10; // 65-75%
    const remaining = 100 - correctProb;
    
    // Distribute remaining percentage among wrong answers
    const wrongOptions = options.filter(opt => opt !== correctOption);
    const probs = {};
    
    let remainingProb = remaining;
    wrongOptions.forEach((option, index) => {
      if (index === wrongOptions.length - 1) {
        // Last option gets whatever is left
        probs[option] = remainingProb;
      } else {
        // Random distribution between 5-15%
        const prob = 5 + Math.random() * 10;
        probs[option] = Math.min(prob, remainingProb - 5); // Keep at least 5% for last option
        remainingProb -= probs[option];
      }
    });
    
    probs[correctOption] = correctProb;
    setProbabilities(probs);

    // Show chart after brief delay
    setTimeout(() => setShowChart(true), 500);
  }, [correctOption, options]);

  const maxProb = Math.max(...Object.values(probabilities));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border-2 border-purple-500 max-w-3xl w-full shadow-2xl animate-in slide-in-from-bottom duration-500">
        {/* Header */}
        <div className="bg-purple-600 p-4 rounded-t-xl flex items-center justify-between border-b-2 border-purple-500">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-white" size={28} />
            <div>
              <h3 className="text-white font-black text-xl">{t('millionaire.probability.title')}</h3>
              <p className="text-purple-200 text-sm">{t('millionaire.probability.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-purple-200 transition-colors p-2 rounded-full hover:bg-purple-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Chart Body */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <p className="text-purple-300 text-sm">
              {t('millionaire.probability.basedOn')}
            </p>
          </div>

          <div className="space-y-4">
            {options.map((option) => {
              const prob = probabilities[option] || 0;
              const percentage = prob.toFixed(1);
              const barWidth = showChart ? (prob / maxProb) * 100 : 0;
              const isHighest = prob === maxProb;

              return (
                <div key={option} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`font-black text-lg ${isHighest ? 'text-amber-400' : 'text-white'}`}>
                      {tf('millionaire.probability.optionLabel', { option })}
                    </span>
                    <span className={`font-bold ${isHighest ? 'text-amber-400' : 'text-purple-300'}`}>
                      {percentage}%
                    </span>
                  </div>
                  
                  <div className="bg-slate-800 rounded-full h-8 overflow-hidden border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 ${
                        isHighest
                          ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                          : 'bg-gradient-to-r from-purple-600 to-purple-400'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-white font-bold text-sm">
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-amber-900/30 border border-amber-500/50 rounded-xl">
            <p className="text-amber-300 text-sm text-center">
              {t('millionaire.probability.warning')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 p-4 rounded-b-xl border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
          >
            {t('millionaire.probability.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}