# Tasks

## 1. API 功能目录

- [x] 1.1 将 Catalog HTTP 路由从 AppController 拆入 Catalog 模块，health 留在应用入口；将现有 Catalog 与 MCP Adapter 按设计归组并更新 Nest 注册和 imports，运行 API build 确认 API 引用有效。
- [x] 1.2 将数据库 helper、seed 与 Prisma 生成客户端归入数据库基础设施目录，并同步生成器输出路径、客户端 imports 和 seed 脚本；运行 Prisma generate 与 API build 确认生成及编译产物路径正确。
- [x] 1.3 将 API 测试按 Catalog、HTTP、MCP、Inventory 职责归组并更新配置引用；运行 Vitest API suite 确认移动后 API 测试仍被发现，测试逻辑不变。

## 2. Web 功能目录

- [x] 2.1 将商品发现专属组件移入 `features/product-discovery/`，保留 Next.js 页面文件与共享 UI/工具位置并更新 imports；运行 Next route typegen 与 TypeScript 检查确认页面和 alias 正常。

## 3. 集成检查

- [x] 3.1 检查本 Change 的文件移动与配置差异，运行 `openspec validate api-web-source-hierarchy --type change --strict`、`git diff --check`，确认没有路由、HTTP/MCP 契约或运行逻辑变化。

## Workflow follow-up

- 实施验证及所需 Review 完成后，按仓库 Git Checkpoint Policy 检查交付条件；获 Human Acceptance 后归档此 OpenSpec Change。
