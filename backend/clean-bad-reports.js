const db = require('./db');

async function cleanBadReports() {
    try {
        const [result] = await db.query('DELETE FROM daily_reports');
        console.log(`✅ 已清理 ${result.affectedRows} 条错误的日报数据`);
    } catch (err) {
        console.error('清理失败:', err);
    }
    process.exit(0);
}

cleanBadReports();
