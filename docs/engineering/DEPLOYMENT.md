# 云端演示部署

本指南使用 Vercel Hobby 承载 Next.js、Render Free 运行现有 Docker 镜像中的 API / MCP / 到期释放任务、Neon Free 保存 PostgreSQL 数据。适用于短期、低流量、模拟支付演示；保留现有 Demo 身份边界，不用于真实顾客交易。

仓库配置不代表服务已经上线。实际发布前确认目标账户、免费方案、提交与域名；所有密码和 Token 只放平台密钥设置或本机被忽略的环境文件。

## 配置入口

| 文件 | 作用 |
| --- | --- |
| [apps/web/vercel.json](../../apps/web/vercel.json) | 固定 pnpm 版本；先构建共享 contracts，再构建 Next.js |
| [render.yaml](../../render.yaml) | Free Docker Web Service、健康检查和运行环境变量；初始关闭自动部署 |
| [Dockerfile](../../Dockerfile) | 复用现有交付镜像，默认启动 API；不运行 Compose 或另起 Web 进程 |
| [.dockerignore](../../.dockerignore) | 排除原始附件、本机密钥以及 Render 注入构建目录的商品文件 |

Vercel 的 Root Directory 是项目设置，不能写入 `vercel.json`。Render Blueprint 不包含数据库资源，避免误建 Render Postgres。

## 首次部署顺序

1. 确认配置已合入 `main` 且该提交 CI 通过。确认云端可访问仓库的授权：Git 集成会拉取仓库，其中包含 `references/` 原件；`.dockerignore` 只限制镜像构建上下文，不限制 Git 拉取。原件访问未获授权时不要连接 Git 部署，先另行确定脱敏交付方式。
2. 在 Neon 建立专用演示项目，选择 Free 和 PostgreSQL 18；推荐 AWS US East，与 Blueprint 的 Render Virginia 靠近。不要复用未确认用途的已有数据库。保留自动休眠，检查用量限制，不启用付费升级。
3. 配置 Vercel 项目并确定稳定的正式域名；配置 Render 服务并取得其实际域名。记录两个真实地址，不假定项目名一定对应同名域名。
4. 按下文初始化新数据库、配置 Render 环境变量与商品 Secret File，再构建启动后端。Blueprint 初次创建可能立即触发构建；文件未配置完成的失败部署不能算上线成功。`autoDeployTrigger: off` 只关闭后续自动部署。
5. 将后端地址填入 Vercel 的 Production 环境变量，构建部署前端，完成购物与 MCP 验收。

## Neon：数据库初始化

运行连接使用 Neon 提供的 pooled URL，迁移使用同一项目、同一 branch/database 的 direct URL；保留 Neon 提供的 TLS 参数。这里使用标准 PostgreSQL 驱动，不需要 Neon SDK 或新数据库抽象。

在独立 checkout 中创建被 Git 忽略的 `.env`，安全填入 `DATABASE_URL`（direct URL）和 `CATALOG_PATH`（已授权商品文件的绝对路径）。核对目标确实是新演示数据库后，在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

这些命令会写入目标数据库。`seed` 仅用于空库存表；不要对已有数据重复导入，也不要执行 reset。后续部署只按需要执行迁移。初始化完成后把 pooled URL 配置到 Render，数据库凭证不提供给 Vercel。

Render Free 不提供 pre-deploy command，因此这里显式执行迁移；不将迁移或 seed 放入容器启动命令。

## Render：Docker 后端

使用根目录 Blueprint，实例必须为 **Free**。保留根目录构建上下文，启动命令使用 Dockerfile 默认值。不要设置固定 `PORT`，服务会读取 Render 注入的端口；`HOST=0.0.0.0` 已配置。

| 变量 / 文件 | 配置值 |
| --- | --- |
| `DATABASE_URL` | Neon pooled URL，含 TLS 参数 |
| `WEB_ORIGIN` | 正式前端完整 origin，例如 `https://实际域名.vercel.app`，无末尾斜杠或路径 |
| `MCP_ALLOWED_HOSTS` | 实际 Render 主机名，例如 `实际域名.onrender.com`，不含 `https://` |
| `MCP_SERVICE_TOKEN` | Blueprint 自动生成随机 Token；仅在受信任 MCP 客户端配置 |
| `CATALOG_PATH` | 已配置为 `/etc/secrets/products.json` |
| Secret File `products.json` | 获授权后上传商品文件，不能上传题目或整个 `references/` |

Secret Files 总大小有 1 MB 限制，上传前检查文件大小。`.dockerignore` 同时排除了 `references/` 与构建目录根部的 `products.json`，商品只在运行时读取。

Render 将环境变量传给 Docker build arguments，现有 Dockerfile 的 `ARG WEB_ORIGIN` 会将正式网页地址编入 MCP Apps。修改该地址后必须重新构建镜像并刷新 MCP 客户端资源；仅重启进程不足以更新 Apps。不要为数据库密码或 Token 新增 Docker ARG。

初次联调采用手动部署。后续如启用自动部署，将 `autoDeployTrigger` 改为 `checksPass`，仅在 `main` 检查通过后部署；无需另加 GitHub Actions 发布 Token 或部署 Hook。

## Vercel：Next.js 前端

| 项目设置 | 值 |
| --- | --- |
| Plan | Hobby，确认适用其使用条款 |
| Framework | Next.js |
| Root Directory | `apps/web` |
| Include source files outside Root Directory | 开启，共享包位于 `packages/` |
| Node.js | 24.x |
| Production Branch | `main` |
| Install / Build Command | 使用 `apps/web/vercel.json` |
| Output Directory | 保留 Next.js 默认 |
| Production `API_INTERNAL_URL` | `https://实际后端域名.onrender.com`，无末尾斜杠 |

`API_INTERNAL_URL` 同时用于服务端请求与构建时生成的 `/api/v1/*` rewrite。更改后需要重新部署前端。浏览器通过同源路径访问后端，无需新增通配 CORS。MCP 客户端直接连接 Render 的 `/mcp`，不经过前端代理。

不要为前端设置 `DATABASE_URL`、`MCP_SERVICE_TOKEN`，也不要给后端地址加 `NEXT_PUBLIC_` 前缀。Preview 不配置正式数据库对应的后端；若以后要测试 Preview，另配隔离的后端和数据库。当前未配置后端的 Preview 无法完成购物，不视为可用演示。

Git 集成部署与 GitHub Actions 测试彼此独立，不宣称 Vercel 默认等待 Actions。首次发布应选择已通过 CI 的提交；自动发布策略另在平台确认。

## 上线验收与回收

- Render `/api/v1/health` 成功后，再检查 Vercel 商品列表和详情；健康检查不能代替数据库、商品及交易验收。
- 在浏览器完成加购、修改数量、创建订单、模拟支付，并检查刷新后的订单状态；另建订单验证取消及库存释放。
- MCP 验证认证、搜索、加购、生单，确认 Apps 跳转到正式前端，最终支付仍由 Human 完成。
- 在专用演示数据上检查超过 15 分钟的未支付订单释放，不对云端运行会清库的 CI 测试。
- Render Free 空闲约 15 分钟会休眠，唤醒可能约一分钟，前端请求可能先超时。演示前先实际访问后端确认恢复。进程休眠期间到期任务不运行，恢复时由现有启动清理追赶；不宣称休眠期间仍保持秒级释放，也不新增保活任务。
- 到期释放任务持续访问数据库，Neon 可能在后端运行期间保持活跃；低访问量不等于零计算用量，应检查免费额度。
- 演示结束后停止服务、撤销 MCP Token，确认不再需要数据后再删除演示数据库和项目。删除数据需独立确认；仓库配置不会自动执行清理。

平台行为参考：[Render Docker](https://render.com/docs/docker)、[Blueprint](https://render.com/docs/blueprint-spec)、[免费实例限制](https://render.com/docs/free)、[Secret Files](https://render.com/docs/configure-environment-variables)、[Vercel 项目配置](https://vercel.com/docs/project-configuration/general-settings)、[Neon 方案](https://neon.com/pricing)。费用与额度以上线时各账户控制台为准。
