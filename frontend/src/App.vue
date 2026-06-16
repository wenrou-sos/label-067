<template>
    <div class="app-container">
        <header class="app-header">
            <div class="logo">
                <span class="logo-icon">⛏</span>
                <h1>矿山安全监测系统</h1>
            </div>
            <nav class="app-nav">
                <router-link to="/dashboard" class="nav-item" active-class="active">
                    <span class="nav-icon">📊</span>实时监测
                </router-link>
                <router-link to="/statistics" class="nav-item" active-class="active">
                    <span class="nav-icon">📈</span>数据统计
                </router-link>
                <router-link to="/daily-report" class="nav-item" active-class="active">
                    <span class="nav-icon">📋</span>安全生产日报
                </router-link>
                <router-link to="/alarms" class="nav-item alarm-nav" active-class="active">
                    <span class="nav-icon">🚨</span>报警记录
                    <span v-if="unhandledAlarmCount > 0" class="alarm-badge">
                        {{ unhandledAlarmCount > 99 ? '99+' : unhandledAlarmCount }}
                    </span>
                </router-link>
                <router-link to="/big-screen" class="nav-item big-screen-nav" active-class="active">
                    <span class="nav-icon">🖥</span>大屏模式
                </router-link>
            </nav>
            <div class="header-right">
                <span class="current-time">{{ currentTime }}</span>
            </div>
        </header>
        <main class="app-main">
            <router-view />
        </main>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from './utils/request'

const currentTime = ref('')
const unhandledAlarmCount = ref(0)
let timeTimer = null
let alarmTimer = null

const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

const loadUnhandledAlarmCount = async () => {
    try {
        const res = await axios.get('/alarms/summary')
        if (res.code === 200) {
            unhandledAlarmCount.value = res.data.unhandled || 0
        }
    } catch (err) {
        console.error('加载未处理报警数失败:', err)
    }
}

onMounted(() => {
    updateTime()
    loadUnhandledAlarmCount()
    timeTimer = setInterval(updateTime, 1000)
    alarmTimer = setInterval(loadUnhandledAlarmCount, 10000)
})

onUnmounted(() => {
    if (timeTimer) clearInterval(timeTimer)
    if (alarmTimer) clearInterval(alarmTimer)
})
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
    background: #0a1929;
    color: #fff;
}

#app {
    width: 100%;
    min-height: 100vh;
}

.app-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.app-header {
    height: 70px;
    background: linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid #00d4ff;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-icon {
    font-size: 32px;
    color: #00d4ff;
}

.logo h1 {
    font-size: 22px;
    color: #fff;
    font-weight: 600;
    letter-spacing: 2px;
}

.app-nav {
    display: flex;
    gap: 8px;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    color: #8ab4d8;
    text-decoration: none;
    font-size: 15px;
    border-radius: 6px;
    transition: all 0.3s;
}

.nav-item:hover {
    background: rgba(0, 212, 255, 0.1);
    color: #00d4ff;
}

.nav-item.active {
    background: rgba(0, 212, 255, 0.2);
    color: #00d4ff;
    border: 1px solid #00d4ff;
}

.nav-icon {
    font-size: 18px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.current-time {
    font-size: 16px;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
}

.app-main {
    flex: 1;
    padding: 20px;
    overflow: auto;
}

.alarm-nav {
    position: relative;
}

.alarm-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    background: #ff4d4f;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(255, 77, 79, 0.6);
    animation: badgePulse 1.5s infinite;
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

body.big-screen-mode .app-header {
    display: none;
}

body.big-screen-mode .app-main {
    padding: 0;
    overflow: hidden;
}

body.big-screen-mode {
    overflow: hidden;
}
</style>
