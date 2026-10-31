# Agent-Ready Store

面向人类与 AI Agent 的商店。用户可以直接在网页选购，也可以让 AI 搜索商品、比较规格、管理购物车并准备订单，最后由用户核对明细并完成支付。

网页与 Agent 共用商品查询、计价、库存和订单能力；MCP Apps 与网页进一步共享完整的购物界面和交互逻辑。

首次了解项目或评审交付，可直接打开[文档与展示站](https://agent-ready-store-docs.vercel.app)：从产品 Demo 进入需求演进、技术方案与 AI 工作流，再跳转到设计正文、正式 Spec 和验证证据，读完可返回原演示位置。

## 在线体验

| 入口 | 用途 |
| --- | --- |
| [在线商店](https://agent-ready-store.vercel.app) | 实际浏览商品、购物车与模拟支付，无需安装 |
| [文档与展示站](https://agent-ready-store-docs.vercel.app) | 项目导览与完整阅读链路 |
| [产品 Demo](https://agent-ready-store-docs.vercel.app/demo.html) | 网页与 Agent 购物流程的分步展示 |
| [章节讲解](https://agent-ready-store-docs.vercel.app/presentation.html?slide=authorization) | 需求与演进、技术方案、AI 工作流 |
| [完整文档](https://agent-ready-store-docs.vercel.app/library.html) | 设计方案、现行 Spec、历史归档与验证证据 |
| [API 健康检查](https://agent-ready-store-api.vercel.app/api/v1/health) | 查看后端服务是否可用 |

MCP 地址：`https://agent-ready-store-api.vercel.app/mcp`，需由项目维护者提供访问令牌，配置见下方 Agent 接入。商城使用模拟支付，不会真实扣款。

部署配置见[部署说明](docs/engineering/DEPLOYMENT.md)，文档站本地启动与发布设置见[文档站说明](site/README.md)。纯 Markdown 入口为[交付与体验导览](DELIVERY.md)。

## 功能

- **商品发现**：商品列表、规格、库存与评论查询，支持多目标分组搜索、简繁匹配和受控中英文别名。
- **持续购物车**：加购、改量、移除和勾选商品，同一购物车可创建多笔独立订单。
- **订单与库存**：创建订单时固定金额并预留库存15分钟，支持模拟支付、取消、到期释放及原单查询。
- **统一优惠**：满额减免、免运及 AI 购物折扣由服务端统一计算，所有入口展示一致的金额明细。
- **Agent 接入**：支持 MCP、WebMCP，以及通过 MCP Apps 在对话中展示商品和结算界面。

目前使用模拟支付，不包含账户、真实金流、退款或物流。购物车与订单按ID接续，适合本地体验与开发；尚不提供生产级顾客身份和访问隔离。

## 技术栈与目录

Next.js / React 提供网页，NestJS 承载 API 与 MCP，Prisma / PostgreSQL 保存交易数据，pnpm Workspaces 管理应用与共享包。

| 目录 | 内容 |
| --- | --- |
| [apps/web](apps/web/) | 网页路由、首屏渲染与 WebMCP 适配 |
| [apps/api](apps/api/) | 商品、购物车、订单、计价与 MCP 服务 |
| [apps/mcp-app](apps/mcp-app/) | MCP Apps 入口与 Host Bridge 适配 |
| [packages/commerce-ui](packages/commerce-ui/) | Web / Apps 共用页面、交互、控件与样式 |
| [packages/contracts](packages/contracts/) | 共享数据契约与输入校验 |
| [openspec](openspec/) | 功能规格与变更记录 |
| [site](site/) | VitePress 文档与展示站 |

## 本机开发

### 环境要求

- Node.js 24（`>=24.11 <25`）
- pnpm 12.11.2
- Docker 与 Docker Compose，用于运行 PostgreSQL；也可连接自行管理的 PostgreSQL
- 商品数据文件 `references/products.json`，或通过 `CATALOG_PATH` 指定路径

### 安装与配置

在仓库根目录安装依赖：

```sh
pnpm install --frozen-lockfile
```

首次配置时，将 [.env.example](.env.example) 复制为 `.env`；已有配置无需覆盖。修改以下变量：

| 变量 | 用途 |
| --- | --- |
| `POSTGRES_PASSWORD` | 本地 PostgreSQL 密码 |
| `DATABASE_URL` | 数据库连接地址，密码需与上项一致；特殊字符需 URL 编码 |
| `MCP_SERVICE_TOKEN` | MCP 服务认证 Token，使用至少24字符的随机值 |
| `WEB_ORIGIN` | 网页地址，默认 `http://localhost:3000` |
| `MCP_ALLOWED_HOSTS` | MCP 请求允许的 Host，默认本机3002端口 |

可用 `openssl rand -hex 32` 生成 Token。`.env` 包含本机凭证，不应提交到 Git。

### 初始化与启动

以下初始化步骤适用于**全新空数据库**：

```sh
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

本机启动后访问：

| 入口 | 默认地址 |
| --- | --- |
| 商店网页 | [localhost:3000](http://localhost:3000) |
| API 健康检查 | [localhost:3002/api/v1/health](http://localhost:3002/api/v1/health) |
| MCP | `http://localhost:3002/mcp` |

日常开发只需 `pnpm db:up` 和 `pnpm dev`；数据库已运行时直接执行 `pnpm dev`。启动脚本读取根目录 `.env`，准备必要构建产物并监听 Web、API 与 Apps 的修改，不会自动迁移或导入数据。

按 Ctrl+C 停止应用，`pnpm db:down` 停止开发数据库并保留数据卷。已有数据库不要重复清空或执行 seed；从旧订单流程升级时，先参阅[数据库切换说明](docs/engineering/TOOLING.md#订单生命周期受控切换入口)。

## Agent 接入

在线体验时，在支持 MCP Streamable HTTP 的客户端中配置：

```text
URL: https://agent-ready-store-api.vercel.app/mcp
Authorization: Bearer <MCP_SERVICE_TOKEN>
```

线上连接使用项目维护者提供的令牌。本机开发时，将 URL 改为 `http://localhost:3002/mcp` 并使用本机配置的令牌；客户端需要能访问运行服务的机器。MCP 提供查询、购物车和订单工具；支持 MCP Apps 的客户端可在对话中展示商品与结算卡片，无需另建连接。不支持 Apps 时，仍可使用 MCP 工具，并通过网页完成支付。

WebMCP 为支持该能力的浏览器 Agent 提供页面工具；其他浏览器仍可使用普通网页。Agent 可按明确购买意图准备订单，最终支付由用户在网页或内嵌界面完成。

具体配置、工具参数与客户端兼容说明见 [MCP 接入指南](docs/engineering/MCP_CONNECT.md)。

## 测试与检查

```sh
pnpm test          # 单元测试及具备环境条件的集成测试
pnpm typecheck     # TypeScript 类型检查
pnpm lint          # 代码规范
pnpm format:check  # 格式检查
pnpm build         # 生产构建
```

数据库、HTTP 和 MCP 集成测试需要隔离的 `store_test` 数据库及测试 API；未提供对应环境时部分用例会跳过。会重置数据的套件应串行执行，不使用日常开发库。完整集成环境及执行命令见 [CI 配置](.github/workflows/ci.yml)。

浏览器测试使用本机 Chrome；先启动应用，再运行 `WEB_BASE_URL=http://localhost:3000 pnpm test:e2e`。交易集成另需隔离测试环境及 `CHECKOUT_INTEGRATION=1`；其他参数见 [Playwright 配置](playwright.config.ts)与[e2e用例](e2e/)。

## 构建与运行

本机生产模式：

```sh
pnpm db:generate
pnpm build
pnpm start
```

`start` 只运行构建产物。修改 `WEB_ORIGIN` 后需要重新构建 Apps，并刷新客户端连接以加载新资源。

使用 Docker Compose 运行全套服务时，先完成 `.env` 配置。以下命令同样适用于全新空数据库：

```sh
pnpm build:docker
docker compose up -d --wait db
pnpm db:migrate:docker
pnpm db:seed:docker
pnpm start:docker
```

[compose.yaml](compose.yaml) 只向本机暴露 Web 与 API 端口；商品目录从 `references/` 只读挂载，不打入镜像。Compose 与本机开发使用独立数据卷。日常启动不需要重复迁移或 seed；停止服务可用 `docker compose down`，保留数据时不要加 `--volumes`。

云端演示部署采用 Vercel 前后端与 Neon PostgreSQL，配置与操作顺序见[部署指南](docs/engineering/DEPLOYMENT.md)。

## 更多文档

- [在线展示与文档](https://agent-ready-store-docs.vercel.app)：产品 Demo、章节图解、设计正文与证据；[旧版离线展示](presentation/index.html)保留。

- [产品需求](docs/product/REQUIREMENTS.md)与[产品设计](docs/product/PRODUCT_DESIGN.md)：功能、用户流程和交互约定。
- [产品决策](DECISIONS.md)：需求理解、业务取舍与 PM 沟通。
- [总体技术设计](docs/engineering/TECHNICAL_DESIGN.md)：系统全景、全局约束及详细设计入口；[工程决策](docs/engineering/ENGINEERING_DECISIONS.md)记录选型与取舍。
- [前端详细设计](docs/engineering/FRONTEND_DESIGN.md)与[后端详细设计](docs/engineering/BACKEND_DESIGN.md)：交互与跨端复用、服务契约与运行边界。
- [交易核心](docs/engineering/CHECKOUT_CORE.md)：订单、库存与失败恢复。
- [协作入口](AGENTS.md)与[AI_NOTES](AI_NOTES.md)：开发约定与 AI 协作经验。
- [交付状态](docs/engineering/DELIVERY_STATUS.md)：实现范围、验证记录和已知限制。
