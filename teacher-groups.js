// ========== 教师分组管理功能 ==========
function showGroupManagementPage() {
    showScreen('teacher-groups-screen');
    loadGroupManagementPage();
}

// 修复分组管理页面加载
async function loadGroupManagementPage() {
    try {
        showLoading('正在加载分组管理...');
        
        const content = document.getElementById('teacher-groups-content');
        content.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto;">
                <h3 style="color: #333; margin-bottom: 30px;">👥 分组管理</h3>
                
                <div class="two-column">
                    <!-- 左侧：分组列表 -->
                    <div style="background: #f8f9fa; border-radius: 15px; padding: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h4 style="color: #333; margin: 0;">📁 我的分组</h4>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn" onclick="refreshGroupList()" style="padding: 8px 16px;">
                                    🔄 刷新列表
                                </button>
                                <button class="btn btn-blue" onclick="refreshAllGroupData()" style="padding: 8px 16px;">
                                    🔄 刷新所有数据
                                </button>
                            </div>
                        </div>
                        <div id="group-list">
                            <div style="text-align: center; padding: 40px;">
                                <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto;"></div>
                                <p style="color: #666; margin-top: 15px;">正在加载分组列表...</p>
                            </div>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
                            <h4 style="color: #333; margin-bottom: 15px;">➕ 创建新分组</h4>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="new-group-name" placeholder="输入分组名称" 
                                       style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
                                       onkeypress="if(event.key === 'Enter') createNewGroupFixed()">
                                <button class="btn" onclick="createNewGroupFixed()" id="create-group-btn">
                                    <span>创建分组</span>
                                </button>
                            </div>
                            <p style="color: #666; font-size: 14px; margin-top: 10px;">
                                💡 创建分组后，可以将学生添加到分组中管理
                            </p>
                        </div>
                    </div>
                    
                    <!-- 右侧：分组详情 -->
                    <div style="background: #f8f9fa; border-radius: 15px; padding: 25px;">
                        <h4 style="color: #333; margin-bottom: 20px;">📋 分组详情</h4>
                        <div id="group-detail">
                            <div style="text-align: center; padding: 40px;">
                                <div style="font-size: 3em; margin-bottom: 10px;">📁</div>
                                <p style="color: #666;">选择一个分组查看详情</p>
                                <p style="color: #999; font-size: 14px; margin-top: 10px;">点击左侧的分组即可查看详情</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 加载分组列表
        await loadGroupListFixed();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('加载分组管理页面错误:', error);
        showAlert('加载分组管理页面失败', 'error');
    }
}

// 刷新分组列表
function refreshGroupList() {
    loadGroupListFixed();
}

// 刷新所有分组数据
async function refreshAllGroupData() {
    try {
        showLoading('正在刷新所有分组数据...');
        await loadGroupListFixed();
        hideLoading();
        showAlert('所有分组数据已刷新', 'success');
    } catch (error) {
        hideLoading();
        console.error('刷新分组数据错误:', error);
        showAlert('刷新失败', 'error');
    }
}

// 修复的分组列表加载函数
async function loadGroupListFixed() {
    try {
        console.log('开始加载分组列表...');
        
        const groupListDiv = document.getElementById('group-list');
        groupListDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading-spinner" style="width: 30px; height: 30px; margin: 0 auto;"></div>
                <p style="color: #666; margin-top: 10px;">正在加载...</p>
            </div>
        `;
        
        // 1. 首先获取所有分组
        const { data: groups, error: groupsError } = await dbClient
            .from('groups')
            .select('*')
            .eq('teacher_id', appState.teacherId)
            .order('created_at', { ascending: false });
        
        if (groupsError) {
            console.error('查询分组错误:', groupsError);
            throw groupsError;
        }
        
        console.log('查询到的分组数据:', groups);
        
        // 如果没有分组，显示空状态
        if (!groups || groups.length === 0) {
            groupListDiv.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <div style="font-size: 4em; margin-bottom: 20px; color: #ddd;">📁</div>
                    <h4 style="color: #666; margin-bottom: 10px;">还没有分组</h4>
                    <p style="color: #999; margin-bottom: 20px;">创建一个分组来开始管理学生</p>
                </div>
            `;
            return;
        }
        
        // 2. 使用 Promise.all 并行获取所有分组的统计数据
        const groupsWithStats = await Promise.all(groups.map(async (group) => {
            try {
                // 获取分组单词数
                const { data: wordData, error: wordsError } = await dbClient
                    .from('words')
                    .select('*')
                    .eq('group_id', group.id)
                    .eq('teacher_id', appState.teacherId);
                
                // 获取分组学生数
                const { data: studentData, error: studentsError } = await dbClient
                    .from('group_students')
                    .select('*')
                    .eq('group_id', group.id);
                
                return {
                    ...group,
                    wordCount: wordData?.length || 0,
                    studentCount: studentData?.length || 0
                };
            } catch (error) {
                console.error(`获取分组 ${group.id} 统计数据错误:`, error);
                return {
                    ...group,
                    wordCount: 0,
                    studentCount: 0
                };
            }
        }));
        
        // 3. 显示分组列表
        displayGroupListFixed(groupsWithStats);
        
    } catch (error) {
        console.error('加载分组列表错误:', error);
        const groupListDiv = document.getElementById('group-list');
        
        let errorMessage = error.message;
        if (error.message.includes('does not exist')) {
            errorMessage = '分组表不存在，请初始化数据库';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = '网络连接失败，请检查网络';
        }
        
        groupListDiv.innerHTML = `
            <div class="message-box message-error">
                <h4 style="margin-bottom: 10px;">❌ 加载失败</h4>
                <p style="margin-bottom: 15px;">${errorMessage}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn" onclick="loadGroupListFixed()" style="padding: 8px 16px;">
                        重试加载
                    </button>
                    <button class="btn btn-blue" onclick="createDefaultGroupFixed()" style="padding: 8px 16px;">
                        创建默认分组
                    </button>
                </div>
            </div>
        `;
    }
}

// 修复分组列表显示函数
function displayGroupListFixed(groups) {
    const groupListDiv = document.getElementById('group-list');
    
    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    
    groups.forEach(group => {
        const createdDate = new Date(group.created_at).toLocaleDateString('zh-CN');
        const teacherId = group.teacher_id || '未指定教师';
        
        html += `
            <div style="background: white; border: 2px solid #4CAF50; border-radius: 10px; padding: 20px; cursor: pointer; transition: all 0.3s;"
                 onclick="showGroupDetailFixed('${group.id}')"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.1)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <h5 style="margin: 0; color: #333; font-size: 1.2em; margin-bottom: 5px;">${group.name}</h5>
                        <div style="color: #666; font-size: 0.9em; margin-bottom: 5px;">教师: ${teacherId}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" style="padding: 6px 12px; font-size: 14px; background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb;" 
                                onclick="event.stopPropagation(); editGroupFixed('${group.id}', '${group.name}')">
                            编辑
                        </button>
                        <button class="btn btn-red" style="padding: 6px 12px; font-size: 14px;" 
                                onclick="event.stopPropagation(); deleteGroupFixed('${group.id}', '${group.name}')">
                            删除
                        </button>
                    </div>
                </div>
                <div style="display: flex; gap: 20px; color: #666; font-size: 0.9em; margin-bottom: 5px;">
                    <div>📚 单词: <strong>${group.wordCount}</strong></div>
                    <div>👥 学生: <strong>${group.studentCount}</strong></div>
                </div>
                <div style="color: #999; font-size: 0.8em; margin-top: 10px;">
                    创建于: ${createdDate}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    groupListDiv.innerHTML = html;
}

// 创建默认分组
async function createDefaultGroupFixed() {
    try {
        showAlert('正在创建默认分组...', 'info');
        
        const { data: existingGroup, error: checkError } = await dbClient
            .from('groups')
            .select('id')
            .eq('name', '默认分组')
            .maybeSingle();
        
        if (existingGroup) {
            showAlert('默认分组已存在', 'info');
            loadGroupListFixed();
            return;
        }
        
        const { data: newGroup, error } = await dbClient
            .from('groups')
            .insert([{
                name: '默认分组',
                teacher_id: appState.teacherId || 'kathy151'
            }])
            .select()
            .single();
        
        if (error) {
            // 尝试不加 teacher_id
            const { data: newGroup2, error: error2 } = await dbClient
                .from('groups')
                .insert([{
                    name: '默认分组'
                }])
                .select()
                .single();
            
            if (error2) throw error2;
            
            showAlert('默认分组创建成功！', 'success');
            loadGroupListFixed();
        } else {
            showAlert('默认分组创建成功！', 'success');
            loadGroupListFixed();
        }
        
    } catch (error) {
        console.error('创建默认分组错误:', error);
        showAlert(`创建失败: ${error.message}`, 'error');
    }
}

// 创建新分组
async function createNewGroupFixed() {
    const groupNameInput = document.getElementById('new-group-name');
    const groupName = groupNameInput.value.trim();
    const createBtn = document.getElementById('create-group-btn');
    
    if (!groupName) {
        showAlert('请输入分组名称', 'error');
        return;
    }
    
    try {
        createBtn.disabled = true;
        createBtn.innerHTML = '<span>创建中...</span>';
        
        // 检查是否重名
        const { data: existingGroup, error: checkError } = await dbClient
            .from('groups')
            .select('id')
            .eq('name', groupName)
            .maybeSingle();
        
        if (existingGroup) {
            showAlert('分组名称已存在', 'error');
            return;
        }
        
        // 创建分组
        const { data: newGroup, error } = await dbClient
            .from('groups')
            .insert([{
                name: groupName,
                teacher_id: appState.teacherId || 'kathy151'
            }])
            .select()
            .single();
        
        if (error) {
            // 尝试其他方式
            const { data: newGroup2, error: error2 } = await dbClient
                .from('groups')
                .insert([{
                    name: groupName
                }])
                .select()
                .single();
            
            if (error2) throw error2;
            
            showAlert(`分组 "${groupName}" 创建成功！`, 'success');
            groupNameInput.value = '';
            loadGroupListFixed();
        } else {
            showAlert(`分组 "${groupName}" 创建成功！`, 'success');
            groupNameInput.value = '';
            loadGroupListFixed();
        }
        
    } catch (error) {
        console.error('创建分组错误:', error);
        showAlert(`创建失败: ${error.message}`, 'error');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<span>创建分组</span>';
    }
}

// 显示分组详情
async function showGroupDetailFixed(groupId) {
    try {
        const detailDiv = document.getElementById('group-detail');
        detailDiv.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto;"></div>
                <p style="color: #666; margin-top: 15px;">正在加载分组详情...</p>
            </div>
        `;
        
        // 使用 Promise.all 并行获取所有数据
        const [
            groupResult,
            wordsResult,
            studentsResult,
            groupStudentsResult
        ] = await Promise.all([
            // 获取分组信息
            dbClient.from('groups').select('*').eq('id', groupId).single(),
            
            // 获取分组单词（前10个）和总数
            Promise.all([
                dbClient.from('words')
                    .select('english, chinese')
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: false })
                    .limit(10),
                dbClient.from('words')
                    .select('*')
                    .eq('group_id', groupId)
                    .eq('teacher_id', appState.teacherId)
            ]),
            
            // 获取所有学生
            dbClient.from('users')
                .select('username, created_at')
                .eq('role', 'student')
                .order('username'),
            
            // 获取分组学生
            dbClient.from('group_students')
                .select('student_id')
                .eq('group_id', groupId)
        ]);
        
        // 处理分组信息
        if (groupResult.error || !groupResult.data) {
            throw new Error('分组不存在或已被删除');
        }
        const group = groupResult.data;
        
        // 处理单词数据
        const groupWords = wordsResult[0].data || [];
        const totalWords = wordsResult[1].length || 0;
        
        // 处理学生数据
        const allStudents = studentsResult.data || [];
        
        // 处理分组学生
        const groupStudentIds = new Set((groupStudentsResult.data || []).map(gs => gs.student_id));
        
        // 渲染分组详情
        detailDiv.innerHTML = `
            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #333; margin: 0;">📁 ${group.name}</h4>
                    <div style="color: #666; font-size: 14px;">ID: ${group.id}</div>
                </div>
                <div style="color: #666; margin-bottom: 10px;">创建时间: ${new Date(group.created_at).toLocaleString('zh-CN')}</div>
                <div style="color: #666;">教师ID: ${group.teacher_id || '未指定'}</div>
            </div>
            
            <div class="stats-card" style="margin-bottom: 30px;">
                <div class="card-grid">
                    <div class="stat-card">
                        <div class="number">${totalWords}</div>
                        <div class="label">分组单词</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${groupStudentIds.size}</div>
                        <div class="label">分组学生</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h5 style="margin: 0; color: #333;">👥 学生管理</h5>
                    <div>
                        <button class="btn" onclick="addAllStudentsToGroupFixed('${groupId}')" style="margin-right: 10px; padding: 8px 16px;">
                            添加所有学生
                        </button>
                        <button class="btn btn-blue" onclick="refreshGroupDetail('${groupId}')" style="padding: 8px 16px;">
                            🔄 刷新
                        </button>
                    </div>
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 15px; max-height: 400px; overflow-y: auto; border: 2px solid #f0f0f0;">
                    ${allStudents.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa; position: sticky; top: 0;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">学生用户名</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">注册时间</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">状态</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allStudents.map(student => {
                                    const isInGroup = groupStudentIds.has(student.username);
                                    const regDate = formatDate(new Date(student.created_at));
                                    return `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 12px;">
                                                <div style="font-weight: bold;">${student.username}</div>
                                            </td>
                                            <td style="padding: 12px; color: #666;">${regDate}</td>
                                            <td style="padding: 12px; text-align: center;">
                                                <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; 
                                                      background: ${isInGroup ? '#e8f5e9' : '#fff3cd'}; 
                                                      color: ${isInGroup ? '#2e7d32' : '#856404'}; 
                                                      border: 1px solid ${isInGroup ? '#c8e6c9' : '#ffeaa7'};">
                                                    ${isInGroup ? '✓ 已加入' : '待加入'}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; text-align: center;">
                                                ${isInGroup ? 
                                                    `<button class="btn" style="padding: 6px 12px; font-size: 13px; background: #f8d7da; color: #721c24;" 
                                                             onclick="removeStudentFromGroupFixed('${groupId}', '${student.username}')">
                                                        ✗ 移除
                                                    </button>` :
                                                    `<button class="btn" style="padding: 6px 12px; font-size: 13px; background: #d4edda; color: #155724;" 
                                                             onclick="addStudentToGroupFixed('${groupId}', '${student.username}')">
                                                        ＋ 添加
                                                    </button>`}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <div style="color: #666; font-size: 14px; margin-top: 10px; text-align: right;">
                            总计: ${allStudents.length} 名学生 | 已加入: ${groupStudentIds.size} 名
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 30px;">
                            <div style="font-size: 3em; margin-bottom: 10px; color: #ddd;">👥</div>
                            <p style="color: #666;">还没有学生注册</p>
                            <p style="color: #999; font-size: 14px; margin-top: 5px;">学生注册后才会显示在这里</p>
                        </div>
                    `}
                </div>
            </div>
            
            ${groupWords.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h5 style="margin: 0; color: #333; margin-bottom: 15px;">📝 分组单词预览</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        ${groupWords.map(word => `
                            <div style="background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border: 2px solid #4CAF50; border-radius: 10px; padding: 12px; text-align: center;">
                                <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #2E7D32;">${word.english}</div>
                                <div style="color: #666; font-size: 14px;">${word.chinese}</div>
                            </div>
                        `).join('')}
                    </div>
                    ${totalWords > 10 ? `
                        <div style="text-align: center; margin-top: 15px;">
                            <span style="color: #666;">还有 ${totalWords - 10} 个单词未显示</span>
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div style="margin-bottom: 30px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <div style="font-size: 3em; margin-bottom: 10px; color: #ddd;">📚</div>
                    <p style="color: #666;">这个分组还没有单词</p>
                    <p style="color: #999; font-size: 14px; margin-top: 5px;">上传单词后，学生会自动同步</p>
                </div>
            `}
            
            <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                <button class="btn btn-blue" onclick="uploadWordsToGroupFixed('${groupId}')" style="padding: 12px 30px; font-size: 16px; margin-right: 10px;">
                    📤 上传单词
                </button>
                <button class="btn" onclick="manageGroupWords('${groupId}')" style="padding: 12px 30px; font-size: 16px;">
                    📖 管理单词
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('加载分组详情错误:', error);
        document.getElementById('group-detail').innerHTML = `
            <div class="message-box message-error">
                <h4 style="margin-bottom: 10px;">❌ 加载失败</h4>
                <p style="margin-bottom: 15px;">${error.message}</p>
                <div style="text-align: center; margin-top: 15px;">
                    <button class="btn" onclick="loadGroupListFixed()" style="margin-right: 10px;">
                        返回列表
                    </button>
                    <button class="btn" onclick="showGroupDetailFixed('${groupId}')">
                        重试加载
                    </button>
                </div>
            </div>
        `;
    }
}

// 刷新分组详情
function refreshGroupDetail(groupId) {
    showGroupDetailFixed(groupId);
}

// 添加学生到分组
async function addStudentToGroupFixed(groupId, studentId) {
    try {
        showAlert(`正在添加 ${studentId} 到分组...`, 'info');
        
        const { error } = await dbClient
            .from('group_students')
            .insert([{
                group_id: groupId,
                student_id: studentId,
                created_at: new Date().toISOString()
            }], { onConflict: 'group_id,student_id' });
        
        if (error) {
            if (error.code === '23505') {
                showAlert(`${studentId} 已经在分组中`, 'warning');
            } else {
                throw error;
            }
        } else {
            showAlert(`✅ ${studentId} 已成功添加到分组`, 'success');
        }
        
        // 刷新分组列表统计
        loadGroupListFixed();
        
        // 刷新分组详情
        showGroupDetailFixed(groupId);
        
        // 同步单词给学生
        await syncWordsToStudentAfterJoiningGroup(studentId, groupId);
        
    } catch (error) {
        console.error('添加学生错误:', error);
        showAlert(`添加失败: ${error.message}`, 'error');
    }
}

// 新增：学生加入分组后同步单词
async function syncWordsToStudentAfterJoiningGroup(studentId, groupId) {
    try {
        console.log(`为学生 ${studentId} 同步分组 ${groupId} 的单词...`);
        
        // 获取分组所有单词
        const { data: groupWords, error } = await dbClient
            .from('words')
            .select('*')
            .eq('group_id', groupId)
            .eq('teacher_id', appState.teacherId);
        
        if (error) throw error;
        
        if (!groupWords || groupWords.length === 0) {
            console.log(`分组 ${groupId} 没有单词可以同步`);
            return 0;
        }
        
        console.log(`找到 ${groupWords.length} 个分组单词`);
        
        // 检查学生是否已有这些单词
        const { data: existingRecords } = await dbClient
            .from('student_words')
            .select('word_id')
            .eq('student_id', studentId);
        
        const existingWordIds = new Set(existingRecords?.map(r => r.word_id) || []);
        
        // 准备新单词记录
        const newRecords = groupWords
            .filter(word => !existingWordIds.has(word.id))
            .map(word => ({
                student_id: studentId,
                word_id: word.id,
                english: word.english,
                chinese: word.chinese,
                status: 'new',
                review_count: 0,
                group_id: groupId,
                added_date: new Date().toISOString()
            }));
        
        console.log(`需要同步 ${newRecords.length} 个新单词`);
        
        if (newRecords.length > 0) {
            // 分批插入
            const batchSize = 50;
            for (let i = 0; i < newRecords.length; i += batchSize) {
                const batch = newRecords.slice(i, i + batchSize);
                await dbClient
                    .from('student_words')
                    .insert(batch);
            }
            
            console.log(`为 ${studentId} 同步了 ${newRecords.length} 个单词`);
            showAlert(`✅ 已为学生 ${studentId} 同步 ${newRecords.length} 个分组单词`, 'success');
            return newRecords.length;
        }
        
        return 0;
        
    } catch (error) {
        console.error('同步分组单词给学生错误:', error);
        showAlert(`单词同步失败: ${error.message}`, 'warning');
        return 0;
    }
}

// 移除学生从分组
async function removeStudentFromGroupFixed(groupId, studentId) {
    if (!confirm(`确定要从分组中移除 ${studentId} 吗？\n\n⚠️ 移除后，该学生在此分组下的未学习单词将被删除！`)) {
        return;
    }
    
    try {
        showAlert(`正在移除 ${studentId}...`, 'info');
        
        // 1. 删除分组学生关联
        const { error: deleteError } = await dbClient
            .from('group_students')
            .delete()
            .eq('group_id', groupId)
            .eq('student_id', studentId);
        
        if (deleteError) throw deleteError;
        
        // 2. 获取该学生在当前分组下的学习记录
        const { data: groupRecords, error: recordsError } = await dbClient
            .from('student_words')
            .select('*')
            .eq('student_id', studentId)
            .eq('group_id', groupId);
        
        if (recordsError) throw recordsError;
        
        // 3. 只删除未学习的单词（status='new'且last_reviewed为null）
        if (groupRecords && groupRecords.length > 0) {
            const unlearnedRecords = groupRecords.filter(record => 
                record.status === 'new' && !record.last_reviewed
            );
            
            if (unlearnedRecords.length > 0) {
                const unlearnedIds = unlearnedRecords.map(r => r.id);
                await dbClient
                    .from('student_words')
                    .delete()
                    .in('id', unlearnedIds);
                console.log(`删除了 ${unlearnedRecords.length} 个未学习单词`);
            }
            
            // 对于已经学习过的单词，保留记录但移除分组ID（设置为null）
            const learnedRecords = groupRecords.filter(record => 
                record.status !== 'new' || record.last_reviewed
            );
            
            if (learnedRecords.length > 0) {
                const learnedIds = learnedRecords.map(r => r.id);
                await dbClient
                    .from('student_words')
                    .update({ group_id: null })
                    .in('id', learnedIds);
                console.log(`移除了 ${learnedRecords.length} 个已学习单词的分组关联`);
            }
        }
        
        showAlert(`✅ ${studentId} 已从分组中移除\n📚 未学习单词已删除\n✅ 已学习单词保留在原分组`, 'success');
        
        // 刷新分组列表统计
        loadGroupListFixed();
        
        // 刷新分组详情
        showGroupDetailFixed(groupId);
        
        // 如果该学生当前在线，刷新其主页
        if (appState.currentUser === studentId) {
            setTimeout(() => {
                loadStudentDashboardSimple();
                showAlert('您的分组已更新，未学习单词已移除', 'info');
            }, 1000);
        }
        
    } catch (error) {
        console.error('移除学生错误:', error);
        showAlert(`移除失败: ${error.message}`, 'error');
    }
}

// 删除分组
async function deleteGroupFixed(groupId, groupName) {
    if (!confirm(`确定要删除分组 "${groupName}" 吗？\n\n⚠️ 删除后：\n• 分组信息将被永久删除\n• 分组与学生的关联将被移除\n• 分组内的单词将保留（但不再属于任何分组）`)) {
        return;
    }
    
    try {
        showAlert(`正在删除分组 "${groupName}"...`, 'warning');
        
        // 1. 先删除分组学生关联
        const { error: deleteStudentsError } = await dbClient
            .from('group_students')
            .delete()
            .eq('group_id', groupId);
        
        if (deleteStudentsError) throw deleteStudentsError;
        
        // 2. 更新单词，移除分组ID（而不是删除单词）
        const { error: updateWordsError } = await dbClient
            .from('words')
            .update({ group_id: null })
            .eq('group_id', groupId)
            .eq('teacher_id', appState.teacherId);
        
        if (updateWordsError) throw updateWordsError;
        
        // 3. 删除分组本身
        const { error: deleteGroupError } = await dbClient
            .from('groups')
            .delete()
            .eq('id', groupId);
        
        if (deleteGroupError) throw deleteGroupError;
        
        showAlert(`✅ 分组 "${groupName}" 已成功删除`, 'success');
        
        // 4. 重新加载分组列表
        loadGroupListFixed();
        
        // 5. 清空分组详情区域
        document.getElementById('group-detail').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 3em; margin-bottom: 10px;">📁</div>
                <p style="color: #666;">分组已删除</p>
                <p style="color: #999; font-size: 14px; margin-top: 10px;">请选择其他分组或创建新分组</p>
            </div>
        `;
        
    } catch (error) {
        console.error('删除分组错误:', error);
        showAlert(`删除失败: ${error.message}`, 'error');
    }
}

// 上传单词到分组
function uploadWordsToGroupFixed(groupId) {
    console.log('uploadWordsToGroupFixed called with groupId:', groupId);
    appState.selectedGroupId = groupId;
    console.log('appState.selectedGroupId set to:', appState.selectedGroupId);
    showUploadWordsPage();
}

// 管理分组单词
function manageGroupWords(groupId) {
    appState.selectedGroupId = groupId;
    showWordManagementPage();
}

// 编辑分组
function editGroupFixed(groupId, currentName) {
    // 创建编辑分组的模态框
    const modalId = 'edit-group-modal';
    const modalHTML = `
        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: white; border-radius: 15px; padding: 30px; width: 90%; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <h3 style="color: #333; margin-bottom: 20px; text-align: center;">✏️ 编辑分组</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">分组名称</label>
                    <input type="text" id="edit-group-name" value="${currentName}" 
                           style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                    <button class="btn" onclick="document.getElementById('${modalId}').remove()" style="padding: 10px 20px;">
                        取消
                    </button>
                    <button class="btn btn-blue" onclick="saveGroupEdit('${groupId}')" style="padding: 10px 20px;">
                        保存更改
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 聚焦到输入框
    const input = document.getElementById('edit-group-name');
    input.focus();
    input.select();
}

// 保存分组编辑
async function saveGroupEdit(groupId) {
    const input = document.getElementById('edit-group-name');
    const newName = input.value.trim();
    
    if (!newName) {
        showAlert('请输入分组名称', 'error');
        return;
    }
    
    try {
        showAlert('正在保存更改...', 'info');
        
        // 检查是否重名
        const { data: existingGroup, error: checkError } = await dbClient
            .from('groups')
            .select('id')
            .eq('name', newName)
            .neq('id', groupId)
            .maybeSingle();
        
        if (existingGroup) {
            showAlert('分组名称已存在', 'error');
            return;
        }
        
        // 更新分组名称
        const { error } = await dbClient
            .from('groups')
            .update({ name: newName })
            .eq('id', groupId);
        
        if (error) throw error;
        
        showAlert(`✅ 分组名称已更新为 "${newName}"`, 'success');
        
        // 关闭模态框
        document.getElementById('edit-group-modal').remove();
        
        // 刷新分组列表
        loadGroupListFixed();
        
        // 刷新当前查看的分组详情
        const detailDiv = document.getElementById('group-detail');
        if (detailDiv) {
            showGroupDetailFixed(groupId);
        }
        
    } catch (error) {
        console.error('编辑分组错误:', error);
        showAlert(`更新失败: ${error.message}`, 'error');
    }
}

// 添加所有学生到分组
async function addAllStudentsToGroupFixed(groupId) {
    try {
        // 获取所有学生
        const { data: allStudents, error: studentsError } = await dbClient
            .from('users')
            .select('username')
            .eq('role', 'student');
        
        if (studentsError) throw studentsError;
        
        if (!allStudents || allStudents.length === 0) {
            showAlert('没有学生可以添加', 'info');
            return;
        }
        
        if (!confirm(`确定要将所有 ${allStudents.length} 名学生添加到这个分组吗？`)) {
            return;
        }
        
        showAlert(`正在添加 ${allStudents.length} 名学生到分组...`, 'info');
        
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const student of allStudents) {
            try {
                const { error } = await dbClient
                    .from('group_students')
                    .insert([{
                        group_id: groupId,
                        student_id: student.username,
                        created_at: new Date().toISOString()
                    }], { onConflict: 'group_id,student_id' });
                
                if (!error || error.code === '23505') {
                    if (error && error.code === '23505') {
                        skippedCount++;
                    } else {
                        addedCount++;
                        // 同步单词给学生
                        await syncWordsToStudentAfterJoiningGroup(student.username, groupId);
                    }
                }
            } catch (err) {
                console.error(`添加学生 ${student.username} 错误:`, err);
            }
        }
        
        showAlert(`✅ 已完成添加\n• 新增: ${addedCount} 名学生\n• 已存在: ${skippedCount} 名学生`, 'success');
        
        // 刷新分组列表和详情
        loadGroupListFixed();
        showGroupDetailFixed(groupId);
        
    } catch (error) {
        console.error('添加所有学生错误:', error);
        showAlert(`添加失败: ${error.message}`, 'error');
    }
}