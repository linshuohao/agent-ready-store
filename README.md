# Agent-Ready Store

**接入术语说明：** MCP 与 WebMCP 是两类 Agent 接入；MCP Apps 是 MCP 的 UI 增强，不兼容时降级为无 Apps UI 的 MCP。协议、连接和构建关系见 [Technical Design §1.1](docs/engineering/TECHNICAL_DESIGN.md#11-系统全景与请求路径)。本次统一术语不改变历史批准、业务行为与尚未完成的验证事实。

本机`store`已于2026-10-31按Human明确授权完成清理和新流程迁移，新实施版本运行于`http://localhost:3000`。当前分支尚未合并，请勿用main旧服务写入新库。清理脚本默认测试库限制以外的本机显式准入及执行记录见[TOOLING](docs/engineering/TOOLING.md)和当前Tasks。

面向人类与 AI Agent 的商店：普通 Web、基础 MCP、WebMCP 和 MCP Apps 共用商品、持久购物车与独立订单能力。

当前增量为 [checkout-lifecycle-redesign](openspec/changes/checkout-lifecycle-redesign/proposal.md)。实现、验证、审批及剩余任务以 [Tasks](openspec/changes/checkout-lifecycle-redesign/tasks.md) 为准，交付差距见 [DELIVERY_STATUS](docs/engineering/DELIVERY_STATUS.md)。旧 Review / Token / 原生批准购买流程已退出，新工具需要重新发现；历史成果保留在 [OpenSpec 归档](openspec/changes/archive/)，不作为当前使用说明。

## 购物与 Agent 入口

购物车持续选购，可保留多笔订单。选择整行商品后建立待支付订单，固定金额并预留库存15分钟；Human在原订单上点击模拟支付。取消或到期释放预留，不自动将商品放回车中。创建未知沿原请求键恢复，支付未知只查原订单，不另建单。

- 普通 Web：商品页加购，购物车选行、生单，`/orders/{orderId}`核对和支付。跨车继续购物需明确确认；分享入口只展示该订单。
- 基础 MCP：明确完整购买目标后生单，返回网页订单入口；没有面向模型的支付工具。连接、工具与意图约束见 [MCP_CONNECT](docs/engineering/MCP_CONNECT.md)。
- WebMCP：页面工具复用 Web Commands；加购通常展示车，购买直接导航原单。无支持能力的浏览器仍可普通购物。
- MCP Apps：静态资源及 Host Bridge 提供内嵌购物、原单摘要和 Human 点击支付；不直接获取网站 Cookie 或服务 Token。替身 Host 自动化与真实 Host/Human 验收分开记录。

实现和恢复键说明见 [CHECKOUT_CORE](docs/engineering/CHECKOUT_CORE.md)。本项目是 Demo：ID 接续、分享视图和 app-only 可见性不是顾客身份或访问控制；不能宣称防御恶意 Host 或证明点击者为自然人。

## 本机开发

使用 Node 24（>=24.11 <25）与 pnpm 12.11.2。Web/API在本机运行，PostgreSQL可由Docker提供。仅首次新环境：

1. 没有 `.env` 时复制 `.env.example`；已有文件不要覆盖。配置数据库口令、`DATABASE_URL`、随机 `MCP_SERVICE_TOKEN`、`WEB_ORIGIN` 和 `MCP_ALLOWED_HOSTS`，不要提交秘密。
2. `DATABASE_URL` 默认形如 `postgresql://store:<URL编码后的密码>@127.0.0.1:5432/store`。浏览器地址须与 `WEB_ORIGIN` 一致。
3. 对全新空库执行：

```sh
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

**已有旧流程数据库不能直接照此迁移。** 必须按 [受控切换说明](docs/engineering/TOOLING.md)准备具体目标、停写、清理清单与恢复方案，取得对应执行授权。当前清理脚本只允许隔离 `store_test`；不会自动切换业务库。已有新流程数据不得重复清空或seed，只能停写后前向修复。

日常运行 `pnpm db:up && pnpm dev`，数据库已运行时只需 `pnpm dev`。入口加载根 `.env`，自动生成必要产物并监听Web/API/Apps；不会自动迁移或seed。默认 Web为`http://localhost:3000`，API健康检查为`http://localhost:3002/api/v1/health`，MCP为`http://localhost:3002/mcp`。端口通过`WEB_PORT`/`API_PUBLIC_PORT`配置，并同步Origin/Host白名单。

Ctrl+C停止本次应用；`pnpm db:down`停止开发数据库但保留卷，禁止用`down -v`清理已有部署。开发卷`agent-ready-store-local_inventory`与交付卷`agent-ready-store_inventory`独立。`CATALOG_PATH`默认指向只读原件，原件不得上传或打入镜像。

生产预览运行`pnpm db:generate && pnpm build && pnpm start`。`start`只运行构建产物；Apps资源编入`WEB_ORIGIN`，改变配置后须重建、刷新Host资源。单独API构建会清理dist，随后须重新构建Apps。

## Docker 交付

`compose.yaml`使用同一生产镜像运行API/Web，只读挂载`references/`，不将原件或源码打入交付镜像。`pnpm build:docker`只构建，不切换数据库；`pnpm start:docker`不隐式构建、迁移或seed。镜像构建与交付运行证据见当前Tasks，不等同发布。

全新空环境可依次启动db、执行`pnpm db:migrate:docker`、一次性`pnpm db:seed:docker`，再启动应用。旧流程升级须先经过上述受控切换审批；新流程升级保持数据，停写后执行兼容迁移。迁移失败保持写服务停止，前向排障，不恢复旧写服务或重清新订单。`IMAGE_TAG`须在构建、迁移和运行时一致。

默认仅暴露loopback Web3000/API3002，数据库无宿主映射；公网/TLS/发布不在当前授权范围。不得删除业务卷。`MAX_PENDING_ORDERS_PER_CART`默认10，降低配置不会取消已有订单。

## 验证与协作

基础检查：`pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build`。真实PostgreSQL/HTTP/MCP测试使用隔离`store_test`及测试API，串行执行会清理测试数据的套件；无环境时skip不算通过。浏览器新购物集成需`CHECKOUT_INTEGRATION=1`和匹配的`WEB_BASE_URL`，Apps替身Host另列；具体命令、端口及结果见Tasks。

协作从 [AGENTS](AGENTS.md) 与 [Workflow Skill](.agents/skills/ai-native-workflow/SKILL.md)进入，按需使用 [Review Skill](.agents/skills/ai-native-review/SKILL.md)。OpenSpec是唯一变更级规格和任务来源。当前本地分支工作不代表Push、Merge、发布或最终验收已获批准。

## 文档导航

| 入口 | 职责 |
| --- | --- |
| [Requirements](docs/product/REQUIREMENTS.md) / [Product Design](docs/product/PRODUCT_DESIGN.md) | 产品行为与体验基线 |
| [Technical Design](docs/engineering/TECHNICAL_DESIGN.md) / [Engineering Decisions](docs/engineering/ENGINEERING_DECISIONS.md) | 技术方案、选择与批准范围 |
| [DECISIONS](DECISIONS.md) | 产品取舍与Human判断 |
| [TOOLING](docs/engineering/TOOLING.md) | 工具、迁移与运行入口 |
| [AI_NOTES](AI_NOTES.md) | 精选真实协作时刻 |
| [设计预览](design/index.html) | 设计资产导航 |
| [Workflow讲解](docs/presentation/ai-native-workflow.html) | 离线讲解页，不是业务批准或最终Showcase |

正式Spec同步、真实三入口Host/Human验收与残余风险接受仍按当前Change办理；不以历史归档或自动化通过代替。
