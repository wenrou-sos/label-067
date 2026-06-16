const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let chunks = '';
            res.on('data', c => chunks += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function generateAllReports() {
    const dates = [];
    for (let i = 2; i <= 15; i++) {
        dates.push('2026-06-' + String(i).padStart(2, '0'));
    }

    for (const d of dates) {
        try {
            const r = await post('http://localhost:3002/api/daily-reports/generate', { date: d });
            console.log(d + ': ' + (r.data.conclusion || r.data.message));
        } catch (e) {
            console.log(d + ': ERROR - ' + e.message);
        }
    }
    console.log('\n所有日报生成完毕！');
}

generateAllReports();
