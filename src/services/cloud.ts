/**
 * Cloud function invocation wrapper
 * Abstracts WeChat cloud function calls and provides unified error handling.
 */

import type { CloudResult } from '@/types'
import { getErrorMessage } from '@/constants/error-codes'

/**
 * Simulated cloud function call.
 * In production, this would use wx.cloud.callFunction().
 * For testing/development, we can inject mock handlers.
 */

// Mock registry — allows tests and dev to provide implementations
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
    // In production: const res = await wx.cloud.callFunction({ name, data: params })
    // For now, use mock registry or throw a meaningful error
    if (mockHandlers.has(name)) {
      const handler = mockHandlers.get(name)!
      const result = await Promise.resolve(handler(params))
      return result as CloudResult<T>
    }

    // In production, the SDK handles this
    // For standalone dev, throw a clear message
    throw new Error(`Cloud function "${name}" not mocked. Register with __registerMock().`)
  } catch (err: any) {
    // Catch and normalize errors
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

/** Convenience wrapper: unwrap data or throw */
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
