# Design

## Context

参见 Proposal。沿用 T-06 与 Technical Design §10.1 的三服务交付、运行期读取目录及显式数据库初始化约束。Human 本轮明确以本机开发替代开发容器。前两轮已完成调用链分析及方案比较，本轮直接实施该授权。

## Goals / Non-Goals

Goals：正常开发只需 pnpm dev；生产构建仅用于预览/交付；首次 seed 不构建 Web；保留数据库卷和显式迁移边界。
Non-Goals：公网发布、镜像仓库、自动部署、业务改动、删除已有容器或数据卷。

## Decisions

- 保留现有 TypeScript 编译器（Nest 需要装饰器元数据），开发自动生成 Prisma、编译 contracts/API，再 watch；不引入新的 TS 执行器。
- Apps 使用已有 Vite 的 watch 生成内联 HTML，API 继续按请求读取资源；不新增长驻 HTTP 服务。
- seed 本地入口只准备 contracts/API 编译；生产容器使用已编译的 seed。迁移、seed 不放入启动命令。
- 默认 Compose 仅运行生产镜像；移除开发卷与 overlay，保留现有 project/库存卷名称。运行原件只读挂载，不复制到镜像。
- 镜像采用依赖/构建/运行阶段，运行阶段显式复制产物与依赖。暂保留工作区完整依赖以支持 Prisma 显式迁移，不新增 pnpm deploy 或第二套依赖布局；排除仓库原件、文档、源码上下文的无差别 COPY。
- CI 继续现有业务检查，增加无推送的 Docker 构建及隔离 Compose 启动检查；不安装新的开发工具。

## Risks / Trade-offs

- [首次编译仍有耗时] → 自动执行而非要求用户生产 build，避免重复 contracts 与 Next build。
- [Host 资源缓存] → Apps 文件自动重建后仍需 Host 重新调用/加载；不承诺 Host HMR。
- [原 production 命令改变] → README 提供新入口，数据库卷名称保持，升级先停写再迁移，不 seed。
- [当前 Docker daemon 未启动] → 尝试本机可用运行设施；若不可用如实记录镜像运行未验证，不伪造 CI 通过。

## Migration Plan

首次交付：build:docker → 启动 db → db:migrate:docker → 首次空库 db:seed:docker → start:docker。已有部署：build:docker → stop api web → db:migrate:docker → start:docker。不 down -v，不反向迁移；回退代码须兼容现有数据库。

## Planning Review

聚焦自查：未改变业务契约；不混入 DB 自动初始化；没有新依赖/服务；库存卷保持。实施授权来自 Human 本轮明确指令，具体局部实现由 AI 决定，不冒称独立 Review 或逐项 Human 批准。

## Follow-up — 本地数据库启动缺口（2026-10-30）

Human 在合入后报告 README 的 db:generate/db:migrate 缺少 DATABASE_URL，并明确本机应用应连接 Docker PostgreSQL，不安装本机 PostgreSQL。实测旧 .env 缺少 DATABASE_URL，5432 无监听；前轮隔离库验证未覆盖用户现有配置。

补充：compose.local.yaml 仅运行 PostgreSQL，使用 agent-ready-store-local 项目及独立库存卷，loopback 5432（可配置 LOCAL_DB_PORT），提供 db:up/db:down。完整应用 Compose 保持交付用途。README 分开首次准备、旧 .env 补齐、日常启动；本机脚本缺 DATABASE_URL 时在启动工具前给出明确指引。当前本机 .env 只补连接地址，不覆盖已有密钥，不将凭证加入 Git。
