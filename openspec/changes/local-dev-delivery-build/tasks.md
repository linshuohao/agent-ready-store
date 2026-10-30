# Tasks

## 1. 本地开发

- [x] 1.1 调整 dev/seed 与 Apps watch，更新本地文档；验证无 Next 预构建的启动、资源重建和退出行为。

## 2. 容器交付

- [x] 2.1 移除容器开发配置，收敛 Dockerfile/Compose/命令及升级文档；验证 Compose 渲染、生产构建与隔离启动（设施不可用须保留未完成）。

## 3. CI 与交付验证

- [x] 3.1 调整 CI 初始化路径并增加镜像验证，更新工程决策；通过静态检查、相关测试和 OpenSpec 校验。
- [x] 3.2 完成针对脚本生命周期、产物、迁移边界的代码审查，修复发现并记录实际验证及剩余限制。

## Workflow follow-up

- Human 验收及授权后提交/归档；本轮不自动 Push、Merge 或发布。

## Verification — 2026-10-30

- 本机 Node 24.22.2 / pnpm 12.11.2；启动已安装 Docker Desktop 后 Server 29.9.2。
- 迁移/seed 使用本轮独立 tmpfs PostgreSQL（store_test，端口 55439），没有使用业务数据库。首次 seed 成功且未运行 Next build。
- 移开既有 `.next`、API/contracts `dist` 与 API build info 后，`pnpm dev` 自动编译并启动于 3210/3212。Web 首页和同源商品查询成功；`.next/BUILD_ID` 不存在，证明不依赖生产构建。修改 Apps 和共享 UI 源文件 mtime 均触发 HTML 重建；退出后可重新绑定原端口。
- `pnpm build` 成功；此前 Next/Turbopack 遭遇宿主端口权限错误，重新验证后通过，未改变构建器。`pnpm start` 对隔离库启动成功，页面、API 代理及 MCP Apps 两项资源测试通过。
- `node --test scripts/local.test.mjs`：3 通过；覆盖准备失败停止、seed 仅编译 API 前置、production start 不构建/迁移及 SIGTERM 子进程清理。测试曾因 macOS /var 与 /private/var 路径别名失败，修正测试目录 realpath 后通过。
- `pnpm test`：89 通过，76 因未提供各自 DB/HTTP 环境而跳过；不把跳过记为通过。`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`git diff --check` 通过。
- `docker compose build api` 成功。独立检查镜像含 API/Next 产物与 8 个 Apps HTML，不含 references、.env 或 API src。构建后仅修正宿主 package/CI 的 Compose run 参数，运行镜像所消费的应用及 Dockerfile 未变，复用镜像证据。
- `docker compose config --quiet` 通过；独立 `store-delivery-check` 项目完成 6 个迁移、首次 seed、生产启动、首页/同源商品查询及 2 项 MCP Apps 资源测试。实跑 `db:migrate:docker`、`start:docker` 成功；再次 `db:seed:docker` 按预期报 INVENTORY_NOT_EMPTY。发现并修复 Compose run 不支持 --no-build（up 保留），修后重验通过。
- 按 ai-native-review/requesting-code-review 派发全新只读 reviewer；初次及参数/测试补充后的定向复核均无 P1/P2。未冒称远程 CI、Human 验收或发布成功。
- 本次无业务契约/数据库 schema 变更，无不可逆业务数据操作；单一工程增量完成本地验证与独立审查，不在实施中间新增 Checkpoint 提交。交付时待提交；Human 随后明确授权「提交，然后合入」，提交与合并按此授权执行。

## Remaining limits

GitHub CI 已更新但未远程运行；公网部署/TLS、镜像发布、完整依赖裁剪和 Host 内已打开卡片的 HMR 不在本轮范围。Human 已授权提交并本地合入 main；实际提交/合并结果以 Git 历史为准。尚未归档，未授权 Push 或发布。

## 4. 合入后本机开发反馈

- [x] 4.1 补齐仅 PostgreSQL 的 Docker 入口与 README 步骤、缺失 DATABASE_URL 提示；用当前 .env（无测试 URL 覆盖）验证 db:up、generate、migrate、首次 seed 与 dev，保持交付数据卷不变。

反馈根因：旧 .env 缺少 DATABASE_URL，原文档假设已经自行创建本机 PostgreSQL，没有提供用户期望的数据库启动入口。新增配置缺失回归测试先失败（缺配置仍调用工具），修复后 4 个脚本测试通过。新增开发卷首次创建后迁移 6 项、seed 成功；直接使用当前 .env 的 pnpm dev、首页和同源商品查询均通过。开发数据库保持运行，应用验证进程停止后交还用户自行启动。此补充采用聚焦自查：确认配置只启动 DB、独立卷与 loopback 端口、无自动迁移/seed、实际 .env 未纳入 Git。
