import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Statistics from '../views/Statistics.vue'

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'Dashboard', component: Dashboard },
    { path: '/statistics', name: 'Statistics', component: Statistics }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
