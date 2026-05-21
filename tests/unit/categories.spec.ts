import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ALL_CATEGORIES,
  getCategoriesByType,
  getCategory,
  isValidCategory,
  getCategoryName,
} from '@/constants/categories'

describe('categories', () => {
  describe('EXPENSE_CATEGORIES', () => {
    it('has exactly 10 expense categories', () => {
      expect(EXPENSE_CATEGORIES).toHaveLength(10)
    })

    it('each has required fields', () => {
      EXPENSE_CATEGORIES.forEach(c => {
        expect(c.code).toMatch(/^expense_/)
        expect(c.type).toBe('expense')
        expect(c.name).toBeTruthy()
        expect(c.icon).toBeTruthy()
        expect(c.color).toMatch(/^#/)
        expect(c.sort).toBeGreaterThan(0)
      })
    })

    it('includes "其他" category', () => {
      const other = EXPENSE_CATEGORIES.find(c => c.code === 'expense_other')
      expect(other).toBeDefined()
      expect(other!.name).toBe('其他')
    })
  })

  describe('INCOME_CATEGORIES', () => {
    it('has exactly 7 income categories', () => {
      expect(INCOME_CATEGORIES).toHaveLength(7)
    })

    it('each has required fields', () => {
      INCOME_CATEGORIES.forEach(c => {
        expect(c.code).toMatch(/^income_/)
        expect(c.type).toBe('income')
        expect(c.name).toBeTruthy()
        expect(c.icon).toBeTruthy()
        expect(c.color).toMatch(/^#/)
        expect(c.sort).toBeGreaterThan(0)
      })
    })

    it('includes "其他" category', () => {
      const other = INCOME_CATEGORIES.find(c => c.code === 'income_other')
      expect(other).toBeDefined()
      expect(other!.name).toBe('其他')
    })
  })

  describe('ALL_CATEGORIES', () => {
    it('contains all categories', () => {
      expect(ALL_CATEGORIES).toHaveLength(17) // 10 expense + 7 income
    })
  })

  describe('getCategoriesByType', () => {
    it('returns expense categories', () => {
      const cats = getCategoriesByType('expense')
      expect(cats).toHaveLength(10)
      cats.forEach(c => expect(c.type).toBe('expense'))
    })

    it('returns income categories', () => {
      const cats = getCategoriesByType('income')
      expect(cats).toHaveLength(7)
      cats.forEach(c => expect(c.type).toBe('income'))
    })
  })

  describe('getCategory', () => {
    it('finds category by code', () => {
      const cat = getCategory('expense_food')
      expect(cat).toBeDefined()
      expect(cat!.name).toBe('餐饮')
    })

    it('returns undefined for unknown code', () => {
      const cat = getCategory('nonexistent')
      expect(cat).toBeUndefined()
    })
  })

  describe('isValidCategory', () => {
    it('validates known category', () => {
      expect(isValidCategory('expense_food')).toBe(true)
    })

    it('rejects unknown category', () => {
      expect(isValidCategory('invalid')).toBe(false)
    })

    it('validates category with type match', () => {
      expect(isValidCategory('expense_food', 'expense')).toBe(true)
    })

    it('rejects category with type mismatch', () => {
      expect(isValidCategory('expense_food', 'income')).toBe(false)
    })
  })

  describe('getCategoryName', () => {
    it('returns correct name', () => {
      expect(getCategoryName('expense_food')).toBe('餐饮')
    })

    it('returns code as fallback for unknown', () => {
      expect(getCategoryName('unknown')).toBe('unknown')
    })
  })

  describe('Other category independence', () => {
    it('expense_other and income_other are separate', () => {
      const expenseOther = getCategory('expense_other')
      const incomeOther = getCategory('income_other')
      expect(expenseOther).toBeDefined()
      expect(incomeOther).toBeDefined()
      expect(expenseOther!.type).toBe('expense')
      expect(incomeOther!.type).toBe('income')
      expect(expenseOther!.code).not.toBe(incomeOther!.code)
    })
  })

  describe('category codes are unique', () => {
    it('no duplicate codes across all categories', () => {
      const codes = ALL_CATEGORIES.map(c => c.code)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(codes.length)
    })
  })
})
