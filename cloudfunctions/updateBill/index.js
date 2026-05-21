/**
 * Cloud Function: updateBill
 * Updates an existing bill document. Validates ownership before update.
 */
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

// ===== Category Validation Map =====
const CATEGORY_MAP = {
  'expense_food': { name: '餐饮', type: 'expense' },
  'expense_transport': { name: '交通', type: 'expense' },
  'expense_shopping': { name: '购物', type: 'expense' },
  'expense_housing': { name: '住房', type: 'expense' },
  'expense_entertainment': { name: '娱乐', type: 'expense' },
  'expense_medical': { name: '医疗', type: 'expense' },
  'expense_education': { name: '教育', type: 'expense' },
  'expense_communication': { name: '通讯', type: 'expense' },
  'expense_social': { name: '人情', type: 'expense' },
  'expense_other': { name: '其他', type: 'expense' },
  'income_salary': { name: '工资', type: 'income' },
  'income_bonus': { name: '奖金', type: 'income' },
  'income_parttime': { name: '兼职', type: 'income' },
  'income_investment': { name: '投资', type: 'income' },
  'income_redpacket': { name: '红包', type: 'income' },
  'income_reimburse': { name: '报销', type: 'income' },
  'income_other': { name: '其他', type: 'income' },
}

/**
 * Validate the update parameters.
 * Only validates fields that are present in the request.
 */
function validateUpdateParams({ type, amount, categoryCode, billDate }) {
  if (type !== undefined && !['expense', 'income'].includes(type)) {
    return { valid: false, error: { errorCode: 'INVALID_TYPE', message: '类型无效' } }
  }

  if (amount !== undefined) {
    if (amount.trim() === '' || isNaN(parseFloat(amount))) {
      return { valid: false, error: { errorCode: 'INVALID_AMOUNT', message: '请输入金额' } }
    }
    const amountNum = parseFloat(amount)
    if (amountNum <= 0) {
      return { valid: false, error: { errorCode: 'AMOUNT_ZERO', message: '金额必须大于 0' } }
    }
    if (amountNum > 9999999.99) {
      return { valid: false, error: { errorCode: 'AMOUNT_OVERFLOW', message: '金额超出限制' } }
    }
    const parts = amount.split('.')
    if (parts.length > 1 && parts[1].length > 2) {
      return { valid: false, error: { errorCode: 'INVALID_AMOUNT', message: '金额最多两位小数' } }
    }
  }

  if (categoryCode !== undefined) {
    if (!categoryCode) {
      return { valid: false, error: { errorCode: 'INVALID_CATEGORY', message: '请选择分类' } }
    }
    const category = CATEGORY_MAP[categoryCode]
    if (!category) {
      return { valid: false, error: { errorCode: 'INVALID_CATEGORY', message: '分类不存在' } }
    }
    // If both type and categoryCode are provided, verify type match
    if (type && category.type !== type) {
      return { valid: false, error: { errorCode: 'INVALID_CATEGORY', message: '分类与类型不匹配' } }
    }
  }

  if (billDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) {
      return { valid: false, error: { errorCode: 'INVALID_DATE', message: '日期格式无效' } }
    }
    const d = new Date(billDate)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    if (`${y}-${m}-${day}` !== billDate) {
      return { valid: false, error: { errorCode: 'INVALID_DATE', message: '日期无效' } }
    }
  }

  return { valid: true }
}

/**
 * Auto-save remark to memos collection.
 * Same logic as createBill: dedup by openid+type+categoryCode+content, limit 10 per category.
 */
async function autoSaveMemo({ openid, type, categoryCode, content }) {
  if (!content || !content.trim()) return

  const trimmed = content.trim()
  const category = CATEGORY_MAP[categoryCode]

  // Check for existing memo (dedup)
  const existingQuery = await db.collection('memos').where({
    openid,
    type,
    categoryCode,
    content: trimmed,
  }).get()

  if (existingQuery.data.length > 0) {
    await db.collection('memos').doc(existingQuery.data[0]._id).update({
      data: {
        lastUsedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    return
  }

  // Check count limit (10 per category)
  const countResult = await db.collection('memos').where({
    openid,
    type,
    categoryCode,
  }).count()

  if (countResult.total >= 10) return

  await db.collection('memos').add({
    data: {
      openid,
      type,
      categoryCode,
      categoryName: category.name,
      content: trimmed,
      lastUsedAt: db.serverDate(),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })
}

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) {
      return { success: false, errorCode: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const { id, type, amount, categoryCode, billDate, remark } = event

    if (!id) {
      return { success: false, errorCode: 'INVALID_PARAMS', message: '缺少账单 ID' }
    }

    // Validate parameters
    const validation = validateUpdateParams({ type, amount, categoryCode, billDate })
    if (!validation.valid) {
      return { success: false, ...validation.error }
    }

    // Fetch existing bill to verify ownership
    const billQuery = await db.collection('bills').doc(id).get()
    if (!billQuery.data) {
      return { success: false, errorCode: 'NOT_FOUND', message: '账单不存在' }
    }

    const existingBill = billQuery.data
    if (existingBill.openid !== OPENID) {
      return { success: false, errorCode: 'PERMISSION_DENIED', message: '无权限修改此账单' }
    }

    // Build update data (only allowed fields)
    const updateData = {
      updatedAt: db.serverDate(),
    }

    // Resolve the effective type for category validation and memo
    const effectiveType = type || existingBill.type
    const effectiveCategoryCode = categoryCode || existingBill.categoryCode

    if (type !== undefined) updateData.type = type
    if (amount !== undefined) updateData.amount = Math.round(parseFloat(amount) * 100)
    if (categoryCode !== undefined) {
      updateData.categoryCode = categoryCode
      updateData.categoryName = CATEGORY_MAP[categoryCode].name
    }
    if (billDate !== undefined) {
      updateData.billDate = billDate
      updateData.billMonth = billDate.substring(0, 7)
    }
    if (remark !== undefined) updateData.remark = remark

    // Perform the update
    await db.collection('bills').doc(id).update({
      data: updateData,
    })

    // Auto-save memo if remark changed and is non-empty
    if (remark !== undefined && remark.trim() && remark !== existingBill.remark) {
      await autoSaveMemo({
        openid: OPENID,
        type: effectiveType,
        categoryCode: effectiveCategoryCode,
        content: remark,
      })
    }

    return { success: true, data: id }
  } catch (err) {
    console.error('[updateBill] Error:', err)
    return { success: false, errorCode: 'SERVICE_ERROR', message: '更新账单失败' }
  }
}
