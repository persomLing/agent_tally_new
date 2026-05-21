<template>
  <div id="app">
    <router-view v-if="!userStore.isChecking" />
    <div v-else class="app-loading">
      <div class="app-loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { Colors } from '@/constants/design-tokens'

const userStore = useUserStore()

onMounted(async () => {
  await userStore.checkAuth()
  // Router guard logic would go here — redirect to auth if not logged in
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  background-color: v-bind('Colors.Background');
  color: v-bind('Colors.TextPrimary');
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 16px;
  line-height: 1.5;
}

/* Safe area for notched devices */
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

@media (prefers-reduced-motion: reduce) {
  .app-loading-spinner {
    animation-duration: 2s;
  }
}
</style>
