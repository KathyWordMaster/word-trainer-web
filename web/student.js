// ========== 学生功能 ==========
async function showStudentDashboard() {
    console.log('显示学生面板');
    // 停止倒计时
    if (typeof stopCountdown === 'function') {
        stopCountdown();
    }
    showScreen('student-screen');
    try {
        await loadStudentDashboardSimple();
        console.log('学生面板加载完成');
    } catch (error) {
        console.error('学生面板加载错误:', error);
    }
}

// 加载简洁版学生面板
async function loadStudentDashboardSimple() {
    try {
        // 设置学生姓名
        document.getElementById('student-name').textContent = appState.currentUser;
        
        // 加载打卡状态
        await loadClockInStatus();
        
        // 同步单词
        await syncGroupWordsToStudent();
        
        // 加载成就徽章
        await loadAchievementBadges();
        
        // 获取学习记录 - 移除排序，确保获取所有单词
        let recordsData;
        const { data: records, error } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', appState.currentUser)
            .limit(10000);
        
        if (error) {
            console.error('获取学习记录错误:', error);
            appState.userWords = [];
            recordsData = [];
        } else {
            appState.userWords = records || [];
            recordsData = records;
        }
        
        // 使用数组长度而不是count
        const total = appState.userWords.length;
        
        // 今日学习情况
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecords = recordsData?.filter(r => 
            r.last_reviewed && new Date(r.last_reviewed) >= today
        ) || [];

        const target = 10; // 每日目标单词数
        const todayProgress = Math.min(todayRecords.length, target);
        const progressPercent = (todayProgress / target) * 100;

        const todayStatus = document.getElementById('today-status');
        todayStatus.innerHTML = `
            <div class="stats-card">
                <h3 style="color: #333; margin-bottom: 15px;">📅 今日学习情况</h3>
                <div class="card-grid">
                    <div class="stat-card" onclick="showTodayWords()" style="cursor: pointer;">
                        <div class="number" style="color: #2196F3; text-decoration: underline;">${todayRecords.length}</div>
                        <div class="label">今日已学</div>
                        <div style="color: #666; font-size: 12px; margin-top: 5px;">点击查看</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="number">${Math.max(0, target - todayRecords.length)}</div>
                        <div class="label">建议学习</div>
                    </div>
                    
                    <div class="stat-card" onclick="showTodayLearningWords()" style="cursor: pointer;">
                        <div class="number" style="color: #FF9800; text-decoration: underline;">${todayRecords.filter(r => r.status === 'learning').length}</div>
                        <div class="label">今日熟悉</div>
                        <div style="color: #666; font-size: 12px; margin-top: 5px;">点击查看</div>
                    </div>
                    
                    <div class="stat-card" onclick="showTodayMasteredWords()" style="cursor: pointer;">
                        <div class="number" style="color: #4CAF50; text-decoration: underline;">${todayRecords.filter(r => r.status === 'mastered').length}</div>
                        <div class="label">今日掌握</div>
                        <div style="color: #666; font-size: 12px; margin-top: 5px;">点击查看</div>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #666;">今日进度</span>
                        <span style="color: #4CAF50; font-weight: bold;">${todayProgress}/${target}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                ${todayRecords.length >= target ? 
                    '<div class="celebration-banner">🎉 太棒了！今日任务已完成！明天再来继续学习吧！</div>' : 
                    '<p style="color: #FF9800; text-align: center; margin-top: 15px;">💪 继续努力！</p>'}
            </div>
        `;
        
        // 学习进度
        const mastered = recordsData?.filter(r => r.status === 'mastered').length || 0;
        const learning = recordsData?.filter(r => r.status === 'learning').length || 0;
        const review = recordsData?.filter(r => r.status === 'new').length || 0;
        const progress = total > 0 ? Math.round((mastered / total) * 100) : 0;

        // 计算未学习单词
        const unlearnedWords = recordsData?.filter(r => 
            r.status === 'new' && !r.last_reviewed
        ).length || 0;

        const progressSummary = document.getElementById('my-progress-summary');
        progressSummary.innerHTML = `
            <div class="card-grid">
                <div class="stat-card">
                    <div class="number">${total}</div>
                    <div class="label">总单词数</div>
                </div>
                <div class="stat-card">
                    <div class="number" style="color: #4CAF50;">${mastered}</div>
                    <div class="label">已掌握</div>
                </div>
                <div class="stat-card">
                    <div class="number" style="color: #FF9800;">${learning}</div>
                    <div class="label">学习中</div>
                </div>
                <div class="stat-card">
                    <div class="number" style="color: #2196F3;">${review}</div>
                    <div class="label">未开始</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #666;">总体进度</span>
                    <span style="color: #4CAF50; font-weight: bold;">${progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
        
        // 分组详情
        const groupDetails = document.getElementById('group-details');
        groupDetails.innerHTML = `
            <div class="stats-card">
                <h3 style="color: #333; margin-bottom: 15px;">📁 我的分组</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                    <div class="stat-card" style="flex: 1; min-width: 200px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📚</div>
                        <div style="font-weight: bold; margin-bottom: 5px;">所有单词</div>
                        <div style="color: #666;">共 ${total} 个单词</div>
                    </div>
                    ${unlearnedWords > 0 ? `
                        <div class="stat-card" style="flex: 1; min-width: 200px; background: #FFF3CD; border: 2px solid #FFC107;">
                            <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">待学习</div>
                            <div style="color: #856404;">${unlearnedWords} 个单词</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('加载学生面板错误:', error);
        document.getElementById('today-status').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 显示训练选项
function showTrainingOptions() {
    showScreen('training-options-screen');
    loadTrainingOptions();
}

// 加载训练选项
function loadTrainingOptions() {
    const optionsContent = document.getElementById('daily-training-options');
    optionsContent.innerHTML = `
        <h4 style="color: #333; margin-bottom: 15px;">📅 今日训练</h4>
        <button class="btn" onclick="dailyClockIn()" 
                style="width: 100%; padding: 20px; font-size: 16px; margin-bottom: 15px;">
            <div style="font-size: 20px; margin-bottom: 10px;">📅</div>
            <div style="font-weight: bold; margin-bottom: 5px;">每日打卡训练</div>
            <div style="color: #666; font-size: 14px;">智能生成今日任务</div>
        </button>
    `;
}

// 开始训练会话
function startTrainingSession() {
    showScreen('training-screen');
    // 学习时隐藏悬浮榜单
    const leaderboard = document.getElementById('floating-leaderboard');
    if (leaderboard) {
        leaderboard.style.display = 'none';
    }
    loadTrainingSession();
}

// 加载训练会话
function loadTrainingSession() {
    const trainingContent = document.getElementById('training-content');
    const progressEl = document.getElementById('training-progress');
    
    if (appState.trainingWords.length === 0) {
        trainingContent.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <p style="color: #666; margin-bottom: 20px;">没有单词可以训练</p>
                <button class="btn" onclick="showStudentDashboard()">返回主页</button>
            </div>
        `;
        return;
    }
    
    updateTrainingProgress();
    showCurrentWord();
}

// 更新训练进度
function updateTrainingProgress() {
    const progressEl = document.getElementById('training-progress');
    if (progressEl) {
        progressEl.textContent = `${appState.currentWordIndex + 1}/${appState.trainingWords.length}`;
    }
}

// 显示当前单词
function showCurrentWord() {
    const trainingContent = document.getElementById('training-content');
    const word = appState.trainingWords[appState.currentWordIndex];
    
    if (!word) {
        showTrainingComplete();
        return;
    }
    
    const isFlipped = appState.isCardFlipped;
    const fontSizeClass = getFontSizeClass(word.english);
    const showButtons = isFlipped;
    
    trainingContent.innerHTML = `
        <div class="word-card ${isFlipped ? 'flipped' : ''}" onclick="flipCard()">
            <div class="card-front ${fontSizeClass}">
                ${formatWordDisplay(word.english)}
            </div>
            <div class="card-back ${fontSizeClass}">
                ${word.chinese}
            </div>
        </div>
        
        ${showButtons ? `
        <div style="text-align: center; margin-top: 30px;">
            <div style="display: flex; justify-content: center; gap: 15px;">
                <button class="btn btn-green" onclick="markWordAs('mastered')" style="flex: 1;">
                    完全掌握
                </button>
                <button class="btn" onclick="markWordAs('learning')" style="flex: 1;">
                    有点印象
                </button>
                <button class="btn btn-red" onclick="markWordAs('new')" style="flex: 1;">
                    没印象
                </button>
            </div>
        </div>
        ` : `
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 16px;">
            点击卡片查看中文翻译
        </div>
        `}
    `;
}

// 翻转卡片
function flipCard() {
    appState.isCardFlipped = !appState.isCardFlipped;
    showCurrentWord();
}

// 更新日榜单质量分
async function updateLeaderboardQualityScore(status) {
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
        
        // 根据状态计算质量分增量
        let qualityScoreIncrement = 0;
        switch (status) {
            case 'mastered':
                qualityScoreIncrement = 3; // 完全掌握 +3分
                break;
            case 'learning':
                qualityScoreIncrement = 1; // 有点印象 +1分
                break;
            case 'new':
                qualityScoreIncrement = 0; // 没印象不加分
                break;
        }
        
        if (existingRecord) {
            // 有数据就累加
            const newQualityScore = (existingRecord.quality_score || 0) + qualityScoreIncrement;
            const { error: updateError } = await dbClient
                .from('daily_leaderboard')
                .update({
                    quality_score: newQualityScore,
                    total_score: Math.min((existingRecord.base_score || 0) + newQualityScore + (existingRecord.improvement_score || 0) + (existingRecord.stability_bonus || 0), 200)
                })
                .eq('id', existingRecord.id);
            
            if (updateError) throw updateError;
            
        } else {
            // 不存在数据就新增
            const { error: insertError } = await dbClient
                .from('daily_leaderboard')
                .insert([{
                    student_id: appState.currentUser,
                    leaderboard_date: today,
                    base_score: 0,
                    quality_score: qualityScoreIncrement,
                    improvement_score: 0,
                    stability_bonus: 0,
                    raw_score: qualityScoreIncrement,
                    total_score: Math.min(qualityScoreIncrement, 200)
                }]);
            
            if (insertError) throw insertError;
        }
        
        // 重新计算排名
        await calculateLeaderboardRanks(today);
        
    } catch (error) {
        console.error('更新榜单质量分错误:', error);
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

// 标记单词状态
async function markWordAs(status) {
    const word = appState.trainingWords[appState.currentWordIndex];
    if (!word) return;
    
    try {
        // 获取当前单词的 score 值
        const currentScore = word.score || 0;
        
        let newScore;
        
        // 根据当前分数是否为0来决定评分逻辑
        if (currentScore === 0) {
            // 新词初始分设置
            switch (status) {
                case 'mastered':
                    newScore = 70; // 完全掌握（新词初始分=70）
                    break;
                case 'learning':
                    newScore = 40; // 有点印象（新词初始分=40）
                    break;
                case 'new':
                    newScore = 0; // 没印象（新词初始分=0）
                    break;
                default:
                    newScore = 0;
            }
        } else {
            // 已有分数的加减分逻辑
            let scoreChange;
            switch (status) {
                case 'mastered':
                    scoreChange = 8;
                    break;
                case 'learning':
                    scoreChange = 3;
                    break;
                case 'new':
                    scoreChange = -10;
                    break;
                default:
                    scoreChange = 0;
            }
            newScore = Math.max(0, currentScore + scoreChange);
        }
        
        // 更新单词状态和 score
        const { error } = await dbClient
            .from('student_words')
            .update({
                status: status,
                score: newScore,
                review_count: (word.review_count || 0) + 1,
                last_reviewed: new Date().toISOString()
            })
            .eq('id', word.id);
        
        if (error) throw error;
        
        // 更新本地状态
        word.status = status;
        word.score = newScore;
        word.review_count = (word.review_count || 0) + 1;
        word.last_reviewed = new Date().toISOString();
        
        // 更新日榜单质量分
        await updateLeaderboardQualityScore(status);
        
        // 保存训练进度
        saveDailyTrainingProgress(1);
        
    } catch (error) {
        console.error('更新单词状态错误:', error);
    }
    
    nextWord();
}

// 下一个单词
function nextWord() {
    appState.currentWordIndex++;
    appState.isCardFlipped = false;
    
    // 检查是否完成当前批次
    const batchEnd = appState.currentBatchStart + appState.batchSize;
    if (appState.currentWordIndex >= batchEnd || appState.currentWordIndex >= appState.trainingWords.length) {
        // 获取当前批次的单词
        const currentBatchWords = appState.trainingWords.slice(appState.currentBatchStart, appState.currentWordIndex);
        
        if (currentBatchWords.length > 0) {
            // 对当前批次的单词进行选择题测验
            showBatchReviewQuiz(currentBatchWords);
        } else {
            showTrainingComplete();
        }
    } else {
        updateTrainingProgress();
        showCurrentWord();
    }
}

// 构建选择题选项
function buildQuizOptions(correctAnswer, currentWord) {
    // 从其他单词中选择干扰选项
    const otherWords = appState.userWords
        .filter(w => {
            // 排除当前单词
            const wordId = currentWord.word_id || currentWord.id;
            const otherWordId = w.word_id || w.id;
            return otherWordId !== wordId;
        })
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
    
    // 提取干扰选项的中文意思
    let distractors = otherWords.map(w => w.chinese);
    
    // 如果干扰选项不足3个，基于正确答案生成干扰选项
    while (distractors.length < 3) {
        // 基于正确答案生成干扰选项
        const distractor = generateDistractor(correctAnswer);
        // 确保干扰选项与正确答案不同，且不重复
        if (distractor !== correctAnswer && !distractors.includes(distractor)) {
            distractors.push(distractor);
        }
    }
    
    // 组合正确答案和干扰选项
    const options = [correctAnswer, ...distractors];
    
    // 随机打乱选项顺序
    return options.sort(() => 0.5 - Math.random());
}

// 基于正确答案生成干扰选项
function generateDistractor(correctAnswer) {
    // 常见的前缀和后缀
    const prefixes = ['小', '大', '新', '旧', '好', '坏', '高', '低', '快', '慢'];
    const suffixes = ['的', '了', '吗', '呢', '吧', '啊', '哦', '呀', '哇', '啦'];
    
    // 随机选择生成策略
    const strategy = Math.floor(Math.random() * 3);
    
    switch (strategy) {
        case 0:
            // 添加前缀
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            return prefix + correctAnswer;
        case 1:
            // 添加后缀
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            return correctAnswer + suffix;
        case 2:
            // 混合策略：添加前缀和后缀
            const mixedPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const mixedSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            return mixedPrefix + correctAnswer + mixedSuffix;
        default:
            // 默认策略：添加后缀
            return correctAnswer + suffixes[Math.floor(Math.random() * suffixes.length)];
    }
}

// 复习测验功能
function showReviewQuiz() {
    // 从训练过的单词中选择分数不够70的单词
    const eligibleWords = appState.trainingWords.filter(word => {
        const score = word.score || 0;
        return word.status !== 'skip' && score < 70;
    });
    
    if (eligibleWords.length === 0) {
        // 如果没有可测试的单词，直接结束训练
        showTrainingCompleteFinal();
        return;
    }
    
    // 根据分数计算权重，分数越低权重越高
    const weightedWords = eligibleWords.map(word => {
        const score = word.score || 0;
        // 计算权重：分数越低，权重越高
        // 基础权重为1，分数每低10分，权重增加1
        const weight = Math.max(1, Math.ceil((70 - score) / 10));
        return { word, weight };
    });
    
    // 基于权重选择单词
    const quizWords = [];
    const maxQuestions = Math.min(20, eligibleWords.length);
    
    // 复制权重数组，用于选择
    const availableWords = [...weightedWords];
    
    while (quizWords.length < maxQuestions && availableWords.length > 0) {
        // 计算总权重
        const totalWeight = availableWords.reduce((sum, item) => sum + item.weight, 0);
        
        // 随机选择一个权重区间
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        // 找到对应的单词
        for (let i = 0; i < availableWords.length; i++) {
            random -= availableWords[i].weight;
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }
        
        // 添加选中的单词
        quizWords.push(availableWords[selectedIndex].word);
        
        // 从可用列表中移除
        availableWords.splice(selectedIndex, 1);
    }
    
    // 生成选择题
    const quizQuestions = quizWords.map((word, index) => {
        // 使用 buildQuizOptions 方法生成选项
        const options = buildQuizOptions(word.chinese, word);
        
        return {
            id: index,
            word: word,
            question: `"${word.english}" 的中文意思是？`,
            options: options,
            correctAnswer: word.chinese
        };
    });
    
    // 保存测验数据到状态
    appState.quizData = {
        questions: quizQuestions,
        currentQuestionIndex: 0,
        score: 0,
        originalQuestionCount: quizQuestions.length
    };
    
    // 显示第一个问题
    displayQuizQuestion();
}

function displayQuizQuestion() {
    const quizData = appState.quizData;
    const currentQuestion = quizData.questions[quizData.currentQuestionIndex];
    
    const content = document.getElementById('training-content');
    content.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px;">
            <h3 style="color: #333; margin-bottom: 30px; text-align: center;">📝 复习测验</h3>
            <div style="margin-bottom: 30px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                    问题 ${quizData.currentQuestionIndex + 1}/${quizData.questions.length}
                </div>
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 25px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                    ${currentQuestion.question}
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${currentQuestion.options.map((option, index) => `
                        <button 
                            class="btn" 
                            style="text-align: left; padding: 15px 20px; font-size: 16px;"
                            onclick="submitQuizAnswer('${option}')"
                        >
                            ${String.fromCharCode(65 + index)}. ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function submitQuizAnswer(selectedAnswer) {
    const quizData = appState.quizData;
    const currentQuestion = quizData.questions[quizData.currentQuestionIndex];
    
    // 检查答案是否正确
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const word = currentQuestion.word;
    const currentScore = word.score || 0;
    let newScore;
    
    if (currentScore === 0) {
        // 新词初始分设置
        if (isCorrect) {
            quizData.score++;
            newScore = 70; // 正确回答新词，设置为掌握状态的初始分
        } else {
            // 记录错误的单词
            if (!quizData.incorrectWords) {
                quizData.incorrectWords = [];
            }
            // 确保每个单词只记录一次错误
            if (!quizData.incorrectWords.some(word => word.id === currentQuestion.word.id)) {
                quizData.incorrectWords.push(currentQuestion.word);
            }
            newScore = 0; // 错误回答新词，保持初始分0
        }
    } else {
        // 已有分数的加减分逻辑
        if (isCorrect) {
            quizData.score++;
            // 加分逻辑：选择正确时加 10 分
            newScore = currentScore + 10;
        } else {
            // 记录错误的单词
            if (!quizData.incorrectWords) {
                quizData.incorrectWords = [];
            }
            // 确保每个单词只记录一次错误
            if (!quizData.incorrectWords.some(word => word.id === currentQuestion.word.id)) {
                quizData.incorrectWords.push(currentQuestion.word);
            }
            
            // 扣分逻辑：选择错误时扣 15 分，但不低于 0
            newScore = Math.max(0, currentScore - 15);
        }
    }
    
    // 根据分数更新状态
    let newStatus;
    if (newScore >= 70) {
        newStatus = 'mastered';
    } else if (newScore >= 40) {
        newStatus = 'learning';
    } else {
        newStatus = 'new';
    }
    
    // 更新数据库中的 score、status、last_reviewed 和 review_count
    const now = new Date().toISOString();
    const newReviewCount = (word.review_count || 0) + 1;
    dbClient
        .from('student_words')
        .update({
            score: newScore,
            status: newStatus,
            last_reviewed: now,
            review_count: newReviewCount
        })
        .eq('id', word.id)
        .then(() => {
            // 更新本地状态
            word.score = newScore;
            word.status = newStatus;
            word.last_reviewed = now;
            word.review_count = newReviewCount;
        })
        .catch(error => {
            console.error('更新单词数据错误:', error);
        });
    
    // 显示答案反馈
    showAlert(
        isCorrect ? `✅ 正确！` : 
                    `❌ 错误！正确答案是：${currentQuestion.correctAnswer}`,
        isCorrect ? 'success' : 'error'
    );
    
    // 延迟后处理
    setTimeout(() => {
        // 进入下一个问题
        quizData.currentQuestionIndex++;
        
        // 检查是否需要添加题目到后续测试
        if (!isCorrect || newScore < 40) {
            // 获取当前题目的单词ID
            const currentWordId = currentQuestion.word.id || currentQuestion.word.word_id;
            // 只检查剩余未测试的题目，避免排除已测试但需要重复测试的题目
            const remainingQuestions = quizData.questions.slice(quizData.currentQuestionIndex);
            const isAlreadyInList = remainingQuestions.some(q => {
                const questionWordId = q.word.id || q.word.word_id;
                return questionWordId === currentWordId;
            });
            if (!isAlreadyInList) {
                // 创建题目对象的深拷贝，避免对象引用问题
                const newQuestion = JSON.parse(JSON.stringify(currentQuestion));
                // 如果答案错误或分数少于40分，将当前题目添加到题目列表的最后
                quizData.questions.push(newQuestion);
            }
        }
        
        // 打乱题目顺序，避免后面全是错误的题
        if (quizData.questions.length > 1 && quizData.currentQuestionIndex < quizData.questions.length) {
            // 只打乱剩余题目，保留已测试的题目顺序
            const remainingQuestions = quizData.questions.slice(quizData.currentQuestionIndex);
            remainingQuestions.sort(() => Math.random() - 0.5);
            // 重新组合题目列表
            quizData.questions = [
                ...quizData.questions.slice(0, quizData.currentQuestionIndex),
                ...remainingQuestions
            ];
        }
        
        if (quizData.currentQuestionIndex < quizData.questions.length) {
            // 显示下一个问题
            displayQuizQuestion();
        } else {
            // 测验完成，显示结果
            finishQuiz();
        }
    }, 1500);
}

function finishQuiz() {
    const quizData = appState.quizData;
    const totalQuestions = quizData.originalQuestionCount || quizData.questions.length;
    const incorrectWords = quizData.incorrectWords || [];
    const correctCount = totalQuestions - incorrectWords.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // 测验完成后立即记录打卡
    if (clockInSystem.dailyTask) {
        recordClockInAfterTraining(correctCount);
    } else {
        // 非打卡训练，手动停止倒计时
        if (typeof stopCountdown === 'function') {
            stopCountdown();
        }
    }
    
    // 更新成就
    if (typeof updateAchievements === 'function') {
        updateAchievements().catch(err => console.error('更新成就错误:', err));
    }
    
    // 检查正确率和用时成就
    const achievements = getAchievements();
    
    // 准确大师成就
    if (percentage > 90) {
        const accuracyAchievement = achievements.find(a => a.id === 'accuracy-master');
        if (accuracyAchievement && accuracyAchievement.progress < accuracyAchievement.target) {
            accuracyAchievement.progress = 1;
            saveAchievements(achievements);
        }
    }
    
    // 快速学习成就（假设用时小于10分钟）
    let elapsedSeconds = 692; // 默认11分32秒
    let elapsedMinutes = 11.53;
    if (typeof stopCountdown === 'function') {
        elapsedSeconds = stopCountdown();
        elapsedMinutes = elapsedSeconds / 60;
        if (elapsedMinutes < 10) {
            const fastLearnerAchievement = achievements.find(a => a.id === 'fast-learner');
            if (fastLearnerAchievement && fastLearnerAchievement.progress < fastLearnerAchievement.target) {
                fastLearnerAchievement.progress = 1;
                saveAchievements(achievements);
            }
        }
    }
    
    // 早起鸟儿成就（7:00前完成学习）
    const now = new Date();
    if (now.getHours() < 7) {
        const earlyBirdAchievement = achievements.find(a => a.id === 'early-bird');
        if (earlyBirdAchievement && earlyBirdAchievement.progress < earlyBirdAchievement.target) {
            earlyBirdAchievement.progress = 1;
            saveAchievements(achievements);
        }
    }
    
    // 计算学习数据
    const totalWords = appState.trainingWords.length;
    const newWords = appState.trainingWords.filter(w => w.status === 'new' || w.score === 0).length;
    const reviewWords = totalWords - newWords;
    
    // 格式化用时
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeString = `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
    
    // 生成成就列表
    let achievementsList = '';
    if (elapsedMinutes < 12) {
        achievementsList += `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="font-size: 1.2em;">⚡</div>
            <div>
                <div style="font-weight: bold;">高效学习者</div>
                <div style="color: #666; font-size: 14px;">用时 < 12分钟</div>
            </div>
        </div>`;
    }
    if (percentage > 90) {
        achievementsList += `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="font-size: 1.2em;">🎯</div>
            <div>
                <div style="font-weight: bold;">准确大师</div>
                <div style="color: #666; font-size: 14px;">正确率 > 90%</div>
            </div>
        </div>`;
    }
    
    let incorrectWordsHTML = '';
    if (incorrectWords.length > 0) {
        incorrectWordsHTML = `
            <div style="margin-top: 30px; max-width: 600px; margin: 0 auto;">
                <h4 style="color: #333; margin-bottom: 15px; text-align: left;">❌ 错误的单词：</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
                    ${incorrectWords.map(word => `
                        <div style="background: #FFF3CD; border-radius: 8px; padding: 12px; border-left: 4px solid #FF9800;">
                            <div style="font-weight: bold;">${word.english}</div>
                            <div style="color: #666; font-size: 14px;">${word.chinese}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    const content = document.getElementById('training-content');
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 3em; margin-bottom: 20px;">🎉</div>
            <h3 style="color: #333; margin-bottom: 15px;">今日学习完成！ 🎉</h3>
            
            <div style="max-width: 500px; margin: 0 auto; text-align: left; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h4 style="color: #333; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>📊 学习成果</span>
                </h4>
                
                <div style="margin-bottom: 25px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="font-size: 1.2em;">📚</div>
                        <div>
                            <div style="font-weight: bold;">学习单词：${totalWords}个</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="font-size: 1.2em;">✨</div>
                        <div>
                            <div style="font-weight: bold;">新单词：${newWords}个</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="font-size: 1.2em;">🔄</div>
                        <div>
                            <div style="font-weight: bold;">复习单词：${reviewWords}个</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="font-size: 1.2em;">⏱️</div>
                        <div>
                            <div style="font-weight: bold;">学习用时：${timeString}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="font-size: 1.2em;">✅</div>
                        <div>
                            <div style="font-weight: bold;">选择题正确率：${percentage}%</div>
                        </div>
                    </div>
                </div>
                
                ${achievementsList ? `
                <div style="margin-top: 30px;">
                    <h4 style="color: #333; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <span>🏆 达成成就</span>
                    </h4>
                    <div style="margin-left: 10px;">
                        ${achievementsList}
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${incorrectWordsHTML}
            
            <div style="margin-top: 30px;">
                ${quizData.isBatchQuiz ? `
                <button class="btn" onclick="continueNextBatch()" style="margin: 10px;">
                    继续下一批
                </button>
                ` : `
                <button class="btn" onclick="showTrainingCompleteFinal()" style="margin: 10px;">
                    查看训练结果
                </button>
                `}
                <button class="btn btn-red" onclick="showStudentDashboard()" style="margin: 10px;">
                    返回主页
                </button>
            </div>
        </div>
    `;
}

// 显示训练完成
function showTrainingComplete() {
    // 训练完成后显示选择题
    showReviewQuiz();
}

// 显示批次复习测验
function showBatchReviewQuiz(batchWords) {
    // 从当前批次中选择所有单词进行测验
    const quizWords = batchWords;
    
    if (quizWords.length === 0) {
        // 如果没有可测试的单词，继续下一批
        continueNextBatch();
        return;
    }
    
    // 生成选择题
    const quizQuestions = quizWords.map((word, index) => {
        // 使用 buildQuizOptions 方法生成选项
        const options = buildQuizOptions(word.chinese, word);
        
        return {
            id: index,
            word: word,
            question: `"${word.english}" 的中文意思是？`,
            options: options,
            correctAnswer: word.chinese
        };
    });
    
    // 保存测验数据到状态
    appState.quizData = {
        questions: quizQuestions,
        currentQuestionIndex: 0,
        score: 0,
        originalQuestionCount: quizQuestions.length,
        isBatchQuiz: true
    };
    
    // 显示第一个问题
    displayQuizQuestion();
}

// 继续下一批训练
function continueNextBatch() {
    appState.currentBatchStart += appState.batchSize;
    
    if (appState.currentBatchStart >= appState.trainingWords.length) {
        // 所有单词训练完成
        showTrainingCompleteFinal();
    } else {
        // 开始下一批训练
        updateTrainingProgress();
        showCurrentWord();
    }
}

// 最终训练完成页面
function showTrainingCompleteFinal() {
    const trainingContent = document.getElementById('training-content');
    const totalWords = appState.trainingWords.length;
    const masteredWords = appState.trainingWords.filter(w => w.status === 'mastered').length;
    
    trainingContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 3em; margin-bottom: 20px;">🎉</div>
            <h3 style="color: #333; margin-bottom: 15px;">训练完成！</h3>
            <p style="color: #666; margin-bottom: 20px;">你已经完成了 ${totalWords} 个单词的训练</p>
            <p style="color: #4CAF50; margin-bottom: 30px;">掌握了 ${masteredWords} 个单词</p>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn" onclick="showStudentDashboard()">返回主页</button>
                <button class="btn btn-blue" onclick="startReviewTraining()">复习弱项</button>
            </div>
        </div>
    `;
    
    // 打卡记录已在测验完成时处理
}

// 取消训练
function cancelTraining() {
    if (confirm('确定要结束训练吗？')) {
        // 停止倒计时
        if (typeof stopCountdown === 'function') {
            stopCountdown();
        }
        showStudentDashboard();
    }
}

// 开始所有单词训练
function startAllWordsTraining() {
    if (appState.userWords.length === 0) {
        showAlert('没有单词可以训练', 'info');
        return;
    }
    
    // 打乱顺序
    const shuffledWords = [...appState.userWords].sort(() => Math.random() - 0.5);
    
    // 设置训练状态
    appState.trainingWords = shuffledWords;
    appState.currentWordIndex = 0;
    appState.isCardFlipped = false;
    appState.currentBatchStart = 0;
    appState.batchSize = 20;
    
    // 开始训练
    startTrainingSession();
}

// 开始复习训练
function startReviewTraining() {
    const weakWords = appState.userWords.filter(w => 
        w.status === 'new' || w.status === 'learning'
    );
    
    if (weakWords.length === 0) {
        showAlert('没有需要复习的单词', 'info');
        return;
    }
    
    // 打乱顺序
    const shuffledWords = [...weakWords].sort(() => Math.random() - 0.5);
    
    // 设置训练状态
    appState.trainingWords = shuffledWords;
    appState.currentWordIndex = 0;
    appState.isCardFlipped = false;
    appState.currentBatchStart = 0;
    appState.batchSize = 20;
    
    // 开始训练
    startTrainingSession();
}

// 显示今日单词
function showTodayWords() {
    showScreen('student-today-screen');
    loadTodayWords();
}

// 加载今日单词
function loadTodayWords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayWords = appState.userWords.filter(r => 
        r.last_reviewed && new Date(r.last_reviewed) >= today
    );
    
    const todayContent = document.getElementById('today-content');
    
    if (todayWords.length === 0) {
        todayContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #666;">今天还没有学习单词</p>
                <button class="btn" onclick="showStudentDashboard()" style="margin-top: 20px;">返回主页</button>
            </div>
        `;
        return;
    }
    
    let wordsHTML = `
        <div style="background: white; border-radius: 15px; padding: 20px;">
            <h3 style="color: #333; margin-bottom: 20px;">📅 今日学习的单词</h3>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 10px; margin-bottom: 15px; font-size: 14px; color: #666;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #4CAF50; border-radius: 2px; margin-right: 8px;"></span> 已掌握
                <span style="display: inline-block; width: 12px; height: 12px; background: #FF9800; border-radius: 2px; margin: 0 8px;"></span> 学习中
                <span style="display: inline-block; width: 12px; height: 12px; background: #2196F3; border-radius: 2px; margin: 0 8px;"></span> 未开始
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
    `;
    
    todayWords.forEach(word => {
        const reviewCount = word.review_count || 0;
        const lastReviewed = word.last_reviewed ? new Date(word.last_reviewed).toLocaleTimeString('zh-CN') : '未复习';
        
        wordsHTML += `
            <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; border-left: 4px solid ${word.status === 'mastered' ? '#4CAF50' : word.status === 'learning' ? '#FF9800' : '#2196F3'};">
                <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${formatWordDisplay(word.english)}</div>
                <div style="color: #666; margin-bottom: 10px;">${word.chinese}</div>
                <div style="font-size: 14px; color: #999;">
                    <div>复习次数: ${reviewCount}</div>
                    <div>最后复习: ${lastReviewed}</div>
                </div>
            </div>
        `;
    });
    
    wordsHTML += `
            </div>
        </div>
    `;
    
    todayContent.innerHTML = wordsHTML;
}

// 显示今日熟悉的单词
function showTodayLearningWords() {
    showScreen('student-today-screen');
    loadTodayLearningWords();
}

// 加载今日熟悉的单词
function loadTodayLearningWords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const learningWords = appState.userWords.filter(r => 
        r.status === 'learning' && r.last_reviewed && new Date(r.last_reviewed) >= today
    );
    
    const todayContent = document.getElementById('today-content');
    
    if (learningWords.length === 0) {
        todayContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #666;">今天还没有熟悉的单词</p>
                <button class="btn" onclick="showStudentDashboard()" style="margin-top: 20px;">返回主页</button>
            </div>
        `;
        return;
    }
    
    let wordsHTML = `
        <div style="background: white; border-radius: 15px; padding: 20px;">
            <h3 style="color: #333; margin-bottom: 20px;">🔄 今日熟悉的单词</h3>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 10px; margin-bottom: 15px; font-size: 14px; color: #666;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #FF9800; border-radius: 2px; margin-right: 8px;"></span> 学习中
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
    `;
    
    learningWords.forEach(word => {
        const reviewCount = word.review_count || 0;
        const lastReviewed = word.last_reviewed ? new Date(word.last_reviewed).toLocaleTimeString('zh-CN') : '未复习';
        
        wordsHTML += `
            <div style="background: #FFF3CD; border-radius: 10px; padding: 15px; border-left: 4px solid #FF9800;">
                <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${formatWordDisplay(word.english)}</div>
                <div style="color: #666; margin-bottom: 10px;">${word.chinese}</div>
                <div style="font-size: 14px; color: #999;">
                    <div>复习次数: ${reviewCount}</div>
                    <div>最后复习: ${lastReviewed}</div>
                </div>
            </div>
        `;
    });
    
    wordsHTML += `
            </div>
        </div>
    `;
    
    todayContent.innerHTML = wordsHTML;
}

// 显示今日掌握的单词
function showTodayMasteredWords() {
    showScreen('student-today-screen');
    loadTodayMasteredWords();
}

// 加载今日掌握的单词
function loadTodayMasteredWords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const masteredWords = appState.userWords.filter(r => 
        r.status === 'mastered' && r.last_reviewed && new Date(r.last_reviewed) >= today
    );
    
    const todayContent = document.getElementById('today-content');
    
    if (masteredWords.length === 0) {
        todayContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #666;">今天还没有掌握新单词</p>
                <button class="btn" onclick="showStudentDashboard()" style="margin-top: 20px;">返回主页</button>
            </div>
        `;
        return;
    }
    
    let wordsHTML = `
        <div style="background: white; border-radius: 15px; padding: 20px;">
            <h3 style="color: #333; margin-bottom: 20px;">🎉 今日掌握的单词</h3>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 10px; margin-bottom: 15px; font-size: 14px; color: #666;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #4CAF50; border-radius: 2px; margin-right: 8px;"></span> 已掌握
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
    `;
    
    masteredWords.forEach(word => {
        const reviewCount = word.review_count || 0;
        const lastReviewed = word.last_reviewed ? new Date(word.last_reviewed).toLocaleTimeString('zh-CN') : '未复习';
        
        wordsHTML += `
            <div style="background: #E8F5E9; border-radius: 10px; padding: 15px; border-left: 4px solid #4CAF50;">
                <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${formatWordDisplay(word.english)}</div>
                <div style="color: #666; margin-bottom: 10px;">${word.chinese}</div>
                <div style="font-size: 14px; color: #999;">
                    <div>复习次数: ${reviewCount}</div>
                    <div>最后复习: ${lastReviewed}</div>
                </div>
            </div>
        `;
    });
    
    wordsHTML += `
            </div>
        </div>
    `;
    
    todayContent.innerHTML = wordsHTML;
}

// 手动同步单词
async function manualSyncWords() {
    showAlert('正在同步单词...', 'info');
    
    try {
        const syncedCount = await syncGroupWordsToStudent();
        
        if (syncedCount > 0) {
            showAlert(`✅ 成功同步 ${syncedCount} 个新单词`, 'success');
        } else {
            showAlert('📚 没有新单词需要同步', 'info');
        }
        
        // 重新加载面板
        await loadStudentDashboardSimple();
        
    } catch (error) {
        console.error('同步单词错误:', error);
        showAlert('同步失败，请重试', 'error');
    }
}

// 显示我的单词本页面
function showMyWordListPage() {
    showScreen('student-wordlist-screen');
    loadMyWordList();
}

// 全局筛选状态变量
let currentFilterStatus = 'all';

// 加载我的单词本
function loadMyWordList() {
    const wordlistContent = document.getElementById('wordlist-content');
    
    if (appState.userWords.length === 0) {
        wordlistContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #666;">还没有单词</p>
                <button class="btn" onclick="showStudentDashboard()" style="margin-top: 20px;">返回主页</button>
            </div>
        `;
        return;
    }
    
    // 按状态分组
    const groupedWords = {
        mastered: appState.userWords.filter(w => w.status === 'mastered'),
        learning: appState.userWords.filter(w => w.status === 'learning'),
        new: appState.userWords.filter(w => w.status === 'new')
    };
    
    let wordlistHTML = `
        <div style="width: 100%; max-width: 1000px; margin: 0 auto; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap; gap: 10px;">
                <button class="btn ${currentFilterStatus === 'all' ? 'btn-blue' : ''}" onclick="filterWords('all')">全部</button>
                <button class="btn ${currentFilterStatus === 'mastered' ? 'btn-blue' : ''}" onclick="filterWords('mastered')">已掌握</button>
                <button class="btn ${currentFilterStatus === 'learning' ? 'btn-blue' : ''}" onclick="filterWords('learning')">学习中</button>
                <button class="btn ${currentFilterStatus === 'new' ? 'btn-blue' : ''}" onclick="filterWords('new')">未开始</button>
            </div>
    `;
    
    // 根据筛选状态显示相应的单词
    if (currentFilterStatus === 'all' || currentFilterStatus === 'mastered') {
        if (groupedWords.mastered.length > 0) {
            wordlistHTML += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #4CAF50; margin-bottom: 15px;">✅ 已掌握 (${groupedWords.mastered.length})</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                            <thead style="background: #E8F5E9;">
                                <tr>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #4CAF50; width: 30%;">单词</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #4CAF50; width: 25%;">中文</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #4CAF50; width: 15%;">复习次数</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #4CAF50; width: 30%;">最后复习</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groupedWords.mastered.map(word => `
                                    <tr style="border-bottom: 1px solid #e0e0e0;">
                                        <td style="padding: 10px; font-weight: bold;">${formatWordDisplay(word.english)}</td>
                                        <td style="padding: 10px; color: #666;">${word.chinese}</td>
                                        <td style="padding: 10px; text-align: center; color: #666;">${word.review_count || 0}</td>
                                        <td style="padding: 10px; color: #666; font-size: 14px;">${word.last_reviewed ? new Date(word.last_reviewed).toLocaleDateString('zh-CN') : '未复习'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
    
    if (currentFilterStatus === 'all' || currentFilterStatus === 'learning') {
        if (groupedWords.learning.length > 0) {
            wordlistHTML += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #FF9800; margin-bottom: 15px;">🔄 学习中 (${groupedWords.learning.length})</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                            <thead style="background: #FFF3CD;">
                                <tr>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #FF9800; width: 30%;">单词</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #FF9800; width: 25%;">中文</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #FF9800; width: 15%;">复习次数</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #FF9800; width: 30%;">最后复习</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groupedWords.learning.map(word => `
                                    <tr style="border-bottom: 1px solid #e0e0e0;">
                                        <td style="padding: 10px; font-weight: bold;">${formatWordDisplay(word.english)}</td>
                                        <td style="padding: 10px; color: #666;">${word.chinese}</td>
                                        <td style="padding: 10px; text-align: center; color: #666;">${word.review_count || 0}</td>
                                        <td style="padding: 10px; color: #666; font-size: 14px;">${word.last_reviewed ? new Date(word.last_reviewed).toLocaleDateString('zh-CN') : '未复习'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
    
    if (currentFilterStatus === 'all' || currentFilterStatus === 'new') {
        if (groupedWords.new.length > 0) {
            wordlistHTML += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2196F3; margin-bottom: 15px;">📚 未开始 (${groupedWords.new.length})</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                            <thead style="background: #E3F2FD;">
                                <tr>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #2196F3; width: 30%;">单词</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #2196F3; width: 25%;">中文</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #2196F3; width: 15%;">复习次数</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #2196F3; width: 30%;">最后复习</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groupedWords.new.map(word => `
                                    <tr style="border-bottom: 1px solid #e0e0e0;">
                                        <td style="padding: 10px; font-weight: bold;">${formatWordDisplay(word.english)}</td>
                                        <td style="padding: 10px; color: #666;">${word.chinese}</td>
                                        <td style="padding: 10px; text-align: center; color: #666;">${word.review_count || 0}</td>
                                        <td style="padding: 10px; color: #666; font-size: 14px;">${word.last_reviewed ? new Date(word.last_reviewed).toLocaleDateString('zh-CN') : '未复习'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
    
    // 如果没有符合条件的单词
    if ((currentFilterStatus === 'mastered' && groupedWords.mastered.length === 0) ||
        (currentFilterStatus === 'learning' && groupedWords.learning.length === 0) ||
        (currentFilterStatus === 'new' && groupedWords.new.length === 0)) {
        wordlistHTML += `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #666;">没有符合条件的单词</p>
                <button class="btn" onclick="filterWords('all')" style="margin-top: 20px;">查看全部</button>
            </div>
        `;
    }
    
    wordlistHTML += `
        </div>
    `;
    
    wordlistContent.innerHTML = wordlistHTML;
}

// 筛选单词
function filterWords(status) {
    currentFilterStatus = status;
    loadMyWordList();
}

// 显示学生成就页面
async function showStudentAchievements() {
    showScreen('student-achievements-screen');
    await loadStudentAchievements();
}

// 获取成就数据
function getAchievements() {
    // 从本地存储获取成就数据
    const storedAchievements = localStorage.getItem('kathy_achievements');
    if (storedAchievements) {
        return JSON.parse(storedAchievements);
    }
    
    // 默认返回空数组
    return [];
}

// 保存成就数据
function saveAchievements(achievements) {
    localStorage.setItem('kathy_achievements', JSON.stringify(achievements));
}

// 更新成就进度
async function updateAchievements() {
    try {
        const achievements = getAchievements();
        
        // 1. 计算连续学习天数
        const { data: checkinRecords, error: checkinError } = await dbClient
            .from('daily_checkin')
            .select('clock_in_date')
            .eq('student_id', appState.currentUser)
            .eq('is_clock_in', true)
            .order('clock_in_date', { ascending: false })
            .limit(30);
        
        if (!checkinError && checkinRecords && checkinRecords.length > 0) {
            let streak = 1;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < checkinRecords.length - 1; i++) {
                const currentDate = new Date(checkinRecords[i].clock_in_date);
                currentDate.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(checkinRecords[i + 1].clock_in_date);
                nextDate.setHours(0, 0, 0, 0);
                
                const diffTime = currentDate - nextDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    streak++;
                } else {
                    break;
                }
            }
            
            // 更新连续学习成就
            const threeDayAchievement = achievements.find(a => a.id === 'three-day-star');
            if (threeDayAchievement) {
                threeDayAchievement.progress = Math.min(streak, threeDayAchievement.target);
            }
            
            const weekAchievement = achievements.find(a => a.id === 'week-streak');
            if (weekAchievement) {
                weekAchievement.progress = Math.min(streak, weekAchievement.target);
            }
        }
        
        // 2. 计算掌握的单词数量
        const { data: studentWords, error: wordsError } = await dbClient
            .from('student_words')
            .select('status')
            .eq('student_id', appState.currentUser);
        
        if (!wordsError && studentWords) {
            const masteredWords = studentWords.filter(w => w.status === 'mastered').length;
            
            const vocabularyAchievement = achievements.find(a => a.id === 'vocabulary-master');
            if (vocabularyAchievement) {
                vocabularyAchievement.progress = Math.min(masteredWords, vocabularyAchievement.target);
            }
            
            const languageAchievement = achievements.find(a => a.id === 'language-master');
            if (languageAchievement) {
                languageAchievement.progress = Math.min(masteredWords, languageAchievement.target);
            }
        }
        
        // 保存更新后的成就
        saveAchievements(achievements);
        
        return achievements;
    } catch (error) {
        console.error('更新成就错误:', error);
        return getAchievements();
    }
}

// 加载学生成就
async function loadStudentAchievements() {
    const achievementsContent = document.getElementById('achievements-content');
    
    // 清空本地存储中的成就数据
    localStorage.removeItem('kathy_achievements');
    
    // 获取用户总分数
    let totalPoints = 0;
    try {
        const { data: user, error } = await dbClient
            .from('users')
            .select('total_points')
            .eq('username', appState.currentUser)
            .single();
        if (!error && user) {
            totalPoints = user.total_points || 0;
        }
    } catch (err) {
        console.error('获取用户分数错误:', err);
    }
    
    // 获取用户掌握的单词数量
    let masteredWords = 0;
    try {
        const { data: words, error } = await dbClient
            .from('student_words')
            .select('status')
            .eq('student_id', appState.currentUser);
        if (!error && words) {
            masteredWords = words.filter(word => word.status === 'mastered').length;
        }
    } catch (err) {
        console.error('获取掌握单词数量错误:', err);
    }
    
    // 获取用户的最长连续打卡天数
    let streakDays = 0;
    try {
        const { data: clockInRecord, error } = await dbClient
            .from('clock_in_records')
            .select('longest_streak')
            .eq('student_id', appState.currentUser)
            .single();
        if (!error && clockInRecord) {
            streakDays = clockInRecord.longest_streak || 0;
        }
    } catch (err) {
        console.error('获取连续学习天数错误:', err);
    }
    
    // 检查用户是否是蝉联冠军
    let isChampion = false;
    try {
        const { data: leaderboardRecord, error } = await dbClient
            .from('daily_leaderboard')
            .select('rank')
            .eq('student_id', appState.currentUser)
            .eq('rank', 1)
            .single();
        if (!error && leaderboardRecord) {
            isChampion = true;
        }
    } catch (err) {
        console.error('获取冠军状态错误:', err);
    }
    
    // 检查用户是否完成资料填写
    let hasProfileCompleted = false;
    try {
        const { data: user, error } = await dbClient
            .from('users')
            .select('profile_completed')
            .eq('username', appState.currentUser)
            .single();
        if (!error && user && user.profile_completed) {
            hasProfileCompleted = true;
        }
    } catch (err) {
        console.error('获取资料完成状态错误:', err);
    }
    
    // 检查用户的打卡时间成就
    let hasMidnightAchievement = false;
    let hasEarlyBirdAchievement = false;
    let hasGoldenHourAchievement = false;
    let hasLastMinuteAchievement = false;
    let hasSpeedAchievement = false;
    
    try {
        const { data: checkins, error } = await dbClient
            .from('daily_checkin')
            .select('created_at, updated_at')
            .eq('student_id', appState.currentUser);
        
        if (!error && checkins && checkins.length > 0) {
            checkins.forEach(checkin => {
                if (checkin.created_at) {
                    const checkinDate = new Date(checkin.created_at);
                    const hour = checkinDate.getHours();
                    const minute = checkinDate.getMinutes();
                    const totalMinutes = hour * 60 + minute;
                    
                    // 午夜成就：22:00-04:00
                    if ((hour >= 22 && hour <= 23) || (hour >= 0 && hour <= 4)) {
                        hasMidnightAchievement = true;
                    }
                    
                    // 早鸟成就：8:30以前
                    if (hour < 8 || (hour === 8 && minute <= 30)) {
                        hasEarlyBirdAchievement = true;
                    }
                    
                    // 黄金时段成就：15:00-18:00
                    if (hour >= 15 && hour < 18) {
                        hasGoldenHourAchievement = true;
                    }
                    
                    // 压线完成成就：11:30-11:59
                    if (hour === 11 && minute >= 30 && minute <= 59) {
                        hasLastMinuteAchievement = true;
                    }
                    
                    // 速度提前完成成就：created_at和updated_at的差异低于10分钟
                    if (checkin.created_at && checkin.updated_at) {
                        const createdAt = new Date(checkin.created_at);
                        const updatedAt = new Date(checkin.updated_at);
                        const timeDiff = (updatedAt - createdAt) / (1000 * 60); // 转换为分钟
                        if (timeDiff < 10) {
                            hasSpeedAchievement = true;
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('获取打卡时间成就错误:', err);
    }
    
    // 生成 Performance 类别的成就HTML
    const performanceAchievements = [
        {
            id: 'explorer',
            name: '探索者',
            englishName: 'Explorer',
            description: '开始学习之旅',
            target: 0,
            icon: '🌟',
            image: 'img/Level 1.png',
            color: '#FFD700'
        },
        {
            id: 'vocabulary-voyager',
            name: '词汇航行者',
            englishName: 'Word Voyager',
            description: '获得200分',
            target: 200,
            icon: '🚢',
            image: 'img/Level 2.png',
            color: '#2196F3'
        },
        {
            id: 'emerging-linguist',
            name: '新锐语言者',
            englishName: 'Rising Linguist',
            description: '获得600分',
            target: 600,
            icon: '📚',
            image: 'img/Level3.jpg',
            color: '#4CAF50'
        },
        {
            id: 'language-master',
            name: '语言大师',
            englishName: 'Language Master',
            description: '获得1200分',
            target: 1200,
            icon: '🎓',
            image: 'img/Level 4.png',
            color: '#FF9800'
        },
        {
            id: 'global-scholar',
            name: '全球学者',
            englishName: 'Global Scholar',
            description: '获得2000分',
            target: 2000,
            icon: '🌍',
            image: 'img/Level 5.png',
            color: '#9C27B0'
        },
        {
            id: 'world-expresser',
            name: '世界表达者',
            englishName: 'World Orator',
            description: '获得3000分',
            target: 3000,
            icon: '🎯',
            image: 'img/Level6.jpg',
            color: '#FF5722'
        }
    ];
    
    let performanceHTML = '';
    performanceAchievements.forEach((achievement, index) => {
        const isExplorer = index === 0;
        let progress, target, progressPercentage, isCompleted, opacity, filter, backgroundColor;
        
        if (isExplorer) {
            progress = 1;
            target = 1;
            progressPercentage = 100;
            isCompleted = true;
            opacity = 1;
            filter = 'none';
            backgroundColor = 'white';
        } else {
            progress = Math.min(totalPoints, achievement.target);
            target = achievement.target;
            progressPercentage = Math.min((progress / target) * 100, 100);
            isCompleted = progress >= target;
            opacity = isCompleted ? 1 : 0.6;
            filter = isCompleted ? 'none' : 'grayscale(100%)';
            backgroundColor = isCompleted ? 'white' : '#f5f5f5';
        }
        
        performanceHTML += `
            <div style="background: ${backgroundColor}; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                ${achievement.image ? `
                    <div style="margin-bottom: 10px; opacity: ${opacity}; filter: ${filter};">
                        <img src="${achievement.image}" alt="${achievement.name}" style="width: 60px; height: 60px; object-fit: contain;">
                    </div>
                ` : `
                    <div style="font-size: 36px; margin-bottom: 10px; opacity: ${opacity}; filter: ${filter};">
                        ${achievement.icon}
                    </div>
                `}
                <h4 style="color: #333; margin: 0 0 4px 0; font-size: 14px; filter: ${filter};">${achievement.name}</h4>
                <p style="color: #999; font-size: 11px; margin: 0 0 8px 0; filter: ${filter};">${achievement.englishName}</p>
                <p style="color: #666; font-size: 12px; margin: 0 0 12px 0; filter: ${filter};">${achievement.description}</p>
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left; filter: ${filter};">
                        进度: ${progress}/${target}
                    </div>
                    <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${progressPercentage}%; background: ${achievement.color}; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // 生成成就徽章墙
    let achievementsHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 40px;">
                <div style="font-size: 24px; margin-right: 10px;">🏆</div>
                <h3 style="color: #333; margin: 0;">成就徽章墙</h3>
            </div>
            
            <!-- Performance 表现类 -->
            <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 20px; margin-right: 10px;">🏆</div>
                    <h4 style="color: #333; margin: 0;">Performance（表现）</h4>
                    <div style="margin-left: 10px; font-size: 14px; color: #666;">总分数</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                    ${performanceHTML}
                </div>
            </div>
            
            <!-- Growth 成长类 -->
            <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 20px; margin-right: 10px;">🌱</div>
                    <h4 style="color: #333; margin: 0;">Growth（成长）</h4>
                    <div style="margin-left: 10px; font-size: 14px; color: #666;">掌握单词</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                    ${(() => {
                        const growthAchievements = [
                            { id: 'first-commitment', name: '第一次承诺', description: '完成个人资料填写', target: 1, color: '#9C27B0', icon: '📜', englishName: 'First Commitment' },
                            { id: 'first-horizon', name: '第一地平线', description: '掌握≥100词', target: 100, color: '#4CAF50', icon: '🌱', englishName: 'First Horizon' },
                            { id: 'open-lands', name: '开阔之地', description: '掌握≥300词', target: 300, color: '#8BC34A', icon: '🌿', englishName: 'Expanding Ground' },
                            { id: 'growth-forest', name: '成长森林', description: '掌握≥800词', target: 800, color: '#CDDC39', icon: '🌳', englishName: 'Growing Forest' },
                            { id: 'thinking-foundation', name: '思维基石', description: '掌握≥1500词', target: 1500, color: '#FFEB3B', icon: '🎓', englishName: 'Foundation of Thought' },
                            { id: 'language-voyager', name: '语言航行者', description: '掌握≥3000词', target: 3000, color: '#FFC107', icon: '🛳️', englishName: 'Language Navigator' },
                            { id: 'global-expresser', name: '全球表达者', description: '掌握≥5000词', target: 5000, color: '#FF9800', icon: '🌎', englishName: 'Global Communicator' },
                            { id: 'world-vocabulary', name: '世界词汇图', description: '掌握≥8000词', target: 8000, color: '#FF5722', icon: '👑', englishName: 'World Lexicon' }
                        ];
                        let growthHTML = '';
                        growthAchievements.forEach((achievement, index) => {
                            let progress, progressPercentage, isCompleted, opacity, filter, backgroundColor;
                            if (achievement.id === 'first-commitment') {
                                // 特殊处理First Commitment成就
                                progress = hasProfileCompleted ? 1 : 0;
                                progressPercentage = hasProfileCompleted ? 100 : 0;
                                isCompleted = hasProfileCompleted;
                                opacity = hasProfileCompleted ? 1 : 0.6;
                                filter = hasProfileCompleted ? 'none' : 'grayscale(100%)';
                                backgroundColor = hasProfileCompleted ? 'white' : '#f5f5f5';
                            } else {
                                // 其他成就基于掌握单词数
                                progress = Math.min(masteredWords, achievement.target);
                                progressPercentage = Math.min((progress / achievement.target) * 100, 100);
                                isCompleted = progress >= achievement.target;
                                opacity = isCompleted ? 1 : 0.6;
                                filter = isCompleted ? 'none' : 'grayscale(100%)';
                                backgroundColor = isCompleted ? 'white' : '#f5f5f5';
                            }
                            
                            growthHTML += `
                                <div style="background: ${backgroundColor}; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: ${opacity}; filter: ${filter};">
                                        ${achievement.icon}
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 4px 0; font-size: 14px; filter: ${filter};">${achievement.name}</h4>
                                    <p style="color: #999; font-size: 11px; margin: 0 0 8px 0; filter: ${filter};">${achievement.englishName}</p>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0; filter: ${filter};">${achievement.description}</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left; filter: ${filter};">
                                            进度: ${progress}/${achievement.target}
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: ${progressPercentage}%; background: ${achievement.color}; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        return growthHTML;
                    })()}
                </div>
            </div>
            
            <!-- Discipline 坚持类 -->
            <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 20px; margin-right: 10px;">🔥</div>
                    <h4 style="color: #333; margin: 0;">Discipline（坚持）</h4>
                    <div style="margin-left: 10px; font-size: 14px; color: #666;">连续学习</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                    ${(() => {
                        const disciplineAchievements = [
                            { id: 'week-streak', name: '七日之火', description: '连续学习7天', englishName: 'The Spark of Seven', target: 7, icon: '🔥', color: '#FF9800' },
                            { id: 'month-streak', name: '月度掌控者', description: '连续学习30天', englishName: 'Master of the Month', target: 30, icon: '🚀', color: '#2196F3' },
                            { id: 'hundred-streak', name: '百日意志', description: '连续学习100天', englishName: 'The Iron Hundred', target: 100, icon: '💯', color: '#4CAF50' },
                            { id: 'year-streak', name: '年度传奇', description: '连续学习365天', englishName: 'Legend of the Year', target: 365, icon: '💎', color: '#9C27B0' }
                        ];
                        let disciplineHTML = '';
                        disciplineAchievements.forEach((achievement) => {
                            const progress = Math.min(streakDays, achievement.target);
                            const progressPercentage = Math.min((progress / achievement.target) * 100, 100);
                            const isCompleted = progress >= achievement.target;
                            const opacity = isCompleted ? 1 : 0.6;
                            const filter = isCompleted ? 'none' : 'grayscale(100%)';
                            const backgroundColor = isCompleted ? 'white' : '#f5f5f5';
                            
                            disciplineHTML += `
                                <div style="background: ${backgroundColor}; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: ${opacity}; filter: ${filter};">
                                        ${achievement.icon}
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 4px 0; font-size: 14px; filter: ${filter};">${achievement.name}</h4>
                                    <p style="color: #999; font-size: 11px; margin: 0 0 8px 0; filter: ${filter};">${achievement.englishName}</p>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0; filter: ${filter};">${achievement.description}</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left; filter: ${filter};">
                                            进度: ${progress}/${achievement.target}
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: ${progressPercentage}%; background: ${achievement.color}; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        return disciplineHTML;
                    })()}
                </div>
            </div>
            
            <!-- Secret 隐藏类 -->
            <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 20px; margin-right: 10px;">🌌</div>
                    <h4 style="color: #333; margin: 0;">特殊成就</h4>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                    ${(() => {
                        let secretHTML = '';
                        
                        // 蝉联冠军成就
                        if (isChampion) {
                            secretHTML += `
                                <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                        🏆
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">蝉联冠军</h4>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">在每日排行榜中获得第1名</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left;">
                                            进度: 1/1
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: 100%; background: #FFD700; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // 午夜成就
                        if (hasMidnightAchievement) {
                            secretHTML += `
                                <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                        🦉
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">午夜</h4>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">22:00-04:00完成打卡</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left;">
                                            进度: 1/1
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: 100%; background: #9C27B0; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // 早鸟成就
                        if (hasEarlyBirdAchievement) {
                            secretHTML += `
                                <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                        🦜
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">早鸟</h4>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">8:30以前完成打卡</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left;">
                                            进度: 1/1
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: 100%; background: #FF9800; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // 黄金时段成就
                        if (hasGoldenHourAchievement) {
                            secretHTML += `
                                <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                        ☀️
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">黄金时段</h4>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">15:00-18:00完成打卡</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left;">
                                            进度: 1/1
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: 100%; background: #FFEB3B; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // 压线完成成就
                        if (hasLastMinuteAchievement) {
                            secretHTML += `
                                <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                        ⏳
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">压线完成</h4>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">11:30-11:59完成打卡</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left;">
                                            进度: 1/1
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: 100%; background: #FF5722; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // 速度提前完成成就
                        if (hasSpeedAchievement) {
                            secretHTML += `
                                <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                                    <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                        ⚡️
                                    </div>
                                    <h4 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">速度提前完成</h4>
                                    <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">10分钟内完成打卡</p>
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-align: left;">
                                            进度: 1/1
                                        </div>
                                        <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: 100%; background: #2196F3; transition: width 0.5s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // 如果没有任何隐藏成就
                        if (secretHTML === '') {
                            secretHTML = `
                                <div style="text-align: center; padding: 40px; color: #999;">
                                    暂无隐藏成就
                                </div>
                            `;
                        }
                        
                        return secretHTML;
                    })()}
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn" onclick="showStudentDashboard()" style="padding: 10px 30px;">返回主页</button>
            </div>
        </div>
    `;
    
    achievementsContent.innerHTML = achievementsHTML;
}

// 显示分享系统页面
function showShareSystemPage() {
    showScreen('teacher-share-screen');
    loadShareSystemPage();
}

// 加载分享系统页面
function loadShareSystemPage() {
    const shareContent = document.getElementById('teacher-share-content');
    
    shareContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h3 style="color: #333; margin-bottom: 30px;">🔗 分享系统</h3>
            <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 3em; margin-bottom: 20px;">📱</div>
                    <h4 style="color: #333; margin-bottom: 10px;">分享学习成果</h4>
                    <p style="color: #666;">将您的学习成就分享到社交媒体</p>
                </div>
                
                <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 30px;">
                    <button class="btn" style="padding: 15px 30px; font-size: 18px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📘</div>
                        <div>微信分享</div>
                    </button>
                    <button class="btn" style="padding: 15px 30px; font-size: 18px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
                        <div>复制链接</div>
                    </button>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    <h4 style="color: #333; margin-bottom: 15px;">分享链接</h4>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" value="https://kathy-words.com/share/${appState.currentUser}" 
                               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" 
                               readonly>
                        <button class="btn" onclick="copyShareLink()">复制</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 复制分享链接
function copyShareLink() {
    const linkInput = document.querySelector('input[value^="https://kathy-words.com/share/"]');
    linkInput.select();
    document.execCommand('copy');
    showAlert('链接已复制到剪贴板', 'success');
}

// 显示个人信息页面
async function showPersonalInfo() {
    showScreen('personal-info-screen');
    await loadPersonalInfo();
}

// 加载个人信息
async function loadPersonalInfo() {
    try {
        showLoading('正在加载个人信息...');
        
        // 获取用户信息
        const { data: user, error } = await dbClient
            .from('users')
            .select('*')
            .eq('username', appState.currentUser)
            .single();
        
        if (error) throw error;
        
        hideLoading();
        
        // 生成个人信息表单
        const personalInfoContent = document.getElementById('personal-info-content');
        personalInfoContent.innerHTML = `
            <h3 style="color: #333; margin-bottom: 30px; text-align: center;">个人信息编辑</h3>
            <form id="personal-info-form" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="color: #333; margin: 0 0 10px 0;">账号信息</h4>
                    <p style="color: #666; margin: 0;">用户名不可修改</p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">用户名</label>
                    <input type="text" id="username" value="${user.username}" disabled 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">生日</label>
                    <input type="date" id="birthday" value="${user.birthday || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">年龄</label>
                    <input type="number" id="age" value="${user.age || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">手机号</label>
                    <input type="tel" id="phone" value="${user.phone || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">微信</label>
                    <input type="text" id="wechat" value="${user.wechat || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">学校</label>
                    <input type="text" id="school" value="${user.school || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">年级</label>
                    <input type="text" id="grade" value="${user.grade || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">星座</label>
                    <input type="text" id="zodiac" value="${user.zodiac || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div style="grid-column: 1 / -1; background: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h4 style="color: #333; margin: 0 0 15px 0;">家长信息</h4>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">父亲姓名</label>
                    <input type="text" id="father_name" value="${user.father_name || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">父亲电话</label>
                    <input type="tel" id="father_phone" value="${user.father_phone || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">母亲姓名</label>
                    <input type="text" id="mother_name" value="${user.mother_name || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">母亲电话</label>
                    <input type="tel" id="mother_phone" value="${user.mother_phone || ''}" 
                           style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div style="grid-column: 1 / -1; background: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h4 style="color: #333; margin: 0 0 15px 0;">其他信息</h4>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">是否计划出国</label>
                    <select id="plan_to_go_abroad" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                        <option value="true" ${user.plan_to_go_abroad === true ? 'selected' : ''}>是</option>
                        <option value="false" ${user.plan_to_go_abroad === false ? 'selected' : ''}>否</option>
                    </select>
                </div>
                
                <div style="grid-column: 1 / -1; margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                    <button type="button" class="btn" onclick="showStudentDashboard()" style="padding: 12px 30px; font-size: 16px;">
                        取消
                    </button>
                    <button type="button" class="btn btn-blue" onclick="savePersonalInfo()" style="padding: 12px 30px; font-size: 16px;">
                        保存
                    </button>
                </div>
            </form>
        `;
        
    } catch (error) {
        hideLoading();
        console.error('加载个人信息错误:', error);
        showAlert('加载个人信息失败，请重试', 'error');
    }
}

// 保存个人信息
async function savePersonalInfo() {
    try {
        showLoading('正在保存个人信息...');
        
        // 收集表单数据，只包含有值的字段
        const formData = {};
        
        const birthday = document.getElementById('birthday').value;
        if (birthday) formData.birthday = birthday;
        
        const age = document.getElementById('age').value;
        if (age) formData.age = age;
        
        const phone = document.getElementById('phone').value.trim();
        if (phone) formData.phone = phone;
        
        const wechat = document.getElementById('wechat').value.trim();
        if (wechat) formData.wechat = wechat;
        
        const school = document.getElementById('school').value.trim();
        if (school) formData.school = school;
        
        const grade = document.getElementById('grade').value.trim();
        if (grade) formData.grade = grade;
        
        const zodiac = document.getElementById('zodiac').value.trim();
        if (zodiac) formData.zodiac = zodiac;
        
        const father_name = document.getElementById('father_name').value.trim();
        if (father_name) formData.father_name = father_name;
        
        const father_phone = document.getElementById('father_phone').value.trim();
        if (father_phone) formData.father_phone = father_phone;
        
        const mother_name = document.getElementById('mother_name').value.trim();
        if (mother_name) formData.mother_name = mother_name;
        
        const mother_phone = document.getElementById('mother_phone').value.trim();
        if (mother_phone) formData.mother_phone = mother_phone;
        
        // 布尔值字段总是包含
        formData.plan_to_go_abroad = document.getElementById('plan_to_go_abroad').value === 'true';
        formData.profile_completed = true; // 标记为已完成资料
        
        // 更新用户信息
        const { error } = await dbClient
            .from('users')
            .update(formData)
            .eq('username', appState.currentUser);
        
        if (error) throw error;
        
        hideLoading();
        showAlert('个人信息保存成功', 'success');
        
        // 重新加载个人信息
        await loadPersonalInfo();
        
    } catch (error) {
        hideLoading();
        console.error('保存个人信息错误:', error);
        showAlert('保存个人信息失败，请重试', 'error');
    }
}

// 显示所有学生页面
function showAllStudentsPage() {
    showScreen('teacher-students-screen');
    loadAllStudentsPage();
}

// 加载所有学生页面
async function loadAllStudentsPage() {
    try {
        const content = document.getElementById('teacher-students-content');
        content.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <h3 style="color: #333; margin-bottom: 30px;">📋 所有学生</h3>
                <div style="background: white; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <div id="students-list" style="text-align: center;">
                        <div class="loading-spinner"></div>
                        <p style="color: #666; margin-top: 20px;">正在加载学生列表...</p>
                    </div>
                </div>
            </div>
        `;
        
        // 获取所有学生
        const { data: students, error } = await dbClient
            .from('users')
            .select('*')
            .eq('role', 'student')
            .order('username');
        
        if (error) throw error;
        
        const studentsList = document.getElementById('students-list');
        
        if (!students || students.length === 0) {
            studentsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #666;">还没有学生注册</p>
                </div>
            `;
            return;
        }
        
        // 并行获取每个学生的学习数据
        const studentsWithData = await Promise.all(students.map(async (student) => {
            try {
                // 并行获取不同状态的单词数量
                const [totalResult, masteredResult, learningResult, reviewResult] = await Promise.all([
                    // 总单词数
                    dbClient
                        .from('student_words')
                        .select('id', { count: 'exact' })
                        .eq('student_id', student.username),
                    // 已掌握单词数
                    dbClient
                        .from('student_words')
                        .select('id', { count: 'exact' })
                        .eq('student_id', student.username)
                        .eq('status', 'mastered'),
                    // 学习中单词数
                    dbClient
                        .from('student_words')
                        .select('id', { count: 'exact' })
                        .eq('student_id', student.username)
                        .eq('status', 'learning'),
                    // 需复习单词数（状态为 'new' 且已学习过）
                    dbClient
                        .from('student_words')
                        .select('id', { count: 'exact' })
                        .eq('student_id', student.username)
                        .eq('status', 'new')
                        .is('last_reviewed', 'not.null')
                ]);
                
                const totalWords = totalResult.count || 0;
                const masteredWords = masteredResult.count || 0;
                const learningWords = learningResult.count || 0;
                const reviewWords = reviewResult.count || 0;
                
                // 计算最后登录时间
                const lastLogin = student.last_login ? new Date(student.last_login).toLocaleString('zh-CN') : '从未登录';
                
                // 检查今日打卡状态
                const today = new Date().toISOString().split('T')[0];
                const { data: checkinRecord, error: checkinError } = await dbClient
                    .from('daily_checkin')
                    .select('*')
                    .eq('student_id', student.username)
                    .eq('clock_in_date', today)
                    .single();
                
                const isCheckedIn = !!checkinRecord?.is_clock_in;
                
                return {
                    ...student,
                    lastLogin: lastLogin,
                    totalWords: totalWords,
                    masteredWords: masteredWords,
                    learningWords: learningWords,
                    reviewWords: reviewWords,
                    isCheckedIn: isCheckedIn
                };
            } catch (err) {
                console.error(`获取学生 ${student.username} 数据错误:`, err);
                return {
                    ...student,
                    lastLogin: '未知',
                    totalWords: 0,
                    masteredWords: 0,
                    learningWords: 0,
                    reviewWords: 0,
                    isCheckedIn: false
                };
            }
        }));
        
        let studentsHTML = `
            <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 1000px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">今日打卡</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">学生姓名</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">最后登录</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">单词总数</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">已掌握</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">熟悉</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">需复习</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">家长关联</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const student of studentsWithData) {
            const parentStatus = student.parent_id ? 
                `<span style="color: #4CAF50; cursor: pointer; text-decoration: underline;" onclick="removeParentAssociation('${student.username}')">${student.parent_id} (点击移除)</span>` : 
                `<span style="color: #FF9800;">未关联</span>`;
            
            const checkinStatus = student.isCheckedIn ? 
                `<span style="color: #4CAF50; font-weight: bold;">已打卡</span>` : 
                `<span style="color: #F44336; font-weight: bold;">未打卡</span>`;
            
            studentsHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px; text-align: center;">${checkinStatus}</td>
                    <td style="padding: 8px;">
                        <div style="font-weight: bold;">${student.username}</div>
                    </td>
                    <td style="padding: 8px; color: #666; font-size: 14px;">${student.lastLogin}</td>
                    <td style="padding: 8px; text-align: center; cursor: pointer; text-decoration: underline; color: #2196F3;" onclick="viewStudentWords('${student.username}', 'all')">${student.totalWords}</td>
                    <td style="padding: 8px; text-align: center; cursor: pointer; text-decoration: underline; color: #4CAF50;" onclick="viewStudentWords('${student.username}', 'mastered')">${student.masteredWords}</td>
                    <td style="padding: 8px; text-align: center; cursor: pointer; text-decoration: underline; color: #FF9800;" onclick="viewStudentWords('${student.username}', 'learning')">${student.learningWords}</td>
                    <td style="padding: 8px; text-align: center; cursor: pointer; text-decoration: underline; color: #2196F3;" onclick="viewStudentWords('${student.username}', 'new')">${student.reviewWords}</td>
                    <td style="padding: 8px; font-size: 14px;">${parentStatus}</td>
                    <td style="padding: 8px; text-align: center;">
                        <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: nowrap;">
                            <button class="btn" onclick="viewStudentDetails('${student.username}')" style="padding: 6px 12px; font-size: 12px; margin: 0;">
                                详情
                            </button>
                            <button class="btn" onclick="editStudent('${student.username}')" style="padding: 6px 12px; font-size: 12px; margin: 0;">
                                编辑
                            </button>
                            <button class="btn" onclick="associateStudentToParent('${student.username}')" style="padding: 6px 12px; font-size: 12px; margin: 0;">
                                ${student.parent_id ? '更换家长' : '关联家长'}
                            </button>
                            <button class="btn btn-red" onclick="deleteStudent('${student.username}')" style="padding: 6px 12px; font-size: 12px; margin: 0;">
                                删除学生
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        studentsHTML += `
                </tbody>
            </table>
            </div>
            <div style="text-align: right; margin-top: 20px; color: #666;">
                总计: ${students.length} 名学生
            </div>
        `;
        
        studentsList.innerHTML = studentsHTML;
        
    } catch (error) {
        console.error('加载学生列表错误:', error);
        document.getElementById('teacher-students-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 显示学习进度页面
function showLearningProgressPage() {
    showScreen('teacher-progress-screen');
    loadLearningProgressPage();
}

// 加载学习进度页面
async function loadLearningProgressPage() {
    try {
        const content = document.getElementById('teacher-progress-content');
        content.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <h3 style="color: #333; margin-bottom: 30px;">📊 学习进度</h3>
                <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <div id="progress-list" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        <p style="color: #666; margin-top: 20px;">正在加载学习进度...</p>
                    </div>
                </div>
            </div>
        `;
        
        // 获取所有学生
        const { data: students, error: studentsError } = await dbClient
            .from('users')
            .select('*')
            .eq('role', 'student')
            .order('username');
        
        if (studentsError) throw studentsError;
        
        const progressList = document.getElementById('progress-list');
        
        if (!students || students.length === 0) {
            progressList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #666;">还没有学生注册</p>
                </div>
            `;
            return;
        }
        
        // 串行获取每个学生的学习记录，避免并行请求限制
        const studentsWithProgress = [];
        for (const student of students) {
            try {
                console.log(`获取学生 ${student.username} 的单词数据...`);
                
                // 并行获取总单词数和已掌握单词数
                const [totalResult, masteredResult] = await Promise.all([
                    // 获取总单词数
                    dbClient
                        .from('student_words')
                        .select('id', { count: 'exact' })
                        .eq('student_id', student.username),
                    // 获取已掌握单词数
                    dbClient
                        .from('student_words')
                        .select('id', { count: 'exact' })
                        .eq('student_id', student.username)
                        .eq('status', 'mastered')
                ]);
                
                const total = totalResult.count || 0;
                const mastered = masteredResult.count || 0;
                const progress = total > 0 ? Math.round((mastered / total) * 100) : 0;
                console.log(`学生 ${student.username}: 总单词数=${total}, 已掌握=${mastered}, 进度=${progress}%`);
                studentsWithProgress.push({
                    ...student,
                    totalWords: total,
                    masteredWords: mastered,
                    progress: progress
                });
            } catch (err) {
                console.error(`获取学生 ${student.username} 进度错误:`, err);
                studentsWithProgress.push({
                    ...student,
                    totalWords: 0,
                    masteredWords: 0,
                    progress: 0
                });
            }
        }
        
        let progressHTML = `
            <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">学生姓名</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">总单词数</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">已掌握</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">掌握率</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; white-space: nowrap;">操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        studentsWithProgress.forEach(student => {
            progressHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">
                        <div style="font-weight: bold;">${student.username}</div>
                    </td>
                    <td style="padding: 8px; text-align: center;">${student.totalWords}</td>
                    <td style="padding: 8px; text-align: center; color: #4CAF50;">${student.masteredWords}</td>
                    <td style="padding: 8px; text-align: center;">
                        <div style="display: inline-block; width: 60px;">
                            <div style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: #4CAF50; width: ${student.progress}%;"></div>
                            </div>
                            <div style="font-size: 12px; margin-top: 5px; color: #666;">${student.progress}%</div>
                        </div>
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <button class="btn btn-red" onclick="deleteStudent('${student.username}')" style="padding: 6px 12px; font-size: 12px; margin: 0;">
                            删除学生
                        </button>
                    </td>
                </tr>
            `;
        });
        
        progressHTML += `
                </tbody>
            </table>
            </div>
        `;
        
        progressList.innerHTML = progressHTML;
        
    } catch (error) {
        console.error('加载学习进度错误:', error);
        document.getElementById('teacher-progress-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 显示单词管理页面
function showWordManagementPage() {
    showScreen('teacher-words-screen');
    loadWordManagementPage();
}

// 加载单词管理页面
async function loadWordManagementPage() {
    try {
        const content = document.getElementById('teacher-words-content');
        content.innerHTML = `
            <div style="width: 100%; max-width: 1000px; margin: 0 auto; box-sizing: border-box;">
                <h3 style="color: #333; margin-bottom: 30px;">📖 单词管理</h3>
                <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                        <h4 style="margin-bottom: 15px; color: #555;">筛选条件</h4>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">分组</label>
                                <select id="filter-group" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px;">
                                    <option value="">全部分组</option>
                                    <!-- 分组选项将通过JavaScript动态添加 -->
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">上传时间</label>
                                <input type="date" id="filter-date" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">排序方式</label>
                                <select id="filter-sort" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px;">
                                    <option value="latest">最新优先</option>
                                    <option value="az">A-Z 排序</option>
                                    <option value="za">Z-A 排序</option>
                                </select>
                            </div>
                            <div style="align-self: flex-end;">
                                <button class="btn btn-blue" onclick="filterWordsManagement()" style="padding: 8px 20px; margin-right: 10px;">搜索</button>
                                <button class="btn" onclick="resetFilterManagement()" style="padding: 8px 20px;">重置</button>
                            </div>
                        </div>
                    </div>
                    <div id="words-list" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        <p style="color: #666; margin-top: 20px;">正在加载单词列表...</p>
                    </div>
                </div>
            </div>
        `;
        
        // 获取所有分组
        const { data: groups, error: groupsError } = await dbClient
            .from('groups')
            .select('*')
            .eq('teacher_id', appState.teacherId)
            .order('name');
        
        if (groupsError) {
            console.error('获取分组错误:', groupsError);
        }
        
        // 填充分组下拉框
        const groupSelect = document.getElementById('filter-group');
        if (groups && groups.length > 0) {
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
        }
        
        // 加载单词（默认加载所有）
        await loadWordsWithFilter();
    } catch (error) {
        console.error('加载单词管理页面错误:', error);
        document.getElementById('teacher-words-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 加载带筛选条件的单词
async function loadWordsWithFilter(groupId = '', date = '', sort = 'latest', page = 1, pageSize = 20) {
    try {
        const wordsList = document.getElementById('words-list');
        wordsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="color: #666; margin-top: 20px;">正在加载单词列表...</p>
            </div>
        `;
        
        // 先获取所有分组信息，用于显示分组名称
        let groupsMap = {};
        const { data: groups, error: groupsError } = await dbClient
            .from('groups')
            .select('*')
            .eq('teacher_id', appState.teacherId);
        
        if (!groupsError && groups) {
            groups.forEach(group => {
                groupsMap[group.id] = group.name;
            });
        }
        
        // 构建查询（连续构建，不被await中断）
        let countQuery = dbClient
            .from('words')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', appState.teacherId);
        
        let dataQuery = dbClient
            .from('words')
            .select('*')
            .eq('teacher_id', appState.teacherId);
        
        // 添加分组筛选
        if (groupId) {
            countQuery = countQuery.eq('group_id', groupId);
            dataQuery = dataQuery.eq('group_id', groupId);
        }
        
        // 添加日期筛选
        if (date) {
            const startDate = date + 'T00:00:00.000Z';
            const endDate = date + 'T23:59:59.999Z';
            countQuery = countQuery.gte('created_at', startDate).lte('created_at', endDate);
            dataQuery = dataQuery.gte('created_at', startDate).lte('created_at', endDate);
        }
        
        // 执行计数查询
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        
        // 执行数据查询
        const { data: words, error: dataError } = await dataQuery;
        if (dataError) throw dataError;
        
        if (!words || words.length === 0) {
            wordsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #666;">没有找到符合条件的单词</p>
                    <button class="btn btn-blue" onclick="showUploadWordsPage()" style="margin-top: 20px;">
                        上传单词
                    </button>
                </div>
            `;
            return;
        }
        
        // 手动排序
        let sortedWords = [...words];
        if (sort === 'az') {
            console.log('Applying A-Z sort');
            sortedWords.sort((a, b) => a.english.localeCompare(b.english));
        } else if (sort === 'za') {
            console.log('Applying Z-A sort');
            sortedWords.sort((a, b) => b.english.localeCompare(a.english));
        } else {
            console.log('Applying default sort (latest first)');
            // 默认按创建时间降序
            sortedWords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        // 分页处理
        const totalItems = count || 0;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedWords = sortedWords.slice(startIndex, endIndex);
        
        let wordsHTML = `
            <div style="overflow-x: auto; width: 100%;">
                <table style="width: 100%; border-collapse: collapse; min-width: 700px;">
                    <thead style="background: #f8f9fa;">
                        <tr>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 20%;">单词</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 20%;">中文</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 15%;">分组</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 10%;">状态</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 20%;">上传时间</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; width: 15%;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        paginatedWords.forEach(word => {
            const createdAt = word.created_at ? new Date(word.created_at).toLocaleString('zh-CN') : '未知';
            const groupName = word.group_id ? (groupsMap[word.group_id] || word.group_id) : '未分组';
            const status = word.status || '正常';
            
            wordsHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; font-weight: bold;">${formatWordDisplay(word.english)}</td>
                    <td style="padding: 10px; color: #666;">${word.chinese}</td>
                    <td style="padding: 10px; color: #666;">${groupName}</td>
                    <td style="padding: 10px; color: #666;">${status}</td>
                    <td style="padding: 10px; color: #666; font-size: 14px;">${createdAt}</td>
                    <td style="padding: 10px; text-align: center;">
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn" onclick="editWord('${word.id}')" style="padding: 6px 12px; font-size: 12px;">
                                编辑
                            </button>
                            <button class="btn btn-red" onclick="deleteWordFixed('${word.id}', '${word.english}')" style="padding: 6px 12px; font-size: 12px;">
                                删除
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        wordsHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        // 添加分页控件
        if (totalPages > 1) {
            wordsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <div style="color: #666; font-size: 14px;">
                        共 ${totalItems} 个单词，第 ${page} / ${totalPages} 页
                    </div>
                    <div style="display: flex; gap: 5px;">
            `;
            
            // 上一页
            if (page > 1) {
                wordsHTML += `
                    <button class="btn" onclick="loadWordsWithFilter('${groupId}', '${date}', '${sort}', ${page - 1}, ${pageSize})" style="padding: 6px 12px; font-size: 14px;">
                        上一页
                    </button>
                `;
            }
            
            // 页码按钮
            const startPage = Math.max(1, page - 2);
            const endPage = Math.min(totalPages, startPage + 4);
            
            for (let i = startPage; i <= endPage; i++) {
                wordsHTML += `
                    <button class="btn ${i === page ? 'btn-blue' : ''}" onclick="loadWordsWithFilter('${groupId}', '${date}', '${sort}', ${i}, ${pageSize})" style="padding: 6px 12px; font-size: 14px;">
                        ${i}
                    </button>
                `;
            }
            
            // 下一页
            if (page < totalPages) {
                wordsHTML += `
                    <button class="btn" onclick="loadWordsWithFilter('${groupId}', '${date}', '${sort}', ${page + 1}, ${pageSize})" style="padding: 6px 12px; font-size: 14px;">
                        下一页
                    </button>
                `;
            }
            
            wordsHTML += `
                    </div>
                </div>
            `;
        } else if (totalItems > 0) {
            wordsHTML += `
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
                    共 ${totalItems} 个单词
                </div>
            `;
        }
        
        wordsHTML += `
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-blue" onclick="showUploadWordsPage()" style="padding: 12px 30px; font-size: 16px;">
                    📤 上传更多单词
                </button>
            </div>
        `;
        
        wordsList.innerHTML = wordsHTML;
        
    } catch (error) {
        console.error('加载单词错误:', error);
        const wordsList = document.getElementById('words-list');
        wordsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: red;">加载失败，请重试</p>
            </div>
        `;
    }
}

// 筛选单词（单词管理页面）
function filterWordsManagement() {
    const groupId = document.getElementById('filter-group').value;
    const date = document.getElementById('filter-date').value;
    const sort = document.getElementById('filter-sort').value;
    console.log('filterWordsManagement called with sort:', sort);
    loadWordsWithFilter(groupId, date, sort);
}

// 重置筛选条件（单词管理页面）
function resetFilterManagement() {
    document.getElementById('filter-group').value = '';
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-sort').value = 'latest';
    loadWordsWithFilter();
}

// 编辑单词
async function editWord(wordId) {
    try {
        showLoading('正在加载单词信息...');
        
        // 获取单词信息
        const { data: word, error } = await dbClient
            .from('words')
            .select('*')
            .eq('id', wordId)
            .single();
        
        if (error) throw error;
        
        // 获取所有分组
        const { data: groups, error: groupsError } = await dbClient
            .from('groups')
            .select('*')
            .eq('teacher_id', appState.teacherId)
            .order('name');
        
        if (groupsError) {
            console.error('获取分组错误:', groupsError);
        }
        
        hideLoading();
        
        // 生成唯一的模态框 ID
        const modalId = 'edit-word-modal-' + Date.now();
        
        // 生成分组选项
        let groupOptions = '<option value="">未分组</option>';
        if (groups && groups.length > 0) {
            groups.forEach(group => {
                const selected = word.group_id === group.id ? 'selected' : '';
                groupOptions += `<option value="${group.id}" ${selected}>${group.name}</option>`;
            });
        }
        
        // 生成状态选项
        const statusOptions = `
            <option value="正常" ${word.status === '正常' ? 'selected' : ''}>正常</option>
            <option value="禁用" ${word.status === '禁用' ? 'selected' : ''}>禁用</option>
        `;
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 30px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <h3 style="color: #333; margin-bottom: 20px; text-align: center;">编辑单词</h3>
                <form id="edit-word-form" onsubmit="event.preventDefault(); saveWord('${wordId}', '${modalId}')">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">单词</label>
                        <input type="text" id="edit-english" value="${word.english}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">中文</label>
                        <input type="text" id="edit-chinese" value="${word.chinese}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">分组</label>
                        <select id="edit-group" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            ${groupOptions}
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">状态</label>
                        <select id="edit-status" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            ${statusOptions}
                        </select>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <button type="submit" class="btn btn-blue" style="padding: 10px 30px; margin-right: 10px;">保存</button>
                        <button type="button" class="btn" onclick="document.getElementById('${modalId}').remove()" style="padding: 10px 30px;">取消</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击模态框外部关闭
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
    } catch (error) {
        console.error('编辑单词错误:', error);
        hideLoading();
        showAlert('加载单词信息失败，请重试', 'error');
    }
}

// 保存单词修改
async function saveWord(wordId, modalId) {
    try {
        showLoading('正在保存...');
        
        const english = document.getElementById('edit-english').value;
        const chinese = document.getElementById('edit-chinese').value;
        const groupId = document.getElementById('edit-group').value;
        const status = document.getElementById('edit-status').value;
        
        const { error } = await dbClient
            .from('words')
            .update({
                english: english,
                chinese: chinese,
                group_id: groupId || null,
                status: status
            })
            .eq('id', wordId);
        
        if (error) throw error;
        
        hideLoading();
        document.getElementById(modalId).remove();
        showAlert('单词修改成功', 'success');
        
        // 重新加载单词列表
        loadWordsWithFilter();
        
    } catch (error) {
        console.error('保存单词错误:', error);
        hideLoading();
        showAlert('保存失败，请重试', 'error');
    }
}

// 查看学生单词
async function viewStudentWords(studentId, status) {
    try {
        showLoading(`正在加载${getStatusText(status)}单词...`);
        
        // 获取学生单词（设置较大的 limit 确保获取所有单词）
        const { data: studentWords, error } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', studentId)
            .eq(status !== 'all' ? 'status' : 'student_id', status !== 'all' ? status : studentId)
            .limit(10000);
        
        if (error) throw error;
        
        hideLoading();
        
        if (!studentWords || studentWords.length === 0) {
            showAlert(`该学生没有${getStatusText(status)}单词`, 'info');
            return;
        }
        
        // 显示单词列表
        let wordsHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                <h3 style="color: #333; margin-bottom: 20px; text-align: center;">${studentId}的${getStatusText(status)}单词</h3>
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f8f9fa;">
                            <tr>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">单词</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">中文</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">分数</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">复习次数</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">最后复习</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        studentWords.forEach(word => {
            const reviewCount = word.review_count || 0;
            const lastReviewed = word.last_reviewed ? new Date(word.last_reviewed).toLocaleDateString('zh-CN') : '未复习';
            
            wordsHTML += `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 12px; font-weight: bold;">${formatWordDisplay(word.english)}</td>
                    <td style="padding: 12px; color: #666;">${word.chinese}</td>
                    <td style="padding: 12px; color: #666;">${word.score || 0}</td>
                    <td style="padding: 12px; color: #666;">${reviewCount}</td>
                    <td style="padding: 12px; color: #666;">${lastReviewed}</td>
                </tr>
            `;
        });
        
        // 生成唯一的模态框 ID
        const modalId = 'student-words-modal-' + Date.now();
        
        wordsHTML += `
                        </tbody>
                    </table>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="document.getElementById('${modalId}').remove()">关闭</button>
                </div>
            </div>
        `;
        
        // 创建模态框显示单词列表
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 20px; max-width: 900px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                ${wordsHTML}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击模态框外部关闭
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
    } catch (error) {
        console.error('查看学生单词错误:', error);
        hideLoading();
        showAlert('加载单词失败，请重试', 'error');
    }
}

// 获取状态颜色
function getStatusColor(status) {
    switch (status) {
        case 'mastered': return '#E8F5E9';
        case 'learning': return '#FFF3CD';
        case 'new': return '#E3F2FD';
        default: return '#f8f9fa';
    }
}

// 获取状态边框颜色
function getStatusBorderColor(status) {
    switch (status) {
        case 'mastered': return '#4CAF50';
        case 'learning': return '#FF9800';
        case 'new': return '#2196F3';
        default: return '#ddd';
    }
}

// 编辑学生
async function editStudent(username) {
    try {
        // 获取学生信息
        const { data: student, error } = await dbClient
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (error) throw error;
        
        // 创建编辑模态框
        const modalHTML = `
            <div id="edit-student-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); width: 800px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h3 style="color: #333; margin-bottom: 20px; text-align: center;">编辑学生信息</h3>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 15px;">账号信息</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">用户名</label>
                                <input type="text" id="edit-username" value="${student.username}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">邮箱</label>
                                <input type="email" id="edit-email" value="${student.email || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">密码 (留空表示不修改)</label>
                                <input type="password" id="edit-password" placeholder="输入新密码" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">家长ID</label>
                                <input type="text" id="edit-parent-id" value="${student.parent_id || ''}" placeholder="输入家长ID" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 15px;">基本信息</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">真实姓名</label>
                                <input type="text" id="edit-real-name" value="${student.real_name || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">生日</label>
                                <input type="date" id="edit-birthday" value="${student.birthday || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">年龄</label>
                                <input type="number" id="edit-age" value="${student.age || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">手机号</label>
                                <input type="tel" id="edit-phone" value="${student.phone || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">微信</label>
                                <input type="text" id="edit-wechat" value="${student.wechat || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">学校</label>
                                <input type="text" id="edit-school" value="${student.school || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">年级</label>
                                <input type="text" id="edit-grade" value="${student.grade || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">星座</label>
                                <input type="text" id="edit-zodiac" value="${student.zodiac || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 15px;">家长信息</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">父亲姓名</label>
                                <input type="text" id="edit-father-name" value="${student.father_name || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">父亲电话</label>
                                <input type="tel" id="edit-father-phone" value="${student.father_phone || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">母亲姓名</label>
                                <input type="text" id="edit-mother-name" value="${student.mother_name || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">母亲电话</label>
                                <input type="tel" id="edit-mother-phone" value="${student.mother_phone || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 15px;">其他信息</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">是否在读</label>
                                <select id="edit-is-student" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                                    <option value="true" ${student.is_student ? 'selected' : ''}>是</option>
                                    <option value="false" ${!student.is_student ? 'selected' : ''}>否</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">是否计划出国</label>
                                <select id="edit-plan-to-go-abroad" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                                    <option value="true" ${student.plan_to_go_abroad ? 'selected' : ''}>是</option>
                                    <option value="false" ${!student.plan_to_go_abroad ? 'selected' : ''}>否</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">是否续费</label>
                                <select id="edit-is-renewed" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                                    <option value="true" ${student.is_renewed ? 'selected' : ''}>是</option>
                                    <option value="false" ${!student.is_renewed ? 'selected' : ''}>否</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">是否完成资料</label>
                                <select id="edit-profile-completed" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                                    <option value="true" ${student.profile_completed ? 'selected' : ''}>是</option>
                                    <option value="false" ${!student.profile_completed ? 'selected' : ''}>否</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                        <button onclick="cancelEditStudent()" style="padding: 10px 20px; border: 1px solid #ddd; border-radius: 5px; background: #f5f5f5; cursor: pointer; font-size: 14px;">取消</button>
                        <button onclick="saveStudentChanges('${username}')" style="padding: 10px 20px; border: none; border-radius: 5px; background: #4CAF50; color: white; cursor: pointer; font-size: 14px;">保存</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('编辑学生错误:', error);
        showAlert('加载学生信息失败，请稍后重试', 'error');
    }
}

// 取消编辑学生
function cancelEditStudent() {
    const modal = document.getElementById('edit-student-modal');
    if (modal) {
        modal.remove();
    }
}

// 保存学生修改
async function saveStudentChanges(oldUsername) {
    try {
        const newUsername = document.getElementById('edit-username').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const password = document.getElementById('edit-password').value;
        const parentId = document.getElementById('edit-parent-id').value.trim();
        
        // 基本信息
        const realName = document.getElementById('edit-real-name').value.trim();
        const birthday = document.getElementById('edit-birthday').value;
        const age = document.getElementById('edit-age').value;
        const phone = document.getElementById('edit-phone').value.trim();
        const wechat = document.getElementById('edit-wechat').value.trim();
        const school = document.getElementById('edit-school').value.trim();
        const grade = document.getElementById('edit-grade').value.trim();
        const zodiac = document.getElementById('edit-zodiac').value.trim();
        
        // 家长信息
        const fatherName = document.getElementById('edit-father-name').value.trim();
        const fatherPhone = document.getElementById('edit-father-phone').value.trim();
        const motherName = document.getElementById('edit-mother-name').value.trim();
        const motherPhone = document.getElementById('edit-mother-phone').value.trim();
        
        // 其他信息
        const isStudent = document.getElementById('edit-is-student').value === 'true';
        const planToGoAbroad = document.getElementById('edit-plan-to-go-abroad').value === 'true';
        const isRenewed = document.getElementById('edit-is-renewed').value === 'true';
        const profileCompleted = document.getElementById('edit-profile-completed').value === 'true';
        
        if (!newUsername) {
            showAlert('学生姓名不能为空', 'error');
            return;
        }
        
        // 准备更新数据
        const updateData = {};
        
        if (newUsername !== oldUsername) {
            updateData.username = newUsername;
        }
        
        if (email) {
            updateData.email = email;
        }
        
        if (password) {
            updateData.password = password;
        }
        
        if (parentId) {
            updateData.parent_id = parentId;
        } else {
            updateData.parent_id = null;
        }
        
        // 基本信息
        if (realName) {
            updateData.real_name = realName;
        }
        if (birthday) {
            updateData.birthday = birthday;
        }
        if (age) {
            updateData.age = age;
        }
        if (phone) {
            updateData.phone = phone;
        }
        if (wechat) {
            updateData.wechat = wechat;
        }
        if (school) {
            updateData.school = school;
        }
        if (grade) {
            updateData.grade = grade;
        }
        if (zodiac) {
            updateData.zodiac = zodiac;
        }
        
        // 家长信息
        if (fatherName) {
            updateData.father_name = fatherName;
        }
        if (fatherPhone) {
            updateData.father_phone = fatherPhone;
        }
        if (motherName) {
            updateData.mother_name = motherName;
        }
        if (motherPhone) {
            updateData.mother_phone = motherPhone;
        }
        
        // 其他信息 - 只传递有值的参数
        if (document.getElementById('edit-is-student').value !== '') {
            updateData.is_student = isStudent;
        }
        if (document.getElementById('edit-plan-to-go-abroad').value !== '') {
            updateData.plan_to_go_abroad = planToGoAbroad;
        }
        if (document.getElementById('edit-is-renewed').value !== '') {
            updateData.is_renewed = isRenewed;
        }
        if (document.getElementById('edit-profile-completed').value !== '') {
            updateData.profile_completed = profileCompleted;
        }
        
        // 更新学生信息
        const { error } = await dbClient
            .from('users')
            .update(updateData)
            .eq('username', oldUsername);
        
        if (error) throw error;
        
        // 如果用户名改变，还需要更新相关表中的 student_id
        if (newUsername !== oldUsername) {
            // 更新 student_words 表
            const { error: wordsError } = await dbClient
                .from('student_words')
                .update({ student_id: newUsername })
                .eq('student_id', oldUsername);
            
            if (wordsError) throw wordsError;
            
            // 更新 daily_leaderboard 表
            const { error: leaderboardError } = await dbClient
                .from('daily_leaderboard')
                .update({ student_id: newUsername })
                .eq('student_id', oldUsername);
            
            if (leaderboardError) throw leaderboardError;
            
            // 更新 daily_checkin 表
            const { error: checkinError } = await dbClient
                .from('daily_checkin')
                .update({ student_id: newUsername })
                .eq('student_id', oldUsername);
            
            if (checkinError) throw checkinError;
        }
        
        showAlert('学生信息更新成功！', 'success');
        
        // 关闭模态框
        cancelEditStudent();
        
        // 重新加载学生列表
        loadAllStudentsPage();
        
    } catch (error) {
        console.error('保存学生信息错误:', error);
        showAlert('更新学生信息失败，请稍后重试', 'error');
    }
}

async function deleteStudent(username) {
    if (!confirm(`确定要删除学生 ${username} 吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        showLoading('正在删除学生...');
        
        // 删除学生日榜单记录
        const { error: leaderboardError } = await dbClient
            .from('daily_leaderboard')
            .delete()
            .eq('student_id', username);
        
        if (leaderboardError) throw leaderboardError;
        
        // 删除学生单词记录
        const { error: wordsError } = await dbClient
            .from('student_words')
            .delete()
            .eq('student_id', username);
        
        if (wordsError) throw wordsError;
        
        // 删除学生打卡记录
        const { error: checkinError } = await dbClient
            .from('daily_checkin')
            .delete()
            .eq('student_id', username);
        
        if (checkinError) throw checkinError;
        
        // 删除学生学习统计记录
        const { error: statsError } = await dbClient
            .from('study_statistics')
            .delete()
            .eq('student_id', username);
        
        if (statsError) throw statsError;
        
        // 删除学生用户记录
        const { error: userError } = await dbClient
            .from('users')
            .delete()
            .eq('username', username)
            .eq('role', 'student');
        
        if (userError) throw userError;
        
        hideLoading();
        showAlert(`学生 ${username} 已成功删除`, 'success');
        
        // 刷新学生列表
        loadAllStudentsPage();
        
    } catch (error) {
        hideLoading();
        console.error('删除学生错误:', error);
        showAlert('删除学生失败，请重试', 'error');
    }
}

// 移除家长关联
async function removeParentAssociation(username) {
    if (!confirm(`确定要移除学生 "${username}" 的家长关联吗？`)) {
        return;
    }
    
    try {
        showLoading('正在移除家长关联...');
        
        // 更新学生的parent_id字段为null
        const { error } = await dbClient
            .from('users')
            .update({ parent_id: null })
            .eq('username', username);
        
        if (error) throw error;
        
        hideLoading();
        showAlert(`已移除学生 "${username}" 的家长关联`, 'success');
        loadAllStudentsPage();
        
    } catch (error) {
        hideLoading();
        console.error('移除家长关联错误:', error);
        showAlert('移除失败，请重试', 'error');
    }
}

// 查看学生详情
async function viewStudentDetails(username) {
    try {
        showLoading('正在加载学生详情...');
        
        // 获取学生基本信息
        const { data: student, error: userError } = await dbClient
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('role', 'student')
            .single();
        
        if (userError) throw userError;
        
        // 获取学生学习数据
        const { data: studentWords, error: wordsError } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', username)
            .limit(10000);
        
        if (wordsError) throw wordsError;
        
        // 计算学习数据
        const totalWords = studentWords?.length || 0;
        const masteredWords = studentWords?.filter(w => w.status === 'mastered').length || 0;
        const learningWords = studentWords?.filter(w => w.status === 'learning').length || 0;
        const newWords = studentWords?.filter(w => w.status === 'new').length || 0;
        
        // 获取最近7天的打卡记录
        const { data: checkinRecords, error: checkinError } = await dbClient
            .from('daily_checkin')
            .select('*')
            .eq('student_id', username)
            .order('clock_in_date', { ascending: false })
            .limit(7);
        
        if (checkinError) throw checkinError;
        
        hideLoading();
        
        // 生成唯一的模态框 ID
        const modalId = 'student-details-modal-' + Date.now();
        
        // 构建详情HTML
        let detailsHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                <h3 style="color: #333; margin-bottom: 20px; text-align: center;">${username}的详细信息</h3>
                
                <div style="margin-bottom: 30px;">
                    <h4 style="color: #333; margin-bottom: 15px;">基本信息</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">学生姓名</div>
                            <div style="font-weight: bold;">${student.real_name || student.username}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">生日</div>
                            <div>${student.birthday ? student.birthday : '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">年龄</div>
                            <div>${student.age || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">手机号</div>
                            <div>${student.phone || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">微信</div>
                            <div>${student.wechat || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">学校</div>
                            <div>${student.school || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">年级</div>
                            <div>${student.grade || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">星座</div>
                            <div>${student.zodiac || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">父亲姓名</div>
                            <div>${student.father_name || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">父亲电话</div>
                            <div>${student.father_phone || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">母亲姓名</div>
                            <div>${student.mother_name || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">母亲电话</div>
                            <div>${student.mother_phone || '未设置'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">是否在读</div>
                            <div>${student.is_student ? '是' : '否'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">是否计划出国</div>
                            <div>${student.plan_to_go_abroad ? '是' : '否'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">付费时间</div>
                            <div>${student.paid_at ? new Date(student.paid_at).toLocaleString('zh-CN') : '未付费'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">是否续费</div>
                            <div>${student.is_renewed ? '是' : '否'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">是否完成资料</div>
                            <div>${student.profile_completed ? '是' : '否'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">注册时间</div>
                            <div>${student.created_at ? new Date(student.created_at).toLocaleString('zh-CN') : '未知'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">最后登录</div>
                            <div>${student.last_login ? new Date(student.last_login).toLocaleString('zh-CN') : '从未登录'}</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">家长关联</div>
                            <div>${student.parent_id ? student.parent_id : '未关联'}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h4 style="color: #333; margin-bottom: 15px;">学习数据</h4>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                        <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #2196F3;">${totalWords}</div>
                            <div style="font-size: 14px; color: #666;">总单词数</div>
                        </div>
                        <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">${masteredWords}</div>
                            <div style="font-size: 14px; color: #666;">已掌握</div>
                        </div>
                        <div style="background: #FFF3CD; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #FF9800;">${learningWords}</div>
                            <div style="font-size: 14px; color: #666;">学习中</div>
                        </div>
                        <div style="background: #F3E5F5; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #9C27B0;">${newWords}</div>
                            <div style="font-size: 14px; color: #666;">未开始</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h4 style="color: #333; margin-bottom: 15px;">最近7天打卡记录</h4>
                    ${checkinRecords && checkinRecords.length > 0 ? `
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa;">
                                    <tr>
                                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">日期</th>
                                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">打卡状态</th>
                                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">学习模式</th>
                                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">学习单词数</th>
                                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">分数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${checkinRecords.map(record => `
                                        <tr style="border-bottom: 1px solid #f0f0f0;">
                                            <td style="padding: 8px;">${record.clock_in_date}</td>
                                            <td style="padding: 8px;">${record.is_clock_in ? '<span style="color: #4CAF50; font-weight: bold;">已打卡</span>' : '<span style="color: #F44336; font-weight: bold;">未打卡</span>'}</td>
                                            <td style="padding: 8px;">${getStudyModeText(record.study_mode)}</td>
                                            <td style="padding: 8px;">${(record.new_words_count || 0) + (record.review_words_count || 0)}</td>
                                            <td style="padding: 8px;">${record.score || 0}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                            <p style="color: #666;">最近7天没有打卡记录</p>
                        </div>
                    `}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn" onclick="document.getElementById('${modalId}').remove()">关闭</button>
                </div>
            </div>
        `;
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 20px; max-width: 900px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                ${detailsHTML}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击模态框外部关闭
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
    } catch (error) {
        hideLoading();
        console.error('查看学生详情错误:', error);
        showAlert('加载学生详情失败，请重试', 'error');
    }
}

// 获取学习模式文本
function getStudyModeText(mode) {
    switch (mode) {
        case 0:
            return '标准模式';
        case 1:
            return '复习模式';
        case 2:
            return '额外新词模式';
        default:
            return '未知模式';
    }
}

// 处理登出
function handleLogout() {
    // 清除登录状态
    appState.currentUser = null;
    appState.isTeacher = false;
    appState.userId = null;
    
    // 清除本地存储
    localStorage.removeItem('kathy_current_user');
    localStorage.removeItem('kathy_user_role');
    
    // 隐藏榜单和触发按钮
    const leaderboardToggle = document.getElementById('leaderboard-toggle');
    const floatingLeaderboard = document.getElementById('floating-leaderboard');
    if (leaderboardToggle) leaderboardToggle.style.display = 'none';
    if (floatingLeaderboard) floatingLeaderboard.style.display = 'none';
    
    // 切换到登录屏幕
    showLoginScreen();
}

// 加载成就徽章到仪表板
async function loadAchievementBadges() {
    try {
        const achievementBadgeElement = document.getElementById('achievement-badge');
        
        // 获取用户总分数
        let totalPoints = 0;
        try {
            const { data: user, error } = await dbClient
                .from('users')
                .select('total_points')
                .eq('username', appState.currentUser)
                .single();
            if (!error && user) {
                totalPoints = user.total_points || 0;
            }
        } catch (err) {
            console.error('获取用户分数错误:', err);
        }
        
        // 获取用户掌握的单词数量
        let masteredWords = 0;
        try {
            const { data: words, error } = await dbClient
                .from('student_words')
                .select('status')
                .eq('student_id', appState.currentUser);
            if (!error && words) {
                masteredWords = words.filter(word => word.status === 'mastered').length;
            }
        } catch (err) {
            console.error('获取掌握单词数量错误:', err);
        }
        
        // 获取用户的最长连续打卡天数
        let streakDays = 0;
        try {
            const { data: clockInRecord, error } = await dbClient
                .from('clock_in_records')
                .select('longest_streak')
                .eq('student_id', appState.currentUser)
                .single();
            if (!error && clockInRecord) {
                streakDays = clockInRecord.longest_streak || 0;
            }
        } catch (err) {
            console.error('获取连续学习天数错误:', err);
        }
        
        // 检查用户是否是蝉联冠军
        let isChampion = false;
        try {
            const { data: leaderboardRecord, error } = await dbClient
                .from('daily_leaderboard')
                .select('rank')
                .eq('student_id', appState.currentUser)
                .eq('rank', 1)
                .single();
            if (!error && leaderboardRecord) {
                isChampion = true;
            }
        } catch (err) {
            console.error('获取冠军状态错误:', err);
        }
        
        // 检查用户的打卡时间成就
        let hasMidnightAchievement = false;
        let hasEarlyBirdAchievement = false;
        let hasGoldenHourAchievement = false;
        let hasLastMinuteAchievement = false;
        let hasSpeedAchievement = false;
        
        // 检查用户是否完成资料填写
        let hasProfileCompleted = false;
        try {
            const { data: user, error } = await dbClient
                .from('users')
                .select('profile_completed')
                .eq('username', appState.currentUser)
                .single();
            if (!error && user && user.profile_completed) {
                hasProfileCompleted = true;
            }
        } catch (err) {
            console.error('获取资料完成状态错误:', err);
        }
        
        try {
            const { data: checkins, error } = await dbClient
                .from('daily_checkin')
                .select('created_at, updated_at')
                .eq('student_id', appState.currentUser);
            
            if (!error && checkins && checkins.length > 0) {
                checkins.forEach(checkin => {
                    if (checkin.created_at) {
                        const checkinDate = new Date(checkin.created_at);
                        const hour = checkinDate.getHours();
                        const minute = checkinDate.getMinutes();
                        
                        // 午夜成就：22:00-04:00
                        if ((hour >= 22 && hour <= 23) || (hour >= 0 && hour <= 4)) {
                            hasMidnightAchievement = true;
                        }
                        
                        // 早鸟成就：8:30以前
                        if (hour < 8 || (hour === 8 && minute <= 30)) {
                            hasEarlyBirdAchievement = true;
                        }
                        
                        // 黄金时段成就：15:00-18:00
                        if (hour >= 15 && hour < 18) {
                            hasGoldenHourAchievement = true;
                        }
                        
                        // 压线完成成就：11:30-11:59
                        if (hour === 11 && minute >= 30 && minute <= 59) {
                            hasLastMinuteAchievement = true;
                        }
                        
                        // 速度提前完成成就：created_at和updated_at的差异低于10分钟
                        if (checkin.created_at && checkin.updated_at) {
                            const createdAt = new Date(checkin.created_at);
                            const updatedAt = new Date(checkin.updated_at);
                            const timeDiff = (updatedAt - createdAt) / (1000 * 60); // 转换为分钟
                            if (timeDiff < 10) {
                                hasSpeedAchievement = true;
                            }
                        }
                    }
                });
            }
        } catch (err) {
            console.error('获取打卡时间成就错误:', err);
        }
        
        // 所有成就列表
        const allAchievements = [
            // Performance 类别
            { id: 'explorer', name: '探索者', englishName: 'Explorer', description: '开始学习之旅', target: 0, icon: '🌟', image: 'img/Level 1.png', color: '#FFD700', isCompleted: true },
            { id: 'vocabulary-voyager', name: '词汇航行者', englishName: 'Word Voyager', description: '获得200分', target: 200, icon: '🚢', image: 'img/Level 2.png', color: '#2196F3', isCompleted: totalPoints >= 200 },
            { id: 'emerging-linguist', name: '新锐语言者', englishName: 'Rising Linguist', description: '获得600分', target: 600, icon: '📚', image: 'img/Level3.jpg', color: '#4CAF50', isCompleted: totalPoints >= 600 },
            { id: 'language-master', name: '语言大师', englishName: 'Language Master', description: '获得1200分', target: 1200, icon: '🎓', image: 'img/Level 4.png', color: '#FF9800', isCompleted: totalPoints >= 1200 },
            { id: 'global-scholar', name: '全球学者', englishName: 'Global Scholar', description: '获得2000分', target: 2000, icon: '🌍', image: 'img/Level 5.png', color: '#9C27B0', isCompleted: totalPoints >= 2000 },
            { id: 'world-expresser', name: '世界表达者', englishName: 'World Orator', description: '获得3000分', target: 3000, icon: '🎯', image: 'img/Level6.jpg', color: '#FF5722', isCompleted: totalPoints >= 3000 },
            
            // Growth 类别
            { id: 'first-commitment', name: '第一次承诺', englishName: 'First Commitment', description: '完成个人资料填写', target: 1, icon: '📜', color: '#9C27B0', isCompleted: hasProfileCompleted },
            { id: 'first-horizon', name: '第一地平线', englishName: 'First Horizon', description: '掌握≥100词', target: 100, icon: '🌱', color: '#4CAF50', isCompleted: masteredWords >= 100 },
            { id: 'open-lands', name: '开阔之地', englishName: 'Expanding Ground', description: '掌握≥300词', target: 300, icon: '🌿', color: '#8BC34A', isCompleted: masteredWords >= 300 },
            { id: 'growth-forest', name: '成长森林', englishName: 'Growing Forest', description: '掌握≥800词', target: 800, icon: '🌳', color: '#CDDC39', isCompleted: masteredWords >= 800 },
            { id: 'thinking-foundation', name: '思维基石', englishName: 'Foundation of Thought', description: '掌握≥1500词', target: 1500, icon: '🎓', color: '#FFEB3B', isCompleted: masteredWords >= 1500 },
            { id: 'language-voyager', name: '语言航行者', englishName: 'Language Navigator', description: '掌握≥3000词', target: 3000, icon: '🛳️', color: '#FFC107', isCompleted: masteredWords >= 3000 },
            { id: 'global-expresser', name: '全球表达者', englishName: 'Global Communicator', description: '掌握≥5000词', target: 5000, icon: '🌎', color: '#FF9800', isCompleted: masteredWords >= 5000 },
            { id: 'world-vocabulary', name: '世界词汇图', englishName: 'World Lexicon', description: '掌握≥8000词', target: 8000, icon: '👑', color: '#FF5722', isCompleted: masteredWords >= 8000 },
            
            // Discipline 类别
            { id: 'week-streak', name: '七日之火', englishName: 'The Spark of Seven', description: '连续学习7天', target: 7, icon: '🔥', color: '#FF9800', isCompleted: streakDays >= 7 },
            { id: 'month-streak', name: '月度掌控者', englishName: 'Master of the Month', description: '连续学习30天', target: 30, icon: '🚀', color: '#2196F3', isCompleted: streakDays >= 30 },
            { id: 'hundred-streak', name: '百日意志', englishName: 'The Iron Hundred', description: '连续学习100天', target: 100, icon: '💯', color: '#4CAF50', isCompleted: streakDays >= 100 },
            { id: 'year-streak', name: '年度传奇', englishName: 'Legend of the Year', description: '连续学习365天', target: 365, icon: '💎', color: '#9C27B0', isCompleted: streakDays >= 365 },
            
            // Secret 类别
            { id: 'champion', name: '蝉联冠军', englishName: 'Champion', description: '在每日排行榜中获得第1名', target: 1, icon: '🏆', color: '#FFD700', isCompleted: isChampion },
            { id: 'midnight', name: '午夜', englishName: 'Midnight Owl', description: '22:00-04:00完成打卡', target: 1, icon: '🦉', color: '#9C27B0', isCompleted: hasMidnightAchievement },
            { id: 'early-bird', name: '早鸟', englishName: 'Early Bird', description: '8:30以前完成打卡', target: 1, icon: '🦜', color: '#FF9800', isCompleted: hasEarlyBirdAchievement },
            { id: 'golden-hour', name: '黄金时段', englishName: 'Golden Hour', description: '15:00-18:00完成打卡', target: 1, icon: '☀️', color: '#FFEB3B', isCompleted: hasGoldenHourAchievement },
            { id: 'last-minute', name: '压线完成', englishName: 'Last Minute', description: '11:30-11:59完成打卡', target: 1, icon: '⏳', color: '#FF5722', isCompleted: hasLastMinuteAchievement },
            { id: 'speed', name: '速度提前完成', englishName: 'Speed Demon', description: '10分钟内完成打卡', target: 1, icon: '⚡️', color: '#2196F3', isCompleted: hasSpeedAchievement }
        ];
        
        // 过滤出已完成的成就
        const completedAchievements = allAchievements.filter(achievement => achievement.isCompleted);
        
        // 生成成就徽章HTML
        let badgesHTML = `
            <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 20px; margin-right: 10px;">🏆</div>
                    <h3 style="color: #333; margin: 0;">我的成就徽章</h3>
                    <div style="margin-left: 10px; font-size: 14px; color: #666;">(${completedAchievements.length}/${allAchievements.length})</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
        `;
        
        if (completedAchievements.length > 0) {
            completedAchievements.forEach(achievement => {
                badgesHTML += `
                    <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; transition: all 0.3s ease;">
                        ${achievement.image ? `
                            <div style="margin-bottom: 10px; opacity: 1;">
                                <img src="${achievement.image}" alt="${achievement.name}" style="width: 60px; height: 60px; object-fit: contain;">
                            </div>
                        ` : `
                            <div style="font-size: 24px; margin-bottom: 10px; opacity: 1;">
                                ${achievement.icon}
                            </div>
                        `}
                        <h4 style="color: #333; margin: 0 0 4px 0; font-size: 14px;">${achievement.name}</h4>
                        <p style="color: #999; font-size: 11px; margin: 0 0 8px 0;">${achievement.englishName}</p>
                        <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">${achievement.description}</p>
                    </div>
                `;
            });
        } else {
            badgesHTML += `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🏆</div>
                    <p>还没有获得成就徽章</p>
                    <p style="font-size: 12px; margin-top: 10px;">继续努力学习，解锁更多成就！</p>
                </div>
            `;
        }
        
        badgesHTML += `
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="showStudentAchievements()" style="padding: 8px 20px; font-size: 14px;">
                        查看全部成就
                    </button>
                </div>
            </div>
        `;
        
        achievementBadgeElement.innerHTML = badgesHTML;
        
    } catch (error) {
        console.error('加载成就徽章错误:', error);
        const achievementBadgeElement = document.getElementById('achievement-badge');
        achievementBadgeElement.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center;">
                <p style="color: #666;">加载成就徽章失败</p>
            </div>
        `;
    }
}
