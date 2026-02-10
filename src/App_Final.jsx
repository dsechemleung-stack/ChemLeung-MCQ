import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage_Fixed';
import TopicSelectionPage from './pages/TopicSelectionPage_Updated';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage_Updated_Fixed';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage_Fixed';
import FirebaseTestPage from './pages/FirebaseTestPage';
import DebugDashboard from './pages/DebugDashboard';
import { useQuizData } from './hooks/useQuizData';
import { Beaker } from 'lucide-react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

function AppContent() {
  const { questions, loading, error } = useQuizData(SHEET_URL);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Beaker className="animate-bounce text-lab-blue w-12 h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-bold mb-2">Error loading questions</p>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-6">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
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
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}