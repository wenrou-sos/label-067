const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const moment = require('moment');
const db = require('./db');
const { readRealTimeData, saveSensorData, generateCsvData, importCsvToDb, CSV_DIR } = require('./csvService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.get('/api/working-faces', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM working_faces');
        res.json({ code: 200, data: rows });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/sensors', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT s.*, w.name as working_face_name FROM sensors s LEFT JOIN working_faces w ON s.working_face_id = w.id');
        res.json({ code: 200, data: rows });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/realtime', async (req, res) => {
    try {
        const data = await readRealTimeData();
        res.json({ code: 200, data });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/statistics/shift', async (req, res) => {
    try {
        const { workingFaceId, sensorType, date } = req.query;
        let query = `
            SELECT 
                CASE 
                    WHEN HOUR(collect_time) BETWEEN 0 AND 7 THEN '夜班'
                    WHEN HOUR(collect_time) BETWEEN 8 AND 15 THEN '早班'
                    ELSE '中班'
                END as shift_name,
                sensor_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN is_over_limit = 1 THEN 1 ELSE 0 END) as over_limit_count,
                AVG(value) as avg_value,
                MAX(value) as max_value,
                MIN(value) as min_value
            FROM sensor_data
            WHERE 1=1
        `;
        const params = [];
        
        if (date) {
            query += ' AND DATE(collect_time) = ?';
            params.push(date);
        } else {
            query += ' AND DATE(collect_time) = CURDATE()';
        }
        
        if (workingFaceId) {
            query += ' AND working_face_id = ?';
            params.push(workingFaceId);
        }
        
        if (sensorType) {
            query += ' AND sensor_type = ?';
            params.push(sensorType);
        }
        
        query += ' GROUP BY shift_name, sensor_type ORDER BY shift_name';
        
        const [rows] = await db.query(query, params);
        res.json({ code: 200, data: rows });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/statistics/daily', async (req, res) => {
    try {
        const { workingFaceId, sensorType, startDate, endDate } = req.query;
        let query = `
            SELECT 
                DATE(collect_time) as date,
                sensor_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN is_over_limit = 1 THEN 1 ELSE 0 END) as over_limit_count,
                AVG(value) as avg_value,
                MAX(value) as max_value,
                MIN(value) as min_value
            FROM sensor_data
            WHERE 1=1
        `;
        const params = [];
        
        if (startDate) {
            query += ' AND DATE(collect_time) >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND DATE(collect_time) <= ?';
            params.push(endDate);
        }
        
        if (workingFaceId) {
            query += ' AND working_face_id = ?';
            params.push(workingFaceId);
        }
        
        if (sensorType) {
            query += ' AND sensor_type = ?';
            params.push(sensorType);
        }
        
        query += ' GROUP BY DATE(collect_time), sensor_type ORDER BY date';
        
        const [rows] = await db.query(query, params);
        res.json({ code: 200, data: rows });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/statistics/monthly', async (req, res) => {
    try {
        const { workingFaceId, sensorType, year } = req.query;
        let query = `
            SELECT 
                DATE_FORMAT(collect_time, '%Y-%m') as month,
                sensor_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN is_over_limit = 1 THEN 1 ELSE 0 END) as over_limit_count,
                AVG(value) as avg_value,
                MAX(value) as max_value,
                MIN(value) as min_value
            FROM sensor_data
            WHERE 1=1
        `;
        const params = [];
        
        if (year) {
            query += ' AND YEAR(collect_time) = ?';
            params.push(year);
        }
        
        if (workingFaceId) {
            query += ' AND working_face_id = ?';
            params.push(workingFaceId);
        }
        
        if (sensorType) {
            query += ' AND sensor_type = ?';
            params.push(sensorType);
        }
        
        query += ' GROUP BY DATE_FORMAT(collect_time, \'%Y-%m\'), sensor_type ORDER BY month';
        
        const [rows] = await db.query(query, params);
        res.json({ code: 200, data: rows });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/statistics/year-over-year', async (req, res) => {
    try {
        const { workingFaceId, sensorType } = req.query;
        const currentYear = moment().year();
        const lastYear = currentYear - 1;
        
        let query = `
            SELECT 
                YEAR(collect_time) as year,
                MONTH(collect_time) as month,
                sensor_type,
                SUM(CASE WHEN is_over_limit = 1 THEN 1 ELSE 0 END) as over_limit_count,
                AVG(value) as avg_value
            FROM sensor_data
            WHERE YEAR(collect_time) IN (?, ?)
        `;
        const params = [lastYear, currentYear];
        
        if (workingFaceId) {
            query += ' AND working_face_id = ?';
            params.push(workingFaceId);
        }
        
        if (sensorType) {
            query += ' AND sensor_type = ?';
            params.push(sensorType);
        }
        
        query += ' GROUP BY YEAR(collect_time), MONTH(collect_time), sensor_type ORDER BY year, month';
        
        const [rows] = await db.query(query, params);
        
        const result = {
            currentYear,
            lastYear,
            data: rows
        };
        
        res.json({ code: 200, data: result });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.post('/api/generate-csv', async (req, res) => {
    try {
        const filePath = await generateCsvData();
        res.json({ code: 200, message: 'CSV生成成功', filePath });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

app.post('/api/import-csv', async (req, res) => {
    try {
        const path = require('path');
        const filePath = req.body.filePath || path.join(CSV_DIR, 'sensor_data.csv');
        const count = await importCsvToDb(filePath);
        res.json({ code: 200, message: '导入成功', count });
    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
});

async function saveAlarmRecords(sensorDataList) {
    const overLimitList = sensorDataList.filter(s => s.is_over_limit === 1);
    if (overLimitList.length === 0) return 0;

    const values = overLimitList.map(s => [
        s.sensor_id,
        s.working_face_id,
        s.sensor_type,
        s.sensor_name,
        s.working_face_name,
        s.value,
        s.threshold,
        s.unit,
        s.collect_time,
        0
    ]);

    try {
        const [result] = await db.query(
            `INSERT INTO alarm_records 
            (sensor_id, working_face_id, sensor_type, sensor_name, working_face_name, alarm_value, threshold_value, unit, alarm_time, status) 
            VALUES ?`,
            [values]
        );
        console.log(`✅ 新增 ${result.affectedRows} 条报警记录`);
        return result.affectedRows;
    } catch (err) {
        console.error('保存报警记录失败:', err);
        return 0;
    }
}

app.get('/api/alarms', async (req, res) => {
    try {
        const { workingFaceId, sensorType, status, startTime, endTime, page = 1, pageSize = 20 } = req.query;
        
        let countQuery = 'SELECT COUNT(*) as total FROM alarm_records WHERE 1=1';
        let dataQuery = 'SELECT * FROM alarm_records WHERE 1=1';
        const params = [];
        const countParams = [];

        if (workingFaceId) {
            dataQuery += ' AND working_face_id = ?';
            countQuery += ' AND working_face_id = ?';
            params.push(workingFaceId);
            countParams.push(workingFaceId);
        }

        if (sensorType) {
            dataQuery += ' AND sensor_type = ?';
            countQuery += ' AND sensor_type = ?';
            params.push(sensorType);
            countParams.push(sensorType);
        }

        if (status !== undefined && status !== '') {
            dataQuery += ' AND status = ?';
            countQuery += ' AND status = ?';
            params.push(Number(status));
            countParams.push(Number(status));
        }

        if (startTime) {
            dataQuery += ' AND alarm_time >= ?';
            countQuery += ' AND alarm_time >= ?';
            params.push(startTime);
            countParams.push(startTime);
        }

        if (endTime) {
            dataQuery += ' AND alarm_time <= ?';
            countQuery += ' AND alarm_time <= ?';
            params.push(endTime);
            countParams.push(endTime);
        }

        dataQuery += ' ORDER BY alarm_time DESC LIMIT ? OFFSET ?';
        const offset = (Number(page) - 1) * Number(pageSize);
        params.push(Number(pageSize), offset);

        const [[countResult]] = await db.query(countQuery, countParams);
        const [rows] = await db.query(dataQuery, params);

        res.json({
            code: 200,
            data: {
                list: rows,
                total: countResult.total,
                page: Number(page),
                pageSize: Number(pageSize),
                totalPages: Math.ceil(countResult.total / Number(pageSize))
            }
        });
    } catch (err) {
        console.error('查询报警记录失败:', err);
        res.json({ code: 500, message: err.message });
    }
});

app.get('/api/alarms/summary', async (req, res) => {
    try {
        const [[unhandledCount]] = await db.query('SELECT COUNT(*) as count FROM alarm_records WHERE status = 0');
        const [[todayCount]] = await db.query('SELECT COUNT(*) as count FROM alarm_records WHERE DATE(alarm_time) = CURDATE()');
        const [[totalCount]] = await db.query('SELECT COUNT(*) as count FROM alarm_records');
        const [typeStats] = await db.query(`
            SELECT sensor_type, COUNT(*) as count, SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as unhandled_count
            FROM alarm_records 
            GROUP BY sensor_type 
            ORDER BY count DESC
        `);

        res.json({
            code: 200,
            data: {
                unhandled: unhandledCount.count,
                today: todayCount.count,
                total: totalCount.count,
                typeStats
            }
        });
    } catch (err) {
        console.error('查询报警汇总失败:', err);
        res.json({ code: 500, message: err.message });
    }
});

app.put('/api/alarms/:id/handle', async (req, res) => {
    try {
        const { id } = req.params;
        const { handleBy, handleRemark } = req.body;
        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        const [result] = await db.query(
            'UPDATE alarm_records SET status = 1, handle_time = ?, handle_by = ?, handle_remark = ? WHERE id = ?',
            [now, handleBy || '系统管理员', handleRemark || '已处理', id]
        );

        if (result.affectedRows === 0) {
            return res.json({ code: 404, message: '报警记录不存在' });
        }

        res.json({ code: 200, message: '处理成功' });
    } catch (err) {
        console.error('处理报警记录失败:', err);
        res.json({ code: 500, message: err.message });
    }
});

app.put('/api/alarms/batch-handle', async (req, res) => {
    try {
        const { ids, handleBy, handleRemark } = req.body;
        if (!ids || ids.length === 0) {
            return res.json({ code: 400, message: '请选择要处理的报警记录' });
        }

        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        const placeholders = ids.map(() => '?').join(',');

        const [result] = await db.query(
            `UPDATE alarm_records SET status = 1, handle_time = ?, handle_by = ?, handle_remark = ? WHERE id IN (${placeholders})`,
            [now, handleBy || '系统管理员', handleRemark || '批量已处理', ...ids]
        );

        res.json({ code: 200, message: `批量处理成功 ${result.affectedRows} 条记录`, affectedRows: result.affectedRows });
    } catch (err) {
        console.error('批量处理报警记录失败:', err);
        res.json({ code: 500, message: err.message });
    }
});

wss.on('connection', (ws) => {
    console.log('WebSocket客户端已连接');
    
    ws.on('close', () => {
        console.log('WebSocket客户端已断开');
    });
});

setInterval(async () => {
    try {
        const data = await readRealTimeData();
        await saveSensorData(data);
        const alarmCount = await saveAlarmRecords(data);

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'sensor_data',
                    data,
                    newAlarmCount: alarmCount,
                    timestamp: new Date().toISOString()
                }));
            }
        });
    } catch (err) {
        console.error('实时数据推送错误:', err);
    }
}, 5000);

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`矿山安全监测后端服务已启动: http://localhost:${PORT}`);
    console.log(`WebSocket服务已启动: ws://localhost:${PORT}`);
});
