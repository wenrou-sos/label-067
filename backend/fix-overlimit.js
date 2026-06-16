const db = require('./db');

async function fixOverLimit() {
    try {
        console.log('开始修复 is_over_limit 字段...');

        const [sensors] = await db.query('SELECT id, threshold FROM sensors');
        console.log('找到', sensors.length, '个传感器');

        let totalUpdated = 0;
        for (const sensor of sensors) {
            const threshold = parseFloat(sensor.threshold);
            
            const [result] = await db.query(
                `UPDATE sensor_data SET is_over_limit = CASE WHEN value > ? THEN 1 ELSE 0 END WHERE sensor_id = ? AND is_over_limit != CASE WHEN value > ? THEN 1 ELSE 0 END`,
                [threshold, sensor.id, threshold]
            );
            
            console.log(`  传感器 #${sensor.id} (阈值 ${threshold}): 更新 ${result.affectedRows} 条`);
            totalUpdated += result.affectedRows;
        }

        const [countResult] = await db.query('SELECT COUNT(*) as total FROM sensor_data');
        const [overLimitResult] = await db.query('SELECT COUNT(*) as count FROM sensor_data WHERE is_over_limit = 1');

        console.log('\n修复完成！');
        console.log('总数据量:', countResult[0].total);
        console.log('超限数据量:', overLimitResult[0].count);
        console.log('超限占比:', ((overLimitResult[0].count / countResult[0].total) * 100).toFixed(2) + '%');

        process.exit(0);
    } catch (err) {
        console.error('修复失败:', err);
        process.exit(1);
    }
}

fixOverLimit();
