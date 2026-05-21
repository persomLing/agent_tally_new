import { callFunctionWithData, callCloudFunction } from './cloud'
import type { Memo } from '@/types'

export async function listMemos(params: {
  type: 'expense' | 'income'
  categoryCode?: string
}): Promise<Memo[]> {
  return callFunctionWithData<Memo[]>('listMemos', params)
}

export async function createMemo(data: {
  type: 'expense' | 'income'
  categoryCode: string
  content: string
}): Promise<string> {
  return callFunctionWithData<string>('createMemo', data)
}

export async function updateMemo(id: string, content: string): Promise<void> {
  await callFunctionWithData<void>('updateMemo', { id, content })
}

export async function deleteMemo(id: string): Promise<void> {
  await callFunctionWithData<void>('deleteMemo', { id })
}
