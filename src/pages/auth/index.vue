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
        <div class="auth-logo">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#4F6EF7"/>
            <path d="M20 44V28l12-8 12 8v16H20z" fill="white" opacity="0.9"/>
            <path d="M24 36h16M24 40h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="32" cy="30" r="4" fill="white" opacity="0.95"/>
          </svg>
        </div>
        <h2 class="auth-title">个人记账</h2>
      </div>

      <p class="auth-description">
        简洁清晰的记账工具，轻松管理每一笔收支
      </p>

      <p class="auth-info">
        授权微信头像和昵称后即可开启记账之旅
      </p>

      <button
        class="auth-btn"
        :class="{ 'auth-btn-loading': store.isLoading }"
        :disabled="store.isLoading"
        @click="handleAuthorize"
      >
        <span v-if="store.isLoading" class="auth-btn-spinner"></span>
        <span>{{ store.isLoading ? '授权中...' : '微信授权进入' }}</span>
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

onMounted(async () => {
  const authorized = await store.checkAuth()
  if (authorized) {
    redirectToDetail()
  }
})

async function handleAuthorize() {
  showRejected.value = false

  try {
    let nickName = ''
    let avatarUrl = ''

    // 尝试调用微信原生授权 API
    if (typeof wx !== 'undefined' && typeof wx.getUserProfile === 'function') {
      const res: any = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject,
        })
      })
      nickName = res.userInfo?.nickName ?? ''
      avatarUrl = res.userInfo?.avatarUrl ?? ''
    } else {
      // 开发/测试环境：使用模拟数据
      nickName = '微信用户'
      avatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRnaQianF4zJ0lY6q6ZiarRas/0'
    }

    if (!nickName || !avatarUrl) {
      showRejected.value = true
      return
    }

    const success = await store.authorize({ nickName, avatarUrl })
    if (success) {
      redirectToDetail()
    } else {
      showRejected.value = true
    }
  } catch {
    // 用户拒绝授权
    showRejected.value = true
  }
}

function redirectToDetail() {
  // uni-app 环境
  if (typeof uni !== 'undefined' && typeof uni.navigateTo === 'function') {
    uni.navigateTo({ url: '/pages/detail/index' })
    return
  }
  // 浏览器环境（开发/测试）
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

.auth-logo {
  display: flex;
  justify-content: center;
  margin-bottom: v-bind('Spacing.Lg');
}

.auth-logo svg {
  display: block;
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

.auth-info {
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextTertiary');
  margin: 0 0 v-bind('Spacing.Xl2');
  line-height: 1.5;
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

@media (prefers-reduced-motion: reduce) {
  .auth-btn,
  .auth-btn-spinner,
  .fade-enter-active,
  .fade-leave-active {
    animation: none;
    transition: none;
  }

  .auth-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
