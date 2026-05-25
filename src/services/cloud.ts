import type { CloudResult } from '@/types'
import { getErrorMessage } from '@/constants/error-codes'

const CLOUD_TIMEOUT_MS = 30000

function ensureInit() {
  if (typeof wx?.cloud?.init === 'function') {
    try {
      // @ts-ignore WeChat SDK
      wx.cloud.init({ env: import.meta.env.VITE_WX_CLOUD_ENV || 'cloud1-d2goyji7jb6c9f8b5', traceUser: true })
    } catch {
      // cloud SDK unavailable
    }
  }
}

export function initCloud() {
  ensureInit()
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

    ensureInit()

    if (typeof wx?.cloud?.callFunction !== 'function') {
      return {
        success: false,
        errorCode: 'CLOUD_UNAVAILABLE',
        message: '云开发 SDK 不可用，请确认已开通云开发环境',
      }
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('云函数调用超时，请检查网络或云环境')), CLOUD_TIMEOUT_MS)
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
