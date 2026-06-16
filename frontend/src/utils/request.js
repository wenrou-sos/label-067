import axios from 'axios'

const request = axios.create({
    baseURL: '/api',
    timeout: 10000
})

request.interceptors.request.use(
    config => {
        const fullUrl = config.baseURL + config.url
        console.log(`[Request] ${config.method?.toUpperCase()} ${fullUrl}`)
        return config
    },
    error => Promise.reject(error)
)

request.interceptors.response.use(
    response => {
        console.log(`[Response] ${response.config.method?.toUpperCase()} ${response.config.url} -> status: ${response.status}`)
        return response.data
    },
    error => {
        const url = error.config?.baseURL + error.config?.url
        console.error('[Request Error]', url, error.message)
        if (error.response) {
            console.error('[Response Error] status:', error.response.status, 'data:', error.response.data)
        }
        return Promise.reject(error)
    }
)

export default request
