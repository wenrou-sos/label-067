const db = require('./db');
const moment = require('moment');

async function generateHistoricalData(days = 14) {
    console.log(`开始生成 ${days} 天的历史数据...`);

    const [sensors] = await db.query('SELECT s.*, w.name as working_face_name FROM sensors s LEFT JOIN working_faces w ON s.working_face_id = w.id WHERE s.status = 1');
    const sensorMap = {};
    sensors.forEach(s => {
        sensorMap[s.id] = parseFloat(s.threshold);
    });

    for (let dayOffset = days; dayOffset >= 1; dayOffset--) {
        const dateStr = moment().subtract(dayOffset, 'days').format('YYYY-MM-DD');
        console.log(`生成 ${dateStr} 的数据...`);

        const [[existing]] = await db.query(
            'SELECT COUNT(*) as count FROM sensor_data WHERE DATE(collect_time) = ?',
            [dateStr]
        );

        if (existing.count > 0) {
            console.log(`  ${dateStr} 已有 ${existing.count} 条数据，跳过`);
            continue;
        }

        const batchSize = 1000;
        let totalInserted = 0;
        const values = [];

        for (let hour = 0; hour < 24; hour++) {
            for (let min = 0; min < 60; min += 5) {
                const collectTime = `${dateStr} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

                for (const sensor of sensors) {
                    let value;
                    const hourFactor = Math.sin((hour - 6) / 24 * Math.PI * 2) * 0.3 + 0.7;
                    const shiftNoise = (hour >= 8 && hour <= 16) ? 1.2 : (hour >= 0 && hour <= 7 ? 0.8 : 1.0);

                    switch (sensor.sensor_type) {
                        case 'gas':
                            value = (Math.random() * 0.8 + 0.2) * hourFactor * shiftNoise;
                            if (Math.random() < 0.08) value += 0.5;
                            value = Math.max(0.1, value).toFixed(4);
                            break;
                        case 'dust':
                            value = (Math.random() * 6 + 4) * hourFactor * shiftNoise;
                            if (Math.random() < 0.1) value += 4;
                            value = Math.max(2, value).toFixed(4);
                            break;
                        case 'temperature':
                            value = (Math.random() * 4 + 24) + hourFactor * 2;
                            if (Math.random() < 0.05) value += 3;
                            value = Math.max(20, value).toFixed(4);
                            break;
                        case 'wind':
                            value = (Math.random() * 0.25 + 0.15) * shiftNoise;
                            if (Math.random() < 0.12) value -= 0.1;
                            value = Math.max(0.05, value).toFixed(4);
                            break;
                        default:
                            value = (Math.random() * 10).toFixed(4);
                    }

                    const threshold = sensorMap[sensor.id] || 0;
                    const isOverLimit = parseFloat(value) > threshold ? 1 : 0;

                    values.push([
                        sensor.id,
                        sensor.working_face_id,
                        sensor.sensor_type,
                        parseFloat(value),
                        isOverLimit,
                        collectTime
                    ]);

                    if (values.length >= batchSize) {
                        await db.query(
                            'INSERT INTO sensor_data (sensor_id, working_face_id, sensor_type, value, is_over_limit, collect_time) VALUES ?',
                            [values]
                        );
                        totalInserted += values.length;
                        values.length = 0;
                    }
                }
            }
        }

        if (values.length > 0) {
            await db.query(
                'INSERT INTO sensor_data (sensor_id, working_face_id, sensor_type, value, is_over_limit, collect_time) VALUES ?',
                [values]
            );
            totalInserted += values.length;
        }

        console.log(`  ${dateStr} 插入 ${totalInserted} 条数据`);
    }

    const [[total]] = await db.query('SELECT COUNT(*) as count FROM sensor_data');
    console.log(`\n数据生成完成！sensor_data 表总计 ${total.count} 条记录`);

    const [dateStats] = await db.query(`
        SELECT DATE(collect_time) as date, COUNT(*) as count
        FROM sensor_data
        GROUP BY DATE(collect_time)
        ORDER BY date
    `);
    console.log('\n各日期数据量：');
    dateStats.forEach(d => {
        console.log(`  ${d.date}: ${d.count} 条`);
    });

    process.exit(0);
}

generateHistoricalData(14).catch(err => {
    console.error('生成数据失败:', err);
    process.exit(1);
});
