const fs = require('fs');
const path = require('path');

// 读取原始HTML文件
const htmlFile = path.join(__dirname, 'index的副本.html');
const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// 提取JavaScript代码
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);

if (scriptMatch) {
    const jsCode = scriptMatch[1];
    const jsFile = path.join(__dirname, 'script.js');
    fs.writeFileSync(jsFile, jsCode);
    console.log('JavaScript code extracted successfully to script.js');
} else {
    console.error('No script tag found in the HTML file');
}
