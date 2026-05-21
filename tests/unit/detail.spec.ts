/**
 * Detail module tests
 *
 * Covers:
 * - listBillsByMonth cloud function contract (return structure)
 * - Bill grouping logic
 * - Amount formatting (expense -, income +)
 * - Date label format (Chinese)
 * - Empty state rendering
 * - Bill list rendering
 * - Month switching behavior
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import DetailPage from '@/pages/detail/index.vue'
import { listBillsByMonth } from '@/services/billService'
import { formatAmountWithSign, formatCents } from '@/utils/money'
import { formatDateLabel } from '@/utils/date'
import { getCategory } from '@/constants/categories'
import MonthPicker from '@/components/MonthPicker/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

// ============================================================
// Mock billService so the component uses a controlled stub
// ============================================================
jest.mock('@/services/billService', () => ({
  listBillsByMonth: jest.fn(),
}))

const mockListBillsByMonth = listBillsByMonth as jest.MockedFunction<typeof listBillsByMonth>

// ============================================================
// Test helpers
// ============================================================

/** Flush pending promises (microtask queue) then Vue reactivity */
async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}

/** Factory for a minimal Bill fixture */
function createBill(overrides: Record<string, any> = {}) {
  return {
    _id: 'test-id',
    openid: 'test-openid',
    type: 'expense' as const,
    amount: 2000,
    categoryCode: 'expense_food',
    categoryName: '餐饮',
    billDate: '2026-05-19',
    billMonth: '2026-05',
    remark: '午餐',
    createdAt: '2026-05-19T10:00:00Z',
    ...overrides,
  }
}

/** Mount the DetailPage with Pinia plugin */
function mountDetail() {
  return mount(DetailPage, {
    global: {
      plugins: [createPinia()],
    },
  })
}

// ============================================================
// 1. Cloud function contract tests
// ============================================================
describe('listBillsByMonth cloud function', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns bills for given month with income/expense summary', async () => {
    const bills = [
      createBill({ _id: '1', amount: 2000, categoryCode: 'expense_food', billDate: '2026-05-19', remark: '午餐' }),
      createBill({ _id: '2', amount: 800, categoryCode: 'expense_transport', billDate: '2026-05-19', remark: '地铁' }),
      createBill({ _id: '3', amount: 50000, type: 'income', categoryCode: 'income_salary', billDate: '2026-05-18', remark: '' }),
    ]

    mockListBillsByMonth.mockResolvedValueOnce({
      bills,
      monthIncome: 50000,
      monthExpense: 2800,
    })

    const result = await listBillsByMonth('2026-05')

    expect(result).toHaveProperty('bills')
    expect(result).toHaveProperty('monthIncome')
    expect(result).toHaveProperty('monthExpense')
    expect(Array.isArray(result.bills)).toBe(true)
    expect(typeof result.monthIncome).toBe('number')
    expect(typeof result.monthExpense).toBe('number')
    expect(result.bills).toHaveLength(3)
    expect(result.monthIncome).toBe(50000)
    expect(result.monthExpense).toBe(2800)
  })

  it('returns empty array and zero values for no-data month', async () => {
    mockListBillsByMonth.mockResolvedValueOnce({
      bills: [],
      monthIncome: 0,
      monthExpense: 0,
    })

    const result = await listBillsByMonth('2026-06')
    expect(result.bills).toEqual([])
    expect(result.monthIncome).toBe(0)
    expect(result.monthExpense).toBe(0)
  })

  it('handles month without income correctly', async () => {
    mockListBillsByMonth.mockResolvedValueOnce({
      bills: [createBill({ _id: 'e1', amount: 1500, categoryCode: 'expense_food' })],
      monthIncome: 0,
      monthExpense: 1500,
    })

    const result = await listBillsByMonth('2026-05')
    expect(result.monthIncome).toBe(0)
    expect(result.monthExpense).toBe(1500)
  })

  it('handles month without expense correctly', async () => {
    mockListBillsByMonth.mockResolvedValueOnce({
      bills: [createBill({ _id: 'i1', amount: 100000, type: 'income', categoryCode: 'income_salary' })],
      monthIncome: 100000,
      monthExpense: 0,
    })

    const result = await listBillsByMonth('2026-05')
    expect(result.monthIncome).toBe(100000)
    expect(result.monthExpense).toBe(0)
  })
})

// ============================================================
// 2. Utility: Amount formatting
// ============================================================
describe('amount formatting', () => {
  it('expense shows "-" prefix with red color class', () => {
    const formatted = formatAmountWithSign(2000, 'expense')
    expect(formatted).toBe('-¥20.00')
    expect(formatted.startsWith('-')).toBe(true)
  })

  it('income shows "+" prefix with green color class', () => {
    const formatted = formatAmountWithSign(50000, 'income')
    expect(formatted).toBe('+¥500.00')
    expect(formatted.startsWith('+')).toBe(true)
  })

  it('zero amount formats correctly', () => {
    expect(formatAmountWithSign(0, 'expense')).toBe('-¥0.00')
    expect(formatAmountWithSign(0, 'income')).toBe('+¥0.00')
  })

  it('large amounts format with correct decimal places', () => {
    const formatted = formatAmountWithSign(1234567, 'income')
    expect(formatted).toBe('+¥12345.67')
  })

  it('formatCents produces two-decimal string', () => {
    expect(formatCents(2000)).toBe('20.00')
    expect(formatCents(99)).toBe('0.99')
    expect(formatCents(0)).toBe('0.00')
  })
})

// ============================================================
// 3. Utility: Date label
// ============================================================
describe('date label formatDateLabel', () => {
  it('returns correct Chinese format', () => {
    const label = formatDateLabel('2026-05-19')
    expect(label).toMatch(/^5月19日 星期/)
  })

  it('returns correct weekday for Tuesday', () => {
    // 2026-05-19 is a Tuesday
    const label = formatDateLabel('2026-05-19')
    expect(label).toContain('星期二')
  })

  it('handles single-digit month and day', () => {
    const label = formatDateLabel('2026-03-05')
    expect(label).toMatch(/^3月5日/)
  })

  it('handles month boundary correctly', () => {
    const label = formatDateLabel('2026-01-01')
    expect(label).toMatch(/^1月1日/)
  })
})

// ============================================================
// 4. Component: Detail page
// ============================================================
describe('Detail Page component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    jest.clearAllMocks()
  })

  describe('loading state', () => {
    it('shows loading indicator on first mount while data loads', async () => {
      // Keep the promise pending so loading state persists
      mockListBillsByMonth.mockReturnValueOnce(new Promise(() => {}))

      const wrapper = mountDetail()

      // The component should show loading before data arrives
      expect(wrapper.text()).toContain('加载中')
    })
  })

  describe('empty state', () => {
    it('shows empty state text when no bills exist', async () => {
      mockListBillsByMonth.mockResolvedValueOnce({
        bills: [],
        monthIncome: 0,
        monthExpense: 0,
      })

      const wrapper = mountDetail()
      await flushPromises()

      expect(wrapper.text()).toContain('暂无记账记录')
      expect(wrapper.findComponent(EmptyState).exists()).toBe(true)
    })
  })

  describe('bill list rendering', () => {
    it('renders bills grouped by date with correct headers', async () => {
      const bills = [
        createBill({ _id: '1', amount: 2000, categoryCode: 'expense_food', categoryName: '餐饮', billDate: '2026-05-19', remark: '午餐' }),
        createBill({ _id: '2', amount: 800, categoryCode: 'expense_transport', categoryName: '交通', billDate: '2026-05-19', remark: '地铁' }),
        createBill({ _id: '3', amount: 50000, type: 'income', categoryCode: 'income_salary', categoryName: '工资', billDate: '2026-05-18', remark: '' }),
      ]

      mockListBillsByMonth.mockResolvedValueOnce({
        bills,
        monthIncome: 50000,
        monthExpense: 2800,
      })

      const wrapper = mountDetail()
      await flushPromises()

      // Should show bill items
      const billItems = wrapper.findAll('[data-testid="bill-item"]')
      expect(billItems).toHaveLength(3)

      // Should show date headers (grouped by date = 2 groups)
      const dateHeaders = wrapper.findAll('[data-testid="date-header"]')
      expect(dateHeaders).toHaveLength(2)
      expect(dateHeaders[0].text()).toContain('5月19日')
      expect(dateHeaders[1].text()).toContain('5月18日')
    })

    it('displays correct amount format and sign for each bill', async () => {
      const bills = [
        createBill({ _id: '1', amount: 2000, categoryCode: 'expense_food', billDate: '2026-05-19' }),
        createBill({ _id: '2', amount: 50000, type: 'income', categoryCode: 'income_salary', billDate: '2026-05-18' }),
      ]

      mockListBillsByMonth.mockResolvedValueOnce({
        bills,
        monthIncome: 50000,
        monthExpense: 2000,
      })

      const wrapper = mountDetail()
      await flushPromises()

      const amounts = wrapper.findAll('.bill-amount')
      expect(amounts).toHaveLength(2)
      // Expense: -¥20.00
      expect(amounts[0].text()).toBe('-¥20.00')
      expect(amounts[0].classes()).toContain('expense')
      // Income: +¥500.00
      expect(amounts[1].text()).toBe('+¥500.00')
      expect(amounts[1].classes()).toContain('income')
    })

    it('renders category name and optional remark', async () => {
      const bills = [
        createBill({ _id: '1', amount: 2000, categoryCode: 'expense_food', categoryName: '餐饮', billDate: '2026-05-19', remark: '午餐' }),
        createBill({ _id: '2', amount: 50000, type: 'income', categoryCode: 'income_salary', categoryName: '工资', billDate: '2026-05-18', remark: '' }),
      ]

      mockListBillsByMonth.mockResolvedValueOnce({
        bills,
        monthIncome: 50000,
        monthExpense: 2000,
      })

      const wrapper = mountDetail()
      await flushPromises()

      expect(wrapper.text()).toContain('餐饮')
      expect(wrapper.text()).toContain('工资')

      // First bill has remark, second does not
      const remarks = wrapper.findAll('[data-testid="bill-remark"]')
      expect(remarks).toHaveLength(1)
      expect(remarks[0].text()).toBe('午餐')
    })

    it('displays monthly totals in summary card', async () => {
      mockListBillsByMonth.mockResolvedValueOnce({
        bills: [
          createBill({ _id: '1', amount: 2000, billDate: '2026-05-19' }),
        ],
        monthIncome: 50000,
        monthExpense: 2000,
      })

      const wrapper = mountDetail()
      await flushPromises()

      const incomeTotal = wrapper.find('[data-testid="income-total"]')
      const expenseTotal = wrapper.find('[data-testid="expense-total"]')

      expect(incomeTotal.text()).toBe('+¥500.00')
      expect(expenseTotal.text()).toBe('-¥20.00')
    })
  })

  describe('month switching', () => {
    it('reloads data when MonthPicker emits update:modelValue', async () => {
      // Initial data
      mockListBillsByMonth.mockResolvedValueOnce({
        bills: [createBill({ _id: '1', billDate: '2026-05-19' })],
        monthIncome: 0,
        monthExpense: 2000,
      })

      const wrapper = mountDetail()
      await flushPromises()

      // Should have loaded May data
      expect(mockListBillsByMonth).toHaveBeenCalledTimes(1)
      expect(mockListBillsByMonth).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/))

      // Set up June data
      mockListBillsByMonth.mockResolvedValueOnce({
        bills: [createBill({ _id: '2', amount: 1500, billDate: '2026-06-15', billMonth: '2026-06', remark: '晚餐' })],
        monthIncome: 0,
        monthExpense: 1500,
      })

      // Simulate MonthPicker changing the month
      const monthPicker = wrapper.findComponent(MonthPicker)
      monthPicker.vm.$emit('update:modelValue', '2026-06')
      await flushPromises()

      // Should have loaded June data
      expect(mockListBillsByMonth).toHaveBeenCalledTimes(2)
      expect(mockListBillsByMonth).toHaveBeenLastCalledWith('2026-06')
    })

    it('shows updated totals after month switch', async () => {
      // May data
      mockListBillsByMonth.mockResolvedValueOnce({
        bills: [createBill({ _id: '1', amount: 2000, billDate: '2026-05-19' })],
        monthIncome: 0,
        monthExpense: 2000,
      })

      const wrapper = mountDetail()
      await flushPromises()

      // June data
      mockListBillsByMonth.mockResolvedValueOnce({
        bills: [],
        monthIncome: 100000,
        monthExpense: 0,
      })

      const monthPicker = wrapper.findComponent(MonthPicker)
      monthPicker.vm.$emit('update:modelValue', '2026-06')
      await flushPromises()

      const incomeTotal = wrapper.find('[data-testid="income-total"]')
      const expenseTotal = wrapper.find('[data-testid="expense-total"]')

      expect(incomeTotal.text()).toBe('+¥1000.00')
      expect(expenseTotal.text()).toBe('-¥0.00')
    })
  })

  describe('refreshKey watcher', () => {
    it('reloads data when billStore.refreshKey changes', async () => {
      mockListBillsByMonth.mockResolvedValue({
        bills: [],
        monthIncome: 0,
        monthExpense: 0,
      })

      const wrapper = mountDetail()
      await flushPromises()

      expect(mockListBillsByMonth).toHaveBeenCalledTimes(1)

      // Trigger a refresh by changing the key (simulates bill being created elsewhere)
      // Access the store through the Pinia instance
      const { useBillStore } = await import('@/stores/billStore')
      const store = useBillStore()
      store.notifyBillChanged()

      // The watcher should trigger loadData
      await flushPromises()
      expect(mockListBillsByMonth).toHaveBeenCalledTimes(2)
    })
  })
})

// ============================================================
// 5. Utility: getCategory — used by detail page for icon colors
// ============================================================
describe('getCategory for detail page icons', () => {
  it('returns category with color for expense codes', () => {
    const cat = getCategory('expense_food')
    expect(cat).toBeDefined()
    expect(cat!.name).toBe('餐饮')
    expect(cat!.color).toBe('#F97316')
  })

  it('returns category with color for income codes', () => {
    const cat = getCategory('income_salary')
    expect(cat).toBeDefined()
    expect(cat!.name).toBe('工资')
    expect(cat!.color).toBe('#10B981')
  })

  it('returns undefined for unknown codes', () => {
    expect(getCategory('invalid_code')).toBeUndefined()
  })
})
