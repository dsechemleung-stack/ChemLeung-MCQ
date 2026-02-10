import { doc, setDoc, collection, addDoc, updateDoc, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const quizService = {
  // Save a quiz attempt
  async saveAttempt(userId, attemptData) {
    try {
      const attemptRef = await addDoc(collection(db, 'attempts'), {
        userId: userId,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0], // For daily grouping
        score: attemptData.score,
        totalQuestions: attemptData.totalQuestions,
        correctAnswers: attemptData.correctAnswers,
        percentage: attemptData.percentage,
        topics: attemptData.topics,
        timeSpent: attemptData.timeSpent || null,
        questionTimes: attemptData.questionTimes || null,
        answers: attemptData.answers || null
      });

      // Update user statistics
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalAttempts: increment(1),
        totalQuestions: increment(attemptData.totalQuestions),
        totalCorrect: increment(attemptData.correctAnswers),
        lastAttemptDate: new Date().toISOString()
      });

      return attemptRef.id;
    } catch (error) {
      console.error('Error saving attempt:', error);
      throw error;
    }
  },

  // Get user's attempt history
  async getUserAttempts(userId, limitCount = 20) {
    try {
      const q = query(
        collection(db, 'attempts'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const attempts = [];
      querySnapshot.forEach((doc) => {
        attempts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return attempts;
    } catch (error) {
      console.error('Error getting user attempts:', error);
      throw error;
    }
  },

  // Get weekly leaderboard
  async getWeeklyLeaderboard(limitCount = 10) {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      const q = query(
        collection(db, 'attempts'),
        where('timestamp', '>=', weekAgoISO),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      
      // Group by user and calculate averages
      const userScores = new Map();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        
        if (!userScores.has(userId)) {
          userScores.set(userId, {
            userId: userId,
            attempts: [],
            totalScore: 0,
            totalQuestions: 0,
            totalCorrect: 0
          });
        }
        
        const userScore = userScores.get(userId);
        userScore.attempts.push(data);
        userScore.totalScore += data.percentage;
        userScore.totalQuestions += data.totalQuestions;
        userScore.totalCorrect += data.correctAnswers;
      });

      // Calculate averages and get user details
      const leaderboardPromises = Array.from(userScores.values()).map(async (userScore) => {
        const userDoc = await getDoc(doc(db, 'users', userScore.userId));
        const userData = userDoc.data();
        
        return {
          userId: userScore.userId,
          displayName: userData?.displayName || 'Unknown',
          attemptCount: userScore.attempts.length,
          averageScore: Math.round(userScore.totalScore / userScore.attempts.length),
          totalQuestions: userScore.totalQuestions,
          totalCorrect: userScore.totalCorrect,
          overallPercentage: Math.round((userScore.totalCorrect / userScore.totalQuestions) * 100)
        };
      });

      const leaderboard = await Promise.all(leaderboardPromises);
      
      // Sort by average score
      leaderboard.sort((a, b) => b.averageScore - a.averageScore);
      
      return leaderboard.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting weekly leaderboard:', error);
      throw error;
    }
  },

  // Get monthly leaderboard
  async getMonthlyLeaderboard(limitCount = 10) {
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoISO = monthAgo.toISOString();

      const q = query(
        collection(db, 'attempts'),
        where('timestamp', '>=', monthAgoISO),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      
      // Group by user and calculate averages
      const userScores = new Map();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        
        if (!userScores.has(userId)) {
          userScores.set(userId, {
            userId: userId,
            attempts: [],
            totalScore: 0,
            totalQuestions: 0,
            totalCorrect: 0
          });
        }
        
        const userScore = userScores.get(userId);
        userScore.attempts.push(data);
        userScore.totalScore += data.percentage;
        userScore.totalQuestions += data.totalQuestions;
        userScore.totalCorrect += data.correctAnswers;
      });

      // Calculate averages and get user details
      const leaderboardPromises = Array.from(userScores.values()).map(async (userScore) => {
        const userDoc = await getDoc(doc(db, 'users', userScore.userId));
        const userData = userDoc.data();
        
        return {
          userId: userScore.userId,
          displayName: userData?.displayName || 'Unknown',
          attemptCount: userScore.attempts.length,
          averageScore: Math.round(userScore.totalScore / userScore.attempts.length),
          totalQuestions: userScore.totalQuestions,
          totalCorrect: userScore.totalCorrect,
          overallPercentage: Math.round((userScore.totalCorrect / userScore.totalQuestions) * 100)
        };
      });

      const leaderboard = await Promise.all(leaderboardPromises);
      
      // Sort by average score
      leaderboard.sort((a, b) => b.averageScore - a.averageScore);
      
      return leaderboard.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting monthly leaderboard:', error);
      throw error;
    }
  },

  // Get all-time leaderboard
  async getAllTimeLeaderboard(limitCount = 10) {
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const users = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.totalAttempts > 0) {
          users.push({
            userId: doc.id,
            displayName: data.displayName || 'Unknown',
            totalAttempts: data.totalAttempts || 0,
            totalQuestions: data.totalQuestions || 0,
            totalCorrect: data.totalCorrect || 0,
            overallPercentage: data.totalQuestions > 0 
              ? Math.round((data.totalCorrect / data.totalQuestions) * 100)
              : 0
          });
        }
      });

      // Sort by overall percentage
      users.sort((a, b) => b.overallPercentage - a.overallPercentage);
      
      return users.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting all-time leaderboard:', error);
      throw error;
    }
  }
};