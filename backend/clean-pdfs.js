const fs = require('fs');
const path = require('path');
const REPORT_DIR = path.join(__dirname, 'reports');

if (fs.existsSync(REPORT_DIR)) {
    const files = fs.readdirSync(REPORT_DIR);
    files.forEach(file => {
        if (file.endsWith('.pdf')) {
            const filePath = path.join(REPORT_DIR, file);
            fs.unlinkSync(filePath);
            console.log(`已删除: ${file}`);
        }
    });
    console.log('✅ 所有PDF文件已清理');
} else {
    console.log('报告目录不存在');
}
