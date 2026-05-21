import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useBillStore } from '@/stores/billStore'
import { __registerMock, __clearMocks } from '@/services/cloud'

describe('userStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    __clearMocks()
  })

  describe('checkAuth', () => {
    it('returns true when user is authorized', async () => {
      __registerMock('login', () => ({
        success: true,
        data: { openid: 'openid123', nickName: 'Test', avatarUrl: '', authorized: true },
      }))
      const store = useUserStore()
      const result = await store.checkAuth()
      expect(result).toBe(true)
      expect(store.isLoggedIn).toBe(true)
      expect(store.profile?.openid).toBe('openid123')
    })

    it('returns false when user is not authorized', async () => {
      __registerMock('login', () => ({
        success: true,
        data: { openid: 'openid123', nickName: '', avatarUrl: '', authorized: false },
      }))
      const store = useUserStore()
      const result = await store.checkAuth()
      expect(result).toBe(false)
      expect(store.isLoggedIn).toBe(false)
    })

    it('returns false on API failure', async () => {
      __registerMock('login', () => ({ success: false, errorCode: 'SERVICE_ERROR' }))
      const store = useUserStore()
      const result = await store.checkAuth()
      expect(result).toBe(false)
    })
  })

  describe('authorize', () => {
    it('updates profile on success', async () => {
      __registerMock('saveUserProfile', (params) => ({
        success: true,
        data: {
          openid: 'openid123',
          nickName: params.nickName,
          avatarUrl: params.avatarUrl,
          authorized: true,
        },
      }))
      const store = useUserStore()
      const result = await store.authorize({ nickName: 'TestUser', avatarUrl: 'https://example.com/avatar.png' })
      expect(result).toBe(true)
      expect(store.isLoggedIn).toBe(true)
      expect(store.nickName).toBe('TestUser')
      expect(store.avatarUrl).toBe('https://example.com/avatar.png')
    })

    it('returns false on save failure', async () => {
      __registerMock('saveUserProfile', () => ({ success: false, errorCode: 'AUTH_FAILED' }))
      const store = useUserStore()
      const result = await store.authorize({ nickName: 'Test', avatarUrl: '' })
      expect(result).toBe(false)
      expect(store.isLoggedIn).toBe(false)
    })
  })
})

describe('billStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with refreshKey 0', () => {
    const store = useBillStore()
    expect(store.refreshKey).toBe(0)
  })

  it('notifyBillChanged increments refreshKey', () => {
    const store = useBillStore()
    store.notifyBillChanged()
    expect(store.refreshKey).toBe(1)
    store.notifyBillChanged()
    expect(store.refreshKey).toBe(2)
  })
})
