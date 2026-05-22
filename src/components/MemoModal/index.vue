<template>
  <!-- 底部弹出遮罩 -->
  <view v-if="visible" class="memo-overlay" @click="onClose">
    <view class="memo-panel" @click.stop>
      <!-- Header -->
      <view class="memo-header">
        <text class="memo-title">记忆库</text>
        <view class="memo-close" @click="onClose">✕</view>
      </view>

      <!-- Type Tabs -->
      <view class="memo-tabs">
        <view
          v-for="(tab, i) in typeTabs" :key="tab.value"
          class="memo-tab"
          :class="{ 'memo-tab-active': currentType === tab.value }"
          @click="switchType(tab.value)"
        >{{ tab.label }}</view>
      </view>

      <!-- Body -->
      <scroll-view scroll-y class="memo-body">
        <view v-if="loading" class="memo-loading"><text>加载中...</text></view>

        <template v-else>
          <view v-if="groupedCategories.every(c => c.memos.length === 0 && addingCategory !== c.code)" class="memo-empty">
            <text class="memo-empty-text">暂无常用备注</text>
          </view>
          <view v-for="cat in groupedCategories" :key="cat.code" class="memo-category">
            <view class="memo-cat-header" @click="toggleCategory(cat.code)">
              <text class="memo-cat-arrow" :class="{ expanded: isExpanded(cat.code) }">›</text>
              <text class="memo-cat-name">{{ cat.name }}</text>
              <text class="memo-cat-count" v-if="cat.memos.length">({{ cat.memos.length }})</text>
            </view>

            <view v-show="isExpanded(cat.code)" class="memo-cat-body">
              <view v-for="memo in cat.memos" :key="memo._id" class="memo-item">
                <!-- Edit mode -->
                <view v-if="editingId === memo._id" class="memo-edit-wrap">
                  <input
                    class="memo-input"
                    :class="{ 'memo-input-error': editError }"
                    v-model="editContent"
                    placeholder="输入备注内容"
                    maxlength="200"
                  />
                  <text v-if="editError" class="memo-err">{{ editError }}</text>
                  <view class="memo-edit-btns">
                    <view class="memo-btn memo-btn-cancel" @click="cancelEdit">取消</view>
                    <view class="memo-btn memo-btn-save" @click="saveEdit(memo)">保存</view>
                  </view>
                </view>
                <!-- Display mode -->
                <view v-else class="memo-item-row">
                  <text class="memo-item-text" @click="selectMemo(memo)">{{ memo.content }}</text>
                  <view class="memo-item-actions">
                    <view class="memo-action-btn" @click="startEdit(memo)">✎</view>
                    <view class="memo-action-btn memo-action-del" @click="confirmDelete(memo)">✕</view>
                  </view>
                </view>
              </view>

              <!-- Add new -->
              <view v-if="addingCategory === cat.code" class="memo-edit-wrap">
                <input
                  class="memo-input"
                  :class="{ 'memo-input-error': addError }"
                  v-model="newContent"
                  placeholder="输入新备注"
                  maxlength="200"
                />
                <text v-if="addError" class="memo-err">{{ addError }}</text>
                <view class="memo-edit-btns">
                  <view class="memo-btn memo-btn-cancel" @click="cancelAdd">取消</view>
                  <view class="memo-btn memo-btn-save" @click="saveNew(cat.code)">保存</view>
                </view>
              </view>
              <view v-else class="memo-add-btn" @click="startAdd(cat.code)">
                <text class="memo-add-text">+ 新增备注</text>
              </view>
            </view>
          </view>
        </template>
      </scroll-view>
    </view>

    <!-- Delete Confirm -->
    <ConfirmDialog
      :visible="confirmVisible"
      title="删除备注"
      :message="`确定删除「${deletingMemo?.content || ''}」吗？`"
      confirmText="删除"
      :danger="true"
      @confirm="doDelete"
      @cancel="confirmVisible = false"
      @update:visible="confirmVisible = $event"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { listMemos, createMemo, updateMemo, deleteMemo } from '@/services/memoService'
import { getCategoriesByType } from '@/constants/categories'
import { validateMemoContent } from '@/utils/validator'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import type { Memo, BillType } from '@/types'

const props = withDefaults(defineProps<{
  visible: boolean
  type?: BillType
}>(), { type: 'expense' })

const emit = defineEmits<{
  close: []
  select: [content: string]
  'update:visible': [value: boolean]
}>()

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

interface CategoryGroup { code: string; name: string; memos: Memo[] }

const groupedCategories = computed<CategoryGroup[]>(() =>
  getCategoriesByType(currentType.value).map((cat) => ({
    code: cat.code,
    name: cat.name,
    memos: memos.value.filter((m) => m.categoryCode === cat.code),
  }))
)

function selectMemo(memo: Memo) { emit('select', memo.content) }

function onClose() {
  resetEditing()
  emit('close')
  emit('update:visible', false)
}

async function loadMemos() {
  loading.value = true
  try {
    memos.value = await listMemos({ type: currentType.value })
    expandedCategories.value = getCategoriesByType(currentType.value).map((c) => c.code)
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

function isExpanded(code: string) { return expandedCategories.value.includes(code) }

function toggleCategory(code: string) {
  const idx = expandedCategories.value.indexOf(code)
  if (idx >= 0) expandedCategories.value.splice(idx, 1)
  else expandedCategories.value.push(code)
}

function resetEditing() {
  editingId.value = null; editContent.value = ''; editError.value = ''
  addingCategory.value = null; newContent.value = ''; addError.value = ''
}

function startEdit(memo: Memo) { resetEditing(); editingId.value = memo._id!; editContent.value = memo.content }
function cancelEdit() { editingId.value = null; editContent.value = ''; editError.value = '' }

async function saveEdit(memo: Memo) {
  const v = validateMemoContent(editContent.value)
  if (!v.valid) { editError.value = v.error || '备注内容无效'; return }
  editError.value = ''
  try {
    await updateMemo(memo._id!, editContent.value.trim())
    const t = memos.value.find((m) => m._id === memo._id)
    if (t) t.content = editContent.value.trim()
    resetEditing()
  } catch { editError.value = '保存失败，请重试' }
}

function startAdd(code: string) { resetEditing(); addingCategory.value = code }
function cancelAdd() { addingCategory.value = null; newContent.value = ''; addError.value = '' }

async function saveNew(categoryCode: string) {
  const v = validateMemoContent(newContent.value)
  if (!v.valid) { addError.value = v.error || '备注内容无效'; return }
  addError.value = ''
  try {
    await createMemo({ type: currentType.value, categoryCode, content: newContent.value.trim() })
    await loadMemos()
    resetEditing()
  } catch { addError.value = '保存失败，请重试' }
}

function confirmDelete(memo: Memo) { deletingMemo.value = memo; confirmVisible.value = true }

async function doDelete() {
  if (!deletingMemo.value?._id) return
  try {
    await deleteMemo(deletingMemo.value._id)
    const idx = memos.value.findIndex((m) => m._id === deletingMemo.value!._id)
    if (idx >= 0) memos.value.splice(idx, 1)
  } catch {} finally {
    confirmVisible.value = false; deletingMemo.value = null
  }
}

watch(() => props.visible, (val) => {
  if (val) { currentType.value = props.type; loadMemos() }
  else resetEditing()
})
</script>

<style scoped>
.memo-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex; flex-direction: column; justify-content: flex-end;
}
.memo-panel {
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 75vh;
  display: flex; flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.memo-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}
.memo-title { font-size: 16px; font-weight: 600; color: #1e293b; }
.memo-close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: #94a3b8;
}
.memo-tabs {
  display: flex; flex-shrink: 0;
  border-bottom: 1px solid #f1f5f9;
}
.memo-tab {
  flex: 1; height: 40px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #94a3b8; font-weight: 500;
  position: relative;
}
.memo-tab-active {
  color: #3b82f6; font-weight: 600;
}
.memo-tab-active::after {
  content: '';
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 24px; height: 2px; background: #3b82f6; border-radius: 2px;
}
.memo-body { flex: 1; overflow-y: auto; }
.memo-loading { padding: 40px; text-align: center; color: #94a3b8; font-size: 14px; }
.memo-empty { padding: 40px; text-align: center; }
.memo-empty-text { font-size: 14px; color: #94a3b8; }
.memo-category { border-bottom: 1px solid #f8fafc; }
.memo-cat-header {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 20px; min-height: 44px;
}
.memo-cat-arrow {
  font-size: 18px; color: #94a3b8; line-height: 1;
  transition: transform 0.2s;
  display: inline-block;
}
.memo-cat-arrow.expanded { transform: rotate(90deg); }
.memo-cat-name { font-size: 14px; font-weight: 500; color: #1e293b; flex: 1; }
.memo-cat-count { font-size: 12px; color: #94a3b8; }
.memo-cat-body { padding: 0 20px 8px; }
.memo-item { padding: 4px 0; }
.memo-item-row { display: flex; align-items: center; justify-content: space-between; min-height: 36px; }
.memo-item-text { flex: 1; font-size: 13px; color: #475569; line-height: 1.5; padding: 4px 0; }
.memo-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.memo-action-btn {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; color: #94a3b8;
}
.memo-action-del:active { color: #ef4444; }
.memo-edit-wrap { padding: 6px 0; }
.memo-input {
  width: 100%; height: 40px; padding: 0 12px;
  border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; color: #1e293b; background: #f8fafc;
  box-sizing: border-box;
}
.memo-input-error { border-color: #ef4444; }
.memo-err { display: block; font-size: 12px; color: #ef4444; margin-top: 4px; }
.memo-edit-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.memo-btn {
  height: 32px; padding: 0 16px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; font-size: 13px; font-weight: 500;
}
.memo-btn-cancel { background: #f1f5f9; color: #64748b; }
.memo-btn-save { background: #3b82f6; color: #fff; }
.memo-add-btn {
  height: 36px; margin-top: 4px;
  display: flex; align-items: center; justify-content: center;
  border: 1px dashed #e2e8f0; border-radius: 8px;
}
.memo-add-text { font-size: 13px; color: #94a3b8; }
</style>
