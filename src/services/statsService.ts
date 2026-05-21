import { callFunctionWithData } from './cloud'
import type { StatisticsData } from '@/types'

export async function getStatistics(month: string): Promise<StatisticsData> {
  return callFunctionWithData<StatisticsData>('getStatistics', { month })
}
