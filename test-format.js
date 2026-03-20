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

// 测试用例
console.log('Test 1:', formatWordDisplay('go (went gone 不规则动词)'));
console.log('Test 2:', formatWordDisplay('apple (apples复数)'));
console.log('Test 3:', formatWordDisplay('hello'));
console.log('Test 4:', formatWordDisplay('test (with) (multiple) (parentheses)'));
console.log('Test 5:', formatWordDisplay('你好（世界）'));
console.log('Test 6:', formatWordDisplay('"go" (went gone 不规则动词)'));
console.log('Test 7:', formatWordDisplay('"apple" (apples复数)'));
console.log('Test 8:', formatWordDisplay('"hello world" (短语)'));
