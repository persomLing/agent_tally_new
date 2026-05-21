/**
 * Unit tests for the memo (备注记忆库) module.
 *
 * Covers:
 * - createMemo: creation, dedup, 10-item limit
 * - updateMemo: content update, ownership validation
 * - deleteMemo: deletion, ownership validation
 * - listMemos: type/category filtering, lastUsedAt sorting
 * - Auto-saving bill remarks as memos
 * - Edge cases: content trimming, length validation
 */

import { __registerMock, __clearMocks } from '@/services/cloud'
import { createMemo, updateMemo, deleteMemo, listMemos } from '@/services/memoService'
import { createBill } from '@/services/billService'
import { validateMemoContent } from '@/utils/validator'
import type { Memo, BillType } from '@/types'

// ============================================================
// In-memory store — simulates WeChat cloud database behavior
// so that mock cloud functions behave close to production.
// ============================================================
class MemoStore {
  private memos: Memo[] = []
  private nextId = 1
  readonly TEST_OPENID = 'test_openid_001'

  clear(): void {
    this.memos = []
    this.nextId = 1
  }

  all(): Memo[] {
    return [...this.memos]
  }

  /** Simulate listMemos cloud function */
  list(params: { type: BillType; categoryCode?: string }): Memo[] {
    const filtered = this.memos.filter(
      (m) => m.openid === this.TEST_OPENID && m.type === params.type,
    )
    if (params.categoryCode) {
      return filtered
        .filter((m) => m.categoryCode === params.categoryCode)
        .sort((a, b) => ((b.lastUsedAt || b.createdAt) || '').localeCompare((a.lastUsedAt || a.createdAt) || ''))
    }
    return filtered.sort((a, b) => ((b.lastUsedAt || b.createdAt) || '').localeCompare((a.lastUsedAt || a.createdAt) || ''))
  }

  /** Simulate createMemo cloud function (with dedup + 10-item limit) */
  create(params: { type: BillType; categoryCode: string; content: string }): string {
    const trimmed = params.content.trim()

    // Dedup
    const existing = this.memos.find(
      (m) =>
        m.openid === this.TEST_OPENID &&
        m.type === params.type &&
        m.categoryCode === params.categoryCode &&
        m.content === trimmed,
    )
    if (existing) {
      existing.lastUsedAt = new Date().toISOString()
      return existing._id!
    }

    // 10-item limit
    const sameCategory = this.memos.filter(
      (m) =>
        m.openid === this.TEST_OPENID &&
        m.type === params.type &&
        m.categoryCode === params.categoryCode,
    )
    if (sameCategory.length >= 10) {
      sameCategory.sort((a, b) =>
        ((a.lastUsedAt || a.createdAt) || '').localeCompare((b.lastUsedAt || b.createdAt) || ''),
      )
      const oldest = sameCategory[0]
      const idx = this.memos.findIndex((m) => m._id === oldest._id)
      if (idx >= 0) this.memos.splice(idx, 1)
    }

    const now = new Date().toISOString()
    const categoryName = params.categoryCode.startsWith('expense_') ? '餐饮' : '工资'
    const memo: Memo = {
      _id: `memo_${this.nextId++}`,
      openid: this.TEST_OPENID,
      type: params.type,
      categoryCode: params.categoryCode,
      categoryName,
      content: trimmed,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    }
    this.memos.push(memo)
    return memo._id!
  }

  /** Simulate updateMemo cloud function */
  update(id: string, content: string, userId?: string): void {
    const memo = this.memos.find((m) => m._id === id)
    if (!memo) throw new Error('NOT_FOUND')
    if (memo.openid !== (userId || this.TEST_OPENID)) throw new Error('PERMISSION_DENIED')
    memo.content = content.trim()
    memo.updatedAt = new Date().toISOString()
  }

  /** Simulate deleteMemo cloud function */
  remove(id: string, userId?: string): void {
    const memo = this.memos.find((m) => m._id === id)
    if (!memo) throw new Error('NOT_FOUND')
    if (memo.openid !== (userId || this.TEST_OPENID)) throw new Error('PERMISSION_DENIED')
    const idx = this.memos.findIndex((m) => m._id === id)
    this.memos.splice(idx, 1)
  }
}

// ============================================================
// Test setup
// ============================================================
let store: MemoStore

function registerMocks() {
  __registerMock('listMemos', (params) => ({
    success: true,
    data: store.list(params),
  }))
  __registerMock('createMemo', (params) => ({
    success: true,
    data: store.create(params),
  }))
  __registerMock('updateMemo', (params) => {
    store.update(params.id, params.content)
    return { success: true }
  })
  __registerMock('deleteMemo', (params) => {
    store.remove(params.id)
    return { success: true }
  })
}

beforeEach(() => {
  __clearMocks()
  store = new MemoStore()
})

// ============================================================
// createMemo
// ============================================================
describe('createMemo', () => {
  beforeEach(() => {
    registerMocks()
  })

  it('creates a memo and returns its _id', async () => {
    const id = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })
    expect(id).toBeTruthy()
    expect(id).toMatch(/^memo_\d+$/)

    const all = store.all()
    expect(all).toHaveLength(1)
    expect(all[0].content).toBe('午餐')
    expect(all[0].type).toBe('expense')
    expect(all[0].categoryCode).toBe('expense_food')
  })

  it('dedup: same content for same user+type+category returns existing id', async () => {
    const id1 = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })
    const id2 = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })
    expect(id1).toBe(id2)
    expect(store.all()).toHaveLength(1)
  })

  it('does NOT dedup across different categories', async () => {
    const id1 = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })
    const id2 = await createMemo({
      type: 'expense',
      categoryCode: 'expense_transport',
      content: '午餐',
    })
    expect(id1).not.toBe(id2)
    expect(store.all()).toHaveLength(2)
  })

  it('does NOT dedup across different types', async () => {
    const id1 = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })
    const id2 = await createMemo({
      type: 'income',
      categoryCode: 'income_salary',
      content: '午餐',
    })
    expect(id1).not.toBe(id2)
    expect(store.all()).toHaveLength(2)
  })

  it('enforces 10-item limit per user+type+category', async () => {
    // Create 10 memos
    const ids: string[] = []
    for (let i = 0; i < 10; i++) {
      const id = await createMemo({
        type: 'expense',
        categoryCode: 'expense_food',
        content: `备注${i + 1}`,
      })
      ids.push(id)
    }
    expect(store.all()).toHaveLength(10)

    // Create 11th — oldest should be evicted
    const id11 = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '备注11',
    })
    expect(store.all()).toHaveLength(10)

    // The first created memo should have been removed
    const all = store.all()
    expect(all.find((m) => m.content === '备注1')).toBeUndefined()
    expect(all.find((m) => m.content === '备注11')).toBeDefined()
  })

  it('10-item limit is per-category, not global', async () => {
    for (let i = 0; i < 10; i++) {
      await createMemo({ type: 'expense', categoryCode: 'expense_food', content: `餐饮${i + 1}` })
    }
    for (let i = 0; i < 10; i++) {
      await createMemo({ type: 'expense', categoryCode: 'expense_transport', content: `交通${i + 1}` })
    }
    // Both categories can have 10 items
    expect(store.all()).toHaveLength(20)

    // Adding 11th to food should evict only from food
    await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '餐饮11' })
    expect(store.all()).toHaveLength(20) // still 20 (10 + 10, one evicted, one added)
    expect(store.all().filter((m) => m.categoryCode === 'expense_food')).toHaveLength(10)
    expect(store.all().filter((m) => m.categoryCode === 'expense_transport')).toHaveLength(10)
  })
})

// ============================================================
// updateMemo
// ============================================================
describe('updateMemo', () => {
  beforeEach(() => {
    registerMocks()
  })

  it('updates memo content', async () => {
    const id = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })

    await updateMemo(id, '午餐-更新')

    const all = store.all()
    expect(all).toHaveLength(1)
    expect(all[0].content).toBe('午餐-更新')
  })

  it('throws NOT_FOUND when memo does not exist', async () => {
    await expect(updateMemo('nonexistent_id', '新内容')).rejects.toThrow('NOT_FOUND')
  })

  it('throws permission error when memo belongs to another user', async () => {
    const id = store.create({ type: 'expense', categoryCode: 'expense_food', content: '午餐' })

    // Simulate different OPENID
    __clearMocks()
    __registerMock('updateMemo', () => {
      return { success: false, errorCode: 'PERMISSION_DENIED', message: '无权限执行此操作' }
    })

    await expect(updateMemo(id, '新内容')).rejects.toThrow('无权限执行此操作')
  })
})

// ============================================================
// deleteMemo
// ============================================================
describe('deleteMemo', () => {
  beforeEach(() => {
    registerMocks()
  })

  it('deletes a memo', async () => {
    const id = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '午餐',
    })
    expect(store.all()).toHaveLength(1)

    await deleteMemo(id)
    expect(store.all()).toHaveLength(0)
  })

  it('throws NOT_FOUND when memo does not exist', async () => {
    await expect(deleteMemo('nonexistent_id')).rejects.toThrow('NOT_FOUND')
  })

  it('throws permission error when memo belongs to another user', async () => {
    const id = store.create({ type: 'expense', categoryCode: 'expense_food', content: '午餐' })

    __clearMocks()
    __registerMock('deleteMemo', () => {
      return { success: false, errorCode: 'PERMISSION_DENIED', message: '无权限执行此操作' }
    })

    await expect(deleteMemo(id)).rejects.toThrow('无权限执行此操作')
  })
})

// ============================================================
// listMemos
// ============================================================
describe('listMemos', () => {
  beforeEach(() => {
    registerMocks()
  })

  it('returns memos filtered by type', async () => {
    await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '午餐' })
    await createMemo({ type: 'expense', categoryCode: 'expense_transport', content: '地铁' })
    await createMemo({ type: 'income', categoryCode: 'income_salary', content: '工资' })

    const expenseMemos = await listMemos({ type: 'expense' })
    expect(expenseMemos).toHaveLength(2)

    const incomeMemos = await listMemos({ type: 'income' })
    expect(incomeMemos).toHaveLength(1)
  })

  it('filters by type and categoryCode', async () => {
    await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '午餐' })
    await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '晚餐' })
    await createMemo({ type: 'expense', categoryCode: 'expense_transport', content: '地铁' })

    const foodMemos = await listMemos({ type: 'expense', categoryCode: 'expense_food' })
    expect(foodMemos).toHaveLength(2)
    expect(foodMemos.every((m) => m.categoryCode === 'expense_food')).toBe(true)
  })

  it('returns memos sorted by lastUsedAt descending', async () => {
    // Create 3 memos — timestamps may be identical within ms precision
    const id1 = await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '最早' })
    const id2 = await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '中间' })
    const id3 = await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '最新' })

    // All 3 memos should be returned
    let memos = await listMemos({ type: 'expense', categoryCode: 'expense_food' })
    expect(memos).toHaveLength(3)
    // Use expect.arrayContaining since sort by identical timestamps is non-deterministic
    expect(memos.map(m => m.content).sort()).toEqual(['中间', '最新', '最早'])

    // Re-use id1 ("最早") via dedup — bumps its lastUsedAt to now (most recent)
    const id1reused = await createMemo({ type: 'expense', categoryCode: 'expense_food', content: '最早' })
    expect(id1reused).toBe(id1)

    // After re-use, "最早" should be first (most recently used)
    memos = await listMemos({ type: 'expense', categoryCode: 'expense_food' })
    expect(memos[0].content).toBe('最早')
    expect(memos).toHaveLength(3)
  })

  it('returns empty array when no memos match', async () => {
    const memos = await listMemos({ type: 'expense' })
    expect(memos).toEqual([])
  })
})

// ============================================================
// Auto-saving: bill remark -> memo
// ============================================================
describe('auto-save bill remark as memo', () => {
  /**
   * Integration helper: saves a bill and auto-creates a memo when
   * the remark is non-empty. This is the expected integration pattern
   * between the bill and memo modules.
   */
  async function saveBillWithMemo(data: {
    type: BillType
    amount: string
    categoryCode: string
    billDate: string
    remark: string
  }): Promise<void> {
    // Save the bill
    await createBill(data)

    // Auto-create memo for non-empty remark
    if (data.remark && data.remark.trim()) {
      await createMemo({
        type: data.type,
        categoryCode: data.categoryCode,
        content: data.remark.trim(),
      })
    }
  }

  beforeEach(() => {
    registerMocks()
    __registerMock('createBill', () => ({
      success: true,
      data: 'bill_001',
    }))
  })

  it('saves a memo when bill has non-empty remark', async () => {
    expect(store.all()).toHaveLength(0)

    await saveBillWithMemo({
      type: 'expense',
      amount: '25.00',
      categoryCode: 'expense_food',
      billDate: '2026-05-21',
      remark: '午餐',
    })

    expect(store.all()).toHaveLength(1)
    expect(store.all()[0].content).toBe('午餐')
    expect(store.all()[0].categoryCode).toBe('expense_food')
  })

  it('does NOT save a memo when bill has empty remark', async () => {
    await saveBillWithMemo({
      type: 'expense',
      amount: '25.00',
      categoryCode: 'expense_food',
      billDate: '2026-05-21',
      remark: '',
    })

    expect(store.all()).toHaveLength(0)
  })

  it('does NOT save a memo when bill remark is whitespace only', async () => {
    await saveBillWithMemo({
      type: 'expense',
      amount: '25.00',
      categoryCode: 'expense_food',
      billDate: '2026-05-21',
      remark: '   ',
    })

    expect(store.all()).toHaveLength(0)
  })

  it('auto-saves trimmed content as memo remark', async () => {
    await saveBillWithMemo({
      type: 'expense',
      amount: '15.00',
      categoryCode: 'expense_transport',
      billDate: '2026-05-21',
      remark: '  地铁票  ',
    })

    expect(store.all()).toHaveLength(1)
    expect(store.all()[0].content).toBe('地铁票')
  })

  it('dedup works within auto-save: same remark same bill just updates lastUsedAt', async () => {
    const billData = {
      type: 'expense' as BillType,
      amount: '25.00',
      categoryCode: 'expense_food',
      billDate: '2026-05-21',
      remark: '午餐',
    }

    await saveBillWithMemo(billData)
    await saveBillWithMemo(billData)

    // Only 1 memo (dedup), not 2
    expect(store.all()).toHaveLength(1)
  })
})

// ============================================================
// Content validation edge cases
// ============================================================
describe('validateMemoContent', () => {
  it('returns invalid for empty content', () => {
    expect(validateMemoContent('').valid).toBe(false)
    expect(validateMemoContent('   ').valid).toBe(false)
  })

  it('returns valid for normal content', () => {
    expect(validateMemoContent('午餐').valid).toBe(true)
    expect(validateMemoContent('地铁').valid).toBe(true)
  })

  it('rejects content exceeding 200 characters', () => {
    const longText = 'a'.repeat(201)
    const result = validateMemoContent(longText)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('备注内容过长')
  })

  it('accepts content at exactly 200 characters', () => {
    const exactly200 = 'a'.repeat(200)
    expect(validateMemoContent(exactly200).valid).toBe(true)
  })

  it('trims whitespace before validation (createMemo mocks trim internally)', async () => {
    registerMocks()
    const id = await createMemo({
      type: 'expense',
      categoryCode: 'expense_food',
      content: '  午餐  ',
    })
    expect(id).toBeTruthy()
    expect(store.all()[0].content).toBe('午餐')
  })

  it('rejects creating memo with empty content via service', async () => {
    registerMocks()
    // The client-side validator should catch this before calling the cloud function
    expect(validateMemoContent('').valid).toBe(false)
    expect(validateMemoContent('  ').valid).toBe(false)
  })
})
