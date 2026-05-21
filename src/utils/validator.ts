/**
 * Validation utilities for accounting mini-program
 */

import { getCategoriesByType, getCategory } from '@/constants/categories'
import { isValidDate } from './date'
import { validateAmountInput, AMOUNT_MAX_VALUE } from './money'

export interface ValidationResult {
  valid: boolean
  error?: string
}

/** Validate bill form before submission */
export function validateBillForm(data: {
  type?: string
  amount?: string
  categoryCode?: string
  billDate?: string
}): ValidationResult {
  if (!data.type || (data.type !== 'expense' && data.type !== 'income')) {
    return { valid: false, error: '请选择类型' }
  }

  if (!data.amount || data.amount.trim() === '') {
    return { valid: false, error: '请输入金额' }
  }

  const amountCheck = validateAmountInput(data.amount)
  if (!amountCheck.valid) {
    return { valid: false, error: amountCheck.error }
  }

  if (!data.categoryCode) {
    return { valid: false, error: '请选择分类' }
  }

  const category = getCategory(data.categoryCode)
  if (!category) {
    return { valid: false, error: '分类不存在' }
  }

  if (category.type !== data.type) {
    return { valid: false, error: '分类与类型不匹配' }
  }

  if (!data.billDate || !isValidDate(data.billDate)) {
    return { valid: false, error: '请选择日期' }
  }

  return { valid: true }
}

/** Validate memo content */
export function validateMemoContent(content: string): ValidationResult {
  if (!content || content.trim() === '') {
    return { valid: false, error: '备注内容不能为空' }
  }
  if (content.length > 200) {
    return { valid: false, error: '备注内容过长' }
  }
  return { valid: true }
}

/** Validate amount (re-export for convenience) */
export function validateAmount(amount: string) {
  return validateAmountInput(amount)
}

export { AMOUNT_MAX_VALUE }
