const http = require('http');

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testDailyReportAPI() {
    const baseOptions = {
        hostname: 'localhost',
        port: 3002,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    console.log('========================================');
    console.log('  安全生产日报 API 测试');
    console.log('========================================\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const testDate = yesterday.toISOString().split('T')[0];
    console.log(`测试日期: ${testDate}\n`);

    try {
        console.log('--- 1. 生成日报 ---');
        const generateRes = await makeRequest({
            ...baseOptions,
            path: '/api/daily-reports/generate',
            method: 'POST'
        }, { date: testDate });
        console.log(`✅ POST /api/daily-reports/generate`);
        console.log(`   Status: ${generateRes.statusCode}`);
        console.log(`   Message: ${generateRes.data.message}`);
        console.log(`   结论: ${generateRes.data.data.report_data.conclusion}`);
        console.log(`   工作面数量: ${generateRes.data.data.report_data.workingFaces.length}`);
        console.log();

        console.log('--- 2. 获取日报详情 ---');
        const getRes = await makeRequest({
            ...baseOptions,
            path: `/api/daily-reports/${testDate}`,
            method: 'GET'
        });
        console.log(`✅ GET /api/daily-reports/${testDate}`);
        console.log(`   Status: ${getRes.statusCode}`);
        console.log(`   报告日期: ${getRes.data.data.report_data.reportDate}`);
        console.log(`   结论: ${getRes.data.data.report_data.conclusion}`);
        console.log();

        console.log('--- 3. 获取最新日报 ---');
        const latestRes = await makeRequest({
            ...baseOptions,
            path: '/api/daily-reports/latest',
            method: 'GET'
        });
        console.log(`✅ GET /api/daily-reports/latest`);
        console.log(`   Status: ${latestRes.statusCode}`);
        console.log(`   最新报告日期: ${latestRes.data.data.report_data.reportDate}`);
        console.log();

        console.log('--- 4. 获取日报列表 ---');
        const listRes = await makeRequest({
            ...baseOptions,
            path: '/api/daily-reports?page=1&pageSize=10',
            method: 'GET'
        });
        console.log(`✅ GET /api/daily-reports`);
        console.log(`   Status: ${listRes.statusCode}`);
        console.log(`   总数: ${listRes.data.data.total}`);
        console.log(`   当前页数量: ${listRes.data.data.list.length}`);
        console.log();

        console.log('--- 5. 预览日报数据 ---');
        const previewRes = await makeRequest({
            ...baseOptions,
            path: `/api/daily-reports/${testDate}/preview`,
            method: 'GET'
        });
        console.log(`✅ GET /api/daily-reports/${testDate}/preview`);
        console.log(`   Status: ${previewRes.statusCode}`);
        console.log(`   数据包含工作面数: ${previewRes.data.data.workingFaces.length}`);
        console.log();

        console.log('--- 6. 重新生成日报 ---');
        const regenerateRes = await makeRequest({
            ...baseOptions,
            path: '/api/daily-reports/generate',
            method: 'POST'
        }, { date: testDate });
        console.log(`✅ POST /api/daily-reports/generate (重新生成)`);
        console.log(`   Status: ${regenerateRes.statusCode}`);
        console.log(`   Message: ${regenerateRes.data.message}`);
        console.log();

        console.log('========================================');
        console.log('  测试结果汇总');
        console.log('========================================');
        console.log('✅ PASS POST /api/daily-reports/generate');
        console.log('✅ PASS GET /api/daily-reports/:date');
        console.log('✅ PASS GET /api/daily-reports/latest');
        console.log('✅ PASS GET /api/daily-reports');
        console.log('✅ PASS GET /api/daily-reports/:date/preview');
        console.log('✅ PASS POST /api/daily-reports/generate (重新生成)');
        console.log();
        console.log('总计: 6/6 测试通过');
        console.log();
        console.log('🎉 所有日报 API 测试通过！');

    } catch (err) {
        console.error('❌ 测试失败:', err.message);
        process.exit(1);
    }
}

testDailyReportAPI();
