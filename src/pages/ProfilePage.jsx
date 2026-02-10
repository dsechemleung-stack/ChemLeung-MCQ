import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, GraduationCap, Mail, Calendar, Save, ArrowLeft, Trophy, Target } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [level, setLevel] = useState(userProfile?.level || 'S5');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: displayName
      });

      // Update Firestore user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        level: level,
        updatedAt: new Date().toISOString()
      });

      // Reload user profile
      await loadUserProfile(currentUser.uid);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    }

    setSaving(false);
  }

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };

  const overallAccuracy = userProfile?.totalQuestions > 0
    ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100)
    : 0;

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
        
        <div className="flex-1 bg-gradient-to-r from-lab-blue to-blue-700 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <User size={32} />
            Profile Settings
          </h1>
          <p className="text-blue-100 mt-1">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Your Statistics</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-lab-blue" size={20} />
              <span className="text-sm font-semibold text-slate-600">Total Attempts</span>
            </div>
            <div className="text-3xl font-black text-lab-blue">
              {userProfile?.totalAttempts || 0}
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-chemistry-green" size={20} />
              <span className="text-sm font-semibold text-slate-600">Overall Accuracy</span>
            </div>
            <div className="text-3xl font-black text-chemistry-green">
              {overallAccuracy}%
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="text-purple-600" size={20} />
              <span className="text-sm font-semibold text-slate-600">Questions Solved</span>
            </div>
            <div className="text-3xl font-black text-purple-600">
              {userProfile?.totalQuestions || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Account Information</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Success/Error Message */}
          {message.text && (
            <div className={`p-4 rounded-lg border-2 ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-semibold">{message.text}</p>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <User size={16} />
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="Enter your name"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email Address
            </label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>

          {/* School Level */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <GraduationCap size={16} />
              School Level (Form)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['S4', 'S5', 'S6'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`py-3 rounded-xl border-2 font-bold transition-all ${
                    level === lvl
                      ? 'border-lab-blue bg-blue-50 text-lab-blue'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Select your current form (Secondary 4, 5, or 6)
            </p>
          </div>

          {/* Account Created Date */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Member Since
            </label>
            <div className="px-4 py-3 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold">
              {formatDate(userProfile?.createdAt)}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-lab-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}