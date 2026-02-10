import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Infinity, Settings, Play, Zap, BookOpen, Lock, Check, AlertCircle } from 'lucide-react';
import { quizStorage } from '../utils/quizStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function PracticeModeSelection({ questions }) {
  const navigate = useNavigate();
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const { isEnglish } = useLanguage();
  const [selectedMode, setSelectedMode] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [showCustom, setShowCustom] = useState(false);
  const [showUpdateTopics, setShowUpdateTopics] = useState(false);

  // Custom mode state
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [customCount, setCustomCount] = useState(10);

  // Quick update topics state
  const [tempLearnedUpTo, setTempLearnedUpTo] = useState(userProfile?.learnedUpTo || '');
  const [tempExceptions, setTempExceptions] = useState(userProfile?.topicExceptions || []);
  const [updating, setUpdating] = useState(false);

  const MAX_QUESTIONS = 40;

  // Get all unique topics from questions
  const allTopics = useMemo(() => {
    return [...new Set(questions.map(q => q.Topic))]
      .filter(t => t && t !== "Uncategorized")
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  // Get available topics based on user's learned progress
  const availableTopics = useMemo(() => {
    const learnedUpTo = userProfile?.learnedUpTo;
    const exceptions = userProfile?.topicExceptions || [];
    
    if (!learnedUpTo) return [];
    
    return allTopics.filter(topic => {
      const topicNum = topic.match(/^\d+/)?.[0];
      return topicNum && topicNum <= learnedUpTo && !exceptions.includes(topic);
    });
  }, [allTopics, userProfile]);

  // For custom mode: determine which topics can be selected
  const customTopics = useMemo(() => {
    return allTopics.map(topic => {
      const isAvailable = availableTopics.includes(topic);
      return {
        name: topic,
        available: isAvailable
      };
    });
  }, [allTopics, availableTopics]);

  const availableSubtopics = useMemo(() => {
    if (selectedTopics.length === 0) return [];
    return [...new Set(questions
      .filter(q => selectedTopics.includes(q.Topic))
      .map(q => q.Subtopic))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [selectedTopics, questions]);

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    setSelectedSubtopics([]);
  };

  const toggleSubtopic = (sub) => {
    setSelectedSubtopics(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleUpdateTopics = async () => {
    setUpdating(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        learnedUpTo: tempLearnedUpTo,
        topicExceptions: tempExceptions,
        updatedAt: new Date().toISOString()
      });
      await loadUserProfile(currentUser.uid);
      setShowUpdateTopics(false);
      alert(isEnglish ? 'Topics updated successfully!' : '主題已成功更新！');
    } catch (error) {
      console.error('Error updating topics:', error);
      alert(isEnglish ? 'Failed to update topics' : '更新主題失敗');
    }
    setUpdating(false);
  };

  const handleModeSelect = (mode, count) => {
    if (availableTopics.length === 0) {
      alert(isEnglish 
        ? "Please set your learned topics in Profile first!" 
        : "請先在個人資料中設定您已學習的主題！"
      );
      navigate('/profile');
      return;
    }

    setSelectedMode(mode);
    setQuestionCount(count);
    
    if (mode === 'custom') {
      setShowCustom(true);
    } else {
      // For Timed and Marathon: filter by available topics
      const filtered = questions.filter(q => availableTopics.includes(q.Topic));
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      const finalSelection = shuffled.slice(0, Math.min(count, MAX_QUESTIONS, shuffled.length));
      
      startQuiz(finalSelection, mode);
    }
  };

  const handleCustomStart = () => {
    let pool = questions.filter(q => selectedTopics.includes(q.Topic));
    
    if (selectedSubtopics.length > 0) {
      pool = pool.filter(q => selectedSubtopics.includes(q.Subtopic));
    }
    
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const requestedCount = customCount === 'All' ? pool.length : parseInt(customCount);
    const finalCount = Math.min(requestedCount, MAX_QUESTIONS);
    const finalSelection = shuffled.slice(0, finalCount);
    
    if (finalSelection.length === 0) {
      alert(isEnglish 
        ? "No questions found for this selection. Try broader filters!" 
        : "找不到符合條件的題目。請嘗試更廣泛的篩選！"
      );
      return;
    }

    if (requestedCount > MAX_QUESTIONS) {
      alert(isEnglish 
        ? `Session limited to ${MAX_QUESTIONS} questions maximum.` 
        : `每次練習最多 ${MAX_QUESTIONS} 題。`
      );
    }

    startQuiz(finalSelection, 'custom');
  };

  const startQuiz = (selectedQuestions, mode) => {
    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selectedQuestions);
    
    localStorage.setItem('quiz_mode', mode);
    if (mode === 'timed') {
      const timeLimit = selectedQuestions.length * 1.25 * 60 * 1000;
      localStorage.setItem('quiz_time_limit', timeLimit.toString());
    }
    
    navigate('/quiz');
  };

  // Quick update topics modal
  if (showUpdateTopics) {
    const learnedRangeTopics = allTopics.filter(topic => {
      const topicNum = topic.match(/^\d+/)?.[0];
      return topicNum && topicNum <= tempLearnedUpTo;
    });

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-lab-blue p-6 text-white flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {isEnglish ? 'Update Your Topics' : '更新您的主題'}
            </h2>
            <button
              onClick={() => setShowUpdateTopics(false)}
              className="text-white hover:text-blue-100 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                {isEnglish ? 'Learned Up To:' : '已學習至：'}
              </label>
              <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                {allTopics.map((topic) => {
                  const topicNum = topic.match(/^\d+/)?.[0];
                  return (
                    <button
                      key={topic}
                      onClick={() => setTempLearnedUpTo(topicNum)}
                      className={`py-2 rounded-lg border-2 font-bold transition-all ${
                        tempLearnedUpTo === topicNum
                          ? 'border-chemistry-green bg-green-50 text-chemistry-green'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {topicNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {tempLearnedUpTo && learnedRangeTopics.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  {isEnglish ? 'Exceptions (Not Learned):' : '例外（未學習）：'}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {learnedRangeTopics.map((topic) => {
                    const isException = tempExceptions.includes(topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => setTempExceptions(prev =>
                          prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
                        )}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isException
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                        }`}
                      >
                        <span className="text-sm font-semibold">{topic}</span>
                        {isException ? <Lock size={16} /> : <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleUpdateTopics}
                disabled={updating}
                className="flex-1 py-3 bg-chemistry-green text-white rounded-xl font-bold hover:opacity-90 disabled:bg-slate-300 transition-all"
              >
                {updating ? (isEnglish ? 'Updating...' : '更新中...') : (isEnglish ? 'Save Changes' : '儲存變更')}
              </button>
              <button
                onClick={() => setShowUpdateTopics(false)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
              >
                {isEnglish ? 'Cancel' : '取消'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom mode configuration
  if (showCustom) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Settings size={20} className="text-lab-blue" />
              {isEnglish ? 'Configure Custom Session' : '自訂練習設定'}
            </h2>
            <button
              onClick={() => setShowCustom(false)}
              className="text-sm text-slate-600 hover:text-slate-800 hover:underline font-semibold"
            >
              ← {isEnglish ? 'Back' : '返回'}
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <label className="block text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                1. {isEnglish ? 'Select Topics (Multi-choice)' : '選擇主題（可多選）'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {customTopics.map(({ name, available }) => (
                  <button
                    key={name}
                    onClick={() => available && toggleTopic(name)}
                    disabled={!available}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      !available
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                        : selectedTopics.includes(name)
                        ? 'border-lab-blue bg-blue-50 text-lab-blue shadow-sm'
                        : 'border-slate-100 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {!available && <Lock size={14} />}
                      {name}
                    </span>
                    {selectedTopics.includes(name) && <Check size={16} />}
                  </button>
                ))}
              </div>
              {customTopics.some(t => !t.available) && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Lock size={12} />
                  {isEnglish 
                    ? 'Locked topics not yet learned. Update in Profile or click button above.' 
                    : '鎖定的主題尚未學習。請在個人資料中更新或點擊上方按鈕。'}
                </p>
              )}
            </div>

            {selectedTopics.length > 0 && availableSubtopics.length > 0 && (
              <div className="animate-in slide-in-from-top-4">
                <label className="block text-sm font-black text-slate-500 mb-4 uppercase tracking-widest">
                  2. {isEnglish ? 'Focus on Subtopics (Optional)' : '選擇子主題（可選）'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSubtopics.map(sub => (
                    <button
                      key={sub}
                      onClick={() => toggleSubtopic(sub)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                        selectedSubtopics.includes(sub)
                        ? 'bg-lab-blue border-lab-blue text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-black text-slate-500 mb-4 uppercase tracking-widest">
                3. {isEnglish ? 'Session Length' : '練習題數'}
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {['5', '10', '15', '20', '30', '40'].map(num => (
                  <button
                    key={num}
                    onClick={() => setCustomCount(num)}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${
                      customCount === num ? 'border-lab-blue bg-blue-50 text-lab-blue' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={selectedTopics.length === 0}
              onClick={handleCustomStart}
              className="w-full py-5 bg-lab-blue text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Play fill="currentColor" size={18} />
              {isEnglish ? 'GENERATE EXAM' : '開始練習'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main mode selection screen
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-academic-charcoal mb-2">
          {isEnglish ? 'Select Practice Mode' : '選擇練習模式'}
        </h1>
        <p className="text-academic-light-slate text-lg">
          {isEnglish ? 'Choose how you want to practice today' : '選擇您的練習方式'}
        </p>
      </div>

      {/* Available Topics Info + Update Button */}
      {availableTopics.length > 0 ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <BookOpen size={16} />
                {isEnglish ? 'Your Available Topics' : '您可用的主題'} ({availableTopics.length})
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTopics.slice(0, 8).map((topic) => (
                  <span key={topic} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                    {topic}
                  </span>
                ))}
                {availableTopics.length > 8 && (
                  <span className="px-2 py-1 text-blue-700 text-xs font-bold">
                    +{availableTopics.length - 8} more
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowUpdateTopics(true)}
              className="px-4 py-2 bg-lab-blue text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all whitespace-nowrap"
            >
              {isEnglish ? 'Update Topics' : '更新主題'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-amber-900 font-bold mb-2">
                {isEnglish ? 'No topics configured!' : '尚未設定主題！'}
              </p>
              <p className="text-amber-800 text-sm mb-3">
                {isEnglish 
                  ? 'Please set which topics you\'ve learned in your Profile settings.' 
                  : '請在個人資料設定中設定您已學習的主題。'}
              </p>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-all"
              >
                {isEnglish ? 'Go to Profile' : '前往個人資料'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TIMED MODE */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-red-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Clock size={32} strokeWidth={3} />
              <h3 className="text-2xl font-black">
                {isEnglish ? 'Timed' : '限時模式'}
              </h3>
            </div>
            <p className="text-red-100 text-sm">
              {isEnglish ? '1.25 min per question' : '每題 1.25 分鐘'}
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              {isEnglish 
                ? 'Perfect for exam simulation with a countdown timer.' 
                : '最適合考試模擬，帶有倒數計時器。'}
            </p>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                {isEnglish ? 'Questions:' : '題數：'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20, 40].map(num => (
                  <button
                    key={num}
                    onClick={() => handleModeSelect('timed', num)}
                    disabled={availableTopics.length === 0}
                    className="py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg font-bold hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MARATHON MODE */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-purple-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Infinity size={32} strokeWidth={3} />
              <h3 className="text-2xl font-black">
                {isEnglish ? 'Marathon' : '馬拉松模式'}
              </h3>
            </div>
            <p className="text-purple-100 text-sm">
              {isEnglish ? 'Unlimited time' : '無限時間'}
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              {isEnglish 
                ? 'Take your time. We\'ll track duration but no pressure!' 
                : '慢慢來。我們會記錄時間但沒有壓力！'}
            </p>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                {isEnglish ? 'Questions:' : '題數：'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20, 40].map(num => (
                  <button
                    key={num}
                    onClick={() => handleModeSelect('marathon', num)}
                    disabled={availableTopics.length === 0}
                    className="py-2 bg-purple-50 border-2 border-purple-200 text-purple-700 rounded-lg font-bold hover:bg-purple-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOM MODE */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-lab-blue p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Settings size={32} strokeWidth={3} />
              <h3 className="text-2xl font-black">
                {isEnglish ? 'Custom' : '自訂模式'}
              </h3>
            </div>
            <p className="text-blue-100 text-sm">
              {isEnglish ? 'Full control' : '完全控制'}
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              {isEnglish 
                ? 'Choose specific topics, subtopics, and question count.' 
                : '選擇特定主題、子主題和題數。'}
            </p>
            
            <button
              onClick={() => handleModeSelect('custom', 10)}
              disabled={availableTopics.length === 0}
              className="w-full py-3 bg-lab-blue text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-all"
            >
              {isEnglish ? 'Configure' : '設定'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}