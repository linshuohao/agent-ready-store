# 云端演示部署

使用 Vercel Hobby 部署 Next.js 前端与 NestJS Functions 后端，Neon Free 保存 PostgreSQL 数据。仅用于短期、非商业 Demo；不启用 Pro 试用、付费资源、独立 Worker 或 Docker Beta。

## 当前资源

| 资源 | 当前事实 |
| --- | --- |
| 前端 | Vercel 项目 `agent-ready-store`，[公开网页](https://agent-ready-store.vercel.app) |
| 文档与展示 | Vercel 项目 `agent-ready-store-docs`，[在线入口](https://agent-ready-store-docs.vercel.app)；构建与发布配置见[文档站说明](../../site/README.md#vercel-发布) |
| 后端 | Vercel 项目 `agent-ready-store-api`，[健康检查](https://agent-ready-store-api.vercel.app/api/v1/health) |
| 数据库 | Neon Free 项目 `agent-ready-store-demo`（`fancy-salad-72400395`），PG18 / AWS US East；已执行8个迁移，保留原有30条商品库存数据，不要重复 seed |
| Git | 购物车隔离 [PR #9](https://github.com/linshuohao/agent-ready-store/pull/9) 已以 Merge Commit `78e3d76` 合入 main |

之前尝试 Render Free 时被银行卡验证阻断，未创建服务；Human 已选择上述 Vercel 方案。原始附件访问及向 Vercel 后端 Production 写入本项目 Neon/MCP 凭据均已获得明确授权。原件仍不公开，密钥不进入 Git、前端变量或日志。

## 当前发布与自动更新

2026-11-01，商城、API、文档站三个 Production 项目均已部署 `78e3d7634f7d70f829a480cea26f01c486043e40`，状态均为 READY。[合并后 CI](https://github.com/linshuohao/agent-ready-store/actions/runs/41275113495) 的 Verify 与 Delivery image 均成功；[PR #9](https://github.com/linshuohao/agent-ready-store/pull/9)保留本次发布及验证记录。

三个 Vercel 项目连接同一仓库 main，推送后由 Vercel Git 集成自动部署。GitHub Actions 执行业务测试和镜像验证，当前与部署独立运行，尚无“Actions 通过后才发布”的门禁。

## 本次发布（2026-11-01）

Human 授权合并与部署后，明确接受本次 Demo 简化发布：先备份并执行兼容迁移，再合并触发配套服务更新；允许发布窗口内短暂请求失败及旧页面需刷新。本次未执行严格停写、排空或原子切流，不宣称验证了所有旧在途请求；历史未知请求保持只读核对，不自动重放。此选择限于本次 Demo，不推广为生产零中断发布保证。

- 备份：Neon 分支 `backup-before-cart-command-20261101`（`br-aged-art-b7qi2cd8`，无 compute）及本地受限权限 pg_dump 文件；不包含在 Git 或公开文档站中。未执行数据恢复或回滚。
- 迁移：对原库执行 `pnpm --filter @store/api db:migrate`，成功应用 `20261101000000_cart_initialization_identity`。新增唯一初始化身份并允许两个历史字段为空；不 reset、不 seed、不删除购物车、订单或幂等事实。
- 发布：迁移完成后合并 PR，Vercel Git 集成分别构建三个项目，均已 READY；项目独立构建，不保证切换顺序。

操作及回滚边界见[购物车切换说明](../../apps/api/docs/cart-command-cutover.md)。

## 项目配置

两个项目连接同一仓库，各自设置 Root Directory：前端 `apps/web`、后端 `apps/api`；允许访问根目录之外的工作区文件，Node.js 固定24.x。前端使用 [配置](../../apps/web/vercel.json)，后端使用 [配置](../../apps/api/vercel.json)。保持 Hobby 和 `iad1` 后端区域；不自动升级。

后端构建生成 Prisma Client、共享契约、NestJS 和 MCP Apps；[构建准备脚本](../../apps/api/scripts/prepare-vercel.mjs)只把已授权商品数据复制进 `dist/catalog-data`。`outputDirectory=dist` 让 NestJS 预设使用编译后的入口，文件追踪将商品与 MCP Apps 加入函数私有资源；不使用公共静态目录，也不复制题目原件。Dockerfile 继续用于本地和其他容器环境，不参与 Vercel 构建。

## 环境变量

后端 Production 变量在 Vercel 中使用 Sensitive 类型：

| 变量 | 值或来源 |
| --- | --- |
| `DATABASE_URL` | Neon pooled URL，保留 TLS 参数 |
| `MCP_AUTH_MODE` | 默认 `demo`，本地与线上演示均免 Token；可选 `token` 限制接入 |
| `MCP_SERVICE_TOKEN` | 仅 `token` 模式必需，至少24字符的随机令牌；Demo 无需配置 |
| `WEB_ORIGIN` | `https://agent-ready-store.vercel.app`；构建 MCP Apps 时也使用它 |
| `MCP_ALLOWED_HOSTS` | `agent-ready-store-api.vercel.app` |
| `CATALOG_PATH` | `apps/api/dist/catalog-data/products.json` |
| `MCP_APPS_PATH` | `apps/api/dist/mcp-app` |
| `ORDER_EXPIRY_MODE` | `request` |
| `HOST` | `0.0.0.0` |

前端只配置 `API_INTERNAL_URL=https://agent-ready-store-api.vercel.app`。它用于服务端请求与 API rewrite，不加 `NEXT_PUBLIC_`，不向前端配置数据库连接串或 MCP 令牌。变更后端地址或 `WEB_ORIGIN` 后必须重新构建相应项目。

演示需要公开可访问的 Production 域名；Vercel Authentication 不能挡住前端访问后端，MCP 始终检查 Host 和 Origin，只有显式 `token` 模式检查共享令牌。Preview 默认关闭，避免未经验证的分支接入同一 Demo 库。

## 到期清理与限制

云端采用 Human 2026-10-31 批准的请求模式：REST 业务请求与通过当前入口模式校验的 MCP 工具调用先等待最多100单的一批清理，再执行请求；健康检查、分类发现及只读请求结果查询不触发。无访问时不运行后台任务，不保证截止后5秒物化，积压由后续请求继续处理。十五分钟支付截止、原子释放和保守可售量不变；失败显式返回，不静默放大库存。本地/Docker 默认仍每秒扫描。

Hobby 超额可能暂停，冷启动与数据库唤醒可能增加首个请求延迟；这里不承诺生产 SLA。Demo 的 ID 接续、模拟支付和身份边界沿用 README，不用于真实交易。体验完毕后删除云端项目/数据库或停止继续使用，避免长期保留演示数据。

## 数据库与发布

迁移使用相同数据库的 direct URL（主机名不含 `-pooler`）；运行使用 pooled URL。不将迁移或 seed 放进 Function 启动或构建过程。

全新数据库才执行 `pnpm db:migrate` 与 `pnpm db:seed`，已有数据库只按必要迁移升级。当前库已初始化，不 reset、不重复导入。凭据保存在被 Git 忽略的本地 `.env` 或平台敏感变量。

发布前检查目标团队、项目、提交和验证结果。可从获授权分支手动发布 Production，不需要为了部署先合并 PR。手动发布可先部署后端、验证健康/商品/MCP，再部署前端；使用 Git 自动发布时项目独立构建，不保证切换顺序。按变更风险验证搜索、加购、生单、模拟支付/取消及跨端链接；本次简化发布方式见上文。验证数据要可追踪，未支付测试订单及时取消；不通过清空数据库恢复。

## 官方资料

- [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Neon Free](https://neon.com/pricing)

## MCP 认证模式

本地与线上 Demo 均默认 `MCP_AUTH_MODE=demo`，不要求 Token，也不限制为回环域名。`MCP_ALLOWED_HOSTS` 与 `WEB_ORIGIN` 填写实际访问域名；Host/Origin、输入校验与交易约束保持有效。

需要共享令牌接入门槛时，服务端显式设为 `token` 并配置有效的 `MCP_SERVICE_TOKEN`，Host 客户端使用同值的 Bearer Header；详见[MCP 接入指南](MCP_CONNECT.md#可选-token-接入门槛)。Token 不等于用户级授权。切换模式需同步服务端和客户端配置；本次发布未切换认证模式。
