<template>
  <div class="bill-edit-page">
    <!-- Nav Bar -->
    <div class="nav-bar">
      <button class="back-btn" @click="handleBack" aria-label="返回">
        <span class="back-icon">&larr;</span>
      </button>
      <h1 class="nav-title">{{ isEditMode ? '编辑账单' : '新增账单' }}</h1>
    </div>

    <!-- Scrollable Content -->
    <div class="content-scroll">
      <!-- Type Toggle -->
      <div class="type-toggle">
        <button
          :class="['type-tab', { active: form.type === 'expense', 'tab-expense': form.type === 'expense' }]"
          @click="switchType('expense')"
        >支出</button>
        <button
          :class="['type-tab', { active: form.type === 'income', 'tab-income': form.type === 'income' }]"
          @click="switchType('income')"
        >收入</button>
      </div>

      <!-- Amount Display -->
      <div class="amount-section">
        <div class="amount-value" :class="{ 'amount-placeholder': displayValue === '0' }">
          {{ displayFormatted }}
        </div>
        <div v-if="expressionText" class="amount-expression">{{ expressionText }}</div>
      </div>

      <!-- Section: Category -->
      <div class="section">
        <div class="section-title">分类</div>
        <div class="category-grid">
          <div
            v-for="cat in categories"
            :key="cat.code"
            :class="['category-item', { selected: form.categoryCode === cat.code }]"
            @click="selectCategory(cat)"
          >
            <div
              class="category-icon-wrapper"
              :style="{
                backgroundColor: form.categoryCode === cat.code ? cat.color : cat.color + '14',
                color: form.categoryCode === cat.code ? '#FFFFFF' : cat.color,
              }"
            >
              <span class="category-icon-char">{{ cat.name.charAt(0) }}</span>
            </div>
            <span class="category-item-name">{{ cat.name }}</span>
          </div>
        </div>
      </div>

      <!-- Section: Date -->
      <div class="section">
        <div class="section-title">日期</div>
        <button class="date-picker-btn" @click="triggerDatePicker">
          <span>{{ formattedDate }}</span>
          <span class="date-arrow">&#9660;</span>
        </button>
        <input
          ref="dateInputRef"
          type="date"
          :value="form.billDate"
          @input="onDateChange"
          class="date-input-hidden"
        />
      </div>

      <!-- Section: Remark -->
      <div class="section">
        <div class="section-title">备注</div>
        <input
          class="remark-input"
          v-model="form.remark"
          placeholder="输入备注..."
          maxlength="200"
          @input="onRemarkInput"
        />
        <div v-if="memos.length > 0" class="memo-chips">
          <span
            v-for="memo in memos"
            :key="memo._id"
            class="memo-chip"
            @click="form.remark = memo.content"
          >{{ memo.content }}</span>
        </div>
      </div>

      <!-- Delete Button (Edit Mode) -->
      <div v-if="isEditMode" class="delete-section">
        <button class="delete-btn" @click="showDeleteConfirm = true">删除此账单</button>
      </div>
    </div>

    <!-- Calculator Keyboard (fixed at bottom) -->
    <div class="keyboard">
      <div class="keyboard-row">
        <button class="key key-number" @click="inputDigit('1')">1</button>
        <button class="key key-number" @click="inputDigit('2')">2</button>
        <button class="key key-number" @click="inputDigit('3')">3</button>
      </div>
      <div class="keyboard-row">
        <button class="key key-number" @click="inputDigit('4')">4</button>
        <button class="key key-number" @click="inputDigit('5')">5</button>
        <button class="key key-number" @click="inputDigit('6')">6</button>
      </div>
      <div class="keyboard-row">
        <button class="key key-number" @click="inputDigit('7')">7</button>
        <button class="key key-number" @click="inputDigit('8')">8</button>
        <button class="key key-number" @click="inputDigit('9')">9</button>
      </div>
      <div class="keyboard-row">
        <button class="key key-number" @click="inputDigit('.')">.</button>
        <button class="key key-number" @click="inputDigit('0')">0</button>
        <button class="key key-delete" @click="onDelete">&#9003;</button>
      </div>
      <div class="keyboard-row row-last">
        <button class="key key-clear" @click="onClear">C</button>
        <button class="key key-operator" @click="inputOperator('+')">+</button>
        <button class="key key-operator" @click="inputOperator('-')">-</button>
        <button class="key key-save" @click="onSave">&#10003;</button>
      </div>
    </div>

    <!-- Error Toast -->
    <div v-if="errorMessage" class="error-toast">{{ errorMessage }}</div>

    <!-- Confirm Dialogs -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getCategoriesByType } from '@/constants/categories'
import { getToday, formatDateLabel } from '@/utils/date'
import { validateBillForm } from '@/utils/validator'
import { truncateToTwoDecimals, centsToYuan, yuanToCents } from '@/utils/money'
import { createBill, updateBill, deleteBill, getBillById } from '@/services/billService'
import { listMemos } from '@/services/memoService'
import { useBillStore } from '@/stores/billStore'
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow, Duration } from '@/constants/design-tokens'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import type { BillFormData, BillType, CategoryItem, Memo, Bill } from '@/types'

// ===== Route / Page Params =====
// In WeChat Mini Program, page receives params via query.
// For this component we assume `id` query param is available via onLoad or route.
const billId = ref('')
const isEditMode = computed(() => !!billId.value)

// ===== Form State =====
const form = ref<BillFormData>({
  type: 'expense',
  amount: '',
  categoryCode: '',
  billDate: getToday(),
  remark: '',
})

const originalForm = ref<string>('') // JSON snapshot for unsaved-changes check
const hasUnsavedChanges = ref(false)

// ===== Calculator State =====
const displayValue = ref('0')
const accumulator = ref(0)
const pendingOperator = ref<string | null>(null)
const isNewEntry = ref(true)
const expressionText = ref('')

// ===== Categories =====
const categories = computed(() => getCategoriesByType(form.value.type))

// ===== Memos =====
const memos = ref<Memo[]>([])

// ===== Date Picker =====
const dateInputRef = ref<HTMLInputElement | null>(null)
const formattedDate = computed(() => formatDateLabel(form.value.billDate))

// ===== UI State =====
const showDatePicker = ref(false)
const showDeleteConfirm = ref(false)
const showBackConfirm = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)

// ===== Computed Display =====
const displayFormatted = computed(() => {
  if (displayValue.value === '0' || displayValue.value === '') return '¥ 0.00'
  return `¥ ${displayValue.value}`
})

// ===== Lifecycle =====
onMounted(async () => {
  // Get bill ID from route params (WeChat Mini Program style)
  // In a web context, this might come from query string or store.
  // We check a global-like access pattern for the id.
  try {
    // @ts-ignore — wx is a WeChat Mini Program global
    const pages = getCurrentPages ? getCurrentPages() : []
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.options && currentPage.options.id) {
      billId.value = currentPage.options.id
    }
  } catch {
    // Fallback: check URL params
    const params = new URLSearchParams(window.location.search)
    if (params.get('id')) {
      billId.value = params.get('id')!
    }
  }

  if (billId.value) {
    await loadBill(billId.value)
  }

  // Capture initial state for unsaved-changes comparison
  saveFormSnapshot()

  // Load memos for initial category
  await loadMemos()
})

/** Load existing bill data for editing */
async function loadBill(id: string) {
  isLoading.value = true
  try {
    const bill = await getBillById(id)
    // Convert cents to yuan for display
    const amountYuan = bill.amount > 0 ? centsToYuan(bill.amount).toString() : '0'

    form.value = {
      type: bill.type,
      amount: amountYuan,
      categoryCode: bill.categoryCode,
      billDate: bill.billDate,
      remark: bill.remark || '',
    }

    // Restore calculator state
    displayValue.value = amountYuan || '0'
    accumulator.value = 0
    pendingOperator.value = null
    isNewEntry.value = true
    expressionText.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || '加载账单失败'
  } finally {
    isLoading.value = false
  }
}

/** Save current form as JSON for change detection */
function saveFormSnapshot() {
  originalForm.value = JSON.stringify(form.value)
}

function isFormChanged(): boolean {
  return JSON.stringify(form.value) !== originalForm.value
}

// ===== Type Toggle =====
function switchType(type: BillType) {
  if (form.value.type === type) return
  form.value.type = type
  form.value.categoryCode = ''
  errorMessage.value = ''
  hasUnsavedChanges.value = true
  loadMemos()
}

// ===== Category Selection =====
function selectCategory(cat: CategoryItem) {
  form.value.categoryCode = cat.code
  errorMessage.value = ''
  hasUnsavedChanges.value = true
  loadMemos()
}

// ===== Calculator Logic =====
function inputDigit(digit: string) {
  if (isNewEntry.value) {
    if (digit === '.') {
      displayValue.value = '0.'
    } else {
      displayValue.value = digit
    }
    isNewEntry.value = false
  } else {
    if (digit === '.' && displayValue.value.includes('.')) return
    if (displayValue.value === '0' && digit !== '.') {
      displayValue.value = digit
      return
    }
    displayValue.value += digit
    // Truncate to 2 decimal places
    displayValue.value = truncateToTwoDecimals(displayValue.value)
  }

  // Remove leading zeros (e.g., "012" -> "12")
  if (displayValue.value.length > 1 && displayValue.value[0] === '0' && displayValue.value[1] !== '.') {
    displayValue.value = displayValue.value.replace(/^0+/, '')
  }

  form.value.amount = displayValue.value
  hasUnsavedChanges.value = true
  updateExpression()
}

function inputOperator(op: string) {
  // If no value entered, ignore
  if (displayValue.value === '' || displayValue.value === '.') return
  if (displayValue.value === '0' && isNewEntry.value && pendingOperator.value === null) return

  if (!isNewEntry.value) {
    const current = parseFloat(displayValue.value)
    if (pendingOperator.value !== null) {
      compute(current)
    } else {
      accumulator.value = current
    }
    displayValue.value = accumulator.value.toString()
  }
  // else: isNewEntry means we already computed, just change operator

  pendingOperator.value = op
  isNewEntry.value = true
  updateExpression()
}

function compute(currentValue: number) {
  switch (pendingOperator.value) {
    case '+':
      accumulator.value += currentValue
      break
    case '-':
      accumulator.value -= currentValue
      break
    default:
      accumulator.value = currentValue
      break
  }
}

function onDelete() {
  if (isNewEntry.value) return
  if (displayValue.value.length <= 1 || (displayValue.value.startsWith('-') && displayValue.value.length <= 2)) {
    displayValue.value = '0'
  } else {
    displayValue.value = displayValue.value.slice(0, -1)
  }
  form.value.amount = displayValue.value
  updateExpression()
}

function onClear() {
  displayValue.value = '0'
  accumulator.value = 0
  pendingOperator.value = null
  isNewEntry.value = true
  expressionText.value = ''
  form.value.amount = ''
}

function updateExpression() {
  if (pendingOperator.value) {
    if (isNewEntry.value) {
      expressionText.value = `${accumulator.value} ${pendingOperator.value}`
    } else {
      expressionText.value = `${accumulator.value} ${pendingOperator.value} ${displayValue.value}`
    }
  } else if (accumulator.value !== 0) {
    expressionText.value = `= ${accumulator.value}`
  } else {
    expressionText.value = ''
  }
}

/** Calculate and return the final amount */
function computeFinalAmount(): number {
  if (pendingOperator.value !== null) {
    const current = parseFloat(displayValue.value)
    compute(current)
    pendingOperator.value = null
  }
  const result = accumulator.value || parseFloat(displayValue.value) || 0
  return result
}

// ===== Save =====
async function onSave() {
  errorMessage.value = ''

  // Compute final amount from calculator
  const finalAmount = computeFinalAmount()
  form.value.amount = finalAmount.toString()

  // Validate form
  const validation = validateBillForm({
    type: form.value.type,
    amount: form.value.amount,
    categoryCode: form.value.categoryCode,
    billDate: form.value.billDate,
  })

  if (!validation.valid) {
    errorMessage.value = validation.error || '请检查输入'
    return
  }

  try {
    const billStore = useBillStore()
    if (isEditMode.value) {
      await updateBill(billId.value, {
        type: form.value.type,
        amount: form.value.amount,
        categoryCode: form.value.categoryCode,
        billDate: form.value.billDate,
        remark: form.value.remark,
      })
    } else {
      await createBill({
        type: form.value.type,
        amount: form.value.amount,
        categoryCode: form.value.categoryCode,
        billDate: form.value.billDate,
        remark: form.value.remark,
      })
    }
    billStore.notifyBillChanged()
    navigateBack()
  } catch (err: any) {
    errorMessage.value = err.message || '保存失败，请重试'
  }
}

// ===== Delete =====
async function confirmDelete() {
  showDeleteConfirm.value = false
  try {
    await deleteBill(billId.value)
    useBillStore().notifyBillChanged()
    navigateBack()
  } catch (err: any) {
    errorMessage.value = err.message || '删除失败，请重试'
  }
}

// ===== Navigation =====
function handleBack() {
  if (isFormChanged() && form.value.amount && form.value.amount !== '0') {
    showBackConfirm.value = true
  } else {
    navigateBack()
  }
}

function confirmBack() {
  showBackConfirm.value = false
  navigateBack()
}

function navigateBack() {
  try {
    // @ts-ignore
    if (typeof wx !== 'undefined' && wx.navigateBack) {
      // @ts-ignore
      wx.navigateBack()
    } else {
      window.history.back()
    }
  } catch {
    window.history.back()
  }
}

// ===== Date Picker =====
function triggerDatePicker() {
  if (dateInputRef.value) {
    dateInputRef.value.showPicker ? dateInputRef.value.showPicker() : dateInputRef.value.click()
  }
}

function onDateChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.value) {
    form.value.billDate = target.value
    hasUnsavedChanges.value = true
  }
}

// ===== Remark =====
function onRemarkInput() {
  hasUnsavedChanges.value = true
}

// ===== Memos =====
async function loadMemos() {
  if (!form.value.type || !form.value.categoryCode) {
    memos.value = []
    return
  }
  try {
    memos.value = await listMemos({
      type: form.value.type,
      categoryCode: form.value.categoryCode,
    })
  } catch {
    memos.value = []
  }
}
</script>

<style scoped>
.bill-edit-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: v-bind('Colors.Background');
  position: relative;
}

/* ===== Nav Bar ===== */
.nav-bar {
  display: flex;
  align-items: center;
  padding: 12px v-bind('Spacing.PageMargin');
  background: v-bind('Colors.CardBg');
  border-bottom: 1px solid v-bind('Colors.Border');
  flex-shrink: 0;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: v-bind('Colors.TextPrimary');
  margin-left: -12px;
  flex-shrink: 0;
}

.back-btn:active {
  opacity: 0.6;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: v-bind('FontSize.H3');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  margin: 0;
}

/* ===== Scrollable Content ===== */
.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
  -webkit-overflow-scrolling: touch;
}

/* ===== Type Toggle ===== */
.type-toggle {
  display: flex;
  padding: v-bind('Spacing.Lg') v-bind('Spacing.PageMargin') 0;
  gap: 0;
  border-bottom: 1px solid v-bind('Colors.Border');
  background: v-bind('Colors.CardBg');
}

.type-tab {
  flex: 1;
  height: 44px;
  background: none;
  border: none;
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Regular');
  color: v-bind('Colors.TextTertiary');
  cursor: pointer;
  position: relative;
  transition: color v-bind('Duration.Fast') ease;
}

.type-tab.active {
  font-weight: v-bind('FontWeight.Bold');
}

.type-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  border-radius: 2px;
}

.type-tab.tab-expense.active {
  color: v-bind('Colors.Expense');
}

.type-tab.tab-expense.active::after {
  background: v-bind('Colors.Expense');
}

.type-tab.tab-income.active {
  color: v-bind('Colors.Income');
}

.type-tab.tab-income.active::after {
  background: v-bind('Colors.Income');
}

.type-tab:active {
  opacity: 0.7;
}

/* ===== Amount Display ===== */
.amount-section {
  background: v-bind('Colors.CardBg');
  padding: v-bind('Spacing.Xl2') v-bind('Spacing.PageMargin');
  text-align: center;
}

.amount-value {
  font-size: v-bind('FontSize.BillAmount');
  font-weight: v-bind('FontWeight.Bold');
  color: v-bind('Colors.TextPrimary');
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  transition: color v-bind('Duration.Fast') ease;
}

.amount-value.amount-placeholder {
  color: v-bind('Colors.TextTertiary');
}

.amount-expression {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextTertiary');
  margin-top: 8px;
  line-height: 1.4;
  min-height: 17px;
  font-variant-numeric: tabular-nums;
}

/* ===== Section ===== */
.section {
  background: v-bind('Colors.CardBg');
  margin-top: 12px;
  padding: v-bind('Spacing.Lg') v-bind('Spacing.PageMargin');
}

.section-title {
  font-size: v-bind('FontSize.BodySmall');
  font-weight: v-bind('FontWeight.Medium');
  color: v-bind('Colors.TextSecondary');
  margin-bottom: v-bind('Spacing.Md');
}

/* ===== Category Grid ===== */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 0;
  border-radius: v-bind('Radius.Md');
  transition: transform v-bind('Duration.Fast') ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.category-item:active {
  transform: scale(0.95);
}

.category-item.selected {
  transform: scale(1.05);
}

.category-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: v-bind('Radius.Lg');
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all v-bind('Duration.Normal') ease;
  flex-shrink: 0;
}

.category-item.selected .category-icon-wrapper {
  box-shadow: 0 0 0 2px currentColor;
}

.category-icon-char {
  font-size: 20px;
  font-weight: v-bind('FontWeight.Bold');
  line-height: 1;
}

.category-item-name {
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.TextPrimary');
  text-align: center;
  line-height: 1.3;
}

/* ===== Date Picker ===== */
.date-picker-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 0 v-bind('Spacing.Lg');
  background: v-bind('Colors.Background');
  border: 1px solid v-bind('Colors.Border');
  border-radius: v-bind('Radius.Md');
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextPrimary');
  cursor: pointer;
  transition: border-color v-bind('Duration.Fast') ease;
}

.date-picker-btn:active {
  border-color: v-bind('Colors.Primary');
}

.date-arrow {
  font-size: 10px;
  color: v-bind('Colors.TextTertiary');
  margin-left: 8px;
}

.date-input-hidden {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* ===== Remark Input ===== */
.remark-input {
  width: 100%;
  height: 44px;
  padding: 0 v-bind('Spacing.Lg');
  background: v-Bind('Colors.Background');
  border: 1px solid v-bind('Colors.Border');
  border-radius: v-bind('Radius.Md');
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextPrimary');
  outline: none;
  box-sizing: border-box;
  transition: border-color v-bind('Duration.Fast') ease;
}

.remark-input::placeholder {
  color: v-bind('Colors.TextTertiary');
}

.remark-input:focus {
  border-color: v-bind('Colors.Primary');
}

/* ===== Memo Chips ===== */
.memo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: v-bind('Spacing.Sm');
}

.memo-chip {
  display: inline-block;
  padding: 6px 14px;
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
  background: v-bind('Colors.Background');
  border: 1px solid v-bind('Colors.Border');
  border-radius: 50px;
  cursor: pointer;
  transition: all v-bind('Duration.Fast') ease;
  user-select: none;
}

.memo-chip:active {
  background: v-bind('Colors.PrimaryLight');
  border-color: v-bind('Colors.Primary');
  color: v-bind('Colors.Primary');
}

/* ===== Delete Section ===== */
.delete-section {
  padding: 24px v-bind('Spacing.PageMargin');
  text-align: center;
}

.delete-btn {
  background: none;
  border: none;
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.Error');
  cursor: pointer;
  padding: 12px 24px;
  min-height: 44px;
}

.delete-btn:active {
  opacity: 0.6;
}

/* ===== Calculator Keyboard ===== */
.keyboard {
  flex-shrink: 0;
  background: v-bind('Colors.CardBg');
  border-top: 1px solid v-bind('Colors.Border');
  padding: 8px v-bind('Spacing.PageMargin') env(safe-area-inset-bottom, 8px);
}

.keyboard-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.keyboard-row:last-child {
  margin-bottom: 0;
}

.key {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: v-bind('Radius.Md');
  font-size: 20px;
  font-weight: v-bind('FontWeight.Medium');
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all v-bind('Duration.Instant') ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.key:active {
  transform: scale(0.95);
  opacity: 0.85;
}

.key-number {
  background: v-bind('Colors.Background');
  color: v-bind('Colors.TextPrimary');
}

.key-operator {
  background: v-bind('Colors.Background');
  color: v-bind('Colors.TextPrimary');
}

.key-delete {
  background: v-bind('Colors.Background');
  color: v-bind('Colors.TextPrimary');
  font-size: 18px;
}

.key-clear {
  background: v-bind('Colors.Background');
  color: v-bind('Colors.Error');
  font-weight: v-bind('FontWeight.SemiBold');
}

.key-save {
  flex: 2;
  background: v-bind('Colors.Primary');
  color: #FFFFFF;
  font-size: 22px;
  font-weight: v-bind('FontWeight.Bold');
}

.key-save:active {
  background: v-bind('Colors.PrimaryDark');
}

/* ===== Error Toast ===== */
.error-toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.95);
  color: #FFFFFF;
  font-size: v-bind('FontSize.BodySmall');
  padding: 10px 20px;
  border-radius: v-bind('Radius.Md');
  z-index: 999;
  animation: toastIn v-bind('Duration.Normal') ease-out;
  max-width: 85vw;
  text-align: center;
  pointer-events: none;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .category-item,
  .category-item.selected,
  .key,
  .error-toast {
    animation: none;
    transition: none;
  }
}
</style>
