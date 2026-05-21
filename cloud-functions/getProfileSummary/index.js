/**
 * getProfileSummary — 个人中心汇总数据云函数
 *
 * 返回当前用户的头像昵称、坚持记账天数、本月预算进度等信息。
 *
 * 请求参数：无（通过云函数上下文获取 OPENID）
 *
 * 返回 CloudResult<ProfileSummary>:
 *   nickName, avatarUrl, persistDays
 *   monthIncome (cents), monthExpense (cents)
 *   budgetRemaining (monthIncome - monthExpense, cents)
 *   budgetProgress (0-100 or -1 for no-income)
 *   daysToMonthEnd
 *   hasIncome, isOverBudget, overBudgetAmount
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 计算距离月底还有多少天（不含今天）
 */
function getDaysToMonthEnd() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  // 下个月的第 0 天 = 本月的最后一天
  const lastDay = new Date(year, month, 0).getDate()
  return lastDay - now.getDate()
}

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
    // 1. 查询用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID,
    }).get()

    const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null
    const nickName = user?.nickName ?? ''
    const avatarUrl = user?.avatarUrl ?? ''

    // 2. 查询本月账单收支
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonth = `${year}-${month}`

    const monthBillsResult = await db.collection('bills').where({
      openid: OPENID,
      billMonth: currentMonth,
    }).get()

    const monthBills = monthBillsResult.data || []

    let monthIncome = 0
    let monthExpense = 0

    for (const bill of monthBills) {
      if (bill.type === 'income') {
        monthIncome += bill.amount
      } else if (bill.type === 'expense') {
        monthExpense += bill.amount
      }
    }

    // 3. 查询所有账单用于计算 persistDays（不同 billDate 数量）
    const allBillsResult = await db.collection('bills').where({
      openid: OPENID,
    }).get()

    const allBills = allBillsResult.data || []
    const uniqueDates = new Set(allBills.map((b) => b.billDate))
    const persistDays = uniqueDates.size

    // 4. 计算预算相关指标
    const budgetRemaining = monthIncome - monthExpense
    const hasIncome = monthIncome > 0
    const isOverBudget = monthExpense > monthIncome
    const overBudgetAmount = Math.max(0, monthExpense - monthIncome)

    let budgetProgress = -1
    if (hasIncome) {
      budgetProgress = Math.min(100, (monthExpense / monthIncome) * 100)
    }

    const daysToMonthEnd = getDaysToMonthEnd()

    // 5. 返回结果
    return {
      success: true,
      data: {
        nickName,
        avatarUrl,
        persistDays,
        monthIncome,
        monthExpense,
        budgetRemaining,
        budgetProgress,
        daysToMonthEnd,
        hasIncome,
        isOverBudget,
        overBudgetAmount,
      },
    }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message || '服务异常，请稍后重试',
    }
  }
}
