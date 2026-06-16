const db = require('./db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, '../database/migrate_add_daily_reports.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        const statements = sql.split(';').filter(s => s.trim());
        
        for (const stmt of statements) {
            if (stmt.trim()) {
                await db.query(stmt);
            }
        }
        
        console.log('✅ daily_reports 表创建成功');
        
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
            ['daily_reports']
        );
        console.log('表存在验证:', rows[0].count > 0 ? '✅ 已存在' : '❌ 不存在');
    } catch (err) {
        console.error('迁移失败:', err);
    }
    process.exit(0);
}

migrate();
