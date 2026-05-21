/**
 * getStatistics cloud function
 *
 * Accepts:  { month: "YYYY-MM" }
 * Returns:  CloudResult<StatisticsData>
 *
 * Computes monthly summary, expense category rankings,
 * last-7-days daily amounts, and extended statistics.
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// ===== Static category config (mirrors src/constants/categories.ts) =====
// Categories are fixed in V1.0 — no custom add/edit/delete/hide.

const EXPENSE_CATEGORIES = [
  { code: 'expense_food', name: '餐饮', type: 'expense', icon: 'utensil', color: '#F97316', sort: 1 },
  { code: 'expense_transport', name: '交通', type: 'expense', icon: 'truck', color: '#3B82F6', sort: 2 },
  { code: 'expense_shopping', name: '购物', type: 'expense', icon: 'shopping-bag', color: '#EC4899', sort: 3 },
  { code: 'expense_housing', name: '住房', type: 'expense', icon: 'home', color: '#8B5CF6', sort: 4 },
  { code: 'expense_entertainment', name: '娱乐', type: 'expense', icon: 'film', color: '#F43F5E', sort: 5 },
  { code: 'expense_medical', name: '医疗', type: 'expense', icon: 'heart', color: '#EF4444', sort: 6 },
  { code: 'expense_education', name: '教育', type: 'expense', icon: 'academic-cap', color: '#06B6D4', sort: 7 },
  { code: 'expense_communication', name: '通讯', type: 'expense', icon: 'phone', color: '#10B981', sort: 8 },
  { code: 'expense_social', name: '人情', type: 'expense', icon: 'gift', color: '#F59E0B', sort: 9 },
  { code: 'expense_other', name: '其他', type: 'expense', icon: 'dots-horizontal', color: '#94A3B8', sort: 10 },
]

const expenseCategoryMap = new Map()
EXPENSE_CATEGORIES.forEach(function (c) {
  expenseCategoryMap.set(c.code, c)
})

// ===== Helper: generate last N days as YYYY-MM-DD =====
function getLastNDays(n) {
  const result = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    var d = new Date(today)
    d.setDate(d.getDate() - i)
    var y = d.getFullYear()
    var m = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')
    result.push(y + '-' + m + '-' + day)
  }
  return result
}

// ===== Main =====
exports.main = async function (event, context) {
  try {
    var wxContext = cloud.getWXContext()
    var OPENID = wxContext.OPENID
    var month = event.month

    // --- Validate params ---
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return {
        success: false,
        errorCode: 'INVALID_PARAMS',
        message: '月份参数格式错误，应为 YYYY-MM',
      }
    }

    // ============================================================
    // 1. Query bills for the target month
    // ============================================================
    var monthBillsRes = await db.collection('bills')
      .where({
        openid: OPENID,
        billMonth: month,
      })
      .get()

    var monthBills = monthBillsRes.data || []

    // ============================================================
    // 2. Compute summary
    // ============================================================
    var monthIncome = 0
    var monthExpense = 0

    monthBills.forEach(function (bill) {
      if (bill.type === 'income') {
        monthIncome += bill.amount
      } else {
        monthExpense += bill.amount
      }
    })

    var monthBalance = monthIncome - monthExpense

    // ============================================================
    // 3. Category rankings (expense only)
    // ============================================================
    var expenseGroups = {}

    monthBills.forEach(function (bill) {
      if (bill.type === 'expense') {
        var code = bill.categoryCode
        if (!expenseGroups[code]) {
          var cat = expenseCategoryMap.get(code) || {}
          expenseGroups[code] = {
            amount: 0,
            categoryName: bill.categoryName,
            color: cat.color || '#94A3B8',
            icon: cat.icon || 'dots-horizontal',
          }
        }
        expenseGroups[code].amount += bill.amount
      }
    })

    var categoryRankings = Object.keys(expenseGroups).map(function (code) {
      var data = expenseGroups[code]
      return {
        categoryCode: code,
        categoryName: data.categoryName,
        amount: data.amount,
        percentage: 0,
        color: data.color,
        icon: data.icon,
      }
    })

    // Sort by amount DESC
    categoryRankings.sort(function (a, b) {
      return b.amount - a.amount
    })

    // Compute percentages
    var totalExpense = monthExpense
    if (totalExpense > 0) {
      categoryRankings = categoryRankings.map(function (item) {
        return {
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          amount: item.amount,
          percentage: Math.round((item.amount / totalExpense) * 100),
          color: item.color,
          icon: item.icon,
        }
      })
    }

    // ============================================================
    // 4. Daily amounts for last 7 days (NOT affected by month param)
    // ============================================================
    var dates = getLastNDays(7)

    var dailyBillsRes = await db.collection('bills')
      .where({
        openid: OPENID,
        billDate: _.in(dates),
      })
      .get()

    var dailyBills = dailyBillsRes.data || []

    var dailyAmounts = dates.map(function (date) {
      var expense = 0
      var income = 0
      dailyBills.forEach(function (bill) {
        if (bill.billDate === date) {
          if (bill.type === 'expense') expense += bill.amount
          else income += bill.amount
        }
      })
      return { date: date, expense: expense, income: income }
    })

    // ============================================================
    // 5. Top category
    // ============================================================
    var topCategory = null
    if (categoryRankings.length > 0) {
      topCategory = categoryRankings[0]
    }

    // ============================================================
    // 6. Max single expense
    // ============================================================
    var maxSingleExpense = null
    var expenseBills = monthBills.filter(function (b) { return b.type === 'expense' })

    if (expenseBills.length > 0) {
      var maxBill = expenseBills[0]
      expenseBills.forEach(function (bill) {
        if (bill.amount > maxBill.amount) maxBill = bill
      })
      maxSingleExpense = {
        amount: maxBill.amount,
        categoryName: maxBill.categoryName,
        billId: maxBill._id,
      }
    }

    // ============================================================
    // 7. Bill count & days
    // ============================================================
    var billCount = monthBills.length

    var uniqueBillDates = new Set()
    monthBills.forEach(function (bill) {
      uniqueBillDates.add(bill.billDate)
    })
    var billDays = uniqueBillDates.size

    // ============================================================
    // Return
    // ============================================================
    return {
      success: true,
      data: {
        summary: {
          monthIncome: monthIncome,
          monthExpense: monthExpense,
          monthBalance: monthBalance,
        },
        categoryRankings: categoryRankings,
        dailyAmounts: dailyAmounts,
        topCategory: topCategory,
        maxSingleExpense: maxSingleExpense,
        billCount: billCount,
        billDays: billDays,
      },
    }

  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message || '获取统计数据失败',
    }
  }
}
