import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Statistics from '../views/Statistics.vue'
import Alarms from '../views/Alarms.vue'
import DailyReport from '../views/DailyReport.vue'

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'Dashboard', component: Dashboard },
    { path: '/statistics', name: 'Statistics', component: Statistics },
    { path: '/alarms', name: 'Alarms', component: Alarms },
    { path: '/daily-report', name: 'DailyReport', component: DailyReport }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
