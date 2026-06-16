const http = require('http');

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function test() {
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/daily-reports/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const testDate = yesterday.toISOString().split('T')[0];

    console.log('测试日期:', testDate);
    console.log();

    const res = await makeRequest(options, { date: testDate });
    console.log('状态码:', res.statusCode);
    console.log('响应头:', JSON.stringify(res.headers, null, 2));
    console.log('响应体:', res.body);
    console.log();
    
    try {
        const parsed = JSON.parse(res.body);
        console.log('解析后的数据:', JSON.stringify(parsed, null, 2));
        if (parsed.data && parsed.data.report_data) {
            console.log('report_data类型:', typeof parsed.data.report_data);
            console.log('report_data.conclusion:', parsed.data.report_data.conclusion);
        }
    } catch (e) {
        console.log('解析错误:', e.message);
    }
}

test().catch(console.error);
