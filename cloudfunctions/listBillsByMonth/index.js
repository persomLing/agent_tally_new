/**
 * listBillsByMonth — 查询指定年月的账单列表和月度汇总
 *
 * 参数: { month: "YYYY-MM" }
 * 返回: CloudResult<{ bills: Bill[], monthIncome: number, monthExpense: number }>
 *
 * - 金额以分为单位存储和返回
 * - 按 billDate 降序、createdAt 降序排列
 * - 仅返回当前用户的账单
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { month } = event

  // 校验月份参数
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return {
      success: false,
      errorCode: 'PARAM_ERROR',
      message: '参数错误：月份格式不正确，应为 YYYY-MM',
    }
  }

  const db = cloud.database()

  try {
    // 查询指定月份的所有账单，按 billDate DESC, createdAt DESC 排序
    const result = await db.collection('bills')
      .where({
        openid: OPENID,
        billMonth: month,
      })
      .orderBy('billDate', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const bills = result.data || []

    // 计算月收入和月支出（金额单位：分）
    let monthIncome = 0
    let monthExpense = 0

    for (const bill of bills) {
      if (bill.type === 'income') {
        monthIncome += bill.amount
      } else if (bill.type === 'expense') {
        monthExpense += bill.amount
      }
    }

    return {
      success: true,
      data: {
        bills,
        monthIncome,
        monthExpense,
      },
    }
  } catch (err) {
    return {
      success: false,
      errorCode: 'DB_ERROR',
      message: err.message || '数据库查询失败',
    }
  }
}
