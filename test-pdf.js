const http = require('http');
const fs = require('fs');
const path = require('path');

async function testPdfDownload() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const testDate = yesterday.toISOString().split('T')[0];

    console.log('========================================');
    console.log('  PDF 下载测试');
    console.log('========================================\n');
    console.log(`测试日期: ${testDate}\n`);

    const options = {
        hostname: 'localhost',
        port: 3002,
        path: `/api/daily-reports/${testDate}/pdf`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log(`✅ GET /api/daily-reports/${testDate}/pdf`);
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Content-Type: ${res.headers['content-type']}`);
            console.log(`   Content-Disposition: ${res.headers['content-disposition']}`);

            const filePath = path.join(__dirname, `test_download_${testDate}.pdf`);
            const fileStream = fs.createWriteStream(filePath);
            
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                const stats = fs.statSync(filePath);
                console.log(`   文件大小: ${stats.size} bytes`);
                console.log(`   保存路径: ${filePath}`);
                console.log();
                
                if (stats.size > 0) {
                    console.log('🎉 PDF下载成功！');
                    fs.unlinkSync(filePath);
                    resolve();
                } else {
                    reject(new Error('PDF文件为空'));
                }
            });

            res.on('error', reject);
        });

        req.on('error', reject);
        req.end();
    });
}

testPdfDownload().catch(err => {
    console.error('❌ 测试失败:', err.message);
    process.exit(1);
});
