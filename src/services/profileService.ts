/**
 * Profile service — calls cloud functions for the profile module
 */

import { callFunctionWithData, callCloudFunction } from './cloud'
import type { ProfileSummary, CloudResult } from '@/types'

/**
 * Fetch profile summary data (user info, persist days, budget progress, etc.)
 */
export async function getProfileSummary(): Promise<ProfileSummary> {
  return callFunctionWithData<ProfileSummary>('getProfileSummary')
}

/**
 * Clear all bills for the current user
 * Returns the number of deleted records
 */
export async function clearAllBills(): Promise<{ deletedCount: number }> {
  return callFunctionWithData<{ deletedCount: number }>('clearBills')
}
