<template>
  <view class="swipe-wrap" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <view class="swipe-content" :style="{ transform: `translateX(${offset}px)`, transition: animStyle }">
      <slot />
    </view>
    <view class="swipe-action" @click.stop="onDelete">
      <slot name="action">
        <text class="swipe-action-text">删除</text>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Colors } from '@/constants/design-tokens'

const emit = defineEmits<{
  delete: []
}>()

const ACTION_WIDTH = 72
const SWIPE_THRESHOLD = 40

const offset = ref(0)
const animating = ref(false)

const animStyle = computed(() => animating.value ? 'transform 0.2s ease' : 'none')

let startX = 0
let currentTranslate = 0

function onTouchStart(e: TouchEvent) {
  animating.value = false
  startX = e.touches[0].clientX
  currentTranslate = offset.value
}

function onTouchMove(e: TouchEvent) {
  const dx = e.touches[0].clientX - startX
  let newOffset = currentTranslate + dx
  newOffset = Math.min(0, Math.max(-ACTION_WIDTH, newOffset))
  offset.value = newOffset
}

function onTouchEnd() {
  animating.value = true
  if (offset.value < -SWIPE_THRESHOLD) {
    offset.value = -ACTION_WIDTH
  } else {
    offset.value = 0
  }
}

function close() {
  animating.value = true
  offset.value = 0
}

function onDelete() {
  emit('delete')
  close()
}
</script>

<style scoped>
.swipe-wrap {
  position: relative;
  overflow: hidden;
}

.swipe-content {
  position: relative;
  z-index: 1;
  background: v-bind('Colors.CardBg');
}

.swipe-action {
  position: absolute;
  top: 0;
  right: 0;
  width: 72px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: v-bind('Colors.Error');
  cursor: pointer;
}

.swipe-action-text {
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 500;
}
</style>
