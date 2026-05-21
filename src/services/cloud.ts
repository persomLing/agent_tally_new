import type { CloudResult } from '@/types'
import { getErrorMessage } from '@/constants/error-codes'

const CLOUD_TIMEOUT_MS = 8000

let inited = false

export function initCloud() {
  if (inited) return
  inited = true
  try {
    wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: true })
  } catch {
    // cloud SDK unavailable in test mode — calls will fail gracefully
  }
}

// Mock registry — only used in tests
const mockHandlers = new Map<string, (params: any) => any>()

export function __registerMock(name: string, handler: (params: any) => any) {
  mockHandlers.set(name, handler)
}

export function __clearMocks() {
  mockHandlers.clear()
}

export async function callCloudFunction<T = any>(
  name: string,
  params?: Record<string, any>
): Promise<CloudResult<T>> {
  try {
    if (mockHandlers.has(name)) {
      const handler = mockHandlers.get(name)!
      const result = await Promise.resolve(handler(params))
      return result as CloudResult<T>
    }

    if (typeof wx?.cloud?.callFunction !== 'function') {
      return {
        success: false,
        errorCode: 'CLOUD_UNAVAILABLE',
        message: '云开发 SDK 不可用，请在微信公众平台注册 AppID 并开通云开发',
      }
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('云函数调用超时，请检查云环境是否已开通')), CLOUD_TIMEOUT_MS)
    )

    const res = await Promise.race([wx.cloud.callFunction({ name, data: params }), timeout])
    return res.result as CloudResult<T>
  } catch (err: any) {
    if (err.errorCode) {
      return err as CloudResult<T>
    }
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message || getErrorMessage('SERVICE_ERROR'),
    }
  }
}

export async function callFunctionWithData<T = any>(
  name: string,
  params?: Record<string, any>
): Promise<T> {
  const result = await callCloudFunction<T>(name, params)
  if (!result.success) {
    throw new Error(result.message || result.errorCode || '请求失败')
  }
  return result.data as T
}
