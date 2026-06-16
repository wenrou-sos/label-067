<template>
    <div class="alarms-page">
        <div class="page-header">
            <h2 class="page-title">
                <span class="title-icon">🚨</span>
                报警记录查询
                <span class="badge-unhandled" v-if="summary.unhandled > 0">
                    {{ summary.unhandled }} 条未处理
                </span>
            </h2>
            <div class="header-stats">
                <div class="stat-item danger">
                    <span class="stat-icon">⚠</span>
                    <span class="stat-label">未处理</span>
                    <span class="stat-value">{{ summary.unhandled }}</span>
                </div>
                <div class="stat-item warning">
                    <span class="stat-icon">📅</span>
                    <span class="stat-label">今日新增</span>
                    <span class="stat-value">{{ summary.today }}</span>
                </div>
                <div class="stat-item info">
                    <span class="stat-icon">📊</span>
                    <span class="stat-label">历史总计</span>
                    <span class="stat-value">{{ summary.total }}</span>
                </div>
            </div>
        </div>

        <div class="type-stats" v-if="summary.typeStats && summary.typeStats.length > 0">
            <div 
                class="type-stat-card" 
                v-for="stat in summary.typeStats" 
                :key="stat.sensor_type"
            >
                <span class="type-icon">{{ getSensorIcon(stat.sensor_type) }}</span>
                <div class="type-info">
                    <span class="type-name">{{ getSensorLabel(stat.sensor_type) }}</span>
                    <div class="type-counts">
                        <span class="total-count">共 {{ stat.count }} 条</span>
                        <span class="unhandled-count" v-if="stat.unhandled_count > 0">
                            ({{ stat.unhandled_count }} 未处理)
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div class="filter-bar">
            <el-select v-model="filters.workingFaceId" placeholder="选择工作面" clearable @change="loadAlarms">
                <el-option label="全部工作面" value="" />
                <el-option v-for="face in workingFaces" :key="face.id" :label="face.name" :value="face.id" />
            </el-select>

            <el-select v-model="filters.sensorType" placeholder="选择报警类型" clearable @change="loadAlarms">
                <el-option label="全部类型" value="" />
                <el-option label="瓦斯浓度" value="gas" />
                <el-option label="粉尘浓度" value="dust" />
                <el-option label="温度" value="temperature" />
                <el-option label="风速" value="wind" />
            </el-select>

            <el-select v-model="filters.status" placeholder="处理状态" clearable @change="loadAlarms">
                <el-option label="全部状态" value="" />
                <el-option label="未处理" :value="0" />
                <el-option label="已处理" :value="1" />
            </el-select>

            <el-date-picker
                v-model="filters.timeRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                @change="loadAlarms"
            />

            <el-button type="primary" @click="loadAlarms">
                <el-icon><Search /></el-icon>查询
            </el-button>

            <el-button type="info" @click="resetFilters">
                <el-icon><Refresh /></el-icon>重置
            </el-button>

            <el-button 
                type="success" 
                :disabled="selectedIds.length === 0"
                @click="handleBatch"
            >
                <el-icon><Check /></el-icon>批量处理 ({{ selectedIds.length }})
            </el-button>
        </div>

        <div class="alarm-list-container">
            <el-table 
                :data="alarmList" 
                style="width: 100%"
                stripe
                :row-class-name="getRowClassName"
                @selection-change="handleSelectionChange"
                ref="tableRef"
            >
                <el-table-column type="selection" width="50" :selectable="row => row.status === 0" />

                <el-table-column prop="id" label="ID" width="80" align="center" />

                <el-table-column label="报警时间" width="170" align="center">
                    <template #default="scope">
                        <span class="alarm-time">{{ formatTime(scope.row.alarm_time) }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="工作面" width="160">
                    <template #default="scope">
                        <span class="face-tag">{{ scope.row.working_face_name }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="报警类型" width="130" align="center">
                    <template #default="scope">
                        <span :class="['type-tag', `type-${scope.row.sensor_type}`]">
                            {{ getSensorIcon(scope.row.sensor_type) }} {{ getSensorLabel(scope.row.sensor_type) }}
                        </span>
                    </template>
                </el-table-column>

                <el-table-column prop="sensor_name" label="传感器" width="200" />

                <el-table-column label="报警值 vs 阈值" width="220" align="center">
                    <template #default="scope">
                        <div class="value-compare">
                            <span class="alarm-value">{{ Number(scope.row.alarm_value).toFixed(4) }}</span>
                            <span class="vs-text">/</span>
                            <span class="threshold-value">{{ Number(scope.row.threshold_value).toFixed(4) }}</span>
                            <span class="unit">{{ scope.row.unit }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="状态" width="110" align="center">
                    <template #default="scope">
                        <span :class="['status-tag', scope.row.status === 1 ? 'status-handled' : 'status-unhandled']">
                            {{ scope.row.status === 1 ? '✓ 已处理' : '⚠ 未处理' }}
                        </span>
                    </template>
                </el-table-column>

                <el-table-column label="处理信息" min-width="180">
                    <template #default="scope">
                        <div v-if="scope.row.status === 1" class="handle-info">
                            <div class="handle-time">处理时间: {{ formatTime(scope.row.handle_time) }}</div>
                            <div class="handle-by">处理人: {{ scope.row.handle_by }}</div>
                            <div class="handle-remark" v-if="scope.row.handle_remark">备注: {{ scope.row.handle_remark }}</div>
                        </div>
                        <span v-else class="no-handle">-</span>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="110" align="center" fixed="right">
                    <template #default="scope">
                        <el-button 
                            type="primary" 
                            size="small" 
                            v-if="scope.row.status === 0"
                            @click="handleSingle(scope.row)"
                        >
                            标记处理
                        </el-button>
                        <span v-else class="handled-text">已处理</span>
                    </template>
                </el-table-column>

                <template #empty>
                    <div class="empty-state">
                        <span class="empty-icon">🎉</span>
                        <span class="empty-text">暂无报警记录，系统运行安全！</span>
                    </div>
                </template>
            </el-table>

            <div class="pagination-bar">
                <el-pagination
                    v-model:current-page="pagination.page"
                    v-model:page-size="pagination.pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="pagination.total"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="loadAlarms"
                    @current-change="loadAlarms"
                    background
                />
            </div>
        </div>

        <el-dialog v-model="handleDialogVisible" title="处理报警" width="500px">
            <el-form :model="handleForm" label-width="80px">
                <el-form-item label="报警详情">
                    <div class="dialog-detail">
                        <p><strong>工作面:</strong> {{ currentAlarm.working_face_name }}</p>
                        <p><strong>传感器:</strong> {{ currentAlarm.sensor_name }}</p>
                        <p>
                            <strong>报警值:</strong> 
                            <span class="danger-text">{{ Number(currentAlarm.alarm_value).toFixed(4) }} {{ currentAlarm.unit }}</span>
                            （阈值: {{ Number(currentAlarm.threshold_value).toFixed(4) }}）
                        </p>
                        <p><strong>报警时间:</strong> {{ formatTime(currentAlarm.alarm_time) }}</p>
                    </div>
                </el-form-item>
                <el-form-item label="处理人">
                    <el-input v-model="handleForm.handleBy" placeholder="请输入处理人姓名" />
                </el-form-item>
                <el-form-item label="处理备注">
                    <el-input 
                        v-model="handleForm.handleRemark" 
                        type="textarea" 
                        :rows="3"
                        placeholder="请输入处理措施和备注信息"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="handleDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitHandle">确认处理</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Check } from '@element-plus/icons-vue'

const workingFaces = ref([])
const alarmList = ref([])
const summary = reactive({
    unhandled: 0,
    today: 0,
    total: 0,
    typeStats: []
})

const filters = reactive({
    workingFaceId: '',
    sensorType: '',
    status: '',
    timeRange: []
})

const pagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
})

const selectedIds = ref([])
const handleDialogVisible = ref(false)
const currentAlarm = ref({})
const handleForm = reactive({
    handleBy: '',
    handleRemark: ''
})
const isBatchMode = ref(false)
const tableRef = ref(null)

const getSensorIcon = (type) => {
    const icons = { gas: '💨', dust: '🌫', temperature: '🌡', wind: '💨' }
    return icons[type] || '⚠'
}

const getSensorLabel = (type) => {
    const labels = { gas: '瓦斯浓度', dust: '粉尘浓度', temperature: '温度', wind: '风速' }
    return labels[type] || type
}

const formatTime = (time) => {
    if (!time) return '-'
    const t = new Date(time)
    const pad = (n) => String(n).padStart(2, '0')
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
}

const getRowClassName = ({ row }) => {
    return row.status === 0 ? 'alarm-row-unhandled' : 'alarm-row-handled'
}

const fetchWorkingFaces = async () => {
    try {
        const res = await axios.get('/working-faces')
        if (res.code === 200) {
            workingFaces.value = res.data
        }
    } catch (err) {
        console.error(err)
    }
}

const loadSummary = async () => {
    try {
        const res = await axios.get('/alarms/summary')
        if (res.code === 200) {
            summary.unhandled = res.data.unhandled || 0
            summary.today = res.data.today || 0
            summary.total = res.data.total || 0
            summary.typeStats = res.data.typeStats || []
        }
    } catch (err) {
        console.error(err)
    }
}

const loadAlarms = async () => {
    try {
        const params = {
            page: pagination.page,
            pageSize: pagination.pageSize
        }
        if (filters.workingFaceId) params.workingFaceId = filters.workingFaceId
        if (filters.sensorType) params.sensorType = filters.sensorType
        if (filters.status !== '' && filters.status !== undefined && filters.status !== null) {
            params.status = filters.status
        }
        if (filters.timeRange && filters.timeRange.length === 2) {
            params.startTime = filters.timeRange[0]
            params.endTime = filters.timeRange[1]
        }

        const res = await axios.get('/alarms', { params })
        if (res.code === 200) {
            alarmList.value = res.data.list
            pagination.total = res.data.total
            pagination.page = res.data.page
        }
    } catch (err) {
        console.error(err)
    }
}

const resetFilters = () => {
    filters.workingFaceId = ''
    filters.sensorType = ''
    filters.status = ''
    filters.timeRange = []
    pagination.page = 1
    loadAlarms()
    ElMessage.success('筛选条件已重置')
}

const handleSelectionChange = (selection) => {
    selectedIds.value = selection.map(row => row.id)
}

const handleSingle = (row) => {
    isBatchMode.value = false
    currentAlarm.value = row
    handleForm.handleBy = ''
    handleForm.handleRemark = ''
    handleDialogVisible.value = true
}

const handleBatch = async () => {
    try {
        await ElMessageBox.confirm(
            `确定要批量处理选中的 ${selectedIds.value.length} 条报警记录吗？`,
            '批量处理确认',
            {
                confirmButtonText: '确定处理',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        const res = await axios.put('/alarms/batch-handle', {
            ids: selectedIds.value,
            handleBy: '系统管理员',
            handleRemark: '批量处理'
        })
        if (res.code === 200) {
            ElMessage.success(res.message)
            tableRef.value && tableRef.value.clearSelection()
            loadAlarms()
            loadSummary()
        } else {
            ElMessage.error(res.message || '处理失败')
        }
    } catch (err) {
        if (err !== 'cancel') {
            ElMessage.error('处理失败')
        }
    }
}

const submitHandle = async () => {
    try {
        const res = await axios.put(`/alarms/${currentAlarm.value.id}/handle`, {
            handleBy: handleForm.handleBy || '系统管理员',
            handleRemark: handleForm.handleRemark || '已处理'
        })
        if (res.code === 200) {
            ElMessage.success('报警处理成功')
            handleDialogVisible.value = false
            loadAlarms()
            loadSummary()
        } else {
            ElMessage.error(res.message || '处理失败')
        }
    } catch (err) {
        ElMessage.error('处理失败')
    }
}

const refreshData = () => {
    loadAlarms()
    loadSummary()
}

let refreshTimer = null

onMounted(async () => {
    await fetchWorkingFaces()
    await loadSummary()
    await loadAlarms()
    refreshTimer = setInterval(refreshData, 10000)
})
</script>

<style scoped>
.alarms-page {
    width: 100%;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(58, 26, 26, 0.4) 0%, rgba(33, 13, 13, 0.4) 100%);
    border-radius: 12px;
    border: 1px solid rgba(255, 77, 79, 0.2);
}

.page-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 22px;
    color: #fff;
    font-weight: 600;
}

.title-icon {
    font-size: 28px;
}

.badge-unhandled {
    background: #ff4d4f;
    color: #fff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 14px;
    animation: pulse 1.5s infinite;
}

.header-stats {
    display: flex;
    gap: 16px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px;
    background: rgba(13, 33, 55, 0.8);
    border-radius: 8px;
    min-width: 100px;
}

.stat-item.danger { border: 1px solid rgba(255, 77, 79, 0.3); }
.stat-item.warning { border: 1px solid rgba(250, 173, 20, 0.3); }
.stat-item.info { border: 1px solid rgba(24, 144, 255, 0.3); }

.stat-icon { font-size: 20px; margin-bottom: 4px; }
.stat-label { font-size: 12px; color: #8ab4d8; margin-bottom: 4px; }
.stat-item.danger .stat-value { color: #ff4d4f; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; }
.stat-item.warning .stat-value { color: #faad14; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; }
.stat-item.info .stat-value { color: #1890ff; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; }

.type-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
}

.type-stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.5) 0%, rgba(13, 33, 55, 0.5) 100%);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.type-icon {
    font-size: 32px;
}

.type-info {
    display: flex;
    flex-direction: column;
}

.type-name {
    font-size: 15px;
    color: #fff;
    font-weight: 600;
}

.type-counts {
    font-size: 13px;
    color: #8ab4d8;
}

.unhandled-count {
    color: #ff4d4f;
    font-weight: 600;
}

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: rgba(13, 33, 55, 0.6);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.1);
}

.filter-bar :deep(.el-select),
.filter-bar :deep(.el-date-editor) {
    --el-select-input-focus-border-color: #00d4ff;
}

.alarm-list-container {
    background: rgba(13, 33, 55, 0.6);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(0, 212, 255, 0.1);
}

:deep(.el-table) {
    background: transparent !important;
}

:deep(.el-table th) {
    background: rgba(26, 58, 92, 0.9) !important;
    color: #00d4ff !important;
    font-weight: 600 !important;
}

:deep(.el-table td) {
    background: rgba(13, 33, 55, 0.4) !important;
    color: #8ab4d8 !important;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
    background: rgba(26, 58, 92, 0.3) !important;
}

:deep(.alarm-row-unhandled td) {
    background: rgba(58, 26, 26, 0.35) !important;
}

:deep(.alarm-row-unhandled:hover td),
:deep(.alarm-row-handled:hover td) {
    background: rgba(0, 212, 255, 0.08) !important;
}

:deep(.el-table--striped .el-table__body tr.alarm-row-unhandled.el-table__row--striped td) {
    background: rgba(58, 26, 26, 0.45) !important;
}

.alarm-time {
    font-family: 'Courier New', monospace;
    color: #8ab4d8;
    font-size: 13px;
}

.face-tag {
    display: inline-block;
    padding: 3px 10px;
    background: rgba(0, 212, 255, 0.1);
    color: #00d4ff;
    border-radius: 4px;
    font-size: 13px;
    border: 1px solid rgba(0, 212, 255, 0.2);
}

.type-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.type-gas { background: rgba(255, 77, 79, 0.15); color: #ff4d4f; border: 1px solid rgba(255, 77, 79, 0.3); }
.type-dust { background: rgba(250, 173, 20, 0.15); color: #faad14; border: 1px solid rgba(250, 173, 20, 0.3); }
.type-temperature { background: rgba(245, 34, 45, 0.15); color: #f5222d; border: 1px solid rgba(245, 34, 45, 0.3); }
.type-wind { background: rgba(24, 144, 255, 0.15); color: #1890ff; border: 1px solid rgba(24, 144, 255, 0.3); }

.value-compare {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
}

.alarm-value {
    color: #ff4d4f;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    font-size: 15px;
}

.vs-text {
    color: #6b8cae;
}

.threshold-value {
    color: #8ab4d8;
    font-family: 'Courier New', monospace;
}

.unit {
    color: #6b8cae;
    font-size: 12px;
    margin-left: 4px;
}

.status-tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.status-unhandled {
    background: rgba(255, 77, 79, 0.15);
    color: #ff4d4f;
    border: 1px solid rgba(255, 77, 79, 0.4);
    animation: pulse 2s infinite;
}

.status-handled {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
    border: 1px solid rgba(82, 196, 26, 0.4);
}

.handle-info {
    font-size: 12px;
    color: #8ab4d8;
    line-height: 1.6;
}

.handle-time, .handle-by, .handle-remark {
    font-family: 'Courier New', monospace;
    color: #6b8cae;
}

.no-handle {
    color: #465d78;
    font-style: italic;
}

.handled-text {
    color: #52c41a;
    font-size: 13px;
}

.pagination-bar {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

:deep(.el-pagination) {
    --el-pagination-bg-color: rgba(13, 33, 55, 0.8);
    --el-pagination-text-color: #8ab4d8;
    --el-pagination-hover-color: #00d4ff;
    --el-pagination-button-color: #8ab4d8;
    --el-pagination-button-bg-color: rgba(26, 58, 92, 0.6);
    --el-pagination-button-disabled-color: #465d78;
}

.dialog-detail {
    padding: 12px 16px;
    background: rgba(13, 33, 55, 0.6);
    border-radius: 8px;
    line-height: 2;
}

.dialog-detail p {
    margin: 4px 0;
    color: #8ab4d8;
}

.danger-text {
    color: #ff4d4f;
    font-weight: bold;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
    gap: 12px;
}

.empty-icon {
    font-size: 48px;
}

.empty-text {
    font-size: 16px;
    color: #52c41a;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}
</style>
