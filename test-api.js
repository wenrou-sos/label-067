const http = require('http');

function testAPI(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    console.log(`✅ ${method} ${path}`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Response: ${JSON.stringify(result).substring(0, 200)}...`);
                    resolve({ status: res.statusCode, data: result, path, method });
                } catch (e) {
                    console.log(`✅ ${method} ${path}`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Response: ${body.substring(0, 200)}...`);
                    resolve({ status: res.statusCode, data: body, path, method });
                }
            });
        });

        req.on('error', (e) => {
            console.log(`❌ ${method} ${path}`);
            console.log(`   Error: ${e.message}`);
            reject(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runAllTests() {
    console.log('========================================');
    console.log('  矿山安全监测系统 - API 测试套件');
    console.log('========================================\n');

    const results = [];

    try {
        console.log('--- 基础信息接口测试 ---\n');
        results.push(await testAPI('/api/working-faces'));
        results.push(await testAPI('/api/sensors'));
        results.push(await testAPI('/api/realtime'));

        console.log('\n--- 统计分析接口测试 ---\n');
        results.push(await testAPI('/api/statistics/shift'));
        results.push(await testAPI('/api/statistics/daily'));
        results.push(await testAPI('/api/statistics/monthly'));
        results.push(await testAPI('/api/statistics/year-over-year'));

        console.log('\n--- 带参数的统计接口测试 ---\n');
        results.push(await testAPI('/api/statistics/shift?workingFaceId=1&sensorType=gas'));
        results.push(await testAPI('/api/statistics/daily?workingFaceId=1'));
        results.push(await testAPI('/api/statistics/monthly?sensorType=gas'));

        console.log('\n--- CSV 数据管理接口测试 ---\n');
        results.push(await testAPI('/api/generate-csv', 'POST'));

        console.log('\n========================================');
        console.log('  测试结果汇总');
        console.log('========================================\n');

        const passed = results.filter(r => r.status === 200).length;
        const total = results.length;

        results.forEach(r => {
            const status = r.status === 200 ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${r.method} ${r.path} -> ${r.status}`);
        });

        console.log(`\n总计: ${passed}/${total} 测试通过`);

        if (passed === total) {
            console.log('\n🎉 所有 API 测试通过！');
        } else {
            console.log(`\n⚠️  有 ${total - passed} 个测试失败，请检查！`);
        }

    } catch (err) {
        console.error('测试执行失败:', err);
    }

    process.exit(0);
}

runAllTests();
