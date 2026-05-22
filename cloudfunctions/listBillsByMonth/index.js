/**
 * listBillsByMonth — 查询指定年月的账单列表和月度汇总
 *
 * 参数: { month: "YYYY-MM", page?: number, pageSize?: number }
 * 返回: CloudResult<{ bills: Bill[], monthIncome: number, monthExpense: number, total: number, hasMore: boolean }>
 *
 * - 金额以分为单位存储和返回
 * - 按 billDate 降序、createdAt 降序排列
 * - 仅返回当前用户的账单
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { month, page = 1, pageSize = 20 } = event

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
    const query = db.collection('bills').where({
      openid: OPENID,
      billMonth: month,
    })

    // 获取全月数据用于汇总和计数
    const allResult = await query
      .orderBy('billDate', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get()

    const allBills = allResult.data || []
    const total = allBills.length

    // 计算月收入和月支出（基于全月数据）
    let monthIncome = 0
    let monthExpense = 0
    for (const bill of allBills) {
      if (bill.type === 'income') {
        monthIncome += bill.amount
      } else if (bill.type === 'expense') {
        monthExpense += bill.amount
      }
    }

    // 分页截取
    const skip = (page - 1) * pageSize
    const bills = allBills.slice(skip, skip + pageSize)
    const hasMore = skip + bills.length < total

    return {
      success: true,
      data: {
        bills,
        monthIncome,
        monthExpense,
        total,
        hasMore,
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
