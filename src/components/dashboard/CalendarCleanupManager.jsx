/**
 * Calendar Cleanup Manager Component
 * 
 * Provides UI for manual cleanup and shows cleanup statistics
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, Play, BarChart3 } from 'lucide-react';
import { calendarCleanupService } from '../../services/calendarCleanupService';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CalendarCleanupManager({ userId }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (userId) {
      loadCleanupStats();
    }
  }, [userId]);

  async function loadCleanupStats() {
    try {
      setLoading(true);
      const cleanupStats = await calendarCleanupService.getCleanupStats(userId);
      setStats(cleanupStats);
    } catch (error) {
      console.error('Error loading cleanup stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualCleanup() {
    try {
      setLoading(true);
      const result = await calendarCleanupService.cleanupUserCalendar(userId, 0);
      setCleanupResult(result);
      setShowConfirm(false);
      
      // Reload stats after cleanup
      await loadCleanupStats();
    } catch (error) {
      console.error('Error during cleanup:', error);
      alert('Cleanup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!userId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="w-4 h-4" />
          <span>Please log in to manage calendar cleanup</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Trash2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Calendar Cleanup</h3>
            <p className="text-sm text-gray-600">Auto-delete unfinished past events</p>
          </div>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || (stats?.deletable === 0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {loading ? 'Running...' : 'Run Cleanup'}
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Total Past Events</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">Unfinished</span>
            </div>
            <div className="text-2xl font-bold text-red-900">{stats.unfinished}</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">Deletable</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">{stats.deletable}</div>
          </div>
        </div>
      )}

      {/* Cleanup Rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Cleanup Rules
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">
              <strong>Always preserve:</strong> Completed events (all types)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">
              <strong>Always preserve:</strong> Major exams & small quizzes (even if past and incomplete)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-orange-600" />
            <span className="text-gray-700">
              <strong>Auto-delete:</strong> Unfinished study suggestions, spaced repetition, AI recommendations (from past days)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">
              <strong>Timing:</strong> Events from previous days (2 AM daily auto-cleanup)
            </span>
          </div>
        </div>
      </div>

      {/* Cleanup Result */}
      {cleanupResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-green-900 mb-2">Cleanup Completed</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Events deleted:</span>
              <span className="font-semibold text-green-900 ml-2">{cleanupResult.deleted}</span>
            </div>
            <div>
              <span className="text-gray-600">Events preserved:</span>
              <span className="font-semibold text-blue-900 ml-2">{cleanupResult.preserved}</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Cleanup</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            {stats && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Events to delete:</span>
                    <span className="font-semibold text-red-600">{stats.deletable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Events to preserve:</span>
                    <span className="font-semibold text-green-600">{stats.total - stats.deletable}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only unfinished study suggestions, spaced repetition, and AI recommendations from past days will be deleted. 
                Completed events, exams, and quizzes are always preserved even if they're past and incomplete.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualCleanup}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Cleaning...' : 'Delete Events'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
