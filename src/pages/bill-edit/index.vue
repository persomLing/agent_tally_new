<template>
  <view class="bill-edit-page">
    <!-- Nav Bar -->
    <view class="nav-bar">
      <view class="back-btn" @click="handleBack">
        <u-icon name="arrow-left" size="20" color="#1e293b" />
      </view>
      <text class="nav-title">{{ isEditMode ? '编辑账单' : '新增账单' }}</text>
    </view>

    <!-- Scrollable Content -->
    <scroll-view scroll-y class="content-scroll">
      <!-- Type Toggle -->
      <view class="type-toggle" :class="form.type === 'income' ? 'toggle-income' : 'toggle-expense'">
        <view class="toggle-slider" :class="{ 'slider-right': form.type === 'income' }" />
        <view class="toggle-btn" :class="{ active: form.type === 'expense' }" @click="switchType('expense')">支出</view>
        <view class="toggle-btn" :class="{ active: form.type === 'income' }" @click="switchType('income')">收入</view>
      </view>

      <!-- Amount Display -->
      <view class="amount-section" :class="form.type === 'income' ? 'amount-income' : 'amount-expense'">
        <text class="amount-value" :class="{ 'amount-placeholder': displayValue === '0' }">{{ displayFormatted }}</text>
        <text v-if="expressionText" class="amount-expression">{{ expressionText }}</text>
      </view>

      <!-- Category -->
      <view class="section">
        <text class="section-title">分类</text>
        <view class="category-grid">
          <view
            v-for="cat in categories" :key="cat.code"
            :class="['category-item', { selected: form.categoryCode === cat.code }]"
            @click="selectCategory(cat)"
          >
            <view
              class="category-icon-wrapper"
              :style="{
                backgroundColor: form.categoryCode === cat.code ? cat.color : cat.color + '14',
                color: form.categoryCode === cat.code ? '#FFFFFF' : cat.color,
              }"
            >
              <text class="category-icon-char">{{ cat.name.charAt(0) }}</text>
            </view>
            <text class="category-item-name">{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <!-- Date -->
      <view class="section">
        <text class="section-title">日期</text>
        <picker mode="date" :value="form.billDate" @change="onDateChange">
          <view class="date-picker-btn">
            <text>{{ formattedDate }}</text>
            <u-icon name="arrow-down" size="12" color="#94a3b8" />
          </view>
        </picker>
      </view>

      <!-- Remark -->
      <view v-if="form.categoryCode" class="section">
        <text class="section-title">备注</text>
        <input
          class="remark-input"
          v-model="form.remark"
          placeholder="输入备注..."
          maxlength="200"
          @input="onRemarkInput"
        />
        <scroll-view v-if="memos.length > 0" scroll-x class="memo-chips">
          <view class="memo-chips-inner">
            <text
              v-for="memo in memos" :key="memo._id"
              class="memo-chip"
              @click="form.remark = memo.content"
            >{{ memo.content }}</text>
          </view>
        </scroll-view>
      </view>

      <view v-if="isEditMode" class="delete-section">
        <u-button type="error" plain @click="showDeleteConfirm = true">删除此账单</u-button>
      </view>
    </scroll-view>

    <!-- Calculator Keyboard -->
    <view class="keyboard">
      <view class="keyboard-row">
        <view class="key key-number" @click="inputDigit('1')">1</view>
        <view class="key key-number" @click="inputDigit('2')">2</view>
        <view class="key key-number" @click="inputDigit('3')">3</view>
        <view class="key key-operator" @click="inputOperator('+')">+</view>
      </view>
      <view class="keyboard-row">
        <view class="key key-number" @click="inputDigit('4')">4</view>
        <view class="key key-number" @click="inputDigit('5')">5</view>
        <view class="key key-number" @click="inputDigit('6')">6</view>
        <view class="key key-operator" @click="inputOperator('-')">−</view>
      </view>
      <view class="keyboard-row">
        <view class="key key-number" @click="inputDigit('7')">7</view>
        <view class="key key-number" @click="inputDigit('8')">8</view>
        <view class="key key-number" @click="inputDigit('9')">9</view>
        <view class="key key-delete" @click="onDelete">⌫</view>
      </view>
      <view class="keyboard-row">
        <view class="key key-number" @click="inputDigit('.')">.</view>
        <view class="key key-number" @click="inputDigit('0')">0</view>
        <view class="key key-clear" @click="onClear">C</view>
        <view class="key key-save" @click="onSave">✓</view>
      </view>
    </view>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="确认删除"
      message="删除后不可恢复，确定要删除此账单吗？"
      confirmText="删除"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
    <ConfirmDialog
      :visible="showBackConfirm"
      title="退出编辑"
      message="当前内容尚未保存，确定退出吗？"
      @confirm="confirmBack"
      @cancel="showBackConfirm = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Decimal from 'decimal.js'
import { getCategoriesByType } from '@/constants/categories'
import { getToday, formatDateLabel } from '@/utils/date'
import { validateBillForm } from '@/utils/validator'
import { truncateToTwoDecimals, centsToYuan } from '@/utils/money'
import { createBill, updateBill, deleteBill, getBillById } from '@/services/billService'
import { listMemos, createMemo } from '@/services/memoService'
import { useBillStore } from '@/stores/billStore'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import type { BillFormData, BillType, CategoryItem, Memo } from '@/types'

const billId = ref('')
const isEditMode = computed(() => !!billId.value)

const form = ref<BillFormData>({
  type: 'expense', amount: '', categoryCode: '', billDate: getToday(), remark: '',
})
const originalForm = ref('')
const hasUnsavedChanges = ref(false)
const displayValue = ref('0')
const accumulator = ref(new Decimal(0))
const pendingOperator = ref<string | null>(null)
const isNewEntry = ref(true)
const expressionText = ref('')
const categories = computed(() => getCategoriesByType(form.value.type))
const memos = ref<Memo[]>([])
const formattedDate = computed(() => formatDateLabel(form.value.billDate))
const showDeleteConfirm = ref(false)
const showBackConfirm = ref(false)
const isLoading = ref(false)

function getRunningResult(): Decimal {
  if (pendingOperator.value !== null && !isNewEntry.value) {
    const current = new Decimal(displayValue.value || '0')
    if (pendingOperator.value === '+') return accumulator.value.plus(current)
    if (pendingOperator.value === '-') return accumulator.value.minus(current)
  }
  if (pendingOperator.value !== null && isNewEntry.value) return accumulator.value
  return new Decimal(displayValue.value || '0')
}

const displayFormatted = computed(() => {
  if (pendingOperator.value === null) {
    return displayValue.value === '0' ? '¥ 0' : `¥ ${displayValue.value}`
  }
  const result = getRunningResult()
  const str = result.toFixed(2).replace(/\.?0+$/, '')
  return `¥ ${str || '0'}`
})

onMounted(async () => {
  try {
    const pages = getCurrentPages ? getCurrentPages() : []
    const currentPage = pages[pages.length - 1]
    if (currentPage?.options?.id) billId.value = currentPage.options.id
  } catch {}
  if (billId.value) await loadBill(billId.value)
  saveFormSnapshot()
  await loadMemos()
})

async function loadBill(id: string) {
  isLoading.value = true
  try {
    const bill = await getBillById(id)
    const amountYuan = bill.amount > 0 ? centsToYuan(bill.amount).toString() : '0'
    form.value = { type: bill.type, amount: amountYuan, categoryCode: bill.categoryCode, billDate: bill.billDate, remark: bill.remark || '' }
    displayValue.value = amountYuan || '0'
    accumulator.value = new Decimal(0)
    pendingOperator.value = null
    isNewEntry.value = true
    expressionText.value = ''
  } catch (err: any) {
    uni.showToast({ title: err.message || '加载账单失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function saveFormSnapshot() { originalForm.value = JSON.stringify(form.value) }
function isFormChanged() { return JSON.stringify(form.value) !== originalForm.value }

function switchType(type: BillType) {
  if (form.value.type === type) return
  form.value.type = type; form.value.categoryCode = ''; hasUnsavedChanges.value = true; loadMemos()
}

function selectCategory(cat: CategoryItem) {
  form.value.categoryCode = cat.code; hasUnsavedChanges.value = true; loadMemos()
}

function inputDigit(digit: string) {
  if (isNewEntry.value) {
    displayValue.value = digit === '.' ? '0.' : digit; isNewEntry.value = false
  } else {
    if (digit === '.' && displayValue.value.includes('.')) return
    if (displayValue.value === '0' && digit !== '.') displayValue.value = digit
    else { displayValue.value += digit; displayValue.value = truncateToTwoDecimals(displayValue.value) }
  }
  if (displayValue.value.length > 1 && displayValue.value[0] === '0' && displayValue.value[1] !== '.') {
    displayValue.value = displayValue.value.replace(/^0+/, '')
  }
  form.value.amount = displayValue.value; hasUnsavedChanges.value = true; updateExpression()
}

function inputOperator(op: string) {
  if (!displayValue.value || displayValue.value === '.') return
  if (displayValue.value === '0' && isNewEntry.value && pendingOperator.value === null) return
  if (!isNewEntry.value) {
    const current = new Decimal(displayValue.value || '0')
    if (pendingOperator.value !== null) compute(current)
    else accumulator.value = current
  }
  pendingOperator.value = op; isNewEntry.value = true; updateExpression()
}

function compute(currentValue: Decimal) {
  if (pendingOperator.value === '+') accumulator.value = accumulator.value.plus(currentValue)
  else if (pendingOperator.value === '-') accumulator.value = accumulator.value.minus(currentValue)
  else accumulator.value = currentValue
}

function onDelete() {
  if (isNewEntry.value) return
  displayValue.value = displayValue.value.length <= 1 ? '0' : displayValue.value.slice(0, -1)
  form.value.amount = displayValue.value; updateExpression()
}

function onClear() {
  displayValue.value = '0'; accumulator.value = new Decimal(0)
  pendingOperator.value = null; isNewEntry.value = true; expressionText.value = ''; form.value.amount = ''
}

function updateExpression() {
  if (pendingOperator.value) {
    const opSymbol = pendingOperator.value === '-' ? '−' : pendingOperator.value
    const accStr = accumulator.value.toFixed(2).replace(/\.?0+$/, '') || '0'
    expressionText.value = isNewEntry.value ? `${accStr} ${opSymbol}` : `${accStr} ${opSymbol} ${displayValue.value}`
  } else {
    expressionText.value = ''
  }
}

function computeFinalAmount(): number {
  const raw = displayValue.value.replace(/\.$/, '')
  if (pendingOperator.value !== null) { compute(new Decimal(raw || '0')); pendingOperator.value = null }
  const result = accumulator.value.greaterThan(0) ? accumulator.value : new Decimal(raw || '0')
  return result.toNumber()
}

async function onSave() {
  const finalAmount = computeFinalAmount()
  form.value.amount = finalAmount.toString()
  const validation = validateBillForm({ type: form.value.type, amount: form.value.amount, categoryCode: form.value.categoryCode, billDate: form.value.billDate })
  if (!validation.valid) {
    uni.showToast({ title: validation.error || '请检查输入', icon: 'none' }); return
  }
  try {
    const billStore = useBillStore()
    if (isEditMode.value) {
      await updateBill(billId.value, { type: form.value.type, amount: form.value.amount, categoryCode: form.value.categoryCode, billDate: form.value.billDate, remark: form.value.remark })
    } else {
      await createBill({ type: form.value.type, amount: form.value.amount, categoryCode: form.value.categoryCode, billDate: form.value.billDate, remark: form.value.remark })
    }
    billStore.notifyBillChanged()
    const remark = form.value.remark?.trim()
    if (remark && form.value.categoryCode) {
      try { await createMemo({ type: form.value.type, categoryCode: form.value.categoryCode, content: remark }) } catch {}
    }
    navigateBack()
  } catch (err: any) {
    uni.showToast({ title: err.message || '保存失败，请重试', icon: 'none' })
  }
}

async function confirmDelete() {
  showDeleteConfirm.value = false
  try {
    await deleteBill(billId.value); useBillStore().notifyBillChanged(); navigateBack()
  } catch (err: any) {
    uni.showToast({ title: err.message || '删除失败，请重试', icon: 'none' })
  }
}

function handleBack() {
  if (isFormChanged() && form.value.amount && form.value.amount !== '0') showBackConfirm.value = true
  else navigateBack()
}

function confirmBack() { showBackConfirm.value = false; navigateBack() }

function navigateBack() {
  try {
    if (typeof uni !== 'undefined' && uni.navigateBack) uni.navigateBack()
    else window.history.back()
  } catch { window.history.back() }
}

function onDateChange(e: any) {
  const val = e.detail?.value || (e.target as HTMLInputElement)?.value
  if (val) { form.value.billDate = val; hasUnsavedChanges.value = true }
}

function onRemarkInput() { hasUnsavedChanges.value = true }

async function loadMemos() {
  if (!form.value.type || !form.value.categoryCode) { memos.value = []; return }
  try { memos.value = await listMemos({ type: form.value.type, categoryCode: form.value.categoryCode }) }
  catch { memos.value = [] }
}
</script>

<style scoped>
.bill-edit-page { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; position: relative; }
.nav-bar {
  display: flex; align-items: center; padding: 12px 16px;
  background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.back-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin-left: -12px; flex-shrink: 0; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1e293b; margin: 0; }
.content-scroll { flex: 1; overflow-y: auto; padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.type-toggle {
  display: flex; position: relative; margin: 16px 16px 0;
  border-radius: 22px; padding: 3px; height: 40px;
}
.toggle-expense { background: #fef2f2; }
.toggle-income { background: #f0fdf4; }
.toggle-slider {
  position: absolute; top: 3px; left: 3px;
  width: calc(50% - 3px); height: calc(100% - 6px);
  border-radius: 22px; transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;
}
.toggle-expense .toggle-slider { background: #f43f5e; }
.toggle-income .toggle-slider { background: #10b981; }
.toggle-slider.slider-right { transform: translateX(calc(100% + 6px)); }
.toggle-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 500; color: #64748b; position: relative; z-index: 1;
}
.toggle-btn.active { color: #fff; font-weight: 700; }
.amount-section { background: #fff; padding: 24px 16px; text-align: center; }
.amount-expense { border-bottom: 2px solid #fecdd3; }
.amount-income { border-bottom: 2px solid #a7f3d0; }
.amount-value { font-size: 36px; font-weight: 700; color: #1e293b; line-height: 1.3; }
.amount-value.amount-placeholder { color: #94a3b8; }
.amount-expense .amount-value:not(.amount-placeholder) { color: #f43f5e; }
.amount-income .amount-value:not(.amount-placeholder) { color: #10b981; }
.amount-expression { display: block; font-size: 12px; color: #94a3b8; margin-top: 8px; }
.section { background: #fff; margin-top: 12px; padding: 16px; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title { font-size: 13px; font-weight: 500; color: #64748b; margin-bottom: 12px; display: block; }
.section-title-row .section-title { margin-bottom: 0; }
.section-action-btn { font-size: 13px; color: #3b82f6; }
.category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.category-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 4px 0; border-radius: 8px; }
.category-item.selected { transform: scale(1.05); }
.category-icon-wrapper {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.category-icon-char { font-size: 20px; font-weight: 700; line-height: 1; }
.category-item-name { font-size: 12px; color: #1e293b; text-align: center; }
.date-picker-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; height: 44px; padding: 0 12px;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; color: #1e293b; box-sizing: border-box;
}
.remark-input {
  width: 100%; height: 44px; padding: 0 12px;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; color: #1e293b; box-sizing: border-box;
}
.memo-chips { width: 100%; margin-top: 8px; white-space: nowrap; }
.memo-chips-inner { display: inline-flex; gap: 8px; padding-bottom: 4px; }
.memo-chip {
  display: inline-block; padding: 6px 14px; font-size: 13px; color: #64748b;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 50px;
}
.delete-section { padding: 24px 16px; text-align: center; }
.keyboard {
  flex-shrink: 0; background: #fff; border-top: 1px solid #e2e8f0;
  padding: 8px 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
}
.keyboard-row { display: flex; gap: 6px; margin-bottom: 6px; }
.keyboard-row:last-child { margin-bottom: 0; }
.key {
  flex: 1; height: 48px; border-radius: 8px; font-size: 20px; font-weight: 500;
  display: flex; align-items: center; justify-content: center;
}
.key:active { opacity: 0.7; }
.key-number { background: #f8fafc; color: #1e293b; }
.key-operator { background: #eff6ff; color: #3b82f6; font-size: 22px; font-weight: 700; }
.key-delete { background: #f8fafc; color: #64748b; font-size: 18px; }
.key-clear { background: #f8fafc; color: #ef4444; font-weight: 600; }
.key-save { background: #3b82f6; color: #fff; font-size: 22px; font-weight: 700; }
.key-save:active { background: #2563eb; }
</style>
