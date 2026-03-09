// ========== 工具函数 ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

// ========== 新增：加载动画控制 ==========
function showLoading(message = '正在加载', details = '') {
    connectionState.isLoading = true;
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
        loadingEl.style.display = 'flex';
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-details').textContent = details;
    }
}

function hideLoading() {
    connectionState.isLoading = false;
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function updateLoadingMessage(message) {
    const messageEl = document.getElementById('loading-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
}

// ========== 修改：showMessage函数（增强版） ==========
function showMessage(elementId, message, type = 'info', duration = 0) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.textContent = message;
    el.className = `message-box message-${type}`;
    el.style.display = 'block';
    
    // 自动隐藏
    if (duration > 0) {
        setTimeout(() => {
            el.style.display = 'none';
        }, duration);
    }
}

// ========== 修改：showAlert函数（增强版） ==========
function showAlert(message, type = 'info', duration = 3000) {
    const alertBox = document.createElement('div');
    alertBox.className = `message-box message-${type}`;
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20px';
    alertBox.style.left = '50%';
    alertBox.style.transform = 'translateX(-50%)';
    alertBox.style.zIndex = '1000';
    alertBox.style.maxWidth = '500px';
    alertBox.style.animation = 'slideDown 0.3s ease-out';
    alertBox.textContent = message;

    // 添加关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        position: absolute;
        right: 10px;
        top: 10px;
        cursor: pointer;
        font-size: 20px;
        color: inherit;
        opacity: 0.7;
    `;
    closeBtn.onclick = () => alertBox.remove();
    
    alertBox.appendChild(closeBtn);
    document.body.appendChild(alertBox);
    
    // 自动移除
    if (duration > 0) {
        setTimeout(() => {
            if (alertBox.parentNode) {
                alertBox.style.opacity = '0';
                alertBox.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    if (alertBox.parentNode) {
                        alertBox.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    return alertBox;
}

// ========== 智能字体大小调整 ==========
function getFontSizeClass(text) {
    const length = text.length;
    if (length <= 10) return 'font-size-xl';
    if (length <= 15) return 'font-size-lg';
    if (length <= 20) return 'font-size-md';
    if (length <= 25) return 'font-size-sm';
    return 'font-size-xs';
}

// ========== 格式化单词显示 ==========
function formatWordDisplay(word) {
    // 检查是否包含括号（支持英文和中文括号）
    // 支持带引号的单词格式："go" (went gone 不规则动词)
    const match = word.match(/^"?([^"]+)"?\s*[(（]([^)）]+)[)）]$/);
    if (match) {
        // 分离括号外和括号内的内容
        const mainPart = match[1].trim();
        const subPart = match[2].trim();
        return `<div style="display: block; margin-bottom: 8px; font-size: 1.1em;">${mainPart}</div><div style="display: block; font-size: 0.7em; color: #666;">(${subPart})</div>`;
    }
    return word;
}

// 添加天数辅助函数
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// 格式化日期
function formatDate(date) {
    return date.toLocaleDateString('zh-CN');
}

// 获取学习模式文本
function getStudyModeText(mode) {
    switch (mode) {
        case 0:
            return '标准模式';
        case 1:
            return '复习模式';
        case 2:
            return '额外新词';
        default:
            return '未知模式';
    }
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case 'new':
            return '未开始';
        case 'learning':
            return '学习中';
        case 'mastered':
            return '已掌握';
        default:
            return status;
    }
}