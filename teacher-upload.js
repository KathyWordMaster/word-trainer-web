// ========== 教师单词上传功能 ==========
function showUploadWordsPage() {
    showScreen('teacher-upload-screen');
    loadUploadWordsPage();
}

async function loadUploadWordsPage() {
    const content = document.getElementById('teacher-upload-content');
    content.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h3 style="color: #333; margin-bottom: 20px; text-align: center;">📝 上传单词</h3>
            
            <!-- 选择分组 -->
            <div style="background: #E3F2FD; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #1565C0;">
                    📁 选择分组
                </label>
                <div id="group-select-container">
                    <p>正在加载分组...</p>
                </div>
            </div>
            
            <div style="background: #E8F5E9; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                <h4 style="color: #2E7D32; margin-bottom: 15px;">📋 上传说明</h4>
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 12px 0; color: #333; font-weight: bold;">1. 标准格式</p>
                    <p style="margin: 8px 0; color: #666;"><code>"英文" 中文</code></p>
                    <p style="margin: 8px 0; color: #666;">✅ 示例：</p>
                    <p style="margin: 4px 0; color: #666; padding-left: 20px;"><code>"hello" 你好</code></p>
                    <p style="margin: 4px 0; color: #666; padding-left: 20px;"><code>"good morning" 早上好</code></p>
                    
                    <p style="margin: 15px 0 12px 0; color: #333; font-weight: bold;">2. 特殊标注格式 (如添加不规则动词、复数等)</p>
                    <p style="margin: 8px 0; color: #666;"><code>"英文" (备注) 中文</code></p>
                    <p style="margin: 8px 0; color: #666;">✅ 示例：</p>
                    <p style="margin: 4px 0; color: #666; padding-left: 20px;"><code>"go" (went gone 不规则动词) 去</code></p>
                    <p style="margin: 4px 0; color: #666; padding-left: 20px;"><code>"apple" (apples复数) 苹果</code></p>
                    
                    <p style="margin: 15px 0 12px 0; color: #333; font-weight: bold;">⚠️ 注意事项</p>
                    <p style="margin: 4px 0; color: #666;">• 必须使用英文双引号 " 和英文括号 ( )</p>
                    <p style="margin: 4px 0; color: #666;">• 每行不超过200个字符</p>
                    <p style="margin: 4px 0; color: #666;">• 单次最多上传500个单词</p>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <textarea id="words-input" 
                          style="width: 100%; height: 300px; font-family: monospace; font-size: 16px; padding: 15px; border: 2px solid #ddd; border-radius: 10px;"
                          placeholder="输入单词列表，每行一个：
\"hello\" 你好
\"good morning\" 早上好
\"go\" (went gone 不规则动词) 去
\"apple\" (apples复数) 苹果"></textarea>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
                <button class="btn btn-blue" onclick="previewUploadWordsStable()" style="margin: 5px;">
                    👁️ 预览
                </button>
                <button class="btn" onclick="submitUploadWordsStable()" style="margin: 5px;">
                    📤 上传
                </button>
                <button class="btn" onclick="loadExampleWordsStable()" style="margin: 5px;">
                    📚 示例
                </button>
                <button class="btn btn-red" onclick="clearUploadForm()" style="margin: 5px;">
                    🗑️ 清空
                </button>
            </div>
            
            <div id="upload-preview-stable" style="display: none;">
                <!-- 预览内容 -->
            </div>
            
            <div id="upload-result-stable">
                <!-- 上传结果 -->
            </div>
        </div>
    `;
    
    // 直接调用loadGroupSelectorStable函数，不使用setTimeout
    await loadGroupSelectorStable();
}

async function loadGroupSelectorStable() {
    try {
        console.log('loadGroupSelectorStable called, selectedGroupId:', appState.selectedGroupId);
        
        const { data: groups, error } = await dbClient
            .from('groups')
            .select('*')
            .eq('teacher_id', appState.teacherId)
            .order('name');
        
        if (error) throw error;
        
        const container = document.getElementById('group-select-container');
        
        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <p style="color: #666;">还没有分组，请先创建分组</p>
                <button class="btn" onclick="showGroupManagementPage()" style="margin-top: 10px;">
                    去创建分组
                </button>
            `;
            return;
        }
        
        console.log('Groups loaded:', groups);
        
        // 检查appState.selectedGroupId是否存在且有效
        let selectedGroupId = appState.selectedGroupId;
        console.log('Original selectedGroupId:', selectedGroupId, 'Type:', typeof selectedGroupId);
        
        // 确保类型匹配，将selectedGroupId转换为字符串
        if (selectedGroupId !== null && selectedGroupId !== undefined) {
            selectedGroupId = String(selectedGroupId);
            console.log('Converted selectedGroupId:', selectedGroupId, 'Type:', typeof selectedGroupId);
        }
        
        // 检查是否有效
        const isSelectedGroupValid = groups.some(group => String(group.id) === selectedGroupId);
        
        console.log('isSelectedGroupValid:', isSelectedGroupValid, 'selectedGroupId:', selectedGroupId);
        
        // 如果selectedGroupId无效，则使用第一个分组的ID
        if (!isSelectedGroupValid) {
            selectedGroupId = String(groups[0].id);
            console.log('Using first group as default:', selectedGroupId);
        }
        
        let html = `<select id="selected-group" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">`;
        
        groups.forEach(group => {
            const groupIdStr = String(group.id);
            const isSelected = groupIdStr === selectedGroupId;
            console.log('Group:', group.name, 'ID:', group.id, 'ID Type:', typeof group.id, 'Selected:', isSelected);
            html += `<option value="${groupIdStr}" ${isSelected ? 'selected' : ''}>
                        ${group.name}
                     </option>`;
        });
        
        html += `</select>`;
        html += `<div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="btn" onclick="showGroupManagementPage()" style="padding: 8px 16px;">
                        管理分组
                    </button>
                    <button class="btn" onclick="createNewGroupFromUpload()" style="padding: 8px 16px;">
                        新建分组
                    </button>
                 </div>`;
        
        container.innerHTML = html;
        console.log('Group selector HTML generated');
        
    } catch (error) {
        console.error('加载分组选择器错误:', error);
        document.getElementById('group-select-container').innerHTML = 
            '<p style="color: red;">加载分组失败</p>';
    }
}

function createNewGroupFromUpload() {
    const groupName = prompt('请输入新分组名称：');
    if (!groupName) return;
    
    createNewGroupDirectly(groupName);
}

async function createNewGroupDirectly(groupName) {
    try {
        const { data: newGroup, error } = await dbClient
            .from('groups')
            .insert([{
                name: groupName,
                teacher_id: appState.teacherId
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        loadGroupSelectorStable();
        appState.selectedGroupId = newGroup.id;
        
        showAlert(`分组 "${groupName}" 创建成功`, 'success');
        
    } catch (error) {
        console.error('创建分组错误:', error);
        showAlert('创建分组失败', 'error');
    }
}

function previewUploadWordsStable() {
    const input = document.getElementById('words-input').value.trim();
    if (!input) {
        showAlert('请输入单词内容', 'error');
        return;
    }
    
    const lines = input.split('\n');
    const previewContainer = document.getElementById('upload-preview-stable');
    previewContainer.innerHTML = '';
    
    let validCount = 0;
    let duplicateCount = 0;
    const seenWords = new Set();
    let previewHTML = '';
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (trimmed.startsWith('#')) return;
        
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const english = parts.slice(0, -1).join(' ');
            const chinese = parts[parts.length - 1];
            const englishLower = english.toLowerCase();
            
            const isDuplicate = seenWords.has(englishLower);
            if (isDuplicate) {
                duplicateCount++;
            } else {
                seenWords.add(englishLower);
            }
            
            previewHTML += `
                <tr>
                    <td style="padding: 8px;">
                        <strong>${english}</strong>
                        ${isDuplicate ? '<span style="color: #F44336; margin-left: 10px;">(重复)</span>' : ''}
                    </td>
                    <td style="padding: 8px;">${chinese}</td>
                    <td style="padding: 8px; color: ${isDuplicate ? '#F44336' : '#4CAF50'};">
                        ${isDuplicate ? '❌ 重复' : '✅ 有效'}
                    </td>
                </tr>
            `;
            validCount++;
        }
    });
    
    if (validCount > 0) {
        previewContainer.innerHTML = `
            <h4>👁️ 预览（${validCount} 个单词，${duplicateCount} 个重复）</h4>
            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
                <table style="width: 100%;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 10px;">英文</th>
                            <th style="padding: 10px;">中文</th>
                            <th style="padding: 10px;">状态</th>
                        </tr>
                    </thead>
                    <tbody>${previewHTML}</tbody>
                </table>
            </div>
        `;
        previewContainer.style.display = 'block';
        
        let message = `找到 ${validCount} 个有效单词`;
        if (duplicateCount > 0) {
            message += `，其中 ${duplicateCount} 个重复（上传时会自动跳过）`;
        }
        showAlert(message, duplicateCount > 0 ? 'warning' : 'success');
    } else {
        showAlert('未找到有效单词，请检查格式', 'error');
    }
}

async function submitUploadWordsStable() {
    const input = document.getElementById('words-input').value.trim();
    if (!input) {
        showAlert('请输入单词内容', 'error');
        return;
    }
    
    const groupSelect = document.getElementById('selected-group');
    const selectedGroupId = groupSelect ? groupSelect.value : null;
    
    if (!selectedGroupId) {
        showAlert('请选择一个分组', 'error');
        return;
    }
    
    const lines = input.split('\n');
    const rawWords = [];
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('#')) return;
        
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const english = parts.slice(0, -1).join(' ');
            const chinese = parts[parts.length - 1];
            rawWords.push({
                english: english,
                chinese: chinese
            });
        }
    });
    
    if (rawWords.length === 0) {
        showAlert('没有有效单词可上传', 'error');
        return;
    }
    
    try {
        const { data: group, error: groupError } = await dbClient
            .from('groups')
            .select('name')
            .eq('id', selectedGroupId)
            .single();
        
        if (groupError) throw groupError;
        
        // 获取该分组中已存在的单词
        const { data: existingWords, error: fetchError } = await dbClient
            .from('words')
            .select('english')
            .eq('teacher_id', appState.teacherId)
            .eq('group_id', selectedGroupId);
        
        if (fetchError) throw fetchError;
        
        const existingWordSet = new Set();
        if (existingWords) {
            existingWords.forEach(word => {
                existingWordSet.add(word.english.toLowerCase());
            });
        }
        
        // 筛选出新的、不重复的单词
        const uniqueNewWords = [];
        const duplicateWords = [];
        const seenInThisBatch = new Set();
        
        rawWords.forEach(word => {
            const englishLower = word.english.toLowerCase();
            
            if (seenInThisBatch.has(englishLower)) {
                duplicateWords.push(word.english);
                return;
            }
            
            if (existingWordSet.has(englishLower)) {
                duplicateWords.push(word.english);
                return;
            }
            
            uniqueNewWords.push({
                teacher_id: appState.teacherId,
                english: word.english,
                chinese: word.chinese,
                group_id: selectedGroupId
            });
            
            seenInThisBatch.add(englishLower);
        });
        
        console.log(`总单词数: ${rawWords.length}`);
        console.log(`新单词数: ${uniqueNewWords.length}`);
        console.log(`重复单词数: ${duplicateWords.length}`);
        
        if (uniqueNewWords.length === 0) {
            if (duplicateWords.length > 0) {
                const message = `所有 ${duplicateWords.length} 个单词都已经存在于分组 "${group.name}" 中\n\n重复的单词：\n${duplicateWords.slice(0, 20).join(', ')}${duplicateWords.length > 20 ? `\n...等 ${duplicateWords.length} 个单词` : ''}`;
                showAlert(message, 'warning');
            }
            return;
        }
        
        // 分批上传
        const BATCH_SIZE = 100;
        let totalUploaded = 0;
        let uploadResult = '';
        
        for (let i = 0; i < uniqueNewWords.length; i += BATCH_SIZE) {
            const batch = uniqueNewWords.slice(i, i + BATCH_SIZE);
            const progress = Math.round(((i + batch.length) / uniqueNewWords.length) * 100);
            uploadResult = `正在上传... ${progress}% (${Math.min(i + batch.length, uniqueNewWords.length)}/${uniqueNewWords.length})`;
            
            document.getElementById('upload-result-stable').innerHTML = `
                <div class="message-box message-info">
                    <h4>📤 正在上传单词</h4>
                    <p>${uploadResult}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
            
            const { data: insertedWords, error: wordsError } = await dbClient
                .from('words')
                .insert(batch)
                .select('id, english, chinese');
            
            if (wordsError) {
                if (wordsError.code === '23505') {
                    console.warn('批量插入有重复，改为逐个插入...');
                    for (const word of batch) {
                        try {
                            const { error: singleError } = await dbClient
                                .from('words')
                                .insert(word);
                            if (!singleError || singleError.code === '23505') {
                                totalUploaded++;
                            }
                        } catch (err) {
                            console.error('单个插入错误:', err);
                        }
                    }
                } else {
                    throw wordsError;
                }
            } else {
                totalUploaded += insertedWords?.length || 0;
            }
        }
        
        // 获取分组学生并创建学习记录
        const { data: groupStudents, error: studentsError } = await dbClient
            .from('group_students')
            .select('student_id')
            .eq('group_id', selectedGroupId);
        
        let createdRecords = 0;
        if (groupStudents && groupStudents.length > 0 && totalUploaded > 0) {
            const { data: allNewWords, error: fetchNewError } = await dbClient
                .from('words')
                .select('id, english, chinese')
                .eq('teacher_id', appState.teacherId)
                .eq('group_id', selectedGroupId)
                .order('created_at', { ascending: false })
                .limit(totalUploaded);
            
            if (!fetchNewError && allNewWords) {
                console.log(`为 ${groupStudents.length} 名学生创建学习记录...`);
                
                for (const student of groupStudents) {
                    const studyRecords = allNewWords.map(word => ({
                        student_id: student.student_id,
                        word_id: word.id,
                        english: word.english,
                        chinese: word.chinese,
                        status: 'new',
                        review_count: 0,
                        group_id: selectedGroupId,
                        added_date: new Date().toISOString()
                    }));
                    
                    const { data: existingRecords } = await dbClient
                        .from('student_words')
                        .select('word_id')
                        .eq('student_id', student.student_id);
                    
                    const existingWordIds = new Set(existingRecords?.map(r => r.word_id) || []);
                    const newRecords = studyRecords.filter(record => !existingWordIds.has(record.word_id));
                    
                    if (newRecords.length > 0) {
                        const STUDY_BATCH_SIZE = 50;
                        for (let j = 0; j < newRecords.length; j += STUDY_BATCH_SIZE) {
                            const studyBatch = newRecords.slice(j, j + STUDY_BATCH_SIZE);
                            const { error: insertError } = await dbClient
                                .from('student_words')
                                .insert(studyBatch);
                            
                            if (!insertError) {
                                createdRecords += studyBatch.length;
                            }
                        }
                    }
                }
            }
        }
        
        // 显示最终结果
        let resultHtml = `
            <div class="message-box message-success">
                <h4>✅ 上传成功！</h4>
                <p>成功上传 <strong>${totalUploaded}</strong> 个新单词到分组 <strong>"${group.name}"</strong></p>
        `;
        
        if (duplicateWords.length > 0) {
            resultHtml += `
                <p>自动跳过了 <strong>${duplicateWords.length}</strong> 个重复单词</p>
                <details style="margin-top: 10px;">
                    <summary>查看重复单词列表（前20个）</summary>
                    <div style="max-height: 200px; overflow-y: auto; background: white; padding: 10px; border-radius: 5px; margin-top: 5px;">
                        ${duplicateWords.slice(0, 20).map(word => `<div>${word}</div>`).join('')}
                        ${duplicateWords.length > 20 ? `<div>...等 ${duplicateWords.length} 个重复单词</div>` : ''}
                    </div>
                </details>
            `;
        }
        
        if (createdRecords > 0) {
            resultHtml += `<p>已为 ${groupStudents?.length || 0} 名分组学生创建了 ${createdRecords} 条学习记录</p>`;
        }
        
        resultHtml += `
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    <strong>提示：</strong>学生下次登录时会自动看到这些单词，或点击"🔄 立即同步"按钮
                </p>
            </div>
        `;
        
        document.getElementById('upload-result-stable').innerHTML = resultHtml;
        
        document.getElementById('words-input').value = '';
        document.getElementById('upload-preview-stable').style.display = 'none';
        
        // 保持在上传单词界面，不跳转到仪表板
        
    } catch (error) {
        console.error('上传错误:', error);
        document.getElementById('upload-result-stable').innerHTML = `
            <div class="message-box message-error">
                <h4>❌ 上传失败</h4>
                <p>错误：${error.message}</p>
                ${error.code === '23505' ? '<p>原因：有重复的英文单词</p>' : ''}
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    建议：检查是否有重复单词，或分批上传
                </p>
            </div>
        `;
    }
}

function loadExampleWordsStable() {
    document.getElementById('words-input').value = `# 基础单词
hello 你好
world 世界
apple 苹果
book 书
computer 电脑

# 日常短语
"good morning" 早上好
"thank you" 谢谢你
"how are you" 你好吗
"good bye" 再见

# 学习相关
teacher 老师
student 学生
classroom 教室
homework 作业
exam 考试`;
    previewUploadWordsStable();
}

function clearUploadForm() {
    document.getElementById('words-input').value = '';
    document.getElementById('upload-preview-stable').style.display = 'none';
    document.getElementById('upload-result-stable').innerHTML = '';
}

// 显示单词管理页面
function showWordManagementPage() {
    showScreen('word-management-screen');
    loadWordManagementPage();
}

// 加载单词管理页面
async function loadWordManagementPage() {
    try {
        const content = document.getElementById('word-management-content');
        content.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto;">
                <h3 style="color: #333; margin-bottom: 30px;">📖 单词管理</h3>
                <div id="word-management-list">
                    <div style="text-align: center; padding: 40px;">
                        <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto;"></div>
                        <p style="color: #666; margin-top: 15px;">正在加载单词...</p>
                    </div>
                </div>
            </div>
        `;
        
        // 获取所有单词
        const { data: words, error } = await dbClient
            .from('words')
            .select('*')
            .eq('teacher_id', appState.teacherId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const wordList = document.getElementById('word-management-list');
        
        if (!words || words.length === 0) {
            wordList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3em; margin-bottom: 10px; color: #ddd;">📚</div>
                    <p style="color: #666;">还没有上传单词</p>
                    <button class="btn btn-blue" onclick="showUploadWordsPage()" style="margin-top: 20px;">
                        📤 上传单词
                    </button>
                </div>
            `;
            return;
        }
        
        // 生成单词列表
        let wordHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        `;
        
        words.forEach(word => {
            wordHTML += `
                <div style="background: white; border: 2px solid #4CAF50; border-radius: 10px; padding: 15px; transition: all 0.3s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <h5 style="margin: 0; color: #333; font-size: 1.1em;">${word.english}</h5>
                            <p style="color: #666; margin: 5px 0;">${word.chinese}</p>
                            <p style="color: #999; font-size: 12px;">分组: ${word.group_id || '未分组'}</p>
                        </div>
                        <button class="btn btn-red" style="padding: 6px 12px; font-size: 14px;" 
                                onclick="deleteWordFixed('${word.id}', '${word.english}')">
                            删除
                        </button>
                    </div>
                </div>
            `;
        });
        
        wordHTML += `
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-blue" onclick="showUploadWordsPage()" style="padding: 12px 30px; font-size: 16px;">
                    📤 上传更多单词
                </button>
            </div>
        `;
        
        wordList.innerHTML = wordHTML;
        
    } catch (error) {
        console.error('加载单词管理页面错误:', error);
        document.getElementById('word-management-content').innerHTML = 
            '<p style="color: red; text-align: center;">加载失败，请刷新重试</p>';
    }
}

// 删除单词
async function deleteWordFixed(wordId, wordEnglish) {
    if (!confirm(`确定要删除单词 "${wordEnglish}" 吗？\n\n⚠️ 删除后，所有学生的相关学习记录也会被删除！`)) {
        return;
    }
    
    try {
        showAlert(`正在删除单词 "${wordEnglish}"...`, 'warning');
        
        // 1. 先删除学生单词记录
        const { error: deleteStudentWordsError } = await dbClient
            .from('student_words')
            .delete()
            .eq('word_id', wordId);
        
        if (deleteStudentWordsError) throw deleteStudentWordsError;
        
        // 2. 删除单词本身
        const { error: deleteWordError } = await dbClient
            .from('words')
            .delete()
            .eq('id', wordId);
        
        if (deleteWordError) throw deleteWordError;
        
        showAlert(`✅ 单词 "${wordEnglish}" 已成功删除`, 'success');
        
        // 刷新单词列表
        loadWordManagementPage();
        
    } catch (error) {
        console.error('删除单词错误:', error);
        showAlert(`删除失败: ${error.message}`, 'error');
    }
}

