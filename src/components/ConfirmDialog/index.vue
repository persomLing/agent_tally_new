<template>
  <u-modal
    :show="visible"
    :title="title"
    :content="message"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :confirm-color="danger ? '#ef4444' : '#3b82f6'"
    show-cancel-button
    @confirm="onConfirm"
    @cancel="onCancel"
  />
</template>

<script setup lang="ts">
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
