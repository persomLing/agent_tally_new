import { validateBillForm, validateMemoContent } from '@/utils/validator'

describe('validator utils', () => {
  describe('validateBillForm', () => {
    const validData = {
      type: 'expense' as const,
      amount: '100',
      categoryCode: 'expense_food',
      billDate: '2026-05-19',
    }

    it('passes valid data', () => {
      const result = validateBillForm(validData)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rejects missing type', () => {
      const result = validateBillForm({ ...validData, type: '' as any })
      expect(result.valid).toBe(false)
    })

    it('rejects invalid type', () => {
      const result = validateBillForm({ ...validData, type: 'invalid' as any })
      expect(result.valid).toBe(false)
    })

    it('rejects empty amount', () => {
      const result = validateBillForm({ ...validData, amount: '' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('请输入金额')
    })

    it('rejects zero amount', () => {
      const result = validateBillForm({ ...validData, amount: '0' })
      expect(result.valid).toBe(false)
    })

    it('rejects missing category', () => {
      const result = validateBillForm({ ...validData, categoryCode: '' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('请选择分类')
    })

    it('rejects invalid category code', () => {
      const result = validateBillForm({ ...validData, categoryCode: 'invalid_code' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('分类不存在')
    })

    it('rejects type-category mismatch', () => {
      // income category used with expense type
      const result = validateBillForm({ ...validData, categoryCode: 'income_salary' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('分类与类型不匹配')
    })

    it('rejects invalid date', () => {
      const result = validateBillForm({ ...validData, billDate: '2026/05/19' })
      expect(result.valid).toBe(false)
    })

    it('accepts income type', () => {
      const result = validateBillForm({
        type: 'income',
        amount: '5000',
        categoryCode: 'income_salary',
        billDate: '2026-05-19',
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('validateMemoContent', () => {
    it('accepts valid content', () => {
      const result = validateMemoContent('午餐')
      expect(result.valid).toBe(true)
    })

    it('rejects empty content', () => {
      const result = validateMemoContent('')
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only content', () => {
      const result = validateMemoContent('   ')
      expect(result.valid).toBe(false)
    })

    it('rejects overly long content', () => {
      const result = validateMemoContent('a'.repeat(201))
      expect(result.valid).toBe(false)
    })

    it('accepts max-length content', () => {
      const result = validateMemoContent('a'.repeat(200))
      expect(result.valid).toBe(true)
    })
  })
})
