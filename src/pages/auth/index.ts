/**
 * 授权页面路由配置
 *
 * 在 uni-app 中通过 pages.json 注册此页面：
 *   { "path": "pages/auth/index", "style": { "navigationBarTitleText": "授权登录" } }
 */
export default {
  path: '/pages/auth/index',
  name: 'auth',
  meta: {
    title: '授权登录',
    requiresAuth: false,
  },
}
