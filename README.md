# agent_tally_new

    Vite 会启动本地开发服务器，浏览器中预览页面。

    3. 运行测试
    npm test              # 运行全部测试（252 个）
    npm run test:watch    # watch 模式
    npm run test:coverage # 覆盖率报告

    4. 构建生产版本
    npm run build
    先执行 vue-tsc --noEmit 类型检查，然后 vite build 输出到 dist/。

    5. 微信小程序云函数部署（如需要）
    云函数在 cloud-functions/ 目录下（login, createBill, listBillsByMonth 等共 13
    个），上传到微信开发者工具中的云开发环境即可：
    - 微信开发者工具 → 云开发 → 云函数 → 右键上传
    - 或者在项目根目录使用 tcb CLI 批量部署

    完整流程： 开发时用 npm run dev → 改代码 → npm test 验证 → 提交代码。生产构建用 npm run build。