<template>
  <view class="detail-page">
    <!-- 固定顶部汇总卡片 -->
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

    <!-- 独立滚动列表区域 -->
    <scroll-view
      class="bill-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadData(false)"
    >
      <u-loading-page :loading="firstLoading" />

      <view v-if="!firstLoading && bills.length > 0" class="bill-list" data-testid="bill-list">
        <view v-for="group in groupedBills" :key="group.date" class="date-group">
          <view class="date-header" data-testid="date-header">{{ group.label }}</view>
          <view v-for="bill in group.bills" :key="bill._id" class="bill-item-wrapper">
            <SwipeAction @delete="onDeleteBill(bill._id!)">
              <view class="bill-item" @click="goToBillEdit(bill._id!)" data-testid="bill-item">
                <view class="bill-left">
                  <view class="category-icon" :style="{ backgroundColor: getCategory(bill.categoryCode)?.color || '#94A3B8' }">
                    <text class="category-icon-text">{{ bill.categoryName.charAt(0) }}</text>
                  </view>
                  <view class="bill-info">
                    <text class="category-name">{{ bill.categoryName }}</text>
                    <text v-if="bill.remark" class="bill-remark" data-testid="bill-remark">{{ bill.remark }}</text>
                  </view>
                </view>
                <text class="bill-amount" :class="bill.type" :data-testid="`amount-${bill.type}`">
                  {{ formatAmountWithSign(bill.amount, bill.type) }}
                </text>
              </view>
            </SwipeAction>
          </view>
        </view>
      </view>

      <EmptyState v-else-if="!firstLoading" text="暂无记账记录，点击下方按钮记一笔。" data-testid="empty-state" />

      <view v-if="loadingMore" class="load-more-tip"><text>加载中...</text></view>
      <view v-else-if="!hasMore && bills.length > 0" class="load-more-tip"><text>没有更多了</text></view>
    </scroll-view>

    <FloatingBillButton @click="goToAddBill" />
    <BottomNav current="pages/detail/index" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { listBillsByMonth, deleteBill } from '@/services/billService'
import { useBillStore } from '@/stores/billStore'
import { getCategory } from '@/constants/categories'
import { formatAmountWithSign } from '@/utils/money'
import { formatDateLabel, getCurrentMonth } from '@/utils/date'
import type { Bill } from '@/types'
import MonthPicker from '@/components/MonthPicker/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import FloatingBillButton from '@/components/FloatingBillButton/index.vue'
import SwipeAction from '@/components/SwipeAction/index.vue'
import BottomNav from '@/components/BottomNav/index.vue'

const billStore = useBillStore()
const currentMonth = ref(getCurrentMonth())
const bills = ref<Bill[]>([])
const monthIncome = ref(0)
const monthExpense = ref(0)
const firstLoading = ref(true)
const page = ref(1)
const pageSize = 20
const hasMore = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)

interface BillGroup { date: string; label: string; bills: Bill[] }

const groupedBills = computed<BillGroup[]>(() => {
  const map = new Map<string, Bill[]>()
  for (const bill of bills.value) {
    if (!map.has(bill.billDate)) map.set(bill.billDate, [])
    map.get(bill.billDate)!.push(bill)
  }
  const groups: BillGroup[] = []
  Array.from(map.entries()).forEach(([date, billList]) => {
    groups.push({ date, label: formatDateLabel(date), bills: billList })
  })
  return groups.sort((a, b) => b.date.localeCompare(a.date))
})

async function loadData(reset = false) {
  if (reset) {
    page.value = 1
    firstLoading.value = true
  } else {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
  }
  try {
    const result = await listBillsByMonth(currentMonth.value, page.value, pageSize)
    if (page.value === 1) {
      bills.value = result.bills
      monthIncome.value = result.monthIncome
      monthExpense.value = result.monthExpense
    } else {
      bills.value = [...bills.value, ...result.bills]
    }
    hasMore.value = result.hasMore
    page.value++
  } catch {
    if (page.value === 1) {
      bills.value = []; monthIncome.value = 0; monthExpense.value = 0
    }
  } finally {
    firstLoading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

function goToBillEdit(billId: string) {
  uni.navigateTo({ url: `/pages/bill-edit/index?id=${billId}` })
}

async function onDeleteBill(billId: string) {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，确定要删除该账单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteBill(billId)
          billStore.notifyBillChanged()
          loadData(true)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function goToAddBill() { uni.navigateTo({ url: '/pages/bill-edit/index' }) }

async function onRefresh() { refreshing.value = true; await loadData(true) }

onMounted(() => loadData(true))
watch(currentMonth, () => loadData(true))
watch(() => billStore.refreshKey, () => loadData(true))
</script>

<style scoped>
.detail-page {
  height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}
.summary-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  margin: 12px 16px 0;
  padding: 16px;
  flex-shrink: 0;
  z-index: 10;
}
.bill-scroll {
  flex: 1;
  overflow: hidden;
  padding-bottom: calc(50px + 24px);
}
.summary-header { display: flex; align-items: center; margin-bottom: 12px; }
.summary-body { display: flex; align-items: center; justify-content: space-around; }
.summary-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.summary-divider { width: 1px; height: 40px; background-color: #e2e8f0; }
.summary-label { font-size: 12px; color: #94a3b8; }
.income-label { color: #10b981; }
.expense-label { color: #f43f5e; }
.summary-value { font-size: 18px; font-weight: 700; }
.income-value { color: #10b981; }
.expense-value { color: #f43f5e; }
.bill-list { padding: 0 16px; }
.date-group { margin-top: 16px; }
.date-header { font-size: 12px; color: #94a3b8; padding: 8px 0; }
.bill-item-wrapper:not(:last-child) .bill-item { border-bottom: 1px solid #f1f5f9; }
.bill-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; min-height: 56px; cursor: pointer;
}
.bill-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.category-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.category-icon-text { color: #fff; font-size: 12px; font-weight: 500; }
.bill-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.category-name { font-size: 14px; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bill-remark { font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bill-amount { font-size: 15px; font-weight: 600; white-space: nowrap; flex-shrink: 0; margin-left: 12px; }
.bill-amount.expense { color: #f43f5e; }
.bill-amount.income { color: #10b981; }
.load-more-tip { text-align: center; padding: 16px 0; font-size: 12px; color: #94a3b8; }
</style>
