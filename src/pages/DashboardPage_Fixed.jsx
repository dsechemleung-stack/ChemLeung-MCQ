import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizService } from '../services/quizService';
import { Trophy, Clock, Target, TrendingUp, Calendar, LogOut, Play, AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser, userProfile, logout } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAttempts();
  }, [currentUser]);

  async function loadAttempts() {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('📊 Dashboard: Loading attempts for user:', currentUser.uid);
      const userAttempts = await quizService.getUserAttempts(currentUser.uid, 10);
      
      console.log('📊 Dashboard: Loaded attempts:', userAttempts.length);
      setAttempts(userAttempts);
      
      if (userAttempts.length === 0) {
        console.log('⚠️ Dashboard: No attempts found in database');
      }
    } catch (err) {
      console.error('❌ Dashboard: Error loading attempts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const overallAccuracy = userProfile?.totalQuestions > 0
    ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with User Info */}
      <div className="bg-gradient-to-r from-lab-blue to-blue-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black mb-2">
              Welcome back, {currentUser?.displayName}!
            </h1>
            <p className="text-blue-100">
              {currentUser?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-bold transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-300" size={20} />
              <span className="text-sm font-semibold text-blue-100">Total Attempts</span>
            </div>
            <div className="text-3xl font-black">{userProfile?.totalAttempts || 0}</div>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-green-300" size={20} />
              <span className="text-sm font-semibold text-blue-100">Overall Accuracy</span>
            </div>
            <div className="text-3xl font-black">{overallAccuracy}%</div>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-purple-300" size={20} />
              <span className="text-sm font-semibold text-blue-100">Questions Solved</span>
            </div>
            <div className="text-3xl font-black">{userProfile?.totalQuestions || 0}</div>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-pink-300" size={20} />
              <span className="text-sm font-semibold text-blue-100">Correct Answers</span>
            </div>
            <div className="text-3xl font-black">{userProfile?.totalCorrect || 0}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/')}
          className="bg-chemistry-green text-white rounded-xl p-6 font-bold text-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <Play fill="currentColor" size={24} />
          Start New Quiz
        </button>

        <button
          onClick={() => navigate('/leaderboard')}
          className="bg-amber-500 text-white rounded-xl p-6 font-bold text-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <Trophy size={24} />
          View Leaderboard
        </button>
      </div>

      {/* Debug/Error Section */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">Error Loading Attempts</h3>
              <p className="text-sm text-red-800 mb-3">{error}</p>
              <button
                onClick={loadAttempts}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Attempts */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-lab-blue" size={24} />
            Recent Attempts
          </h2>
          <button
            onClick={loadAttempts}
            className="text-sm text-lab-blue hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="p-6">
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No attempts yet!</p>
              <p className="text-slate-500 text-sm mb-4">
                Complete a quiz to see your results here
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all"
              >
                Take Your First Quiz
              </button>
              <div className="mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => navigate('/test-firebase')}
                  className="text-sm text-purple-600 hover:underline"
                >
                  🔧 Data not showing? Click here to debug
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-lab-blue transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl ${
                      attempt.percentage >= 70 
                        ? 'bg-green-100 text-green-700'
                        : attempt.percentage >= 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {attempt.percentage}%
                    </div>
                    
                    <div>
                      <div className="font-bold text-slate-800">
                        {attempt.correctAnswers}/{attempt.totalQuestions} correct
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(attempt.timestamp)}
                      </div>
                      {attempt.topics && (
                        <div className="text-xs text-slate-400 mt-1">
                          Topics: {attempt.topics.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {attempt.timeSpent && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-600">
                        ⏱️ {formatTime(attempt.timeSpent)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Time spent
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debug Info (only in development) */}
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-600">
        <strong>Debug Info:</strong> User ID: {currentUser?.uid} | Profile Attempts: {userProfile?.totalAttempts || 0} | Fetched: {attempts.length}
      </div>
    </div>
  );
}