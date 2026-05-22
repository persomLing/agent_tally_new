<template>
  <view class="profile-page">
    <!-- ===== User Info Card ===== -->
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

    <!-- ===== Budget Card ===== -->
    <view class="card budget-card">
      <text class="budget-title">本月预算进度</text>

      <!-- Budget progress bar -->
      <view class="progress-track">
        <view
          class="progress-fill"
          :class="progressFillClass"
          :style="progressFillStyle"
        />
      </view>

      <!-- Budget state: normal -->
      <view v-if="profileData && profileData.hasIncome && !profileData.isOverBudget" class="budget-state">
        <text class="budget-percentage">{{ formattedProgress }}%</text>
        <text class="budget-remaining">预算剩余: {{ formatYuan(profileData.budgetRemaining) }}</text>
      </view>

      <!-- Budget state: over budget -->
      <view v-else-if="profileData && profileData.hasIncome && profileData.isOverBudget" class="budget-state budget-state-over">
        <text class="budget-percentage budget-percentage-over">{{ formattedProgress }}%</text>
        <text class="budget-over-amount">已超支 {{ formatYuan(profileData.overBudgetAmount) }}</text>
      </view>

      <!-- Budget state: no income -->
      <view v-else-if="profileData && !profileData.hasIncome" class="budget-state budget-state-no-income">
        <text class="budget-no-income-text">暂无收入，无法计算预算</text>
        <text class="budget-month-expense">本月支出: {{ profileData ? formatYuan(profileData.monthExpense) : '¥0.00' }}</text>
      </view>

      <!-- Days to month end -->
      <view class="days-to-end">
        距离月底还有 {{ profileData?.daysToMonthEnd ?? 0 }} 天
      </view>
    </view>

    <!-- ===== Function Entry List ===== -->
    <view class="card function-list">
      <!-- Memo -->
      <view class="function-item" @click="onOpenMemo">
        <text class="function-item-icon">&#x1F4DD;</text>
        <text class="function-item-label">记忆库</text>
        <text class="function-item-arrow">&gt;</text>
      </view>

      <view class="function-divider" />

      <!-- Privacy -->
      <view class="function-item" @click="onOpenPrivacy">
        <text class="function-item-icon">&#x1F512;</text>
        <text class="function-item-label">隐私说明</text>
        <text class="function-item-arrow">&gt;</text>
      </view>

      <view class="function-divider" />

      <!-- Clear all bills -->
      <view class="function-item function-item-danger" @click="onClearBills">
        <text class="function-item-icon">&#x1F5D1;</text>
        <text class="function-item-label function-item-label-danger">清空全部账单</text>
        <text class="function-item-arrow function-item-arrow-danger">&gt;</text>
      </view>
    </view>

    <!-- ===== Delete Confirm Dialog ===== -->
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

    <!-- ===== Privacy Dialog ===== -->
    <view v-if="privacyVisible" class="privacy-overlay" @click="privacyVisible = false">
      <view class="privacy-dialog" @click.stop>
        <text class="privacy-title">隐私说明</text>
        <view class="privacy-content">
          <text class="privacy-text">
            本小程序仅使用您的微信头像和昵称用于个人展示，不会向第三方分享您的个人信息。所有账单数据仅存储在您个人的微信云环境中，除您本人外无法被其他用户访问。
          </text>
          <text class="privacy-text">
            我们不会收集您的位置信息、通讯录等个人敏感数据。您可随时通过「清空全部账单」功能删除所有数据。
          </text>
        </view>
        <button class="privacy-close-btn" @click="privacyVisible = false">我知道了</button>
      </view>
    </view>

    <!-- 记忆库弹窗 -->
    <MemoModal v-model:visible="showMemoModal" @close="showMemoModal = false" />

    <!-- 底部导航 -->
    <BottomNav current="pages/profile/index" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useBillStore } from '@/stores/billStore'
import { getProfileSummary, clearAllBills } from '@/services/profileService'
import { formatCents } from '@/utils/money'
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow, ComponentSize } from '@/constants/design-tokens'
import type { ProfileSummary } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import MemoModal from '@/components/MemoModal/index.vue'
import BottomNav from '@/components/BottomNav/index.vue'

const userStore = useUserStore()
const billStore = useBillStore()

const profileData = ref<ProfileSummary | null>(null)
const isLoading = ref(false)
const confirmVisible = ref(false)
const privacyVisible = ref(false)
const showMemoModal = ref(false)

const nickName = computed(() => userStore.nickName || profileData.value?.nickName || '')
const avatar = computed(() => userStore.avatarUrl || profileData.value?.avatarUrl || '')
const hasAvatar = computed(() => !!avatar.value)
const avatarInitial = computed(() => (nickName.value || '?').charAt(0))

const formattedProgress = computed(() => {
  if (!profileData.value || profileData.value.budgetProgress < 0) return '0'
  return Math.round(profileData.value.budgetProgress).toString()
})

const progressFillStyle = computed(() => {
  if (!profileData.value) return { width: '0%' }
  if (profileData.value.budgetProgress < 0) return { width: '100%' }
  return { width: `${Math.min(100, profileData.value.budgetProgress)}%` }
})

const progressFillClass = computed(() => {
  if (!profileData.value) return ''
  if (profileData.value.isOverBudget) return 'progress-fill-over'
  if (!profileData.value.hasIncome) return 'progress-fill-no-income'
  return 'progress-fill-normal'
})

function formatYuan(cents: number): string {
  return `¥${formatCents(cents)}`
}

async function loadProfile() {
  isLoading.value = true
  try {
    const result = await getProfileSummary()
    profileData.value = result
  } catch {
    // Error is handled by the cloud service wrapper
    profileData.value = null
  } finally {
    isLoading.value = false
  }
}

function onEditProfile() {
  // Future: navigate to edit profile page
}

function onOpenMemo() {
  showMemoModal.value = true
}

function onOpenPrivacy() {
  privacyVisible.value = true
}

function onClearBills() {
  confirmVisible.value = true
}

async function onConfirmClear() {
  confirmVisible.value = false
  try {
    await clearAllBills()
    billStore.notifyBillChanged()
    await loadProfile()
  } catch {
    // Error is handled by the cloud service wrapper
  }
}

function onCancelClear() {
  confirmVisible.value = false
}

// Load on mount
onMounted(() => {
  loadProfile()
})

// Watch global refresh key
watch(() => billStore.refreshKey, () => {
  loadProfile()
})
</script>

<style scoped>
.profile-page {
  padding: 0 v-bind('Spacing.PageMargin');
  padding-top: v-bind('Spacing.Xl2');
  padding-bottom: calc(v-bind('ComponentSize.BottomNavHeight') + v-bind('Spacing.Xl3'));
  min-height: 100vh;
  background: v-bind('Colors.Background');
}

/* ===== Card ===== */
.card {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl');
  box-shadow: v-bind('Shadow.Md');
  padding: v-bind('Spacing.Lg');
  margin-bottom: v-bind('Spacing.Lg');
}

/* ===== User Card ===== */
.user-card {
  display: flex;
  align-items: center;
  gap: v-bind('Spacing.Md');
  cursor: pointer;
}

.user-avatar-wrap {
  width: v-bind('ComponentSize.AvatarSize');
  height: v-bind('ComponentSize.AvatarSize');
  border-radius: v-bind('Radius.Full');
  flex-shrink: 0;
  overflow: hidden;
  background: v-bind('Colors.PrimaryLight');
}

.user-avatar {
  width: 100%;
  height: 100%;
}

.user-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: v-bind('FontWeight.Bold');
  color: v-bind('Colors.Primary');
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: v-bind('Spacing.Xs');
}

.user-nickname {
  font-size: v-bind('FontSize.H3');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  line-height: 1.4;
}

.user-persist {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
  line-height: 1.5;
}

.persist-highlight {
  color: v-bind('Colors.Primary');
  font-weight: v-bind('FontWeight.Medium');
}

/* ===== Budget Card ===== */
.budget-title {
  display: block;
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  margin-bottom: v-bind('Spacing.Md');
}

.progress-track {
  width: 100%;
  height: v-bind('ComponentSize.ProgressBarHeight');
  background: #E2E8F0;
  border-radius: v-bind('Radius.Full');
  overflow: hidden;
  margin-bottom: v-bind('Spacing.Md');
}

.progress-fill {
  height: 100%;
  border-radius: v-bind('Radius.Full');
  transition: width 400ms ease;
}

.progress-fill-normal {
  background: v-bind('Colors.Primary');
}

.progress-fill-over {
  background: #F43F5E;
}

.progress-fill-no-income {
  background: v-bind('Colors.Border');
}

.budget-state {
  margin-bottom: v-bind('Spacing.Sm');
}

.budget-percentage {
  display: block;
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.Primary');
  margin-bottom: v-bind('Spacing.Xs');
}

.budget-percentage-over {
  color: #F43F5E;
}

.budget-remaining {
  display: block;
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
}

.budget-state-over .budget-over-amount {
  display: block;
  font-size: v-bind('FontSize.BodySmall');
  color: #F43F5E;
  font-weight: v-bind('FontWeight.Medium');
}

.budget-state-no-income .budget-no-income-text {
  display: block;
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextTertiary');
  margin-bottom: v-bind('Spacing.Xs');
}

.budget-state-no-income .budget-month-expense {
  display: block;
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
}

.days-to-end {
  display: block;
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
  margin-top: v-bind('Spacing.Sm');
}

/* ===== Function List ===== */
.function-list {
  padding: 0;
  overflow: hidden;
}

.function-item {
  display: flex;
  align-items: center;
  padding: 0 v-bind('Spacing.Lg');
  height: v-bind('ComponentSize.ListItemHeight');
  cursor: pointer;
  transition: background 150ms ease;
  -webkit-tap-highlight-color: transparent;
}

.function-item:active {
  background: v-bind('Colors.Background');
}

.function-item-icon {
  font-size: v-bind('FontSize.Body');
  margin-right: v-bind('Spacing.Md');
  width: 24px;
  text-align: center;
}

.function-item-label {
  flex: 1;
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextPrimary');
  font-weight: v-bind('FontWeight.Regular');
}

.function-item-arrow {
  color: v-bind('Colors.TextTertiary');
  font-size: v-bind('FontSize.Body');
  margin-left: v-bind('Spacing.Sm');
}

/* Danger item (clear bills) */
.function-item-danger:active {
  background: #FFF0F3;
}

.function-item-label-danger {
  color: v-bind('Colors.Error');
}

.function-item-arrow-danger {
  color: v-bind('Colors.Error');
}

.function-divider {
  height: 1px;
  background: v-bind('Colors.Border');
  margin-left: v-bind('Spacing.Lg');
}

/* ===== Privacy Dialog ===== */
.privacy-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease-out;
}

.privacy-dialog {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl');
  padding: v-bind('Spacing.Xl2');
  width: 290px;
  max-width: 90vw;
  box-shadow: v-bind('Shadow.Xl');
  animation: slideUp 200ms ease-out;
}

.privacy-title {
  display: block;
  font-size: v-bind('FontSize.H3');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  text-align: center;
  margin-bottom: v-bind('Spacing.Lg');
}

.privacy-content {
  margin-bottom: v-bind('Spacing.Xl');
}

.privacy-text {
  display: block;
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
  line-height: 1.6;
  margin-bottom: v-bind('Spacing.Md');
}

.privacy-text:last-child {
  margin-bottom: 0;
}

.privacy-close-btn {
  width: 100%;
  height: v-bind('ComponentSize.ButtonMinHeight');
  border: none;
  border-radius: v-bind('Radius.Lg');
  background: v-bind('Colors.Primary');
  color: #fff;
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Medium');
  cursor: pointer;
  transition: all 150ms ease;
  text-align: center;
  line-height: v-bind('ComponentSize.ButtonMinHeight');
}

.privacy-close-btn:active {
  transform: scale(0.97);
  background: v-bind('Colors.PrimaryDark');
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill {
    transition: none;
  }

  .privacy-overlay,
  .privacy-dialog {
    animation: none;
  }
}
</style>
