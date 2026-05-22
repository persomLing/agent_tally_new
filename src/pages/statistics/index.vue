<template>
  <view class="statistics-page">
    <view class="stats-header">
      <MonthPicker v-model="currentMonth" />
    </view>

    <u-loading-page :loading="loading" />

    <template v-if="!loading">
      <!-- Summary -->
      <view class="card summary-card">
        <view class="summary-item">
          <text class="summary-label">收入</text>
          <text class="summary-value income">+{{ formatSummaryAmount(summary.monthIncome) }}</text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label">支出</text>
          <text class="summary-value expense">-{{ formatSummaryAmount(summary.monthExpense) }}</text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label">结余</text>
          <text class="summary-value" :class="balanceClass">{{ formatSigned(summary.monthBalance) }}</text>
        </view>
      </view>

      <!-- Expense Distribution -->
      <text class="section-title">支出分类</text>
      <view class="card">
        <EmptyState v-if="!hasExpense" text="本月暂无支出数据。" />
        <view v-else class="expense-distribution">
          <view class="pie-chart-area">
            <view class="donut-chart" :style="{ background: donutGradient }">
              <view class="donut-center">
                <text class="donut-label">总支出</text>
                <text class="donut-total">{{ formatSummaryAmount(totalExpense) }}</text>
              </view>
            </view>
          </view>
          <view class="pie-legend">
            <view v-for="item in categoryRankings" :key="item.categoryCode" class="legend-item">
              <view class="legend-dot" :style="{ background: item.color }" />
              <text class="legend-name">{{ item.categoryName }}</text>
              <text class="legend-pct">{{ item.percentage }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Category Ranking -->
      <text class="section-title">支出分类排行榜</text>
      <view class="card">
        <EmptyState v-if="!hasExpense" text="本月暂无支出数据。" />
        <view v-else class="ranking-list">
          <view v-for="(item, index) in categoryRankings" :key="item.categoryCode" class="ranking-item">
            <text class="rank-number">{{ index + 1 }}</text>
            <view class="rank-color-dot" :style="{ background: item.color }" />
            <text class="rank-name">{{ item.categoryName }}</text>
            <text class="rank-amount">{{ formatAmount(item.amount) }}</text>
            <view class="rank-bar-track">
              <view class="rank-bar-fill" :style="{ width: item.percentage + '%', background: item.color }" />
            </view>
            <text class="rank-percentage">{{ item.percentage }}%</text>
          </view>
        </view>
      </view>

      <!-- Last 7 Days -->
      <text class="section-title">近七日收支趋势</text>
      <view class="card">
        <EmptyState v-if="!hasSevenDayData" text="近七日暂无收支数据。" />
        <view v-else class="bar-chart-container">
          <view class="bar-chart">
            <view v-for="day in dailyAmounts" :key="day.date" class="bar-group">
              <view class="bar-column">
                <view class="bar bar-expense" :style="{ height: barHeight(day.expense, maxAmount) + '%' }" />
                <view class="bar bar-income" :style="{ height: barHeight(day.income, maxAmount) + '%' }" />
              </view>
              <text class="bar-date-label">{{ formatShortDate(day.date) }}</text>
            </view>
          </view>
          <view class="chart-legend">
            <view class="chart-legend-item"><view class="legend-swatch expense-swatch" /><text>支出</text></view>
            <view class="chart-legend-item"><view class="legend-swatch income-swatch" /><text>收入</text></view>
          </view>
        </view>
      </view>

      <!-- Extended Stats -->
      <text class="section-title">本月统计</text>
      <view class="card">
        <view class="stat-grid">
          <view class="stat-cell">
            <text class="stat-label">最多分类</text>
            <text class="stat-value">{{ topCategory ? `${topCategory.categoryName} ${formatAmount(topCategory.amount)}` : '暂无' }}</text>
          </view>
          <view class="stat-cell">
            <text class="stat-label">最大单笔</text>
            <text class="stat-value">{{ maxSingleExpense ? `${maxSingleExpense.categoryName} ${formatAmount(maxSingleExpense.amount)}` : '暂无' }}</text>
          </view>
          <view class="stat-cell">
            <text class="stat-label">记账笔数</text>
            <text class="stat-value">{{ billCount }} 笔</text>
          </view>
          <view class="stat-cell">
            <text class="stat-label">记账天数</text>
            <text class="stat-value">{{ billDays }} 天</text>
          </view>
        </view>
      </view>

      <view style="height: 80px;" />
    </template>

    <FloatingBillButton @click="goToAddBill" />
    <BottomNav current="pages/statistics/index" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getStatistics } from '@/services/statsService'
import { useBillStore } from '@/stores/billStore'
import { getCurrentMonth } from '@/utils/date'
import MonthPicker from '@/components/MonthPicker/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import FloatingBillButton from '@/components/FloatingBillButton/index.vue'
import BottomNav from '@/components/BottomNav/index.vue'
import type { StatisticsData } from '@/types'

const billStore = useBillStore()
const loading = ref(true)
const currentMonth = ref(getCurrentMonth())
const statsData = ref<StatisticsData>({
  summary: { monthIncome: 0, monthExpense: 0, monthBalance: 0 },
  categoryRankings: [], dailyAmounts: [],
  topCategory: null, maxSingleExpense: null,
  billCount: 0, billDays: 0,
})

const summary = computed(() => statsData.value.summary)
const categoryRankings = computed(() => statsData.value.categoryRankings)
const dailyAmounts = computed(() => statsData.value.dailyAmounts)
const topCategory = computed(() => statsData.value.topCategory)
const maxSingleExpense = computed(() => statsData.value.maxSingleExpense)
const billCount = computed(() => statsData.value.billCount)
const billDays = computed(() => statsData.value.billDays)
const hasExpense = computed(() => summary.value.monthExpense > 0)
const totalExpense = computed(() => summary.value.monthExpense)
const hasSevenDayData = computed(() => dailyAmounts.value.some((d) => d.expense > 0 || d.income > 0))
const balanceClass = computed(() => summary.value.monthBalance >= 0 ? 'balance-positive' : 'balance-negative')
const maxAmount = computed(() => {
  if (!dailyAmounts.value.length) return 1
  const max = Math.max(...dailyAmounts.value.flatMap((d) => [d.expense, d.income]))
  return max > 0 ? max : 1
})
const donutGradient = computed(() => {
  const items = categoryRankings.value
  if (!items.length) return 'conic-gradient(#E2E8F0 100%)'
  let current = 0
  const stops = items.map((item) => {
    const start = current; current += item.percentage
    return `${item.color} ${start}% ${current}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})

function formatSummaryAmount(cents: number) {
  return (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatSigned(cents: number) {
  if (cents === 0) return '¥0.00'
  return (cents > 0 ? '+' : '-') + '¥' + formatSummaryAmount(Math.abs(cents))
}
function formatAmount(cents: number) { return '¥' + formatSummaryAmount(cents) }
function barHeight(amount: number, max: number) {
  if (amount <= 0 || max <= 0) return 0
  return Math.max((amount / max) * 100, 4)
}
function formatShortDate(dateStr: string) {
  const parts = dateStr.split('-')
  return parts.length !== 3 ? dateStr : parseInt(parts[1]) + '/' + parseInt(parts[2])
}

async function loadStatistics() {
  loading.value = true
  try { statsData.value = await getStatistics(currentMonth.value) }
  catch (err) { console.error('Failed to load statistics:', err) }
  finally { loading.value = false }
}

function goToAddBill() { uni.navigateTo({ url: '/pages/bill-edit/index' }) }

watch(currentMonth, () => loadStatistics())
watch(() => billStore.refreshKey, () => loadStatistics())
onMounted(() => loadStatistics())
</script>

<style scoped>
.statistics-page {
  min-height: 100vh; background: #f8fafc;
  padding: 0 16px 16px;
  padding-bottom: calc(50px + 32px);
}
.stats-header { padding: 8px 0 16px; }
.section-title { display: block; font-size: 14px; font-weight: 600; color: #64748b; margin: 20px 0 12px; }
.card { background: #fff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 0; }
.summary-card { display: flex; align-items: center; padding: 20px; }
.summary-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.summary-label { font-size: 12px; color: #94a3b8; font-weight: 500; }
.summary-value { font-size: 18px; font-weight: 700; }
.summary-value.income { color: #10b981; }
.summary-value.expense { color: #f43f5e; }
.summary-value.balance-positive { color: #10b981; }
.summary-value.balance-negative { color: #f43f5e; }
.summary-divider { width: 1px; height: 48px; background: #e2e8f0; margin: 0 8px; }
.expense-distribution { display: flex; flex-direction: row; align-items: center; gap: 24px; }
.pie-chart-area { flex-shrink: 0; }
.donut-chart {
  width: 140px; height: 140px; border-radius: 50%; position: relative;
  display: flex; align-items: center; justify-content: center;
  -webkit-mask: radial-gradient(circle at center, transparent 55%, black 56%);
  mask: radial-gradient(circle at center, transparent 55%, black 56%);
}
.donut-center {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; z-index: 1;
}
.donut-chart::after {
  content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 76px; height: 76px; border-radius: 50%; background: #fff; z-index: -1;
}
.donut-label { font-size: 12px; color: #94a3b8; }
.donut-total { font-size: 14px; font-weight: 600; color: #1e293b; }
.pie-legend { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-name { font-size: 13px; color: #1e293b; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-pct { font-size: 13px; color: #94a3b8; font-weight: 500; flex-shrink: 0; }
.ranking-list { display: flex; flex-direction: column; gap: 14px; }
.ranking-item { display: flex; align-items: center; gap: 10px; }
.rank-number { font-size: 12px; color: #94a3b8; font-weight: 500; width: 18px; text-align: center; flex-shrink: 0; }
.rank-color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rank-name { font-size: 13px; color: #1e293b; width: 48px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-amount { font-size: 13px; font-weight: 600; color: #1e293b; width: 80px; text-align: right; flex-shrink: 0; }
.rank-bar-track { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; min-width: 60px; }
.rank-bar-fill { height: 100%; border-radius: 3px; }
.rank-percentage { font-size: 12px; color: #94a3b8; font-weight: 500; width: 36px; text-align: right; flex-shrink: 0; }
.bar-chart-container { display: flex; flex-direction: column; gap: 12px; }
.bar-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 140px; gap: 6px; }
.bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.bar-column { flex: 1; width: 100%; display: flex; flex-direction: column-reverse; align-items: center; gap: 2px; height: 100%; }
.bar { width: 60%; min-width: 8px; max-width: 24px; border-radius: 3px 3px 0 0; flex-shrink: 0; }
.bar-expense { background: #f43f5e; }
.bar-income { background: #10b981; }
.bar-date-label { font-size: 10px; color: #94a3b8; white-space: nowrap; }
.chart-legend { display: flex; justify-content: center; gap: 20px; }
.chart-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #94a3b8; }
.legend-swatch { width: 10px; height: 10px; border-radius: 2px; }
.expense-swatch { background: #f43f5e; }
.income-swatch { background: #10b981; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.stat-cell { display: flex; flex-direction: column; gap: 6px; }
.stat-label { font-size: 12px; color: #94a3b8; }
.stat-value { font-size: 14px; font-weight: 600; color: #1e293b; word-break: break-all; }
</style>
