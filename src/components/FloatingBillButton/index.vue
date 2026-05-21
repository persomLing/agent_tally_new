<template>
  <div
    class="floating-btn"
    :class="{ 'floating-btn-dragging': isDragging }"
    :style="btnStyle"
    @mousedown="onDragStart"
    @touchstart.prevent="onDragStart"
    @click="onClick"
    role="button"
    :aria-label="'记账'"
  >
    <span class="floating-btn-icon">+</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Colors, Shadow, ComponentSize } from '@/constants/design-tokens'

const emit = defineEmits<{
  click: []
}>()

const BTN_SIZE = 56
const MARGIN = 16

const x = ref(window.innerWidth - BTN_SIZE - MARGIN)
const y = ref(window.innerHeight - BTN_SIZE - MARGIN - 50) // 50 = bottom nav
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const hasMoved = ref(false)

const btnStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${x.value}px`,
  top: `${y.value}px`,
  zIndex: 100,
  width: `${BTN_SIZE}px`,
  height: `${BTN_SIZE}px`,
}))

function onDragStart(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  hasMoved.value = false
  const pos = getEventPos(e)
  dragStartX.value = pos.x - x.value
  dragStartY.value = pos.y - y.value

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove)
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  hasMoved.value = true
  const pos = getEventPos(e)
  let newX = pos.x - dragStartX.value
  let newY = pos.y - dragStartY.value

  // Clamp to viewport
  newX = Math.max(MARGIN, Math.min(window.innerWidth - BTN_SIZE - MARGIN, newX))
  newY = Math.max(MARGIN, Math.min(window.innerHeight - BTN_SIZE - MARGIN - 50, newY))

  x.value = newX
  y.value = newY
}

function onDragEnd() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)

  // Snap to nearest edge
  snapToEdge()
}

function snapToEdge() {
  const rightDist = window.innerWidth - x.value - BTN_SIZE
  const leftDist = x.value
  const bottomDist = window.innerHeight - y.value - BTN_SIZE
  const topDist = y.value

  // Determine which edge is closest
  const hEdge = rightDist < leftDist ? 'right' : 'left'
  const vEdge = bottomDist < topDist ? 'bottom' : 'top'

  // Prefer horizontal edges
  if (hEdge === 'right') {
    x.value = window.innerWidth - BTN_SIZE - MARGIN
  } else {
    x.value = MARGIN
  }

  // Keep vertical within safe range but prefer horizontal snapping
  y.value = Math.max(MARGIN, Math.min(window.innerHeight - BTN_SIZE - MARGIN - 50, y.value))
}

function getEventPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  return { x: e.clientX, y: e.clientY }
}

function onClick() {
  if (!hasMoved.value) {
    emit('click')
  }
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
