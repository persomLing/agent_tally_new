<template>
  <div class="statistics-page">
    <!-- Header: Month Picker -->
    <div class="stats-header">
      <MonthPicker v-model="currentMonth" />
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="loading-skeleton">
      <div class="skeleton-card skeleton-h-100"></div>
      <div class="skeleton-card skeleton-h-200"></div>
      <div class="skeleton-card skeleton-h-200"></div>
      <div class="skeleton-card skeleton-h-150"></div>
      <div class="skeleton-card skeleton-h-120"></div>
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- ===== 1. Summary Card ===== -->
      <div class="card summary-card">
        <div class="summary-item">
          <span class="summary-label">收入</span>
          <span class="summary-value income">+{{ formatSummaryAmount(summary.monthIncome) }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">支出</span>
          <span class="summary-value expense">&minus;{{ formatSummaryAmount(summary.monthExpense) }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">结余</span>
          <span class="summary-value" :class="balanceClass">{{ formatSigned(summary.monthBalance) }}</span>
        </div>
      </div>

      <!-- ===== 2. Expense Distribution ===== -->
      <div class="section-title">支出分类</div>
      <div class="card">
        <EmptyState
          v-if="!hasExpense"
          text="本月暂无支出数据。"
        />
        <div v-else class="expense-distribution">
          <!-- Donut chart -->
          <div class="pie-chart-area">
            <div class="donut-chart" :style="{ background: donutGradient }">
              <div class="donut-center">
                <span class="donut-label">总支出</span>
                <span class="donut-total">{{ formatSummaryAmount(totalExpense) }}</span>
              </div>
            </div>
          </div>
          <!-- Legend -->
          <div class="pie-legend">
            <div
              v-for="item in categoryRankings"
              :key="item.categoryCode"
              class="legend-item"
            >
              <span class="legend-dot" :style="{ background: item.color }"></span>
              <span class="legend-name">{{ item.categoryName }}</span>
              <span class="legend-pct">{{ item.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 3. Category Ranking ===== -->
      <div class="section-title">支出分类排行榜</div>
      <div class="card">
        <EmptyState
          v-if="!hasExpense"
          text="本月暂无支出数据。"
        />
        <div v-else class="ranking-list">
          <div
            v-for="(item, index) in categoryRankings"
            :key="item.categoryCode"
            class="ranking-item"
          >
            <span class="rank-number">{{ index + 1 }}</span>
            <span class="rank-color-dot" :style="{ background: item.color }"></span>
            <span class="rank-name">{{ item.categoryName }}</span>
            <span class="rank-amount">{{ formatAmount(item.amount) }}</span>
            <div class="rank-bar-track">
              <div
                class="rank-bar-fill"
                :style="{ width: item.percentage + '%', background: item.color }"
              ></div>
            </div>
            <span class="rank-percentage">{{ item.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- ===== 4. Last 7 Days ===== -->
      <div class="section-title">近七日收支趋势</div>
      <div class="card">
        <EmptyState
          v-if="!hasSevenDayData"
          text="近七日暂无收支数据。"
        />
        <div v-else class="bar-chart-container">
          <div class="bar-chart">
            <div
              v-for="day in dailyAmounts"
              :key="day.date"
              class="bar-group"
            >
              <div class="bar-column">
                <div
                  class="bar bar-expense"
                  :style="{ height: barHeight(day.expense, maxAmount) + '%' }"
                  :title="'支出: ' + formatAmount(day.expense)"
                ></div>
                <div
                  class="bar bar-income"
                  :style="{ height: barHeight(day.income, maxAmount) + '%' }"
                  :title="'收入: ' + formatAmount(day.income)"
                ></div>
              </div>
              <span class="bar-date-label">{{ formatShortDate(day.date) }}</span>
            </div>
          </div>
          <!-- Chart legend -->
          <div class="chart-legend">
            <span class="chart-legend-item">
              <span class="legend-swatch expense-swatch"></span>
              支出
            </span>
            <span class="chart-legend-item">
              <span class="legend-swatch income-swatch"></span>
              收入
            </span>
          </div>
        </div>
      </div>

      <!-- ===== 5. Extended Stats ===== -->
      <div class="section-title">本月统计</div>
      <div class="card extended-stats-card">
        <div class="stat-grid">
          <div class="stat-cell">
            <span class="stat-label">最多分类</span>
            <span class="stat-value">
              <template v-if="topCategory">
                {{ topCategory.categoryName }} {{ formatAmount(topCategory.amount) }}
              </template>
              <span v-else class="stat-empty">暂无</span>
            </span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">最大单笔</span>
            <span class="stat-value">
              <template v-if="maxSingleExpense">
                {{ maxSingleExpense.categoryName }} {{ formatAmount(maxSingleExpense.amount) }}
              </template>
              <span v-else class="stat-empty">暂无</span>
            </span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">记账笔数</span>
            <span class="stat-value">{{ billCount }} 笔</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">记账天数</span>
            <span class="stat-value">{{ billDays }} 天</span>
          </div>
        </div>
      </div>

      <!-- Bottom spacer for floating button -->
      <div class="bottom-spacer"></div>
    </template>

    <!-- Floating bill button -->
    <FloatingBillButton @click="goToAddBill" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getStatistics } from '@/services/statsService'
import { useBillStore } from '@/stores/billStore'
import { getCurrentMonth } from '@/utils/date'
import { formatCents } from '@/utils/money'
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow, ComponentSize } from '@/constants/design-tokens'
import MonthPicker from '@/components/MonthPicker/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import FloatingBillButton from '@/components/FloatingBillButton/index.vue'
import type { StatisticsData } from '@/types'

// ===== State =====

const billStore = useBillStore()

const loading = ref(true)
const currentMonth = ref(getCurrentMonth())
const statsData = ref<StatisticsData>({
  summary: { monthIncome: 0, monthExpense: 0, monthBalance: 0 },
  categoryRankings: [],
  dailyAmounts: [],
  topCategory: null,
  maxSingleExpense: null,
  billCount: 0,
  billDays: 0,
})

// ===== Computed =====

const summary = computed(() => statsData.value.summary)
const categoryRankings = computed(() => statsData.value.categoryRankings)
const dailyAmounts = computed(() => statsData.value.dailyAmounts)
const topCategory = computed(() => statsData.value.topCategory)
const maxSingleExpense = computed(() => statsData.value.maxSingleExpense)
const billCount = computed(() => statsData.value.billCount)
const billDays = computed(() => statsData.value.billDays)

const hasExpense = computed(() => summary.value.monthExpense > 0)
const totalExpense = computed(() => summary.value.monthExpense)

const hasSevenDayData = computed(() =>
  dailyAmounts.value.some((d) => d.expense > 0 || d.income > 0)
)

const balanceClass = computed(() => {
  if (summary.value.monthBalance >= 0) return 'balance-positive'
  return 'balance-negative'
})

/** Max amount across all 7-day bars for scaling */
const maxAmount = computed(() => {
  if (dailyAmounts.value.length === 0) return 1
  const max = Math.max(
    ...dailyAmounts.value.flatMap((d) => [d.expense, d.income])
  )
  return max > 0 ? max : 1
})

// ===== Donut chart gradient =====

const donutGradient = computed(() => {
  const items = categoryRankings.value
  if (items.length === 0) return 'conic-gradient(#E2E8F0 100%)'

  let current = 0
  const stops = items.map((item) => {
    const start = current
    current += item.percentage
    return `${item.color} ${start}% ${current}%`
  })

  return `conic-gradient(${stops.join(', ')})`
})

// ===== Formatting helpers =====

/** Format cents to yuan with thousand separators, e.g. "5,000.00" */
function formatSummaryAmount(cents: number): string {
  const yuan = cents / 100
  return yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Format with sign for balance, e.g. "+¥5,000.00" or "-¥500.00" */
function formatSigned(cents: number): string {
  if (cents === 0) return '¥0.00'
  const prefix = cents > 0 ? '+' : '-'
  return prefix + '¥' + formatSummaryAmount(Math.abs(cents))
}

/** Format amount without sign */
function formatAmount(cents: number): string {
  return '¥' + formatSummaryAmount(cents)
}

/** Bar height as percentage of max, with minimum visible height for non-zero */
function barHeight(amount: number, max: number): number {
  if (amount <= 0) return 0
  if (max <= 0) return 0
  const pct = (amount / max) * 100
  return Math.max(pct, 4) // minimum 4% for visibility
}

/** Format date (YYYY-MM-DD) to short label like "5/13" */
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return parseInt(parts[1]) + '/' + parseInt(parts[2])
}

// ===== Actions =====

async function loadStatistics() {
  loading.value = true
  try {
    statsData.value = await getStatistics(currentMonth.value)
  } catch (err) {
    // In production, show a toast or error state
    console.error('Failed to load statistics:', err)
  } finally {
    loading.value = false
  }
}

function goToAddBill() {
  // In production, navigate to the add-bill page
  // WeChat Mini Program: wx.navigateTo({ url: '/pages/bill/add' })
  console.log('Navigate to add bill')
}

// ===== Watch & Lifecycle =====

watch(currentMonth, () => {
  loadStatistics()
})

watch(() => billStore.refreshKey, () => {
  loadStatistics()
})

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
/* ===== Layout ===== */
.statistics-page {
  min-height: 100vh;
  background: v-bind('Colors.Background');
  padding: 0 v-bind('Spacing.PageMargin');
  padding-top: 16px;
  padding-bottom: 24px;
}

.stats-header {
  padding: 8px 0 16px;
}

.section-title {
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextSecondary');
  margin: 20px 0 12px;
  padding: 0 4px;
}

/* ===== Cards ===== */
.card {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl');
  box-shadow: v-bind('Shadow.Md');
  padding: v-bind('Spacing.Xl');
}

/* ===== Summary Card ===== */
.summary-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextTertiary');
  font-weight: v-bind('FontWeight.Medium');
}

.summary-value {
  font-size: v-bind('FontSize.SummaryAmount');
  font-weight: v-bind('FontWeight.Bold');
  font-variant-numeric: tabular-nums;
}

.summary-value.income {
  color: v-bind('Colors.Income');
}

.summary-value.expense {
  color: v-bind('Colors.Expense');
}

.summary-value.balance-positive {
  color: v-bind('Colors.Income');
}

.summary-value.balance-negative {
  color: v-bind('Colors.Expense');
}

.summary-divider {
  width: 1px;
  height: 48px;
  background: v-bind('Colors.Border');
  margin: 0 8px;
}

/* ===== Expense Distribution ===== */
.expense-distribution {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24px;
}

.pie-chart-area {
  flex-shrink: 0;
}

.donut-chart {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Mask to create the donut hole */
  -webkit-mask: radial-gradient(circle at center, transparent 55%, black 56%);
  mask: radial-gradient(circle at center, transparent 55%, black 56%);
}

.donut-center {
  /* Position content in the hole (mask hides the background behind it) */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  /* Donut hole is transparent via mask, so we draw a white circle behind */
}

.donut-chart::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: v-bind('Colors.CardBg');
  z-index: -1;
}

.donut-label {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
}

.donut-total {
  font-size: 14px;
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  font-variant-numeric: tabular-nums;
}

/* ===== Pie Legend ===== */
.pie-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextPrimary');
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-pct {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextTertiary');
  font-weight: v-bind('FontWeight.Medium');
  flex-shrink: 0;
}

/* ===== Category Ranking ===== */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rank-number {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
  font-weight: v-bind('FontWeight.Medium');
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.rank-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rank-name {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextPrimary');
  width: 48px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-amount {
  font-size: v-bind('FontSize.BodySmall');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  width: 80px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.rank-bar-track {
  flex: 1;
  height: 6px;
  background: v-bind('Colors.Border');
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
}

.rank-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.rank-percentage {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
  font-weight: v-bind('FontWeight.Medium');
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

/* ===== Bar Chart ===== */
.bar-chart-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 140px;
  gap: 6px;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.bar-column {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 2px;
  height: 100%;
}

.bar {
  width: 60%;
  min-width: 8px;
  max-width: 24px;
  border-radius: 3px 3px 0 0;
  transition: height 0.6s ease;
  flex-shrink: 0;
}

.bar-expense {
  background: v-bind('Colors.Expense');
}

.bar-income {
  background: v-bind('Colors.Income');
}

.bar-date-label {
  font-size: 10px;
  color: v-bind('Colors.TextTertiary');
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.chart-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.expense-swatch {
  background: v-bind('Colors.Expense');
}

.income-swatch {
  background: v-bind('Colors.Income');
}

/* ===== Extended Stats ===== */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
}

.stat-value {
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

.stat-empty {
  color: v-bind('Colors.TextTertiary');
  font-weight: v-bind('FontWeight.Regular');
}

/* ===== Loading Skeleton ===== */
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl');
  box-shadow: v-bind('Shadow.Md');
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-h-100 { height: 100px; }
.skeleton-h-120 { height: 120px; }
.skeleton-h-150 { height: 150px; }
.skeleton-h-200 { height: 200px; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.2; }
}

/* ===== Bottom spacer ===== */
.bottom-spacer {
  height: 80px;
}
</style>
