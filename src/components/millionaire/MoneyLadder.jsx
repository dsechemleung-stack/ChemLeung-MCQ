import React, { useEffect, useMemo, useRef } from 'react';
import { animate } from 'framer-motion';
import { Lock } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

export default function MoneyLadder({ ladder, currentLevel }) {
  const { t, tf } = useLanguage();
  const containerRef = useRef(null);
  const nodeRefs = useRef({});

  const steps = useMemo(() => {
    return Array.isArray(ladder) ? [...ladder].reverse() : [];
  }, [ladder]);

  useEffect(() => {
    const container = containerRef.current;
    const node = nodeRefs.current[currentLevel];
    if (!container || !node) return;

    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();

    const nodeCenterWithinContainer = (nodeRect.top - containerRect.top) + nodeRect.height / 2;
    const targetScrollTop = container.scrollTop + nodeCenterWithinContainer - containerRect.height / 2;

    try {
      const controls = animate(container.scrollTop, targetScrollTop, {
        duration: 0.45,
        ease: 'easeInOut',
        onUpdate: (v) => {
          container.scrollTop = v;
        }
      });
      return () => controls?.stop?.();
    } catch (_) {
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [currentLevel]);

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-blue-900/70 backdrop-blur-xl rounded-2xl border-2 border-blue-500/40 p-4 shadow-2xl h-full overflow-hidden">
      <div className="mb-3">
        <div className="text-lg font-black text-amber-300">{t('millionaire.tokenLadder')}</div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-y-auto scroll-smooth rounded-xl border border-white/10 bg-black/20"
        style={{ height: '100%', maxHeight: '100%' }}
      >
        <div className="relative py-8 px-4" style={{ paddingBottom: 'calc(2rem + 20px)' }}>
          {/* Glowing path */}
          <div className="absolute left-[39px] top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-white/10 via-white/10 to-white/5" />
          <div
            className="absolute left-[38px] bottom-6 w-[4px] rounded-full m-skill-flow shadow-[0_0_26px_rgba(34,211,238,0.35)]"
            style={{ height: `${Math.max(0, Math.min(100, (currentLevel / Math.max(1, steps.length)) * 100))}%` }}
          />

          <div className="space-y-5">
            {steps.map((step) => {
              const isCurrent = step.level === currentLevel;
              const isCompleted = step.level < currentLevel;
              const isFuture = step.level > currentLevel;

              const nodeBg = isCompleted
                ? 'bg-amber-400'
                : isCurrent
                  ? 'bg-blue-500'
                  : 'bg-slate-700';

              const ring = isCompleted
                ? 'ring-amber-300/70'
                : isCurrent
                  ? 'ring-blue-300/80'
                  : 'ring-white/10';

              const glow = isCurrent
                ? 'shadow-[0_0_24px_rgba(59,130,246,0.55)]'
                : isCompleted
                  ? 'shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                  : '';

              return (
                <div key={step.level} className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      ref={(el) => {
                        if (el) nodeRefs.current[step.level] = el;
                      }}
                      className={`relative w-11 h-11 rounded-full ${nodeBg} ring-4 ${ring} ${glow} flex items-center justify-center transition-all ${isCurrent ? 'm-radar' : ''}`}
                    >
                      {step.safe && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 border border-amber-400 flex items-center justify-center">
                          <Lock size={14} className="text-amber-300" />
                        </div>
                      )}
                      <span className={`text-sm font-black ${isFuture ? 'text-white/60' : 'text-slate-900'}`}>{step.level}</span>
                    </div>

                    <div className="leading-tight">
                      <div className={`text-sm font-black ${isFuture ? 'text-white/40' : 'text-white'}`}>
                        {tf('millionaire.amountTokens', { count: step.amount })}
                      </div>
                      {step.safe && (
                        <div className="text-[11px] font-bold text-amber-300/90">{t('millionaire.safetyNet')}</div>
                      )}
                    </div>
                  </div>

                  <div className={`text-xs font-bold ${isCompleted ? 'text-amber-300' : isCurrent ? 'text-blue-200' : 'text-white/30'}`}>
                    {isCompleted ? t('millionaire.cleared') : isCurrent ? t('millionaire.now') : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}