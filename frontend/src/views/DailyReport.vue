<template>
    <div class="daily-report">
        <div class="report-header">
            <h2 class="page-title">📋 安全生产日报</h2>
            <div class="header-actions">
                <el-date-picker
                    v-model="selectedDate"
                    type="date"
                    placeholder="选择日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    @change="loadReport"
                />
                <el-button type="primary" @click="generateReport" :loading="generating">
                    <el-icon><Refresh /></el-icon>
                    {{ hasReport ? '重新生成' : '生成日报' }}
                </el-button>
                <el-button type="success" @click="downloadPdf" :disabled="!hasReport" :loading="downloading">
                    <el-icon><Download /></el-icon>
                    下载PDF
                </el-button>
            </div>
        </div>

        <div v-if="loading" class="loading-container">
            <el-icon class="loading-icon"><Loading /></el-icon>
            <p>加载中...</p>
        </div>

        <div v-else-if="!hasReport" class="empty-container">
            <el-icon class="empty-icon"><Document /></el-icon>
            <p>暂无该日期的日报数据</p>
            <el-button type="primary" @click="generateReport" :loading="generating">
                生成日报
            </el-button>
        </div>

        <div v-else class="report-content">
            <div class="report-info">
                <div class="info-item">
                    <span class="info-label">报告日期：</span>
                    <span class="info-value">{{ reportData.reportDate }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">对比日期：</span>
                    <span class="info-value">{{ reportData.lastWeekDate }}（上周同期）</span>
                </div>
                <div class="info-item">
                    <span class="info-label">生成时间：</span>
                    <span class="info-value">{{ reportData.generatedAt }}</span>
                </div>
                <div class="info-item conclusion-item">
                    <span class="info-label">安全结论：</span>
                    <el-tag :type="conclusionType" size="large" effect="dark">
                        {{ reportData.conclusion }}
                    </el-tag>
                </div>
            </div>

            <div 
                v-for="face in reportData.workingFaces" 
                :key="face.workingFaceId" 
                class="face-section"
            >
                <div class="face-header">
                    <h3 class="face-title">▌ {{ face.workingFaceName }}</h3>
                    <span class="face-location">📍 {{ face.location }}</span>
                </div>

                <el-table :data="face.sensorStats" stripe style="width: 100%" class="stat-table">
                    <el-table-column prop="sensorLabel" label="监测类型" width="120" />
                    <el-table-column label="监测次数" width="100">
                        <template #default="scope">
                            {{ scope.row.totalCount }}
                        </template>
                    </el-table-column>
                    <el-table-column label="超限次数" width="100">
                        <template #default="scope">
                            <span :class="scope.row.overLimitCount > 0 ? 'danger-text' : 'safe-text'">
                                {{ scope.row.overLimitCount }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="最高值" width="140">
                        <template #default="scope">
                            <span :class="scope.row.maxValue >= scope.row.threshold ? 'danger-text' : ''">
                                {{ Number(scope.row.maxValue).toFixed(4) }} {{ scope.row.unit }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="平均值" width="140">
                        <template #default="scope">
                            {{ Number(scope.row.avgValue).toFixed(4) }} {{ scope.row.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="阈值" width="120">
                        <template #default="scope">
                            {{ Number(scope.row.threshold).toFixed(4) }} {{ scope.row.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="同比上周（超限次数）" width="180">
                        <template #default="scope">
                            <div class="comparison-cell">
                                <span>{{ scope.row.lastWeek.overLimitCount }} → {{ scope.row.overLimitCount }}</span>
                                <span 
                                    :class="getChangeClass(scope.row.changes.overLimit)"
                                    class="change-value"
                                >
                                    {{ scope.row.changes.overLimit > 0 ? '+' : '' }}{{ scope.row.changes.overLimit }}%
                                </span>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column label="同比上周（平均值）" width="140">
                        <template #default="scope">
                            <span :class="getChangeClass(scope.row.changes.avg)">
                                {{ scope.row.changes.avg > 0 ? '+' : '' }}{{ scope.row.changes.avg }}%
                            </span>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div class="conclusion-section">
                <h4 class="conclusion-title">📝 结论说明</h4>
                <p class="conclusion-text">{{ conclusionText }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download, Loading, Document } from '@element-plus/icons-vue'
import axios from '../utils/request'
import moment from 'moment'

const selectedDate = ref(moment().subtract(1, 'days').format('YYYY-MM-DD'))
const reportData = ref(null)
const loading = ref(false)
const generating = ref(false)
const downloading = ref(false)

const hasReport = computed(() => !!reportData.value)

const conclusionType = computed(() => {
    if (!reportData.value) return 'info'
    switch (reportData.value.conclusion) {
        case '正常': return 'success'
        case '重点关注': return 'warning'
        case '异常': return 'danger'
        default: return 'info'
    }
})

const conclusionText = computed(() => {
    if (!reportData.value) return ''
    switch (reportData.value.conclusion) {
        case '正常':
            return '各工作面监测数据均在安全范围内，安全生产状况良好。请继续保持日常巡检和监测工作。'
        case '重点关注':
            return '部分工作面存在超限情况，需要重点关注。建议加强相关区域的巡检频次，分析超限原因并采取相应措施。'
        case '异常':
            return '存在严重超限情况或瓦斯超限，安全生产状况异常！请立即启动应急预案，组织相关人员排查隐患，确保生产安全。'
        default:
            return ''
    }
})

const getChangeClass = (change) => {
    if (change > 0) return 'change-bad'
    if (change < 0) return 'change-good'
    return 'change-neutral'
}

const loadReport = async () => {
    if (!selectedDate.value) return
    
    loading.value = true
    reportData.value = null
    
    try {
        const res = await axios.get(`/daily-reports/${selectedDate.value}`)
        if (res.code === 200) {
            reportData.value = res.data.report_data
        } else if (res.code === 404) {
            reportData.value = null
        }
    } catch (err) {
        if (err.response?.status === 404) {
            reportData.value = null
        } else {
            console.error('加载日报失败:', err)
            ElMessage.error('加载日报失败')
        }
    } finally {
        loading.value = false
    }
}

const generateReport = async () => {
    const action = hasReport.value ? '重新生成' : '生成'
    
    try {
        await ElMessageBox.confirm(
            `确定要${action} ${selectedDate.value} 的安全生产日报吗？`,
            '确认操作',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
    } catch {
        return
    }
    
    generating.value = true
    
    try {
        const res = await axios.post('/daily-reports/generate', {
            date: selectedDate.value
        })
        
        if (res.code === 200) {
            reportData.value = res.data.report_data
            ElMessage.success(res.message)
        } else {
            ElMessage.error(res.message || '生成失败')
        }
    } catch (err) {
        console.error('生成日报失败:', err)
        ElMessage.error('生成日报失败')
    } finally {
        generating.value = false
    }
}

const downloadPdf = async () => {
    if (!selectedDate.value) return
    
    downloading.value = true
    
    try {
        const baseURL = axios.defaults.baseURL || 'http://localhost:3002/api'
        const url = `${baseURL}/daily-reports/${selectedDate.value}/pdf`
        
        const link = document.createElement('a')
        link.href = url
        link.download = `安全生产日报_${selectedDate.value}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        ElMessage.success('PDF下载已开始')
    } catch (err) {
        console.error('下载PDF失败:', err)
        ElMessage.error('下载PDF失败')
    } finally {
        downloading.value = false
    }
}

onMounted(() => {
    loadReport()
})
</script>

<style scoped>
.daily-report {
    width: 100%;
}

.report-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.5) 0%, rgba(13, 33, 55, 0.5) 100%);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.page-title {
    font-size: 20px;
    color: #fff;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.loading-container,
.empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.3) 0%, rgba(13, 33, 55, 0.3) 100%);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.loading-icon,
.empty-icon {
    font-size: 48px;
    color: #00d4ff;
    margin-bottom: 16px;
}

.loading-container p,
.empty-container p {
    color: #8ab4d8;
    font-size: 16px;
    margin-bottom: 20px;
}

.loading-icon {
    animation: rotate 1s linear infinite;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.report-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.report-info {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.3) 0%, rgba(13, 33, 55, 0.3) 100%);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.info-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.info-label {
    color: #8ab4d8;
    font-size: 14px;
}

.info-value {
    color: #fff;
    font-size: 14px;
    font-weight: 500;
}

.conclusion-item {
    margin-left: auto;
}

.face-section {
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.3) 0%, rgba(13, 33, 55, 0.3) 100%);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.15);
    overflow: hidden;
}

.face-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: rgba(13, 33, 55, 0.6);
    border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}

.face-title {
    font-size: 16px;
    color: #00d4ff;
    font-weight: 600;
    margin: 0;
}

.face-location {
    font-size: 13px;
    color: #8ab4d8;
}

.stat-table {
    margin: 0;
}

:deep(.el-table) {
    background: rgba(13, 33, 55, 0.4) !important;
}

:deep(.el-table th) {
    background: rgba(26, 58, 92, 0.8) !important;
    color: #00d4ff !important;
}

:deep(.el-table td) {
    background: rgba(13, 33, 55, 0.4) !important;
    color: #8ab4d8 !important;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
    background: rgba(26, 58, 92, 0.3) !important;
}

:deep(.el-table::before) {
    background-color: rgba(0, 212, 255, 0.1) !important;
}

.safe-text {
    color: #52c41a;
    font-weight: 600;
}

.danger-text {
    color: #ff4d4f;
    font-weight: 600;
}

.comparison-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.change-value {
    font-size: 12px;
}

.change-good {
    color: #52c41a;
}

.change-bad {
    color: #ff4d4f;
}

.change-neutral {
    color: #8ab4d8;
}

.conclusion-section {
    padding: 20px;
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.3) 0%, rgba(13, 33, 55, 0.3) 100%);
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.conclusion-title {
    font-size: 15px;
    color: #00d4ff;
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}

.conclusion-text {
    color: #8ab4d8;
    font-size: 14px;
    line-height: 1.8;
    margin: 0;
}
</style>
