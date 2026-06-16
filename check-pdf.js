const http = require('http');
const fs = require('fs');
const path = require('path');

async function checkPdf() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const testDate = yesterday.toISOString().split('T')[0];

    const options = {
        hostname: 'localhost',
        port: 3002,
        path: `/api/daily-reports/${testDate}/pdf`,
        method: 'GET'
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log('Status:', res.statusCode);
            console.log('Headers:', JSON.stringify(res.headers, null, 2));
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk.toString('utf8');
            });
            
            res.on('end', () => {
                console.log('Body:', data);
                resolve();
            });
        });

        req.on('error', reject);
        req.end();
    });
}

checkPdf().catch(console.error);
