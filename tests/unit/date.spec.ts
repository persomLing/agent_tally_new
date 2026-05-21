import {
  getToday,
  getCurrentMonth,
  formatDate,
  formatMonth,
  extractMonth,
  getMonthEndDay,
  getDaysToMonthEnd,
  getLastNDays,
  formatDateLabel,
  parseDate,
  formatYearMonth,
  isValidDate,
  getMonthNumber,
  getYearNumber,
} from '@/utils/date'

describe('date utils', () => {
  describe('getToday', () => {
    it('returns today in YYYY-MM-DD format', () => {
      const today = getToday()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const d = new Date()
      const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(today).toBe(expected)
    })
  })

  describe('getCurrentMonth', () => {
    it('returns current month in YYYY-MM format', () => {
      const month = getCurrentMonth()
      expect(month).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  describe('formatDate', () => {
    it('formats Date to YYYY-MM-DD', () => {
      const d = new Date(2026, 4, 19) // May 19, 2026
      expect(formatDate(d)).toBe('2026-05-19')
    })
  })

  describe('formatMonth', () => {
    it('formats Date to YYYY-MM', () => {
      const d = new Date(2026, 4, 19)
      expect(formatMonth(d)).toBe('2026-05')
    })
  })

  describe('extractMonth', () => {
    it('extracts YYYY-MM from YYYY-MM-DD', () => {
      expect(extractMonth('2026-05-19')).toBe('2026-05')
    })
  })

  describe('getMonthEndDay', () => {
    it('returns correct days for May (31)', () => {
      expect(getMonthEndDay(2026, 5)).toBe(31)
    })

    it('returns correct days for February (28)', () => {
      expect(getMonthEndDay(2026, 2)).toBe(28)
    })

    it('handles leap year February', () => {
      expect(getMonthEndDay(2024, 2)).toBe(29)
    })
  })

  describe('getDaysToMonthEnd', () => {
    it('returns a non-negative number', () => {
      const days = getDaysToMonthEnd()
      expect(days).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getLastNDays', () => {
    it('returns N date strings', () => {
      const days = getLastNDays(7)
      expect(days).toHaveLength(7)
      days.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
    })

    it('last entry is today', () => {
      const days = getLastNDays(7)
      expect(days[days.length - 1]).toBe(getToday())
    })
  })

  describe('formatDateLabel', () => {
    it('formats to Chinese date format', () => {
      // 2026-05-19 is a Tuesday
      const label = formatDateLabel('2026-05-19')
      expect(label).toBe('5月19日 星期二')
    })
  })

  describe('formatYearMonth', () => {
    it('formats to Chinese year-month', () => {
      expect(formatYearMonth('2026-05')).toBe('2026年5月')
      expect(formatYearMonth('2026-12')).toBe('2026年12月')
    })
  })

  describe('isValidDate', () => {
    it('validates correct dates', () => {
      expect(isValidDate('2026-05-19')).toBe(true)
    })

    it('rejects invalid dates', () => {
      expect(isValidDate('2026-13-01')).toBe(false)
      expect(isValidDate('2026-00-01')).toBe(false)
      expect(isValidDate('2026/05/19')).toBe(false)
      expect(isValidDate('')).toBe(false)
    })
  })

  describe('getMonthNumber / getYearNumber', () => {
    it('extracts month and year', () => {
      expect(getMonthNumber('2026-05')).toBe(5)
      expect(getYearNumber('2026-05')).toBe(2026)
    })
  })

  describe('parseDate', () => {
    it('parses YYYY-MM-DD string to Date', () => {
      const d = parseDate('2026-05-19')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(4) // 0-indexed
      expect(d.getDate()).toBe(19)
    })
  })
})
