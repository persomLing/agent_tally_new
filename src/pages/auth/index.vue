<template>
  <div class="auth-page">
    <!-- 检查登录态 -->
    <div v-if="store.isChecking" class="auth-loading">
      <p class="auth-loading-text">正在检查登录状态...</p>
    </div>

    <!-- 已授权，跳转明细页 -->
    <div v-else-if="store.isLoggedIn" class="auth-redirecting">
      <p class="auth-loading-text">授权成功，正在跳转...</p>
    </div>

    <!-- 授权页面 -->
    <div v-else class="auth-container">
      <div class="auth-brand">
        <!-- 头像选择：使用微信新 API open-type="chooseAvatar" 替代废弃的 getUserProfile -->
        <button
          class="auth-avatar-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <img
            v-if="tempAvatarUrl"
            class="auth-avatar-img"
            :src="tempAvatarUrl"
            alt="头像"
            @error="tempAvatarUrl = ''"
          />
          <div v-else class="auth-avatar-placeholder">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 14c6 0 10 3 10 8v2H6v-2c0-5 4-8 10-8z" fill="#B0B8C8"/>
            </svg>
          </div>
          <div class="auth-avatar-overlay">
            <span class="auth-avatar-camera">📷</span>
          </div>
        </button>

        <h2 class="auth-title">个人记账</h2>
      </div>

      <p class="auth-description">
        简洁清晰的记账工具，轻松管理每一笔收支
      </p>

      <!-- 昵称输入：使用微信新 API type="nickname" 替代废弃的 getUserProfile -->
      <div class="auth-nickname-wrap">
        <input
          class="auth-nickname-input"
          type="nickname"
          v-model="tempNickName"
          placeholder="请输入你的昵称"
        />
      </div>

      <button
        class="auth-btn"
        :class="{ 'auth-btn-loading': store.isLoading }"
        :disabled="store.isLoading || !tempNickName.trim()"
        @click="handleAuthorize"
      >
        <span v-if="store.isLoading" class="auth-btn-spinner"></span>
        <span>{{ store.isLoading ? '进入中...' : '开始记账' }}</span>
      </button>

      <transition name="fade">
        <p v-if="showRejected" class="auth-rejected">
          {{ getErrorMessage(errorCodes.AUTH_DENIED) }}
        </p>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { getErrorMessage, ErrorCodes } from '@/constants/error-codes'
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design-tokens'

const store = useUserStore()
const errorCodes = ErrorCodes
const showRejected = ref(false)
const tempAvatarUrl = ref('')
const tempNickName = ref('')

onMounted(async () => {
  const authorized = await store.checkAuth()
  if (authorized) {
    redirectToDetail()
  }
})

// 微信 <button open-type="chooseAvatar"> 回调
function onChooseAvatar(e: any) {
  tempAvatarUrl.value = e.detail?.avatarUrl ?? ''
}

async function handleAuthorize() {
  showRejected.value = false

  const nickName = tempNickName.value.trim() || '微信用户'
  const avatarUrl = tempAvatarUrl.value

  const success = await store.authorize({ nickName, avatarUrl })
  console.log('Authorization result:', success, 'NickName:', nickName, 'AvatarUrl:', avatarUrl)
  if (success) {
    redirectToDetail()
  } else {
    showRejected.value = true
  }
}

function redirectToDetail() {
  if (typeof uni !== 'undefined' && typeof uni.navigateTo === 'function') {
    uni.navigateTo({ url: '/pages/detail/index' })
    return
  }
  window.location.href = '/pages/detail/index'
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: v-bind('Colors.Background');
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-loading,
.auth-redirecting {
  text-align: center;
  padding: v-bind('Spacing.Xl3');
}

.auth-loading-text {
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextSecondary');
  margin: 0;
}

.auth-container {
  width: 100%;
  max-width: 360px;
  padding: v-bind('Spacing.Xl3') v-bind('Spacing.Xl');
  text-align: center;
}

.auth-brand {
  margin-bottom: v-bind('Spacing.Xl2');
}

/* 头像选择按钮 */
.auth-avatar-btn {
  position: relative;
  width: 88px;
  height: 88px;
  padding: 0;
  border: 2px dashed v-bind('Colors.Border');
  border-radius: 50%;
  background: transparent;
  overflow: hidden;
  margin: 0 auto v-bind('Spacing.Lg');
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-avatar-btn::after {
  border: none;
}

.auth-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #E8ECF2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: linear-gradient(transparent 60%, rgba(0, 0, 0, 0.35));
  border-radius: 50%;
}

.auth-avatar-camera {
  font-size: 18px;
  margin-bottom: 6px;
  line-height: 1;
}

.auth-title {
  font-size: v-bind('FontSize.H2');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  margin: 0;
  line-height: 1.3;
}

.auth-description {
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextSecondary');
  margin: 0 0 v-bind('Spacing.Xl');
  line-height: 1.5;
}

/* 昵称输入 */
.auth-nickname-wrap {
  margin: 0 0 v-bind('Spacing.Xl2');
}

.auth-nickname-input {
  width: 100%;
  height: 44px;
  padding: 0 v-bind('Spacing.Md');
  border: 1px solid v-bind('Colors.Border');
  border-radius: v-bind('Radius.Md');
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextPrimary');
  text-align: center;
  background: #ffffff;
  outline: none;
  box-sizing: border-box;
}

.auth-nickname-input:focus {
  border-color: v-bind('Colors.Primary');
}

.auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  padding: 0 v-bind('Spacing.Xl');
  background: v-bind('Colors.Primary');
  color: #ffffff;
  border: none;
  border-radius: v-bind('Radius.Lg');
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Medium');
  cursor: pointer;
  transition: background 150ms ease, transform 100ms ease, opacity 250ms ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.auth-btn:active:not(:disabled) {
  background: v-bind('Colors.PrimaryDark');
  transform: scale(0.97);
}

.auth-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-btn-loading {
  opacity: 0.8;
}

.auth-btn-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: authSpin 600ms linear infinite;
  flex-shrink: 0;
}

@keyframes authSpin {
  to { transform: rotate(360deg); }
}

.auth-rejected {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.Error');
  margin: v-bind('Spacing.Md') 0 0;
  line-height: 1.4;
}

/* 错误提示淡入动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 250ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
