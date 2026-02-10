import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizService } from '../services/quizService';
import { Trophy, Medal, Award, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      let data;
      switch (activeTab) {
        case 'weekly':
          data = await quizService.getWeeklyLeaderboard(20);
          break;
        case 'monthly':
          data = await quizService.getMonthlyLeaderboard(20);
          break;
        case 'alltime':
          data = await quizService.getAllTimeLeaderboard(20);
          break;
        default:
          data = [];
      }
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
    setLoading(false);
  }

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Trophy className="text-yellow-500" size={24} />;
      case 2:
        return <Medal className="text-slate-400" size={24} />;
      case 3:
        return <Award className="text-amber-600" size={24} />;
      default:
        return <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{rank}</div>;
    }
  };

  const getRankBadge = (rank) => {
    switch(rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
      default:
        return 'bg-white border-2 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Trophy size={32} />
            Leaderboard
          </h1>
          <p className="text-orange-100 mt-1">
            See how you rank against other students
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'weekly'
                ? 'bg-lab-blue text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={18} />
            This Week
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'monthly'
                ? 'bg-lab-blue text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={18} />
            This Month
          </button>
          <button
            onClick={() => setActiveTab('alltime')}
            className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'alltime'
                ? 'bg-lab-blue text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Trophy size={18} />
            All Time
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue"></div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No data available yet</p>
              <p className="text-slate-500 text-sm mt-2">
                Be the first to complete a quiz!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = entry.userId === currentUser?.uid;

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                      getRankBadge(rank)
                    } ${isCurrentUser ? 'ring-4 ring-chemistry-green ring-offset-2' : ''}`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10">
                      {getRankIcon(rank)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg truncate flex items-center gap-2">
                        {entry.displayName}
                        {isCurrentUser && (
                          <span className="text-xs bg-chemistry-green text-white px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className={`text-sm ${rank <= 3 ? 'text-white text-opacity-80' : 'text-slate-500'}`}>
                        {activeTab === 'alltime' 
                          ? `${entry.totalAttempts} attempts • ${entry.totalQuestions} questions`
                          : `${entry.attemptCount} attempts • ${entry.totalQuestions} questions`
                        }
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-3xl font-black ${rank <= 3 ? '' : 'text-lab-blue'}`}>
                        {activeTab === 'alltime' 
                          ? entry.overallPercentage
                          : entry.averageScore
                        }%
                      </div>
                      <div className={`text-xs ${rank <= 3 ? 'text-white text-opacity-70' : 'text-slate-500'}`}>
                        {entry.totalCorrect}/{entry.totalQuestions}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">📊 How rankings work:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li><strong>This Week:</strong> Average score from all attempts in the last 7 days</li>
          <li><strong>This Month:</strong> Average score from all attempts in the last 30 days</li>
          <li><strong>All Time:</strong> Overall accuracy across all attempts</li>
        </ul>
      </div>
    </div>
  );
}