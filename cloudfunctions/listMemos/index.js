const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

/**
 * listMemos cloud function
 *
 * Accepts: { type: 'expense'|'income', categoryCode?: string }
 * Returns memos for the current user, filtered by type and optional categoryCode,
 * sorted by lastUsedAt descending.
 *
 * Returns: CloudResult<Memo[]>
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { type, categoryCode } = event

  // Validate type
  if (!type || !['expense', 'income'].includes(type)) {
    return { success: false, errorCode: 'INVALID_TYPE', message: '类型无效' }
  }

  try {
    const query = { openid: OPENID, type }
    if (categoryCode) {
      query.categoryCode = categoryCode
    }

    const res = await db.collection('memos')
      .where(query)
      .orderBy('lastUsedAt', 'desc')
      .get()

    return {
      success: true,
      data: res.data,
    }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message,
    }
  }
}
