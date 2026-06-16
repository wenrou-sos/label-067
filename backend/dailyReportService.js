const db = require('./db');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const REPORT_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const getSensorLabel = (type) => {
    const labels = {
        gas: '瓦斯浓度',
        dust: '粉尘浓度',
        temperature: '温度',
        wind: '风速'
    };
    return labels[type] || type;
};

const getSensorUnit = (type) => {
    const units = {
        gas: '%',
        dust: 'mg/m³',
        temperature: '°C',
        wind: 'm/s'
    };
    return units[type] || '';
};

const calculateConclusion = (workingFacesData) => {
    let totalOverLimit = 0;
    let maxOverLimit = 0;
    let hasGasOverLimit = false;
    let gasOverLimitCount = 0;

    workingFacesData.forEach(face => {
        face.sensorStats.forEach(stat => {
            totalOverLimit += stat.overLimitCount;
            if (stat.overLimitCount > maxOverLimit) {
                maxOverLimit = stat.overLimitCount;
            }
            if (stat.sensorType === 'gas' && stat.overLimitCount > 0) {
                hasGasOverLimit = true;
                gasOverLimitCount += stat.overLimitCount;
            }
        });
    });

    if (gasOverLimitCount >= 80 || maxOverLimit >= 180 || totalOverLimit >= 750) {
        return '异常';
    } else if (gasOverLimitCount >= 30 || maxOverLimit >= 100 || totalOverLimit >= 400) {
        return '重点关注';
    } else {
        return '正常';
    }
};

const generateDailyReportData = async (targetDate) => {
    const date = targetDate || moment().subtract(1, 'days').format('YYYY-MM-DD');
    const lastWeekDate = moment(date).subtract(7, 'days').format('YYYY-MM-DD');

    const [workingFaces] = await db.query('SELECT * FROM working_faces WHERE status = 1');

    const workingFacesData = [];

    for (const face of workingFaces) {
        const [sensorStats] = await db.query(`
            SELECT 
                sd.sensor_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN sd.is_over_limit = 1 THEN 1 ELSE 0 END) as over_limit_count,
                AVG(sd.value) as avg_value,
                MAX(sd.value) as max_value,
                s.threshold,
                s.unit
            FROM sensor_data sd
            LEFT JOIN sensors s ON sd.sensor_id = s.id
            WHERE sd.working_face_id = ? 
              AND DATE(sd.collect_time) = ?
            GROUP BY sd.sensor_type, s.threshold, s.unit
            ORDER BY sd.sensor_type
        `, [face.id, date]);

        const [lastWeekStats] = await db.query(`
            SELECT 
                sd.sensor_type,
                SUM(CASE WHEN sd.is_over_limit = 1 THEN 1 ELSE 0 END) as over_limit_count,
                AVG(sd.value) as avg_value,
                MAX(sd.value) as max_value
            FROM sensor_data sd
            WHERE sd.working_face_id = ? 
              AND DATE(sd.collect_time) = ?
            GROUP BY sd.sensor_type
        `, [face.id, lastWeekDate]);

        const lastWeekMap = {};
        lastWeekStats.forEach(s => {
            lastWeekMap[s.sensor_type] = s;
        });

        const sensorStatsWithComparison = sensorStats.map(stat => {
            const lastWeek = lastWeekMap[stat.sensor_type] || {
                over_limit_count: 0,
                avg_value: 0,
                max_value: 0
            };

            const overLimitChange = lastWeek.over_limit_count === 0 
                ? (stat.over_limit_count > 0 ? 100 : 0)
                : ((stat.over_limit_count - lastWeek.over_limit_count) / lastWeek.over_limit_count * 100);

            const avgChange = lastWeek.avg_value === 0
                ? 0
                : ((stat.avg_value - lastWeek.avg_value) / lastWeek.avg_value * 100);

            const maxChange = lastWeek.max_value === 0
                ? 0
                : ((stat.max_value - lastWeek.max_value) / lastWeek.max_value * 100);

            return {
                sensorType: stat.sensor_type,
                sensorLabel: getSensorLabel(stat.sensor_type),
                totalCount: Number(stat.total_count),
                overLimitCount: Number(stat.over_limit_count),
                avgValue: Number(stat.avg_value),
                maxValue: Number(stat.max_value),
                threshold: Number(stat.threshold),
                unit: stat.unit || getSensorUnit(stat.sensor_type),
                lastWeek: {
                    overLimitCount: Number(lastWeek.over_limit_count),
                    avgValue: Number(lastWeek.avg_value),
                    maxValue: Number(lastWeek.max_value)
                },
                changes: {
                    overLimit: Number(overLimitChange.toFixed(1)),
                    avg: Number(avgChange.toFixed(1)),
                    max: Number(maxChange.toFixed(1))
                }
            };
        });

        workingFacesData.push({
            workingFaceId: face.id,
            workingFaceName: face.name,
            location: face.location,
            sensorStats: sensorStatsWithComparison
        });
    }

    const conclusion = calculateConclusion(workingFacesData);

    return {
        reportDate: date,
        lastWeekDate,
        generatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        workingFaces: workingFacesData,
        conclusion
    };
};

const saveReportToDb = async (reportData, isRegenerate = false) => {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    if (isRegenerate) {
        await db.query(`
            UPDATE daily_reports 
            SET report_data = ?, conclusion = ?, regenerated_at = ?
            WHERE report_date = ?
        `, [JSON.stringify(reportData), reportData.conclusion, now, reportData.reportDate]);
    } else {
        await db.query(`
            INSERT INTO daily_reports (report_date, report_data, conclusion, generated_at)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                report_data = VALUES(report_data),
                conclusion = VALUES(conclusion),
                regenerated_at = VALUES(generated_at)
        `, [reportData.reportDate, JSON.stringify(reportData), reportData.conclusion, now]);
    }
};

const getReportFromDb = async (date) => {
    const [rows] = await db.query(`
        SELECT * FROM daily_reports 
        WHERE report_date = ?
        ORDER BY generated_at DESC
        LIMIT 1
    `, [date]);

    if (rows.length > 0) {
        const report = { ...rows[0] };
        if (typeof report.report_data === 'string') {
            report.report_data = JSON.parse(report.report_data);
        }
        return report;
    }
    return null;
};

const getReportList = async (page = 1, pageSize = 30) => {
    const offset = (page - 1) * pageSize;

    const [[countResult]] = await db.query('SELECT COUNT(*) as total FROM daily_reports');

    const [rows] = await db.query(`
        SELECT id, report_date, conclusion, generated_at, regenerated_at
        FROM daily_reports
        ORDER BY report_date DESC
        LIMIT ? OFFSET ?
    `, [Number(pageSize), Number(offset)]);

    return {
        list: rows,
        total: countResult.total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(countResult.total / pageSize)
    };
};

const FONT_PATH = path.join(__dirname, 'fonts', 'simhei.ttf');

const getSimHeiFontBuffer = () => {
    return fs.readFileSync(FONT_PATH);
};

const generatePdf = async (reportData) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const fileName = `安全生产日报_${reportData.reportDate}.pdf`;
        const filePath = path.join(REPORT_DIR, fileName);
        const stream = fs.createWriteStream(filePath);

        const fontBuffer = getSimHeiFontBuffer();
        doc.registerFont('SimHei', fontBuffer);
        doc.pipe(stream);

        doc.font('SimHei').fontSize(20).fillColor('#1a3a5c').text('矿山安全生产日报', { align: 'center' });
        doc.moveDown(0.5);
        doc.font('SimHei').fontSize(12).fillColor('#666').text(`报告日期：${reportData.reportDate}`, { align: 'center' });
        doc.font('SimHei').fontSize(10).fillColor('#999').text(`生成时间：${reportData.generatedAt}`, { align: 'center' });
        doc.moveDown(1);

        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a3a5c').stroke();
        doc.moveDown(1);

        let conclusionColor = '#52c41a';
        if (reportData.conclusion === '重点关注') conclusionColor = '#faad14';
        if (reportData.conclusion === '异常') conclusionColor = '#ff4d4f';

        doc.font('SimHei').fontSize(14).fillColor('#333').text('安全评估结论：', { continued: true });
        doc.font('SimHei').fillColor(conclusionColor).fontSize(16).text(reportData.conclusion, { continued: true });
        doc.font('SimHei').fillColor('#666').fontSize(10).text('   （对比上周同期）');
        doc.moveDown(1.5);

        reportData.workingFaces.forEach((face, faceIndex) => {
            if (faceIndex > 0 && doc.y > 700) {
                doc.addPage();
            }

            doc.font('SimHei').fontSize(13).fillColor('#1a3a5c').text(`▌ ${face.workingFaceName}`);
            doc.font('SimHei').fontSize(9).fillColor('#999').text(`位置：${face.location}`);
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const colX = [50, 160, 230, 300, 370, 460];

            doc.font('SimHei').fontSize(9).fillColor('#fff');
            doc.rect(50, tableTop, 500, 25).fill('#1a3a5c');
            doc.font('SimHei').text('监测类型', colX[0] + 5, tableTop + 7);
            doc.font('SimHei').text('超限次数', colX[1] + 5, tableTop + 7);
            doc.font('SimHei').text('最高值', colX[2] + 5, tableTop + 7);
            doc.font('SimHei').text('平均值', colX[3] + 5, tableTop + 7);
            doc.font('SimHei').text('同比上周(超限)', colX[4] + 5, tableTop + 7);
            doc.font('SimHei').text('同比上周(均值)', colX[5] + 5, tableTop + 7);

            let currentY = tableTop + 25;

            face.sensorStats.forEach((stat) => {
                const isEven = face.sensorStats.indexOf(stat) % 2 === 0;
                if (isEven) {
                    doc.rect(50, currentY, 500, 22).fill('#f5f9ff');
                }

                doc.font('SimHei').fillColor('#333').fontSize(9);
                doc.text(stat.sensorLabel, colX[0] + 5, currentY + 6);

                const overLimitColor = stat.overLimitCount > 0 ? '#ff4d4f' : '#52c41a';
                doc.font('SimHei').fillColor(overLimitColor).text(stat.overLimitCount.toString(), colX[1] + 5, currentY + 6);

                doc.font('SimHei').fillColor('#333').text(`${stat.maxValue.toFixed(4)} ${stat.unit}`, colX[2] + 5, currentY + 6);
                doc.font('SimHei').text(`${stat.avgValue.toFixed(4)} ${stat.unit}`, colX[3] + 5, currentY + 6);

                const overLimitChangeColor = stat.changes.overLimit > 0 ? '#ff4d4f' : (stat.changes.overLimit < 0 ? '#52c41a' : '#666');
                doc.font('SimHei').fillColor(overLimitChangeColor).text(
                    `${stat.changes.overLimit > 0 ? '+' : ''}${stat.changes.overLimit}% (${stat.lastWeek.overLimitCount}->${stat.overLimitCount})`,
                    colX[4] + 5, currentY + 6
                );

                const avgChangeColor = stat.changes.avg > 0 ? '#ff4d4f' : (stat.changes.avg < 0 ? '#52c41a' : '#666');
                doc.font('SimHei').fillColor(avgChangeColor).text(
                    `${stat.changes.avg > 0 ? '+' : ''}${stat.changes.avg}%`,
                    colX[5] + 5, currentY + 6
                );

                currentY += 22;
            });

            doc.y = currentY + 10;
        });

        if (doc.y > 700) {
            doc.addPage();
        }

        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a3a5c').stroke();
        doc.moveDown(1);

        doc.font('SimHei').fontSize(11).fillColor('#333').text('结论说明：');
        doc.moveDown(0.5);

        let conclusionText = '';
        if (reportData.conclusion === '正常') {
            conclusionText = '各工作面监测数据均在安全范围内，安全生产状况良好。请继续保持日常巡检和监测工作。';
        } else if (reportData.conclusion === '重点关注') {
            conclusionText = '部分工作面存在超限情况，需要重点关注。建议加强相关区域的巡检频次，分析超限原因并采取相应措施。';
        } else {
            conclusionText = '存在严重超限情况或瓦斯超限，安全生产状况异常！请立即启动应急预案，组织相关人员排查隐患，确保生产安全。';
        }

        doc.font('SimHei').fontSize(10).fillColor('#666').text(conclusionText);

        doc.end();

        stream.on('finish', () => {
            resolve({ filePath, fileName });
        });

        stream.on('error', reject);
    });
};

const generateAndSaveReport = async (targetDate, isRegenerate = false) => {
    const reportData = await generateDailyReportData(targetDate);
    await saveReportToDb(reportData, isRegenerate);
    await generatePdf(reportData);
    return reportData;
};

const getLatestReport = async () => {
    const [rows] = await db.query(`
        SELECT * FROM daily_reports 
        ORDER BY report_date DESC
        LIMIT 1
    `);

    if (rows.length > 0) {
        const report = { ...rows[0] };
        if (typeof report.report_data === 'string') {
            report.report_data = JSON.parse(report.report_data);
        }
        return report;
    }
    return null;
};

const initAutoGenerate = () => {
    cron.schedule('0 0 1 * * *', async () => {
        console.log('📊 开始自动生成昨日安全生产日报...');
        try {
            const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
            await generateAndSaveReport(yesterday, false);
            console.log(`✅ 安全生产日报生成成功：${yesterday}`);
        } catch (err) {
            console.error('❌ 自动生成日报失败:', err);
        }
    });

    console.log('⏰ 日报自动生成任务已启动，每天凌晨1:00自动生成前一天的日报');
};

module.exports = {
    generateDailyReportData,
    saveReportToDb,
    getReportFromDb,
    getReportList,
    generatePdf,
    generateAndSaveReport,
    getLatestReport,
    initAutoGenerate,
    REPORT_DIR
};
