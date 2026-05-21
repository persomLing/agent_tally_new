# 个人记账小程序 V1.0

基于 Vue 3 + TypeScript + 微信云开发的个人记账微信小程序。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Vue 3 (Composition API + `<script setup>`) |
| 状态管理 | Pinia |
| 构建 | Vite 5 |
| 类型检查 | vue-tsc + TypeScript 5 |
| 测试 | Jest 29 + ts-jest + @vue/vue3-jest |
| 后端 | 微信云开发（13 个云函数） |

## 快速开始

```bash
npm install
npm run dev        # 本地开发（H5 预览）
```

## 测试

```bash
npm test              # 运行全部测试（252 个）
npm run test:watch    # watch 模式
npm run test:coverage # 覆盖率报告
```

## 构建

```bash
npm run build          # 类型检查 + 生产构建
npm run dev            # 本地开发服务器
```

## 云函数部署

云函数在 `cloud-functions/` 目录下（login、createBill、listBillsByMonth 等共 13 个），上传到微信开发者工具的云开发环境：

- 微信开发者工具 → 云开发 → 云函数 → 右键上传
- 或使用 `tcb` CLI 批量部署

## 模块

| 模块 | 说明 |
| --- | --- |
| 通用基础 | 类型定义、设计 Token、工具函数、错误码 |
| 类别配置 | 10 个支出 + 7 个收入类别 |
| 授权登录 | 微信云登录流程 |
| 账单管理 | CRUD、计算器键盘、类别网格、备注历史 |
| 明细 | 月度账单列表、日期分组、汇总卡片 |
| 统计 | 饼图、柱状图、分类排名、扩展指标 |
| 个人中心 | 用户信息、预算进度、功能入口、清空账单 |
| 备注记忆 | CRUD、去重、每分类 10 条限制、账单备注自动保存 |

## 项目结构

```
src/
  components/       # 通用组件
  constants/        # 类别、设计 Token、错误码
  pages/            # 页面（auth, bill-edit, detail, statistics, profile）
  services/         # 云函数调用封装
  stores/           # Pinia 状态
  types/            # TypeScript 类型
  utils/            # 工具函数（金额、日期、校验）
cloud-functions/    # 微信云函数（13 个）
tests/              # Jest 单元测试
```
