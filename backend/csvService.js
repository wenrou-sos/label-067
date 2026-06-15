const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./db');
const moment = require('moment');

const CSV_DIR = path.join(__dirname, 'csv_data');

if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
}

async function generateCsvData() {
    const [sensors] = await db.query('SELECT * FROM sensors');
    const [workingFaces] = await db.query('SELECT * FROM working_faces');
    
    let csvLines = ['sensor_id,working_face_id,sensor_type,value,collect_time\n'];
    
    for (let min = 0; min < 10080; min++) {
        const collectTime = moment().subtract(10080 - min, 'minutes').format('YYYY-MM-DD HH:mm:ss');
        
        for (const sensor of sensors) {
            let value;
            switch (sensor.sensor_type) {
                case 'gas':
                    value = (Math.random() * 1.2 + 0.1).toFixed(4);
                    break;
                case 'dust':
                    value = (Math.random() * 12 + 2).toFixed(4);
                    break;
                case 'temperature':
                    value = (Math.random() * 8 + 22).toFixed(4);
                    break;
                case 'wind':
                    value = (Math.random() * 0.4 + 0.1).toFixed(4);
                    break;
                default:
                    value = (Math.random() * 10).toFixed(4);
            }
            
            csvLines.push(`${sensor.id},${sensor.working_face_id},${sensor.sensor_type},${value},${collectTime}\n`);
        }
    }
    
    const filePath = path.join(CSV_DIR, 'sensor_data.csv');
    fs.writeFileSync(filePath, csvLines.join(''));
    console.log('CSV数据生成完成:', filePath);
    return filePath;
}

async function readRealTimeData() {
    const [sensors] = await db.query('SELECT s.*, w.name as working_face_name FROM sensors s LEFT JOIN working_faces w ON s.working_face_id = w.id WHERE s.status = 1');
    
    const realTimeData = [];
    const collectTime = moment().format('YYYY-MM-DD HH:mm:ss');
    
    for (const sensor of sensors) {
        let value;
        switch (sensor.sensor_type) {
            case 'gas':
                value = (Math.random() * 1.2 + 0.1).toFixed(4);
                break;
            case 'dust':
                value = (Math.random() * 12 + 2).toFixed(4);
                break;
            case 'temperature':
                value = (Math.random() * 8 + 22).toFixed(4);
                break;
            case 'wind':
                value = (Math.random() * 0.4 + 0.1).toFixed(4);
                break;
            default:
                value = (Math.random() * 10).toFixed(4);
        }
        
        const isOverLimit = parseFloat(value) > parseFloat(sensor.threshold) ? 1 : 0;
        
        realTimeData.push({
            sensor_id: sensor.id,
            working_face_id: sensor.working_face_id,
            working_face_name: sensor.working_face_name,
            sensor_type: sensor.sensor_type,
            sensor_name: sensor.sensor_name,
            value: parseFloat(value),
            threshold: parseFloat(sensor.threshold),
            unit: sensor.unit,
            is_over_limit: isOverLimit,
            collect_time: collectTime
        });
    }
    
    return realTimeData;
}

async function saveSensorData(data) {
    const values = data.map(d => [
        d.sensor_id,
        d.working_face_id,
        d.sensor_type,
        d.value,
        d.is_over_limit,
        d.collect_time
    ]);
    
    await db.query(
        'INSERT INTO sensor_data (sensor_id, working_face_id, sensor_type, value, is_over_limit, collect_time) VALUES ?',
        [values]
    );
}

async function importCsvToDb(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', async () => {
                try {
                    const batchSize = 1000;
                    for (let i = 0; i < results.length; i += batchSize) {
                        const batch = results.slice(i, i + batchSize);
                        const values = batch.map(r => [
                            r.sensor_id,
                            r.working_face_id,
                            r.sensor_type,
                            r.value,
                            0,
                            r.collect_time
                        ]);
                        
                        await db.query(
                            'INSERT IGNORE INTO sensor_data (sensor_id, working_face_id, sensor_type, value, is_over_limit, collect_time) VALUES ?',
                            [values]
                        );
                    }
                    console.log('CSV数据导入完成，共', results.length, '条记录');
                    resolve(results.length);
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', reject);
    });
}

module.exports = {
    generateCsvData,
    readRealTimeData,
    saveSensorData,
    importCsvToDb,
    CSV_DIR
};
