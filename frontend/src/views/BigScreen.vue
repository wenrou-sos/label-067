<template>
    <div class="big-screen" :class="{ 'fullscreen-mode': isFullscreen, 'alarm-flash': hasGasAlarm && flashOn }">
        <div class="screen-header">
            <div class="header-left">
                <span class="header-icon">🏭</span>
                <span class="header-title">矿山安全监测系统 - 大屏监控</span>
            </div>
            <div class="header-center">
                <div class="current-time">{{ currentTime }}</div>
                <div class="current-date">{{ currentDate }}</div>
            </div>
            <div class="header-right">
                <div class="header-stat" v-if="currentFace">
                    <span class="stat-label">当前工作面</span>
                    <span class="stat-value face-name">{{ currentFace.name }}</span>
                </div>
                <button class="control-btn" @click="toggleFullscreen" title="全屏">
                    {{ isFullscreen ? '🗗 退出全屏' : '🖥 全屏模式' }}
                </button>
                <button class="control-btn" @click="goBack" title="返回看板">
                    ← 返回
                </button>
            </div>
        </div>

        <div class="screen-body">
            <div class="body-left">
                <div class="summary-panel">
                    <h3 class="panel-title">系统概览</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-icon">🏗</div>
                            <div class="summary-info">
                                <div class="summary-value">{{ workingFaces.length }}</div>
                                <div class="summary-label">工作面</div>
                            </div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-icon">📡</div>
                            <div class="summary-info">
                                <div class="summary-value">{{ sensorData.length }}</div>
                                <div class="summary-label">传感器</div>
                            </div>
                        </div>
                        <div class="summary-item safe">
                            <div class="summary-icon">✅</div>
                            <div class="summary-info">
                                <div class="summary-value">{{ normalCount }}</div>
                                <div class="summary-label">正常</div>
                            </div>
                        </div>
                        <div class="summary-item danger" v-if="alarmCount > 0">
                            <div class="summary-icon alarm-pulse">🚨</div>
                            <div class="summary-info">
                                <div class="summary-value alarm-blink">{{ alarmCount }}</div>
                                <div class="summary-label">告警</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="face-nav-panel">
                    <h3 class="panel-title">工作面列表</h3>
                    <div class="face-nav-list">
                        <div 
                            class="face-nav-item" 
                            v-for="(face, index) in workingFaces" 
                            :key="face.id"
                            :class="{ 
                                'active': currentFaceIndex === index,
                                'face-alarm': isFaceAlarm(face.id)
                            }"
                            @click="selectFace(index)"
                        >
                            <span class="face-indicator"></span>
                            <span class="face-nav-name">{{ face.name }}</span>
                            <span class="face-nav-status" :class="isFaceAlarm(face.id) ? 'status-danger' : 'status-safe'">
                                {{ isFaceAlarm(face.id) ? '异常' : '正常' }}
                            </span>
                        </div>
                    </div>
                    <div class="carousel-control">
                        <button 
                            class="carousel-btn" 
                            @click="toggleAutoPlay"
                            :class="{ 'active': autoPlay }"
                        >
                            {{ autoPlay ? '⏸ 暂停轮播' : '▶ 自动轮播' }}
                        </button>
                        <span class="carousel-info">
                            {{ currentFaceIndex + 1 }} / {{ workingFaces.length }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="body-main">
                <div class="main-face-header" v-if="currentFace">
                    <h2 class="main-face-title">
                        <span class="face-indicator-large" :class="{ 'face-alarm': isFaceAlarm(currentFace.id) }"></span>
                        {{ currentFace.name }}
                    </h2>
                    <span class="main-face-location">{{ currentFace.location }}</span>
                </div>

                <div class="sensors-big-grid" v-if="currentFace">
                    <div 
                        class="sensor-big-card" 
                        v-for="sensor in getFaceSensors(currentFace.id)" 
                        :key="sensor.sensor_id"
                        :class="{ 
                            'sensor-alarm': sensor.is_over_limit === 1,
                            'gas-alarm-card': sensor.sensor_type === 'gas' && sensor.is_over_limit === 1
                        }"
                    >
                        <div class="sensor-big-header">
                            <span class="sensor-big-icon">{{ getSensorIcon(sensor.sensor_type) }}</span>
                            <span class="sensor-big-name">{{ sensor.sensor_name }}</span>
                            <span class="sensor-type-badge">{{ getSensorLabel(sensor.sensor_type) }}</span>
                        </div>
                        <div class="sensor-big-value">
                            <span class="big-value" :class="{ 'value-alarm': sensor.is_over_limit === 1 }">
                                {{ sensor.value.toFixed(4) }}
                            </span>
                            <span class="big-unit">{{ sensor.unit }}</span>
                        </div>
                        <div class="sensor-big-footer">
                            <div class="threshold-info">
                                <span class="threshold-label">安全阈值:</span>
                                <span class="threshold-value">{{ sensor.threshold.toFixed(4) }} {{ sensor.unit }}</span>
                            </div>
                            <div class="status-badge" :class="sensor.is_over_limit === 1 ? 'badge-danger' : 'badge-safe'">
                                {{ sensor.is_over_limit === 1 ? '⚠ 超限' : '✓ 正常' }}
                            </div>
                        </div>
                        <div class="sensor-big-progress">
                            <div 
                                class="progress-bar-big" 
                                :class="{ 'progress-danger': sensor.is_over_limit === 1 }"
                                :style="{ width: getProgressWidth(sensor.value, sensor.threshold) + '%' }"
                            ></div>
                            <span class="progress-percent">{{ getProgressWidth(sensor.value, sensor.threshold).toFixed(1) }}%</span>
                        </div>
                    </div>
                </div>

                <div class="empty-state" v-else>
                    <div class="empty-icon">📊</div>
                    <div class="empty-text">正在加载传感器数据...</div>
                </div>
            </div>

            <div class="body-right">
                <div class="alarm-big-panel" v-if="gasAlarmList.length > 0">
                    <div class="alarm-big-header">
                        <span class="alarm-big-icon alarm-pulse">⛽</span>
                        <h3 class="alarm-big-title">瓦斯超限告警</h3>
                        <span class="alarm-big-count alarm-blink">{{ gasAlarmList.length }}</span>
                    </div>
                    <div class="alarm-big-list">
                        <div class="alarm-big-item gas-alarm-item" v-for="(alarm, index) in gasAlarmList.slice(0, 5)" :key="'gas-'+index">
                            <div class="alarm-big-face">{{ alarm.working_face_name }}</div>
                            <div class="alarm-big-sensor">{{ alarm.sensor_name }}</div>
                            <div class="alarm-big-value">
                                <strong>{{ alarm.value.toFixed(4) }}</strong> {{ alarm.unit }}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="alarm-big-panel">
                    <div class="alarm-big-header">
                        <span class="alarm-big-icon">📋</span>
                        <h3 class="alarm-big-title">实时告警列表</h3>
                        <span class="alarm-big-count">{{ alarmList.length }}</span>
                    </div>
                    <div class="alarm-big-list">
                        <div class="alarm-big-item" v-for="(alarm, index) in alarmList.slice(0, 8)" :key="index">
                            <div class="alarm-big-time">{{ alarm.collect_time }}</div>
                            <div class="alarm-big-info">
                                <span class="alarm-big-face">{{ alarm.working_face_name }}</span>
                                <span class="alarm-big-sensor">{{ alarm.sensor_name }}</span>
                            </div>
                            <div class="alarm-big-value">
                                {{ getSensorLabel(alarm.sensor_type) }}: 
                                <strong>{{ alarm.value.toFixed(4) }}</strong> {{ alarm.unit }}
                            </div>
                        </div>
                        <div class="no-alarm" v-if="alarmList.length === 0">
                            <span class="no-alarm-icon">✅</span>
                            <span>暂无告警</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="screen-footer">
            <div class="footer-left">
                <span class="footer-item">系统状态: <span class="status-online">● 运行正常</span></span>
                <span class="footer-item">数据更新: {{ lastUpdateTime }}</span>
            </div>
            <div class="footer-center">
                <span class="footer-tip">按 F11 切换全屏 | 点击左侧工作面切换查看 | Esc 退出</span>
            </div>
            <div class="footer-right">
                <span class="footer-item">版本号: V1.0.0</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../utils/request'

const router = useRouter()

const workingFaces = ref([])
const sensorData = ref([])
const lastUpdateTime = ref('--:--:--')
const currentTime = ref('')
const currentDate = ref('')
const currentFaceIndex = ref(0)
const autoPlay = ref(true)
const isFullscreen = ref(false)
const flashOn = ref(true)

let ws = null
let reconnectTimer = null
let autoPlayTimer = null
let timeTimer = null
let flashTimer = null

const normalCount = computed(() => sensorData.value.filter(s => s.is_over_limit === 0).length)
const alarmCount = computed(() => sensorData.value.filter(s => s.is_over_limit === 1).length)
const alarmList = computed(() => sensorData.value.filter(s => s.is_over_limit === 1))
const gasAlarmList = computed(() => sensorData.value.filter(s => s.sensor_type === 'gas' && s.is_over_limit === 1))
const hasGasAlarm = computed(() => gasAlarmList.value.length > 0)
const currentFace = computed(() => workingFaces.value[currentFaceIndex.value] || null)

const getFaceSensors = (faceId) => {
    return sensorData.value.filter(s => s.working_face_id === faceId)
}

const isFaceAlarm = (faceId) => {
    return sensorData.value.some(s => s.working_face_id === faceId && s.is_over_limit === 1)
}

const getSensorIcon = (type) => {
    const icons = {
        gas: '⛽',
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

const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toTimeString().substring(0, 8)
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`
}

const selectFace = (index) => {
    currentFaceIndex.value = index
    if (autoPlay.value) {
        resetAutoPlay()
    }
}

const resetAutoPlay = () => {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer)
    }
    if (autoPlay.value && workingFaces.value.length > 1) {
        autoPlayTimer = setInterval(() => {
            currentFaceIndex.value = (currentFaceIndex.value + 1) % workingFaces.value.length
        }, 8000)
    }
}

const toggleAutoPlay = () => {
    autoPlay.value = !autoPlay.value
    if (autoPlay.value) {
        resetAutoPlay()
    } else {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer)
            autoPlayTimer = null
        }
    }
}

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            isFullscreen.value = true
        }).catch(err => {
            console.error('全屏失败:', err)
        })
    } else {
        document.exitFullscreen().then(() => {
            isFullscreen.value = false
        })
    }
}

const goBack = () => {
    if (document.fullscreenElement) {
        document.exitFullscreen()
    }
    router.push('/dashboard')
}

const handleKeydown = (e) => {
    if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
    } else if (e.key === 'Escape') {
        isFullscreen.value = false
    } else if (e.key === 'ArrowLeft') {
        if (currentFaceIndex.value > 0) {
            selectFace(currentFaceIndex.value - 1)
        }
    } else if (e.key === 'ArrowRight') {
        if (currentFaceIndex.value < workingFaces.value.length - 1) {
            selectFace(currentFaceIndex.value + 1)
        }
    } else if (e.key === ' ') {
        e.preventDefault()
        toggleAutoPlay()
    }
}

const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
}

const fetchData = async () => {
    try {
        const res = await axios.get('/realtime')
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
        const res = await axios.get('/working-faces')
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
    const wsUrl = `${protocol}//${host}:3002`
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
    document.body.classList.add('big-screen-mode')
    
    updateTime()
    timeTimer = setInterval(updateTime, 1000)
    
    flashTimer = setInterval(() => {
        flashOn.value = !flashOn.value
    }, 800)

    await fetchWorkingFaces()
    await fetchData()
    connectWebSocket()

    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    resetAutoPlay()
})

onUnmounted(() => {
    document.body.classList.remove('big-screen-mode')
    
    if (ws) ws.close()
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (autoPlayTimer) clearInterval(autoPlayTimer)
    if (timeTimer) clearInterval(timeTimer)
    if (flashTimer) clearInterval(flashTimer)
    
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.big-screen {
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #fff;
    font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
}

.big-screen.alarm-flash::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 0, 0, 0.08);
    pointer-events: none;
    z-index: 100;
    animation: alarmFlash 0.8s infinite;
}

@keyframes alarmFlash {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
}

.screen-header {
    height: 70px;
    background: linear-gradient(180deg, rgba(26, 58, 92, 0.9) 0%, rgba(13, 33, 55, 0.6) 100%);
    border-bottom: 2px solid rgba(0, 212, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    box-shadow: 0 2px 20px rgba(0, 212, 255, 0.1);
    position: relative;
    z-index: 2;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-icon {
    font-size: 32px;
}

.header-title {
    font-size: 24px;
    font-weight: bold;
    background: linear-gradient(90deg, #00d4ff, #52c41a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2px;
}

.header-center {
    text-align: center;
}

.current-time {
    font-size: 28px;
    font-weight: bold;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
    letter-spacing: 3px;
}

.current-date {
    font-size: 13px;
    color: #8ab4d8;
    margin-top: 2px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.header-stat {
    text-align: right;
}

.stat-label {
    font-size: 12px;
    color: #8ab4d8;
    display: block;
}

.stat-value.face-name {
    font-size: 18px;
    font-weight: bold;
    color: #00d4ff;
}

.control-btn {
    background: linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%);
    border: 1px solid rgba(0, 212, 255, 0.4);
    color: #00d4ff;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
}

.control-btn:hover {
    background: rgba(0, 212, 255, 0.2);
    border-color: #00d4ff;
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

.screen-body {
    flex: 1;
    display: flex;
    padding: 20px;
    gap: 20px;
    overflow: hidden;
    position: relative;
    z-index: 1;
}

.body-left {
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex-shrink: 0;
}

.panel-title {
    font-size: 16px;
    color: #00d4ff;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(0, 212, 255, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
}

.panel-title::before {
    content: '';
    width: 4px;
    height: 16px;
    background: linear-gradient(180deg, #00d4ff, #52c41a);
    border-radius: 2px;
}

.summary-panel,
.face-nav-panel,
.alarm-big-panel {
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.5) 0%, rgba(13, 33, 55, 0.5) 100%);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 10px;
    padding: 16px;
}

.summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.summary-item {
    background: rgba(13, 33, 55, 0.6);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(0, 212, 255, 0.1);
}

.summary-item.safe {
    border-color: rgba(82, 196, 26, 0.3);
}

.summary-item.danger {
    border-color: rgba(255, 77, 79, 0.4);
    background: rgba(58, 26, 26, 0.5);
}

.summary-icon {
    font-size: 28px;
}

.summary-value {
    font-size: 24px;
    font-weight: bold;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
}

.summary-item.safe .summary-value {
    color: #52c41a;
}

.summary-item.danger .summary-value {
    color: #ff4d4f;
}

.summary-label {
    font-size: 12px;
    color: #8ab4d8;
    margin-top: 2px;
}

.face-nav-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.face-nav-list {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;
}

.face-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 8px;
    background: rgba(13, 33, 55, 0.6);
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid rgba(0, 212, 255, 0.1);
    transition: all 0.3s;
}

.face-nav-item:hover {
    background: rgba(0, 212, 255, 0.1);
    border-color: rgba(0, 212, 255, 0.3);
}

.face-nav-item.active {
    background: linear-gradient(90deg, rgba(0, 212, 255, 0.2) 0%, transparent 100%);
    border-color: #00d4ff;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
}

.face-nav-item.face-alarm {
    border-color: rgba(255, 77, 79, 0.4);
}

.face-nav-item.face-alarm.active {
    background: linear-gradient(90deg, rgba(255, 77, 79, 0.2) 0%, transparent 100%);
    box-shadow: 0 0 10px rgba(255, 77, 79, 0.2);
}

.face-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #52c41a;
    box-shadow: 0 0 6px #52c41a;
    flex-shrink: 0;
}

.face-nav-item.face-alarm .face-indicator {
    background: #ff4d4f;
    box-shadow: 0 0 6px #ff4d4f;
    animation: pulse 1s infinite;
}

.face-nav-name {
    flex: 1;
    font-size: 13px;
    color: #fff;
    font-weight: 500;
}

.face-nav-status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
}

.status-safe {
    background: rgba(82, 196, 26, 0.2);
    color: #52c41a;
}

.status-danger {
    background: rgba(255, 77, 79, 0.2);
    color: #ff4d4f;
}

.carousel-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid rgba(0, 212, 255, 0.1);
}

.carousel-btn {
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid rgba(0, 212, 255, 0.3);
    color: #00d4ff;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s;
}

.carousel-btn:hover {
    background: rgba(0, 212, 255, 0.2);
}

.carousel-btn.active {
    background: rgba(82, 196, 26, 0.2);
    border-color: #52c41a;
    color: #52c41a;
}

.carousel-info {
    font-size: 13px;
    color: #8ab4d8;
    font-family: 'Courier New', monospace;
}

.body-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.main-face-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid rgba(0, 212, 255, 0.2);
}

.main-face-title {
    font-size: 28px;
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 6px;
}

.face-indicator-large {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #52c41a;
    box-shadow: 0 0 12px #52c41a;
}

.face-indicator-large.face-alarm {
    background: #ff4d4f;
    box-shadow: 0 0 16px #ff4d4f;
    animation: pulse 0.8s infinite;
}

.main-face-location {
    font-size: 15px;
    color: #8ab4d8;
    margin-left: 28px;
}

.sensors-big-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    align-content: start;
    overflow-y: auto;
    padding-right: 10px;
}

.sensor-big-card {
    background: linear-gradient(135deg, rgba(26, 58, 92, 0.6) 0%, rgba(13, 33, 55, 0.8) 100%);
    border: 2px solid rgba(0, 212, 255, 0.2);
    border-radius: 12px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
}

.sensor-big-card:hover {
    border-color: rgba(0, 212, 255, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(0, 212, 255, 0.15);
}

.sensor-big-card.sensor-alarm {
    border-color: rgba(255, 77, 79, 0.5);
    background: linear-gradient(135deg, rgba(58, 26, 26, 0.6) 0%, rgba(33, 13, 13, 0.8) 100%);
}

.sensor-big-card.gas-alarm-card {
    animation: cardAlarmPulse 1s infinite;
}

@keyframes cardAlarmPulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 77, 79, 0.3); }
    50% { box-shadow: 0 0 30px rgba(255, 77, 79, 0.6); }
}

.sensor-big-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
}

.sensor-big-icon {
    font-size: 28px;
}

.sensor-big-name {
    flex: 1;
    font-size: 15px;
    color: #fff;
    font-weight: 600;
}

.sensor-type-badge {
    font-size: 11px;
    color: #00d4ff;
    background: rgba(0, 212, 255, 0.15);
    padding: 3px 8px;
    border-radius: 4px;
}

.sensor-big-value {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 18px;
}

.big-value {
    font-size: 48px;
    font-weight: bold;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
    line-height: 1;
    text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.big-value.value-alarm {
    color: #ff4d4f;
    text-shadow: 0 0 20px rgba(255, 77, 79, 0.4);
    animation: valueBlink 1s infinite;
}

@keyframes valueBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

.big-unit {
    font-size: 16px;
    color: #8ab4d8;
}

.sensor-big-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}

.threshold-info {
    font-size: 13px;
    color: #6b8cae;
}

.threshold-label {
    margin-right: 6px;
}

.threshold-value {
    font-family: 'Courier New', monospace;
    color: #8ab4d8;
}

.status-badge {
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: 600;
}

.badge-safe {
    background: rgba(82, 196, 26, 0.2);
    color: #52c41a;
    border: 1px solid rgba(82, 196, 26, 0.3);
}

.badge-danger {
    background: rgba(255, 77, 79, 0.2);
    color: #ff4d4f;
    border: 1px solid rgba(255, 77, 79, 0.3);
}

.sensor-big-progress {
    position: relative;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: visible;
}

.progress-bar-big {
    height: 100%;
    background: linear-gradient(90deg, #52c41a, #00d4ff);
    border-radius: 4px;
    transition: width 0.5s ease;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.progress-bar-big.progress-danger {
    background: linear-gradient(90deg, #ff4d4f, #ff7875);
    box-shadow: 0 0 10px rgba(255, 77, 79, 0.4);
}

.progress-percent {
    position: absolute;
    right: 0;
    top: -20px;
    font-size: 12px;
    color: #6b8cae;
    font-family: 'Courier New', monospace;
}

.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6b8cae;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.5;
}

.empty-text {
    font-size: 18px;
}

.body-right {
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex-shrink: 0;
}

.alarm-big-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.alarm-big-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    margin-bottom: 12px;
    border-bottom: 2px solid rgba(255, 77, 79, 0.3);
}

.alarm-big-icon {
    font-size: 22px;
}

.alarm-big-icon.alarm-pulse {
    animation: pulse 0.8s infinite;
}

.alarm-big-title {
    flex: 1;
    font-size: 15px;
    color: #ff4d4f;
    font-weight: 600;
}

.alarm-big-count {
    background: #ff4d4f;
    color: #fff;
    padding: 2px 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
}

.alarm-big-count.alarm-blink {
    animation: countBlink 1s infinite;
}

@keyframes countBlink {
    0%, 100% { background: #ff4d4f; }
    50% { background: #ff7875; }
}

.alarm-big-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 5px;
}

.alarm-big-item {
    background: rgba(255, 77, 79, 0.1);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    border-left: 3px solid #ff4d4f;
}

.alarm-big-item.gas-alarm-item {
    background: rgba(255, 77, 79, 0.15);
    border-left-color: #ff4d4f;
    animation: itemPulse 1.5s infinite;
}

@keyframes itemPulse {
    0%, 100% { background: rgba(255, 77, 79, 0.1); }
    50% { background: rgba(255, 77, 79, 0.2); }
}

.alarm-big-face {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
}

.alarm-big-sensor {
    font-size: 12px;
    color: #8ab4d8;
    margin-bottom: 6px;
}

.alarm-big-value {
    font-size: 16px;
    color: #ff4d4f;
}

.alarm-big-value strong {
    font-size: 20px;
    font-family: 'Courier New', monospace;
}

.alarm-big-time {
    font-size: 11px;
    color: #ff7875;
    font-family: 'Courier New', monospace;
    margin-bottom: 4px;
}

.alarm-big-info {
    margin-bottom: 4px;
}

.alarm-big-info .alarm-big-face {
    font-size: 12px;
    margin-right: 8px;
}

.alarm-big-info .alarm-big-sensor {
    font-size: 11px;
}

.no-alarm {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #52c41a;
    font-size: 14px;
    gap: 10px;
}

.no-alarm-icon {
    font-size: 36px;
}

.screen-footer {
    height: 40px;
    background: linear-gradient(0deg, rgba(26, 58, 92, 0.8) 0%, rgba(13, 33, 55, 0.4) 100%);
    border-top: 1px solid rgba(0, 212, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    font-size: 12px;
    color: #6b8cae;
    position: relative;
    z-index: 2;
}

.status-online {
    color: #52c41a;
}

.footer-left,
.footer-right {
    display: flex;
    gap: 20px;
}

.footer-tip {
    color: #4a6b8c;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
}

.alarm-pulse {
    animation: pulse 0.8s infinite;
}

.alarm-blink {
    animation: alarmBlink 1s infinite;
}

@keyframes alarmBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.fullscreen-mode .screen-header {
    height: 80px;
}

.fullscreen-mode .header-title {
    font-size: 28px;
}

.fullscreen-mode .current-time {
    font-size: 32px;
}

.fullscreen-mode .big-value {
    font-size: 56px;
}

::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: rgba(0, 212, 255, 0.05);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.3);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 212, 255, 0.5);
}
</style>
