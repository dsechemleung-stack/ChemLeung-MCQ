import React, { useState, useEffect } from 'react';
import { X, User, MessageCircle } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

export default function ChemLeungModal({ explanation, onClose }) {
  const { t } = useLanguage();
  const [showTyping, setShowTyping] = useState(true);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Simulate typing delay
    const typingTimer = setTimeout(() => {
      setShowTyping(false);
      setShowMessage(true);
    }, 2000);

    return () => clearTimeout(typingTimer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl border-2 border-green-500 max-w-2xl w-full shadow-2xl animate-in slide-in-from-bottom duration-500">
        {/* Header */}
        <div className="bg-green-600 p-4 rounded-t-xl flex items-center justify-between border-b-2 border-green-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <User className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-white font-black text-xl">ChemLeung</h3>
              <p className="text-green-200 text-sm">{t('millionaire.chemLeung.expert')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200 transition-colors p-2 rounded-full hover:bg-green-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Chat Body */}
        <div className="p-6 min-h-[300px] max-h-[500px] overflow-y-auto">
          {/* Incoming call animation */}
          <div className="flex items-center gap-3 mb-6 animate-pulse">
            <MessageCircle className="text-green-400" size={24} />
            <span className="text-green-400 font-bold">{t('millionaire.chemLeung.analyzing')}</span>
          </div>

          {/* Typing indicator */}
          {showTyping && (
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="text-white" size={20} />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Message */}
          {showMessage && (
            <div className="flex items-start gap-3 animate-in slide-in-from-left">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="text-white" size={20} />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-tl-none px-5 py-4 border-2 border-green-500/30 shadow-lg">
                <div
                  className="text-white leading-relaxed text-lg"
                  dangerouslySetInnerHTML={{ __html: explanation || t('millionaire.chemLeung.defaultAnalysis') }}
                />
                <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400">
                  {t('millionaire.chemLeung.remember')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 p-4 rounded-b-xl border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
          >
            {t('millionaire.chemLeung.thanks')}
          </button>
        </div>
      </div>
    </div>
  );
}