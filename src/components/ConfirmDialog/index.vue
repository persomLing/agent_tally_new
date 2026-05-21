<template>
  <div v-if="visible" class="confirm-dialog-overlay" @click.self="onCancel">
    <div class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="title">
      <h3 class="confirm-dialog-title">{{ title }}</h3>
      <p class="confirm-dialog-message">{{ message }}</p>
      <div class="confirm-dialog-actions">
        <button class="confirm-dialog-btn confirm-dialog-btn-cancel" @click="onCancel">
          {{ cancelText }}
        </button>
        <button
          class="confirm-dialog-btn confirm-dialog-btn-confirm"
          :class="{ 'confirm-dialog-btn-danger': danger }"
          @click="onConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Colors, Radius, Shadow, FontSize, FontWeight, Spacing } from '@/constants/design-tokens'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>(), {
  title: '提示',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:visible': [value: boolean]
}>()

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease-out;
}

.confirm-dialog {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl');
  padding: 24px;
  width: 290px;
  max-width: 90vw;
  box-shadow: v-bind('Shadow.Xl');
  animation: slideUp 200ms ease-out;
}

.confirm-dialog-title {
  font-size: v-bind('FontSize.H3');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  margin: 0 0 8px;
  text-align: center;
}

.confirm-dialog-message {
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextSecondary');
  margin: 0 0 24px;
  text-align: center;
  line-height: 1.5;
}

.confirm-dialog-actions {
  display: flex;
  gap: 12px;
}

.confirm-dialog-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: v-bind('Radius.Lg');
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Medium');
  cursor: pointer;
  transition: all 150ms ease;
  min-width: 0;
}

.confirm-dialog-btn:active {
  transform: scale(0.97);
}

.confirm-dialog-btn-cancel {
  background: v-bind('Colors.Background');
  color: v-bind('Colors.TextSecondary');
}

.confirm-dialog-btn-confirm {
  background: v-bind('Colors.Primary');
  color: #fff;
}

.confirm-dialog-btn-danger {
  background: v-bind('Colors.Error');
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .confirm-dialog-overlay,
  .confirm-dialog {
    animation: none;
  }
}
</style>
