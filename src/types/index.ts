// ===== Cloud Result =====
export interface CloudResult<T = any> {
  success: boolean
  data?: T
  errorCode?: string
  message?: string
}

// ===== User =====
export interface UserProfile {
  openid: string
  nickName: string
  avatarUrl: string
  authorized: boolean
  firstAuthorizedAt?: string
  createdAt?: string
  updatedAt?: string
}

// ===== Bill =====
export type BillType = 'expense' | 'income'

export interface Bill {
  _id?: string
  openid: string
  type: BillType
  amount: number // stored in cents (分)
  categoryCode: string
  categoryName: string
  billDate: string // YYYY-MM-DD
  billMonth: string // YYYY-MM
  remark: string
  createdAt?: string
  updatedAt?: string
}

export interface BillFormData {
  type: BillType
  amount: string // display amount in yuan, string for calculator
  categoryCode: string
  billDate: string
  remark: string
}

// ===== Memo =====
export interface Memo {
  _id?: string
  openid: string
  type: BillType
  categoryCode: string
  categoryName: string
  content: string
  lastUsedAt?: string
  createdAt?: string
  updatedAt?: string
}

// ===== Category =====
export interface CategoryItem {
  code: string
  name: string
  type: BillType
  icon: string
  color: string
  sort: number
}

// ===== Statistics =====
export interface MonthSummary {
  monthIncome: number
  monthExpense: number
  monthBalance: number
}

export interface CategoryRanking {
  categoryCode: string
  categoryName: string
  amount: number
  percentage: number
  color: string
  icon: string
}

export interface DailyAmount {
  date: string
  expense: number
  income: number
}

export interface StatisticsData {
  summary: MonthSummary
  categoryRankings: CategoryRanking[]
  dailyAmounts: DailyAmount[]
  topCategory: CategoryRanking | null
  maxSingleExpense: { amount: number; categoryName: string; billId?: string } | null
  billCount: number
  billDays: number
}

// ===== Profile =====
export interface ProfileSummary {
  nickName: string
  avatarUrl: string
  persistDays: number
  monthIncome: number
  monthExpense: number
  budgetRemaining: number
  budgetProgress: number // 0-100 or -1 for no-income
  daysToMonthEnd: number
  hasIncome: boolean
  isOverBudget: boolean
  overBudgetAmount: number
}

// ===== Common =====
export interface OptionItem {
  label: string
  value: string
}
