/**
 * Cloud Function: createBill
 * Creates a new bill document and auto-saves remark to memos collection.
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
 * Validate the request parameters.
 * Returns { valid: boolean, error?: { errorCode: string, message: string } }
 */
function validateParams({ type, amount, categoryCode, billDate }) {
  // Validate type
  if (!type || !['expense', 'income'].includes(type)) {
    return { valid: false, error: { errorCode: 'INVALID_TYPE', message: '类型无效' } }
  }

  // Validate amount
  if (!amount || amount.trim() === '' || isNaN(parseFloat(amount))) {
    return { valid: false, error: { errorCode: 'INVALID_AMOUNT', message: '请输入金额' } }
  }

  const amountNum = parseFloat(amount)
  if (amountNum <= 0) {
    return { valid: false, error: { errorCode: 'AMOUNT_ZERO', message: '金额必须大于 0' } }
  }

  if (amountNum > 9999999.99) {
    return { valid: false, error: { errorCode: 'AMOUNT_OVERFLOW', message: '金额超出限制' } }
  }

  // Check decimal places (maximum 2)
  const parts = amount.split('.')
  if (parts.length > 1 && parts[1].length > 2) {
    return { valid: false, error: { errorCode: 'INVALID_AMOUNT', message: '金额最多两位小数' } }
  }

  // Validate category
  if (!categoryCode) {
    return { valid: false, error: { errorCode: 'INVALID_CATEGORY', message: '请选择分类' } }
  }

  const category = CATEGORY_MAP[categoryCode]
  if (!category) {
    return { valid: false, error: { errorCode: 'INVALID_CATEGORY', message: '分类不存在' } }
  }

  if (category.type !== type) {
    return { valid: false, error: { errorCode: 'INVALID_CATEGORY', message: '分类与类型不匹配' } }
  }

  // Validate billDate (must be valid YYYY-MM-DD)
  if (!billDate || !/^\d{4}-\d{2}-\d{2}$/.test(billDate)) {
    return { valid: false, error: { errorCode: 'INVALID_DATE', message: '日期格式无效' } }
  }

  const d = new Date(billDate)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (`${y}-${m}-${day}` !== billDate) {
    return { valid: false, error: { errorCode: 'INVALID_DATE', message: '日期无效' } }
  }

  return { valid: true }
}

/**
 * Auto-save remark to memos collection.
 * Dedup by openid + type + categoryCode + content.
 * Limit 10 per category (openid + type + categoryCode).
 */
async function autoSaveMemo({ openid, type, categoryCode, content }) {
  if (!content || !content.trim()) return

  const trimmed = content.trim()
  const category = CATEGORY_MAP[categoryCode]

  // Check if memo already exists (dedup)
  const existingQuery = await db.collection('memos').where({
    openid,
    type,
    categoryCode,
    content: trimmed,
  }).get()

  if (existingQuery.data.length > 0) {
    // Update lastUsedAt on existing memo
    await db.collection('memos').doc(existingQuery.data[0]._id).update({
      data: {
        lastUsedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    return
  }

  // Check count per category (limit 10)
  const countResult = await db.collection('memos').where({
    openid,
    type,
    categoryCode,
  }).count()

  if (countResult.total >= 10) return

  // Create new memo
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

    const { type, amount, categoryCode, billDate, remark } = event

    // Validate parameters
    const validation = validateParams({ type, amount, categoryCode, billDate })
    if (!validation.valid) {
      return { success: false, ...validation.error }
    }

    // Convert amount to cents
    const amountCents = Math.round(parseFloat(amount) * 100)

    // Extract bill month from date
    const billMonth = billDate.substring(0, 7)

    // Create bill document
    const category = CATEGORY_MAP[categoryCode]
    const result = await db.collection('bills').add({
      data: {
        openid: OPENID,
        type,
        amount: amountCents,
        categoryCode,
        categoryName: category.name,
        billDate,
        billMonth,
        remark: remark || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    // Auto-save memo if remark is non-empty
    if (remark && remark.trim()) {
      await autoSaveMemo({
        openid: OPENID,
        type,
        categoryCode,
        content: remark,
      })
    }

    return { success: true, data: result._id }
  } catch (err) {
    console.error('[createBill] Error:', err)
    return { success: false, errorCode: 'SERVICE_ERROR', message: '创建账单失败' }
  }
}
