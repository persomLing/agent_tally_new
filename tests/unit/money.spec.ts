import {
  yuanToCents,
  centsToYuan,
  formatCents,
  formatAmountWithSign,
  formatAmount,
  validateAmountInput,
  truncateToTwoDecimals,
} from '@/utils/money'

describe('money utils', () => {
  describe('yuanToCents', () => {
    it('converts yuan to cents correctly', () => {
      expect(yuanToCents(100)).toBe(10000)
      expect(yuanToCents('50.50')).toBe(5050)
      expect(yuanToCents(0)).toBe(0)
    })

    it('handles decimal precision', () => {
      expect(yuanToCents(0.01)).toBe(1)
      expect(yuanToCents(9999999.99)).toBe(999999999)
    })

    it('returns 0 for invalid input', () => {
      expect(yuanToCents('abc')).toBe(0)
      expect(yuanToCents(NaN)).toBe(0)
    })
  })

  describe('centsToYuan', () => {
    it('converts cents to yuan correctly', () => {
      expect(centsToYuan(10000)).toBe(100)
      expect(centsToYuan(5050)).toBe(50.5)
      expect(centsToYuan(1)).toBe(0.01)
      expect(centsToYuan(0)).toBe(0)
    })
  })

  describe('formatCents', () => {
    it('formats cents to 2 decimal places', () => {
      expect(formatCents(10000)).toBe('100.00')
      expect(formatCents(5050)).toBe('50.50')
      expect(formatCents(1)).toBe('0.01')
      expect(formatCents(0)).toBe('0.00')
    })
  })

  describe('formatAmountWithSign', () => {
    it('formats expense with minus sign', () => {
      expect(formatAmountWithSign(2000, 'expense')).toBe('-¥20.00')
    })

    it('formats income with plus sign', () => {
      expect(formatAmountWithSign(50000, 'income')).toBe('+¥500.00')
    })

    it('handles zero', () => {
      expect(formatAmountWithSign(0, 'expense')).toBe('-¥0.00')
      expect(formatAmountWithSign(0, 'income')).toBe('+¥0.00')
    })
  })

  describe('formatAmount', () => {
    it('formats without sign', () => {
      expect(formatAmount(12345)).toBe('123.45')
      expect(formatAmount(0)).toBe('0.00')
    })
  })

  describe('validateAmountInput', () => {
    it('accepts valid amounts', () => {
      const result = validateAmountInput('100')
      expect(result.valid).toBe(true)
      expect(result.value).toBe(100)
    })

    it('rejects empty input', () => {
      const result = validateAmountInput('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('请输入金额')
    })

    it('rejects zero', () => {
      const result = validateAmountInput('0')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('金额必须大于 0')
    })

    it('rejects negative numbers', () => {
      const result = validateAmountInput('-10')
      expect(result.valid).toBe(false)
    })

    it('rejects more than 2 decimal places', () => {
      const result = validateAmountInput('10.999')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('两位小数')
    })

    it('accepts 2 decimal places', () => {
      const result = validateAmountInput('10.99')
      expect(result.valid).toBe(true)
      expect(result.value).toBe(10.99)
    })

    it('rejects amount exceeding max', () => {
      const result = validateAmountInput('10000000')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('金额超出限制')
    })
  })

  describe('truncateToTwoDecimals', () => {
    it('truncates to 2 decimal places', () => {
      expect(truncateToTwoDecimals('10.999')).toBe('10.99')
      expect(truncateToTwoDecimals('10.9')).toBe('10.9')
      expect(truncateToTwoDecimals('10')).toBe('10')
    })
  })
})
