<template>
  <picker mode="date" :value="pickerValue" fields="month" @change="onChange">
    <div class="month-picker">
      <span class="month-picker-label">{{ displayText }}</span>
      <span class="month-picker-arrow">▼</span>
    </div>
  </picker>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatYearMonth, getCurrentMonth } from '@/utils/date'
import { Colors, FontSize, FontWeight, ComponentSize } from '@/constants/design-tokens'

const props = withDefaults(defineProps<{
  modelValue: string
}>(), {})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const pickerValue = computed(() => `${props.modelValue}-01`)

const displayText = computed(() => formatYearMonth(props.modelValue))

function onChange(e: any) {
  // picker with fields="month" returns "YYYY-MM" as the value
  const val = e.detail?.value || ''
  if (val) {
    // val has format "YYYY-MM-DD" from the date picker
    const month = val.substring(0, 7)
    emit('update:modelValue', month)
  }
}
</script>

<style scoped>
.month-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  position: relative;
  min-height: v-bind('ComponentSize.ButtonMinHeight');
  user-select: none;
}

.month-picker-label {
  font-size: v-bind('FontSize.H3');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
}

.month-picker-arrow {
  font-size: 10px;
  color: v-bind('Colors.TextTertiary');
}
</style>
