/**
 * Cloud Function: getBillById
 * Fetches a single bill by ID. Validates ownership.
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

    const billQuery = await db.collection('bills').doc(id).get()
    if (!billQuery.data) {
      return { success: false, errorCode: 'NOT_FOUND', message: '账单不存在' }
    }

    if (billQuery.data.openid !== OPENID) {
      return { success: false, errorCode: 'PERMISSION_DENIED', message: '无权限查看此账单' }
    }

    return { success: true, data: billQuery.data }
  } catch (err) {
    console.error('[getBillById] Error:', err)
    return { success: false, errorCode: 'SERVICE_ERROR', message: '获取账单失败' }
  }
}
