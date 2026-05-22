<template>
  <view class="profile-page">
    <!-- User Info Card -->
    <view class="card user-card" @click="onEditProfile">
      <view class="user-avatar-wrap">
        <image v-if="hasAvatar" class="user-avatar" :src="avatar" mode="aspectFill" />
        <view v-else class="user-avatar-fallback">{{ avatarInitial }}</view>
      </view>
      <view class="user-info">
        <text class="user-nickname">{{ nickName }}</text>
        <text class="user-persist">
          <text class="persist-highlight">坚持记账 {{ profileData?.persistDays ?? 0 }}</text> 天
        </text>
      </view>
    </view>

    <!-- Budget Card -->
    <view class="card budget-card">
      <text class="budget-title">本月收支概览</text>

      <!-- 收入行 -->
      <view class="budget-row">
        <view class="budget-row-label">
          <view class="budget-dot income-dot" />
          <text class="budget-row-text">收入</text>
        </view>
        <text class="budget-row-amount income-amount">{{ formatYuan(profileData?.monthIncome ?? 0) }}</text>
      </view>

      <!-- 支出行 -->
      <view class="budget-row">
        <view class="budget-row-label">
          <view class="budget-dot expense-dot" />
          <text class="budget-row-text">支出</text>
        </view>
        <text class="budget-row-amount expense-amount">{{ formatYuan(profileData?.monthExpense ?? 0) }}</text>
      </view>

      <progress class="progress-bar" :percent="savingRate" :border-radius="3" :activeColor="savingRate >= 0 ? '#10b981' : '#ef4444'" backgroundColor="#e2e8f0" :stroke-width="6" />
      <view class="budget-row" style="margin-bottom:12px">
        <text class="budget-row-text">结余率</text>
        <text class="budget-row-amount" :style="{ color: balanceColor }">{{ savingRate }}%</text>
      </view>

      <!-- 底部统计行 -->
      <view class="budget-stats">
        <view class="budget-stat-item">
          <text class="budget-stat-label">结余</text>
          <text class="budget-stat-value" :style="{ color: balanceColor }">{{ formatYuan((profileData?.monthIncome ?? 0) - (profileData?.monthExpense ?? 0)) }}</text>
        </view>
        <view class="budget-stat-divider" />
        <view class="budget-stat-item">
          <text class="budget-stat-label">{{ profileData?.isOverBudget ? '已超支' : '预算剩余' }}</text>
          <text class="budget-stat-value" :style="{ color: profileData?.isOverBudget ? '#f43f5e' : '#10b981' }">
            {{ profileData?.isOverBudget ? formatYuan(profileData.overBudgetAmount) : formatYuan(profileData?.budgetRemaining ?? 0) }}
          </text>
        </view>
        <view class="budget-stat-divider" />
        <view class="budget-stat-item">
          <text class="budget-stat-label">距月底</text>
          <text class="budget-stat-value">{{ profileData?.daysToMonthEnd ?? 0 }} 天</text>
        </view>
      </view>
    </view>

    <!-- Function List -->
    <view class="card function-list">
      <view class="function-item" @click="onOpenMemo">
        <text class="function-item-label">记忆库</text>
        <text class="function-item-arrow">›</text>
      </view>
      <view class="function-divider" />
      <view class="function-item" @click="onOpenPrivacy">
        <text class="function-item-label">隐私说明</text>
        <text class="function-item-arrow">›</text>
      </view>
      <view class="function-divider" />
      <view class="function-item" @click="onClearBills">
        <text class="function-item-label function-item-label-danger">清空全部账单</text>
        <text class="function-item-arrow function-item-arrow-danger">›</text>
      </view>
    </view>

    <ConfirmDialog
      :visible="confirmVisible"
      title="清空账单"
      message="清空后所有账单数据将无法恢复，确定继续吗？"
      confirm-text="确定清空"
      :danger="true"
      @confirm="onConfirmClear"
      @cancel="onCancelClear"
      @update:visible="confirmVisible = $event"
    />

    <!-- Privacy Dialog -->
    <view v-if="privacyVisible" class="overlay" @click="privacyVisible = false">
      <view class="privacy-dialog" @click.stop>
        <text class="privacy-title">隐私说明</text>
        <view class="privacy-content">
          <text class="privacy-text">本小程序仅使用您的微信头像和昵称用于个人展示，不会向第三方分享您的个人信息。所有账单数据仅存储在您个人的微信云环境中，除您本人外无法被其他用户访问。</text>
          <text class="privacy-text">我们不会收集您的位置信息、通讯录等个人敏感数据。您可随时通过「清空全部账单」功能删除所有数据。</text>
        </view>
        <button class="privacy-close-btn" @click="privacyVisible = false">我知道了</button>
      </view>
    </view>

    <MemoModal v-model:visible="showMemoModal" @close="showMemoModal = false" />
    <BottomNav current="pages/profile/index" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useBillStore } from '@/stores/billStore'
import { getProfileSummary, clearAllBills } from '@/services/profileService'
import { formatCents } from '@/utils/money'
import type { ProfileSummary } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import MemoModal from '@/components/MemoModal/index.vue'
import BottomNav from '@/components/BottomNav/index.vue'

const userStore = useUserStore()
const billStore = useBillStore()
const profileData = ref<ProfileSummary | null>(null)
const confirmVisible = ref(false)
const privacyVisible = ref(false)
const showMemoModal = ref(false)

const nickName = computed(() => userStore.nickName || profileData.value?.nickName || '')
const avatar = computed(() => userStore.avatarUrl || profileData.value?.avatarUrl || '')
const hasAvatar = computed(() => !!avatar.value)
const avatarInitial = computed(() => (nickName.value || '?').charAt(0))

const savingRate = computed(() => {
  const income = profileData.value?.monthIncome ?? 0
  if (income === 0) return 0
  return Math.round(((income - (profileData.value?.monthExpense ?? 0)) / income) * 100)
})

const balanceColor = computed(() => savingRate.value >= 0 ? '#10b981' : '#f43f5e')

function formatYuan(cents: number) { return `¥${formatCents(cents)}` }

async function loadProfile() {
  try { profileData.value = await getProfileSummary() }
  catch { profileData.value = null }
}

function onEditProfile() {}
function onOpenMemo() { showMemoModal.value = true }
function onOpenPrivacy() { privacyVisible.value = true }
function onClearBills() { confirmVisible.value = true }

async function onConfirmClear() {
  confirmVisible.value = false
  try { await clearAllBills(); billStore.notifyBillChanged(); await loadProfile() } catch {}
}

function onCancelClear() { confirmVisible.value = false }

onMounted(() => loadProfile())
watch(() => billStore.refreshKey, () => loadProfile())
</script>

<style scoped>
.profile-page {
  padding: 0 16px;
  padding-top: 24px;
  padding-bottom: calc(50px + 32px);
  min-height: 100vh;
  background: #f8fafc;
}
.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 16px;
  margin-bottom: 16px;
}
.user-card { display: flex; align-items: center; gap: 12px; }
.user-avatar-wrap {
  width: 56px; height: 56px; border-radius: 50%;
  flex-shrink: 0; overflow: hidden; background: #eff6ff;
}
.user-avatar { width: 100%; height: 100%; }
.user-avatar-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700; color: #3b82f6;
}
.user-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.user-nickname { font-size: 17px; font-weight: 600; color: #1e293b; }
.user-persist { font-size: 12px; color: #64748b; }
.persist-highlight { color: #3b82f6; font-weight: 500; }
.budget-title { display: block; font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
.budget-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.budget-row-label { display: flex; align-items: center; gap: 6px; }
.budget-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.income-dot { background: #10b981; }
.expense-dot { background: #f43f5e; }
.balance-dot { background: #3b82f6; }
.progress-bar { width: 100%; height: 6px; margin-bottom: 12px; border-radius: 3px; }
.budget-row-text { font-size: 13px; color: #64748b; }
.budget-row-amount { font-size: 14px; font-weight: 600; }
.income-amount { color: #10b981; }
.expense-amount { color: #f43f5e; }
.budget-stats { display: flex; align-items: center; padding-top: 4px; }
.budget-stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.budget-stat-divider { width: 1px; height: 32px; background: #f1f5f9; }
.budget-stat-label { font-size: 11px; color: #94a3b8; }
.budget-stat-value { font-size: 13px; font-weight: 600; color: #1e293b; }
.function-list { padding: 0; overflow: hidden; }
.function-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; height: 52px;
}
.function-item-label { font-size: 14px; color: #1e293b; }
.function-item-label-danger { color: #ef4444; }
.function-item-arrow { font-size: 18px; color: #94a3b8; }
.function-item-arrow-danger { color: #ef4444; }
.function-divider { height: 1px; background: #f1f5f9; margin-left: 16px; }
.overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.privacy-dialog {
  background: #fff; border-radius: 16px;
  padding: 24px 20px; width: 290px; max-width: 90vw;
}
.privacy-title { display: block; font-size: 16px; font-weight: 600; color: #1e293b; text-align: center; margin-bottom: 16px; }
.privacy-content { margin-bottom: 20px; }
.privacy-text { display: block; font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 12px; }
.privacy-close-btn {
  width: 100%; height: 44px; border: none; border-radius: 10px;
  background: #3b82f6; color: #fff; font-size: 14px; font-weight: 500;
}
</style>
