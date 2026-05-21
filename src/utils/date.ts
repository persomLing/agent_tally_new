/**
 * Date utilities for the accounting mini-program
 */

/** Get current date as YYYY-MM-DD */
export function getToday(): string {
  const d = new Date()
  return formatDate(d)
}

/** Get current month as YYYY-MM */
export function getCurrentMonth(): string {
  const d = new Date()
  return formatMonth(d)
}

/** Format Date to YYYY-MM-DD */
export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format Date to YYYY-MM */
export function formatMonth(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Extract YYYY-MM from a YYYY-MM-DD string */
export function extractMonth(dateStr: string): string {
  return dateStr.substring(0, 7)
}

/** Get the month end day count (e.g. 31 for May) */
export function getMonthEndDay(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Get days remaining until end of month (excluding today) */
export function getDaysToMonthEnd(): number {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const lastDay = getMonthEndDay(year, month)
  return lastDay - today.getDate()
}

/** Generate the last N days as YYYY-MM-DD array (including today) */
export function getLastNDays(n: number): string[] {
  const result: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    result.push(formatDate(d))
  }
  return result
}

/** Format a date string (YYYY-MM-DD) to "M月D日 星期X" */
export function formatDateLabel(dateStr: string): string {
  const d = parseDate(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[d.getDay()]
  return `${month}月${day}日 ${weekday}`
}

/** Parse YYYY-MM-DD string to Date */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format year-month for display, e.g. "2026年5月" */
export function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-')
  return `${y}年${parseInt(m)}月`
}

/** Check if a date string is valid YYYY-MM-DD */
export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = parseDate(dateStr)
  return formatDate(d) === dateStr
}

/** Get the month from a YYYY-MM string as number */
export function getMonthNumber(yearMonth: string): number {
  return parseInt(yearMonth.split('-')[1])
}

/** Get the year from a YYYY-MM string as number */
export function getYearNumber(yearMonth: string): number {
  return parseInt(yearMonth.split('-')[0])
}
