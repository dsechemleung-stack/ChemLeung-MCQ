import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Beaker, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError('Failed to log in. Please check your credentials.');
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
            <div className="bg-lab-blue p-4 rounded-2xl shadow-lg">
              <Beaker className="text-white" size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-lab-blue mb-2">
            Chemistry HKDSE MCQ
          </h1>
          <p className="text-slate-600">Sign in to track your progress</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-lab-blue p-6 text-center">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <LogIn size={24} />
              Login
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

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
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
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
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-lab-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Login
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-lab-blue font-bold hover:underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}