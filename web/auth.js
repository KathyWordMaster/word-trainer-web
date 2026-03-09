// 页面加载时初始化
window.onload = function() {
    // 更新登录消息为默认状态
    showMessage('login-message', '请输入用户名开始学习', 'info');
};

// ========== 数据库连接测试 ==========
async function testDatabase() {
    showMessage('login-message', '正在测试数据库连接...', 'warning');
    try {
        // 使用更快的查询方式
        const { error } = await dbClient
            .from('users')
            .select('*')
            .limit(1);
        
        if (error) {
            // 尝试另一种方式
            const { error: error2 } = await dbClient.auth.getSession();
            if (error2) throw error2;
        }
        
        showMessage('login-message', '✅ 数据库连接成功！', 'success');
        
        // 3秒后清除成功消息
        setTimeout(() => {
            showMessage('login-message', '请输入用户名开始学习', 'info');
        }, 3000);
        
    } catch (error) {
        showMessage('login-message', `❌ 连接失败：${error.message}`, 'error');
    }
}

// 加载今日训练状态
async function loadDailyTrainingState() {
    try {
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem(`kathy_daily_date_${appState.currentUser}`);
        
        if (storedDate === today) {
            const progress = parseInt(localStorage.getItem(`kathy_daily_progress_${appState.currentUser}`)) || 0;
            appState.dailyTrainingProgress = progress;
            appState.lastTrainingDate = storedDate;
        } else {
            // 新的一天，重置进度
            appState.dailyTrainingProgress = 0;
            appState.lastTrainingDate = today;
            localStorage.setItem(`kathy_daily_date_${appState.currentUser}`, today);
            localStorage.setItem(`kathy_daily_progress_${appState.currentUser}`, '0');
        }
    } catch (error) {
        console.error('加载训练状态错误:', error);
    }
}

// 保存今日训练进度
function saveDailyTrainingProgress(wordsStudied) {
    try {
        const today = new Date().toDateString();
        const currentProgress = appState.dailyTrainingProgress + wordsStudied;
        appState.dailyTrainingProgress = currentProgress;
        
        localStorage.setItem(`kathy_daily_date_${appState.currentUser}`, today);
        localStorage.setItem(`kathy_daily_progress_${appState.currentUser}`, currentProgress.toString());
        
        return currentProgress;
    } catch (error) {
        console.error('保存训练进度错误:', error);
        return appState.dailyTrainingProgress;
    }
}

// 初始化教师分组系统
async function initializeTeacherGroups() {
    try {
        // 检查教师是否有分组
        const { data: existingGroups, error } = await dbClient
            .from('groups')
            .select('*')
            .eq('teacher_id', appState.teacherId);
        
        if (error) throw error;
        
        // 如果没有分组，创建默认分组
        if (!existingGroups || existingGroups.length === 0) {
            const { data: newGroup, error: createError } = await dbClient
                .from('groups')
                .insert([{
                    name: '默认分组',
                    teacher_id: appState.teacherId
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            
            // 更新现有单词的分组ID
            await dbClient
                .from('words')
                .update({ group_id: newGroup.id })
                .eq('teacher_id', appState.teacherId);
            
            console.log('创建了默认分组并更新了单词');
        }
        
    } catch (error) {
        console.error('初始化分组错误:', error);
    }
}

// ==================== 同步分组单词给学生 ====================
async function syncGroupWordsToStudent() {
    try {
        console.log(`开始为 ${appState.currentUser} 同步分组单词...`);
        
        // 获取学生所在的分组
        const { data: studentGroups, error: groupsError } = await dbClient
            .from('group_students')
            .select('group_id')
            .eq('student_id', appState.currentUser);
        
        if (groupsError) {
            console.error('获取学生分组错误:', groupsError);
            return 0;
        }
        
        if (!studentGroups || studentGroups.length === 0) {
            console.log(`学生 ${appState.currentUser} 没有加入任何分组，无法同步单词`);
            showAlert('您还没有被分配到任何分组，请联系老师将您添加到分组中', 'warning');
            return 0;
        }
        
        const groupIds = studentGroups.map(g => g.group_id);
        console.log(`学生 ${appState.currentUser} 的分组ID:`, groupIds);
        
        // 获取分组信息（用于显示）
        const { data: groupInfo, error: groupInfoError } = await dbClient
            .from('groups')
            .select('id, name')
            .in('id', groupIds);
        
        if (groupInfoError) {
            console.error('获取分组信息错误:', groupInfoError);
        }
        
        const groupNames = groupInfo?.map(g => g.name) || [];
        console.log(`学生 ${appState.currentUser} 在分组:`, groupNames);
        
        // 获取分组内的单词（仅限学生所在的分组）
        const { data: groupWords, error: wordsError } = await dbClient
            .from('words')
            .select('*')
            .in('group_id', groupIds)
            .limit(10000);
        
        if (wordsError) {
            console.error('获取分组单词错误:', wordsError);
            return 0;
        }
        
        if (!groupWords || groupWords.length === 0) {
            console.log(`学生 ${appState.currentUser} 的分组中没有单词`);
            showAlert('您所在的分组中还没有单词，请联系老师上传单词', 'info');
            return 0;
        }
        
        console.log(`找到 ${groupWords.length} 个分组单词`);
        
        // 检查学生是否已有这些单词（基于word_id）
        const { data: existingRecords, error: checkError } = await dbClient
            .from('student_words')
            .select('word_id')
            .eq('student_id', appState.currentUser)
            .limit(10000);
        
        if (checkError) {
            console.error('检查现有记录错误:', checkError);
            return 0;
        }
        
        const existingWordIds = new Set(existingRecords?.map(r => r.word_id) || []);
        console.log(`学生已有 ${existingWordIds.size} 个单词，ID:`, Array.from(existingWordIds).slice(0, 10));
        
        // 准备新单词记录（只包括学生所在分组的单词）
        const newRecords = groupWords
            .filter(word => {
                const hasWord = existingWordIds.has(word.id);
                if (hasWord) {
                    console.log(`单词 ${word.english} (ID: ${word.id}) 已存在，跳过`);
                }
                return !hasWord;
            })
            .map(word => ({
                student_id: appState.currentUser,
                word_id: word.id,
                english: word.english,
                chinese: word.chinese,
                status: 'new',
                review_count: 0,
                group_id: word.group_id,
                added_date: new Date().toISOString()
            }));
        
        console.log(`需要同步 ${newRecords.length} 个新单词`);
        if (newRecords.length > 0) {
            console.log('新单词示例:', newRecords.slice(0, 3));
        }
        
        if (newRecords.length > 0) {
            console.log(`检测到 ${newRecords.length} 个新单词需要同步，来自分组: ${groupNames.join(', ')}`);
            
            // 分批插入，避免超限
            const batchSize = 50;
            let successfullyInserted = 0;
            let skippedRecords = 0;
            
            for (let i = 0; i < newRecords.length; i += batchSize) {
                const batch = newRecords.slice(i, i + batchSize);
                console.log(`处理批次 ${Math.floor(i/batchSize) + 1}，包含 ${batch.length} 个单词`);
                
                try {
                    const { error: insertError } = await dbClient
                        .from('student_words')
                        .insert(batch);
                    
                    if (insertError) {
                        console.error(`批量插入错误 (批次 ${Math.floor(i/batchSize) + 1}):`, insertError);
                        // 如果批量插入失败，尝试逐个插入
                        for (const record of batch) {
                            try {
                                const { error: singleError } = await dbClient
                                    .from('student_words')
                                    .insert(record);
                                
                                if (!singleError) {
                                    successfullyInserted++;
                                    console.log(`成功插入单词: ${record.english}`);
                                } else if (singleError.message.includes('duplicate key')) {
                                    skippedRecords++;
                                    console.log(`跳过重复单词: ${record.english} (ID: ${record.word_id})`);
                                } else {
                                    console.error(`单个插入错误:`, singleError);
                                }
                            } catch (err) {
                                console.error('插入异常:', err);
                            }
                        }
                    } else {
                        successfullyInserted += batch.length;
                        console.log(`批次 ${Math.floor(i/batchSize) + 1} 插入成功，共 ${batch.length} 个单词`);
                    }
                } catch (err) {
                    console.error('批量插入异常:', err);
                }
            }
            
            console.log(`同步完成：成功插入 ${successfullyInserted} 个单词，跳过 ${skippedRecords} 个重复单词`);
            
            console.log(`成功为 ${appState.currentUser} 同步了 ${successfullyInserted} 个新单词，来自分组: ${groupNames.join(', ')}`);
            
            // 显示同步成功的消息
            if (successfullyInserted > 0) {
                const message = `✅ 已为您同步 ${successfullyInserted} 个新单词\n📁 来自分组：${groupNames.join(', ')}`;
                showAlert(message, 'success');
            }
            
            return successfullyInserted;
        } else {
            console.log(`没有需要同步的新单词`);
            // 显示分组信息
            const message = `📚 您已同步所有分组单词\n📁 所在分组：${groupNames.join(', ')}\n📖 单词总数：${groupWords.length}`;
            showAlert(message, 'info');
            return 0;
        }
        
    } catch (error) {
        console.error('同步分组单词错误:', error);
        showAlert(`同步失败：${error.message}`, 'error');
        return 0;
    }
}

// ========== 家长登录系统 ==========
async function parentsDatabase() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showMessage('login-message', '请输入家长用户名', 'error');
        return;
    }
    
    showMessage('login-message', '正在登录...', 'warning');
    
    try {
        // 检查家长账号是否存在
        const { data: existingParent, error: checkError } = await dbClient
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();
        
        if (checkError) {
            showMessage('login-message', `检查账号失败: ${checkError.message}`, 'error');
            return;
        }
        
        if (!existingParent) {
            // 家长账号不存在，创建新账号
            const { data: newParent, error: insertError } = await dbClient
                .from('users')
                .insert([{
                    username: username,
                    role: 'parent',
                    last_login: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (insertError) {
                showMessage('login-message', `注册失败: ${insertError.message}`, 'error');
                return;
            }
            
            showMessage('login-message', `✅ 欢迎新家长 ${username}！`, 'success');
        } else {
            // 现有家长账号 - 更新最后登录时间
            await dbClient
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('username', username);
            
            showMessage('login-message', `✅ 欢迎回来 ${username}！`, 'success');
        }
        
        // 设置全局状态
        appState.currentUser = username;
        appState.isTeacher = false;
        appState.userId = username;
        
        // 保存登录状态
        localStorage.setItem('kathy_current_user', username);
        localStorage.setItem('kathy_user_role', 'parent');
        
        // 延迟后切换到家长界面
        setTimeout(() => {
            showMessage('login-message', '', 'info');
            showParentDashboard();
            // 显示榜单和触发按钮
            const leaderboardToggle = document.getElementById('leaderboard-toggle');
            const floatingLeaderboard = document.getElementById('floating-leaderboard');
            if (leaderboardToggle) leaderboardToggle.style.display = 'flex';
            if (floatingLeaderboard) floatingLeaderboard.style.display = 'block';
            // 初始化悬浮榜单
            if (typeof initFloatingLeaderboard === 'function') {
                initFloatingLeaderboard();
            }
        }, 1000);
        
    } catch (error) {
        console.error('家长登录错误:', error);
        showMessage('login-message', `登录失败: ${error.message}`, 'error');
    }
}

function showLoginScreen() {
    showScreen('login-screen');
}

// ========== 登录/注册系统 ==========
async function handleLogin() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showMessage('login-message', '请输入用户名', 'error');
        return;
    }
    
    showMessage('login-message', '正在登录...', 'warning');
    
    try {
        // 检查是否是教师账号
        const isTeacher = username.toLowerCase() === 'kathy151';
        
        // 检查用户是否已存在
        const { data: existingUser, error: checkError } = await dbClient
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();
        
        if (checkError) {
            showMessage('login-message', `检查用户失败: ${checkError.message}`, 'error');
            return;
        }
        
        let user;
        if (!existingUser) {
            // 新用户 - 注册
            const { data: newUser, error: insertError } = await dbClient
                .from('users')
                .insert([{
                    role: isTeacher ? 'teacher' : 'student',
                    username: username,
                    last_login: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (insertError) {
                showMessage('login-message', `注册失败: ${insertError.message}`, 'error');
                return;
            }
            
            user = newUser;
            showMessage('login-message', `✅ 欢迎新用户 ${username}！`, 'success');
        } else {
            // 现有用户 - 更新最后登录时间
            const { data: updatedUser, error: updateError } = await dbClient
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('username', username)
                .select()
                .single();
            
            if (updateError) {
                showMessage('login-message', `更新用户失败: ${updateError.message}`, 'error');
                return;
            }
            
            user = updatedUser;
            showMessage('login-message', `✅ 欢迎回来 ${username}！`, 'success');
        }
        
        // 设置全局状态
        appState.currentUser = user.username;
        appState.userId = user.id;
        appState.isTeacher = isTeacher;
        
        // 保存登录状态
        localStorage.setItem('kathy_current_user', username);
        localStorage.setItem('kathy_user_role', isTeacher ? 'teacher' : 'student');
        
        // 检查并更新连续打卡奖励（仅学生）
        if (!isTeacher) {
            try {
                // 查询clock_in_records表获取current_streak
                const { data: clockInRecord, error: recordError } = await dbClient
                    .from('clock_in_records')
                    .select('current_streak')
                    .eq('student_id', user.username)
                    .single();
                
                if (!recordError && clockInRecord) {
                    const currentStreak = clockInRecord.current_streak || 0;
                    let stabilityBonus = 0;
                    
                    // 根据连续打卡天数计算奖励
                    if (currentStreak === 3) {
                        stabilityBonus = 3;
                    } else if (currentStreak === 7) {
                        stabilityBonus = 10;
                    } else if (currentStreak >= 14) {
                        stabilityBonus = 15;
                    }
                    
                    if (stabilityBonus > 0) {
                        const today = new Date().toISOString().split('T')[0];
                        
                        // 检查今日是否已有榜单记录
                        const { data: existingLeaderboard, error: checkError } = await dbClient
                            .from('daily_leaderboard')
                            .select('id')
                            .eq('student_id', user.username)
                            .eq('leaderboard_date', today)
                            .single();
                        
                        if (!checkError) {
                            if (existingLeaderboard) {
                                // 更新现有记录
                                await dbClient
                                    .from('daily_leaderboard')
                                    .update({ stability_bonus: stabilityBonus })
                                    .eq('id', existingLeaderboard.id);
                            } else {
                                // 创建新记录
                                await dbClient
                                    .from('daily_leaderboard')
                                    .insert([{
                                        student_id: user.username,
                                        leaderboard_date: today,
                                        base_score: 0,
                                        quality_score: 0,
                                        improvement_score: 0,
                                        stability_bonus: stabilityBonus,
                                        raw_score: stabilityBonus,
                                        total_score: stabilityBonus
                                    }]);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('更新连续打卡奖励错误:', error);
            }
        }
        
        // 延迟后切换到相应界面
        setTimeout(() => {
            showMessage('login-message', '', 'info');
            if (isTeacher) {
                showTeacherDashboard();
            } else {
                showStudentDashboard();
            }
            // 显示榜单和触发按钮
            const leaderboardToggle = document.getElementById('leaderboard-toggle');
            const floatingLeaderboard = document.getElementById('floating-leaderboard');
            if (leaderboardToggle) leaderboardToggle.style.display = 'flex';
            if (floatingLeaderboard) floatingLeaderboard.style.display = 'block';
            // 初始化悬浮榜单
            if (typeof initFloatingLeaderboard === 'function') {
                initFloatingLeaderboard();
            }
        }, 1000);
        
    } catch (error) {
        console.error('登录错误:', error);
        showMessage('login-message', `登录失败: ${error.message}`, 'error');
    }
}