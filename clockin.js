// ========== 新增：打卡系统核心函数 ==========

// 加载打卡状态
async function loadClockInStatus() {
    try {
        // 检查今日是否已打卡
        const today = new Date().toISOString().split('T')[0];
        const { data: todayRecord, error } = await dbClient
            .from('daily_checkin')
            .select('*')
            .eq('student_id', appState.currentUser)
            .eq('clock_in_date', today)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('加载打卡状态错误:', error);
            return;
        }
        
        clockInSystem.todayClockedIn = !!todayRecord?.is_clock_in;
        
        // 更新UI显示
        updateClockInUI();
        
        // 获取连续打卡天数
        await loadConsecutiveDays();
        
    } catch (error) {
        console.error('加载打卡状态错误:', error);
    }
}

// 更新打卡UI
function updateClockInUI() {
    const clockInStatus = document.getElementById('clock-in-status');
    if (!clockInStatus) return;
    
    if (clockInSystem.todayClockedIn) {
        clockInStatus.innerHTML = '✅ 今日已打卡';
        clockInStatus.style.background = '#4CAF50';
    } else {
        clockInStatus.innerHTML = '📅 今日未打卡';
        clockInStatus.style.background = '#FF9800';
    }
    
    // 更新连续天数显示
    const consecutiveDaysEl = document.getElementById('consecutive-days');
    if (consecutiveDaysEl) {
        consecutiveDaysEl.textContent = clockInSystem.currentStreak;
    }
}

// 加载连续打卡天数
async function loadConsecutiveDays() {
    try {
        // 获取所有打卡记录
        const { data: records, error } = await dbClient
            .from('daily_checkin')
            .select('clock_in_date')
            .eq('student_id', appState.currentUser)
            .eq('is_clock_in', true)
            .order('clock_in_date', { ascending: false });
        
        if (error) throw error;
        
        if (!records || records.length === 0) {
            clockInSystem.currentStreak = 0;
            clockInSystem.totalDays = 0;
            updateClockInUI();
            return;
        }
        
        // 计算连续打卡天数
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 检查今天是否打卡
        const todayStr = today.toISOString().split('T')[0];
        const hasToday = records.some(r => r.clock_in_date === todayStr);
        
        // 计算最长连续天数
        for (let i = 0; i < records.length - 1; i++) {
            const currentDate = new Date(records[i].clock_in_date);
            const nextDate = new Date(records[i + 1].clock_in_date);
            const diffDays = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }
        
        // 计算当前连续天数
        if (hasToday) {
            currentStreak = 1;
            let expectedDate = new Date(today);
            
            for (let i = 1; i < records.length; i++) {
                expectedDate.setDate(expectedDate.getDate() - 1);
                const expectedStr = expectedDate.toISOString().split('T')[0];
                
                if (records[i]?.clock_in_date === expectedStr) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        
        clockInSystem.currentStreak = currentStreak;
        clockInSystem.longestStreak = longestStreak + 1; // 加1因为起始为0
        clockInSystem.totalDays = records.length;
        
        // 检查是否是第7天（复习日）
        clockInSystem.isReviewDay = (currentStreak % 7 === 0);
        
        updateClockInUI();
        
    } catch (error) {
        console.error('计算连续打卡天数错误:', error);
    }
}

// 每日打卡
async function dailyClockIn() {
    if (clockInSystem.todayClockedIn) {
        showAlert('今天已经打过卡了！', 'info');
        return;
    }
    
    showAlert('正在生成今日任务...', 'info');
    
    // 显示任务选择页面
    showDailyTaskPage();
}

// 显示每日任务页面
function showDailyTaskPage() {
    showScreen('daily-task-screen');
    loadDailyTaskPage();
}

// 加载每日任务页面
function loadDailyTaskPage() {
    // 更新连续天数显示
    const consecutiveTaskDaysEl = document.getElementById('consecutive-task-days');
    if (consecutiveTaskDaysEl) {
        consecutiveTaskDaysEl.textContent = clockInSystem.currentStreak;
    }
    
    // 检查是否是复习日
    const reviewDayNotice = document.getElementById('review-day-notice');
    if (reviewDayNotice) {
        reviewDayNotice.style.display = clockInSystem.isReviewDay ? 'block' : 'none';
    }
    
    // 重置模式选择
    clockInSystem.selectedTaskMode = 0;
    selectTaskMode(0);
    
    // 生成任务预览
    generateTaskPreview();
}

// 选择任务模式
function selectTaskMode(mode) {
    clockInSystem.selectedTaskMode = mode;
    
    // 更新按钮样式
    ['mode-standard', 'mode-review', 'mode-extra'].forEach((id, index) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (index === mode) {
                btn.style.border = '3px solid #4CAF50';
                btn.style.background = '#E8F5E9';
            } else {
                btn.style.border = '2px solid #ddd';
                btn.style.background = '';
            }
        }
    });
    
    generateTaskPreview();
}

// 生成任务预览
async function generateTaskPreview() {
    const taskDetails = document.getElementById('task-details');
    if (!taskDetails) return;
    
    // 根据模式生成任务描述
    let newWords = 0;
    let reviewWords = 0;
    let description = '';
    
    if (clockInSystem.isReviewDay) {
        // 复习日，不学新单词
        newWords = 0;
        reviewWords = 20;
        description = '📅 今天是复习日！专注复习已学单词';
    } else {
        switch (clockInSystem.selectedTaskMode) {
            case 0: // 标准模式
                newWords = 10;
                reviewWords = 10;
                description = '📚 标准学习：均衡新词与复习';
                break;
            case 1: // 复习模式
                newWords = 0;
                reviewWords = 20;
                description = '🔄 专注复习：巩固已学单词';
                break;
            case 2: // 额外新词模式
                newWords = 20;
                reviewWords = 0;
                description = '✨ 拓展新词：快速扩充词汇量';
                break;
        }
    }
    
    // 智能选择单词
    const taskWords = await selectSmartWords(newWords, reviewWords);
    
    // 保存任务
    clockInSystem.dailyTask = {
        mode: clockInSystem.selectedTaskMode,
        newWords: newWords,
        reviewWords: reviewWords,
        isReviewDay: clockInSystem.isReviewDay,
        words: taskWords,
        description: description
    };
    
    // 显示任务详情
    taskDetails.innerHTML = `
        <div class="stats-card">
            <h4 style="color: #333; margin-bottom: 15px;">${description}</h4>
            <div class="card-grid">
                <div class="stat-card">
                    <div class="number">${newWords}</div>
                    <div class="label">新单词</div>
                </div>
                <div class="stat-card">
                    <div class="number">${reviewWords}</div>
                    <div class="label">复习单词</div>
                </div>
                <div class="stat-card">
                    <div class="number">${newWords + reviewWords}</div>
                    <div class="label">总计</div>
                </div>
            </div>
            
            ${taskWords.newWords.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h5 style="color: #333; margin-bottom: 10px;">📖 新单词列表</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${taskWords.newWords.slice(0, 5).map(word => `
                            <div style="background: #E3F2FD; padding: 8px 12px; border-radius: 8px; font-size: 14px;">
                                ${word.english}
                            </div>
                        `).join('')}
                        ${taskWords.newWords.length > 5 ? `<div style="color: #666; padding: 8px;">...等 ${taskWords.newWords.length} 个单词</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${taskWords.reviewWords.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h5 style="color: #333; margin-bottom: 10px;">🔄 复习单词列表</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${taskWords.reviewWords.slice(0, 5).map(word => `
                            <div style="background: #E8F5E9; padding: 8px 12px; border-radius: 8px; font-size: 14px;">
                                ${word.english}
                            </div>
                        `).join('')}
                        ${taskWords.reviewWords.length > 5 ? `<div style="color: #666; padding: 8px;">...等 ${taskWords.reviewWords.length} 个单词</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding: 15px; background: #FFF3CD; border-radius: 10px;">
                <p style="color: #856404; margin: 0;">
                    💡 提示：完成今日任务可获得 ${clockInSystem.currentStreak + 1} 天连续打卡记录！
                    ${clockInSystem.currentStreak + 1 >= 7 ? '🎉 即将获得7天奖励！' : ''}
                </p>
            </div>
        </div>
    `;
}

// 智能选择单词
async function selectSmartWords(newWordCount, reviewWordCount) {
    try {
        const result = {
            newWords: [],
            reviewWords: []
        };
        
        // 获取学生单词
        const { data: allWords, error } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', appState.currentUser);
        
        if (error) throw error;
        
        if (!allWords || allWords.length === 0) {
            return result;
        }
        
        // 按状态分类单词
        const newWords = allWords.filter(w => w.status === 'new');
        const learningWords = allWords.filter(w => w.status === 'learning');
        const masteredWords = allWords.filter(w => w.status === 'mastered');
        
        // 选择新单词（从未学过的）
        if (newWordCount > 0) {
            // 选择status=new且score=0的单词
            let newWordsWithZeroScore = allWords.filter(w => w.status === 'new' && (w.score === 0 || w.score === undefined));
            
            // 如果不够，从所有new状态的单词中补充
            if (newWordsWithZeroScore.length < newWordCount) {
                const additionalNewWords = newWords.filter(w => !newWordsWithZeroScore.includes(w));
                newWordsWithZeroScore = [...newWordsWithZeroScore, ...additionalNewWords];
            }
            
            // 随机选择
            const shuffledNew = [...newWordsWithZeroScore].sort(() => Math.random() - 0.5);
            result.newWords = shuffledNew.slice(0, newWordCount);
        }
        
        // 选择复习单词
        if (reviewWordCount > 0) {
            let reviewCandidates = [];
            
            // 标准模式：选择score大于0的单词，按score从低到高排序
            if (clockInSystem.selectedTaskMode === 0 && !clockInSystem.isReviewDay) {
                // 选择score大于0的单词
                let scoreGreaterThanZero = allWords.filter(w => (w.score || 0) > 0);
                
                // 按score从低到高排序
                scoreGreaterThanZero.sort((a, b) => (a.score || 0) - (b.score || 0));
                
                // 如果不够，从所有单词中补充（排除已选的新单词）
                if (scoreGreaterThanZero.length < reviewWordCount) {
                    const selectedNewWordIds = new Set(result.newWords.map(w => w.id || w.word_id));
                    const additionalWords = allWords.filter(w => {
                        const id = w.id || w.word_id;
                        return !selectedNewWordIds.has(id);
                    });
                    scoreGreaterThanZero = [...scoreGreaterThanZero, ...additionalWords];
                }
                
                // 选择前reviewWordCount个
                reviewCandidates = scoreGreaterThanZero.slice(0, reviewWordCount);
            } else {
                // 如果单词总数超过100，限制熟悉单词数量
                const maxLearningReview = allWords.length > 100 ? 8 : 20;
                
                // 根据艾宾浩斯记忆曲线选择
                if (clockInSystem.isReviewDay) {
                    // 复习日：按权重选择
                    // 没印象（45%）、熟悉（40%）、已掌握（15%）
                    const needReview = Math.floor(reviewWordCount * 0.45);
                    const learningReview = Math.floor(reviewWordCount * 0.40);
                    const masteredReview = reviewWordCount - needReview - learningReview;
                    
                    // 没印象单词
                    const shuffledNeed = [...newWords].sort(() => Math.random() - 0.5);
                    reviewCandidates = reviewCandidates.concat(shuffledNeed.slice(0, needReview));
                    
                    // 熟悉单词
                    const shuffledLearning = [...learningWords].sort(() => Math.random() - 0.5);
                    reviewCandidates = reviewCandidates.concat(shuffledLearning.slice(0, Math.min(learningReview, maxLearningReview)));
                    
                    // 已掌握单词（选择最近学习的）
                    const recentMastered = [...masteredWords]
                        .sort((a, b) => new Date(b.last_reviewed || 0) - new Date(a.last_reviewed || 0))
                        .slice(0, masteredReview);
                    reviewCandidates = reviewCandidates.concat(recentMastered);
                    
                    // 去重
                    const seenIds = new Set();
                    reviewCandidates = reviewCandidates.filter(word => {
                        const id = word.id || word.word_id;
                        if (!seenIds.has(id)) {
                            seenIds.add(id);
                            return true;
                        }
                        return false;
                    });
                    
                    // 如果不够，从所有单词中补充（排除已选的）
                    if (reviewCandidates.length < reviewWordCount) {
                        const selectedIds = new Set(reviewCandidates.map(w => w.id || w.word_id));
                        const additionalWords = allWords.filter(w => {
                            const id = w.id || w.word_id;
                            return !selectedIds.has(id);
                        }).sort(() => Math.random() - 0.5);
                        
                        const neededCount = reviewWordCount - reviewCandidates.length;
                        reviewCandidates = [...reviewCandidates, ...additionalWords.slice(0, neededCount)];
                    }
                    
                } else {
                    // 普通日：优先复习最近学习的和记忆薄弱的
                    // 组合各种状态的单词
                    const allForReview = [...learningWords, ...masteredWords, ...newWords];
                    
                    // 智能排序：根据复习次数、最后复习时间、状态
                    allForReview.sort((a, b) => {
                        // 未掌握的优先
                        if (a.status === 'new' && b.status !== 'new') return -1;
                        if (a.status !== 'new' && b.status === 'new') return 1;
                        
                        // 复习次数少的优先
                        if ((a.review_count || 0) !== (b.review_count || 0)) {
                            return (a.review_count || 0) - (b.review_count || 0);
                        }
                        
                        // 最后复习时间早的优先
                        const aDate = a.last_reviewed ? new Date(a.last_reviewed) : new Date(0);
                        const bDate = b.last_reviewed ? new Date(b.last_reviewed) : new Date(0);
                        return aDate - bDate;
                    });
                    
                    // 限制熟悉单词数量
                    const learningSelected = allForReview.filter(w => w.status === 'learning').slice(0, maxLearningReview);
                    const others = allForReview.filter(w => w.status !== 'learning');
                    const combined = [...learningSelected, ...others];
                    
                    reviewCandidates = combined.slice(0, reviewWordCount);
                }
            }
            
            // 去重
            const seenIds = new Set();
            result.reviewWords = reviewCandidates.filter(word => {
                const id = word.id || word.word_id;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    return true;
                }
                return false;
            }).slice(0, reviewWordCount);
        }
        
        return result;
        
    } catch (error) {
        console.error('智能选择单词错误:', error);
        return { newWords: [], reviewWords: [] };
    }
}

// 开始每日任务
function startDailyTask() {
    if (!clockInSystem.dailyTask || !clockInSystem.dailyTask.words) {
        showAlert('请先生成任务', 'error');
        return;
    }
    
    // 合并所有单词开始训练
    const allWords = [
        ...clockInSystem.dailyTask.words.newWords,
        ...clockInSystem.dailyTask.words.reviewWords
    ];
    
    if (allWords.length === 0) {
        showAlert('没有找到合适的单词进行训练', 'info');
        return;
    }
    
    // 打乱顺序
    const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
    
    // 设置训练状态
    appState.trainingWords = shuffledWords;
    appState.currentWordIndex = 0;
    appState.isCardFlipped = false;
    
    // 开始训练（显示训练页面）
    startTrainingSession();
    
    // 延迟启动倒计时，确保训练页面已经显示
    setTimeout(startCountdown, 100);
}

// 启动倒计时
function startCountdown() {
    // 重置倒计时
    clockInSystem.countdownStartTime = new Date();
    clockInSystem.countdownTimeLeft = 15 * 60; // 15分钟，单位秒
    
    // 停止之前的倒计时
    if (clockInSystem.countdownInterval) {
        clearInterval(clockInSystem.countdownInterval);
    }
    
    // 移除之前的倒计时元素
    const oldCountdown = document.getElementById('countdown-timer');
    if (oldCountdown) {
        oldCountdown.remove();
    }
    
    // 创建新的倒计时元素
    const countdownElement = document.createElement('div');
    countdownElement.id = 'countdown-timer';
    countdownElement.style.position = 'fixed';
    countdownElement.style.top = '20px';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translateX(-50%)';
    countdownElement.style.zIndex = '1000';
    countdownElement.style.padding = '8px 16px';
    countdownElement.style.background = '#FF9800';
    countdownElement.style.color = 'white';
    countdownElement.style.border = 'none';
    countdownElement.style.borderRadius = '10px';
    countdownElement.style.fontWeight = 'bold';
    countdownElement.style.fontSize = '14px';
    countdownElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    // 添加到页面
    document.body.appendChild(countdownElement);
    clockInSystem.countdownElement = countdownElement;
    
    // 更新倒计时显示
    updateCountdown();
    
    // 启动倒计时定时器
    clockInSystem.countdownInterval = setInterval(updateCountdown, 1000);
}

// 更新倒计时显示
function updateCountdown() {
    if (!clockInSystem.countdownElement) return;
    
    clockInSystem.countdownTimeLeft--;
    
    if (clockInSystem.countdownTimeLeft < 0) {
        clockInSystem.countdownTimeLeft = 0;
    }
    
    const minutes = Math.floor(clockInSystem.countdownTimeLeft / 60);
    const seconds = clockInSystem.countdownTimeLeft % 60;
    
    clockInSystem.countdownElement.textContent = `⏰ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 如果倒计时结束，改变颜色
    if (clockInSystem.countdownTimeLeft <= 0) {
        clockInSystem.countdownElement.style.background = '#F44336';
    }
}

// 停止倒计时并返回用时
function stopCountdown() {
    if (clockInSystem.countdownInterval) {
        clearInterval(clockInSystem.countdownInterval);
        clockInSystem.countdownInterval = null;
    }
    
    if (clockInSystem.countdownElement) {
        clockInSystem.countdownElement.remove();
        clockInSystem.countdownElement = null;
    }
    
    // 计算用时（秒）
    if (clockInSystem.countdownStartTime) {
        const endTime = new Date();
        const elapsedSeconds = Math.floor((endTime - clockInSystem.countdownStartTime) / 1000);
        return elapsedSeconds;
    }
    return 0;
}

// 完成训练后的打卡记录
async function recordClockInAfterTraining() {
    try {
        // 停止倒计时并计算用时
        const elapsedSeconds = stopCountdown();
        const totalWords = appState.trainingWords.length;
        
        // 计算用时信息
        const expectedSeconds = 15 * 60; // 15分钟
        let timeMessage = '';
        if (elapsedSeconds < expectedSeconds) {
            const earlyMinutes = Math.floor((expectedSeconds - elapsedSeconds) / 60);
            const earlySeconds = (expectedSeconds - elapsedSeconds) % 60;
            timeMessage = `提前 ${earlyMinutes}分${earlySeconds}秒完成！`;
        } else {
            const overtimeMinutes = Math.floor((elapsedSeconds - expectedSeconds) / 60);
            const overtimeSeconds = (elapsedSeconds - expectedSeconds) % 60;
            timeMessage = `超时 ${overtimeMinutes}分${overtimeSeconds}秒完成！`;
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // 统计新单词和复习单词数量
        let newWordCount = 0;
        let reviewWordCount = 0;
        
        // 这里简化统计，实际应该根据单词状态变化来统计
        if (clockInSystem.dailyTask && clockInSystem.dailyTask.words) {
            newWordCount = clockInSystem.dailyTask.words.newWords.length;
            reviewWordCount = clockInSystem.dailyTask.words.reviewWords.length;
        } else {
            // 如果没有任务信息，简单估算
            newWordCount = Math.floor(totalWords * 0.5);
            reviewWordCount = totalWords - newWordCount;
        }
        
        // 创建或更新打卡记录
        const { data: existingRecord, error: checkError } = await dbClient
            .from('daily_checkin')
            .select('*')
            .eq('student_id', appState.currentUser)
            .eq('clock_in_date', today)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        if (existingRecord) {
            // 更新现有记录
            const { error: updateError } = await dbClient
                .from('daily_checkin')
                .update({
                    is_clock_in: true,
                    study_mode: clockInSystem.selectedTaskMode,
                    new_words_count: newWordCount,
                    review_words_count: reviewWordCount,
                    total_study_time: Math.floor(elapsedSeconds / 60), // 实际学习时间（分钟）
                    study_summary: `完成每日任务 - ${timeMessage}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingRecord.id);
            
            if (updateError) throw updateError;
            
        } else {
            // 创建新记录
            const { error: insertError } = await dbClient
                .from('daily_checkin')
                .insert([{
                    student_id: appState.currentUser,
                    clock_in_date: today,
                    is_clock_in: true,
                    study_mode: clockInSystem.selectedTaskMode,
                    new_words_count: newWordCount,
                    review_words_count: reviewWordCount,
                    total_study_time: Math.floor(elapsedSeconds / 60), // 实际学习时间（分钟）
                    study_summary: `完成每日任务 - ${timeMessage}`
                }]);
            
            if (insertError) throw insertError;
        }
        
        // 更新学习统计
        const studyTimeMinutes = Math.floor(elapsedSeconds / 60);
        await updateStudyStatistics(totalWords, newWordCount, studyTimeMinutes);
        
        // 更新日榜单
        await updateDailyLeaderboard();
        
        // 检查是否应该发放奖励
        await checkAndAwardReward();
        
        // 更新本地状态
        clockInSystem.todayClockedIn = true;
        clockInSystem.currentStreak++;
        
        // 更新UI
        updateClockInUI();
        
        showAlert(`✅ 打卡成功！学习记录已保存\n⏰ ${timeMessage}`, 'success');
        
    } catch (error) {
        console.error('记录打卡错误:', error);
        // 确保倒计时停止
        stopCountdown();
        showAlert('打卡记录失败，但学习已完成', 'warning');
    }
}

// 更新日榜单
async function updateDailyLeaderboard() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 检查是否已有今日榜单记录
        const { data: existingRecord, error: checkError } = await dbClient
            .from('daily_leaderboard')
            .select('*')
            .eq('student_id', appState.currentUser)
            .eq('leaderboard_date', today)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        // 基础分数：完成打卡获得40分
        const baseScore = 40;
        
        let qualityScore = 0;
        let improvementScore = 0;
        let stabilityBonus = 0;
        
        if (existingRecord) {
            // 保留现有分数
            qualityScore = existingRecord.quality_score || 0;
            improvementScore = existingRecord.improvement_score || 0;
            stabilityBonus = existingRecord.stability_bonus || 0;
        }
        
        const rawScore = baseScore + qualityScore + improvementScore + stabilityBonus;
        const totalScore = Math.min(rawScore, 200); // 确保不超过200分
        
        if (existingRecord) {
            // 更新现有记录
            const { error: updateError } = await dbClient
                .from('daily_leaderboard')
                .update({
                    base_score: baseScore,
                    quality_score: qualityScore,
                    improvement_score: improvementScore,
                    stability_bonus: stabilityBonus,
                    raw_score: rawScore,
                    total_score: totalScore
                })
                .eq('id', existingRecord.id);
            
            if (updateError) throw updateError;
            
        } else {
            // 创建新记录
            const { error: insertError } = await dbClient
                .from('daily_leaderboard')
                .insert([{
                    student_id: appState.currentUser,
                    leaderboard_date: today,
                    base_score: baseScore,
                    quality_score: qualityScore,
                    improvement_score: improvementScore,
                    stability_bonus: stabilityBonus,
                    raw_score: rawScore,
                    total_score: totalScore
                }]);
            
            if (insertError) throw insertError;
        }
        
        // 重新计算排名
        await calculateLeaderboardRanks(today);
        
    } catch (error) {
        console.error('更新日榜单错误:', error);
    }
}

// 计算日榜单排名
async function calculateLeaderboardRanks(date) {
    try {
        // 获取今日所有榜单记录并按总分排序
        const { data: leaderboardData, error } = await dbClient
            .from('daily_leaderboard')
            .select('id, total_score')
            .eq('leaderboard_date', date)
            .order('total_score', { ascending: false });
        
        if (error) throw error;
        
        // 更新排名
        for (let i = 0; i < leaderboardData.length; i++) {
            await dbClient
                .from('daily_leaderboard')
                .update({ rank: i + 1 })
                .eq('id', leaderboardData[i].id);
        }
        
    } catch (error) {
        console.error('计算排名错误:', error);
    }
}

// 显示日榜单
function showLeaderboard() {
    showScreen('leaderboard-screen');
    loadLeaderboard();
}

// 显示悬浮榜单
function showFloatingLeaderboard() {
    const leaderboard = document.getElementById('floating-leaderboard');
    if (leaderboard) {
        leaderboard.style.display = 'block';
        loadFloatingLeaderboard('daily');
    }
}

// 隐藏悬浮榜单
function toggleLeaderboard() {
    const leaderboard = document.getElementById('floating-leaderboard');
    if (leaderboard) {
        leaderboard.style.display = leaderboard.style.display === 'block' ? 'none' : 'block';
        if (leaderboard.style.display === 'block') {
            loadFloatingLeaderboard('daily');
        }
    }
}

// 切换日榜/周榜
function switchLeaderboard(type) {
    // 更新按钮样式
    document.querySelector('button[onclick="switchLeaderboard(\'daily\')"]').style.background = type === 'daily' ? '#4CAF50' : '#f1f1f1';
    document.querySelector('button[onclick="switchLeaderboard(\'daily\')"]').style.color = type === 'daily' ? 'white' : '#333';
    document.querySelector('button[onclick="switchLeaderboard(\'weekly\')"]').style.background = type === 'weekly' ? '#4CAF50' : '#f1f1f1';
    document.querySelector('button[onclick="switchLeaderboard(\'weekly\')"]').style.color = type === 'weekly' ? 'white' : '#333';
    
    // 加载对应榜单
    loadFloatingLeaderboard(type);
}

// 加载悬浮榜单
async function loadFloatingLeaderboard(type) {
    try {
        let leaderboardData = [];
        
        if (type === 'daily') {
            // 获取今日榜单数据
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await dbClient
                .from('daily_leaderboard')
                .select(`
                    id,
                    student_id,
                    leaderboard_date,
                    total_score,
                    rank,
                    users(username)
                `)
                .eq('leaderboard_date', today)
                .order('total_score', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            leaderboardData = data || [];

            console.log('今日榜单数据:', leaderboardData);
        } else {
            // 获取周榜数据（最近7天，计算每个学生的总分）
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            
            const { data, error } = await dbClient
                .from('daily_leaderboard')
                .select(`
                    student_id,
                    total_score,
                    users(username)
                `)
                .gte('leaderboard_date', sevenDaysAgo.toISOString().split('T')[0]);
            
            if (error) throw error;
            
            // 计算每个学生的周总分
            const weeklyScores = {};
            if (data) {
                data.forEach(item => {
                    if (!weeklyScores[item.student_id]) {
                        weeklyScores[item.student_id] = {
                            student_id: item.student_id,
                            username: item.users?.username,
                            total_score: 0
                        };
                    }
                    weeklyScores[item.student_id].total_score += item.total_score || 0;
                });
            }
            
            // 转换为数组并排序
            leaderboardData = Object.values(weeklyScores)
                .sort((a, b) => b.total_score - a.total_score)
                .slice(0, 10);
        }
        
        const container = document.getElementById('floating-leaderboard-content');
        
        // 确保至少有3条数据（不足时添加假数据）
        if (!leaderboardData) {
            leaderboardData = [];
        }
        
        if (leaderboardData.length < 3) {
            const fakeDataCount = 3 - leaderboardData.length;
            const fakeData = generateFakeLeaderboardData(fakeDataCount);
            leaderboardData = [...leaderboardData, ...fakeData];
        }
        
        // 生成榜单HTML
        let leaderboardHTML = '<div style="max-height: 300px; overflow-y: auto;">';
        
        leaderboardData.forEach((item, index) => {
            const userRank = item.rank || index + 1;
            let userName = item.users?.username || item.username || '未知用户';
            const score = item.total_score || item.score || 0;
            
            // 处理名字显示，前三名显示全名，其他显示*号在前面
            function maskName(name, rank) {
                // 老师端显示全部名称
                if (appState.isTeacher) return name;
                
                // 前三名显示全名
                if (rank <= 3) return name;
                
                // 其他排名显示*号在前面，只显示最后一个字符
                if (!name || name.length <= 1) return name;
                const lastChar = name[name.length - 1];
                const maskedChars = '*'.repeat(name.length - 1);
                return maskedChars + lastChar;
            }
            
            userName = maskName(userName, userRank);
            
            // 根据排名设置不同样式
            let rankClass = '';
            let rankIcon = '';
            
            if (userRank === 1) {
                rankClass = 'rank-first';
                rankIcon = '🥇';
            } else if (userRank === 2) {
                rankClass = 'rank-second';
                rankIcon = '🥈';
            } else if (userRank === 3) {
                rankClass = 'rank-third';
                rankIcon = '🥉';
            } else {
                rankClass = 'rank-other';
                rankIcon = userRank;
            }
            
            // 检查是否是当前用户
            const isCurrentUser = item.student_id === appState.currentUser;
            
            leaderboardHTML += `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}" style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0;">
                    <div class="rank ${rankClass}" style="width: 30px; text-align: center; font-weight: bold; margin-right: 10px;">${rankIcon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 14px;">${userName}</div>
                        <div style="color: #666; font-size: 12px;">分数: ${score}</div>
                    </div>
                </div>
            `;
        });
        
        leaderboardHTML += '</div>';
        container.innerHTML = leaderboardHTML;
        
    } catch (error) {
        console.error('加载悬浮榜单错误:', error);
        document.getElementById('floating-leaderboard-content').innerHTML = '<p style="color: #666; text-align: center; font-size: 14px;">加载榜单失败</p>';
    }
}

// 生成假的榜单数据
function generateFakeLeaderboardData(count) {
    const fakeNames = ['James', 'John', 'Michael', 'David', 'William', 'Robert', 'Daniel', 'Thomas', 'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Mary', 'Liam', 'Noah', 'Ethan', 'Mason', 'Logan', 'Lucas', 'Ava', 'Evelyn', 'Lily', 'Chloe', 'Ella', 'Grace'];
    const fakeData = [];
    
    for (let i = 0; i < count; i++) {
        fakeData.push({
            isFake: true,
            username: fakeNames[i % fakeNames.length],
            score: 40 + Math.floor(Math.random() * 31), // 40-70分
            rank: i + 1
        });
    }
    
    return fakeData;
}

// 显示得分说明
function showScoreInfo() {
    const scoreInfo = document.getElementById('score-info');
    if (scoreInfo) {
        scoreInfo.style.display = 'block';
    }
}

// 隐藏得分说明
function hideScoreInfo() {
    const scoreInfo = document.getElementById('score-info');
    if (scoreInfo) {
        scoreInfo.style.display = 'none';
    }
}

// 初始化悬浮榜单
function initFloatingLeaderboard() {
    // 加载日榜单数据
    loadFloatingLeaderboard('daily');
    
    // 添加触发按钮点击事件
    const toggleButton = document.getElementById('leaderboard-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleLeaderboard);
    }
    
    // 每隔30秒刷新一次
    setInterval(() => {
        const leaderboard = document.getElementById('floating-leaderboard');
        if (leaderboard && leaderboard.style.display === 'block') {
            const activeType = document.querySelector('button[onclick="switchLeaderboard(\'daily\')"]').style.background === 'rgb(76, 175, 80)' ? 'daily' : 'weekly';
            loadFloatingLeaderboard(activeType);
        }
    }, 30000);
}

// 加载日榜单
async function loadLeaderboard() {
    try {
        // 获取所有榜单数据，按总分排序
        const { data: leaderboardData, error } = await dbClient
            .from('daily_leaderboard')
            .select(`
                id,
                student_id,
                leaderboard_date,
                total_score,
                rank,
                users(username)
            `)
            .order('total_score', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('leaderboard-content');
        
        // 确保至少有3条数据（不足时添加假数据）
        if (!leaderboardData) {
            leaderboardData = [];
        }
        
        if (leaderboardData.length < 3) {
            const fakeDataCount = 3 - leaderboardData.length;
            const fakeData = generateFakeLeaderboardData(fakeDataCount);
            leaderboardData = [...leaderboardData, ...fakeData];
        }
        
        if (leaderboardData.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">榜单还没有数据</p>';
            return;
        }
        
        // 生成榜单HTML
        let leaderboardHTML = `
            <div class="leaderboard-header">
                <h3>学习总榜单</h3>
            </div>
            <div class="leaderboard-list">
        `;
        
        leaderboardData.forEach((item, index) => {
            const userRank = item.rank || index + 1;
            const userName = item.users?.username || '未知用户';
            const score = item.total_score || 0;
            
            // 根据排名设置不同样式
            let rankClass = '';
            let rankIcon = '';
            
            if (userRank === 1) {
                rankClass = 'rank-first';
                rankIcon = '🥇';
            } else if (userRank === 2) {
                rankClass = 'rank-second';
                rankIcon = '🥈';
            } else if (userRank === 3) {
                rankClass = 'rank-third';
                rankIcon = '🥉';
            } else {
                rankClass = 'rank-other';
                rankIcon = userRank;
            }
            
            // 检查是否是当前用户
        const isCurrentUser = item.student_id === appState.currentUser;
            
            leaderboardHTML += `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="rank ${rankClass}">${rankIcon}</div>
                    <div class="user-info">
                        <div class="user-name">${userName}</div>
                        <div class="user-score">总分: ${score}</div>
                        <div class="user-date">日期: ${new Date(item.leaderboard_date).toLocaleDateString('zh-CN')}</div>
                    </div>
                </div>
            `;
        });
        
        leaderboardHTML += '</div>';
        container.innerHTML = leaderboardHTML;
        
    } catch (error) {
        console.error('加载日榜单错误:', error);
        document.getElementById('leaderboard-content').innerHTML = '<p style="color: #666; text-align: center;">加载榜单失败</p>';
    }
}

// 更新学习统计
async function updateStudyStatistics(totalWords, newWords, studyTimeMinutes) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 获取或创建今日统计
        const { data: existingStats, error: checkError } = await dbClient
            .from('study_statistics')
            .select('*')
            .eq('student_id', appState.currentUser)
            .eq('stat_date', today)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        const consecutiveDays = clockInSystem.currentStreak;
        const actualStudyTime = studyTimeMinutes || 30; // 默认30分钟
        
        if (existingStats) {
            // 更新现有统计
            const { error: updateError } = await dbClient
                .from('study_statistics')
                .update({
                    new_words_learned: (existingStats.new_words_learned || 0) + newWords,
                    words_reviewed: (existingStats.words_reviewed || 0) + (totalWords - newWords),
                    total_study_time: (existingStats.total_study_time || 0) + actualStudyTime,
                    consecutive_days: consecutiveDays,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingStats.id);
            
            if (updateError) throw updateError;
            
        } else {
            // 创建新统计
            const { error: insertError } = await dbClient
                .from('study_statistics')
                .insert([{
                    student_id: appState.currentUser,
                    stat_date: today,
                    new_words_learned: newWords,
                    words_reviewed: totalWords - newWords,
                    total_study_time: actualStudyTime,
                    consecutive_days: consecutiveDays,
                    has_reward: false,
                    month_absence: 0
                }]);
            
            if (insertError) throw insertError;
        }
        
    } catch (error) {
        console.error('更新学习统计错误:', error);
    }
}

// 检查并发放奖励
async function checkAndAwardReward() {
    if (clockInSystem.currentStreak >= 7 && clockInSystem.currentStreak % 7 === 0) {
        try {
            // 更新统计表中的奖励状态
        const today = new Date().toISOString().split('T')[0];
        
        const { error: updateError } = await dbClient
            .from('study_statistics')
            .update({
                has_reward: true
            })
            .eq('student_id', appState.currentUser)
            .eq('stat_date', today);
            
            if (updateError) throw updateError;
            
            // 显示奖励消息
            showAlert(`🎉 恭喜您连续学习7天！获得语言学习奖励！`, 'success');
            
        } catch (error) {
            console.error('发放奖励错误:', error);
        }
    }
}

// 显示打卡统计
function showClockInStats() {
    showScreen('clockin-stats-screen');
    loadClockInStats();
}

// 加载打卡统计
async function loadClockInStats() {
    try {
        // 更新统计数字
        document.getElementById('current-streak').textContent = clockInSystem.currentStreak;
        document.getElementById('longest-streak').textContent = clockInSystem.longestStreak;
        document.getElementById('total-days').textContent = clockInSystem.totalDays;
        
        // 加载月度统计
        await loadMonthStats();
        
        // 加载打卡日历
        await loadClockInCalendar();
        
        // 加载奖励记录
        await loadRewards();
        
    } catch (error) {
        console.error('加载打卡统计错误:', error);
    }
}

// 加载月度统计
async function loadMonthStats() {
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const { data: monthStats, error } = await dbClient
            .from('study_statistics')
            .select('*')
            .eq('student_id', appState.currentUser)
            .gte('stat_date', firstDay.toISOString().split('T')[0])
            .lte('stat_date', lastDay.toISOString().split('T')[0])
            .order('stat_date');
        
        if (error) throw error;
        
        const container = document.getElementById('month-stats-content');
        
        if (!monthStats || monthStats.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">本月还没有学习记录</p>';
            return;
        }
        
        // 计算月度总计
        let totalNewWords = 0;
        let totalReviews = 0;
        let totalStudyTime = 0;
        let absenceDays = 0;
        
        monthStats.forEach(stat => {
            totalNewWords += stat.new_words_learned || 0;
            totalReviews += stat.words_reviewed || 0;
            totalStudyTime += stat.total_study_time || 0;
            // 从study_statistics表的month_absence字段获取缺卡天数
            if (stat.month_absence) {
                absenceDays = stat.month_absence;
            }
        });
        
        const daysInMonth = lastDay.getDate();
        const studyDays = monthStats.length;
        const avgDailyWords = studyDays > 0 ? Math.round((totalNewWords + totalReviews) / studyDays) : 0;
        
        container.innerHTML = `
            <div class="card-grid">
                <div class="stat-card">
                    <div class="number">${studyDays}</div>
                    <div class="label">学习天数</div>
                </div>
                <div class="stat-card">
                    <div class="number">${totalNewWords}</div>
                    <div class="label">新学单词</div>
                </div>
                <div class="stat-card">
                    <div class="number">${totalReviews}</div>
                    <div class="label">复习单词</div>
                </div>
                <div class="stat-card">
                    <div class="number">${avgDailyWords}</div>
                    <div class="label">日均单词</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #666;">本月学习天数</span>
                    <span style="color: #4CAF50; font-weight: bold;">${studyDays}/${daysInMonth}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(studyDays / daysInMonth) * 100}%"></div>
                </div>
            </div>
            
            <div style="margin-top: 15px; color: #666; font-size: 14px;">
                <p>📊 学习总时长：${totalStudyTime} 分钟</p>
                <p>📅 缺卡天数：${absenceDays} 天</p>
                <p>📈 学习频率：${(studyDays / daysInMonth * 100).toFixed(1)}%</p>
            </div>
        `;
        
    } catch (error) {
        console.error('加载月度统计错误:', error);
    }
}

// 加载打卡日历
async function loadClockInCalendar() {
    try {
        const { data: records, error } = await dbClient
            .from('daily_checkin')
            .select('clock_in_date')
            .eq('student_id', appState.currentUser)
            .eq('is_clock_in', true)
            .order('clock_in_date', { ascending: false })
            .limit(90); // 最近90天
        
        if (error) throw error;
        
        const container = document.getElementById('calendar-container');
        if (!container) return;
        
        // 创建打卡日期集合
        const clockedDates = new Set();
        if (records) {
            records.forEach(record => {
                clockedDates.add(record.clock_in_date);
            });
        }
        
        // 生成最近30天的日历
        const today = new Date();
        const calendarDays = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            calendarDays.push({
                date: dateStr,
                day: date.getDate(),
                weekday: date.getDay(), // 0-6，0表示星期日
                isClocked: clockedDates.has(dateStr),
                isToday: i === 0
            });
        }
        
        // 按周分组，确保日期显示在正确的星期位置
        const weeks = [];
        let currentWeek = [];
        
        // 为第一周添加空白单元格，直到第一天的星期位置
        const firstDayWeekday = calendarDays[0].weekday;
        for (let i = 0; i < firstDayWeekday; i++) {
            currentWeek.push(null); // 空白单元格
        }
        
        calendarDays.forEach(day => {
            currentWeek.push(day);
            
            if (currentWeek.length === 7) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }
        });
        
        // 为最后一周添加空白单元格，确保每组都是7天
        while (currentWeek.length > 0 && currentWeek.length < 7) {
            currentWeek.push(null); // 空白单元格
        }
        
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
        }
        
        // 生成日历HTML
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        let calendarHTML = `
            <div style="overflow-x: auto;">
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; min-width: 300px;">
                    ${weekdays.map(day => `
                        <div style="text-align: center; padding: 8px; background: #f5f5f5; border-radius: 5px; font-weight: bold; color: #666;">
                            ${day}
                        </div>
                    `).join('')}
        `;
        
        // 填充日期
        weeks.forEach(week => {
            week.forEach(day => {
                if (!day) {
                    // 空白单元格
                    calendarHTML += `
                        <div style="text-align: center; padding: 10px; border-radius: 5px; background: #f5f5f5; color: #f5f5f5;">
                            &nbsp;
                        </div>
                    `;
                } else {
                    let title = day.date;
                    
                    if (day.isToday) {
                        title += ' (今天)';
                    }
                    
                    if (day.isClocked) {
                        title += ' ✓ 已打卡';
                    }
                    
                    calendarHTML += `
                        <div style="text-align: center; padding: 10px; border-radius: 5px; background: ${day.isClocked ? '#4CAF50' : '#f5f5f5'};
                              color: ${day.isClocked ? 'white' : '#666'}; ${day.isToday ? 'border: 2px solid #2196F3;' : ''}"
                              title="${title}">
                            ${day.day}
                            ${day.isClocked ? '<br><span style="font-size: 10px;">✓</span>' : ''}
                        </div>
                    `;
                }
            });
        });
        
        calendarHTML += `
                </div>
            </div>
            <p style="color: #666; text-align: center; margin-top: 10px; font-size: 14px;">
                ✅ 表示已打卡的日子 | 蓝色边框表示今天
            </p>
        `;
        
        container.innerHTML = calendarHTML;
        
    } catch (error) {
        console.error('加载打卡日历错误:', error);
    }
}

// 加载奖励记录
async function loadRewards() {
    try {
        const { data: stats, error } = await dbClient
            .from('study_statistics')
            .select('stat_date, consecutive_days, has_reward')
            .eq('student_id', appState.currentUser)
            .eq('has_reward', true)
            .order('stat_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('rewards-list');
        
        if (!stats || stats.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">还没有获得奖励</p>';
            return;
        }
        
        let rewardsHTML = '<div style="display: flex; flex-wrap: wrap; gap: 15px;">';
        
        stats.forEach(stat => {
            const date = new Date(stat.stat_date).toLocaleDateString('zh-CN');
            const streak = stat.consecutive_days;
            
            // 根据连续天数决定奖励等级
            let rewardTitle = '';
            let rewardDesc = '';
            let icon = '🏆';
            
            if (streak >= 30) {
                rewardTitle = '🏅 月度学习之星';
                rewardDesc = '连续学习30天';
                icon = '🌟';
            } else if (streak >= 14) {
                rewardTitle = '🥈 双周学习达人';
                rewardDesc = '连续学习14天';
                icon = '⭐';
            } else if (streak >= 7) {
                rewardTitle = '🥉 周学习标兵';
                rewardDesc = '连续学习7天';
                icon = '🎖️';
            }
            
            rewardsHTML += `
                <div style="background: #FFF3CD; border: 2px solid #FFC107; border-radius: 10px; padding: 15px; min-width: 200px;">
                    <div style="font-size: 2em; text-align: center; margin-bottom: 10px;">${icon}</div>
                    <div style="font-weight: bold; text-align: center; margin-bottom: 5px;">${rewardTitle}</div>
                    <div style="color: #666; text-align: center; font-size: 14px;">${rewardDesc}</div>
                    <div style="color: #999; text-align: center; font-size: 12px; margin-top: 10px;">${date}</div>
                </div>
            `;
        });
        
        rewardsHTML += '</div>';
        container.innerHTML = rewardsHTML;
        
    } catch (error) {
        console.error('加载奖励记录错误:', error);
    }
}

// 显示复习计划页面
function showReviewPlan() {
    showScreen('review-plan-screen');
    loadReviewPlan();
}

// 加载复习计划
async function loadReviewPlan() {
    try {
        // 获取学生的所有单词
        const { data: allWords, error } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', appState.currentUser);
        
        if (error) throw error;
        
        if (!allWords || allWords.length === 0) {
            // 如果没有单词，显示提示
            document.getElementById('due-reviews').textContent = '0';
            document.getElementById('weak-words').textContent = '0';
            document.getElementById('medium-words').textContent = '0';
            document.getElementById('strong-words').textContent = '0';
            
            document.getElementById('ebbinghaus-schedule').innerHTML = `
                <p style="color: #666; text-align: center;">还没有单词可以复习</p>
            `;
            return;
        }
        
        // 根据状态和复习次数分类单词
        const weakWords = allWords.filter(w => 
            w.status === 'new' || 
            (w.review_count || 0) <= 1
        );
        
        const mediumWords = allWords.filter(w => 
            w.status === 'learning' && 
            (w.review_count || 0) > 1 && 
            (w.review_count || 0) <= 3
        );
        
        const strongWords = allWords.filter(w => 
            w.status === 'mastered' || 
            (w.review_count || 0) > 3
        );
        
        // 更新统计数字
        document.getElementById('due-reviews').textContent = weakWords.length;
        document.getElementById('weak-words').textContent = weakWords.length;
        document.getElementById('medium-words').textContent = mediumWords.length;
        document.getElementById('strong-words').textContent = strongWords.length;
        
        // 生成艾宾浩斯复习时间表
        generateEbbinghausSchedule();
        
    } catch (error) {
        console.error('加载复习计划错误:', error);
    }
}

// 生成艾宾浩斯复习时间表
function generateEbbinghausSchedule() {
    const today = new Date();
    const schedule = [
        { days: 1, label: '第一次复习', date: addDays(today, 1) },
        { days: 2, label: '第二次复习', date: addDays(today, 2) },
        { days: 4, label: '第三次复习', date: addDays(today, 4) },
        { days: 7, label: '第四次复习', date: addDays(today, 7) },
        { days: 15, label: '第五次复习', date: addDays(today, 15) },
        { days: 30, label: '第六次复习', date: addDays(today, 30) }
    ];
    
    const scheduleHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${schedule.map(item => `
                <div style="background: ${item.days <= 2 ? '#E8F5E9' : '#E3F2FD'}; border: 2px solid ${item.days <= 2 ? '#4CAF50' : '#2196F3'}; 
                      border-radius: 10px; padding: 15px; flex: 1; min-width: 150px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">${item.label}</div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 5px;">${item.days}天后</div>
                    <div style="color: #999; font-size: 12px;">${item.date.toLocaleDateString('zh-CN')}</div>
                </div>
            `).join('')}
        </div>
        <p style="color: #666; margin-top: 15px; font-size: 14px;">
            💡 根据艾宾浩斯记忆曲线设计的复习计划，科学记忆，高效学习
        </p>
    `;
    
    document.getElementById('ebbinghaus-schedule').innerHTML = scheduleHTML;
}

// 智能复习
async function startSmartReview(type) {
    try {
        const { data: allWords, error } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', appState.currentUser);
        
        if (error) throw error;
        
        if (!allWords || allWords.length === 0) {
            showAlert('没有单词可以复习', 'info');
            return;
        }
        
        let reviewWords = [];
        
        switch (type) {
            case 'due':
                // 今日到期复习：复习次数少或状态为new的单词
                reviewWords = allWords
                    .sort((a, b) => {
                        // 状态优先级：new > learning > mastered
                        const statusOrder = { 'new': 0, 'learning': 1, 'mastered': 2 };
                        if (statusOrder[a.status] !== statusOrder[b.status]) {
                            return statusOrder[a.status] - statusOrder[b.status];
                        }
                        // 复习次数少的优先
                        return (a.review_count || 0) - (b.review_count || 0);
                    })
                    .slice(0, 20);
                break;
                
            case 'weak':
                // 弱项复习：状态为new或复习次数<=1的单词
                reviewWords = allWords
                    .filter(w => w.status === 'new' || (w.review_count || 0) <= 1)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 20);
                break;
                
            case 'random':
                // 随机复习：所有单词随机选择
                reviewWords = [...allWords]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 20);
                break;
                
            case 'urgent':
                // 紧急复习：很久没复习的单词
                reviewWords = allWords
                    .sort((a, b) => {
                        const aDate = a.last_reviewed ? new Date(a.last_reviewed) : new Date(0);
                        const bDate = b.last_reviewed ? new Date(b.last_reviewed) : new Date(0);
                        return aDate - bDate; // 时间早的在前
                    })
                    .slice(0, 20);
                break;
        }
        
        if (reviewWords.length === 0) {
            showAlert('没有找到符合条件的单词', 'info');
            return;
        }
        
        // 开始训练
        appState.trainingWords = reviewWords;
        appState.currentWordIndex = 0;
        appState.isCardFlipped = false;
        
        startTrainingSession();
        
    } catch (error) {
        console.error('智能复习错误:', error);
        showAlert('加载复习单词失败', 'error');
    }
}