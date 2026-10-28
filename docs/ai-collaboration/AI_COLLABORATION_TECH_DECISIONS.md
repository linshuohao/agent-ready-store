# Agent-Ready Store — AI 协作补充记录：技术方案与 Agent 接入

> **类型**：AI Collaboration Evidence / ChatGPT 讨论摘要  
> **来源**：Human + ChatGPT 本轮技术讨论（截至 2026-10-29）；不是 Codex 的实施日志或独立验证报告。  
> **状态**：待 Codex 入库与证据链接核对。  
> **记录原则**：区分 AI 的建议、Human 的明确决定和仍未验证的实现假设；不把对话归纳冒充原文逐字转录，也不声称已经交付代码或通过测试。

## 1. 背景

原任务是面向 Sr. Frontend Engineer 的 Agent-Ready Store Home Quiz。已有产品决策与 UI/UX 设计方向，接下来需要选择适合的技术栈与 Agent 接入方式。Human 希望展示更完整的前后端和 Agent 工程能力，但担心 Next.js + NestJS、完整数据库建模与基础设施会使一份虚拟商品、虚拟交易的作业变成不必要的大型项目。商品目录由原始 `references/products.json` 提供；真正有展示价值的是 **Agent 能实际操作、Human 知道自己买什么、交接后形成可验证的模拟订单和库存变化**。

## 2. 候选与取舍

| 议题 | 讨论过的候选 | 主要取舍 |
| --- | --- | --- |
| Web / API 形态 | Next.js 全栈单体；Next.js + NestJS；React + Vite + Fastify；React + Vite + NestJS | Next.js 的 SSR/BFF 不是题目的必要条件；双重服务端框架增加集成成本。轻量 Fastify 足够实现，但 Human 对 NestJS 更熟悉，有利于交付和展示后端工程能力。 |
| 系统深度 | 纯前端 Mock；最小真实全栈；生产式完整电商 | 纯前端难以真实演示 Agent 共享购物车、订单与库存变化；完整电商模型、支付、账号、物流等与作业收益不成比例。 |
| 存储 | 商品全部入库；JSON 商品目录 + 最小交易持久化；SQLite/FastAPI；Prisma + PostgreSQL | 免建商品、分类、评论表；用户熟悉 Prisma/PostgreSQL，熟悉栈的总体成本可能低于引入新栈。 |
| 并发与基础设施 | 复杂缓存、锁、消息队列、微服务；最小事务、原子库存更新、幂等 | 虚拟交易不要求生产级吞吐，但承诺的“订单与库存一起成功或失败、重试不重复购买”仍需真实保障。 |
| Agent 协议 | 仅 HTTP 工具；基础 MCP；MCP Apps；WebMCP | 统一业务内核、多入口 Adapter；协议扩展工作相对可控，但 Host 兼容性与端到端验证不能被忽略。 |
| MCP 体验 | 只返回 Checkout URL；结构化购物车摘要 + URL；交互式 MCP Apps | 链接单独返回不能让用户理解商品与价格；基础 MCP 本身就应返回商品、数量、优惠及报价摘要，Apps 是体验增强。 |
| 部署 | 必须在线；仅本地；本地优先、后续再决定在线 | 以本地可复现的 Codex Agent 演示为 MVP 验收，避免云服务和公网连通性阻塞核心实现。 |

## 3. AI 建议（按实际讨论演进）

1. 初期建议优先最小化框架组合，比较过 Next.js 全栈、Fastify 与 NestJS；在 Human 提出熟悉度约束后，转而建议 **React + Vite + NestJS + Prisma + PostgreSQL**，将精简重点从技术栈切换到业务范围。
2. 建议商品、规格和评论直接读取原始 JSON；图片由前端静态资源按 Product ID 映射；只持久化购物车、Handoff、模拟库存和订单快照。
3. 建议以一个短事务、条件库存扣减、购物车/订单幂等约束覆盖基本正确性，不引入 Redis、MQ、分布式锁、复杂 DDD、真实支付或登录系统。
4. 对 Agent 接入先建议 **MCP + Hosted Checkout 为 MVP，MCP Apps 优先增强，WebMCP 可选**，后来根据 Human 对复用与展示价值的判断，将 WebMCP 和 MCP Apps 纳入渐进实施计划，但不作为基础闭环的阻塞条件。
5. 建议 MCP Apps 复用已有 React 商品卡片、购物车摘要和金额明细，通过轻量 UI 入口和 Host Bridge 接入，不复制整套移动端商城。
6. 建议 pnpm Monorepo、NestJS 内置 Streamable HTTP MCP，WebMCP 使用页面已有搜索、详情、加购、购物车操作逻辑；协议适配不各自重做商务规则。
7. 最初建议禁止 Agent 调用最终下单；在 Human 提出“有效人工授权后 Agent 也可确认订单”后，改为区分 **代理准备购物** 与 **针对具体购买内容的有效授权**，建议 MVP 仍采用 Hosted Checkout 直接确认，Agent 代提交作为后续增强。

以上均为 ChatGPT 的建议和讨论过程，不代表 Codex 已实现或验证。

## 4. Human 判断与纠偏

- **反对为了技术栈完整性而做重系统**：Human 虽然希望展示 Next.js + NestJS，但认为作业复杂度不值得，要求先比较实际工程价值。
- **强调熟悉技术的交付收益**：Human 指出自己熟悉 NestJS、Prisma、PostgreSQL，不熟悉 FastAPI/SQLite；最终倾向使用熟悉栈，同时要求后端尽可能薄。
- **缩小业务复杂度而不缩小真实演示**：Human 强调虚拟商品与虚拟支付不需要生产电商完整体系，但希望有真实可观察的购物车、订单、库存状态变化。
- **控制投入产出**：Human 询问并发、缓存、事务的投入价值，接受最小正确性而非生产级性能治理。
- **扩大可复用 Agent 入口**：Human 认为协议 Adapter 复用统一能力，增加 MCP/WebMCP 适配成本可控，不必为了省几个工具而削弱展示；MCP 的文本摘要应足够丰富，MCP Apps 复用已有 Web 组件。
- **确认实施与架构边界**：Human 明确确认本地优先、MCP + Hosted Checkout 的基础闭环、后续优先验证 MCP Apps；以及 pnpm Monorepo、NestJS 内置 Streamable HTTP、WebMCP 页面级能力。
- **纠正 Agent 授权原则的绝对禁止**：Human 提出只要最终订单得到人的明确授权，Agent 代为提交没有原则问题；因此不能继续将“Agent 永远不能提交订单”作为最终业务原则。
- **明确 ChatGPT / Codex 分工**：Human 要求关键决策在 ChatGPT 完成，再交 Codex 归档与实施；不让 Codex 自行替 Human 批准架构选择。

## 5. 最终决定与当前边界

### 5.1 已经由 Human 明确确认的方向

| 主题 | 当前结论 | 状态说明 |
| --- | --- | --- |
| 项目范围 | **最小真实全栈**；完整 Web 购物体验 + 薄后端 + 可验证的虚拟交易状态 | Accepted |
| 基础 Agent 闭环 | Codex 作为演示 Host，**MCP Tools + Hosted Checkout**；本地可复现优先 | Accepted |
| 后续增强 | 优先验证 **MCP Apps** 与既有 React 组件复用；WebMCP 进入渐进实施规划，独立验证 | Accepted 的规划方向；不宣称 Host 兼容性已验证 |
| 架构组织 | **pnpm Monorepo**：`apps/web`、`apps/api`、`packages/contracts`；UI 按需抽取 | Accepted |
| MCP Server | NestJS 应用内置 **Streamable HTTP MCP**，调用同一套 Commerce 能力 | Accepted |
| WebMCP 边界 | 页面级搜索、详情、加购、购物车编辑；**不暴露最终下单工具** | Accepted（针对 WebMCP） |
| 技术栈 | React + Vite + TypeScript；NestJS；Prisma + PostgreSQL | 讨论中 Human 接受推荐方向；待仓库状态核对 |
| 数据源 | 原始 `products.json` 只读商品目录，商品图片使用前端静态资源按 ID 映射 | 讨论中接受的推荐方向 |
| 最小交易模型 | 初始以 **Cart / Inventory / Order 三张核心表** 为方案；Handoff 合并 Cart，条目/快照可用 JSON | Human 表示其他按推荐方案推进；字段、约束仍属设计细节 |
| 交易正确性 | 短事务、条件库存更新、模拟订单持久化及同车幂等；不引入 Redis、MQ、微服务、真实支付与登录 | 已确认的范围边界；尚未实现 |
| 提交授权 | **Human 必须对具体购买内容明确授权**；Human 可直接提交，Agent 在有效授权后可代提交 | 原则已确认；具体技术机制待后续设计，MVP 默认 Human 在 Hosted Checkout 直接确认 |

### 5.2 必须显式保留的冲突与待验证项

- **产品决策同步**：旧 D-01 及关联 Checkout/Agent 工具边界可能被解读成 Agent 绝对不可提交；新原则是“授权优先于操作者身份”。需要按现有 Human Approval 流程提出产品决策修订，**不能静默覆盖旧 Approved 文档**。
- **代提交非 MVP 必做**：服务端可验证、与具体购物车/报价版本绑定的授权凭证仍需要设计。不能把 Agent 输出的 `userApproved: true`、聊天口头同意或页面上无区分权限的按钮等同于技术验证的授权。
- **MCP Apps / WebMCP**：实现计划不等于已在目标 Agent Host、浏览器中完成兼容测试；Codex 的 MCP Tool 调用能力与 MCP Apps iframe 展示能力应分别验收。
- **部署**：先用本地 Compose 和 Codex 验证，公网托管及免费资源选择后置。
- **工程事实**：截至本摘要生成时，不能据聊天推断 Prisma 迁移、MCP Tool、订单事务、浏览器 Agent 集成、自动化测试或 CI 已经实现/通过。

## 6. 证据与追溯

以下证据均为**本次对话中的具体讨论/明确确认**，不是伪造的 Commit、PR 或测试记录。Codex 入库时应将其映射到仓库内真实存在的文档与决策 ID；不存在则标注“对话摘要提供，仓库证据待补”。

| 证据编号 | 本次 ChatGPT 对话中可定位的锚点 | 支持的结论 |
| --- | --- | --- |
| E-T01 | Human：“我特别想做一个完善的 Next.js + NestJS 的应用……它好像必要性不是特别大” | 对双框架过重和能力展示目标的取舍 |
| E-T02 | Human：“我觉得其实用 Prisma ORM + PostgresSQL 也挺好的，这个是我比较熟悉的。再加上 Nest……” | 熟悉栈降低实际交付风险 |
| E-T03 | Human：“后端的能让它尽可能少做一点……这里是虚拟交易，加上虚拟数据” | 薄后端、排除完整电商业务 |
| E-T04 | Human：“关于 Agent 怎么去做调用，我觉得如果有一些真实的数据变更，整个用例会比较真实一点” | 最小持久化购物车、订单和模拟库存 |
| E-T05 | Human：“像并发、缓存、事务之类的……产出跟投入之间的能效是要考虑的” | 最小事务/幂等、排除额外缓存基础设施 |
| E-T06 | Human 提案：“MCP + MCP Apps + WebMCP 的渐进式能力暴露方案” | 统一 Commerce API / UseCase，多协议 Adapter |
| E-T07 | Human：“MCP Apps……是否可以是原先应用的一个移动端展示或者部分组件展示” | 复用 Web 展示组件的动机 |
| E-T08 | Human：“展示应该会使用 codex” | Codex 为主要 Agent 演示 Host |
| E-T09 | Human：“技术范围决策：MVP 采用最小真实全栈、MCP + Hosted Checkout。运行方式：本地优先……MCP Apps 及 UI 组件复用” | 阶段范围明确确认 |
| E-T10 | Human：“MCP 工具……不如都接好了……Codex 和 Web MCP 同时展示……MCP 的话就那 5 个工具” | 更多 Adapter + 有限统一业务能力、完整摘要而非仅 URL |
| E-T11 | Human：“确认 T-ARCH 架构决策：项目组织 pnpm Monorepo……MCP 服务 NestJS 内置 Streamable HTTP；WebMCP 页面级……” | 具体架构决策明确确认 |
| E-T12 | Human：“Agent 的授权边界，其实只要在最终确认订单的时候，有人的授权让 Agent 来确认订单……” | 允许授权后 Agent 代提交的原则变化 |
| E-T13 | Human：“我们的决策流程不是在 ChatGPT 上面去实现吗？先让 Codex 归档……” | Human + ChatGPT 决策、Codex 归档及实施的职责边界 |

### Codex 归档建议（非执行指令）

1. 将本文作为来源明确的 **AI 协作过程补充证据** 归档，供 `AI_NOTES.md` 精选案例引用；避免与技术决策文档重复维护第二套权威结论。
2. 技术决策实际状态以仓库对应 `TECH_DECISIONS.md` 与产品 Approved 记录为准；若与本文不一致，报告冲突供 Human 裁决。
3. 推荐从本文提炼 **一至两个** AI Notes 案例：① 技术栈与 Scope 从“完整框架”收敛到“薄后端 + 真实闭环”；② Agent 接入从“只返回链接/只准 Human 提交”演进到“丰富摘要 + 多 Adapter + 明确授权原则”。
4. 不把本文所述的未来功能写成已完工的 AI Coding / 测试结果。
