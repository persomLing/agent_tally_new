<template>
  <view class="bottom-nav">
    <view
      v-for="tab in tabs"
      :key="tab.pagePath"
      class="nav-item"
      :class="{ active: currentPath === tab.pagePath }"
      @click="switchTab(tab.pagePath)"
    >
      <view class="nav-icon">
        <text class="nav-icon-text">{{ tab.icon }}</text>
      </view>
      <text class="nav-label">{{ tab.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Colors, FontSize } from '@/constants/design-tokens'

const props = withDefaults(defineProps<{
  current?: string
}>(), {})

const tabs = [
  { text: '明细', pagePath: 'pages/detail/index', icon: '☰' },
  { text: '统计', pagePath: 'pages/statistics/index', icon: '▤' },
  { text: '我的', pagePath: 'pages/profile/index', icon: '◉' },
]

const currentPath = computed(() => props.current || 'pages/detail/index')

function switchTab(path: string) {
  if (path === currentPath.value) return
  uni.reLaunch({ url: '/' + path })
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  background: v-bind('Colors.CardBg');
  border-top: 1px solid v-bind('Colors.Border');
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: pointer;
  gap: 1px;
}

.nav-icon-text {
  font-size: 20px;
  color: v-bind('Colors.TextTertiary');
  line-height: 1;
  font-weight: 400;
}

.nav-label {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
  line-height: 1;
}

.nav-item.active .nav-icon-text {
  color: v-bind('Colors.Primary');
}

.nav-item.active .nav-label {
  color: v-bind('Colors.Primary');
  font-weight: 500;
}
</style>
