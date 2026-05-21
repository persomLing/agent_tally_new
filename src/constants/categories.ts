/**
 * Static category configuration
 * Categories are fixed in V1.0 — no custom add/edit/delete/hide.
 * See: doc/proposal.md §13, doc/high-level-design.md §8
 */

import type { CategoryItem, BillType } from '@/types'

// ===== Expense Categories =====
export const EXPENSE_CATEGORIES: CategoryItem[] = [
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

// ===== Income Categories =====
export const INCOME_CATEGORIES: CategoryItem[] = [
  { code: 'income_salary', name: '工资', type: 'income', icon: 'currency-dollar', color: '#10B981', sort: 1 },
  { code: 'income_bonus', name: '奖金', type: 'income', icon: 'sparkles', color: '#F59E0B', sort: 2 },
  { code: 'income_parttime', name: '兼职', type: 'income', icon: 'briefcase', color: '#3B82F6', sort: 3 },
  { code: 'income_investment', name: '投资', type: 'income', icon: 'trending-up', color: '#8B5CF6', sort: 4 },
  { code: 'income_redpacket', name: '红包', type: 'income', icon: 'gift', color: '#F43F5E', sort: 5 },
  { code: 'income_reimburse', name: '报销', type: 'income', icon: 'document-text', color: '#06B6D4', sort: 6 },
  { code: 'income_other', name: '其他', type: 'income', icon: 'dots-horizontal', color: '#94A3B8', sort: 7 },
]

// ===== All Categories =====
export const ALL_CATEGORIES: CategoryItem[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

// ===== Lookup Map =====
const categoryMap = new Map<string, CategoryItem>()
ALL_CATEGORIES.forEach(c => categoryMap.set(c.code, c))

/** Get all categories for a given type */
export function getCategoriesByType(type: BillType): CategoryItem[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
}

/** Get category by code */
export function getCategory(code: string): CategoryItem | undefined {
  return categoryMap.get(code)
}

/** Validate category code exists and matches the given type */
export function isValidCategory(code: string, type?: BillType): boolean {
  const cat = categoryMap.get(code)
  if (!cat) return false
  if (type && cat.type !== type) return false
  return true
}

/** Get category name by code */
export function getCategoryName(code: string): string {
  return categoryMap.get(code)?.name ?? code
}
