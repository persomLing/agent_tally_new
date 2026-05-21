/**
 * clearBills — 清空当前用户全部账单云函数
 *
 * 仅删除当前用户的 bills 集合数据，不删除 memos（记忆库）。
 * 前端需先二次确认再调用此函数。
 *
 * 请求参数：无（通过云函数上下文获取 OPENID）
 *
 * 返回 CloudResult
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return {
      success: false,
      errorCode: 'NO_OPENID',
      message: '无法获取用户身份',
    }
  }

  try {
    // 分批删除当前用户的所有账单
    // 云数据库单次最多删除 100 条，需要循环处理
    const BATCH_SIZE = 100
    let deletedTotal = 0

    while (true) {
      const result = await db.collection('bills')
        .where({ openid: OPENID })
        .limit(BATCH_SIZE)
        .get()

      const records = result.data || []

      if (records.length === 0) {
        break
      }

      const ids = records.map((r) => r._id)

      await db.collection('bills')
        .where({ _id: _.in(ids) })
        .remove()

      deletedTotal += ids.length

      // 如果本次不足 100 条，说明已全部删除
      if (records.length < BATCH_SIZE) {
        break
      }
    }

    return {
      success: true,
      data: {
        deletedCount: deletedTotal,
      },
    }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message || '清空账单失败，请稍后重试',
    }
  }
}
