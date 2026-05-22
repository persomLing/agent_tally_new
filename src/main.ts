import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import uv from '@climblee/uv-ui'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(uv)
  return { app }
}
