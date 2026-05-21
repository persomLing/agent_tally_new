/**
 * 授权页面路由配置
 *
 * 适用于 Vue Router 或 uni-app 等路由框架。
 * 使用方式：
 *   import authRoute from '@/pages/auth'
 *   router.addRoute(authRoute)
 *
 * 或在 uni-app 的 pages.json 中注册：
 *   { "path": "pages/auth/index", "style": { "navigationBarTitleText": "授权" } }
 */
import type { RouteRecordRaw } from 'vue-router'

const authRoute: RouteRecordRaw = {
  path: '/pages/auth/index',
  name: 'auth',
  component: () => import('./index.vue'),
  meta: {
    title: '授权登录',
    requiresAuth: false,
  },
}

export default authRoute
