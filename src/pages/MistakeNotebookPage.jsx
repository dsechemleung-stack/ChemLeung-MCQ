import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { quizStorage } from '../utils/quizStorage';
import {
  BookOpen, ArrowLeft, Play, AlertCircle, Target,
  CheckCircle, Filter, ChevronDown, Calendar, Hash, Tag,
} from 'lucide-react';

export default function MistakeNotebookPage() {
  const { currentUser } = useAuth();
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();

  const [mistakes, setMistakes] = useState([]);  // all mistakes raw
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Filter state
  const [questionCount, setQuestionCount] = useState('5');   // default 5
  const [datePeriod, setDatePeriod] = useState('all');       // all | week | month
  const [selectedTopics, setSelectedTopics] = useState([]);  // empty = all topics

  useEffect(() => { loadMistakes(); }, [currentUser]);

  async function loadMistakes() {
    if (!currentUser) { setLoading(false); return; }
    try {
      setLoading(true);
      const attempts = await quizService.getUserAttempts(currentUser.uid, 100);
      const incorrectMap = new Map();

      attempts.forEach(attempt => {
        if (attempt.answers && attempt.questions) {
          attempt.questions.forEach(question => {
            const userAnswer = attempt.answers[question.ID];
            if (userAnswer && userAnswer !== question.CorrectOption) {
              if (!incorrectMap.has(question.ID)) {
                incorrectMap.set(question.ID, {
                  ...question,
                  attemptCount: 1,
                  lastAttempted: attempt.timestamp,
                  userAnswer,
                });
              } else {
                const existing = incorrectMap.get(question.ID);
                existing.attemptCount += 1;
                if (new Date(attempt.timestamp) > new Date(existing.lastAttempted)) {
                  existing.lastAttempted = attempt.timestamp;
                  existing.userAnswer = userAnswer;
                }
              }
            }
          });
        }
      });

      const arr = Array.from(incorrectMap.values()).sort(
        (a, b) => new Date(b.lastAttempted) - new Date(a.lastAttempted)
      );
      setMistakes(arr);
    } catch (err) {
      console.error('Error loading mistakes:', err);
    } finally {
      setLoading(false);
    }
  }

  // All unique topics from mistakes
  const allTopics = useMemo(() => {
    return [...new Set(mistakes.map(m => m.Topic).filter(Boolean))].sort();
  }, [mistakes]);

  // Apply filters
  const filteredMistakes = useMemo(() => {
    let result = [...mistakes];

    // Date filter
    if (datePeriod === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(m => new Date(m.lastAttempted) >= weekAgo);
    } else if (datePeriod === 'month') {
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter(m => new Date(m.lastAttempted) >= monthAgo);
    }

    // Topic filter
    if (selectedTopics.length > 0) {
      result = result.filter(m => selectedTopics.includes(m.Topic));
    }

    return result;
  }, [mistakes, datePeriod, selectedTopics]);

  // The final slice for practice
  const practiceCount = questionCount === 'All' ? filteredMistakes.length : Math.min(parseInt(questionCount), filteredMistakes.length);

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handlePracticeMistakes = () => {
    if (filteredMistakes.length === 0) return;
    const shuffled = [...filteredMistakes].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, practiceCount);
    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selected);
    localStorage.setItem('quiz_mode', 'mistakes');
    navigate('/quiz');
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue mx-auto mb-4"></div>
          <p className="text-slate-600">{isEnglish ? 'Loading your mistakes...' : '載入錯題中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <BookOpen size={32} />
            {isEnglish ? 'Mistake Notebook' : '錯題簿'}
          </h1>
          <p className="text-orange-100 mt-1">
            {isEnglish ? 'Review and master questions you got wrong' : '複習並掌握您答錯的題目'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-sm font-semibold text-slate-600">{isEnglish ? 'Total Mistakes' : '總錯題數'}</span>
          </div>
          <div className="text-3xl font-black text-red-600">{mistakes.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-amber-600" size={20} />
            <span className="text-sm font-semibold text-slate-600">{isEnglish ? 'Topics to Focus' : '需加強主題'}</span>
          </div>
          <div className="text-3xl font-black text-amber-600">{new Set(mistakes.map(m => m.Topic)).size}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-chemistry-green" size={20} />
            <span className="text-sm font-semibold text-slate-600">{isEnglish ? 'Repeated Mistakes' : '重複錯誤'}</span>
          </div>
          <div className="text-3xl font-black text-chemistry-green">{mistakes.filter(m => m.attemptCount > 1).length}</div>
        </div>
      </div>

      {/* ── PRACTICE CONFIGURATOR ── */}
      {mistakes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Toggle header */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <Filter className="text-orange-600" size={20} />
              <span className="font-bold text-slate-800 text-lg">
                {isEnglish ? 'Configure Practice Session' : '設定練習'}
              </span>
            </div>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="border-t border-slate-200 p-6 space-y-6 bg-slate-50">

              {/* 1. Question Count */}
              <div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                  <Hash size={14} />
                  {isEnglish ? '1. Number of Questions' : '1. 題目數量'}
                </label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {['5', '10', '15', '20', '30', '40', 'All'].map(num => (
                    <button
                      key={num}
                      onClick={() => setQuestionCount(num)}
                      disabled={num !== 'All' && parseInt(num) > filteredMistakes.length}
                      className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                        questionCount === num
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {filteredMistakes.length} {isEnglish ? 'questions available with current filters' : '題符合目前篩選條件'}
                </p>
              </div>

              {/* 2. Date Range */}
              <div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                  <Calendar size={14} />
                  {isEnglish ? '2. Time Range (when you made the mistake)' : '2. 時間範圍（犯錯時間）'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: isEnglish ? 'All Time' : '所有時間', desc: isEnglish ? 'default' : '預設' },
                    { value: 'month', label: isEnglish ? 'Last Month' : '上個月', desc: '' },
                    { value: 'week', label: isEnglish ? 'Last Week' : '上週', desc: '' },
                  ].map(o => (
                    <button
                      key={o.value}
                      onClick={() => setDatePeriod(o.value)}
                      className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left ${
                        datePeriod === o.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {o.label}
                      {o.desc && <span className="block text-xs font-normal opacity-70">{o.desc}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Topics */}
              {allTopics.length > 1 && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                    <Tag size={14} />
                    {isEnglish ? '3. Topics (leave empty for all)' : '3. 主題（留空表示全部）'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTopics.map(topic => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                          selectedTopics.includes(topic)
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                        }`}
                      >
                        {topic}
                        <span className="ml-1 opacity-70">
                          ({mistakes.filter(m => m.Topic === topic).length})
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedTopics.length > 0 && (
                    <button
                      onClick={() => setSelectedTopics([])}
                      className="mt-2 text-xs text-orange-600 hover:underline font-semibold"
                    >
                      {isEnglish ? '✕ Clear topic filter' : '✕ 清除主題篩選'}
                    </button>
                  )}
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handlePracticeMistakes}
                disabled={filteredMistakes.length === 0}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-orange-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Play fill="currentColor" size={18} />
                {isEnglish
                  ? `Practice ${practiceCount} Mistake${practiceCount !== 1 ? 's' : ''}`
                  : `練習 ${practiceCount} 道錯題`
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mistakes List */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {isEnglish ? 'All Mistakes' : '所有錯題'} ({mistakes.length})
          </h2>
        </div>

        <div className="p-6">
          {mistakes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2 font-semibold">
                {isEnglish ? 'No mistakes yet!' : '目前沒有錯題！'}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {isEnglish ? "Keep practicing. Wrong answers appear here." : '繼續練習。答錯的題目會出現在這裡。'}
              </p>
              <button onClick={() => navigate('/')} className="px-6 py-3 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all">
                {isEnglish ? 'Start Practicing' : '開始練習'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {mistakes.map((mistake, index) => (
                <div key={mistake.ID} className="p-6 rounded-xl border-2 border-slate-100 hover:border-red-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center font-black text-red-600">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">{mistake.Topic}</div>
                        <div className="text-xs text-slate-400">{mistake.Subtopic}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{isEnglish ? 'Last Attempt' : '最後嘗試'}</div>
                      <div className="text-sm font-semibold text-slate-700">{formatDate(mistake.lastAttempted)}</div>
                      {mistake.attemptCount > 1 && (
                        <div className="text-xs text-amber-600 font-bold mt-1">
                          ⚠️ {isEnglish ? `Missed ${mistake.attemptCount}×` : `錯 ${mistake.attemptCount} 次`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                    <div className="text-base text-slate-800 font-medium prose max-w-none whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: mistake.Question }} />
                  </div>

                  {mistake.Pictureurl && (
                    <div className="mb-4 flex justify-center bg-white p-4 rounded-xl border border-slate-100">
                      <img src={mistake.Pictureurl} alt="Diagram" className="max-w-full h-auto max-h-[200px] object-contain rounded-md" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-xs font-bold text-red-700 mb-1">{isEnglish ? 'Your Answer' : '您的答案'}</div>
                      <div className="text-sm font-semibold text-red-900">{mistake.userAnswer}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="text-xs font-bold text-green-700 mb-1">{isEnglish ? 'Correct Answer' : '正確答案'}</div>
                      <div className="text-sm font-semibold text-green-900">{mistake.CorrectOption}</div>
                    </div>
                  </div>

                  {mistake.Explanation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                        <BookOpen size={14} /> {isEnglish ? 'Explanation' : '解釋'}
                      </div>
                      <div className="text-sm text-blue-900 leading-relaxed prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: mistake.Explanation }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm">
        <p className="text-blue-900 font-semibold mb-2">💡 {isEnglish ? 'How it works' : '運作原理'}</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>{isEnglish ? 'Wrong answers are auto-saved here' : '答錯的題目自動儲存在這裡'}</li>
          <li>{isEnglish ? 'Use filters to focus on specific topics or recent mistakes' : '使用篩選器專注於特定主題或最近的錯誤'}</li>
          <li>{isEnglish ? 'Practice until you master them!' : '練習直到您掌握它們！'}</li>
        </ul>
      </div>
    </div>
  );
}