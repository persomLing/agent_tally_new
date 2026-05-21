<template>
  <div class="month-picker" @click="showPicker = true">
    <span class="month-picker-label">{{ displayText }}</span>
    <span class="month-picker-arrow">▼</span>
    <select
      v-if="showPicker"
      class="month-picker-select"
      :value="modelValue"
      @change="onChange"
      @blur="showPicker = false"
      autofocus
    >
      <option v-for="m in months" :key="m.value" :value="m.value">
        {{ m.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatYearMonth, getCurrentMonth } from '@/utils/date'
import { Colors, FontSize, FontWeight, Spacing, ComponentSize } from '@/constants/design-tokens'

const props = withDefaults(defineProps<{
  modelValue: string
  startYear?: number
  endYear?: number
}>(), {
  startYear: 2020,
  endYear: 2030,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPicker = ref(false)

const displayText = computed(() => formatYearMonth(props.modelValue))

const months = computed(() => {
  const list: { label: string; value: string }[] = []
  for (let y = props.startYear; y <= props.endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const val = `${y}-${String(m).padStart(2, '0')}`
      list.push({ label: `${y}年${m}月`, value: val })
    }
  }
  return list
})

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
  showPicker.value = false
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

.month-picker-select {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>
