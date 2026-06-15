<template>
    <div class="dashboard">
        <div class="dashboard-header">
            <div class="stat-cards">
                <div class="stat-card normal">
                    <div class="stat-icon">✅</div>
                    <div class="stat-info">
                        <div class="stat-value">{{ workingFaces.length }}</div>
                        <div class="stat-label">工作面总数</div>
                    </div>
                </div>
                <div class="stat-card safe">
                    <div class="stat-icon">🛡</div>
                    <div class="stat-info">
                        <div class="stat-value">{{ normalCount }}</div>
                        <div class="stat-label">正常传感器</div>
                    </div>
                </div>
                <div class="stat-card warning" v-if="alarmCount > 0">
                    <div class="stat-icon alarm-blink">⚠</div>
                    <div class="stat-info">
                        <div class="stat-value">{{ alarmCount }}</div>
                        <div class="stat-label">超限警报</div>
                    </div>
                </div>
                <div class="stat-card info">
                    <div class="stat-icon">📡</div>
                    <div class="stat-info">
                        <div class="stat-value">{{ lastUpdateTime }}</div>
                        <div class="stat-label">最后更新</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard-content">
            <div class="face-section" v-for="face in workingFaces" :key="face.id">
                <div class="face-header">
                    <h2 class="face-title">
                        <span class="face-indicator" :class="{ 'face-alarm': isFaceAlarm(face.id) }"></span>
                        {{ face.name }}
                    </h2>
                    <span class="face-location">{{ face.location }}</span>
                    <span class="face-status" :class="isFaceAlarm(face.id) ? 'status-danger' : 'status-safe'">
                        {{ isFaceAlarm(face.id) ? '⚠ 异常' : '✓ 正常' }}
                    </span>
                </div>
                <div class="sensors-grid">
                    <div 
                        class="sensor-card" 
                        v-for="sensor in getFaceSensors(face.id)" 
                        :key="sensor.sensor_id"
                        :class="{ 'sensor-alarm': sensor.is_over_limit === 1, 'gas-alarm': sensor.sensor_type === 'gas' && sensor.is_over_limit === 1 }"
                    >
                        <div class="sensor-card-header">
                            <span class="sensor-icon">{{ getSensorIcon(sensor.sensor_type) }}</span>
                            <span class="sensor-name">{{ sensor.sensor_name }}</span>
                        </div>
                        <div class="sensor-value-section">
                            <span 
                                class="sensor-value" 
                                :class="{ 'value-alarm blink-red': sensor.is_over_limit === 1 }"
                            >
                                {{ sensor.value.toFixed(4) }}
                            </span>
                            <span class="sensor-unit">{{ sensor.unit }}</span>
                        </div>
                        <div class="sensor-info">
                            <div class="sensor-threshold">
                                阈值: {{ sensor.threshold.toFixed(4) }} {{ sensor.unit }}
                            </div>
                            <div class="sensor-status" :class="sensor.is_over_limit === 1 ? 'status-danger' : 'status-safe'">
                                {{ sensor.is_over_limit === 1 ? '超限' : '正常' }}
                            </div>
                        </div>
                        <div class="sensor-progress">
                            <div 
                                class="progress-bar" 
                                :class="{ 'progress-danger': sensor.is_over_limit === 1 }"
                                :style="{ width: getProgressWidth(sensor.value, sensor.threshold) + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="alarm-panel" v-if="alarmList.length > 0">
            <div class="alarm-panel-header">
                <span class="alarm-blink">🚨</span>
                <h3>实时警报</h3>
                <span class="alarm-count">{{ alarmList.length }}</span>
            </div>
            <div class="alarm-list">
                <div class="alarm-item blink-red-bg" v-for="(alarm, index) in alarmList" :key="index">
                    <span class="alarm-time">[{{ alarm.collect_time }}]</span>
                    <span class="alarm-face">{{ alarm.working_face_name }}</span>
                    <span class="alarm-sensor">{{ alarm.sensor_name }}</span>
                    <span class="alarm-value">
                        {{ getSensorLabel(alarm.sensor_type) }}: 
                        <strong>{{ alarm.value.toFixed(4) }} {{ alarm.unit }}</strong>
                        <span class="alarm-threshold"> (阈值: {{ alarm.threshold.toFixed(4) }})</span>
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from '../utils/request'

const workingFaces = ref([])
const sensorData = ref([])
const lastUpdateTime = ref('--:--:--')
let ws = null
let reconnectTimer = null

const normalCount = computed(() => sensorData.value.filter(s => s.is_over_limit === 0).length)
const alarmCount = computed(() => sensorData.value.filter(s => s.is_over_limit === 1).length)

const alarmList = computed(() => {
    return sensorData.value.filter(s => s.is_over_limit === 1)
})

const getFaceSensors = (faceId) => {
    return sensorData.value.filter(s => s.working_face_id === faceId)
}

const isFaceAlarm = (faceId) => {
    return sensorData.value.some(s => s.working_face_id === faceId && s.is_over_limit === 1)
}

const getSensorIcon = (type) => {
    const icons = {
        gas: '💨',
        dust: '🌫',
        temperature: '🌡',
        wind: '💨'
    }
    return icons[type] || '📊'
}

const getSensorLabel = (type) => {
    const labels = {
        gas: '瓦斯浓度',
        dust: '粉尘浓度',
        temperature: '温度',
        wind: '风速'
    }
    return labels[type] || type
}

const getProgressWidth = (value, threshold) => {
    const percent = (value / threshold) * 100
    return Math.min(percent, 100)
}

const fetchData = async () => {
    try {
        const res = await axios.get('/api/realtime')
        if (res.code === 200) {
            sensorData.value = res.data
            const now = new Date()
            lastUpdateTime.value = now.toTimeString().substring(0, 8)
        }
    } catch (err) {
        console.error('获取实时数据失败:', err)
    }
}

const fetchWorkingFaces = async () => {
    try {
        const res = await axios.get('/api/working-faces')
        if (res.code === 200) {
            workingFaces.value = res.data
        }
    } catch (err) {
        console.error('获取工作面失败:', err)
    }
}

const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const wsUrl = `${protocol}//${host}:3000`
    ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data)
            if (message.type === 'sensor_data') {
                sensorData.value = message.data
                const now = new Date()
                lastUpdateTime.value = now.toTimeString().substring(0, 8)
            }
        } catch (err) {
            console.error('解析WebSocket消息失败:', err)
        }
    }

    ws.onerror = (err) => {
        console.error('WebSocket连接错误:', err)
    }

    ws.onclose = () => {
        console.log('WebSocket连接已关闭，5秒后重试...')
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(connectWebSocket, 5000)
    }
}

onMounted(async () => {
    await fetchWorkingFaces()
    await fetchData()
    connectWebSocket()
})

onUnmounted(() => {
    if (ws) ws.close()
    if (reconnectTimer) clearTimeout(reconnectTimer)
})
</script>

<style scoped>
.dashboard {
    width: 100%;
}

.dashboard-header {
    margin-bottom: 20px;
}

.stat-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.stat-card {
    background: linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid rgba(0, 212, 255, 0.2);
    transition: all 0.3s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 212, 255, 0.2);
}

.stat-card.safe {
    border-color: rgba(82, 196, 26, 0.3);
}

.stat-card.warning {
    border-color: rgba(255, 77, 79, 0.5);
    background: linear-gradient(135deg, #3a1a1a 0%, #210d0d 100%);
}

.stat-card.info {
    border-color: rgba(47, 84, 235, 0.3);
}

.stat-icon {
    font-size: 36px;
}

.stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
}

.stat-card.safe .stat-value {
    color: #52c41a;
}

.stat-card.warning .stat-value {
    color: #ff4d4f;
}

.stat-card.info .stat-value {
    font-size: 16px;
    color: #2f54eb;
}

.stat-label {
    font-size: 13px;
    color: #8ab4d8;
    margin-top: 4px;
}

.face-section {
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.5) 0%, rgba(13, 33, 55, 0.5) 100%);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid rgba(0, 212, 255, 0.15);
}

.face-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}

.face-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    color: #fff;
    font-weight: 600;
}

.face-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #52c41a;
    box-shadow: 0 0 10px #52c41a;
}

.face-indicator.face-alarm {
    background: #ff4d4f;
    box-shadow: 0 0 10px #ff4d4f;
    animation: pulse 1s infinite;
}

.face-location {
    font-size: 13px;
    color: #8ab4d8;
}

.face-status {
    margin-left: auto;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
}

.status-safe {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
    border: 1px solid rgba(82, 196, 26, 0.3);
}

.status-danger {
    background: rgba(255, 77, 79, 0.15);
    color: #ff4d4f;
    border: 1px solid rgba(255, 77, 79, 0.3);
}

.sensors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
}

.sensor-card {
    background: rgba(13, 33, 55, 0.8);
    border-radius: 10px;
    padding: 16px;
    border: 1px solid rgba(0, 212, 255, 0.15);
    transition: all 0.3s;
}

.sensor-card:hover {
    border-color: rgba(0, 212, 255, 0.4);
    transform: translateY(-2px);
}

.sensor-card.sensor-alarm {
    border-color: rgba(255, 77, 79, 0.5);
    background: rgba(58, 26, 26, 0.8);
}

.sensor-card.gas-alarm {
    animation: alarmPulse 1s infinite;
}

.sensor-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.sensor-icon {
    font-size: 20px;
}

.sensor-name {
    font-size: 13px;
    color: #8ab4d8;
}

.sensor-value-section {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 12px;
}

.sensor-value {
    font-size: 32px;
    font-weight: bold;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
}

.sensor-unit {
    font-size: 14px;
    color: #8ab4d8;
}

.value-alarm {
    color: #ff4d4f;
}

.blink-red {
    animation: blinkRed 0.8s infinite;
}

.sensor-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.sensor-threshold {
    font-size: 12px;
    color: #6b8cae;
}

.sensor-status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
}

.sensor-progress {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #52c41a, #00d4ff);
    border-radius: 3px;
    transition: width 0.5s ease;
}

.progress-bar.progress-danger {
    background: linear-gradient(90deg, #ff4d4f, #ff7875);
}

.alarm-panel {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 400px;
    max-height: 300px;
    background: linear-gradient(135deg, rgba(58, 26, 26, 0.95) 0%, rgba(33, 13, 13, 0.95) 100%);
    border: 1px solid rgba(255, 77, 79, 0.5);
    border-radius: 10px;
    overflow: hidden;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(255, 77, 79, 0.3);
}

.alarm-panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(255, 77, 79, 0.2);
    border-bottom: 1px solid rgba(255, 77, 79, 0.3);
}

.alarm-panel-header h3 {
    color: #ff4d4f;
    font-size: 15px;
}

.alarm-count {
    margin-left: auto;
    background: #ff4d4f;
    color: #fff;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
}

.alarm-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 8px;
}

.alarm-item {
    padding: 10px 12px;
    margin-bottom: 6px;
    background: rgba(255, 77, 79, 0.1);
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.6;
}

.alarm-time {
    color: #ff7875;
    font-family: 'Courier New', monospace;
    margin-right: 8px;
}

.alarm-face {
    color: #fff;
    font-weight: 600;
    margin-right: 8px;
}

.alarm-sensor {
    color: #8ab4d8;
    margin-right: 8px;
}

.alarm-value {
    color: #ff4d4f;
}

.alarm-threshold {
    color: #6b8cae;
    font-weight: normal;
}

@keyframes blinkRed {
    0%, 100% { color: #ff4d4f; }
    50% { color: #ffffff; }
}

@keyframes blinkRedBg {
    0%, 100% { background: rgba(255, 77, 79, 0.1); }
    50% { background: rgba(255, 77, 79, 0.3); }
}

.blink-red-bg {
    animation: blinkRedBg 1s infinite;
}

@keyframes alarmPulse {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 77, 79, 0.5); }
    50% { box-shadow: 0 0 20px rgba(255, 77, 79, 0.8); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
}

.alarm-blink {
    animation: pulse 1s infinite;
}
</style>
