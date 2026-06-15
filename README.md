# 矿山安全监测系统

一个基于 Vue 3 + Node.js + MySQL 的矿山安全实时监测数据看板系统。

## 功能特性

### 实时监测
- 瓦斯浓度、粉尘浓度、温度、风速四大安全指标实时监测
- 每5秒自动刷新传感器数据
- WebSocket 实时数据推送
- 瓦斯超限自动标红闪烁警报
- 工作面状态实时显示（正常/异常）
- 右下角实时警报面板

### 数据统计
- **班组统计**: 早班(8-15点)、中班(16-23点)、夜班(0-7点)的超限次数与均值
- **按日统计**: 每日超限次数趋势与平均值变化
- **按月统计**: 月度超限次数与均值趋势
- **去年同期对比**: 今年与去年月度数据同比分析

## 项目结构

```
label-067/
├── backend/                 # 后端服务
│   ├── package.json
│   ├── server.js           # Express + WebSocket 服务主文件
│   ├── db.js               # MySQL 数据库连接
│   ├── csvService.js       # CSV 数据处理服务
│   └── csv_data/           # CSV 数据文件目录（运行时创建）
├── frontend/                # 前端应用
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router/
│       │   └── index.js
│       ├── utils/
│       │   └── request.js
│       └── views/
│           ├── Dashboard.vue      # 实时监测看板
│           └── Statistics.vue     # 数据统计分析
└── database/                # 数据库脚本
    └── init.sql             # 数据库初始化脚本
```

## 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- npm 或 yarn

## 快速开始

### 1. 数据库初始化

```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本
source d:/proje/label-067/database/init.sql
```

**注意**: 请根据实际情况修改 `backend/db.js` 中的数据库连接配置：
```javascript
const config = {
    host: 'localhost',
    user: 'root',
    password: '123456',  // 修改为你的 MySQL 密码
    database: 'mine_safety',
    port: 3306
};
```

### 2. 启动后端服务

```bash
cd backend
npm install
npm start
```

后端服务将在 `http://localhost:3000` 启动，同时 WebSocket 服务也在同一端口运行。

### 3. 生成模拟数据

启动后端服务后，通过以下 API 生成并导入历史模拟数据：

```bash
# 生成 CSV 模拟数据（生成过去7天约10万条数据）
curl -X POST http://localhost:3000/api/generate-csv

# 将 CSV 数据导入数据库
curl -X POST http://localhost:3000/api/import-csv
```

也可以直接在浏览器中访问或使用 Postman 调用。

### 4. 启动前端应用

```bash
cd frontend
npm install
npm run dev
```

前端应用将在 `http://localhost:5173` 启动。

## 传感器阈值配置

| 传感器类型 | 默认阈值 | 单位 | 说明 |
|-----------|---------|------|------|
| 瓦斯浓度 | 1.0000 | % | 超过1%触发警报 |
| 粉尘浓度 | 10.0000 | mg/m³ | 超过10mg/m³触发警报 |
| 温度 | 30.0000 | ℃ | 超过30℃触发警报 |
| 风速 | 0.2500 | m/s | 低于0.25m/s触发警报 |

可在 MySQL 的 `sensors` 表中修改各传感器阈值。

## API 接口说明

### 基础信息
- `GET /api/working-faces` - 获取所有工作面
- `GET /api/sensors` - 获取所有传感器
- `GET /api/realtime` - 获取实时传感器数据

### 统计分析
- `GET /api/statistics/shift` - 班组统计
  - 参数: `workingFaceId` (可选), `sensorType` (可选), `date` (可选，默认今天)
- `GET /api/statistics/daily` - 按日统计
  - 参数: `workingFaceId` (可选), `sensorType` (可选), `startDate`, `endDate`
- `GET /api/statistics/monthly` - 按月统计
  - 参数: `workingFaceId` (可选), `sensorType` (可选), `year` (可选)
- `GET /api/statistics/year-over-year` - 去年同期对比
  - 参数: `workingFaceId` (可选), `sensorType` (可选)

### 数据管理
- `POST /api/generate-csv` - 生成 CSV 模拟数据
- `POST /api/import-csv` - 导入 CSV 数据到数据库

## 技术栈

### 前端
- Vue 3 (Composition API)
- Vite
- Vue Router
- Element Plus
- ECharts 5
- Axios
- WebSocket

### 后端
- Node.js
- Express
- ws (WebSocket)
- mysql2
- csv-parser
- moment
- cors

## 数据模拟说明

系统使用 CSV 作为数据源模拟传感器上报：

1. **实时数据**: 每5秒通过 `readRealTimeData()` 函数生成随机模拟数据，通过 WebSocket 推送到前端，同时写入数据库
2. **历史数据**: 通过 `generateCsvData()` 生成过去7天（约10万条）的历史数据 CSV，通过 `importCsvToDb()` 导入 MySQL

如需接入真实传感器，只需修改 `csvService.js` 中的数据读取逻辑即可。
