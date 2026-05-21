const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

/**
 * Category lookup map for validation.
 * Mirrors the category definitions in src/constants/categories.ts.
 */
const CATEGORY_MAP = {
  expense_food: { name: '餐饮', type: 'expense' },
  expense_transport: { name: '交通', type: 'expense' },
  expense_shopping: { name: '购物', type: 'expense' },
  expense_housing: { name: '住房', type: 'expense' },
  expense_entertainment: { name: '娱乐', type: 'expense' },
  expense_medical: { name: '医疗', type: 'expense' },
  expense_education: { name: '教育', type: 'expense' },
  expense_communication: { name: '通讯', type: 'expense' },
  expense_social: { name: '人情', type: 'expense' },
  expense_other: { name: '其他', type: 'expense' },
  income_salary: { name: '工资', type: 'income' },
  income_bonus: { name: '奖金', type: 'income' },
  income_parttime: { name: '兼职', type: 'income' },
  income_investment: { name: '投资', type: 'income' },
  income_redpacket: { name: '红包', type: 'income' },
  income_reimburse: { name: '报销', type: 'income' },
  income_other: { name: '其他', type: 'income' },
}

/**
 * createMemo cloud function
 *
 * Accepts: { type, categoryCode, content }
 * - Validates content non-empty and category code valid
 * - Dedup: if same content exists for user+type+categoryCode, update lastUsedAt only
 * - Enforces 10-item limit per user+type+categoryCode (deletes oldest when full)
 * - Creates memo with openid, type, categoryCode, categoryName, content, timestamps
 *
 * Returns: CloudResult with memo _id
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { type, categoryCode, content } = event

  // Validate type
  if (!type || !['expense', 'income'].includes(type)) {
    return { success: false, errorCode: 'INVALID_TYPE', message: '类型无效' }
  }

  // Validate content
  if (!content || content.trim() === '') {
    return { success: false, errorCode: 'INVALID_PARAMS', message: '备注内容不能为空' }
  }
  const trimmedContent = content.trim()
  if (trimmedContent.length > 200) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: '备注内容过长' }
  }

  // Validate category
  const category = CATEGORY_MAP[categoryCode]
  if (!category) {
    return { success: false, errorCode: 'INVALID_CATEGORY', message: '分类不存在' }
  }
  if (category.type !== type) {
    return { success: false, errorCode: 'INVALID_TYPE', message: '分类与类型不匹配' }
  }

  try {
    // --- Dedup: same content already exists ---
    const dupRes = await db.collection('memos')
      .where({
        openid: OPENID,
        type,
        categoryCode,
        content: trimmedContent,
      })
      .get()

    if (dupRes.data.length > 0) {
      // Update lastUsedAt on existing memo, do NOT duplicate
      const existingId = dupRes.data[0]._id
      await db.collection('memos').doc(existingId).update({
        data: {
          lastUsedAt: db.serverDate(),
        },
      })
      return { success: true, data: existingId }
    }

    // --- Enforce 10-item limit per user+type+categoryCode ---
    const countRes = await db.collection('memos')
      .where({
        openid: OPENID,
        type,
        categoryCode,
      })
      .count()

    if (countRes.total >= 10) {
      // Find the oldest memo (by lastUsedAt, fallback createdAt)
      const oldestRes = await db.collection('memos')
        .where({
          openid: OPENID,
          type,
          categoryCode,
        })
        .orderBy('lastUsedAt', 'asc')
        .limit(1)
        .get()

      if (oldestRes.data.length > 0) {
        await db.collection('memos').doc(oldestRes.data[0]._id).remove()
      }
    }

    // --- Create new memo ---
    const result = await db.collection('memos').add({
      data: {
        openid: OPENID,
        type,
        categoryCode,
        categoryName: category.name,
        content: trimmedContent,
        lastUsedAt: db.serverDate(),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return { success: true, data: result._id }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message,
    }
  }
}
