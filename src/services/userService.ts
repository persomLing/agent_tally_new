import { callFunctionWithData } from './cloud'
import type { UserProfile } from '@/types'

export async function login(): Promise<UserProfile> {
  return callFunctionWithData<UserProfile>('login')
}

export async function saveUserProfile(data: {
  nickName: string
  avatarUrl: string
}): Promise<UserProfile> {
  return callFunctionWithData<UserProfile>('saveUserProfile', data)
}
