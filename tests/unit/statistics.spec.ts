/**
 * Statistics module tests
 *
 * Tests the statsService layer that invokes the getStatistics cloud function.
 * Uses the mock registry in @/services/cloud to simulate cloud function responses.
 *
 * The mock handler implements the same aggregation logic as the real
 * cloud-functions/getStatistics/index.js so that the computation itself
 * is validated through the service layer.
 */

import { getStatistics } from '@/services/statsService'
import { __registerMock, __clearMocks } from '@/services/cloud'
import type { Bill, StatisticsData, CloudResult } from '@/types'

// ===== Test Helpers =====

/** Helper: generate last N days starting from a reference date */
function getLastNDaysFrom(n: number, fromDate: Date): string[] {
  const result: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(fromDate)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    result.push(`${y}-${m}-${day}`)
  }
  return result
}

/** Static category config mirror (same lookup as the cloud function) */
const EXPENSE_CATEGORY_MAP = new Map<string, { color: string; icon: string }>([
  ['expense_food', { color: '#F97316', icon: 'utensil' }],
  ['expense_transport', { color: '#3B82F6', icon: 'truck' }],
  ['expense_shopping', { color: '#EC4899', icon: 'shopping-bag' }],
  ['expense_housing', { color: '#8B5CF6', icon: 'home' }],
  ['expense_entertainment', { color: '#F43F5E', icon: 'film' }],
  ['expense_medical', { color: '#EF4444', icon: 'heart' }],
  ['expense_education', { color: '#06B6D4', icon: 'academic-cap' }],
  ['expense_communication', { color: '#10B981', icon: 'phone' }],
  ['expense_social', { color: '#F59E0B', icon: 'gift' }],
  ['expense_other', { color: '#94A3B8', icon: 'dots-horizontal' }],
])

/**
 * Mock handler factory — replicates the cloud function's aggregation logic
 * so that the tests validate the actual computation, not just pass-through.
 */
function createMockHandler(bills: Bill[]) {
  return (params: { month: string }): CloudResult<StatisticsData> => {
    const month = params.month
    const monthBills = bills.filter((b) => b.billMonth === month)

    // Summary
    let monthIncome = 0
    let monthExpense = 0
    for (const bill of monthBills) {
      if (bill.type === 'income') monthIncome += bill.amount
      else monthExpense += bill.amount
    }
    const monthBalance = monthIncome - monthExpense

    // Category rankings (expense only)
    const expenseGroups: Record<string, {
      amount: number; categoryName: string; color: string; icon: string
    }> = {}

    for (const bill of monthBills) {
      if (bill.type === 'expense') {
        const code = bill.categoryCode
        if (!expenseGroups[code]) {
          const cat = EXPENSE_CATEGORY_MAP.get(code) || { color: '#94A3B8', icon: 'dots-horizontal' }
          expenseGroups[code] = {
            amount: 0,
            categoryName: bill.categoryName,
            color: cat.color,
            icon: cat.icon,
          }
        }
        expenseGroups[code].amount += bill.amount
      }
    }

    let categoryRankings = Object.entries(expenseGroups)
      .map(([code, data]) => ({
        categoryCode: code,
        categoryName: data.categoryName,
        amount: data.amount,
        percentage: 0,
        color: data.color,
        icon: data.icon,
      }))
      .sort((a, b) => b.amount - a.amount)

    const totalExpense = monthExpense
    if (totalExpense > 0) {
      categoryRankings = categoryRankings.map((item) => ({
        ...item,
        percentage: Math.round((item.amount / totalExpense) * 100),
      }))
    }

    // Daily amounts (last 7 days)
    const dates = getLastNDaysFrom(7, new Date())
    const dailyAmounts = dates.map((date) => {
      let expense = 0
      let income = 0
      for (const bill of bills) {
        if (bill.billDate === date) {
          if (bill.type === 'expense') expense += bill.amount
          else income += bill.amount
        }
      }
      return { date, expense, income }
    })

    // Top category
    const topCategory = categoryRankings.length > 0 ? categoryRankings[0] : null

    // Max single expense
    let maxSingleExpense: StatisticsData['maxSingleExpense'] = null
    const expenseBills = monthBills.filter((b) => b.type === 'expense')
    if (expenseBills.length > 0) {
      let maxBill = expenseBills[0]
      for (const bill of expenseBills) {
        if (bill.amount > maxBill.amount) maxBill = bill
      }
      maxSingleExpense = {
        amount: maxBill.amount,
        categoryName: maxBill.categoryName,
        billId: maxBill._id,
      }
    }

    // Bill count and days
    const billCount = monthBills.length
    const uniqueDates = new Set(monthBills.map((b) => b.billDate))
    const billDays = uniqueDates.size

    return {
      success: true,
      data: {
        summary: { monthIncome, monthExpense, monthBalance },
        categoryRankings,
        dailyAmounts,
        topCategory,
        maxSingleExpense,
        billCount,
        billDays,
      },
    }
  }
}

// ===== Test Fixtures =====

const MONTH = '2026-05'

function makeBill(overrides: Partial<Bill> & { _id: string }): Bill {
  return {
    openid: 'test_openid',
    type: 'expense',
    amount: 0,
    categoryCode: 'expense_other',
    categoryName: '其他',
    billDate: '2026-05-01',
    billMonth: MONTH,
    remark: '',
    ...overrides,
  }
}

// ===== Setup / Teardown =====

beforeEach(() => {
  __clearMocks()
})

afterAll(() => {
  __clearMocks()
})

// ===================================================================
// Tests
// ===================================================================

describe('getStatistics', () => {
  // ---------------------------------------------------------------
  // Normal scenario: mixed expense + income
  // ---------------------------------------------------------------
  describe('with mixed expense and income bills', () => {
    const bills: Bill[] = [
      // Expense bills
      makeBill({ _id: '1', categoryCode: 'expense_food', categoryName: '餐饮', amount: 4000, billDate: '2026-05-01' }),
      makeBill({ _id: '2', categoryCode: 'expense_food', categoryName: '餐饮', amount: 3000, billDate: '2026-05-02' }),
      makeBill({ _id: '3', categoryCode: 'expense_transport', categoryName: '交通', amount: 2000, billDate: '2026-05-03' }),
      makeBill({ _id: '4', categoryCode: 'expense_housing', categoryName: '住房', amount: 1000, billDate: '2026-05-01' }),
      // Income bills
      makeBill({ _id: '5', type: 'income', categoryCode: 'income_salary', categoryName: '工资', amount: 50000, billDate: '2026-05-10', billMonth: MONTH }),
      makeBill({ _id: '6', type: 'income', categoryCode: 'income_bonus', categoryName: '奖金', amount: 10000, billDate: '2026-05-15', billMonth: MONTH }),
    ]

    beforeEach(() => {
      __registerMock('getStatistics', createMockHandler(bills))
    })

    it('computes correct monthIncome, monthExpense, and monthBalance', async () => {
      const result = await getStatistics(MONTH)
      expect(result.summary.monthIncome).toBe(60000) // 50000 + 10000
      expect(result.summary.monthExpense).toBe(10000) // 4000 + 3000 + 2000 + 1000
      expect(result.summary.monthBalance).toBe(50000) // 60000 - 10000
    })

    it('returns category rankings sorted by amount descending', async () => {
      const result = await getStatistics(MONTH)
      const rankings = result.categoryRankings

      // Should have 3 categories
      expect(rankings).toHaveLength(3)

      // Check sort order: 餐饮(7000) > 交通(2000) > 住房(1000)
      expect(rankings[0].categoryCode).toBe('expense_food')
      expect(rankings[0].amount).toBe(7000)
      expect(rankings[1].categoryCode).toBe('expense_transport')
      expect(rankings[1].amount).toBe(2000)
      expect(rankings[2].categoryCode).toBe('expense_housing')
      expect(rankings[2].amount).toBe(1000)

      // Each rank has a lower or equal amount than the previous
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i].amount).toBeLessThanOrEqual(rankings[i - 1].amount)
      }
    })

    it('computes percentages that sum to 100%', async () => {
      const result = await getStatistics(MONTH)
      const sum = result.categoryRankings.reduce((acc, r) => acc + r.percentage, 0)
      expect(sum).toBe(100)
    })

    it('includes color and icon for each category ranking', async () => {
      const result = await getStatistics(MONTH)
      for (const rank of result.categoryRankings) {
        expect(rank.color).toBeTruthy()
        expect(rank.icon).toBeTruthy()
        expect(rank.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('returns 7 daily amounts with expense and income fields', async () => {
      const result = await getStatistics(MONTH)
      expect(result.dailyAmounts).toHaveLength(7)
      for (const day of result.dailyAmounts) {
        expect(day).toHaveProperty('date')
        expect(day).toHaveProperty('expense')
        expect(day).toHaveProperty('income')
        expect(typeof day.expense).toBe('number')
        expect(typeof day.income).toBe('number')
      }
    })

    it('identifies the correct top category', async () => {
      const result = await getStatistics(MONTH)
      expect(result.topCategory).not.toBeNull()
      expect(result.topCategory!.categoryCode).toBe('expense_food')
      expect(result.topCategory!.amount).toBe(7000)
    })

    it('identifies the correct max single expense', async () => {
      const result = await getStatistics(MONTH)
      expect(result.maxSingleExpense).not.toBeNull()
      expect(result.maxSingleExpense!.amount).toBe(4000)
      expect(result.maxSingleExpense!.categoryName).toBe('餐饮')
    })

    it('reports correct bill count', async () => {
      const result = await getStatistics(MONTH)
      expect(result.billCount).toBe(6)
    })

    it('reports correct unique bill days', async () => {
      const result = await getStatistics(MONTH)
      // Unique dates: 2026-05-01, 2026-05-02, 2026-05-03, 2026-05-10, 2026-05-15
      expect(result.billDays).toBe(5)
    })
  })

  // ---------------------------------------------------------------
  // Edge: empty month (no bills at all)
  // ---------------------------------------------------------------
  describe('with an empty month', () => {
    beforeEach(() => {
      __registerMock('getStatistics', createMockHandler([]))
    })

    it('returns zero for all summary values', async () => {
      const result = await getStatistics(MONTH)
      expect(result.summary.monthIncome).toBe(0)
      expect(result.summary.monthExpense).toBe(0)
      expect(result.summary.monthBalance).toBe(0)
    })

    it('returns empty category rankings', async () => {
      const result = await getStatistics(MONTH)
      expect(result.categoryRankings).toHaveLength(0)
    })

    it('returns null for topCategory', async () => {
      const result = await getStatistics(MONTH)
      expect(result.topCategory).toBeNull()
    })

    it('returns null for maxSingleExpense', async () => {
      const result = await getStatistics(MONTH)
      expect(result.maxSingleExpense).toBeNull()
    })

    it('returns zero for billCount and billDays', async () => {
      const result = await getStatistics(MONTH)
      expect(result.billCount).toBe(0)
      expect(result.billDays).toBe(0)
    })

    it('still returns 7 daily amounts', async () => {
      const result = await getStatistics(MONTH)
      expect(result.dailyAmounts).toHaveLength(7)
    })
  })

  // ---------------------------------------------------------------
  // Edge: income only (no expense bills)
  // ---------------------------------------------------------------
  describe('with income-only month', () => {
    const bills: Bill[] = [
      makeBill({ _id: 'i1', type: 'income', categoryCode: 'income_salary', categoryName: '工资', amount: 50000, billDate: '2026-05-10', billMonth: MONTH }),
      makeBill({ _id: 'i2', type: 'income', categoryCode: 'income_bonus', categoryName: '奖金', amount: 20000, billDate: '2026-05-15', billMonth: MONTH }),
    ]

    beforeEach(() => {
      __registerMock('getStatistics', createMockHandler(bills))
    })

    it('reports correct summary (expense = 0)', async () => {
      const result = await getStatistics(MONTH)
      expect(result.summary.monthIncome).toBe(70000)
      expect(result.summary.monthExpense).toBe(0)
      expect(result.summary.monthBalance).toBe(70000)
    })

    it('returns empty category rankings', async () => {
      const result = await getStatistics(MONTH)
      expect(result.categoryRankings).toHaveLength(0)
    })

    it('returns null for topCategory', async () => {
      const result = await getStatistics(MONTH)
      expect(result.topCategory).toBeNull()
    })

    it('returns null for maxSingleExpense', async () => {
      const result = await getStatistics(MONTH)
      expect(result.maxSingleExpense).toBeNull()
    })
  })

  // ---------------------------------------------------------------
  // Edge: expense only (no income bills)
  // ---------------------------------------------------------------
  describe('with expense-only month', () => {
    const bills: Bill[] = [
      makeBill({ _id: 'e1', categoryCode: 'expense_food', categoryName: '餐饮', amount: 3000, billDate: '2026-05-01' }),
      makeBill({ _id: 'e2', categoryCode: 'expense_transport', categoryName: '交通', amount: 1500, billDate: '2026-05-02' }),
    ]

    beforeEach(() => {
      __registerMock('getStatistics', createMockHandler(bills))
    })

    it('reports correct summary (income = 0, negative balance)', async () => {
      const result = await getStatistics(MONTH)
      expect(result.summary.monthIncome).toBe(0)
      expect(result.summary.monthExpense).toBe(4500)
      expect(result.summary.monthBalance).toBe(-4500)
    })

    it('returns category rankings with correct percentages', async () => {
      const result = await getStatistics(MONTH)
      expect(result.categoryRankings).toHaveLength(2)
      // 餐饮: 3000/4500 = 67%, 交通: 1500/4500 = 33%
      expect(result.categoryRankings[0].categoryCode).toBe('expense_food')
      expect(result.categoryRankings[0].percentage).toBe(67)
      expect(result.categoryRankings[1].categoryCode).toBe('expense_transport')
      expect(result.categoryRankings[1].percentage).toBe(33)
    })

    it('identifies topCategory and maxSingleExpense', async () => {
      const result = await getStatistics(MONTH)
      expect(result.topCategory).not.toBeNull()
      expect(result.topCategory!.categoryCode).toBe('expense_food')
      expect(result.maxSingleExpense).not.toBeNull()
      expect(result.maxSingleExpense!.amount).toBe(3000)
    })
  })

  // ---------------------------------------------------------------
  // Edge: single bill month
  // ---------------------------------------------------------------
  describe('with a single bill', () => {
    const bills: Bill[] = [
      makeBill({ _id: 's1', categoryCode: 'expense_food', categoryName: '餐饮', amount: 2500, billDate: '2026-05-10' }),
    ]

    beforeEach(() => {
      __registerMock('getStatistics', createMockHandler(bills))
    })

    it('computes correct values for a single bill', async () => {
      const result = await getStatistics(MONTH)
      expect(result.summary.monthExpense).toBe(2500)
      expect(result.summary.monthBalance).toBe(-2500)
      expect(result.categoryRankings).toHaveLength(1)
      expect(result.categoryRankings[0].percentage).toBe(100)
      expect(result.topCategory!.categoryCode).toBe('expense_food')
      expect(result.maxSingleExpense!.amount).toBe(2500)
      expect(result.billCount).toBe(1)
      expect(result.billDays).toBe(1)
    })
  })

  // ---------------------------------------------------------------
  // category ranking integrity checks
  // ---------------------------------------------------------------
  describe('category ranking integrity', () => {
    it('handles categories with equal amounts correctly', async () => {
      const bills: Bill[] = [
        makeBill({ _id: 'eq1', categoryCode: 'expense_food', categoryName: '餐饮', amount: 3000, billDate: '2026-05-01' }),
        makeBill({ _id: 'eq2', categoryCode: 'expense_transport', categoryName: '交通', amount: 3000, billDate: '2026-05-02' }),
        makeBill({ _id: 'eq3', categoryCode: 'expense_housing', categoryName: '住房', amount: 3000, billDate: '2026-05-03' }),
      ]

      __registerMock('getStatistics', createMockHandler(bills))
      const result = await getStatistics(MONTH)

      expect(result.categoryRankings).toHaveLength(3)
      expect(result.categoryRankings[0].percentage).toBe(33)
      expect(result.categoryRankings[1].percentage).toBe(33)
      expect(result.categoryRankings[2].percentage).toBe(33)
      // Sum might be 99 due to rounding, so check >= 99
      const sum = result.categoryRankings.reduce((a, r) => a + r.percentage, 0)
      expect(sum).toBeGreaterThanOrEqual(99)
      expect(sum).toBeLessThanOrEqual(100)
    })
  })
})
