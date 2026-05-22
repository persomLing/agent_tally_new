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
const MAX_LIMIT = 100

// ===== Static category config (mirrors src/constants/categories.ts) =====

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

// ===== Helper: paginated query to handle >100 docs =====
async function getAllBills(where) {
  var all = []
  var offset = 0
  while (true) {
    var res = await db.collection('bills').where(where).skip(offset).limit(MAX_LIMIT).get()
    all = all.concat(res.data || [])
    if (!res.data || res.data.length < MAX_LIMIT) break
    offset += MAX_LIMIT
  }
  return all
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
    // 1. Collect all dates needed: month range + last 7 days
    // ============================================================
    var dates = getLastNDays(7)

    // Build a set of all unique dates to query in one pass
    var allDateSet = new Set()
    dates.forEach(function (d) { allDateSet.add(d) })

    // Add all dates in the target month
    var monthParts = month.split('-')
    var year = parseInt(monthParts[0], 10)
    var monthNum = parseInt(monthParts[1], 10)
    var daysInMonth = new Date(year, monthNum, 0).getDate()
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' + String(monthNum).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      allDateSet.add(dateStr)
    }

    var allDates = []
    allDateSet.forEach(function (d) { allDates.push(d) })

    // ============================================================
    // 2. Single query: get all bills in the combined date range
    // ============================================================
    var allBills = await getAllBills({
      openid: OPENID,
      billDate: _.in(allDates),
    })

    // ============================================================
    // 3. Split into month bills and daily bills
    // ============================================================
    var monthBills = []
    allBills.forEach(function (bill) {
      bill.billDate && bill.billDate.substring(0, 7) === month && monthBills.push(bill)
    })

    // ============================================================
    // 4. Compute summary
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
    // 5. Category rankings (expense only)
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

    categoryRankings.sort(function (a, b) {
      return b.amount - a.amount
    })

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
    // 6. Daily amounts for last 7 days
    // ============================================================
    var dailyAmounts = dates.map(function (date) {
      var expense = 0
      var income = 0
      allBills.forEach(function (bill) {
        if (bill.billDate === date) {
          if (bill.type === 'expense') expense += bill.amount
          else income += bill.amount
        }
      })
      return { date: date, expense: expense, income: income }
    })

    // ============================================================
    // 7. Top category
    // ============================================================
    var topCategory = null
    if (categoryRankings.length > 0) {
      topCategory = categoryRankings[0]
    }

    // ============================================================
    // 8. Max single expense
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
    // 9. Bill count & days
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
