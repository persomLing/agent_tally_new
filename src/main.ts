import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// Note: In a real WeChat Mini Program, routing would use WeChat's page router.
// This project's routing structure follows the conventions from doc/high-level-design.md §5.1
