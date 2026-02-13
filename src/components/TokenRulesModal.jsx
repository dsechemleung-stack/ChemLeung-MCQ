import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Info } from 'lucide-react';

export default function TokenRulesModal({ open, onClose, title }) {
  const { t } = useLanguage();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-6">
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-5 rounded-t-2xl z-10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Info size={20} className="text-lab-blue" />
            <h2 className="text-xl font-black text-slate-800">{title || t('store.howToEarnTokens')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
            <X size={22} />
          </button>
        </div>

        <div className="p-5">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-base">✅</span>
              <span><strong>{t('store.firstCorrect')}</strong> {t('store.firstCorrectTokens')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">🧠</span>
              <span><strong>{t('store.correctedMistake')}</strong> {t('store.correctedMistakeTokens')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">🏆</span>
              <span><strong>{t('store.quizBonus')}</strong> {t('store.quizBonusTokens')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">📅</span>
              <span><strong>{t('store.leaderboardWeekly')}</strong> {t('store.leaderboardWeeklyTokens')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">🗓️</span>
              <span><strong>{t('store.leaderboardMonthly')}</strong> {t('store.leaderboardMonthlyTokens')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">🔥</span>
              <span><strong>{t('store.studyStreaks')}</strong> {t('store.studyStreaksTokens')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
