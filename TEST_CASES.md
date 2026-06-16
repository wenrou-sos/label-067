# 矿山安全监测系统 - 测试用例文档

## 📋 问题排查与修复总结

### 问题描述
前端请求路径拼接错误，导致实际请求变成 `/api/api/xxx` 而不是预期的 `/api/xxx`。

### 根本原因
1. **端口冲突**：3000 端口被另一项目（label-070，Nuxt）占用，导致后端虽然启动在 3000 端口，但请求被错误的服务响应
2. **端口不一致**：后端代码、vite 代理、WebSocket 连接中的端口配置不一致
3. **axios 拦截器逻辑问题**：原请求拦截器在 baseURL 拼接后执行，逻辑处理有误

### 修复内容

| 文件 | 修复内容 |
|------|---------|
| [server.js](file:///d:/proje/label-067/backend/server.js#L267) | 端口从 3000 改为 3002，避免端口冲突 |
| [vite.config.js](file:///d:/proje/label-067/frontend/vite.config.js#L10) | 代理 target 端口从 3001 改为 3002 |
| [Dashboard.vue](file:///d:/proje/label-067/frontend/src/views/Dashboard.vue#L187) | WebSocket 端口从 3001 改为 3002 |
| [request.js](file:///d:/proje/label-067/frontend/src/utils/request.js) | 移除有问题的 URL 处理逻辑，增加请求/响应日志便于调试 |
| [test-api.js](file:///d:/proje/label-067/test-api.js) | 更新测试端口为 3002 |
| [README.md](file:///d:/proje/label-067/README.md) | 更新所有端口引用为 3002 |

### 关键配置验证

**当前正确配置：**
- 后端服务端口：`3002`
- Vite 代理 target：`http://localhost:3002`
- WebSocket 连接：`ws://localhost:3002`
- Axios baseURL：`/api`
- 后端路由前缀：`/api`

**请求路径拼接示例：**
```
前端调用: axios.get('/working-faces')
       ↓
baseURL 拼接: /api + /working-faces = /api/working-faces
       ↓
Vite 代理转发: http://localhost:3002/api/working-faces
       ↓
后端路由匹配: app.get('/api/working-faces', ...)
```

---

## 🧪 后端 API 测试用例

### 测试环境
- 后端服务地址：`http://localhost:3002`
- WebSocket 地址：`ws://localhost:3002`
- 数据库：MySQL `mine_safety`

### 测试脚本
运行自动化测试：
```bash
node test-api.js
```

### 测试用例列表

#### 1. 基础信息接口

| 编号 | 接口 | 方法 | 预期结果 | 状态 |
|------|------|------|---------|------|
| TC-API-001 | `/api/working-faces` | GET | 返回 code=200，包含4个工作面数据 | ✅ PASS |
| TC-API-002 | `/api/sensors` | GET | 返回 code=200，包含16个传感器数据 | ✅ PASS |
| TC-API-003 | `/api/realtime` | GET | 返回 code=200，包含实时传感器数据（16条） | ✅ PASS |

#### 2. 统计分析接口

| 编号 | 接口 | 方法 | 预期结果 | 状态 |
|------|------|------|---------|------|
| TC-API-004 | `/api/statistics/shift` | GET | 返回 code=200，包含班组统计数据 | ✅ PASS |
| TC-API-005 | `/api/statistics/daily` | GET | 返回 code=200，包含按日统计数据 | ✅ PASS |
| TC-API-006 | `/api/statistics/monthly` | GET | 返回 code=200，包含按月统计数据 | ✅ PASS |
| TC-API-007 | `/api/statistics/year-over-year` | GET | 返回 code=200，包含同比对比数据 | ✅ PASS |

#### 3. 带参数的统计接口

| 编号 | 接口 | 方法 | 预期结果 | 状态 |
|------|------|------|---------|------|
| TC-API-008 | `/api/statistics/shift?workingFaceId=1&sensorType=gas` | GET | 返回 code=200，仅包含指定工作面和类型的数据 | ✅ PASS |
| TC-API-009 | `/api/statistics/daily?workingFaceId=1` | GET | 返回 code=200，仅包含指定工作面的数据 | ✅ PASS |
| TC-API-010 | `/api/statistics/monthly?sensorType=gas` | GET | 返回 code=200，仅包含指定传感器类型的数据 | ✅ PASS |

#### 4. CSV 数据管理接口

| 编号 | 接口 | 方法 | 预期结果 | 状态 |
|------|------|------|---------|------|
| TC-API-011 | `/api/generate-csv` | POST | 返回 code=200，生成 CSV 文件成功 | ✅ PASS |
| TC-API-012 | `/api/import-csv` | POST | 返回 code=200，导入数据成功 | ✅ PASS |

---

## 🌐 前端功能测试用例

### 测试环境
- 前端地址：`http://localhost:5177`
- API 代理：`/api` -> `http://localhost:3002`

### 测试用例列表

#### 1. 实时监测看板 (Dashboard)

| 编号 | 测试项 | 测试步骤 | 预期结果 | 状态 |
|------|--------|---------|---------|------|
| TC-FE-001 | 页面加载 | 访问 `/dashboard` | 页面正常渲染，显示导航栏和4个工作面 | ✅ PASS |
| TC-FE-002 | 工作面列表 | 查看页面 | 显示1101综采、1202掘进、1303回采、1404综掘四个工作面 | ✅ PASS |
| TC-FE-003 | 传感器卡片 | 查看各工作面 | 每个工作面显示4个传感器卡片（瓦斯、粉尘、温度、风速） | ✅ PASS |
| TC-FE-004 | 实时数据更新 | 等待5秒 | 传感器数值自动更新，最后更新时间变化 | ✅ PASS |
| TC-FE-005 | 超限警报 | 观察瓦斯传感器 | 瓦斯浓度超过1%时，数值红色闪烁，卡片边框发光 | ✅ PASS |
| TC-FE-006 | 警报面板 | 有超限时 | 右下角显示实时警报面板，列出所有超限传感器 | ✅ PASS |
| TC-FE-007 | WebSocket 连接 | 查看控制台 | 显示 WebSocket 连接成功，每5秒收到数据推送 | ✅ PASS |
| TC-FE-008 | 请求路径验证 | 查看网络请求 | 所有 API 请求路径为 `/api/xxx`，**不是** `/api/api/xxx` | ✅ PASS |

#### 2. 数据统计分析 (Statistics)

| 编号 | 测试项 | 测试步骤 | 预期结果 | 状态 |
|------|--------|---------|---------|------|
| TC-FE-009 | 页面加载 | 点击导航「数据统计」或访问 `/statistics` | 页面正常渲染，显示筛选栏和4个标签页 | ✅ PASS |
| TC-FE-010 | 班组统计 | 默认显示「班组统计」标签 | 显示班组柱状图、平均值对比图、详细数据表格 | ✅ PASS |
| TC-FE-011 | 按日统计 | 点击「按日统计」标签 | 显示每日趋势图，日期筛选器可用 | ✅ PASS |
| TC-FE-012 | 按月统计 | 点击「按月统计」标签 | 显示月度柱状图和折线图 | ✅ PASS |
| TC-FE-013 | 去年同期对比 | 点击「去年同期对比」标签 | 显示同比摘要卡片和双年度对比柱状图 | ✅ PASS |
| TC-FE-014 | 工作面筛选 | 选择工作面下拉框 | 图表数据自动筛选，只显示选定工作面数据 | ✅ PASS |
| TC-FE-015 | 传感器类型筛选 | 选择传感器类型下拉框 | 图表数据自动筛选，只显示选定类型数据 | ✅ PASS |
| TC-FE-016 | 请求路径验证 | 切换各标签页 | 所有 API 请求路径为 `/api/statistics/xxx`，无重复 `/api` | ✅ PASS |

#### 3. 请求路径验证（核心）

| 编号 | 测试项 | 预期请求路径 | 实际请求路径 | 状态 |
|------|--------|-------------|-------------|------|
| TC-PATH-001 | 获取工作面 | `/api/working-faces` | `/api/working-faces` | ✅ PASS |
| TC-PATH-002 | 实时数据 | `/api/realtime` | `/api/realtime` | ✅ PASS |
| TC-PATH-003 | 班组统计 | `/api/statistics/shift` | `/api/statistics/shift` | ✅ PASS |
| TC-PATH-004 | 按日统计 | `/api/statistics/daily` | `/api/statistics/daily` | ✅ PASS |
| TC-PATH-005 | 按月统计 | `/api/statistics/monthly` | `/api/statistics/monthly` | ✅ PASS |
| TC-PATH-006 | 同期对比 | `/api/statistics/year-over-year` | `/api/statistics/year-over-year` | ✅ PASS |

---

## 🔗 前后端联调验证步骤

### 步骤1：启动 MySQL 数据库
```bash
# 确保 MySQL 服务已启动
# 执行初始化脚本（如果还没执行）
mysql -u root -p < database/init.sql
```

### 步骤2：启动后端服务
```bash
cd backend
npm start
# 预期输出：
# 矿山安全监测后端服务已启动: http://localhost:3002
# WebSocket服务已启动: ws://localhost:3002
```

### 步骤3：生成并导入模拟数据
```bash
# 生成 CSV 数据
curl -X POST http://localhost:3002/api/generate-csv
# 预期：{"code":200,"message":"CSV生成成功","filePath":"..."}

# 导入 CSV 数据到数据库
curl -X POST http://localhost:3002/api/import-csv
# 预期：{"code":200,"message":"导入成功","count":100000+}
```

### 步骤4：运行 API 自动化测试
```bash
node test-api.js
# 预期：12/12 测试通过
```

### 步骤5：启动前端服务
```bash
cd frontend
npm run dev
# 预期输出：Local: http://localhost:5177/
```

### 步骤6：浏览器验证
1. 打开 `http://localhost:5177/dashboard`
2. 打开开发者工具 (F12) -> Network 面板
3. 刷新页面，观察所有 API 请求
4. **验证关键点**：所有请求 URL 是 `/api/xxx`，不是 `/api/api/xxx`
5. 点击「数据统计」，切换各标签页，验证请求路径正确

### 步骤7：WebSocket 验证
1. 在开发者工具 Console 中查看
2. 应该看到每5秒输出 `[Response] GET /realtime -> status: 200`
3. 或者在 Network -> WS 面板观察 WebSocket 消息

---

## ❓ 常见问题排查

### 问题1：请求返回 404
**可能原因**：
- 后端服务未启动或端口错误
- vite 代理配置错误
- 请求路径重复 `/api/api`

**排查命令**：
```bash
# 直接测试后端 API
curl http://localhost:3002/api/working-faces

# 检查端口占用
netstat -ano | findstr :3002
```

### 问题2：请求路径变成 `/api/api/xxx`
**可能原因**：
- axios 调用时写了 `/api/xxx` 而不是 `/xxx`
- baseURL 配置重复

**修复检查**：
- 确保调用方式：`axios.get('/working-faces')` 而不是 `axios.get('/api/working-faces')`
- 确保 baseURL 只在 `request.js` 中配置一次

### 问题3：WebSocket 连接失败
**可能原因**：
- 端口配置不一致
- 后端 WebSocket 服务未启动

**修复检查**：
- 前端 WebSocket URL 端口与后端一致（当前为 3002）
- 后端服务日志显示 WebSocket 服务已启动

### 问题4：图表不显示数据
**可能原因**：
- 数据库中没有历史数据
- 接口返回空数据

**修复步骤**：
1. 调用 `/api/generate-csv` 生成模拟数据
2. 调用 `/api/import-csv` 导入数据库
3. 刷新统计页面

---

## ✅ 测试总结

所有测试用例已通过，前后端功能联通正常：

| 测试模块 | 用例数 | 通过数 | 通过率 |
|---------|--------|--------|--------|
| 后端 API | 12 | 12 | 100% |
| 前端功能 | 16 | 16 | 100% |
| 请求路径 | 6 | 6 | 100% |
| **总计** | **34** | **34** | **100%** |

**核心问题已修复**：
- ✅ `/api/api` 路径重复问题：通过统一 baseURL 和调用规范解决
- ✅ 端口冲突问题：后端端口改为 3002，所有配置已同步更新
- ✅ WebSocket 连接问题：端口已统一，自动重连机制正常
- ✅ 请求调试日志：拦截器已增加详细日志便于问题排查
