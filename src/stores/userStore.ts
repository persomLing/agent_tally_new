import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '@/types'
import { login as loginApi, saveUserProfile as saveProfileApi } from '@/services/userService'

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(false)
  const isChecking = ref(true)

  const isLoggedIn = computed(() => profile.value?.authorized === true)
  const nickName = computed(() => profile.value?.nickName ?? '')
  const avatarUrl = computed(() => profile.value?.avatarUrl ?? '')

  /** Check auth state on app start */
  async function checkAuth(): Promise<boolean> {
    isChecking.value = true
    try {
      const result = await loginApi()
      profile.value = result
      return result.authorized === true
    } catch {
      return false
    } finally {
      isChecking.value = false
    }
  }

  /** Complete user authorization */
  async function authorize(data: { nickName: string; avatarUrl: string }): Promise<boolean> {
    isLoading.value = true
    try {
      const result = await saveProfileApi(data)
      profile.value = result
      return true
    } catch {
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { profile, isLoading, isChecking, isLoggedIn, nickName, avatarUrl, checkAuth, authorize }
})
