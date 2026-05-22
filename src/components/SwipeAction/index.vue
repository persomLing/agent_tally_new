<template>
  <u-swipe-action>
    <u-swipe-action-item :options="actionOptions" @click="onActionClick">
      <slot />
    </u-swipe-action-item>
  </u-swipe-action>
</template>

<script setup lang="ts">
const emit = defineEmits<{ delete: [] }>()

const actionOptions = [{ text: '删除', style: { backgroundColor: '#ef4444', color: '#fff' } }]

function onActionClick() {
  emit('delete')
}
</script>
