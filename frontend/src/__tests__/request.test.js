import { describe, it, expect } from 'vitest'
import request from '../utils/request'

describe('request 请求封装 - /api 前缀防重复', () => {
    it('baseURL 应为 /api', () => {
        expect(request.defaults.baseURL).toBe('/api')
    })

    it('请求拦截器应去除 URL 中重复的 /api 前缀', () => {
        const handler = request.interceptors.request.handlers[0]
        expect(handler).toBeDefined()
        
        const config1 = { url: '/api/realtime' }
        const result1 = handler.fulfilled(config1)
        expect(result1.url).toBe('/realtime')

        const config2 = { url: '/api/statistics/shift' }
        const result2 = handler.fulfilled(config2)
        expect(result2.url).toBe('/statistics/shift')

        const config3 = { url: '/api/working-faces' }
        const result3 = handler.fulfilled(config3)
        expect(result3.url).toBe('/working-faces')
    })

    it('不以 /api 开头的 URL 应保持不变', () => {
        const handler = request.interceptors.request.handlers[0]
        
        const config1 = { url: '/realtime' }
        const result1 = handler.fulfilled(config1)
        expect(result1.url).toBe('/realtime')

        const config2 = { url: '/statistics/daily' }
        const result2 = handler.fulfilled(config2)
        expect(result2.url).toBe('/statistics/daily')
    })

    it('最终拼接路径应正确（baseURL + 去重后的url）', () => {
        const handler = request.interceptors.request.handlers[0]
        
        const cases = [
            { input: '/realtime', expected: '/api/realtime' },
            { input: '/api/realtime', expected: '/api/realtime' },
            { input: '/statistics/year-over-year', expected: '/api/statistics/year-over-year' },
            { input: '/api/statistics/year-over-year', expected: '/api/statistics/year-over-year' },
        ]

        cases.forEach(({ input, expected }) => {
            const config = { url: input }
            const result = handler.fulfilled(config)
            const finalUrl = request.defaults.baseURL + result.url
            expect(finalUrl).toBe(expected)
        })
    })
})
