const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

/**
 * updateMemo cloud function
 *
 * Accepts: { id, content }
 * - Validates memo belongs to current user
 * - Updates content and updatedAt
 *
 * Returns: CloudResult
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { id, content } = event

  // Validate id
  if (!id) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: '缺少ID' }
  }

  // Validate content
  if (!content || content.trim() === '') {
    return { success: false, errorCode: 'INVALID_PARAMS', message: '备注内容不能为空' }
  }
  const trimmedContent = content.trim()
  if (trimmedContent.length > 200) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: '备注内容过长' }
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

    // Update content and updatedAt
    await db.collection('memos').doc(id).update({
      data: {
        content: trimmedContent,
        updatedAt: db.serverDate(),
      },
    })

    return { success: true }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message,
    }
  }
}
