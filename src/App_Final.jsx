import React from 'react';
import ForumPage from './pages/ForumPage';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage_Fixed';
import TopicSelectionPage from './pages/TopicSelectionPage_Updated';
import PracticeModeSelection from './pages/PracticeModeSelection';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage_Updated_Fixed';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage_Fixed';
import MistakeNotebookPage from './pages/MistakeNotebookPage';
import FirebaseTestPage from './pages/FirebaseTestPage';
import DebugDashboard from './pages/DebugDashboard';
import { useQuizData } from './hooks/useQuizData';
import { Beaker } from 'lucide-react';
import ChemStore from './components/ChemStore';
import TokenLog from './components/TokenLog';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

function AppContent() {
  const location = useLocation();
  const { questions, loading, error } = useQuizData(SHEET_URL);
  const isNotebookRoute = location.pathname === '/notebook';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Beaker className="animate-bounce text-academic-gold w-12 h-12 mx-auto mb-4" />
          <p className="text-academic-slate font-semibold">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200">
          <p className="text-red-500 font-bold mb-2">Error loading questions</p>
          <p className="text-academic-slate">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className={isNotebookRoute ? '' : 'container mx-auto px-4 py-6'}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          {/* ✅ FIXED: Now passes questions prop to DashboardPage */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          {/* Practice Mode Selection - NEW */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <PracticeModeSelection questions={questions} />
              </PrivateRoute>
            }
          />
          
          {/* Legacy Topic Selection */}
          <Route
            path="/topics"
            element={
              <PrivateRoute>
                <TopicSelectionPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/quiz"
            element={
              <PrivateRoute>
                <QuizPage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/results"
            element={
              <PrivateRoute>
                <ResultsPage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/leaderboard"
            element={
              <PrivateRoute>
                <LeaderboardPage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <HistoryPage />
              </PrivateRoute>
            }
          />
          
          {/* Mistake Notebook - NEW */}
          <Route
            path="/notebook"
            element={
              <PrivateRoute>
                <MistakeNotebookPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/forum"
            element={
              <PrivateRoute>
                <ForumPage />
              </PrivateRoute>
            }
          />

          {/* ChemStore - FIXED: Now inside Routes */}
          <Route
            path="/store"
            element={
              <PrivateRoute>
                <ChemStore />
              </PrivateRoute>
            }
          />

          {/* Token Log - FIXED: Now inside Routes */}
          <Route
            path="/token-log"
            element={
              <PrivateRoute>
                <TokenLog />
              </PrivateRoute>
            }
          />

          {/* Firebase Test Page - for debugging */}
          <Route
            path="/test-firebase"
            element={
              <PrivateRoute>
                <FirebaseTestPage />
              </PrivateRoute>
            }
          />
          
          {/* Debug Dashboard - comprehensive diagnostics */}
          <Route
            path="/debug"
            element={
              <PrivateRoute>
                <DebugDashboard />
              </PrivateRoute>
            }
          />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <AppContent />
          </div>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}