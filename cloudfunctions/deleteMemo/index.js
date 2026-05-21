const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

/**
 * deleteMemo cloud function
 *
 * Accepts: { id }
 * - Validates memo belongs to current user
 * - Deletes the memo document
 *
 * Returns: CloudResult
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event

  // Validate id
  if (!id) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: '缺少ID' }
  }

  try {
    // Validate memo exists and belongs to current user
    const doc = await db.collection('memos').doc(id).get()
    if (!doc.data) {
      return { success: false, errorCode: 'NOT_FOUND', message: '备注不存在' }
    }
    if (doc.data.openid !== OPENID) {
      return { success: false, errorCode: 'PERMISSION_DENIED', message: '无权限执行此操作' }
    }

    // Delete the memo
    await db.collection('memos').doc(id).remove()

    return { success: true }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message,
    }
  }
}
