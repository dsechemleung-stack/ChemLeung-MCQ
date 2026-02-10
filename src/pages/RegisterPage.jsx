import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Beaker, Mail, Lock, User, UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    if (displayName.trim().length < 2) {
      return setError('Please enter your full name');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, displayName);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-md w-full">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-chemistry-green p-4 rounded-2xl shadow-lg">
              <Beaker className="text-white" size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-lab-blue mb-2">
            Chemistry HKDSE MCQ
          </h1>
          <p className="text-slate-600">Create your account to get started</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-chemistry-green p-6 text-center">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <UserPlus size={24} />
              Register
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Display Name Field */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-chemistry-green focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-chemistry-green focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-chemistry-green focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-chemistry-green focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-chemistry-green text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-lab-blue font-bold hover:underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}