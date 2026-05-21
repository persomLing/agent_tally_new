<template>
  <div id="app">
    <router-view v-if="!userStore.isChecking" />
    <div v-else class="app-loading">
      <div class="app-loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { Colors } from '@/constants/design-tokens'
import { initCloud } from '@/services/cloud'

const userStore = useUserStore()

onLaunch(() => {
  initCloud()
})

onMounted(async () => {
  await userStore.checkAuth()
  // Router guard logic would go here — redirect to auth if not logged in
})
</script>

<style>
/* WXSS doesn't support universal * selector — use page + view instead */
page, view, text, image, scroll-view, swiper, swiper-item, navigator, button, input, textarea, label, picker, switch, icon, radio, checkbox, slider, video, map, canvas, form, progress, rich-text, web-view, movable-area, movable-view, cover-view, cover-image {
  margin: 0;
  padding: 0;
}

page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  background-color: v-bind('Colors.Background');
  color: v-bind('Colors.TextPrimary');
  font-size: 16px;
  line-height: 1.5;
}

.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.app-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid v-bind('Colors.Border');
  border-top-color: v-bind('Colors.Primary');
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
