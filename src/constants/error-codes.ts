// Unified error codes and messages

export const ErrorCodes = {
  // Auth
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_DENIED: 'AUTH_DENIED',
  NO_OPENID: 'NO_OPENID',

  // Validation
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AMOUNT_ZERO: 'AMOUNT_ZERO',
  AMOUNT_OVERFLOW: 'AMOUNT_OVERFLOW',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_TYPE: 'INVALID_TYPE',

  // Permission
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',

  // General
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_ERROR: 'SERVICE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export const ErrorMessages: Record<string, string> = {
  [ErrorCodes.AUTH_REQUIRED]: '需要授权后才能使用',
  [ErrorCodes.AUTH_FAILED]: '授权失败，请重新授权',
  [ErrorCodes.AUTH_DENIED]: '需要授权微信头像和昵称后才能使用记账功能。',
  [ErrorCodes.NO_OPENID]: '无法获取用户身份',

  [ErrorCodes.INVALID_AMOUNT]: '请输入金额',
  [ErrorCodes.AMOUNT_ZERO]: '金额必须大于 0',
  [ErrorCodes.AMOUNT_OVERFLOW]: '金额超出限制',
  [ErrorCodes.INVALID_CATEGORY]: '请选择分类',
  [ErrorCodes.INVALID_DATE]: '日期无效',
  [ErrorCodes.INVALID_TYPE]: '类型无效',

  [ErrorCodes.PERMISSION_DENIED]: '无权限执行此操作',
  [ErrorCodes.NOT_FOUND]: '数据不存在',

  [ErrorCodes.NETWORK_ERROR]: '网络异常，请稍后重试',
  [ErrorCodes.SERVICE_ERROR]: '服务异常，请稍后重试',
  [ErrorCodes.UNKNOWN_ERROR]: '未知错误',
}

export function getErrorMessage(code: string, fallback?: string): string {
  return ErrorMessages[code] || fallback || ErrorMessages[ErrorCodes.UNKNOWN_ERROR]
}
