<template>
  <view class="detail-page">
    <!-- 顶部汇总卡片 -->
    <view class="summary-card">
      <view class="summary-header">
        <MonthPicker v-model="currentMonth" />
      </view>
      <view class="summary-body">
        <view class="summary-item">
          <text class="summary-label income-label">收入</text>
          <text class="summary-value income-value" data-testid="income-total">
            {{ formatAmountWithSign(monthIncome, 'income') }}
          </text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label expense-label">支出</text>
          <text class="summary-value expense-value" data-testid="expense-total">
            {{ formatAmountWithSign(monthExpense, 'expense') }}
          </text>
        </view>
      </view>
    </view>

    <!-- 首次加载状态 -->
    <view v-if="firstLoading" class="loading-container" data-testid="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 账单列表 -->
    <view v-else-if="bills.length > 0" class="bill-list" data-testid="bill-list">
      <view v-for="group in groupedBills" :key="group.date" class="date-group">
        <view class="date-header" data-testid="date-header">{{ group.label }}</view>
        <view
          v-for="bill in group.bills"
          :key="bill._id"
          class="bill-item"
          @click="goToBillEdit(bill._id!)"
          data-testid="bill-item"
        >
          <view class="bill-left">
            <view
              class="category-icon"
              :style="{ backgroundColor: getCategory(bill.categoryCode)?.color || '#94A3B8' }"
            >
              <text class="category-icon-text">{{ bill.categoryName.charAt(0) }}</text>
            </view>
            <view class="bill-info">
              <text class="category-name">{{ bill.categoryName }}</text>
              <text v-if="bill.remark" class="bill-remark" data-testid="bill-remark">{{ bill.remark }}</text>
            </view>
          </view>
          <text
            class="bill-amount"
            :class="bill.type"
            :data-testid="`amount-${bill.type}`"
          >
            {{ formatAmountWithSign(bill.amount, bill.type) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState
      v-else
      text="暂无记账记录，点击下方按钮记一笔。"
      data-testid="empty-state"
    />

    <!-- 悬浮记账按钮 -->
    <FloatingBillButton @click="goToAddBill" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { listBillsByMonth } from '@/services/billService'
import { useBillStore } from '@/stores/billStore'
import { getCategory } from '@/constants/categories'
import { formatAmountWithSign } from '@/utils/money'
import { formatDateLabel, getCurrentMonth } from '@/utils/date'
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow, ComponentSize } from '@/constants/design-tokens'
import type { Bill } from '@/types'

import MonthPicker from '@/components/MonthPicker/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import FloatingBillButton from '@/components/FloatingBillButton/index.vue'

const billStore = useBillStore()

// ===== State =====
const currentMonth = ref(getCurrentMonth())
const bills = ref<Bill[]>([])
const monthIncome = ref(0)
const monthExpense = ref(0)
const firstLoading = ref(true)

// ===== Computed =====
interface BillGroup {
  date: string
  label: string
  bills: Bill[]
}

const groupedBills = computed<BillGroup[]>(() => {
  const map = new Map<string, Bill[]>()
  for (const bill of bills.value) {
    const date = bill.billDate
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)!.push(bill)
  }

  const groups: BillGroup[] = []
  // Note: use Array.from+forEach instead of for...of on Map
  // to work around a Jest/ts-jest environment quirk
  Array.from(map.entries()).forEach(([date, billList]) => {
    groups.push({
      date,
      label: formatDateLabel(date),
      bills: billList,
    })
  })

  groups.sort((a, b) => b.date.localeCompare(a.date))
  return groups
})

// ===== Methods =====
async function loadData() {
  try {
    const result = await listBillsByMonth(currentMonth.value)
    bills.value = result.bills
    monthIncome.value = result.monthIncome
    monthExpense.value = result.monthExpense
  } catch {
    bills.value = []
    monthIncome.value = 0
    monthExpense.value = 0
  } finally {
    firstLoading.value = false
  }
}

function goToBillEdit(billId: string) {
  // 跳转到编辑页，携带账单 ID
  // wx.navigateTo({ url: `/pages/bill-edit/index?id=${billId}` })
}

function goToAddBill() {
  // 跳转到新增账单页
  // wx.navigateTo({ url: `/pages/bill-edit/index` })
}

// ===== Watchers =====
watch(currentMonth, () => {
  loadData()
})

watch(() => billStore.refreshKey, () => {
  loadData()
})

// ===== Lifecycle =====
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: v-bind('Colors.Background');
  padding-bottom: 80px;
}

/* ---- 顶部汇总卡片 ---- */
.summary-card {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl');
  box-shadow: v-bind('Shadow.Md');
  margin: 0 v-bind('Spacing.PageMargin');
  padding: v-bind('Spacing.Lg');
  position: sticky;
  top: 0;
  z-index: 10;
}

.summary-header {
  display: flex;
  align-items: center;
  margin-bottom: v-bind('Spacing.Md');
}

.summary-body {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background-color: v-bind('Colors.Border');
}

.summary-label {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
}

.income-label {
  color: v-bind('Colors.Income');
}

.expense-label {
  color: v-bind('Colors.Expense');
}

.summary-value {
  font-size: v-bind('FontSize.SummaryAmount');
  font-weight: v-bind('FontWeight.Bold');
}

.income-value {
  color: v-bind('Colors.Income');
}

.expense-value {
  color: v-bind('Colors.Expense');
}

/* ---- 加载状态 ---- */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.loading-text {
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextTertiary');
}

/* ---- 账单列表 ---- */
.bill-list {
  padding: 0 v-bind('Spacing.PageMargin');
}

.date-group {
  margin-top: v-bind('Spacing.Lg');
}

.date-header {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
  padding: v-bind('Spacing.Sm') 0;
}

.bill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: v-bind('Spacing.Md') 0;
  border-bottom: 1px solid v-bind('Colors.Border');
  min-height: v-bind('ComponentSize.ListItemHeight');
  cursor: pointer;
  transition: background-color 150ms ease;
}

.bill-item:active {
  background-color: v-bind('Colors.Background');
}

.bill-left {
  display: flex;
  align-items: center;
  gap: v-bind('Spacing.Md');
  flex: 1;
  min-width: 0;
}

.category-icon {
  width: v-bind('ComponentSize.IconMd');
  height: v-bind('ComponentSize.IconMd');
  border-radius: v-bind('Radius.Sm');
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-icon-text {
  color: #fff;
  font-size: v-bind('FontSize.Caption');
  font-weight: v-bind('FontWeight.Medium');
}

.bill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.category-name {
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Regular');
  color: v-bind('Colors.TextPrimary');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-remark {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-amount {
  font-size: v-bind('FontSize.ListAmount');
  font-weight: v-bind('FontWeight.SemiBold');
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: v-bind('Spacing.Md');
}

.bill-amount.expense {
  color: v-bind('Colors.Expense');
}

.bill-amount.income {
  color: v-bind('Colors.Income');
}
</style>
