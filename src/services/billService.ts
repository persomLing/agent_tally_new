import { callFunctionWithData, callCloudFunction } from './cloud'
import type { Bill, BillFormData, CloudResult } from '@/types'

export interface BillListResult {
  bills: Bill[]
  monthIncome: number
  monthExpense: number
  total: number
  hasMore: boolean
}

export async function createBill(data: BillFormData): Promise<string> {
  return callFunctionWithData<string>('createBill', data)
}

export async function updateBill(id: string, data: Partial<BillFormData>): Promise<void> {
  await callFunctionWithData<void>('updateBill', { id, ...data })
}

export async function deleteBill(id: string): Promise<void> {
  await callFunctionWithData<void>('deleteBill', { id })
}

export async function getBillById(id: string): Promise<Bill> {
  return callFunctionWithData<Bill>('getBillById', { id })
}

export async function listBillsByMonth(month: string, page = 1, pageSize = 20): Promise<BillListResult> {
  return callFunctionWithData<BillListResult>('listBillsByMonth', { month, page, pageSize })
}
