// ========== 家长功能 ==========
async function showParentDashboard() {
    showScreen('parent-screen');
    await loadParentDashboard();
}

async function loadParentDashboard() {
    try {
        // 加载孩子选择器
        await loadChildrenSelector();
        
    } catch (error) {
        console.error('加载家长面板错误:', error);
        showAlert('加载家长面板失败', 'error');
    }
}

async function loadParentOverviewStats() {
    try {
        // 获取当前家长关联的学生
        const { data: students, error: studentsError } = await dbClient
            .from('users')
            .select('*')
            .eq('role', 'student')
            .eq('parent_id', appState.currentUser);
        
        if (studentsError) throw studentsError;
        
        let totalStudents = students ? students.length : 0;
        let totalWords = 0;
        let activeStudents = 0;
        let masteredWords = 0;
        
        if (students && students.length > 0) {
            const studentIds = students.map(s => s.username);
            
            // 计算总单词数（所有单词）
            const { data: allWords, error: wordsError } = await dbClient
                .from('words')
                .select('*');
            
            if (!wordsError && allWords) {
                totalWords = allWords.length;
            }
            
            // 计算已掌握单词数（当前家长的孩子）
            const { data: mastered, error: masteredError } = await dbClient
                .from('student_words')
                .select('*')
                .eq('status', 'mastered')
                .in('student_id', studentIds);
            
            if (!masteredError && mastered) {
                masteredWords = mastered.length;
            }
            
            // 计算活跃学生数（最近7天有学习记录）
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: activeData, error: activeError } = await dbClient
                .from('student_words')
                .select('student_id')
                .gte('last_reviewed', sevenDaysAgo.toISOString())
                .in('student_id', studentIds);
            
            if (!activeError && activeData) {
                const uniqueStudents = new Set(activeData.map(r => r.student_id));
                activeStudents = uniqueStudents.size;
            }
        }
        
        // 更新概览统计
        const statsContainer = document.getElementById('parent-overview-stats');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="number">${totalStudents}</div>
                <div class="label">学生总数</div>
            </div>
            <div class="stat-card">
                <div class="number">${totalWords}</div>
                <div class="label">单词总数</div>
            </div>
            <div class="stat-card">
                <div class="number">${activeStudents}</div>
                <div class="label">活跃学生</div>
            </div>
            <div class="stat-card">
                <div class="number">${masteredWords}</div>
                <div class="label">已掌握单词</div>
            </div>
        `;
        
    } catch (error) {
        console.error('加载家长概览统计错误:', error);
        document.getElementById('parent-overview-stats').innerHTML = `
            <div class="stat-card">
                <div class="number">0</div>
                <div class="label">学生总数</div>
            </div>
            <div class="stat-card">
                <div class="number">0</div>
                <div class="label">单词总数</div>
            </div>
            <div class="stat-card">
                <div class="number">0</div>
                <div class="label">活跃学生</div>
            </div>
            <div class="stat-card">
                <div class="number">0</div>
                <div class="label">已掌握单词</div>
            </div>
        `;
    }
}

async function loadChildrenSelector() {
    try {
        // 从users表中查询parent_id等于当前登录家长用户名的学生
        const { data: students, error: studentsError } = await dbClient
            .from('users')
            .select('*')
            .eq('role', 'student')
            .eq('parent_id', appState.currentUser);
        
        const selectorContainer = document.getElementById('children-selector');
        
        if (studentsError) {
            throw studentsError;
        }
        
        if (!students || students.length === 0) {
            selectorContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 10px;">
                    <div style="font-size: 3em; margin-bottom: 15px;">👶</div>
                    <h4 style="color: #666; margin-bottom: 10px;">暂无关联的学生</h4>
                    <p style="color: #999; margin-bottom: 20px;">请联系老师将您与孩子关联</p>
                    <button class="btn btn-blue" onclick="showLoginScreen()">返回登录</button>
                </div>
            `;
            return;
        }
        
        // 创建学生选择按钮
        let buttonsHTML = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px;">';
        
        students.forEach(student => {
            buttonsHTML += `
                <button class="btn" style="padding: 12px 24px; min-width: 120px;" onclick="viewChildDetails('${student.username}')">
                    👶 ${student.username}
                </button>
            `;
        });
        
        buttonsHTML += '</div>';
        selectorContainer.innerHTML = buttonsHTML;
        
    } catch (error) {
        console.error('加载孩子选择器错误:', error);
        document.getElementById('children-selector').innerHTML = `
            <div style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 10px;">
                <div style="font-size: 3em; margin-bottom: 15px;">⚠️</div>
                <h4 style="color: #666; margin-bottom: 10px;">加载学生列表失败</h4>
                <p style="color: #999; margin-bottom: 20px;">${error.message}</p>
                <button class="btn" onclick="loadChildrenSelector()">重试</button>
            </div>
        `;
    }
}

async function viewChildDetails(studentId) {
    try {
        const parentContent = document.getElementById('parent-content');
        parentContent.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto;">
                <div class="stats-card">
                    <h3 style="color: #333; margin-bottom: 20px;">👶 ${studentId} 的学习情况</h3>
                    <div id="child-details-content">
                        <div style="text-align: center; padding: 40px;">
                            <div class="loading-spinner"></div>
                            <p style="color: #666; margin-top: 20px;">正在加载学习数据...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 加载学生详细数据
        await loadChildLearningDetails(studentId);
        
    } catch (error) {
        console.error('查看孩子详情错误:', error);
        showAlert('加载孩子学习数据失败', 'error');
    }
}

async function loadChildLearningDetails(studentId) {
    try {
        const contentContainer = document.getElementById('child-details-content');
        
        // 获取学生的单词学习情况
        const { data: studentWords, error: wordsError } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', studentId);
        
        if (wordsError) throw wordsError;
        
        // 获取学生的打卡记录
        const { data: clockInRecords, error: clockInError } = await dbClient
            .from('daily_checkin')
            .select('*')
            .eq('student_id', studentId)
            .order('clock_in_date', { ascending: false })
            .limit(30);
        
        // 计算学习统计
        let totalWords = studentWords ? studentWords.length : 0;
        let masteredWords = studentWords ? studentWords.filter(w => w.status === 'mastered').length : 0;
        
        // 直接从数据库查询学习中的单词，与showWordListModal方法保持一致
        let learningWords = 0;
        try {
            const { data: learningWordsData } = await dbClient
                .from('student_words')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'learning');
            learningWords = learningWordsData ? learningWordsData.length : 0;
        } catch (error) {
            console.error('获取学习中单词错误:', error);
            learningWords = studentWords ? studentWords.filter(w => w.status === 'learning').length : 0;
        }
        
        let newWords = studentWords ? studentWords.filter(w => w.status === 'new').length : 0;
        
        // 计算打卡统计
        let totalCheckins = clockInRecords ? clockInRecords.length : 0;
        let currentStreak = 0;
        
        if (clockInRecords && clockInRecords.length > 0) {
            // 计算连续打卡天数
            currentStreak = 1;
            for (let i = 0; i < clockInRecords.length - 1; i++) {
                const currentDate = new Date(clockInRecords[i].clock_in_date);
                const nextDate = new Date(clockInRecords[i + 1].clock_in_date);
                const diffDays = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        
        // 生成最近打卡记录
        let recentCheckinsHTML = '';
        if (clockInRecords && clockInRecords.length > 0) {
            recentCheckinsHTML = `
                <div style="margin-top: 20px;">
                    <h4 style="color: #333; margin-bottom: 15px;">📅 最近打卡记录</h4>
                    <div style="background: white; border-radius: 10px; padding: 15px; max-height: 300px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>学习模式</th>
                                    <th>新单词</th>
                                    <th>复习单词</th>
                                    <th>学习时长</th>
                                    <th>分数</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clockInRecords.map(record => `
                                    <tr>
                                        <td>${record.clock_in_date}</td>
                                        <td>${getStudyModeText(record.study_mode)}</td>
                                        <td>${record.new_words_count || 0}</td>
                                        <td>${record.review_words_count || 0}</td>
                                        <td>${record.total_study_time || 0} 分钟</td>
                                        <td>${record.score || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // 生成学习进度图表
        const progressPercentage = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
        
        // 获取学生成就
        const achievements = await getStudentAchievements(studentId);
        const achievementBadgesHTML = generateAchievementBadgesHTML(achievements);
        
        contentContainer.innerHTML = `
            <div class="two-column">
                <!-- 左侧：学习统计 -->
                <div>
                    <div class="card-grid">
                        <div class="stat-card" style="cursor: pointer;" onclick="showWordListModal('${studentId}', 'all')">
                            <div class="number">${totalWords}</div>
                            <div class="label">总单词数</div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="showWordListModal('${studentId}', 'mastered')">
                            <div class="number">${masteredWords}</div>
                            <div class="label">已掌握</div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="showWordListModal('${studentId}', 'learning')">
                            <div class="number">${learningWords}</div>
                            <div class="label">学习中</div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="showWordListModal('${studentId}', 'new')">
                            <div class="number">${newWords}</div>
                            <div class="label">未开始</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h4 style="color: #333; margin-bottom: 10px;">📊 学习进度</h4>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                            <div style="text-align: center; color: #666; margin-top: 5px;">
                                已掌握 ${progressPercentage}%
                            </div>
                        </div>
                    </div>
                    
                    ${achievementBadgesHTML}
                </div>
                
                <!-- 右侧：打卡记录和最近打卡 -->
                <div>
                    <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 10px;">🔥 打卡记录</h4>
                        <div class="card-grid">
                            <div class="stat-card">
                                <div class="number">${currentStreak}</div>
                                <div class="label">连续打卡</div>
                            </div>
                            <div class="stat-card">
                                <div class="number">${totalCheckins}</div>
                                <div class="label">总打卡次数</div>
                            </div>
                        </div>
                    </div>
                    
                    ${recentCheckinsHTML || `
                        <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px;">
                            <div style="font-size: 3em; margin-bottom: 15px;">📅</div>
                            <h4 style="color: #666; margin-bottom: 10px;">暂无打卡记录</h4>
                            <p style="color: #999;">孩子还没有开始打卡学习</p>
                        </div>
                    `}
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <h4 style="color: #333; margin-bottom: 20px;">📚 单词掌握情况</h4>
                <div id="word-list-container" style="background: white; border-radius: 10px; padding: 20px; overflow-x: auto;">
                    <!-- 单词列表将通过 updateWordList 函数动态更新 -->
                </div>
            </div>
        `;
        
        // 加载单词列表
        await updateWordList(studentId, 1, 20);
        
    } catch (error) {
        console.error('加载孩子学习详情错误:', error);
        document.getElementById('child-details-content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #666;">加载学习数据失败</p>
                <button class="btn" onclick="loadChildLearningDetails('${studentId}')" style="margin-top: 20px;">
                    重试加载
                </button>
            </div>
        `;
    }
}

// 更新单词列表（仅更新单词掌握情况列表，不影响其他内容）
async function updateWordList(studentId, page = 1, pageSize = 20) {
    try {
        // 获取学生的单词学习情况
        const { data: studentWords, error: wordsError } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', studentId);
        
        if (wordsError) throw wordsError;
        
        // 计算分页
        const totalPages = studentWords ? Math.ceil(studentWords.length / pageSize) : 1;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedWords = studentWords ? studentWords.slice(startIndex, endIndex) : [];
        
        // 生成分页控件
        let paginationHTML = '';
        if (totalPages > 1) {
            paginationHTML = `
                <div style="display: flex; justify-content: center; align-items: center; margin-top: 20px; gap: 10px;">
                    <button class="btn" onclick="updateWordList('${studentId}', ${Math.max(1, page - 1)}, ${pageSize})" ${page === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        上一页
                    </button>
                    <span style="color: #666;">第 ${page} 页，共 ${totalPages} 页</span>
                    <button class="btn" onclick="updateWordList('${studentId}', ${Math.min(totalPages, page + 1)}, ${pageSize})" ${page === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        下一页
                    </button>
                </div>
            `;
        }
        
        // 生成单词列表HTML
        const wordListHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>英文</th>
                        <th>中文</th>
                        <th>状态</th>
                        <th>复习次数</th>
                        <th>最后复习</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedWords && paginatedWords.length > 0 ? paginatedWords.map(word => `
                        <tr>
                            <td>${word.english}</td>
                            <td>${word.chinese}</td>
                            <td>${getStatusText(word.status)}</td>
                            <td>${word.review_count || 0}</td>
                            <td>${word.last_reviewed ? new Date(word.last_reviewed).toLocaleDateString('zh-CN') : '未复习'}</td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td colspan="5" style="text-align: center; color: #666; padding: 40px;">
                                暂无单词学习记录
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
            ${paginationHTML}
        `;
        
        // 更新单词列表容器
        const wordListContainer = document.getElementById('word-list-container');
        if (wordListContainer) {
            wordListContainer.innerHTML = wordListHTML;
        }
        
    } catch (error) {
        console.error('更新单词列表错误:', error);
        const wordListContainer = document.getElementById('word-list-container');
        if (wordListContainer) {
            wordListContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #666;">加载单词列表失败</p>
                    <button class="btn" onclick="updateWordList('${studentId}', ${page}, ${pageSize})" style="margin-top: 20px;">
                        重试加载
                    </button>
                </div>
            `;
        }
    }
}

// ========== 家长关联功能 ==========
async function associateStudentToParent(studentId) {
    try {
        showAlert('正在加载家长列表...', 'info');
        
        // 查询所有家长用户
        const { data: parents, error: parentsError } = await dbClient
            .from('users')
            .select('username')
            .eq('role', 'parent');
        
        if (parentsError) {
            showAlert(`加载家长列表失败: ${parentsError.message}`, 'error');
            return;
        }
        
        // 生成家长选择HTML
        let parentOptions = '';
        if (parents && parents.length > 0) {
            parents.forEach(parent => {
                parentOptions += `<option value="${parent.username}">${parent.username}</option>`;
            });
        } else {
            parentOptions = '<option value="">暂无家长账号</option>';
        }
        
        // 创建选择界面
        const parentSelectHtml = `
            <p style="margin-bottom: 15px;">请为学生 <strong>${studentId}</strong> 选择一个家长：</p>
            <select id="parent-select" style="width: 100%; padding: 12px; margin-bottom: 20px; border: 2px solid #ddd; border-radius: 10px; font-size: 16px;">
                <option value="">-- 选择家长 --</option>
                ${parentOptions}
            </select>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn" onclick="confirmParentAssociation('${studentId}')">确定</button>
                <button class="btn btn-red" onclick="cancelParentAssociation()">取消</button>
            </div>
        `;
        
        // 显示模态框
        const modal = document.getElementById('parent-modal');
        const modalContent = document.getElementById('parent-modal-content');
        modalContent.innerHTML = parentSelectHtml;
        modal.style.display = 'flex';
        
        // 保存当前学生ID
        window.currentStudentId = studentId;
        
    } catch (error) {
        console.error('关联家长错误:', error);
        showAlert(`关联失败: ${error.message}`, 'error');
    }
}

function confirmParentAssociation(studentId) {
    const parentSelect = document.getElementById('parent-select');
    const selectedParent = parentSelect.value;
    
    if (!selectedParent) {
        showAlert('请选择一个家长', 'info');
        return;
    }
    
    showAlert('正在关联家长...', 'info');
    
    // 更新学生的parent_id字段
    dbClient
        .from('users')
        .update({ parent_id: selectedParent })
        .eq('username', studentId)
        .then(({ error }) => {
            if (error) {
                showAlert(`关联失败: ${error.message}`, 'error');
            } else {
                showAlert(`关联家长 ${selectedParent} 到学生 ${studentId} 成功`, 'success');
                // 关闭模态框
                const modal = document.getElementById('parent-modal');
                modal.style.display = 'none';
                // 清除保存的学生ID
                window.currentStudentId = null;
                // 重新加载学生列表
                showAllStudentsPage();
            }
        })
        .catch(error => {
            console.error('关联家长错误:', error);
            showAlert(`关联失败: ${error.message}`, 'error');
        });
}

function cancelParentAssociation() {
    const modal = document.getElementById('parent-modal');
    modal.style.display = 'none';
    // 清除保存的学生ID
    window.currentStudentId = null;
}

// 显示单词列表模态框
async function showWordListModal(studentId, status) {
    try {
        // 获取单词列表
        let query = dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', studentId);
        
        // 根据状态过滤
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        
        const { data: words, error } = await query;
        
        if (error) throw error;
        
        // 获取状态文本
        const statusText = {
            'all': '所有单词',
            'mastered': '已掌握',
            'learning': '学习中',
            'new': '未开始'
        };
        
        // 生成单词列表HTML
        let wordListHTML = '';
        if (words && words.length > 0) {
            wordListHTML = `
                <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #ddd;">
                                <th style="padding: 10px; text-align: left;">英文</th>
                                <th style="padding: 10px; text-align: left;">中文</th>
                                <th style="padding: 10px; text-align: left;">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${words.map(word => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 10px;">${word.english}</td>
                                    <td style="padding: 10px;">${word.chinese}</td>
                                    <td style="padding: 10px;">${getStatusText(word.status)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            wordListHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    暂无${statusText[status]}单词
                </div>
            `;
        }
        
        // 创建模态框HTML
        const modalHTML = `
            <div style="background: white; border-radius: 10px; padding: 20px; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #333; margin: 0;">${statusText[status]}单词列表</h3>
                    <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;" onclick="closeWordListModal()">&times;</button>
                </div>
                ${wordListHTML}
                <div style="text-align: right; margin-top: 20px;">
                    <button class="btn" onclick="closeWordListModal()">关闭</button>
                </div>
            </div>
        `;
        
        // 创建或获取模态框
        let modal = document.getElementById('word-list-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'word-list-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = modalHTML;
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('显示单词列表错误:', error);
        showAlert('加载单词列表失败', 'error');
    }
}

// 关闭单词列表模态框
function closeWordListModal() {
    const modal = document.getElementById('word-list-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 获取学生成就
async function getStudentAchievements(studentId) {
    try {
        // 获取用户总分数
        let totalPoints = 0;
        try {
            const { data: user, error } = await dbClient
                .from('users')
                .select('total_points')
                .eq('username', studentId)
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
                .eq('student_id', studentId);
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
                .eq('student_id', studentId)
                .single();
            if (!error && clockInRecord) {
                streakDays = clockInRecord.longest_streak || 0;
            }
        } catch (err) {
            console.error('获取最长连续打卡错误:', err);
        }
        
        // 获取用户的打卡记录
        let currentStreak = 0;
        try {
            const { data: checkinRecords, error } = await dbClient
                .from('daily_checkin')
                .select('clock_in_date')
                .eq('student_id', studentId)
                .eq('is_clock_in', true)
                .order('clock_in_date', { ascending: false })
                .limit(30);
            
            if (!error && checkinRecords && checkinRecords.length > 0) {
                currentStreak = 1;
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
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        } catch (err) {
            console.error('获取连续打卡错误:', err);
        }
        
        // 检查用户资料是否完成
        let hasProfileCompleted = false;
        try {
            const { data: user, error } = await dbClient
                .from('users')
                .select('*')
                .eq('username', studentId)
                .single();
            if (!error && user) {
                hasProfileCompleted = user.avatar && user.gender && user.age;
            }
        } catch (err) {
            console.error('获取资料完成状态错误:', err);
        }
        
        // 检查打卡时间成就
        let hasMidnightAchievement = false;
        let hasEarlyBirdAchievement = false;
        let hasGoldenHourAchievement = false;
        let hasLastMinuteAchievement = false;
        let hasSpeedAchievement = false;
        
        try {
            const { data: checkins, error } = await dbClient
                .from('daily_checkin')
                .select('created_at, updated_at')
                .eq('student_id', studentId);
            
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
            { id: 'explorer', name: '探索者', englishName: 'Explorer', description: '开始学习之旅', target: 0, icon: '🌟', isCompleted: true },
            { id: 'vocabulary-voyager', name: '词汇航行者', englishName: 'Word Voyager', description: '获得200分', target: 200, icon: '🚢', isCompleted: totalPoints >= 200 },
            { id: 'emerging-linguist', name: '新锐语言者', englishName: 'Rising Linguist', description: '获得600分', target: 600, icon: '📚', isCompleted: totalPoints >= 600 },
            { id: 'language-master', name: '语言大师', englishName: 'Language Master', description: '获得1200分', target: 1200, icon: '🎓', isCompleted: totalPoints >= 1200 },
            { id: 'global-scholar', name: '全球学者', englishName: 'Global Scholar', description: '获得2000分', target: 2000, icon: '🌍', isCompleted: totalPoints >= 2000 },
            { id: 'world-expresser', name: '世界表达者', englishName: 'World Orator', description: '获得3000分', target: 3000, icon: '🎯', isCompleted: totalPoints >= 3000 },
            
            // Growth 类别
            { id: 'first-commitment', name: '第一次承诺', englishName: 'First Commitment', description: '完成个人资料', target: 1, icon: '🤝', isCompleted: hasProfileCompleted },
            { id: 'vocabulary-builder', name: '词汇构建者', englishName: 'Vocabulary Builder', description: '掌握≥100词', target: 100, icon: '🧱', isCompleted: masteredWords >= 100 },
            { id: 'language-learner', name: '语言学习者', englishName: 'Language Learner', description: '掌握≥300词', target: 300, icon: '🌱', isCompleted: masteredWords >= 300 },
            { id: 'vocabulary-master', name: '词汇大师', englishName: 'Vocabulary Master', description: '掌握≥500词', target: 500, icon: '🏅', isCompleted: masteredWords >= 500 },
            { id: 'language-pro', name: '语言专家', englishName: 'Language Pro', description: '掌握≥1000词', target: 1000, icon: '💎', isCompleted: masteredWords >= 1000 },
            { id: 'word-collector', name: '单词收藏家', englishName: 'Word Collector', description: '掌握≥3000词', target: 3000, icon: '🎨', isCompleted: masteredWords >= 3000 },
            { id: 'world-vocabulary', name: '世界词汇图', englishName: 'World Lexicon', description: '掌握≥8000词', target: 8000, icon: '👑', isCompleted: masteredWords >= 8000 },
            
            // Consistency 类别
            { id: 'three-day-star', name: '三日之星', englishName: 'Three-Day Star', description: '连续打卡3天', target: 3, icon: '⭐', isCompleted: currentStreak >= 3 },
            { id: 'week-streak', name: '坚持一周', englishName: 'Week Streak', description: '连续打卡7天', target: 7, icon: '🔥', isCompleted: currentStreak >= 7 },
            { id: 'two-week-streak', name: '两周达人', englishName: 'Two-Week Streak', description: '连续打卡14天', target: 14, icon: '🌟', isCompleted: currentStreak >= 14 },
            { id: 'month-streak', name: '月度冠军', englishName: 'Month Champion', description: '连续打卡30天', target: 30, icon: '🏆', isCompleted: currentStreak >= 30 },
            { id: 'consecutive-master', name: '连续大师', englishName: 'Consecutive Master', description: '连续打卡60天', target: 60, icon: '💎', isCompleted: currentStreak >= 60 },
            { id: 'century-streak', name: '百日成就', englishName: 'Century Streak', description: '连续打卡100天', target: 100, icon: '👑', isCompleted: currentStreak >= 100 },
            
            // Hidden 类别
            { id: 'midnight-owl', name: '午夜猫头鹰', englishName: 'Midnight Owl', description: '22:00-04:00完成打卡', target: 1, icon: '🦉', isCompleted: hasMidnightAchievement },
            { id: 'early-bird', name: '早鸟', englishName: 'Early Bird', description: '8:30前完成打卡', target: 1, icon: '🐦', isCompleted: hasEarlyBirdAchievement },
            { id: 'golden-hour', name: '黄金时段', englishName: 'Golden Hour', description: '15:00-18:00完成打卡', target: 1, icon: '☀️', isCompleted: hasGoldenHourAchievement },
            { id: 'last-minute', name: '压线完成', englishName: 'Last Minute', description: '11:30-11:59完成打卡', target: 1, icon: '⏰', isCompleted: hasLastMinuteAchievement },
            { id: 'speed-demon', name: '速度恶魔', englishName: 'Speed Demon', description: '10分钟内完成打卡', target: 1, icon: '⚡', isCompleted: hasSpeedAchievement }
        ];
        
        // 过滤出已完成的成就
        const completedAchievements = allAchievements.filter(achievement => achievement.isCompleted);
        
        return completedAchievements;
        
    } catch (error) {
        console.error('获取学生成就错误:', error);
        return [];
    }
}

// 生成成就徽章HTML
function generateAchievementBadgesHTML(achievements) {
    if (!achievements || achievements.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                <div style="font-size: 2em; margin-bottom: 10px;">🏆</div>
                <h4 style="color: #666; margin-bottom: 8px; font-size: 16px;">暂无成就</h4>
                <p style="color: #999; font-size: 14px;">孩子还没有获得任何成就</p>
            </div>
        `;
    }
    
    return `
        <div style="background: white; border-radius: 10px; padding: 15px;">
            <h4 style="color: #333; margin-bottom: 15px; font-size: 16px;">🏆 获得的成就</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(65px, 1fr)); gap: 10px;">
                ${achievements.map(achievement => `
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 8px; text-align: center; border: 1px solid #e0e0e0;">
                        <div style="font-size: 1.2em; margin-bottom: 5px;">${achievement.icon}</div>
                        <div style="font-weight: bold; margin-bottom: 2px; font-size: 10px;">${achievement.name}</div>
                        <div style="color: #999; font-size: 8px; margin-bottom: 3px;">${achievement.englishName}</div>
                        <div style="color: #666; font-size: 9px;">${achievement.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}