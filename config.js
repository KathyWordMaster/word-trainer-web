// ========== 数据库配置 ==========
const SUPABASE_URL ='https://kcjocbevzzcwltywcdzv.supabase.co'
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjam9jYmV2enpjd2x0eXdjZHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjQ0NjYsImV4cCI6MjA4NzI0MDQ2Nn0.T2eGltslY2-Vc67eIGhIO2nz52rbvH3wUMEsJZWhgPw"
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== 全局状态 ==========
const appState = {
    currentUser: null,
    isTeacher: false,
    userId: null,
    userWords: [],
    trainingWords: [],
    currentWordIndex: 0,
    isCardFlipped: false,
    teacherId: 'kathy151',
    selectedGroupId: null,
    selectedWords: [],
    dailyTrainingProgress: 0,
    lastTrainingDate: null
};

// ========== 新增：连接状态和配置 ==========
const connectionState = {
    isOnline: navigator.onLine,
    retryCount: 0,
    maxRetries: 3,
    retryDelay: 2000,
    isLoading: false,
    lastError: null,
    isOfflineMode: false,
    connectionCheckInterval: null
};

// ========== 新增：打卡系统相关变量 ==========
const clockInSystem = {
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    todayClockedIn: false,
    selectedTaskMode: 0, // 0=标准模式, 1=复习模式, 2=额外新词模式
    isReviewDay: false,
    dailyTask: null,
    reviewPlans: [],
    // 倒计时相关
    countdownStartTime: null,
    countdownInterval: null,
    countdownTimeLeft: 15 * 60, // 15分钟，单位秒
    countdownElement: null
};