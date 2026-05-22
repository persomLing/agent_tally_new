<template>
  <div
    class="floating-btn"
    :class="{ 'floating-btn-dragging': isDragging }"
    :style="btnStyle"
    @touchstart="onDragStart"
    @touchmove.stop.prevent="onDragMove"
    @touchend="onDragEnd"
    role="button"
    :aria-label="'记账'"
  >
    <span class="floating-btn-icon">+</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Colors, Shadow, ComponentSize } from '@/constants/design-tokens'

const emit = defineEmits<{
  click: []
}>()

const BTN_SIZE = 56
const MARGIN = 16
const MOVE_THRESHOLD = 5

function screenWidth(): number {
  if (typeof uni !== 'undefined' && uni.getWindowInfo) {
    return uni.getWindowInfo().windowWidth
  }
  return 375
}

function screenHeight(): number {
  if (typeof uni !== 'undefined' && uni.getWindowInfo) {
    return uni.getWindowInfo().windowHeight
  }
  return 667
}

const x = ref(screenWidth() - BTN_SIZE - MARGIN)
const y = ref(screenHeight() - BTN_SIZE - MARGIN - 84)
const isDragging = ref(false)
const hasMoved = ref(false)
const startX = ref(0)
const startY = ref(0)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

const btnStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${x.value}px`,
  top: `${y.value}px`,
  zIndex: 100,
  width: `${BTN_SIZE}px`,
  height: `${BTN_SIZE}px`,
}))

function onDragStart(e: TouchEvent) {
  isDragging.value = true
  hasMoved.value = false
  const touch = e.touches[0]
  startX.value = touch.clientX
  startY.value = touch.clientY
  dragOffsetX.value = touch.clientX - x.value
  dragOffsetY.value = touch.clientY - y.value
}

function onDragMove(e: TouchEvent) {
  if (!isDragging.value) return
  const touch = e.touches[0]

  if (!hasMoved.value) {
    const dx = Math.abs(touch.clientX - startX.value)
    const dy = Math.abs(touch.clientY - startY.value)
    if (dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD) return
    hasMoved.value = true
  }

  let newX = touch.clientX - dragOffsetX.value
  let newY = touch.clientY - dragOffsetY.value

  newX = Math.max(MARGIN, Math.min(screenWidth() - BTN_SIZE - MARGIN, newX))
  newY = Math.max(MARGIN, Math.min(screenHeight() - BTN_SIZE - MARGIN - 84, newY))

  x.value = newX
  y.value = newY
}

function onDragEnd() {
  isDragging.value = false

  if (!hasMoved.value) {
    emit('click')
    return
  }

  snapToEdge()
}

function snapToEdge() {
  const rightDist = screenWidth() - x.value - BTN_SIZE
  const leftDist = x.value

  if (rightDist < leftDist) {
    x.value = screenWidth() - BTN_SIZE - MARGIN
  } else {
    x.value = MARGIN
  }

  y.value = Math.max(MARGIN, Math.min(screenHeight() - BTN_SIZE - MARGIN - 84, y.value))
}
</script>

<style scoped>
.floating-btn {
  background: v-bind('Colors.Primary');
  border-radius: 50%;
  box-shadow: v-bind('Shadow.FloatingBtn');
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.floating-btn:active {
  transform: scale(0.95);
}

.floating-btn-dragging {
  transition: none;
}

.floating-btn-icon {
  color: #fff;
  font-size: 28px;
  font-weight: 300;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .floating-btn,
  .floating-btn-dragging {
    transition: none;
  }
}
</style>
