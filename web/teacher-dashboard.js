// ========== 教师面板功能 ==========
async function showTeacherDashboard() {
    showScreen('teacher-screen');
    await loadTeacherDashboard();
}

async function loadTeacherDashboard() {
    try {
        // 修复：使用正确的计数方法
        let wordsCount = 0;
        let studentsCount = 0;
        let masteredCount = 0;
        
        try {
            // 获取单词总数
            const { count: wordsCountResult, error: wordsError } = await dbClient
                .from('words')
                .select('*', { count: 'exact' })
                .eq('teacher_id', appState.teacherId);
            
            if (!wordsError) wordsCount = wordsCountResult || 0;
            
        } catch (e) {
            console.log('获取单词总数错误:', e);
        }
        
        try {
            // 获取学生总数
            const { count: studentsCountResult, error: studentsError } = await dbClient
                .from('users')
                .select('*', { count: 'exact' })
                .eq('role', 'student');
            
            if (!studentsError) studentsCount = studentsCountResult || 0;
            
        } catch (e) {
            console.log('获取学生总数错误:', e);
        }
        
        try {
            // 获取已掌握单词数
            const { count: masteredCountResult, error: masteredError } = await dbClient
                .from('student_words')
                .select('*', { count: 'exact' })
                .eq('status', 'mastered');
            
            if (!masteredError) masteredCount = masteredCountResult || 0;
            
        } catch (e) {
            console.log('获取已掌握单词数错误:', e);
        }
        
        // 获取活跃学生（最近7天有学习记录）
        let activeStudents = 0;
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: activeData, error: activeError } = await dbClient
                .from('student_words')
                .select('student_id')
                .gte('last_reviewed', sevenDaysAgo.toISOString());
            
            if (!activeError && activeData) {
                // 使用Set去除重复
                const uniqueStudents = new Set(activeData.map(r => r.student_id));
                activeStudents = uniqueStudents.size;
            }
            
        } catch (e) {
            console.log('获取活跃学生错误:', e);
        }
        
        // 更新统计数字
        document.getElementById('total-words').textContent = wordsCount;
        document.getElementById('total-students').textContent = studentsCount;
        document.getElementById('mastered-words').textContent = masteredCount;
        document.getElementById('active-students').textContent = activeStudents;
        
        // 更新快速操作内容
        const content = document.getElementById('teacher-content');
        content.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="color: #333; margin-bottom: 20px;">✨ 快速操作</h3>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 20px 0;">
                    <button class="btn" style="padding: 12px 24px;" onclick="showUploadWordsPage()">
                        <span>📤 快速上传</span>
                    </button>
                    <button class="btn btn-blue" style="padding: 12px 24px;" onclick="quickStats()">
                        <span>📈 今日数据</span>
                    </button>
                    <button class="btn" style="padding: 12px 24px;" onclick="showStudentActivity()">
                        <span>👀 学生活跃</span>
                    </button>
                </div>
                
                <div id="teacher-quick-stats" style="margin-top: 30px;">
                    <!-- 今日数据将在这里显示 -->
                </div>
                
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 30px;">
                    <h4 style="color: #333; margin-bottom: 15px;">💡 系统提示</h4>
                    <p style="color: #666; margin: 5px 0;">• 已上传 ${wordsCount} 个单词</p>
                    <p style="color: #666; margin: 5px 0;">• 共有 ${studentsCount} 名学生</p>
                    <p style="color: #666; margin: 5px 0;">• 最近7天 ${activeStudents} 名活跃学生</p>
                    <p style="color: #666; margin: 5px 0;">• 学生共掌握 ${masteredCount} 个单词</p>
                </div>
            </div>
        `;
        
        // 加载今日学习数据
        await quickStats();
        
    } catch (error) {
        console.error('加载教师面板错误:', error);
        document.getElementById('teacher-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 快速统计今日数据
async function quickStats() {
    try {
        const quickStatsEl = document.getElementById('teacher-quick-stats');
        if (quickStatsEl) {
            quickStatsEl.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="color: #666; margin-top: 20px;">正在加载今日数据...</p>
                </div>
            `;
        }
        
        // 获取今日日期
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // 查询今日学习数据
        const { data: todayStats, error: statsError } = await dbClient
            .from('study_statistics')
            .select('*')
            .eq('stat_date', todayString);
        
        // 查询今日打卡数据
        const { data: checkins, error: checkinError } = await dbClient
            .from('daily_checkin')
            .select('*')
            .eq('clock_in_date', todayString);
        
        let totalNewWords = 0;
        let totalReviewWords = 0;
        let totalStudyTime = 0;
        let checkinCount = 0;
        
        if (!statsError && todayStats && todayStats.length > 0) {
            // 计算总数据
            totalNewWords = todayStats.reduce((sum, stat) => sum + (stat.new_words_learned || 0), 0);
            totalReviewWords = todayStats.reduce((sum, stat) => sum + (stat.words_reviewed || 0), 0);
            totalStudyTime = todayStats.reduce((sum, stat) => sum + (stat.total_study_time || 0), 0);
        }
        
        // 计算打卡人数（去重学生ID）
        if (!checkinError && checkins && checkins.length > 0) {
            const uniqueStudents = new Set(checkins.map(checkin => checkin.student_id));
            checkinCount = uniqueStudents.size;
        }
        
        // 更新快速统计区域
        const quickStatsEl2 = document.getElementById('teacher-quick-stats');
        if (quickStatsEl2) {
            quickStatsEl2.innerHTML = `
                <h3 style="color: #9C27B0; margin-bottom: 20px;">📊 今日数据</h3>
                <div class="card-grid">
                    <div class="stat-card">
                        <div class="number">${totalNewWords}</div>
                        <div class="label">新学单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${totalReviewWords}</div>
                        <div class="label">复习单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${checkinCount}</div>
                        <div class="label">打卡人数</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${totalStudyTime}</div>
                        <div class="label">学习分钟</div>
                    </div>
                </div>
                ${checkinCount > 0 ? `
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center;">
                        <p style="color: #666; margin: 0;">今日共有 ${checkinCount} 名学生学习，加油！</p>
                    </div>
                ` : `
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center;">
                        <p style="color: #666; margin: 0;">今日暂无学习数据</p>
                    </div>
                `}
            `;
        }
        
        // 同时更新系统概览上面的今日数据
        const systemQuickStatsEl = document.getElementById('quick-stats');
        if (systemQuickStatsEl) {
            systemQuickStatsEl.innerHTML = `
                <h3 style="color: #9C27B0; margin-bottom: 20px;">📊 今日数据</h3>
                <div class="card-grid">
                    <div class="stat-card">
                        <div class="number">${totalNewWords}</div>
                        <div class="label">新学单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${totalReviewWords}</div>
                        <div class="label">复习单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${checkinCount}</div>
                        <div class="label">打卡人数</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${totalStudyTime}</div>
                        <div class="label">学习分钟</div>
                    </div>
                </div>
                ${checkinCount > 0 ? `
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center;">
                        <p style="color: #666; margin: 0;">今日共有 ${checkinCount} 名学生学习，加油！</p>
                    </div>
                ` : `
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center;">
                        <p style="color: #666; margin: 0;">今日暂无学习数据</p>
                    </div>
                `}
            `;
        }
        
    } catch (error) {
        console.error('获取今日数据错误:', error);
        const quickStatsEl = document.getElementById('teacher-quick-stats');
        if (quickStatsEl) {
            quickStatsEl.innerHTML = `
                <h3 style="color: #9C27B0; margin-bottom: 20px;">📊 今日数据</h3>
                <div class="card-grid">
                    <div class="stat-card">
                        <div class="number">0</div>
                        <div class="label">新学单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">0</div>
                        <div class="label">复习单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">0</div>
                        <div class="label">打卡人数</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">0</div>
                        <div class="label">学习分钟</div>
                    </div>
                </div>
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center;">
                    <p style="color: #666; margin: 0;">加载数据失败</p>
                </div>
            `;
        }
    }
}

// 显示学生活动
function showStudentActivity() {
    showScreen('student-activity-screen');
    loadStudentActivity();
}

// 显示家长管理页面
function showParentManagementPage() {
    showScreen('teacher-parents-screen');
    loadParentManagementPage();
}

// 加载家长管理页面
async function loadParentManagementPage() {
    try {
        const content = document.getElementById('teacher-parents-content');
        content.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <h3 style="color: #333; margin-bottom: 30px;">👨‍👩‍👧‍👦 家长管理</h3>
                <div style="background: #f8f9fa; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <div id="parent-list" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        <p style="color: #666; margin-top: 20px;">正在加载家长列表...</p>
                    </div>
                </div>
            </div>
        `;
        
        // 从数据库获取家长数据
        const { data: parents, error } = await dbClient
            .from('users')
            .select('*')
            .eq('role', 'parent')
            .order('username');
        
        if (error) {
            throw error;
        }
        
        const parentList = document.getElementById('parent-list');
        
        if (!parents || parents.length === 0) {
            parentList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3em; margin-bottom: 20px; color: #ddd;">👨‍👩‍👧‍👦</div>
                    <p style="color: #666;">还没有家长信息</p>
                </div>
            `;
            return;
        }
        
        let parentHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f5f5f5;">
                        <tr>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">ID</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">家长姓名</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        parents.forEach((parent, index) => {
            parentHTML += `
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 12px;">${index + 1}</td>
                    <td style="padding: 12px;">${parent.username}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn" style="padding: 6px 12px; font-size: 14px; margin-right: 5px; background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb;" 
                                onclick="editParent('${parent.id}', '${parent.username}')">
                            编辑
                        </button>
                        <button class="btn btn-red" style="padding: 6px 12px; font-size: 14px;" 
                                onclick="deleteParent('${parent.id}', '${parent.username}')">
                            删除
                        </button>
                    </td>
                </tr>
            `;
        });
        
        parentHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        parentList.innerHTML = parentHTML;
        
    } catch (error) {
        console.error('加载家长管理页面错误:', error);
        document.getElementById('teacher-parents-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 编辑家长信息
function editParent(id, name) {
    // 创建编辑家长的模态框
    const modalId = 'edit-parent-modal';
    const modalHTML = `
        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: white; border-radius: 15px; padding: 30px; width: 90%; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <h3 style="color: #333; margin-bottom: 20px; text-align: center;">✏️ 编辑家长信息</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">家长姓名</label>
                    <input type="text" id="edit-parent-name" value="${name}" 
                           style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                    <button class="btn" onclick="document.getElementById('${modalId}').remove()" style="padding: 10px 20px;">
                        取消
                    </button>
                    <button class="btn btn-blue" onclick="saveParentEdit('${id}')" style="padding: 10px 20px;">
                        保存更改
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 保存家长编辑
async function saveParentEdit(id) {
    const name = document.getElementById('edit-parent-name').value.trim();
    
    if (!name) {
        showAlert('请填写家长姓名', 'error');
        return;
    }
    
    try {
        // 从数据库更新家长信息
        const { error } = await dbClient
            .from('users')
            .update({ username: name })
            .eq('id', id);
        
        if (error) {
            throw error;
        }
        
        showAlert(`家长信息已更新: ${name}`, 'success');
        
        // 关闭模态框
        document.getElementById('edit-parent-modal').remove();
        
        // 重新加载家长列表
        loadParentManagementPage();
        
    } catch (error) {
        console.error('更新家长信息错误:', error);
        showAlert('更新失败，请重试', 'error');
    }
}

// 删除家长
async function deleteParent(id, name) {
    if (!confirm(`确定要删除家长 "${name}" 吗？`)) {
        return;
    }
    
    try {
        // 从数据库删除家长信息
        const { error } = await dbClient
            .from('users')
            .delete()
            .eq('id', id);
        
        if (error) {
            throw error;
        }
        
        showAlert(`家长 "${name}" 已删除`, 'success');
        
        // 重新加载家长列表
        loadParentManagementPage();
        
    } catch (error) {
        console.error('删除家长信息错误:', error);
        showAlert('删除失败，请重试', 'error');
    }
}

// 加载学生活动
async function loadStudentActivity() {
    try {
        const content = document.getElementById('student-activity-content');
        content.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto;">
                <h3 style="color: #333; margin-bottom: 30px;">👥 学生活动</h3>
                <div id="activity-list">
                    <div style="text-align: center; padding: 40px;">
                        <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto;"></div>
                        <p style="color: #666; margin-top: 15px;">正在加载学生活动...</p>
                    </div>
                </div>
            </div>
        `;
        
        // 获取最近7天的学习记录
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: activities, error } = await dbClient
            .from('study_statistics')
            .select('*')
            .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0])
            .order('stat_date', { ascending: false });
        
        if (error) throw error;
        
        const activityList = document.getElementById('activity-list');
        
        if (!activities || activities.length === 0) {
            activityList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3em; margin-bottom: 10px; color: #ddd;">📊</div>
                    <p style="color: #666;">最近7天没有学习记录</p>
                </div>
            `;
            return;
        }
        
        // 按学生分组
        const studentActivities = {};
        activities.forEach(activity => {
            if (!studentActivities[activity.student_id]) {
                studentActivities[activity.student_id] = [];
            }
            studentActivities[activity.student_id].push(activity);
        });
        
        // 生成活动列表
        let activityHTML = '<div style="display: flex; flex-direction: column; gap: 20px;">';
        
        Object.entries(studentActivities).forEach(([studentId, studentActivity]) => {
            const totalNewWords = studentActivity.reduce((sum, act) => sum + (act.new_words_learned || 0), 0);
            const totalReviewWords = studentActivity.reduce((sum, act) => sum + (act.words_reviewed || 0), 0);
            const totalStudyTime = studentActivity.reduce((sum, act) => sum + (act.total_study_time || 0), 0);
            
            activityHTML += `
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="color: #333; margin: 0;">${studentId}</h4>
                        <div style="color: #666; font-size: 14px;">学习了${studentActivity.length}天</div>
                    </div>
                    <div class="card-grid">
                        <div class="stat-card">
                            <div class="number">${totalNewWords}</div>
                            <div class="label">新学单词</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${totalReviewWords}</div>
                            <div class="label">复习单词</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${totalStudyTime}</div>
                            <div class="label">学习分钟</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${Math.round((totalNewWords + totalReviewWords) / studentActivity.length)}</div>
                            <div class="label">日均单词</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        activityHTML += '</div>';
        activityList.innerHTML = activityHTML;
        
    } catch (error) {
        console.error('加载学生活动错误:', error);
        document.getElementById('student-activity-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}