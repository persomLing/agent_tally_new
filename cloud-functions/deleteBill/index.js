/**
 * Cloud Function: deleteBill
 * Deletes a bill document. Validates ownership before deletion.
 */
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) {
      return { success: false, errorCode: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const { id } = event

    if (!id) {
      return { success: false, errorCode: 'INVALID_PARAMS', message: '缺少账单 ID' }
    }

    // Fetch existing bill to verify ownership
    const billQuery = await db.collection('bills').doc(id).get()
    if (!billQuery.data) {
      return { success: false, errorCode: 'NOT_FOUND', message: '账单不存在' }
    }

    if (billQuery.data.openid !== OPENID) {
      return { success: false, errorCode: 'PERMISSION_DENIED', message: '无权限删除此账单' }
    }

    // Delete the bill document
    await db.collection('bills').doc(id).remove()

    return { success: true, data: id }
  } catch (err) {
    console.error('[deleteBill] Error:', err)
    return { success: false, errorCode: 'SERVICE_ERROR', message: '删除账单失败' }
  }
}
