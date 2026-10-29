# Proposal

## Why

目前 `apps/api/src` 的应用入口、Catalog、MCP、数据库和结果处理文件集中在同一层；`apps/web/src` 的路由、商城功能组件和通用 UI/工具也分散在少数目录中，读者需要逐个打开文件才能判断所属功能及依赖方向。现在将现有源码按功能归组，并明确框架入口、共享能力与业务功能的边界，可让后续 S2 等切片沿同一结构增量开发，而不改变已交付行为或已批准的系统边界。

## What Changes

- 将 API 源码按 Catalog、MCP、数据库基础设施及共享协议/错误能力分组；应用启动和根模块仍作为应用入口。
- 将 Web 路由保留在 Next.js `app/`，把商品发现等功能专属的组件与操作文件按功能归组；保留共享 UI 与通用工具的独立位置。
- 让相关测试路径尽可能反映被测功能；配置、生成代码和框架约定目录仅在调整有实际收益且不破坏工具链时迁移。
- 记录目录职责、允许的依赖方向和新增文件的放置规则；不建立空目录或无消费者的层，不把代码迁移扩展成完整 DDD、通用组件库或业务重写。
- 保持路由、HTTP/MCP 契约、权限、数据所有权、计价及运行行为不变；本变更只整理已有源码并确立轻量目录约定。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无。纯源码组织调整不改变产品行为或现有 OpenSpec Capability 的 SHALL 要求；本 Change 使用 `skip_specs: true`。

## Impact

- `apps/api/src`、`apps/api/test`：移动并按功能归组现有 Catalog、HTTP、MCP、数据库与共享错误/结果代码；更新模块注册、导入路径、构建/seed 入口及对应测试引用。
- `apps/web/src`：移动功能专属组件/操作代码，同时保留 Next.js App Router 的路由约定及真正共享的 UI、基础设施代码；更新导入路径。
- Prisma 生成客户端位置、Nest CLI / TypeScript / Next 路径配置仅在方案验证证明必要时调整；不把生成文件误当手写业务模块。
- 不改变 `packages/contracts`、外部 API/MCP 形状、数据库 schema、运行配置或部署拓扑；不新增依赖。
- 依据：Approved Technical Design v0.5 §3.4（依赖方向与 Web/Nest 文件组织建议）、§8.1（NestJS 薄模块化单体），以及 Accepted T-01、T-04。该设计建议按实际使用逐步拆分，不要求四层目录或完整 DDD。
