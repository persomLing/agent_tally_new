<template>
  <view class="auth-page">
    <view v-if="store.isChecking" class="auth-center">
      <u-loading-icon text="正在检查登录状态..." />
    </view>

    <view v-else-if="store.isLoggedIn" class="auth-center">
      <u-loading-icon text="授权成功，正在跳转..." />
    </view>

    <view v-else class="auth-container">
      <view class="auth-brand">
        <button
          class="auth-avatar-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <image v-if="tempAvatarUrl" class="auth-avatar-img" :src="tempAvatarUrl" mode="aspectFill" />
          <view v-else class="auth-avatar-placeholder">
            <u-icon name="account" size="32" color="#b0b8c8" />
          </view>
          <view class="auth-avatar-overlay">
            <text class="auth-avatar-camera">📷</text>
          </view>
        </button>
        <text class="auth-title">个人记账</text>
      </view>

      <text class="auth-description">简洁清晰的记账工具，轻松管理每一笔收支</text>

      <view class="auth-input-wrap">
        <u-input
          v-model="tempNickName"
          type="nickname"
          placeholder="请输入你的昵称"
          border="surround"
          :custom-style="{ textAlign: 'center' }"
        />
      </view>

      <u-button
        type="primary"
        :loading="store.isLoading"
        :disabled="store.isLoading || !tempNickName.trim()"
        @click="handleAuthorize"
      >
        {{ store.isLoading ? '进入中...' : '开始记账' }}
      </u-button>

      <text v-if="showRejected" class="auth-rejected">{{ getErrorMessage(errorCodes.AUTH_DENIED) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { getErrorMessage, ErrorCodes } from '@/constants/error-codes'

const store = useUserStore()
const errorCodes = ErrorCodes
const showRejected = ref(false)
const tempAvatarUrl = ref('')
const tempNickName = ref('')

onMounted(async () => {
  const authorized = await store.checkAuth()
  if (authorized) redirectToDetail()
})

function onChooseAvatar(e: any) {
  tempAvatarUrl.value = e.detail?.avatarUrl ?? ''
}

async function handleAuthorize() {
  showRejected.value = false
  const nickName = tempNickName.value.trim() || '微信用户'
  let avatarUrl = tempAvatarUrl.value

  // 上传头像到云存储
  if (avatarUrl && typeof wx?.cloud?.uploadFile === 'function') {
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
        filePath: avatarUrl,
      })
      avatarUrl = uploadRes.fileID
    } catch {
      avatarUrl = ''
    }
  }

  const success = await store.authorize({ nickName, avatarUrl })
  if (success) redirectToDetail()
  else showRejected.value = true
}

function redirectToDetail() {
  uni.reLaunch({ url: '/pages/detail/index' })
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-center { text-align: center; padding: 48px; }
.auth-container {
  width: 100%;
  max-width: 360px;
  padding: 48px 24px;
  text-align: center;
}
.auth-brand { margin-bottom: 32px; }
.auth-avatar-btn {
  position: relative;
  width: 88px; height: 88px;
  padding: 0;
  border: 2px dashed #e2e8f0;
  border-radius: 50%;
  background: transparent;
  overflow: hidden;
  margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
}
.auth-avatar-btn::after { border: none; }
.auth-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.auth-avatar-placeholder {
  width: 100%; height: 100%;
  background: #e8ecf2;
  display: flex; align-items: center; justify-content: center;
}
.auth-avatar-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; justify-content: center;
  background: linear-gradient(transparent 60%, rgba(0,0,0,0.35));
  border-radius: 50%;
}
.auth-avatar-camera { font-size: 18px; margin-bottom: 6px; }
.auth-title { display: block; font-size: 22px; font-weight: 600; color: #1e293b; }
.auth-description { display: block; font-size: 14px; color: #64748b; margin: 0 0 24px; line-height: 1.5; }
.auth-input-wrap { margin-bottom: 24px; }
.auth-rejected { display: block; font-size: 12px; color: #ef4444; margin-top: 12px; }
</style>
