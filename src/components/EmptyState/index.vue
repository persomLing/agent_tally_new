<template>
  <div class="empty-state">
    <div class="empty-state-icon" v-if="icon">
      <span class="empty-state-icon-svg" v-html="icon"></span>
    </div>
    <p class="empty-state-text">{{ text }}</p>
    <button v-if="actionText" class="empty-state-action" @click="$emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/design-tokens'

defineProps<{
  text: string
  icon?: string
  actionText?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-state-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  color: v-bind('Colors.TextTertiary');
}

.empty-state-icon-svg {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-text {
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextSecondary');
  margin: 0 0 16px;
  line-height: 1.5;
}

.empty-state-action {
  background: none;
  border: none;
  color: v-bind('Colors.Primary');
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Medium');
  cursor: pointer;
  padding: 8px 16px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.empty-state-action:active {
  opacity: 0.7;
}
</style>
