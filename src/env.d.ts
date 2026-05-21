/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// WeChat Mini-Program globals (uni-app)
declare const wx: {
  login(options: { success: (res: { code: string }) => void; fail?: (err: any) => void }): void
  getUserProfile(options: { desc: string; success: (res: any) => void; fail?: (err: any) => void }): void
  cloud?: { callFunction(options: { name: string; data?: any }): Promise<any> }
}

declare const uni: {
  showToast(options: { title: string; icon?: 'success' | 'none' | 'error'; duration?: number }): void
  showLoading(options: { title: string; mask?: boolean }): void
  hideLoading(): void
  showModal(options: { title: string; content: string; success: (res: { confirm: boolean }) => void }): void
  navigateTo(options: { url: string }): void
  switchTab(options: { url: string }): void
  request(options: { url: string; method?: string; data?: any; header?: any; success: (res: any) => void; fail?: (err: any) => void }): void
}
