<template>
  <Transition name="memo">
    <div v-if="visible" class="memo-modal-overlay" @click.self="onClose">
      <div class="memo-modal" role="dialog" aria-modal="true" aria-label="记忆库">
        <!-- Header -->
        <div class="memo-modal-header">
          <h2 class="memo-modal-title">记忆库</h2>
          <button class="memo-modal-close-btn" @click="onClose" aria-label="关闭">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Type Toggle -->
        <div class="memo-modal-tabs">
          <button
            v-for="tab in typeTabs"
            :key="tab.value"
            class="memo-modal-tab"
            :class="{ active: currentType === tab.value }"
            @click="switchType(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Body -->
        <div class="memo-modal-body">
          <div v-if="loading" class="memo-modal-loading">加载中...</div>

          <template v-else-if="groupedCategories.length > 0">
            <div
              v-for="cat in groupedCategories"
              :key="cat.code"
              class="memo-category"
            >
              <!-- Category Header -->
              <button
                class="memo-category-header"
                @click="toggleCategory(cat.code)"
                :aria-expanded="isExpanded(cat.code)"
              >
                <span class="memo-category-arrow" :class="{ expanded: isExpanded(cat.code) }">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
                <span class="memo-category-name">{{ cat.name }}</span>
              </button>

              <!-- Category Body -->
              <div v-show="isExpanded(cat.code)" class="memo-category-body">
                <!-- Memo Items -->
                <div v-for="memo in cat.memos" :key="memo._id" class="memo-item" :class="{ 'memo-item-editing': editingId === memo._id }">
                  <!-- Inline Edit Mode -->
                  <div v-if="editingId === memo._id" class="memo-inline-edit">
                    <input
                      v-model="editContent"
                      class="memo-inline-input"
                      :class="{ 'memo-inline-input-error': editError }"
                      placeholder="输入备注内容"
                      maxlength="200"
                      @keyup.enter="saveEdit(memo)"
                    />
                    <p v-if="editError" class="memo-inline-error">{{ editError }}</p>
                    <div class="memo-inline-actions">
                      <button class="memo-inline-btn memo-inline-btn-cancel" @click="cancelEdit">取消</button>
                      <button class="memo-inline-btn memo-inline-btn-save" @click="saveEdit(memo)">保存</button>
                    </div>
                  </div>

                  <!-- Display Mode -->
                  <div v-else class="memo-item-display">
                    <span class="memo-item-text">{{ memo.content }}</span>
                    <div class="memo-item-actions">
                      <button class="memo-item-action-btn" @click="startEdit(memo)" aria-label="编辑">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button class="memo-item-action-btn memo-item-action-btn-delete" @click="confirmDelete(memo)" aria-label="删除">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Add New Memo -->
                <div v-if="addingCategory === cat.code" class="memo-inline-edit">
                  <input
                    v-model="newContent"
                    class="memo-inline-input"
                    :class="{ 'memo-inline-input-error': addError }"
                    placeholder="输入新备注"
                    maxlength="200"
                    @keyup.enter="saveNew(cat.code, cat.name)"
                  />
                  <p v-if="addError" class="memo-inline-error">{{ addError }}</p>
                  <div class="memo-inline-actions">
                    <button class="memo-inline-btn memo-inline-btn-cancel" @click="cancelAdd">取消</button>
                    <button class="memo-inline-btn memo-inline-btn-save" @click="saveNew(cat.code, cat.name)">保存</button>
                  </div>
                </div>
                <button v-else class="memo-add-btn" @click="startAdd(cat.code)">
                  + 新增备注
                </button>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div v-else class="memo-empty">
            <EmptyState text="暂无常用备注" />
          </div>
        </div>
      </div>

      <!-- Delete Confirm Dialog -->
      <ConfirmDialog
        :visible="confirmVisible"
        title="删除备注"
        :message="deleteMessage"
        confirmText="删除"
        :danger="true"
        @confirm="doDelete"
        @cancel="confirmVisible = false"
        @update:visible="confirmVisible = $event"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { listMemos, createMemo, updateMemo, deleteMemo } from '@/services/memoService'
import { getCategoriesByType } from '@/constants/categories'
import { validateMemoContent } from '@/utils/validator'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { Colors, Radius, FontSize, FontWeight, Spacing, Duration, ComponentSize, Shadow } from '@/constants/design-tokens'
import type { Memo, BillType } from '@/types'

const props = withDefaults(defineProps<{
  visible: boolean
  type?: BillType
}>(), {
  type: 'expense',
})

const emit = defineEmits<{
  close: []
  'update:visible': [value: boolean]
}>()

// ===== State =====
const currentType = ref<BillType>(props.type)
const memos = ref<Memo[]>([])
const loading = ref(false)
const expandedCategories = ref<string[]>([])
const editingId = ref<string | null>(null)
const editContent = ref('')
const editError = ref('')
const addingCategory = ref<string | null>(null)
const newContent = ref('')
const addError = ref('')
const confirmVisible = ref(false)
const deletingMemo = ref<Memo | null>(null)

const typeTabs = [
  { label: '支出', value: 'expense' as BillType },
  { label: '收入', value: 'income' as BillType },
]

// ===== Computed =====
interface CategoryGroup {
  code: string
  name: string
  memos: Memo[]
}

const groupedCategories = computed<CategoryGroup[]>(() => {
  const categories = getCategoriesByType(currentType.value)
  return categories.map((cat) => ({
    code: cat.code,
    name: cat.name,
    memos: memos.value.filter((m) => m.categoryCode === cat.code),
  }))
})

const deleteMessage = computed(() => {
  return `确定删除「${deletingMemo.value?.content || ''}」吗？`
})

// ===== Methods =====

function onClose() {
  resetEditing()
  emit('close')
  emit('update:visible', false)
}

function expandAllCategories() {
  const categories = getCategoriesByType(currentType.value)
  expandedCategories.value = categories.map((c) => c.code)
}

async function loadMemos() {
  loading.value = true
  try {
    memos.value = await listMemos({ type: currentType.value })
    expandAllCategories()
  } catch {
    memos.value = []
  } finally {
    loading.value = false
  }
}

function switchType(type: BillType) {
  if (type === currentType.value) return
  currentType.value = type
  loadMemos()
}

function isExpanded(code: string): boolean {
  return expandedCategories.value.includes(code)
}

function toggleCategory(code: string) {
  const idx = expandedCategories.value.indexOf(code)
  if (idx >= 0) {
    expandedCategories.value.splice(idx, 1)
  } else {
    expandedCategories.value.push(code)
  }
}

// ===== Editing =====

function resetEditing() {
  editingId.value = null
  editContent.value = ''
  editError.value = ''
  addingCategory.value = null
  newContent.value = ''
  addError.value = ''
}

function startEdit(memo: Memo) {
  resetEditing()
  editingId.value = memo._id!
  editContent.value = memo.content
}

function cancelEdit() {
  editingId.value = null
  editContent.value = ''
  editError.value = ''
}

async function saveEdit(memo: Memo) {
  const validation = validateMemoContent(editContent.value)
  if (!validation.valid) {
    editError.value = validation.error || '备注内容无效'
    return
  }
  editError.value = ''
  try {
    await updateMemo(memo._id!, editContent.value.trim())
    // Update local state
    const target = memos.value.find((m) => m._id === memo._id)
    if (target) {
      target.content = editContent.value.trim()
    }
    resetEditing()
  } catch {
    editError.value = '保存失败，请重试'
  }
}

function startAdd(categoryCode: string) {
  resetEditing()
  addingCategory.value = categoryCode
}

function cancelAdd() {
  addingCategory.value = null
  newContent.value = ''
  addError.value = ''
}

async function saveNew(categoryCode: string, categoryName: string) {
  const validation = validateMemoContent(newContent.value)
  if (!validation.valid) {
    addError.value = validation.error || '备注内容无效'
    return
  }
  addError.value = ''
  try {
    const memoId = await createMemo({
      type: currentType.value,
      categoryCode,
      content: newContent.value.trim(),
    })
    // Refresh memos to get the latest list (handles dedup and limit)
    await loadMemos()
    resetEditing()
  } catch {
    addError.value = '保存失败，请重试'
  }
}

function confirmDelete(memo: Memo) {
  deletingMemo.value = memo
  confirmVisible.value = true
}

async function doDelete() {
  if (!deletingMemo.value?._id) return
  try {
    await deleteMemo(deletingMemo.value._id)
    // Remove from local state
    const idx = memos.value.findIndex((m) => m._id === deletingMemo.value!._id)
    if (idx >= 0) {
      memos.value.splice(idx, 1)
    }
  } catch {
    // Silently fail — error is already shown by the service
  } finally {
    confirmVisible.value = false
    deletingMemo.value = null
  }
}

// ===== Watchers =====

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      currentType.value = props.type
      loadMemos()
    } else {
      resetEditing()
    }
  },
)
</script>

<style scoped>
/* ===== Overlay ===== */
.memo-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

/* ===== Modal Panel ===== */
.memo-modal {
  background: v-bind('Colors.CardBg');
  border-radius: v-bind('Radius.Xl') v-bind('Radius.Xl') 0 0;
  width: 100%;
  max-width: 428px;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  box-shadow: v-bind('Shadow.Xl');
}

/* ===== Header ===== */
.memo-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: v-bind('Spacing.Lg') v-bind('Spacing.Xl');
  border-bottom: 1px solid v-bind('Colors.Border');
  flex-shrink: 0;
}

.memo-modal-title {
  font-size: v-bind('FontSize.H3');
  font-weight: v-bind('FontWeight.SemiBold');
  color: v-bind('Colors.TextPrimary');
  margin: 0;
}

.memo-modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: v-bind('Colors.TextTertiary');
  cursor: pointer;
  border-radius: v-bind('Radius.Full');
  transition: background v-bind('Duration.Instant') ease;
  -webkit-tap-highlight-color: transparent;
}

.memo-modal-close-btn:active {
  background: v-bind('Colors.Background');
}

/* ===== Type Tabs ===== */
.memo-modal-tabs {
  display: flex;
  padding: v-bind('Spacing.Sm') v-bind('Spacing.Xl');
  gap: 0;
  border-bottom: 1px solid v-bind('Colors.Border');
  flex-shrink: 0;
}

.memo-modal-tab {
  flex: 1;
  height: v-bind('ComponentSize.ButtonMinHeight');
  border: none;
  background: transparent;
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Medium');
  color: v-bind('Colors.TextTertiary');
  cursor: pointer;
  position: relative;
  transition: color v-bind('Duration.Instant') ease;
  -webkit-tap-highlight-color: transparent;
}

.memo-modal-tab.active {
  color: v-bind('Colors.Primary');
  font-weight: v-bind('FontWeight.SemiBold');
}

.memo-modal-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: v-bind('Colors.Primary');
  border-radius: 2px;
}

/* ===== Body ===== */
.memo-modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 0 v-bind('Spacing.Xl2');
}

.memo-modal-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: v-bind('Spacing.Xl3') 0;
  color: v-bind('Colors.TextTertiary');
  font-size: v-bind('FontSize.Body');
}

/* ===== Category Group ===== */
.memo-category {
  border-bottom: 1px solid v-bind('Colors.Border');
}

.memo-category:last-child {
  border-bottom: none;
}

.memo-category-header {
  display: flex;
  align-items: center;
  width: 100%;
  padding: v-bind('Spacing.Md') v-bind('Spacing.Xl');
  border: none;
  background: transparent;
  cursor: pointer;
  gap: v-bind('Spacing.Sm');
  transition: background v-bind('Duration.Instant') ease;
  -webkit-tap-highlight-color: transparent;
  min-height: v-bind('ComponentSize.ListItemHeight');
}

.memo-category-header:active {
  background: v-bind('Colors.Background');
}

.memo-category-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: v-bind('Colors.TextTertiary');
  transition: transform v-bind('Duration.Fast') ease;
  flex-shrink: 0;
}

.memo-category-arrow.expanded {
  transform: rotate(90deg);
}

.memo-category-name {
  font-size: v-bind('FontSize.Body');
  font-weight: v-bind('FontWeight.Medium');
  color: v-bind('Colors.TextPrimary');
}

.memo-category-body {
  padding: 0 v-bind('Spacing.Xl') v-bind('Spacing.Sm');
}

/* ===== Memo Item ===== */
.memo-item {
  padding: v-bind('Spacing.Sm') 0;
}

.memo-item-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: v-bind('Spacing.Sm');
}

.memo-item-text {
  flex: 1;
  font-size: v-bind('FontSize.BodySmall');
  color: v-bind('Colors.TextSecondary');
  line-height: 1.5;
  word-break: break-word;
}

.memo-item-actions {
  display: flex;
  gap: v-bind('Spacing.Xs');
  flex-shrink: 0;
}

.memo-item-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: v-bind('Colors.TextTertiary');
  cursor: pointer;
  border-radius: v-bind('Radius.Md');
  transition: background v-bind('Duration.Instant') ease, color v-bind('Duration.Instant') ease;
  -webkit-tap-highlight-color: transparent;
}

.memo-item-action-btn:active {
  background: v-bind('Colors.Background');
}

.memo-item-action-btn-delete:active {
  color: v-bind('Colors.Error');
}

/* ===== Inline Edit ===== */
.memo-inline-edit {
  padding: v-bind('Spacing.Sm') 0;
}

.memo-inline-input {
  width: 100%;
  height: 44px;
  padding: 0 v-bind('Spacing.Md');
  border: 1px solid v-bind('Colors.Border');
  border-radius: v-bind('Radius.Md');
  font-size: v-bind('FontSize.Body');
  color: v-bind('Colors.TextPrimary');
  background: v-bind('Colors.Background');
  outline: none;
  box-sizing: border-box;
  transition: border-color v-bind('Duration.Instant') ease;
}

.memo-inline-input:focus {
  border-color: v-bind('Colors.Primary');
}

.memo-inline-input-error {
  border-color: v-bind('Colors.Error');
}

.memo-inline-error {
  margin: v-bind('Spacing.Xs') 0 0;
  font-size: v-bind('FontSize.Caption');
  color: v-bind('Colors.Error');
}

.memo-inline-actions {
  display: flex;
  gap: v-bind('Spacing.Sm');
  justify-content: flex-end;
  margin-top: v-bind('Spacing.Sm');
}

.memo-inline-btn {
  height: 36px;
  padding: 0 v-bind('Spacing.Lg');
  border: none;
  border-radius: v-bind('Radius.Md');
  font-size: v-bind('FontSize.BodySmall');
  font-weight: v-bind('FontWeight.Medium');
  cursor: pointer;
  transition: opacity v-bind('Duration.Instant') ease;
  -webkit-tap-highlight-color: transparent;
  min-width: 60px;
}

.memo-inline-btn:active {
  opacity: 0.7;
}

.memo-inline-btn-cancel {
  background: v-bind('Colors.Background');
  color: v-bind('Colors.TextSecondary');
}

.memo-inline-btn-save {
  background: v-bind('Colors.Primary');
  color: #fff;
}

/* ===== Add New Memo Button ===== */
.memo-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  margin-top: v-bind('Spacing.Sm');
  border: 1px dashed v-bind('Colors.Border');
  border-radius: v-bind('Radius.Md');
  background: transparent;
  color: v-bind('Colors.TextTertiary');
  font-size: v-bind('FontSize.BodySmall');
  cursor: pointer;
  transition: border-color v-bind('Duration.Instant') ease, color v-bind('Duration.Instant') ease;
  -webkit-tap-highlight-color: transparent;
}

.memo-add-btn:active {
  border-color: v-bind('Colors.Primary');
  color: v-bind('Colors.Primary');
}

/* ===== Empty State ===== */
.memo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== Transitions ===== */
.memo-enter-active {
  transition: opacity 200ms ease-out;
}
.memo-leave-active {
  transition: opacity 150ms ease-in;
}
.memo-enter-from,
.memo-leave-to {
  opacity: 0;
}

.memo-enter-active .memo-modal {
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.memo-leave-active .memo-modal {
  transition: transform 200ms ease-in;
}
.memo-enter-from .memo-modal,
.memo-leave-to .memo-modal {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .memo-enter-active,
  .memo-leave-active,
  .memo-enter-active .memo-modal,
  .memo-leave-active .memo-modal {
    transition: none;
  }
  .memo-enter-from,
  .memo-leave-to {
    opacity: 1;
  }
  .memo-enter-from .memo-modal,
  .memo-leave-to .memo-modal {
    transform: none;
  }
}
</style>
