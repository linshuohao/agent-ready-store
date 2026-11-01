# 云端演示部署

使用 Vercel Hobby 部署 Next.js 前端与 NestJS Functions 后端，Neon Free 保存 PostgreSQL 数据。仅用于短期、非商业 Demo；不启用 Pro 试用、付费资源、独立 Worker 或 Docker Beta。

## 当前资源

| 资源 | 当前事实 |
| --- | --- |
| 前端 | Vercel 项目 `agent-ready-store`，[公开网页](https://agent-ready-store.vercel.app)，已验证购物与模拟支付 |
| 文档与展示 | Vercel 项目 `agent-ready-store-docs`，[在线入口](https://agent-ready-store-docs.vercel.app)；构建与发布配置见[文档站说明](../../site/README.md#vercel-发布) |
| 后端 | Vercel 项目 `agent-ready-store-api`，[健康检查](https://agent-ready-store-api.vercel.app/api/v1/health)，REST / MCP 已验证 |
| 数据库 | Neon Free 项目 `agent-ready-store-demo`（`fancy-salad-72400395`），PG18 / AWS US East；已执行8个迁移，保留原有30条商品库存数据，不要重复 seed |
| Git | 购物车隔离 [PR #9](https://github.com/linshuohao/agent-ready-store/pull/9) 已以 Merge Commit `78e3d76` 合入 main |

之前尝试 Render Free 时被银行卡验证阻断，未创建服务；Human 已选择上述 Vercel 方案。原始附件访问及向 Vercel 后端 Production 写入本项目 Neon/MCP 凭据均已获得明确授权。原件仍不公开，密钥不进入 Git、前端变量或日志。

## 当前发布与自动更新

2026-11-01，商城、API、文档站三个 Production 项目均已部署 `78e3d7634f7d70f829a480cea26f01c486043e40`，状态均为 READY。[合并后 CI](https://github.com/linshuohao/agent-ready-store/actions/runs/41275113495) 的 Verify 与 Delivery image 均成功；[PR #9](https://github.com/linshuohao/agent-ready-store/pull/9)保留本次发布及验证记录。真实 Host 验收仍待完成，详情见[交付状态](DELIVERY_STATUS.md#购物车命令隔离已部署2026-11-01)。

此前 `c8075a1` 的文档站回归覆盖109份正文、16屏展示、旧入口、刷新返回及四种屏宽；该历史证据不代表本轮重新执行全部文档浏览器回归。

三个 Vercel 项目连接同一仓库 main，推送后由 Vercel Git 集成自动部署。GitHub Actions 执行业务测试和镜像验证，当前与部署独立运行，尚无“Actions 通过后才发布”的门禁。

## 本次发布与验证（2026-11-01）

Human 授权合并与部署后，明确接受本次 Demo 简化发布：先备份并执行兼容迁移，再合并触发配套服务更新；允许发布窗口内短暂请求失败及旧页面需刷新。本次未执行严格停写、排空或原子切流，不宣称验证了所有旧在途请求；历史未知请求保持只读核对，不自动重放。此选择限于本次 Demo，不推广为生产零中断发布保证。

- 备份：Neon 分支 `backup-before-cart-command-20261101`（`br-aged-art-b7qi2cd8`，无 compute）及本地受限权限 pg_dump 文件；不包含在 Git 或公开文档站中。未执行数据恢复或回滚。
- 迁移：对原库执行 `pnpm --filter @store/api db:migrate`，成功应用 `20261101000000_cart_initialization_identity`。新增唯一初始化身份并允许两个历史字段为空；不 reset、不 seed、不删除购物车、订单或幂等事实。
- 发布：迁移完成后合并 PR，Vercel Git 集成分别构建三个项目；API 与前端均 READY 后执行线上业务验收，不将构建排队顺序视为严格发布门禁。
- 线上 MCP SDK 发现21个工具、两份 v9 Apps HTML资源；新契约可用，旧初始化和旧生单载荷被拒绝。
- 同一初始化身份并发加购2和3，落到同一辆车、数量为5；车量5可显式购买2并清理该SKU整行。之后加购1，再重放原生单键，仍返回原订单且保留新增数量1。
- 未知结果只读查询返回 `not_found`，前后订单列表不变；已成功请求可查询原单，Web代理查询结果一致。线上首页正常，浏览器发现新版 WebMCP 契约；本次未重新执行云端人工支付全流程。
- 测试车 `b868a557-8dec-466b-9e05-fe260de6dcaf`，测试单 `0419c23a-8af5-4db8-8075-ef43d371019e` 已取消、释放预留；未清空业务数据。线上验收为真实 HTTP/MCP SDK 证据，不等于 Apps Host UI 验收。

商城部署 `dpl_4Z5Sk7hpzGJwWBtfJJFieszxFL74`、API部署 `dpl_9d8zcGq17zmyU4S6FwyhArkKLAuQ`、文档站部署 `dpl_23V9ksXxT88LpCXpnz87tpehcJTk` 均对应上述合并提交。操作及回滚边界见[购物车切换说明](../../apps/api/docs/cart-command-cutover.md)。

## 历史首次部署验证（2026-10-31）

2026-10-31，前后端 Production 均部署提交 `266489a`。Vercel Hobby 与 Neon Free 已完成配置，本次未绑定银行卡、未启用付费方案。

- [Actions run 41173631160](https://github.com/linshuohao/agent-ready-store/actions/runs/41173631160)：Verify 与 Delivery image 均通过，含真实 PostgreSQL、HTTP/MCP、桌面与移动浏览器测试。
- 云端 REST 经前端代理完成建车、生单、取消，验证库存恢复；商品原始文件的公开路径返回404。
- 云端 MCP SDK 连接成功，发现18个工具，商品搜索成功，两个 MCP Apps HTML 资源可读取且引用正确前端地址。入口为 `https://agent-ready-store-api.vercel.app/mcp`，该次验收使用 Bearer 令牌；当前版本的默认模式见下方认证模式说明。
- 浏览器完成搜索、加购、勾选、生单与模拟支付；订单 `6b8ad24e-8273-45a2-8fc5-5ce05487d3cb` 显示支付成功，成交金额 NT$1,790。该记录属于部署验收，不替代真实 Agent 购物录影。

请求清理的截止检查、并发释放与故障日志已在隔离 PostgreSQL 和接口测试中验证；未在云端修改时间或批量清空数据制造测试条件。以上仅记录该历史版本的验收，不代表当前部署提交。

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

发布前检查目标团队、项目、提交和验证结果。可从获授权分支手动发布 Production，不需要为了部署先合并 PR。手动发布可先部署后端、验证健康/商品/MCP，再部署前端；使用 Git 自动发布时项目独立构建，不保证切换顺序。按变更风险验证搜索、加购、生单、模拟支付/取消及跨端链接；本次简化发布范围与证据见上文。验证数据要可追踪，未支付测试订单及时取消；不通过清空数据库恢复。

## 官方资料

- [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Neon Free](https://neon.com/pricing)

## MCP 认证模式

本地与线上 Demo 均默认 `MCP_AUTH_MODE=demo`，不要求 Token，也不限制为回环域名。`MCP_ALLOWED_HOSTS` 与 `WEB_ORIGIN` 填写实际访问域名；Host/Origin、输入校验与交易约束保持有效。

需要共享令牌接入门槛时，服务端显式设为 `token` 并配置有效的 `MCP_SERVICE_TOKEN`，Host 客户端使用同值的 Bearer Header；详见[MCP 接入指南](MCP_CONNECT.md#可选-token-接入门槛)。Token 不等于用户级授权。切换模式需同步服务端和客户端配置；本次发布未切换认证模式；Demo 免令牌连接已由线上 MCP SDK 验证。
