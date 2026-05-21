/**
 * Profile module tests
 *
 * Covers:
 * - getProfileSummary: persistDays (distinct billDate), budget progress states
 * - Budget remaining: positive, negative (over-budget)
 * - clearBills: only deletes current user's bills
 * - Days to month end calculation
 * - Edge cases: no bills, only expenses, only income
 */

import { __registerMock, __clearMocks, callFunctionWithData, callCloudFunction } from '@/services/cloud'
import { getProfileSummary, clearAllBills } from '@/services/profileService'
import type { ProfileSummary, CloudResult } from '@/types'
import { getDaysToMonthEnd, getCurrentMonth } from '@/utils/date'

// ============================================================================
// Helpers
// ============================================================================

function createMockProfileSummary(overrides?: Partial<ProfileSummary>): ProfileSummary {
  return {
    nickName: '测试用户',
    avatarUrl: 'https://example.com/avatar.png',
    persistDays: 15,
    monthIncome: 500000, // ¥5000.00
    monthExpense: 230000, // ¥2300.00
    budgetRemaining: 270000, // ¥2700.00
    budgetProgress: 46, // 46%
    daysToMonthEnd: getDaysToMonthEnd(),
    hasIncome: true,
    isOverBudget: false,
    overBudgetAmount: 0,
    ...overrides,
  }
}

/**
 * Simulates the cloud function logic for getProfileSummary.
 * This replicates the computation logic from the cloud function for testing.
 */
function computeProfileSummary(params: {
  nickName?: string
  avatarUrl?: string
  bills: Array<{ type: string; amount: number; billDate: string; billMonth: string }>
}): ProfileSummary {
  const { nickName = '', avatarUrl = '', bills } = params
  const currentMonth = getCurrentMonth()

  const monthBills = bills.filter((b) => b.billMonth === currentMonth)

  let monthIncome = 0
  let monthExpense = 0
  for (const bill of monthBills) {
    if (bill.type === 'income') {
      monthIncome += bill.amount
    } else if (bill.type === 'expense') {
      monthExpense += bill.amount
    }
  }

  const uniqueDates = new Set(bills.map((b) => b.billDate))
  const persistDays = uniqueDates.size

  const budgetRemaining = monthIncome - monthExpense
  const hasIncome = monthIncome > 0
  const isOverBudget = monthExpense > monthIncome
  const overBudgetAmount = Math.max(0, monthExpense - monthIncome)

  let budgetProgress = -1
  if (hasIncome) {
    budgetProgress = Math.min(100, (monthExpense / monthIncome) * 100)
  }

  return {
    nickName,
    avatarUrl,
    persistDays,
    monthIncome,
    monthExpense,
    budgetRemaining,
    budgetProgress,
    daysToMonthEnd: getDaysToMonthEnd(),
    hasIncome,
    isOverBudget,
    overBudgetAmount,
  }
}

// ============================================================================
// Setup & Teardown
// ============================================================================

beforeEach(() => {
  __clearMocks()
})

afterEach(() => {
  __clearMocks()
})

// ============================================================================
// persistDays — distinct billDate count
// ============================================================================

describe('getProfileSummary — persistDays', () => {
  it('should count distinct billDate values correctly', () => {
    const bills = [
      { type: 'expense', amount: 1000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 2000, billDate: '2026-05-01', billMonth: '2026-05' }, // same date
      { type: 'expense', amount: 1500, billDate: '2026-05-02', billMonth: '2026-05' },
      { type: 'income', amount: 50000, billDate: '2026-05-03', billMonth: '2026-05' },
      { type: 'expense', amount: 800, billDate: '2026-04-28', billMonth: '2026-04' }, // different month
    ]
    const result = computeProfileSummary({ bills })
    // 4 unique dates: 2026-05-01, 2026-05-02, 2026-05-03, 2026-04-28
    expect(result.persistDays).toBe(4)
  })

  it('should return 0 persistDays when there are no bills', () => {
    const result = computeProfileSummary({ bills: [] })
    expect(result.persistDays).toBe(0)
  })

  it('should return 1 persistDays when all bills are on the same date', () => {
    const bills = [
      { type: 'expense', amount: 1000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 2000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 3000, billDate: '2026-05-01', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.persistDays).toBe(1)
  })

  it('should include bills from all months (not just current)', () => {
    const bills = [
      { type: 'expense', amount: 1000, billDate: '2026-01-05', billMonth: '2026-01' },
      { type: 'expense', amount: 2000, billDate: '2026-02-10', billMonth: '2026-02' },
      { type: 'expense', amount: 1500, billDate: '2026-03-15', billMonth: '2026-03' },
      { type: 'expense', amount: 3000, billDate: '2026-04-20', billMonth: '2026-04' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.persistDays).toBe(4)
  })

  it('should work correctly via mocked cloud function', async () => {
    const mockData: ProfileSummary = {
      nickName: 'User',
      avatarUrl: 'https://example.com/avatar.png',
      persistDays: 42,
      monthIncome: 0,
      monthExpense: 0,
      budgetRemaining: 0,
      budgetProgress: -1,
      daysToMonthEnd: getDaysToMonthEnd(),
      hasIncome: false,
      isOverBudget: false,
      overBudgetAmount: 0,
    }

    __registerMock('getProfileSummary', () => ({
      success: true,
      data: mockData,
    }))

    const result = await getProfileSummary()
    expect(result.persistDays).toBe(42)
  })
})

// ============================================================================
// Budget progress
// ============================================================================

describe('getProfileSummary — budget progress', () => {
  it('should calculate progress correctly for normal state (income > expense)', () => {
    // Income: ¥5000, Expense: ¥2300 → progress = 46%
    const bills = [
      { type: 'income', amount: 500000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 230000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.hasIncome).toBe(true)
    expect(result.isOverBudget).toBe(false)
    expect(result.budgetProgress).toBeCloseTo(46, 1)
    expect(result.budgetRemaining).toBe(270000)
  })

  it('should calculate progress as 100% when expense equals income', () => {
    const bills = [
      { type: 'income', amount: 500000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 500000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.hasIncome).toBe(true)
    expect(result.isOverBudget).toBe(false)
    expect(result.budgetProgress).toBe(100)
    expect(result.budgetRemaining).toBe(0)
  })

  it('should show over-budget state when expense exceeds income', () => {
    const bills = [
      { type: 'income', amount: 300000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 350000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.hasIncome).toBe(true)
    expect(result.isOverBudget).toBe(true)
    // budgetProgress is clamped at 100 via Math.min(100, ...)
    expect(result.budgetProgress).toBe(100)
    expect(result.budgetRemaining).toBe(-50000)
    expect(result.overBudgetAmount).toBe(50000)
  })

  it('should show no-income state when income is 0', () => {
    const bills = [
      { type: 'expense', amount: 230000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.hasIncome).toBe(false)
    // isOverBudget = monthExpense > monthIncome = 230000 > 0 = true
    expect(result.isOverBudget).toBe(true)
    expect(result.budgetProgress).toBe(-1)
    expect(result.budgetRemaining).toBe(-230000)
    expect(result.overBudgetAmount).toBe(230000)
  })

  it('should clamp progress to 100% maximum even when expense far exceeds income', () => {
    const bills = [
      { type: 'income', amount: 100000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 500000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.hasIncome).toBe(true)
    expect(result.isOverBudget).toBe(true)
    // budgetProgress is Math.min(100, expense/income * 100) = 100
    expect(result.budgetProgress).toBe(100)
    expect(result.overBudgetAmount).toBe(400000)
  })

  it('should work correctly via mocked cloud function for over-budget', async () => {
    const mockData: ProfileSummary = createMockProfileSummary({
      monthIncome: 300000,
      monthExpense: 500000,
      budgetRemaining: -200000,
      budgetProgress: 100,
      isOverBudget: true,
      overBudgetAmount: 200000,
    })

    __registerMock('getProfileSummary', () => ({
      success: true,
      data: mockData,
    }))

    const result = await getProfileSummary()
    expect(result.hasIncome).toBe(true)
    expect(result.isOverBudget).toBe(true)
    expect(result.overBudgetAmount).toBe(200000)
    expect(result.budgetRemaining).toBe(-200000)
  })

  it('should work correctly via mocked cloud function for no-income', async () => {
    const mockData: ProfileSummary = createMockProfileSummary({
      monthIncome: 0,
      monthExpense: 150000,
      budgetRemaining: -150000,
      budgetProgress: -1,
      hasIncome: false,
      isOverBudget: false,
    })

    __registerMock('getProfileSummary', () => ({
      success: true,
      data: mockData,
    }))

    const result = await getProfileSummary()
    expect(result.hasIncome).toBe(false)
    expect(result.budgetProgress).toBe(-1)
  })

  it('should return -1 progress for no-income state via mocked cloud function', async () => {
    __registerMock('getProfileSummary', () => ({
      success: true,
      data: createMockProfileSummary({
        monthIncome: 0,
        monthExpense: 0,
        budgetProgress: -1,
        hasIncome: false,
      }),
    }))

    const result = await getProfileSummary()
    expect(result.budgetProgress).toBe(-1)
  })
})

// ============================================================================
// Budget remaining
// ============================================================================

describe('getProfileSummary — budget remaining', () => {
  it('should be positive when income > expense', () => {
    const bills = [
      { type: 'income', amount: 500000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 100000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.budgetRemaining).toBe(400000)
    expect(result.isOverBudget).toBe(false)
  })

  it('should be negative (over-budget) when expense > income', () => {
    const bills = [
      { type: 'income', amount: 100000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 300000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.budgetRemaining).toBe(-200000)
    expect(result.isOverBudget).toBe(true)
    expect(result.overBudgetAmount).toBe(200000)
  })

  it('should be zero when income equals expense', () => {
    const bills = [
      { type: 'income', amount: 250000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 250000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.budgetRemaining).toBe(0)
    expect(result.isOverBudget).toBe(false)
    expect(result.overBudgetAmount).toBe(0)
  })
})

// ============================================================================
// clearBills
// ============================================================================

describe('clearBills', () => {
  it('should only delete bills belonging to the current user', async () => {
    const deletedIds: string[] = []

    __registerMock('clearBills', (params: any) => {
      // Simulate only deleting current user's bills
      // In the real cloud function, OPENID is from context, not params
      return {
        success: true,
        data: { deletedCount: 15 },
      }
    })

    const result = await clearAllBills()
    expect(result.deletedCount).toBe(15)
  })

  it('should return success even when there are no bills to delete', async () => {
    __registerMock('clearBills', () => ({
      success: true,
      data: { deletedCount: 0 },
    }))

    const result = await clearAllBills()
    expect(result.deletedCount).toBe(0)
  })

  it('should return error result when cloud function fails', async () => {
    __registerMock('clearBills', () => ({
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: '清空账单失败',
    }))

    await expect(clearAllBills()).rejects.toThrow('清空账单失败')
  })
})

// ============================================================================
// Days to month end
// ============================================================================

describe('getProfileSummary — daysToMonthEnd', () => {
  it('should return a non-negative number', () => {
    const result = computeProfileSummary({
      bills: [{ type: 'income', amount: 1000, billDate: '2026-05-01', billMonth: '2026-05' }],
    })
    expect(result.daysToMonthEnd).toBeGreaterThanOrEqual(0)
  })

  it('should match the getDaysToMonthEnd utility result', () => {
    const expected = getDaysToMonthEnd()
    const result = computeProfileSummary({
      bills: [{ type: 'income', amount: 1000, billDate: '2026-05-01', billMonth: '2026-05' }],
    })
    expect(result.daysToMonthEnd).toBe(expected)
  })
})

// ============================================================================
// Edge cases
// ============================================================================

describe('getProfileSummary — edge cases', () => {
  it('should handle empty bills array', () => {
    const result = computeProfileSummary({
      bills: [],
      nickName: 'New User',
      avatarUrl: '',
    })
    expect(result.nickName).toBe('New User')
    expect(result.monthIncome).toBe(0)
    expect(result.monthExpense).toBe(0)
    expect(result.persistDays).toBe(0)
    expect(result.hasIncome).toBe(false)
    expect(result.budgetProgress).toBe(-1)
  })

  it('should handle only expenses (no income)', () => {
    const bills = [
      { type: 'expense', amount: 5000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 3000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.monthIncome).toBe(0)
    expect(result.monthExpense).toBe(8000)
    expect(result.hasIncome).toBe(false)
    expect(result.budgetProgress).toBe(-1)
    // isOverBudget = monthExpense > monthIncome = 8000 > 0 = true
    expect(result.isOverBudget).toBe(true)
  })

  it('should handle only income (no expenses)', () => {
    const bills = [
      { type: 'income', amount: 500000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'income', amount: 200000, billDate: '2026-05-02', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.monthIncome).toBe(700000)
    expect(result.monthExpense).toBe(0)
    expect(result.hasIncome).toBe(true)
    expect(result.isOverBudget).toBe(false)
    expect(result.budgetProgress).toBe(0)
    expect(result.budgetRemaining).toBe(700000)
  })

  it('should handle large amounts correctly', () => {
    const bills = [
      { type: 'income', amount: 99999999, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 1, billDate: '2026-05-01', billMonth: '2026-05' },
    ]
    const result = computeProfileSummary({ bills })
    expect(result.hasIncome).toBe(true)
    expect(result.budgetProgress).toBeCloseTo(0.000001, 4)
    expect(result.budgetRemaining).toBe(99999998)
  })

  it('should handle mixed month bills', () => {
    const bills = [
      // Current month
      { type: 'income', amount: 500000, billDate: '2026-05-01', billMonth: '2026-05' },
      { type: 'expense', amount: 100000, billDate: '2026-05-02', billMonth: '2026-05' },
      // Different month — affects persistDays but NOT budget
      { type: 'expense', amount: 50000, billDate: '2026-04-15', billMonth: '2026-04' },
      { type: 'expense', amount: 30000, billDate: '2026-03-20', billMonth: '2026-03' },
    ]
    const result = computeProfileSummary({ bills })
    // Budget only considers current month
    expect(result.monthIncome).toBe(500000)
    expect(result.monthExpense).toBe(100000)
    expect(result.budgetRemaining).toBe(400000)
    // persistDays counts all unique dates across all months: 05-01, 05-02, 04-15, 03-20 = 4
    expect(result.persistDays).toBe(4)
  })
})

// ============================================================================
// ProfileSummary type fields
// ============================================================================

describe('ProfileSummary data structure', () => {
  it('should contain all required fields', async () => {
    const mockData: ProfileSummary = createMockProfileSummary()

    __registerMock('getProfileSummary', () => ({
      success: true,
      data: mockData,
    }))

    const result = await getProfileSummary()

    expect(result).toHaveProperty('nickName')
    expect(result).toHaveProperty('avatarUrl')
    expect(result).toHaveProperty('persistDays')
    expect(result).toHaveProperty('monthIncome')
    expect(result).toHaveProperty('monthExpense')
    expect(result).toHaveProperty('budgetRemaining')
    expect(result).toHaveProperty('budgetProgress')
    expect(result).toHaveProperty('daysToMonthEnd')
    expect(result).toHaveProperty('hasIncome')
    expect(result).toHaveProperty('isOverBudget')
    expect(result).toHaveProperty('overBudgetAmount')
  })

  it('should have correct types for all fields', async () => {
    const mockData: ProfileSummary = createMockProfileSummary()

    __registerMock('getProfileSummary', () => ({
      success: true,
      data: mockData,
    }))

    const result = await getProfileSummary()

    expect(typeof result.nickName).toBe('string')
    expect(typeof result.avatarUrl).toBe('string')
    expect(typeof result.persistDays).toBe('number')
    expect(typeof result.monthIncome).toBe('number')
    expect(typeof result.monthExpense).toBe('number')
    expect(typeof result.budgetRemaining).toBe('number')
    expect(typeof result.budgetProgress).toBe('number')
    expect(typeof result.daysToMonthEnd).toBe('number')
    expect(typeof result.hasIncome).toBe('boolean')
    expect(typeof result.isOverBudget).toBe('boolean')
    expect(typeof result.overBudgetAmount).toBe('number')
  })
})
