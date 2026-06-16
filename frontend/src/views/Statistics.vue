<template>
    <div class="statistics">
        <div class="statistics-header">
            <h2 class="page-title">📊 安全数据统计分析</h2>
            <div class="filter-bar">
                <el-select v-model="filters.workingFaceId" placeholder="选择工作面" @change="loadAllData" clearable>
                    <el-option label="全部工作面" value="" />
                    <el-option 
                        v-for="face in workingFaces" 
                        :key="face.id" 
                        :label="face.name" 
                        :value="face.id" 
                    />
                </el-select>
                <el-select v-model="filters.sensorType" placeholder="选择传感器类型" @change="loadAllData" clearable>
                    <el-option label="全部类型" value="" />
                    <el-option label="瓦斯浓度" value="gas" />
                    <el-option label="粉尘浓度" value="dust" />
                    <el-option label="温度" value="temperature" />
                    <el-option label="风速" value="wind" />
                </el-select>
            </div>
        </div>

        <div class="stat-tabs">
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'shift' }"
                @click="activeTab = 'shift'; loadShiftData()"
            >
                👥 班组统计
            </div>
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'daily' }"
                @click="activeTab = 'daily'; loadDailyData()"
            >
                📅 按日统计
            </div>
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'monthly' }"
                @click="activeTab = 'monthly'; loadMonthlyData()"
            >
                📆 按月统计
            </div>
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'yoy' }"
                @click="activeTab = 'yoy'; loadYoYData()"
            >
                📈 去年同期对比
            </div>
        </div>

        <div class="stat-content">
            <div v-if="activeTab === 'shift'" class="tab-panel">
                <div class="date-filter">
                    <el-date-picker
                        v-model="filters.date"
                        type="date"
                        placeholder="选择日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        @change="loadShiftData"
                    />
                </div>
                <div class="charts-row">
                    <div class="chart-container">
                        <h3 class="chart-title">各班组超限次数</h3>
                        <div ref="shiftOverLimitChart" class="chart"></div>
                    </div>
                    <div class="chart-container">
                        <h3 class="chart-title">各班组平均值对比</h3>
                        <div ref="shiftAvgChart" class="chart"></div>
                    </div>
                </div>
                <div class="data-table">
                    <h3 class="chart-title">班组详细数据</h3>
                    <el-table :data="shiftData" stripe style="width: 100%">
                        <el-table-column prop="shift_name" label="班组" width="120" />
                        <el-table-column prop="sensor_type" label="传感器类型" width="140">
                            <template #default="scope">
                                {{ getSensorLabel(scope.row.sensor_type) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="total_count" label="监测次数" width="120" />
                        <el-table-column prop="over_limit_count" label="超限次数" width="120">
                            <template #default="scope">
                                <span :class="scope.row.over_limit_count > 0 ? 'danger-text' : 'safe-text'">
                                    {{ scope.row.over_limit_count }}
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="avg_value" label="平均值" width="140">
                            <template #default="scope">
                                {{ Number(scope.row.avg_value).toFixed(4) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="max_value" label="最大值" width="140">
                            <template #default="scope">
                                {{ Number(scope.row.max_value).toFixed(4) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="min_value" label="最小值" width="140">
                            <template #default="scope">
                                {{ Number(scope.row.min_value).toFixed(4) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>

            <div v-if="activeTab === 'daily'" class="tab-panel">
                <div class="date-filter">
                    <el-date-picker
                        v-model="filters.dateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        @change="loadDailyData"
                    />
                </div>
                <div class="chart-container full-width">
                    <h3 class="chart-title">每日超限次数趋势</h3>
                    <div ref="dailyOverLimitChart" class="chart"></div>
                </div>
                <div class="chart-container full-width">
                    <h3 class="chart-title">每日平均值变化趋势</h3>
                    <div ref="dailyAvgChart" class="chart"></div>
                </div>
            </div>

            <div v-if="activeTab === 'monthly'" class="tab-panel">
                <div class="date-filter">
                    <el-date-picker
                        v-model="filters.year"
                        type="year"
                        placeholder="选择年份"
                        format="YYYY"
                        value-format="YYYY"
                        @change="loadMonthlyData"
                    />
                </div>
                <div class="charts-row">
                    <div class="chart-container">
                        <h3 class="chart-title">月度超限次数统计</h3>
                        <div ref="monthlyOverLimitChart" class="chart"></div>
                    </div>
                    <div class="chart-container">
                        <h3 class="chart-title">月度平均值趋势</h3>
                        <div ref="monthlyAvgChart" class="chart"></div>
                    </div>
                </div>
            </div>

            <div v-if="activeTab === 'yoy'" class="tab-panel">
                <div class="yoy-summary">
                    <div class="yoy-card" v-for="stat in yoySummary" :key="stat.label">
                        <div class="yoy-label">{{ stat.label }}</div>
                        <div class="yoy-values">
                            <div class="yoy-item">
                                <span class="yoy-year">去年</span>
                                <span class="yoy-value">{{ stat.lastYear }}</span>
                            </div>
                            <div class="yoy-arrow">→</div>
                            <div class="yoy-item">
                                <span class="yoy-year">今年</span>
                                <span class="yoy-value" :class="stat.trend">{{ stat.currentYear }}</span>
                            </div>
                        </div>
                        <div class="yoy-change" :class="stat.changeClass">
                            {{ stat.changeText }}
                        </div>
                    </div>
                </div>
                <div class="chart-container full-width">
                    <h3 class="chart-title">月度超限次数同比对比</h3>
                    <div ref="yoyChart" class="chart"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import axios from '../utils/request'

const workingFaces = ref([])
const activeTab = ref('shift')

const filters = reactive({
    workingFaceId: '',
    sensorType: '',
    date: '',
    dateRange: [],
    year: ''
})

const shiftData = ref([])

const yoySummary = ref([])

const shiftOverLimitChart = ref(null)
const shiftAvgChart = ref(null)
const dailyOverLimitChart = ref(null)
const dailyAvgChart = ref(null)
const monthlyOverLimitChart = ref(null)
const monthlyAvgChart = ref(null)
const yoyChart = ref(null)

let charts = {}

const getSensorLabel = (type) => {
    const labels = {
        gas: '瓦斯浓度',
        dust: '粉尘浓度',
        temperature: '温度',
        wind: '风速'
    }
    return labels[type] || type
}

const getSensorColor = (type) => {
    const colors = {
        gas: '#ff4d4f',
        dust: '#faad14',
        temperature: '#f5222d',
        wind: '#1890ff'
    }
    return colors[type] || '#00d4ff'
}

const initChart = (el, option) => {
    if (!el) return null
    const chart = echarts.init(el, 'dark')
    chart.setOption(option)
    window.addEventListener('resize', () => chart.resize())
    return chart
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

const loadShiftData = async () => {
    try {
        const params = {}
        if (filters.workingFaceId) params.workingFaceId = filters.workingFaceId
        if (filters.sensorType) params.sensorType = filters.sensorType
        if (filters.date) params.date = filters.date

        const res = await axios.get('/statistics/shift', { params })
        if (res.code === 200) {
            shiftData.value = res.data
            await nextTick()
            renderShiftCharts(res.data)
        }
    } catch (err) {
        console.error(err)
    }
}

const renderShiftCharts = (data) => {
    const shifts = ['早班', '中班', '夜班']
    const sensorTypes = [...new Set(data.map(d => d.sensor_type))]

    const series1 = sensorTypes.map(type => ({
        name: getSensorLabel(type),
        type: 'bar',
        data: shifts.map(shift => {
            const item = data.find(d => d.shift_name === shift && d.sensor_type === type)
            return item ? item.over_limit_count : 0
        }),
        itemStyle: { color: getSensorColor(type) }
    }))

    const option1 = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: sensorTypes.map(t => getSensorLabel(t)), textStyle: { color: '#8ab4d8' } },
        xAxis: {
            type: 'category',
            data: shifts,
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' }
        },
        yAxis: {
            type: 'value',
            name: '超限次数',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: series1
    }

    if (charts.shiftOverLimit) charts.shiftOverLimit.dispose()
    charts.shiftOverLimit = initChart(shiftOverLimitChart.value, option1)

    const series2 = sensorTypes.map(type => ({
        name: getSensorLabel(type),
        type: 'bar',
        data: shifts.map(shift => {
            const item = data.find(d => d.shift_name === shift && d.sensor_type === type)
            return item ? Number(item.avg_value).toFixed(4) : 0
        }),
        itemStyle: { color: getSensorColor(type) }
    }))

    const option2 = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: sensorTypes.map(t => getSensorLabel(t)), textStyle: { color: '#8ab4d8' } },
        xAxis: {
            type: 'category',
            data: shifts,
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' }
        },
        yAxis: {
            type: 'value',
            name: '平均值',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: series2
    }

    if (charts.shiftAvg) charts.shiftAvg.dispose()
    charts.shiftAvg = initChart(shiftAvgChart.value, option2)
}

const loadDailyData = async () => {
    try {
        const params = {}
        if (filters.workingFaceId) params.workingFaceId = filters.workingFaceId
        if (filters.sensorType) params.sensorType = filters.sensorType
        if (filters.dateRange && filters.dateRange.length === 2) {
            params.startDate = filters.dateRange[0]
            params.endDate = filters.dateRange[1]
        }

        const res = await axios.get('/statistics/daily', { params })
        if (res.code === 200) {
            await nextTick()
            renderDailyCharts(res.data)
        }
    } catch (err) {
        console.error(err)
    }
}

const renderDailyCharts = (data) => {
    const dates = [...new Set(data.map(d => d.date))].sort()
    const sensorTypes = [...new Set(data.map(d => d.sensor_type))]

    const series1 = sensorTypes.map(type => ({
        name: getSensorLabel(type),
        type: 'line',
        smooth: true,
        data: dates.map(date => {
            const item = data.find(d => d.date === date && d.sensor_type === type)
            return item ? item.over_limit_count : 0
        }),
        itemStyle: { color: getSensorColor(type) },
        areaStyle: { opacity: 0.1 }
    }))

    const option1 = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: sensorTypes.map(t => getSensorLabel(t)), textStyle: { color: '#8ab4d8' } },
        xAxis: {
            type: 'category',
            data: dates,
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8', rotate: 45 }
        },
        yAxis: {
            type: 'value',
            name: '超限次数',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: series1
    }

    if (charts.dailyOverLimit) charts.dailyOverLimit.dispose()
    charts.dailyOverLimit = initChart(dailyOverLimitChart.value, option1)

    const series2 = sensorTypes.map(type => ({
        name: getSensorLabel(type),
        type: 'line',
        smooth: true,
        data: dates.map(date => {
            const item = data.find(d => d.date === date && d.sensor_type === type)
            return item ? Number(item.avg_value).toFixed(4) : 0
        }),
        itemStyle: { color: getSensorColor(type) }
    }))

    const option2 = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: sensorTypes.map(t => getSensorLabel(t)), textStyle: { color: '#8ab4d8' } },
        xAxis: {
            type: 'category',
            data: dates,
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8', rotate: 45 }
        },
        yAxis: {
            type: 'value',
            name: '平均值',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: series2
    }

    if (charts.dailyAvg) charts.dailyAvg.dispose()
    charts.dailyAvg = initChart(dailyAvgChart.value, option2)
}

const loadMonthlyData = async () => {
    try {
        const params = {}
        if (filters.workingFaceId) params.workingFaceId = filters.workingFaceId
        if (filters.sensorType) params.sensorType = filters.sensorType
        if (filters.year) params.year = filters.year

        const res = await axios.get('/statistics/monthly', { params })
        if (res.code === 200) {
            await nextTick()
            renderMonthlyCharts(res.data)
        }
    } catch (err) {
        console.error(err)
    }
}

const renderMonthlyCharts = (data) => {
    const months = [...new Set(data.map(d => d.month))].sort()
    const sensorTypes = [...new Set(data.map(d => d.sensor_type))]

    const series1 = sensorTypes.map(type => ({
        name: getSensorLabel(type),
        type: 'bar',
        stack: 'total',
        data: months.map(month => {
            const item = data.find(d => d.month === month && d.sensor_type === type)
            return item ? item.over_limit_count : 0
        }),
        itemStyle: { color: getSensorColor(type) }
    }))

    const option1 = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: sensorTypes.map(t => getSensorLabel(t)), textStyle: { color: '#8ab4d8' } },
        xAxis: {
            type: 'category',
            data: months,
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' }
        },
        yAxis: {
            type: 'value',
            name: '超限次数',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: series1
    }

    if (charts.monthlyOverLimit) charts.monthlyOverLimit.dispose()
    charts.monthlyOverLimit = initChart(monthlyOverLimitChart.value, option1)

    const series2 = sensorTypes.map(type => ({
        name: getSensorLabel(type),
        type: 'line',
        smooth: true,
        data: months.map(month => {
            const item = data.find(d => d.month === month && d.sensor_type === type)
            return item ? Number(item.avg_value).toFixed(4) : 0
        }),
        itemStyle: { color: getSensorColor(type) }
    }))

    const option2 = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: sensorTypes.map(t => getSensorLabel(t)), textStyle: { color: '#8ab4d8' } },
        xAxis: {
            type: 'category',
            data: months,
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' }
        },
        yAxis: {
            type: 'value',
            name: '平均值',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: series2
    }

    if (charts.monthlyAvg) charts.monthlyAvg.dispose()
    charts.monthlyAvg = initChart(monthlyAvgChart.value, option2)
}

const loadYoYData = async () => {
    try {
        const params = {}
        if (filters.workingFaceId) params.workingFaceId = filters.workingFaceId
        if (filters.sensorType) params.sensorType = filters.sensorType

        const res = await axios.get('/statistics/year-over-year', { params })
        if (res.code === 200) {
            await nextTick()
            processYoYData(res.data)
            renderYoYChart(res.data)
        }
    } catch (err) {
        console.error(err)
    }
}

const processYoYData = (data) => {
    const { currentYear, lastYear, data: items } = data
    
    const lastYearOverLimit = items
        .filter(d => d.year === lastYear)
        .reduce((sum, d) => sum + Number(d.over_limit_count), 0)
    
    const currentYearOverLimit = items
        .filter(d => d.year === currentYear)
        .reduce((sum, d) => sum + Number(d.over_limit_count), 0)

    const lastYearAvg = items
        .filter(d => d.year === lastYear)
        .reduce((sum, d) => sum + Number(d.avg_value || 0), 0) / 
        (items.filter(d => d.year === lastYear).length || 1)

    const currentYearAvg = items
        .filter(d => d.year === currentYear)
        .reduce((sum, d) => sum + Number(d.avg_value || 0), 0) /
        (items.filter(d => d.year === currentYear).length || 1)

    const overLimitChange = lastYearOverLimit === 0 ? 0 : 
        ((currentYearOverLimit - lastYearOverLimit) / lastYearOverLimit * 100).toFixed(1)
    const avgChange = lastYearAvg === 0 ? 0 : 
        ((currentYearAvg - lastYearAvg) / lastYearAvg * 100).toFixed(1)

    yoySummary.value = [
        {
            label: '累计超限次数',
            lastYear: lastYearOverLimit,
            currentYear: currentYearOverLimit,
            trend: currentYearOverLimit > lastYearOverLimit ? 'trend-up' : 'trend-down',
            changeText: `${overLimitChange > 0 ? '+' : ''}${overLimitChange}%`,
            changeClass: currentYearOverLimit > lastYearOverLimit ? 'change-bad' : 'change-good'
        },
        {
            label: '平均监测值',
            lastYear: lastYearAvg.toFixed(4),
            currentYear: currentYearAvg.toFixed(4),
            trend: currentYearAvg > lastYearAvg ? 'trend-up' : 'trend-down',
            changeText: `${avgChange > 0 ? '+' : ''}${avgChange}%`,
            changeClass: currentYearAvg > lastYearAvg ? 'change-bad' : 'change-good'
        }
    ]
}

const renderYoYChart = (data) => {
    const { currentYear, lastYear, data: items } = data
    const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))

    const lastYearData = months.map(m => {
        const monthItems = items.filter(d => d.year === lastYear && String(d.month).padStart(2, '0') === m)
        return monthItems.reduce((sum, d) => sum + Number(d.over_limit_count), 0)
    })

    const currentYearData = months.map(m => {
        const monthItems = items.filter(d => d.year === currentYear && String(d.month).padStart(2, '0') === m)
        return monthItems.reduce((sum, d) => sum + Number(d.over_limit_count), 0)
    })

    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { 
            data: [`${lastYear}年`, `${currentYear}年(今年)`], 
            textStyle: { color: '#8ab4d8' } 
        },
        xAxis: {
            type: 'category',
            data: months.map(m => `${m}月`),
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' }
        },
        yAxis: {
            type: 'value',
            name: '超限次数',
            axisLine: { lineStyle: { color: '#1a3a5c' } },
            axisLabel: { color: '#8ab4d8' },
            splitLine: { lineStyle: { color: 'rgba(26, 58, 92, 0.5)' } }
        },
        series: [
            {
                name: `${lastYear}年`,
                type: 'bar',
                data: lastYearData,
                itemStyle: { color: '#8ab4d8' }
            },
            {
                name: `${currentYear}年(今年)`,
                type: 'bar',
                data: currentYearData,
                itemStyle: { color: '#00d4ff' }
            }
        ]
    }

    if (charts.yoy) charts.yoy.dispose()
    charts.yoy = initChart(yoyChart.value, option)
}

const loadAllData = () => {
    if (activeTab.value === 'shift') loadShiftData()
    else if (activeTab.value === 'daily') loadDailyData()
    else if (activeTab.value === 'monthly') loadMonthlyData()
    else if (activeTab.value === 'yoy') loadYoYData()
}

watch(activeTab, (newVal) => {
    nextTick(() => {
        loadAllData()
    })
})

onMounted(async () => {
    await fetchWorkingFaces()
    loadAllData()
})
</script>

<style scoped>
.statistics {
    width: 100%;
}

.statistics-header {
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

.filter-bar {
    display: flex;
    gap: 12px;
}

.stat-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.tab-item {
    padding: 12px 24px;
    background: rgba(13, 33, 55, 0.8);
    color: #8ab4d8;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    transition: all 0.3s;
    border: 1px solid transparent;
    border-bottom: none;
}

.tab-item:hover {
    color: #00d4ff;
    background: rgba(26, 58, 92, 0.8);
}

.tab-item.active {
    color: #00d4ff;
    background: linear-gradient(135deg, rgba(26, 58, 92, 1) 0%, rgba(13, 33, 55, 1) 100%);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-bottom: none;
}

.tab-panel {
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.3) 0%, rgba(13, 33, 55, 0.3) 100%);
    border-radius: 0 10px 10px 10px;
    padding: 20px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.date-filter {
    margin-bottom: 20px;
}

.charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
}

.chart-container {
    background: rgba(13, 33, 55, 0.6);
    border-radius: 10px;
    padding: 16px;
    border: 1px solid rgba(0, 212, 255, 0.1);
}

.chart-container.full-width {
    margin-bottom: 20px;
}

.chart-title {
    font-size: 15px;
    color: #00d4ff;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}

.chart {
    width: 100%;
    height: 350px;
}

.data-table {
    margin-top: 20px;
}

:deep(.el-table) {
    background: rgba(13, 33, 55, 0.6) !important;
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

.yoy-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.yoy-card {
    background: rgba(13, 33, 55, 0.8);
    border-radius: 10px;
    padding: 20px;
    border: 1px solid rgba(0, 212, 255, 0.2);
}

.yoy-label {
    font-size: 14px;
    color: #8ab4d8;
    margin-bottom: 12px;
}

.yoy-values {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.yoy-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
}

.yoy-year {
    font-size: 12px;
    color: #6b8cae;
    margin-bottom: 4px;
}

.yoy-value {
    font-size: 24px;
    font-weight: bold;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
}

.yoy-value.trend-up {
    color: #ff4d4f;
}

.yoy-value.trend-down {
    color: #52c41a;
}

.yoy-arrow {
    font-size: 20px;
    color: #6b8cae;
}

.yoy-change {
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    padding: 6px;
    border-radius: 6px;
}

.change-good {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
}

.change-bad {
    background: rgba(255, 77, 79, 0.15);
    color: #ff4d4f;
}
</style>
