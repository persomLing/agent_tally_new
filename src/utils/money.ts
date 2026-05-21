/**
 * Money utilities — store amounts in cents (分), display in yuan (元)
 */

const AMOUNT_MAX = 9999999.99

/** Convert yuan string/float to cents integer */
export function yuanToCents(yuan: number | string): number {
  const num = typeof yuan === 'string' ? parseFloat(yuan) : yuan
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

/** Convert cents integer to yuan float */
export function centsToYuan(cents: number): number {
  return cents / 100
}

/** Format cents to display string, e.g. 12345 -> "123.45" */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Format amount with sign, e.g. cents=12345, type='expense' -> "-¥123.45" */
export function formatAmountWithSign(cents: number, type: 'expense' | 'income'): string {
  const prefix = type === 'expense' ? '-' : '+'
  return `${prefix}¥${formatCents(cents)}`
}

/** Format amount without sign, e.g. cents=12345 -> "123.45" */
export function formatAmount(cents: number): string {
  return formatCents(cents)
}

/** Validate amount string from calculator input */
export function validateAmountInput(input: string): { valid: boolean; value: number; error?: string } {
  if (!input || input.trim() === '') {
    return { valid: false, value: 0, error: '请输入金额' }
  }

  const num = parseFloat(input)
  if (isNaN(num)) {
    return { valid: false, value: 0, error: '请输入有效数字' }
  }

  if (num <= 0) {
    return { valid: false, value: 0, error: '金额必须大于 0' }
  }

  // Check decimal places
  const parts = input.split('.')
  if (parts.length > 1 && parts[1].length > 2) {
    return { valid: false, value: 0, error: '金额最多两位小数' }
  }

  if (num > AMOUNT_MAX) {
    return { valid: false, value: 0, error: '金额超出限制' }
  }

  return { valid: true, value: num }
}

/** Truncate to 2 decimal places without rounding issues */
export function truncateToTwoDecimals(input: string): string {
  const parts = input.split('.')
  if (parts.length > 1 && parts[1].length > 2) {
    return `${parts[0]}.${parts[1].substring(0, 2)}`
  }
  return input
}

export const AMOUNT_MAX_VALUE = AMOUNT_MAX
