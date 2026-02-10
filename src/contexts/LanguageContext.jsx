import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

// Translation dictionary
const translations = {
  en: {
    // Branding
    appName: "ChemLeung HKDSE MCQ Practice Platform",
    tagline: "HKDSE Chemistry Practice",
    
    // Navigation
    nav: {
      dashboard: "Dashboard",
      practice: "Practice",
      leaderboard: "Leaderboard",
      history: "History",
      profile: "Profile",
      logout: "Logout",
    },
    
    // Dashboard
    dashboard: {
      welcomeBack: "Welcome back",
      totalAttempts: "Total Attempts",
      overallAccuracy: "Overall Accuracy",
      questionsSolved: "Questions Solved",
      correctAnswers: "Correct Answers",
      studyStreak: "Study Streak",
      days: "days",
      startNewQuiz: "Start New Quiz",
      viewLeaderboard: "View Leaderboard",
      recentAttempts: "Recent Attempts",
      noAttempts: "No attempts yet!",
      takeFirstQuiz: "Take Your First Quiz",
    },
    
    // Practice Modes
    practice: {
      selectMode: "Select Practice Mode",
      timed: "Timed Practice",
      timedDesc: "Race against the clock - {minutes} minutes",
      marathon: "Marathon Mode",
      marathonDesc: "Unlimited time - track your progress",
      custom: "Custom Session",
      customDesc: "Choose topics and question count",
      startPractice: "Start Practice",
    },
    
    // Quiz Interface
    quiz: {
      question: "Question",
      of: "of",
      flagQuestion: "Flag Question",
      unflagQuestion: "Unflag Question",
      periodicTable: "Periodic Table",
      overview: "Overview",
      previous: "Previous",
      next: "Next",
      submit: "Submit",
      answered: "Answered",
      flagged: "Flagged",
      skipped: "Skipped",
      timeRemaining: "Time Remaining",
      sessionTime: "Session Time",
    },
    
    // Results
    results: {
      yourPerformance: "Your Performance",
      totalTime: "Total Time",
      averagePerQuestion: "Average per MCQ",
      strengths: "Strengths",
      needsFocus: "Needs Focus",
      detailedReview: "Detailed Review",
      yourAnswer: "Your Answer",
      correctAnswer: "Correct Answer",
      explanation: "Explanation",
      shareReport: "Share Report Card",
      addToNotebook: "Add to Mistake Notebook",
      startNewSession: "Start New Session",
    },
    
    // Profile
    profile: {
      profileSettings: "Profile Settings",
      yourStatistics: "Your Statistics",
      displayName: "Display Name",
      email: "Email Address",
      schoolLevel: "School Level (Form)",
      studyLevel: "Current Study Level",
      memberSince: "Member Since",
      saveChanges: "Save Changes",
      topicExceptions: "Topic Exceptions",
      unlockTopic: "Unlock Topic",
      lockTopic: "Lock Topic",
    },
    
    // Leaderboard
    leaderboard: {
      title: "Leaderboard",
      thisWeek: "This Week",
      thisMonth: "This Month",
      allTime: "All Time",
      you: "You",
      attempts: "attempts",
      questions: "questions",
    },
    
    // Forum
    forum: {
      title: "The MCQ Forum",
      discuss: "Discuss",
      addComment: "Add Comment",
      editComment: "Edit Comment",
      deleteComment: "Delete Comment",
      noComments: "No comments yet. Be the first to discuss!",
      loading: "Loading discussion...",
    },
    
    // Mistake Notebook
    notebook: {
      title: "Mistake Notebook",
      review: "Review Mistakes",
      practiceMistakes: "Practice Mistakes Only",
      cleared: "All mistakes cleared!",
      addedToNotebook: "Added to Mistake Notebook",
      removedFromNotebook: "Removed from Notebook",
    },
    
    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      retry: "Retry",
      backToTopics: "Back to Topics",
    },
    
    // Authentication
    auth: {
      login: "Login",
      register: "Register",
      email: "Email Address",
      password: "Password",
      confirmPassword: "Confirm Password",
      fullName: "Full Name",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      loginHere: "Login here",
      registerHere: "Register here",
    },
  },
  
  zh: {
    // 品牌
    appName: "ChemLeung HKDSE MCQ 練習平台",
    tagline: "HKDSE 化學練習",
    
    // 導航
    nav: {
      dashboard: "儀表板",
      practice: "練習",
      leaderboard: "排行榜",
      history: "歷史記錄",
      profile: "個人資料",
      logout: "登出",
    },
    
    // 儀表板
    dashboard: {
      welcomeBack: "歡迎回來",
      totalAttempts: "總測驗次數",
      overallAccuracy: "整體準確率",
      questionsSolved: "已完成題目",
      correctAnswers: "正確答案",
      studyStreak: "連續學習天數",
      days: "天",
      startNewQuiz: "開始新測驗",
      viewLeaderboard: "查看排行榜",
      recentAttempts: "最近測驗",
      noAttempts: "尚未進行測驗！",
      takeFirstQuiz: "開始您的第一個測驗",
    },
    
    // 練習模式
    practice: {
      selectMode: "選擇練習模式",
      timed: "限時練習",
      timedDesc: "與時間競賽 - {minutes} 分鐘",
      marathon: "馬拉松模式",
      marathonDesc: "無限時間 - 追蹤您的進度",
      custom: "自定義練習",
      customDesc: "選擇主題和題目數量",
      startPractice: "開始練習",
    },
    
    // 測驗介面
    quiz: {
      question: "題目",
      of: "共",
      flagQuestion: "標記題目",
      unflagQuestion: "取消標記",
      periodicTable: "元素週期表",
      overview: "總覽",
      previous: "上一題",
      next: "下一題",
      submit: "提交",
      answered: "已答",
      flagged: "已標記",
      skipped: "跳過",
      timeRemaining: "剩餘時間",
      sessionTime: "練習時間",
    },
    
    // 成績
    results: {
      yourPerformance: "您的表現",
      totalTime: "總時間",
      averagePerQuestion: "每題平均時間",
      strengths: "優勢領域",
      needsFocus: "需要加強",
      detailedReview: "詳細檢討",
      yourAnswer: "您的答案",
      correctAnswer: "正確答案",
      explanation: "解釋",
      shareReport: "分享成績單",
      addToNotebook: "加入錯題簿",
      startNewSession: "開始新練習",
    },
    
    // 個人資料
    profile: {
      profileSettings: "個人設定",
      yourStatistics: "您的統計資料",
      displayName: "顯示名稱",
      email: "電郵地址",
      schoolLevel: "年級（中學）",
      studyLevel: "當前學習程度",
      memberSince: "註冊日期",
      saveChanges: "儲存變更",
      topicExceptions: "主題例外",
      unlockTopic: "解鎖主題",
      lockTopic: "鎖定主題",
    },
    
    // 排行榜
    leaderboard: {
      title: "排行榜",
      thisWeek: "本週",
      thisMonth: "本月",
      allTime: "歷史總榜",
      you: "您",
      attempts: "次測驗",
      questions: "題",
    },
    
    // 論壇
    forum: {
      title: "MCQ 討論區",
      discuss: "討論",
      addComment: "新增評論",
      editComment: "編輯評論",
      deleteComment: "刪除評論",
      noComments: "尚無評論。成為第一個討論的人！",
      loading: "載入討論中...",
    },
    
    // 錯題簿
    notebook: {
      title: "錯題簿",
      review: "檢討錯題",
      practiceMistakes: "只練習錯題",
      cleared: "所有錯題已清除！",
      addedToNotebook: "已加入錯題簿",
      removedFromNotebook: "已從錯題簿移除",
    },
    
    // 通用
    common: {
      loading: "載入中...",
      error: "錯誤",
      success: "成功",
      confirm: "確認",
      cancel: "取消",
      save: "儲存",
      delete: "刪除",
      edit: "編輯",
      close: "關閉",
      retry: "重試",
      backToTopics: "返回主題選擇",
    },
    
    // 認證
    auth: {
      login: "登入",
      register: "註冊",
      email: "電郵地址",
      password: "密碼",
      confirmPassword: "確認密碼",
      fullName: "全名",
      createAccount: "建立帳戶",
      alreadyHaveAccount: "已有帳戶？",
      dontHaveAccount: "還沒有帳戶？",
      loginHere: "在此登入",
      registerHere: "在此註冊",
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Load saved language preference or default to English
    return localStorage.getItem('chemleung_language') || 'en';
  });

  useEffect(() => {
    // Save language preference
    localStorage.setItem('chemleung_language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  };

  // Helper for interpolation
  const tf = (key, params = {}) => {
    let text = t(key);
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    tf,
    isEnglish: language === 'en',
    isChinese: language === 'zh',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}