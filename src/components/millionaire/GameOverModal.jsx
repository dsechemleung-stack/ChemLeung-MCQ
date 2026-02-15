import React from 'react';
import { Trophy, Home, RotateCw, TrendingUp, Award } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

export default function GameOverModal({ winAmount, questionsAnswered, fallbackReward = 0, reason, onPlayAgain, onExit }) {
  const { t } = useLanguage();

  const parseAmount = (amt) => {
    if (!amt) return 0;
    const s = String(amt);
    const digits = s.match(/\d+/g);
    if (!digits) return 0;
    return parseInt(digits.join(''), 10);
  };
  
  const amountValue = parseAmount(winAmount);
  const isWinner = reason === 'win' || amountValue >= 35;
  const isCashOut = reason === 'cash_out';
  const isWrong = reason === 'wrong_answer';
  const safetyNetTier = fallbackReward >= 14 ? 14 : fallbackReward >= 5 ? 5 : 0;

  return (
    <div className="m-go-overlay">
      <div className="m-go-hex-frame">
        <div className="m-go-inner">
          <div className="m-go-icon">
            {isWinner ? (
              <Trophy size={64} />
            ) : amountValue > 0 ? (
              <Award size={60} />
            ) : (
              <TrendingUp size={60} />
            )}
          </div>

          <div className="m-go-header">
            {isWinner ? t('millionaire.gameOver.finalResult') : t('millionaire.gameOver.gameOver')}
          </div>

          <div className="m-go-reward" aria-label={t('millionaire.gameOver.finalRewardAria')}>
            {amountValue} {t('millionaire.tokensUnit')}
          </div>

          <div className="m-go-sub">
            {isCashOut
              ? t('millionaire.gameOver.cashOutConfirmed')
              : isWinner
                ? t('millionaire.gameOver.perfectRun')
                : t('millionaire.gameOver.betterLuck')}
          </div>

          <div className="m-go-stats">
            <div className="m-go-stat">
              <div className="m-go-stat__k">{t('millionaire.gameOver.questionsAnswered')}</div>
              <div className="m-go-stat__v">{questionsAnswered}</div>
            </div>
            <div className="m-go-stat">
              <div className="m-go-stat__k">{t('millionaire.gameOver.outOf')}</div>
              <div className="m-go-stat__v">15</div>
            </div>
            <div className="m-go-stat">
              <div className="m-go-stat__k">{t('millionaire.safetyNet')}</div>
              <div className="m-go-stat__v">{isWrong ? fallbackReward : safetyNetTier}</div>
            </div>
          </div>

          <div className="m-go-actions">
            <button onClick={onPlayAgain} className="m-go-hex-btn m-go-hex-btn--green">
              <RotateCw size={20} />
              <span>{t('millionaire.gameOver.playAgain')}</span>
            </button>
            <button onClick={onExit} className="m-go-hex-btn m-go-hex-btn--blue">
              <Home size={20} />
              <span>{t('millionaire.gameOver.exitToHome')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}