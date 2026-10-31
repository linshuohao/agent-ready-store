# 云端演示部署

使用 Vercel Hobby 部署 Next.js 前端与 NestJS Functions 后端，Neon Free 保存 PostgreSQL 数据。仅用于短期、非商业 Demo；不启用 Pro 试用、付费资源、独立 Worker 或 Docker Beta。

## 当前资源

| 资源 | 当前事实 |
| --- | --- |
| 前端 | Vercel 项目 `agent-ready-store`，域名 `agent-ready-store.vercel.app`；本轮部署验证进行中 |
| 后端 | Vercel 项目 `agent-ready-store-api`，域名 `agent-ready-store-api.vercel.app`；本轮部署验证进行中 |
| 数据库 | Neon Free 项目 `agent-ready-store-demo`（`fancy-salad-72400395`），PG18 / AWS US East；已执行7个迁移并导入30条库存，不要重复 seed |
| Git | `codex/deploy-free-demo`，PR #3；尚未合并 |

之前尝试 Render Free 时被银行卡验证阻断，未创建服务；Human 已选择上述 Vercel 方案。原始附件访问及向 Vercel 后端 Production 写入本项目 Neon/MCP 凭据均已获得明确授权。原件仍不公开，密钥不进入 Git、前端变量或日志。

## 项目配置

两个项目连接同一仓库，各自设置 Root Directory：前端 `apps/web`、后端 `apps/api`；允许访问根目录之外的工作区文件，Node.js 固定24.x。前端使用 [配置](../../apps/web/vercel.json)，后端使用 [配置](../../apps/api/vercel.json)。保持 Hobby 和 `iad1` 后端区域；不自动升级。

后端构建生成 Prisma Client、共享契约、NestJS 和 MCP Apps；[构建准备脚本](../../apps/api/scripts/prepare-vercel.mjs)只把已授权商品数据复制进 `dist/catalog-data`。`outputDirectory=dist` 让 NestJS 预设使用编译后的入口，文件追踪将商品与 MCP Apps 加入函数私有资源；不使用公共静态目录，也不复制题目原件。Dockerfile 继续用于本地和其他容器环境，不参与 Vercel 构建。

## 环境变量

后端 Production 变量在 Vercel 中使用 Sensitive 类型：

| 变量 | 值或来源 |
| --- | --- |
| `DATABASE_URL` | Neon pooled URL，保留 TLS 参数 |
| `MCP_SERVICE_TOKEN` | 至少24字符的随机令牌，仅后端及受信任 MCP 客户端使用 |
| `WEB_ORIGIN` | `https://agent-ready-store.vercel.app`；构建 MCP Apps 时也使用它 |
| `MCP_ALLOWED_HOSTS` | `agent-ready-store-api.vercel.app` |
| `CATALOG_PATH` | `apps/api/dist/catalog-data/products.json` |
| `MCP_APPS_PATH` | `apps/api/dist/mcp-app` |
| `ORDER_EXPIRY_MODE` | `request` |
| `HOST` | `0.0.0.0` |

前端只配置 `API_INTERNAL_URL=https://agent-ready-store-api.vercel.app`。它用于服务端请求与 API rewrite，不加 `NEXT_PUBLIC_`，不向前端配置数据库连接串或 MCP 令牌。变更后端地址或 `WEB_ORIGIN` 后必须重新构建相应项目。

演示需要公开可访问的 Production 域名；Vercel Authentication 不能挡住前端访问后端，MCP 自身仍检查 Token、Host 和 Origin。Preview 默认关闭，避免未经验证的分支接入同一 Demo 库。

## 到期清理与限制

云端采用 Human 2026-10-31 批准的请求模式：REST 业务请求与认证后的 MCP 工具调用先等待最多100单的一批清理，再执行请求；健康检查不触发。无访问时不运行后台任务，不保证截止后5秒物化，积压由后续请求继续处理。十五分钟支付截止、原子释放和保守可售量不变；失败显式返回，不静默放大库存。本地/Docker 默认仍每秒扫描。

Hobby 超额可能暂停，冷启动与数据库唤醒可能增加首个请求延迟；这里不承诺生产 SLA。Demo 的 ID 接续、模拟支付和身份边界沿用 README，不用于真实交易。体验完毕后删除云端项目/数据库或停止继续使用，避免长期保留演示数据。

## 数据库与发布

迁移使用相同数据库的 direct URL（主机名不含 `-pooler`）；运行使用 pooled URL。不将迁移或 seed 放进 Function 启动或构建过程。

全新数据库才执行 `pnpm db:migrate` 与 `pnpm db:seed`，已有数据库只按必要迁移升级。当前库已初始化，不 reset、不重复导入。凭据保存在被 Git 忽略的本地 `.env` 或平台敏感变量。

发布前检查目标团队、项目、提交和验证结果。可从获授权分支手动发布 Production，不需要为了部署先合并 PR。依次部署后端、验证健康/商品/MCP，再部署前端并验证搜索、加购、创建订单、模拟支付/取消及跨端链接。验证数据要可追踪，未支付测试订单及时取消；不通过清空数据库恢复。

## 官方资料

- [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Neon Free](https://neon.com/pricing)
