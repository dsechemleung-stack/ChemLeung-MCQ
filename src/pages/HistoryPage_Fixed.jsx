import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizService } from '../services/quizService';
import { History, ArrowLeft, Calendar, Clock, Target, TrendingUp, Filter, ChevronDown, Trophy, AlertCircle, RefreshCw } from 'lucide-react';

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all'); // all, week, month
  const [sortBy, setSortBy] = useState('recent'); // recent, score, time
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [currentUser]);

  async function loadHistory() {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('📜 History: Loading attempts for user:', currentUser.uid);
      // Load all attempts (no limit for history page)
      const userAttempts = await quizService.getUserAttempts(currentUser.uid, 100);
      
      console.log('📜 History: Loaded attempts:', userAttempts.length);
      setAttempts(userAttempts);
      
      if (userAttempts.length === 0) {
        console.log('⚠️ History: No attempts found in database');
      } else {
        console.log('✅ History: Sample attempt:', userAttempts[0]);
      }
    } catch (err) {
      console.error('❌ History: Error loading attempts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) {
      return `${hrs}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Filter attempts by time period
  const getFilteredAttempts = () => {
    let filtered = [...attempts];

    // Time period filter
    if (filterPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(a => new Date(a.timestamp) >= weekAgo);
    } else if (filterPeriod === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(a => new Date(a.timestamp) >= monthAgo);
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => b.percentage - a.percentage);
    } else if (sortBy === 'time') {
      filtered.sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));
    }

    return filtered;
  };

  const filteredAttempts = getFilteredAttempts();

  // Calculate statistics
  const stats = {
    total: filteredAttempts.length,
    average: filteredAttempts.length > 0
      ? Math.round(filteredAttempts.reduce((sum, a) => sum + a.percentage, 0) / filteredAttempts.length)
      : 0,
    best: filteredAttempts.length > 0
      ? Math.max(...filteredAttempts.map(a => a.percentage))
      : 0,
    totalTime: filteredAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <History size={32} />
            Practice History
          </h1>
          <p className="text-purple-100 mt-1">
            Review your past attempts and track your progress
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">Error Loading History</h3>
              <p className="text-sm text-red-800 mb-3">{error}</p>
              <button
                onClick={loadHistory}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-lab-blue" size={20} />
            <span className="text-sm font-semibold text-slate-600">Total Attempts</span>
          </div>
          <div className="text-3xl font-black text-lab-blue">{stats.total}</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-chemistry-green" size={20} />
            <span className="text-sm font-semibold text-slate-600">Average Score</span>
          </div>
          <div className="text-3xl font-black text-chemistry-green">{stats.average}%</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-amber-500" size={20} />
            <span className="text-sm font-semibold text-slate-600">Best Score</span>
          </div>
          <div className="text-3xl font-black text-amber-500">{stats.best}%</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-purple-600" size={20} />
            <span className="text-sm font-semibold text-slate-600">Total Time</span>
          </div>
          <div className="text-3xl font-black text-purple-600">{formatTime(stats.totalTime)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Filter className="text-lab-blue" size={20} />
            <span className="font-bold text-slate-800">Filters & Sorting</span>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {showFilters && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Time Period Filter */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Time Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'month', label: 'Last Month' },
                    { value: 'week', label: 'Last Week' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilterPeriod(option.value)}
                      className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                        filterPeriod === option.value
                          ? 'bg-lab-blue text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sort By</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'recent', label: 'Recent' },
                    { value: 'score', label: 'Score' },
                    { value: 'time', label: 'Time' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                        sortBy === option.value
                          ? 'bg-chemistry-green text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attempts List */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            Your Attempts ({filteredAttempts.length})
          </h2>
          <button
            onClick={loadHistory}
            className="text-sm text-lab-blue hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="p-6">
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No attempts found</p>
              <p className="text-slate-500 text-sm mb-4">
                {filterPeriod !== 'all' 
                  ? 'Try changing the filter period' 
                  : 'Start practicing to see your history!'}
              </p>
              {attempts.length === 0 && (
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all"
                  >
                    Take Your First Quiz
                  </button>
                  <div className="pt-3 border-t border-slate-200 mx-auto max-w-xs">
                    <button
                      onClick={() => navigate('/test-firebase')}
                      className="text-sm text-purple-600 hover:underline"
                    >
                      🔧 Data not showing? Click here to debug
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAttempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-lab-blue transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank Number */}
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-600">
                      #{index + 1}
                    </div>

                    {/* Score Badge */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl ${
                      attempt.percentage >= 70 
                        ? 'bg-green-100 text-green-700'
                        : attempt.percentage >= 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {attempt.percentage}%
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-lg">
                        {attempt.correctAnswers}/{attempt.totalQuestions} correct
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar size={14} />
                        {formatDate(attempt.timestamp)}
                      </div>
                      {attempt.topics && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {attempt.topics.slice(0, 3).map((topic, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-lab-blue px-2 py-1 rounded-full font-semibold">
                              {topic}
                            </span>
                          ))}
                          {attempt.topics.length > 3 && (
                            <span className="text-xs text-slate-400 px-2 py-1">
                              +{attempt.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Display */}
                  {attempt.timeSpent && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                        <Clock size={14} />
                        {formatTime(attempt.timeSpent)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatTime(attempt.timeSpent / attempt.totalQuestions)} per Q
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-600">
        <strong>Debug Info:</strong> Total in DB: {attempts.length} | Filtered: {filteredAttempts.length} | Period: {filterPeriod} | Sort: {sortBy}
      </div>
    </div>
  );
}