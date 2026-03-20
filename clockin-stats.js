// ========== 打卡统计和复习计划功能 ==========

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

