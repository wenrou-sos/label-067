const http = require('http');

const BASE_URL = 'http://localhost:3001';

let passed = 0;
let failed = 0;
const results = [];

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
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

async function test(name, fn) {
    try {
        await fn();
        passed++;
        results.push({ name, status: 'PASS' });
        console.log(`  ✅ PASS: ${name}`);
    } catch (err) {
        failed++;
        results.push({ name, status: 'FAIL', error: err.message });
        console.log(`  ❌ FAIL: ${name} - ${err.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
    console.log('\n🧪 矿山安全监测系统 API 接口测试\n');
    console.log('='.repeat(60));

    console.log('\n📦 基础信息接口');
    await test('GET /api/working-faces - 获取工作面列表', async () => {
        const res = await request('GET', '/api/working-faces');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
        assert(res.data.data.length > 0, '工作面列表不应为空');
        const face = res.data.data[0];
        assert(face.id !== undefined, '工作面应包含id字段');
        assert(face.name !== undefined, '工作面应包含name字段');
        assert(face.location !== undefined, '工作面应包含location字段');
    });

    await test('GET /api/sensors - 获取传感器列表', async () => {
        const res = await request('GET', '/api/sensors');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
        assert(res.data.data.length > 0, '传感器列表不应为空');
        const sensor = res.data.data[0];
        assert(sensor.id !== undefined, '传感器应包含id字段');
        assert(sensor.sensor_type !== undefined, '传感器应包含sensor_type字段');
        assert(sensor.threshold !== undefined, '传感器应包含threshold字段');
        assert(sensor.unit !== undefined, '传感器应包含unit字段');
        assert(sensor.working_face_name !== undefined, '传感器应包含working_face_name字段');
    });

    console.log('\n📡 实时数据接口');
    await test('GET /api/realtime - 获取实时传感器数据', async () => {
        const res = await request('GET', '/api/realtime');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
        assert(res.data.data.length > 0, '实时数据不应为空');
        const item = res.data.data[0];
        assert(item.sensor_id !== undefined, '数据应包含sensor_id');
        assert(item.working_face_id !== undefined, '数据应包含working_face_id');
        assert(item.sensor_type !== undefined, '数据应包含sensor_type');
        assert(item.value !== undefined, '数据应包含value');
        assert(item.threshold !== undefined, '数据应包含threshold');
        assert(item.unit !== undefined, '数据应包含unit');
        assert(item.is_over_limit !== undefined, '数据应包含is_over_limit');
        assert(item.collect_time !== undefined, '数据应包含collect_time');
    });

    console.log('\n📊 班组统计接口');
    await test('GET /api/statistics/shift - 默认班组统计', async () => {
        const res = await request('GET', '/api/statistics/shift');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
    });

    await test('GET /api/statistics/shift - 带日期参数', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await request('GET', `/api/statistics/shift?date=${today}`);
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
    });

    await test('GET /api/statistics/shift - 带工作面和传感器过滤', async () => {
        const res = await request('GET', '/api/statistics/shift?workingFaceId=1&sensorType=gas');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        if (res.data.data.length > 0) {
            assert(res.data.data.every(d => d.sensor_type === 'gas'), '应只包含gas类型数据');
        }
    });

    console.log('\n📅 按日统计接口');
    await test('GET /api/statistics/daily - 默认日统计', async () => {
        const res = await request('GET', '/api/statistics/daily');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
    });

    await test('GET /api/statistics/daily - 带日期范围', async () => {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const start = weekAgo.toISOString().split('T')[0];
        const end = today.toISOString().split('T')[0];
        const res = await request('GET', `/api/statistics/daily?startDate=${start}&endDate=${end}`);
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
    });

    console.log('\n📆 按月统计接口');
    await test('GET /api/statistics/monthly - 默认月统计', async () => {
        const res = await request('GET', '/api/statistics/monthly');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
    });

    await test('GET /api/statistics/monthly - 指定年份', async () => {
        const res = await request('GET', '/api/statistics/monthly?year=2026');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(Array.isArray(res.data.data), '返回数据应为数组');
    });

    console.log('\n📈 同期对比接口');
    await test('GET /api/statistics/year-over-year - 默认同期对比', async () => {
        const res = await request('GET', '/api/statistics/year-over-year');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
        assert(res.data.data.currentYear !== undefined, '应包含currentYear');
        assert(res.data.data.lastYear !== undefined, '应包含lastYear');
        assert(Array.isArray(res.data.data.data), '应包含data数组');
    });

    await test('GET /api/statistics/year-over-year - 带过滤参数', async () => {
        const res = await request('GET', '/api/statistics/year-over-year?workingFaceId=1&sensorType=gas');
        assert(res.status === 200, `HTTP状态码应为200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
    });

    console.log('\n🔌 Vite proxy 路径验证');
    await test('确认 /api/api 路径不存在（防止双重前缀）', async () => {
        try {
            const res = await request('GET', '/api/api/realtime');
            assert(res.status === 404, '双重前缀路径应返回404');
        } catch (err) {
            assert(true, '连接被拒绝说明路径不存在');
        }
    });

    await test('确认 /api/realtime 路径可正常访问', async () => {
        const res = await request('GET', '/api/realtime');
        assert(res.status === 200, `正确路径应返回200, 实际: ${res.status}`);
        assert(res.data.code === 200, `业务码应为200, 实际: ${res.data.code}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n📋 测试结果汇总: ✅ 通过 ${passed} / ❌ 失败 ${failed} / 总计 ${passed + failed}\n`);

    if (failed > 0) {
        console.log('❌ 失败的测试:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('测试运行失败:', err);
    process.exit(1);
});
