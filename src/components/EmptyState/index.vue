<template>
  <u-empty :text="text" mode="data" />
</template>

<script setup lang="ts">
defineProps<{
  text: string
  icon?: string
  actionText?: string
}>()

defineEmits<{ action: [] }>()
</script>
