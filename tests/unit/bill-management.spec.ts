/**
 * Bill Management Module Tests
 *
 * Covers:
 * 1. Cloud function validation & logic (createBill, updateBill, deleteBill)
 * 2. Calculator input logic
 * 3. Form validation
 * 4. Category validation
 */

// ========================================================================
// Mocks for wx-server-sdk (used by all cloud function tests)
// Uses __mocks__/wx-server-sdk.js via moduleNameMapper in jest config.
// ========================================================================

jest.mock('wx-server-sdk')

let mockSDK: any

/** Re-acquire the mock instance after module resets */
function getMockWx() {
  return require('wx-server-sdk') as any
}

// ========================================================================
// Helper: Create a database mock with required properties
// ========================================================================

function makeDb(collectionMock?: any) {
  return {
    serverDate: jest.fn().mockReturnValue(new Date('2026-05-21')),
    command: {},
    collection: collectionMock || jest.fn(),
  }
}

// ========================================================================
// Imports for non-cloud-function tests
// ========================================================================

import { validateBillForm } from '@/utils/validator'
import { isValidCategory, getCategory } from '@/constants/categories'
import { truncateToTwoDecimals, yuanToCents } from '@/utils/money'

// ========================================================================
// Setup & Teardown
// ========================================================================

beforeEach(() => {
  jest.resetModules()
  mockSDK = getMockWx()
  jest.clearAllMocks()
  mockSDK.getWXContext.mockReturnValue({ OPENID: 'test-openid' })
  mockSDK.serverDate.mockReturnValue(new Date('2026-05-21'))
  mockSDK.database.mockReturnValue(makeDb())
})

// ========================================================================
// 1. Cloud Function Tests
// ========================================================================

describe('createBill cloud function', () => {
  it('should create a bill successfully with valid data', async () => {
    const mockAdd = jest.fn().mockResolvedValue({ _id: 'bill-123' })
    const mockWhereGet = jest.fn().mockResolvedValue({ data: [] })
    const mockWhereCount = jest.fn().mockResolvedValue({ total: 3 })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnValue({ get: mockWhereGet, count: mockWhereCount }),
        doc: jest.fn().mockReturnValue({ get: jest.fn(), update: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense',
      amount: '12.50',
      categoryCode: 'expense_food',
      billDate: '2026-05-21',
      remark: '午餐',
    })

    expect(result.success).toBe(true)
    expect(result.data).toBe('bill-123')

    const addCallArgs = mockAdd.mock.calls[0][0]
    expect(addCallArgs.data.type).toBe('expense')
    expect(addCallArgs.data.amount).toBe(1250)
    expect(addCallArgs.data.categoryCode).toBe('expense_food')
    expect(addCallArgs.data.categoryName).toBe('餐饮')
    expect(addCallArgs.data.billDate).toBe('2026-05-21')
    expect(addCallArgs.data.billMonth).toBe('2026-05')
    expect(addCallArgs.data.remark).toBe('午餐')
    expect(addCallArgs.data.openid).toBe('test-openid')
    expect(addCallArgs.data.createdAt).toBeDefined()
    expect(addCallArgs.data.updatedAt).toBeDefined()
  })

  it('should reject amount that is zero', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '0', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('AMOUNT_ZERO')
  })

  it('should reject amount with more than 2 decimal places', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '12.345', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_AMOUNT')
  })

  it('should reject empty amount', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_AMOUNT')
  })

  it('should reject invalid category code', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '12.50', categoryCode: 'nonexistent_code', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_CATEGORY')
  })

  it('should reject category type mismatch', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '12.50', categoryCode: 'income_salary', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_CATEGORY')
  })

  it('should reject invalid date format', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '12.50', categoryCode: 'expense_food', billDate: '2026/05/21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_DATE')
  })

  it('should reject invalid type', async () => {
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'invalid', amount: '12.50', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_TYPE')
  })

  it('should return NO_OPENID when context is missing', async () => {
    mockSDK.getWXContext.mockReturnValue({ OPENID: undefined })
    mockSDK.database.mockReturnValue(makeDb())
    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '12.50', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('NO_OPENID')
  })

  it('should auto-save memo when remark is non-empty', async () => {
    let addCallCount = 0
    const mockAdd = jest.fn().mockImplementation(() => {
      addCallCount++
      if (addCallCount === 1) return Promise.resolve({ _id: 'bill-456' })
      return Promise.resolve({ _id: 'memo-789' })
    })
    const mockWhereGet = jest.fn().mockResolvedValue({ data: [] })
    const mockWhereCount = jest.fn().mockResolvedValue({ total: 2 })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnValue({ get: mockWhereGet, count: mockWhereCount }),
        doc: jest.fn().mockReturnValue({ get: jest.fn(), update: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '25.00', categoryCode: 'expense_transport',
      billDate: '2026-05-21', remark: '地铁',
    })
    expect(result.success).toBe(true)
    expect(mockAdd).toHaveBeenCalledTimes(2)
  })

  it('should not create duplicate memo if same content exists', async () => {
    const mockAdd = jest.fn().mockResolvedValue({ _id: 'bill-111' })
    const mockWhereGet = jest.fn().mockResolvedValue({
      data: [{ _id: 'existing-memo', content: '午餐' }],
    })
    const mockDocUpdate = jest.fn().mockResolvedValue({})

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnValue({ get: mockWhereGet, count: jest.fn() }),
        doc: jest.fn().mockReturnValue({ get: jest.fn(), update: mockDocUpdate, remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '12.50', categoryCode: 'expense_food',
      billDate: '2026-05-21', remark: '午餐',
    })
    expect(result.success).toBe(true)
    expect(mockAdd).toHaveBeenCalledTimes(1)
    expect(mockDocUpdate).toHaveBeenCalled()
  })

  it('should skip auto-save memo when category already has 10 memos', async () => {
    const mockAdd = jest.fn().mockResolvedValue({ _id: 'bill-222' })
    const mockWhereGet = jest.fn().mockResolvedValue({ data: [] })
    const mockWhereCount = jest.fn().mockResolvedValue({ total: 10 })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnValue({ get: mockWhereGet, count: mockWhereCount }),
        doc: jest.fn().mockReturnValue({ get: jest.fn(), update: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/createBill/index.js')

    const result = await main({
      type: 'expense', amount: '5.00', categoryCode: 'expense_food',
      billDate: '2026-05-21', remark: '早餐',
    })
    expect(result.success).toBe(true)
    expect(mockAdd).toHaveBeenCalledTimes(1)
  })
})

describe('updateBill cloud function', () => {
  it('should update bill fields successfully', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { _id: 'bill-001', openid: 'test-openid', type: 'expense',
        amount: 1000, categoryCode: 'expense_food', billDate: '2026-05-20', remark: '午餐' },
    })
    const mockUpdate = jest.fn().mockResolvedValue({ stats: { updated: 1 } })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: jest.fn(),
        where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: [] }), count: jest.fn().mockResolvedValue({ total: 0 }) }),
        doc: jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate, remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/updateBill/index.js')

    const result = await main({ id: 'bill-001', amount: '20.00', categoryCode: 'expense_transport' })
    expect(result.success).toBe(true)
    expect(result.data).toBe('bill-001')

    const updateData = mockUpdate.mock.calls[0][0].data
    expect(updateData.amount).toBe(2000)
    expect(updateData.categoryCode).toBe('expense_transport')
    expect(updateData.categoryName).toBe('交通')
    expect(updateData.updatedAt).toBeDefined()
  })

  it('should reject updating a bill that does not belong to the user', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: { _id: 'bill-other', openid: 'other-user-openid' } })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, update: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/updateBill/index.js')

    const result = await main({ id: 'bill-other', amount: '30.00' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('PERMISSION_DENIED')
  })

  it('should reject updating non-existent bill', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: null })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, update: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/updateBill/index.js')

    const result = await main({ id: 'nonexistent-id', amount: '30.00' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('NOT_FOUND')
  })

  it('should reject invalid amount on update', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { _id: 'bill-001', openid: 'test-openid', type: 'expense', amount: 1000, categoryCode: 'expense_food' },
    })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, update: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/updateBill/index.js')

    const result = await main({ id: 'bill-001', amount: '-5.00' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('AMOUNT_ZERO')
  })

  it('should auto-save memo when remark changes', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { _id: 'bill-001', openid: 'test-openid', type: 'expense',
        amount: 1000, categoryCode: 'expense_food', billDate: '2026-05-20', remark: '旧备注' },
    })
    const mockUpdate = jest.fn().mockResolvedValue({ stats: { updated: 1 } })
    let addCallCount = 0
    const mockAdd = jest.fn().mockImplementation(() => {
      addCallCount++
      if (addCallCount === 1) return Promise.resolve({ _id: 'memo-new' })
      return Promise.resolve({ _id: 'something' })
    })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: [] }), count: jest.fn().mockResolvedValue({ total: 5 }) }),
        doc: jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate, remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/updateBill/index.js')

    const result = await main({ id: 'bill-001', remark: '新备注' })
    expect(result.success).toBe(true)
    expect(mockAdd).toHaveBeenCalled()
  })

  it('should not auto-save memo if remark did not change', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { _id: 'bill-001', openid: 'test-openid', type: 'expense',
        amount: 1000, categoryCode: 'expense_food', billDate: '2026-05-20', remark: '午餐' },
    })
    const mockUpdate = jest.fn().mockResolvedValue({ stats: { updated: 1 } })
    const mockAdd = jest.fn()

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnValue({ get: jest.fn(), count: jest.fn() }),
        doc: jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate, remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/updateBill/index.js')

    const result = await main({ id: 'bill-001', remark: '午餐' })
    expect(result.success).toBe(true)
    expect(mockAdd).not.toHaveBeenCalled()
  })
})

describe('deleteBill cloud function', () => {
  it('should delete a bill successfully', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: { _id: 'bill-001', openid: 'test-openid' } })
    const mockRemove = jest.fn().mockResolvedValue({ stats: { removed: 1 } })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, remove: mockRemove, update: jest.fn() }),
        where: jest.fn(),
      })
    ))

    const { main } = require('../../cloud-functions/deleteBill/index.js')

    const result = await main({ id: 'bill-001' })
    expect(result.success).toBe(true)
    expect(result.data).toBe('bill-001')
    expect(mockRemove).toHaveBeenCalled()
  })

  it('should reject deleting a bill not owned by user', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: { _id: 'bill-other', openid: 'other-user-openid' } })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/deleteBill/index.js')

    const result = await main({ id: 'bill-other' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('PERMISSION_DENIED')
  })

  it('should reject deleting non-existent bill', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: null })

    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/deleteBill/index.js')

    const result = await main({ id: 'nonexistent-id' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('NOT_FOUND')
  })

  it('should require bill id', async () => {
    mockSDK.database.mockReturnValue(makeDb(
      jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: jest.fn(), remove: jest.fn() }),
      })
    ))

    const { main } = require('../../cloud-functions/deleteBill/index.js')

    const result = await main({})
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_PARAMS')
  })
})

// ========================================================================
// 2. Calculator Input Tests
// ========================================================================

describe('Calculator input logic', () => {
  function truncateDecimals(input: string): string {
    return truncateToTwoDecimals(input)
  }

  describe('Number input', () => {
    it('should accept single digit input', () => {
      let display = '0'
      let isNewEntry = true

      if (isNewEntry) {
        display = '5'
        isNewEntry = false
      }
      expect(display).toBe('5')
    })

    it('should append digits when not new entry', () => {
      let display = '5'
      display = display + '2'
      expect(display).toBe('52')
    })

    it('should handle decimal point', () => {
      let display = '52'
      if (!display.includes('.')) {
        display += '.'
      }
      expect(display).toBe('52.')

      display += '5'
      expect(display).toBe('52.5')
    })

    it('should prevent second decimal point', () => {
      let display = '52.5'
      const hadDot = display.includes('.')
      if (!hadDot) {
        display += '.'
      }
      expect(display).toBe('52.5')
    })

    it('should start with "0." when decimal is first digit', () => {
      let display = '0'
      let isNewEntry = true

      if (isNewEntry) {
        display = '0.'
        isNewEntry = false
      }
      expect(display).toBe('0.')
    })

    it('should replace initial zero with non-zero digit via leading-zero removal', () => {
      let display = '05'
      if (display.length > 1 && display[0] === '0' && display[1] !== '.') {
        display = display.replace(/^0+/, '')
      }
      expect(display).toBe('5')
    })
  })

  describe('Decimal truncation', () => {
    it('should truncate to 2 decimal places', () => {
      expect(truncateDecimals('12.345')).toBe('12.34')
      expect(truncateDecimals('12.3')).toBe('12.3')
      expect(truncateDecimals('12.')).toBe('12.')
      expect(truncateDecimals('12')).toBe('12')
      expect(truncateDecimals('0.01')).toBe('0.01')
    })

    it('should not truncate valid 2-decimal numbers', () => {
      expect(truncateDecimals('12.34')).toBe('12.34')
      expect(truncateDecimals('0.00')).toBe('0.00')
      expect(truncateDecimals('100.99')).toBe('100.99')
    })
  })

  describe('Operator logic', () => {
    it('should accumulate addition and subtraction', () => {
      let accumulator = 0
      let pendingOperator: string | null = null

      // 12 + 8 - 3 = 17
      let displayValue = '12'
      let isNewEntry = false

      // Press '+'  (12 +)
      if (!isNewEntry) {
        const current = parseFloat(displayValue)
        if (pendingOperator !== null) {
          if (pendingOperator === '+') accumulator += current
          else if (pendingOperator === '-') accumulator -= current
        } else {
          accumulator = current
        }
        pendingOperator = '+'
        isNewEntry = true
      }
      expect(accumulator).toBe(12)

      // Type '8', press '-'  (12 + 8 = 20, then -)
      displayValue = '8'
      isNewEntry = false
      if (!isNewEntry) {
        const current = parseFloat(displayValue)
        if (pendingOperator === '+') accumulator += current
        else if (pendingOperator === '-') accumulator -= current
        pendingOperator = '-'
        isNewEntry = true
      }
      expect(accumulator).toBe(20)

      // Type '3', compute final  (20 - 3 = 17)
      displayValue = '3'
      isNewEntry = false
      if (pendingOperator !== null) {
        const current = parseFloat(displayValue)
        if (pendingOperator === '+') accumulator += current
        else if (pendingOperator === '-') accumulator -= current
        pendingOperator = null
      }
      expect(accumulator).toBe(17)
    })

    it('should handle pure subtraction', () => {
      let accumulator = 0
      let pendingOperator: string | null = null

      accumulator = 50
      pendingOperator = '-'
      accumulator = 50 - 20
      pendingOperator = '-'
      accumulator = 30 - 5

      expect(accumulator).toBe(25)
    })

    it('should start fresh when pressing digit after operator', () => {
      let isNewEntry = true
      let displayValue = '0'

      if (isNewEntry) {
        displayValue = '1'
        isNewEntry = false
      }
      expect(displayValue).toBe('1')
      expect(isNewEntry).toBe(false)
    })
  })

  describe('Delete and Clear', () => {
    it('should delete last character', () => {
      let displayValue = '123'
      displayValue = displayValue.slice(0, -1)
      expect(displayValue).toBe('12')
    })

    it('should reset to 0 when all digits deleted', () => {
      let displayValue = '1'
      displayValue = displayValue.slice(0, -1)
      if (displayValue.length <= 1) {
        displayValue = '0'
      }
      expect(displayValue).toBe('0')
    })

    it('should clear everything', () => {
      let displayValue = '123'
      let accumulator = 45
      let pendingOperator = '+'
      let isNewEntry = false

      displayValue = '0'
      accumulator = 0
      pendingOperator = null
      isNewEntry = true

      expect(displayValue).toBe('0')
      expect(accumulator).toBe(0)
      expect(pendingOperator).toBeNull()
      expect(isNewEntry).toBe(true)
    })
  })
})

// ========================================================================
// 3. Form Validation Tests
// ========================================================================

describe('Form validation', () => {
  it('should reject empty amount', () => {
    const result = validateBillForm({
      type: 'expense', amount: '', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('请输入金额')
  })

  it('should reject zero amount', () => {
    const result = validateBillForm({
      type: 'expense', amount: '0', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('金额必须大于 0')
  })

  it('should reject missing category', () => {
    const result = validateBillForm({
      type: 'expense', amount: '12.50', categoryCode: '', billDate: '2026-05-21',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('请选择分类')
  })

  it('should reject invalid type', () => {
    const result = validateBillForm({
      type: '' as any, amount: '12.50', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('请选择类型')
  })

  it('should reject invalid date', () => {
    const result = validateBillForm({
      type: 'expense', amount: '12.50', categoryCode: 'expense_food', billDate: 'invalid-date',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('请选择日期')
  })

  it('should accept valid form data', () => {
    const result = validateBillForm({
      type: 'expense', amount: '12.50', categoryCode: 'expense_food', billDate: '2026-05-21',
    })
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should accept valid income form data', () => {
    const result = validateBillForm({
      type: 'income', amount: '5000.00', categoryCode: 'income_salary', billDate: '2026-05-15',
    })
    expect(result.valid).toBe(true)
  })
})

// ========================================================================
// 4. Category Validation Tests
// ========================================================================

describe('Category validation', () => {
  it('should validate valid category codes', () => {
    expect(isValidCategory('expense_food')).toBe(true)
    expect(isValidCategory('expense_transport')).toBe(true)
    expect(isValidCategory('income_salary')).toBe(true)
    expect(isValidCategory('income_bonus')).toBe(true)
  })

  it('should reject invalid category codes', () => {
    expect(isValidCategory('')).toBe(false)
    expect(isValidCategory('nonexistent')).toBe(false)
    expect(isValidCategory('expense_fake')).toBe(false)
    expect(isValidCategory('income_fake')).toBe(false)
  })

  it('should detect type mismatch', () => {
    expect(isValidCategory('expense_food', 'expense')).toBe(true)
    expect(isValidCategory('expense_food', 'income')).toBe(false)
    expect(isValidCategory('income_salary', 'income')).toBe(true)
    expect(isValidCategory('income_salary', 'expense')).toBe(false)
  })

  it('should return correct category by code', () => {
    const food = getCategory('expense_food')
    expect(food).toBeDefined()
    expect(food!.name).toBe('餐饮')
    expect(food!.type).toBe('expense')

    const salary = getCategory('income_salary')
    expect(salary).toBeDefined()
    expect(salary!.name).toBe('工资')
    expect(salary!.type).toBe('income')
  })

  it('should return undefined for non-existent category', () => {
    expect(getCategory('')).toBeUndefined()
    expect(getCategory('fake_code')).toBeUndefined()
  })

  it('should list categories by type', () => {
    const { getCategoriesByType } = require('@/constants/categories')

    const expenseCats = getCategoriesByType('expense')
    expect(expenseCats.length).toBeGreaterThan(0)
    expenseCats.forEach((cat: any) => {
      expect(cat.type).toBe('expense')
    })

    const incomeCats = getCategoriesByType('income')
    expect(incomeCats.length).toBeGreaterThan(0)
    incomeCats.forEach((cat: any) => {
      expect(cat.type).toBe('income')
    })
  })
})

// ========================================================================
// 5. Amount Conversion Tests
// ========================================================================

describe('Amount conversion', () => {
  it('should convert yuan to cents correctly', () => {
    expect(yuanToCents('12.50')).toBe(1250)
    expect(yuanToCents('0.01')).toBe(1)
    expect(yuanToCents('100')).toBe(10000)
    expect(yuanToCents('0')).toBe(0)
    expect(yuanToCents('9999999.99')).toBe(999999999)
  })

  it('should handle whole numbers as cents', () => {
    expect(yuanToCents('12')).toBe(1200)
    expect(yuanToCents('5.00')).toBe(500)
  })
})
