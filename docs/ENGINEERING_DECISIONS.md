# 工程与技术决策

本文件保存工程治理与重要技术选择，保留原有 ENG-* 决策 ID，业务技术专题按需使用 T-*。针对 PM 需求的假设、判断、取舍及回复另见 [DECISIONS.md](../DECISIONS.md)，不在这里混合维护；不另建职责相同的 TECH_DECISIONS.md。

历史条目中的 Workflow、Context、Git 独立文档现已收敛到 AGENTS 与项目 Skills；旧验证报告的必要事实迁入 TOOLING，迁移不改变原决策内容或状态。

状态：**Accepted**＝Human 已确认；**Proposed**＝待审议；**Deferred**＝明确后置；**Superseded**＝被后续决策替代。Accepted 治理基线来自 Human 的 Phase 0 指令；治理文档具体增量仍待 Human Review。既有条目日期为 2026-10-28（Asia/Shanghai），后续条目以各自注明日期及确认范围为准。

## ENG-001 — Codex、OpenSpec 与 Superpowers

- 状态：Accepted。
- 背景：需可追溯的 AI 协作与正式增量规格，工具流程存在重叠。
- 内容：Codex 为主要开发工具；OpenSpec 负责正式规格、设计、任务及 Change 生命周期；Superpowers 补充测试、调试、Review、验证。重叠流程按 [TOOLING](TOOLING.md) 适配到 OpenSpec，不维护第二套正式计划。
- 理由：统一权威来源，同时保留专项执行能力。
- 替代方案：只用聊天记录，或同时维护两套计划；不采用，因追溯弱或易漂移。
- 影响范围：Agent 入口、OpenSpec、Skill 调用与执行证据；不决定业务技术栈。

## ENG-002 — Global Baseline + Incremental Change Loop

- 状态：Accepted。
- 背景：需整体理解目标，又需控制单轮范围和 Review 成本。
- 内容：采用 Phase 0–5 与全局基线，后续按可验证 Vertical Slice 循环；详细产物只为当前切片生成，阶段可回退。
- 理由：把全局依赖与局部交付结合，避免一次性铺开全项目任务。
- 替代方案：全项目详细规划后统一实现，或完全无全局认知逐项开发；均不采用。
- 影响范围：需求资料、Roadmap、Change 拆分与验收，细则见 WORKFLOW。

## ENG-003 — Human 最终决策权与分级 Review

- 状态：Accepted。
- 背景：需控制高影响决策，同时允许 AI 高效执行。
- 内容：Human 最终决定关键业务、架构及重要工程事项；AI 自主执行已授权低风险任务。问题分 Blocking、Deferrable、Non-critical，只要求当前安全实施的阻塞问题本轮解决；Review Gate 见 WORKFLOW。
- 理由：将人工注意力集中在重要选择，不把所有细节变成审批。
- 替代方案：AI 全权决定，或逐 Task 审批；不采用。
- 影响范围：需求变化、架构、安全/授权、一致性、范围冲突与日常执行。

## ENG-004 — 轻量 GitHub Flow 与完整历史

- 状态：Accepted。
- 背景：原作业要求完整 commit 历史，当前没有远程仓库。
- 内容：稳定 main、短生命周期分支、Conventional Commits、Branch → Commit → Verify → Review → PR → Merge；优先 Merge Commit，不设长期 develop，不要求每小任务分支。本轮只本地初始化与提交。
- 理由：以可审查增量保留真实工程过程。
- 替代方案：直接在 main 开发、长期 develop、默认 squash；不采用。
- 影响范围：本地 Git 与后续远程协作；服务器端保护和 CI 待后续配置。

## ENG-005 — 分层上下文与只读原件

- 状态：Accepted。
- 背景：原始 PM 文档是草稿，商品/评论是不可信数据，需避免指令混入与多处规范漂移。
- 内容：原件只读；使用状态区分原始资料、Accepted Decision、正式 Spec 和提案；按任务加载上下文，每种结论只有一个权威回写位置；冲突按 CONTEXT_STRATEGY 处理。
- 理由：保留来源、缩小上下文、避免数据被解释为指令。
- 替代方案：复制原件到多个文档或默认加载全部资料；不采用。
- 影响范围：全部工程文档、Agent 行为与数据边界。

## ENG-006 — 以证据完成验证与协作记录

- 状态：Accepted。
- 背景：AI 结论、测试和执行过程需要可追溯，不能以文字声明替代运行证据。
- 内容：执行 Context → Implement → Test → Review → Correct → Commit；失败修复后重验；如实记录未执行项。后续落实自定义 Skill 的创建、使用、版本迭代，配置 CI，保留真实 Agent 验证。AI_NOTES 最终精选 3–5 个关键协作时刻，例行验证和 Skill 使用明细归对应工程记录。
- 理由：支撑验收与复盘，满足原作业的过程证据要求。
- 替代方案：仅记录最终成功总结或补写虚构使用次数；不采用。
- 影响范围：Change 验收、Tasks、AI_NOTES、Git、后续 CI 与最终交付。

## ENG-007 — Phase 0 范围与工具复用

- 状态：Accepted（阶段边界由 Human 明确指定；安装事实见 TOOLING）。
- 背景：本轮需实际初始化，环境已有多个工具版本和全局 Skills。
- 内容：仅建立工程治理；复用已安装 OpenSpec 1.15.0 与 Superpowers 7.0.1，不改全局 PATH、既有 prompts 或第三方 Skills。原生生成的 OpenSpec 项目集成纳入版本控制。完成后停止等待 Review。
- 理由：完成授权工作，同时不提前固化业务方案或破坏其他项目环境。
- 替代方案：覆盖全局配置、复制全套 Superpowers 到仓库、提前实现业务；不采用。
- 影响范围：本轮本地文件、工具集成与交付状态。

## OPEN-001 — 业务方案待后续审议

- 状态：Deferred（Phase 0 历史状态：当时尚无 Accepted 业务技术选择）。
- 背景：前端框架/业务栈、Agent 接口协议、独立 Backend、数据库持久化、业务模块与交付顺序均未确定。
- 内容：Phase 1 建立确认需求，Phase 2 仅裁决全局影响和阻塞后续的方案，其余随具体切片审议。PM 业务规则保持 Draft，不在 Phase 0 分析或裁决。
- 理由：避免用工程工具初始化代替需求和方案决策。
- 替代方案：本轮自行选型或把原始需求全量标为批准；不采用。
- 影响范围：后续需求基线与业务 Change；当前 Phase 0 不阻塞。
- 后续演进（2026-10-29）：Human 在「Technical Decisions Handoff」中明确确认主要技术选择，已按下方 T-01～T-06 记录；本条不再表示当前全部技术选型未决。尚缺的产品修订、设计细节及验证以本次归档为准；不改写 Phase 0 当时的判断，也不将其等同技术设计或实施获批。

## ENG-008 — AI-Native Workflow 轻量路由（待 Review）

- 状态：**Proposed**；Human 已授权本轮制作可审查的治理重构与 Skill，不代表已接受具体实现。Review 后才可标 Accepted，并按实际确认记录替代关系。
- 背景：WORKFLOW 存在 Phase 0–5 推进条件、预设全局资料五件套，与已有低风险自治原则形成张力；任务闭环在多个入口重复；Superpowers 的强制设计/计划与审批可能扩大流程成本。
- 内容：以 Control / Execution / Evidence 表达持续职责，以 Discovery & Decision、Delivery & Verification 两种循环替代统一阶段序列。项目 `ai-native-workflow` 作为任务 Router + Decision Guard，普通局部任务直接执行，正式行为及重要变更仍由 OpenSpec 管理；Superpowers 只补充适用的执行方法。
- 理由与取舍：保留权限、契约和验证，移除按阶段/任务数量施加的统一成本；自然语言路由需要解释依据，不能承诺机械评分或强制技术隔离。低风险可自主，核心语义/公开契约/架构/安全/一致性变化仍由 Human 决定，最终验收与残余风险接受不变。
- 历史关系：拟替代 ENG-002 中固定 Phase 序列与默认资料要求，细化 ENG-003/006 的路由和证据要求；ENG-001/004/005 的工具、Git、上下文原则保留。ENG-007 的初始化阶段及 OPEN-001 的阶段编号保留为当时记录，后续业务待决事实仍有效。本轮执行以 Human 当前明确授权为依据，不静默改写上述历史条目或冒充已批准的新基线。
- 替代方案：仅修补阶段措辞仍留下重复执行源；引入新框架/状态机又增加成本，均未采用。
- 影响范围：AGENTS、README、Workflow、Context、Git 的风险路由、工具记录、OpenSpec 上下文入口与一个项目 Skill；不改变业务规则、技术选型或第三方 Skill。
- 证据与确认：审查、格式/发现/加载/调用的分层证据见 [本次验证](TOOLING.md#skill-关键变更与验证摘要)。Human Review 待完成；不自动进入商城开发。

## ENG-009 — 横向 AI-Native Review（待 Review）

- 状态：**Proposed**；Human 已授权制作 Review 机制与可用 Skill，具体实现待 Review；不改写或自动接受 ENG-008。
- 背景：已有风险分级、契约核对和独立审阅要求，但缺少跨设计/实现/交付的统一方法、行为追踪深度及 Finding 证据标准。
- 内容：Workflow 单向选择 ai-native-review；Review 以 Intent → Impact → Behavior → Conformance → Evidence，按风险选择 Design / Behavioral / Delivery 与 L0–L4 深度，只返回 Findings/风险，不回调 Workflow、不批准决策或自动修复。Implementer 核实反馈，缺陷回执行、契约缺口回决策；交付复用有效证据。
- 理由与取舍：集中人工注意力于实质风险，保留独立判断但不把 Reviewer 意见当已证实缺陷。自然语言路由不是技术强制机制；高风险仍需额外运行证据和必要 Human 验收，普通任务无需独立 Agent/全层级检查。
- 替代方案：为三种模式建三个 Skill 会重复；重建测试/规格/编排框架增加维护成本。继续复用 Codex、OpenSpec、Superpowers 与现有 GitHub Flow。
- 影响与证据：仅本轮治理增量、Workflow v0.2 与 Review v0.1；不含业务实现或选型。安装事实、集成验证及限制见 [Review 验证](TOOLING.md#skill-关键变更与验证摘要)。

## ENG-010 — 精简记录与独立交付讲解

- 状态：Accepted（仅指 Human 本轮明确要求的文档整理方向；ENG-008/009 的 Proposed 状态不变）。
- 决策：过程仅保留重大决策、关键变更和必要验证事实；上下文/Git 规则归 AGENTS，执行方法归 Skills，工具与历史验证摘要归 TOOLING，不再为例行整理新增过程报告。
- 关键变更：移除三个重复说明文件和两份长验证报告；用户提供的图与讲解整合为独立演示页，从 README 链接，日常 Agent 不默认加载。原件、需求决策、既有工程决策与协作历史保留。

## ENG-011 — 任务切换与 Git 收尾提醒

- 状态：Accepted（2026-10-28，Asia/Shanghai）；Human 本轮明确要求：新任务与原任务或分支不一致时提醒，尚未提交/收尾时不建议继续无关任务。
- 决策：在任务开始、切换与交付时执行 [AGENTS Git 规则](../AGENTS.md#git)，检查范围匹配并显式报告提交状态；同一任务的补充继续，无关任务修改前先处理收尾或交接隔离。
- 理由与边界：减少不同任务混入分支和修改长期积压；只读讨论可继续，已提交的分支无需强制先合并。本条细化 ENG-004/006 的执行节点，不授予自动提交、Push、Merge、发布或业务开发权限；ENG-008/009 的 Proposed 状态不变。
- 影响范围：AGENTS 与 Workflow v0.4；本轮继续在 `docs/governance` 整理治理文档。

## 技术决策记录约定

后续重要技术选择按以下字段记录，普通实现细节直接进入 Technical Design 或当前 OpenSpec Change，不逐函数造 Decision：

**Problem**；**Context & Constraints**（关联适用 Requirements / Product Design）；**Alternatives**；**Trade-offs**；**Evidence**（实际实验与推断分开，注明来源/范围）；**Decision**（选择、Human 确认依据及日期）；**Consequences**（影响、限制与重访条件）；**Status**。

技术条目状态为 **Proposed → Investigating → Accepted**，被正式替代后为 **Superseded** 并指向后继条目；并非每个条目都必须经过 Investigating。治理历史中的 Deferred 保留原义。讨论或 Decision Handoff 不能自行变成 Accepted，缺证据不伪称实验完成。产品行为选择仍归 DECISIONS，整合结果归 Technical Design，具体变更归 OpenSpec。

T-01～T-06 原为未选择方案的讨论索引；2026-10-29 按 Human 明确确认的技术交接转为下方决策条目，保留专题 ID。**仅交接材料或文件存在不构成 Accepted**；本次依据是 Human 当前指令明确声明「已确认技术决策」并要求归档，确认范围不包括下方 Conflict 的产品修订、尚未决定的细节或未经执行的验证。

## 技术决策归档 — 2026-10-29

### 确认依据、状态与证据边界

- **确认来源：** Human 当前「Agent-Ready Store — Technical Decisions Handoff」指令第 1～4 节；Human 声明主要选型、架构边界及范围已通过 Human + ChatGPT 讨论确认。确认人：Human；记录日期：2026-10-29（Asia/Shanghai）；不补写外部讨论或此前审批日期。
- **文档状态：** 已确认结论归档，记录准确性待 Human Review。Accepted 只覆盖明确确认且不冲突的选择，不自动批准 Technical Design、Requirements 整体、业务修订或开发。ENG-008/009/012 的 Proposed 状态不变。
- **现有约束：** [DECISIONS](../DECISIONS.md) D-01～D-22 与 [UX Decisions](UX_DECISIONS.md) 的 Accepted 范围继续有效；[Requirements v0.1](REQUIREMENTS.md) 仍为 Draft，其中直接 Human 补充确认单独适用；[Product Design v0.2](PRODUCT_DESIGN.md) 为 Accepted Design Direction，完整验收未闭合。本次不修改上述业务/体验记录或批准范围。
- **去重：** 既有文件只有治理决策和 T-* 讨论索引，没有同一批已确认技术条目；复用本文件，不新增 TECH_DECISIONS.md。旧文档中的「技术栈尚未选择」按各次交接时的状态解读；当前技术选择以本节为准，不借归档修改 Workflow / Skills。
- **证据分类：** Normative＝本次 Human 明确确认及既有有效决策；Observed＝本轮实际读取的仓库文档及 Git 状态；Inferred＝下文为解释选择整理的工程取舍与约束推论；Unknown＝实现、性能与 Host 兼容性。Codex 未参加原始 ChatGPT 讨论，技术决策首次归档时尚未取得该阶段过程总结；不声称独立选型、跑过 Spike 或验证过协议/Host。
- **候选与理由：** 以下未由交接直接给出的候选对照与代价，均为 Codex 归档时的工程分析，供核对，不描述为 ChatGPT 当时提出、Human 否决或实际测得的结果；未提供的框架候选名、比较指标和历史发言不补造。
- **状态读法：** 技术选择沿用上方生命周期；本批用 **Planned Enhancement** 标记已规划后续能力方向，用 **Pending Detail** 标记尚缺设计/产品细则，用 **Conflict** 标记与有效基线待裁决的差异。它们标注具体子项，不能把整项 Accepted 误读为子项全部获批；不修改全局 Workflow 状态体系。
- **本轮边界：** 只归档和检查；不生成 TECHNICAL_DESIGN.md，不创建 OpenSpec Change，不做实验、商城/Agent 实现、部署或自动 Commit / Push / Merge。后续活动须另获对应授权。

### 决策索引

| ID | 主题 | 已确认范围与子项状态 |
| --- | --- | --- |
| T-01 | 整体系统与技术栈 | Accepted：最小真实全栈、React/Vite/TypeScript、NestJS 薄模块化单体 |
| T-02 | Agent 接入 | Accepted：基础 MCP 五工具 + Hosted Checkout；Planned Enhancement：WebMCP / MCP Apps；契约覆盖见 C-02 |
| T-03 | 状态与持久化 | Accepted：Prisma/PostgreSQL、只读目录、Cart/Inventory/Order 初始方案；Pending Detail：字段、约束、初始化与生命周期 |
| T-04 | 工程组织与共享业务 | Accepted：pnpm Monorepo、共享可信 Commerce UseCases 与 contracts，按需抽 UI |
| T-05 | 确认、权限及交易一致性 | Accepted：Human 明确确认、重验、原子一致性与同车幂等；Planned Enhancement + Conflict：Agent 代提交方向（C-01），不改变当前权限 |
| T-06 | 本地运行、交付顺序与部署 | Accepted：Docker Compose、本地可复现、先基础闭环再增强；Pending Detail：验证/运行配置及后续公网评估 |

### T-01 — 最小真实全栈与薄模块化单体

- **Status：Accepted**；确认依据与日期见本批记录。
- **Problem / Context：** 需要交付虚拟交易但具有真实状态变化的购物系统，展示前端工程、Agent 集成、共享业务能力和端到端交付；纯展示不能证明订单、库存和重试行为。约束见 D-05/06/13/21、Requirements §5～8 和既有共享 Checkout 体验。
- **Decision：** 前端 React + Vite + TypeScript；后端 NestJS 模块化单体，保持薄后端，不引入完整 DDD。保留模拟库存扣减、订单持久化、必要事务和幂等。
- **Alternatives / Trade-offs：** 纯静态/无持久化 Mock 交付更快，但不能承接真实状态一致性；完整 DDD 或微服务会增加本题的分层、部署和协调成本。本次选择单体与真实持久化，接受 API、数据库及运行环境的必要维护成本；不补造其他框架的历史比较或性能优势。
- **Consequences / Scope：** 不实现注册登录、真实支付、物流、商品管理后台、Redis、消息队列、微服务；匿名访问仍须满足 D-03/04 的权限边界。不把「薄」解释为跳过服务端校验，不把未列入 MVP 的增强当作已完成。
- **Evidence / Revisit：** Human 明确确认方案；未建应用、未运行栈集成。只有后续实际约束无法满足或范围获批变化时再评估，不因框架偏好重开选择。

### T-02 — 基础 MCP、Hosted Checkout 与独立增强

- **Status：Accepted**（基础路径）；增强子项与契约缺口如下。
- **Decision：** NestJS 内置 Streamable HTTP MCP，与 HTTP API 共用业务能力。基础 MCP 五个工具为 `search_products`、`get_product`、`create_cart`、`get_cart`、`create_handoff`。必须返回有用的商品/购物车结构化信息与报价摘要，不能只返回 URL；通过 Hosted Checkout 完成人工购买确认。基础工具不包含最终订单提交。
- **Context / Alternatives / Trade-offs：** 仅普通 Web 或只返回链接无法充分承接结构化 Agent 购物；另建独立 MCP 后端会增加部署和逻辑同步成本。选择 API 内集成 MCP 和共享 Checkout，接受协议适配及真实 Host 联调工作，不把协议选定当成 Host 已兼容。
- **Planned Enhancement — WebMCP：** 在 `apps/web` 暴露页面级搜索、商品详情、加购和购物车编辑，不直接暴露最终订单提交工具，不单建服务器。未选择具体浏览器/Host、API 版本或适配方式。
- **Planned Enhancement — MCP Apps：** 后续优先复用 React 商品卡片、购物车摘要和价格组件；不为它提前增加独立常驻服务。当前是复用方向，尚无可复用的正式业务 React 组件，不把现有 HTML 设计稿称为已实现组件。
- **Consequences：** WebMCP 与 MCP Apps 面向不同运行环境，属于独立增强，不形成强制升级链。不支持相应增强的 Agent Host 仍有基础 MCP 或普通 Web 降级路径；具体路径按实际 Host 能力验证，不能承诺所有 Host 同时支持两者。
- **Evidence / Pending Detail：** 未执行 MCP、WebMCP、MCP Apps 的真实 Host 连接、能力发现、UI 资源、浏览器安全上下文或降级测试；SDK/协议版本、端点、输入输出 schema、错误、能力检测均未定。评论分页和购物车修改能力的五工具映射缺口见 C-02，不能因工具表固定就删减 D-16 或修改能力。

### T-03 — 只读商品目录与最小交易持久化

- **Status：Accepted**（技术与初始模型方向）；具体结构为 **Pending Detail**。
- **Decision：** Prisma ORM + PostgreSQL；商品目录只读加载原始 `references/products.json`，不建立 Product、Category、Review 等关系表。商品图片作为前端静态资源，通过 Product ID 关联，不修改原始 Mock。交易持久化初始采用 Cart、Inventory、Order 三张核心表；Cart Items 和订单快照可以使用 JSON，Handoff 信息优先合并到 Cart。
- **Context：** D-18 的唯一 ID、异常库存和零价格规则及 D-20 的公开字段边界仍适用；只读源数据不能充当可直接对外透传的 API，也不能被运行时库存写回。D-06/21 要求最终快照、成单/库存同步成败及重试结果持久化。
- **Alternatives / Trade-offs：** 全量关系化商品、分类和评论会扩大导入与模型维护；只依赖原始 JSON 或内存状态无法保留交易结果。选择只读目录与数据库交易状态分离，减少目录建模，接受 JSON 的验证、版本和约束需要由应用及必要数据库约束共同设计；三表少不等于一致性已解决。
- **Consequences：** 三张核心表是初始方案，不是禁止必要约束/字段或小幅结构调整。Technical Design 可提出满足约束的小幅调整，说明原因及影响；涉及重要权限/一致性选择须 Human 确认，不借调整扩大业务范围。没有批准独立 Handoff、授权或指标服务/表的新增设计。
- **Pending Detail：** 原始库存到 Inventory 的初始化/重置和运行时库存唯一所有权；负库存样本的保真表达；目录与实时库存/报价的组合；按 Product ID 关联但无 Product 表时的有效性校验；Cart/Order 关联与唯一约束、JSON schema/快照版本、金额表示、Handoff 凭证存储与轮换；D-22 有效创建事实的留存与去重，避免购物车变空/过期/清理后统计失真。均不在本轮定字段或 DDL。
- **Evidence / Revisit：** 本次为已确认方案归档，未创建 Prisma schema、迁移、数据库、图片资产或性能证据。后续若 JSON/合并存储无法满足已确认约束，再提出最小调整。

### T-04 — pnpm Monorepo 与共享可信业务能力

- **Status：Accepted**。
- **Decision：** 使用 pnpm Monorepo：`apps/web` 承载商城、Hosted Checkout、WebMCP；`apps/api` 承载 NestJS HTTP API、MCP Server 和共享 Commerce UseCases；`packages/contracts` 承载共享输入输出契约。UI 组件按实际复用抽取，不提前建设完整组件库。
- **Context / Alternatives / Trade-offs：** 各渠道分别实现报价和交易规则容易偏离 D-13 的单一计价要求；分散仓库增加契约同步成本，提前抽象完整组件库增加初期工作。选择共享工作区与后端可信用例，接受包依赖、契约版本和构建边界的维护成本。
- **Consequences：** HTTP、MCP 与 WebMCP 复用可信业务能力和校验逻辑。WebMCP 的页面动作通过可信后端能力完成状态变更，浏览器或共享 TypeScript 类型不能替代服务端验证；客户端不能自行决定报价、Agent 来源或购买权限。共享 contracts 不等于公开全部数据库/原始商品字段，也不等于已选择运行时验证库。
- **Evidence / Pending Detail：** 目录结构和职责已确认，尚未建包或应用。模块内部依赖、运行时 schema、错误映射、精确十进制实现库与包导出方式留后续设计；不引入另一套正式计划。

### T-05 — Human 确认、服务端权限及原子成单

- **Status：Accepted**（现有确认与一致性约束及本次技术边界）；Agent 代提交为 **Planned Enhancement + Conflict**，见 C-01。
- **Decision：** Agent 可以准备、修改购物车；Human 必须明确授权具体购买内容。MVP 由 Human 在 Hosted Checkout 看完整摘要并确认。最终订单创建、模拟库存扣减、购物车完成状态保持原子一致性；同一购物车重复提交不得重复成单或重复扣库存。
- **Context：** 沿用 D-01/02/04/05/06/17/21 与 Requirements 的 CART-06、再次确认规则。商品、数量、单价、优惠、运费或应付金额任一变化都需重新展示并确认，即使总额未变；仅库存变化但仍足量无需再次确认，仍须重验。建车不预留库存，失败不成单/扣库存，不允许部分订单；实际已成功的重试返回原结果，过期后的结果访问仍属 P-04。
- **Alternatives / Trade-offs：** 信任 Agent 的 `userApproved: true` 或类似自述不能证明 Human 授权；仅禁用按钮不能防并发重试；订单、库存和购物车分别写入会留下部分成功风险。采用服务端校验、必要数据库事务与持久幂等约束方向，接受冲突、重试及失败恢复的设计和测试成本。此处没有选定隔离级别、锁或具体授权方案。
- **Planned Enhancement（尚不生效）：** Human 对具体内容明确授权后，允许 Agent 代提交的方向已由本次交接提出并确认，但依用户特别要求，须先批准对应产品/体验/权限修订。若未来获批，授权须服务端可验证，绑定具体购物车与报价版本、短期有效且不可重复滥用；购物车或报价实质变化后原授权不能沿用。不得把匿名 Handoff 访问凭证或 Agent 自述当作购买授权；不批准无边界自动购买或泛化预授权。
- **Evidence / Pending Detail：** 尚无权限、并发、事务或幂等运行证据。MVP 的确认与 Quote 版本绑定、过期判断、并发编辑/提交、唯一订单约束与提交失败回滚机制均待设计；增强的 Human 授权签发、可验证来源、失效/消费/重放、短期期限及结果恢复须在 C-01 获批后细化，不预选签名/Token 格式。

### T-06 — 本地可复现、先闭环后增强

- **Status：Accepted**（运行方向与顺序）；验证与公网部署细节为 **Pending Detail**。
- **Decision：** 优先本地可复现，Docker Compose 组织必要的 Web、API、PostgreSQL 服务。MVP 先完成基础 MCP + Hosted Checkout 的真实购物闭环，随后逐步增加 WebMCP、MCP Apps 和相关 UI 复用；增强之间没有强制依赖。公网部署在 MVP 完成后再评估，不预先绑定付费云资源。
- **Alternatives / Trade-offs：** 先做全部增强或云端基础设施会把未验证 Host 和托管依赖放进 MVP 关键路径；只描述手工环境会增加本地复现成本。选择本地服务编排与先闭环，接受容器构建、配置与启动依赖的维护成本，不宣称 Compose 已存在或端口已可用。
- **Consequences：** WebMCP 不单建服务器，MCP Apps 不提前增加独立常驻服务。先后顺序不删除 D-16 评论分页、D-22 指标口径、真实 Agent 购物记录、GitHub Actions 与 UI/UX 验收等已有交付约束；MVP 不等同最终全部交付完成。真实外部 Host 若需可访问端点，后续以验证需求评估连接方式，不由本条自动授权公网暴露或购买资源。
- **Evidence / Pending Detail：** 尚无 Compose、容器运行、CI 或真实 Agent 闭环证据。Node/pnpm/依赖版本、服务启动/健康检查、数据卷/初始化、环境变量、开发与演示命令、测试工具及 Host 联调入口待细化；本轮不新增配置或验证脚本。

### Conflict — 需 Human 批准的修订与契约缺口

#### C-01 — Agent 经具体授权后代提交（产品/体验/权限修订）

- **Status：Conflict — Pending Human Approval**。这不是撤回本次提出的增强方向，而是区分「方向确认」与「替代旧产品结论的正式批准」；Human 已明确要求后者另审。
- **来源与差异（Observed）：** D-01 选择 B（Agent 准备，用户最终确认），把 C 的预授权自动下单留作未批准候选；Requirements §2 明确排除 Agent 自动或预授权自动下单。UX-04、Product Design §2～3 的可检查路径是在共享 Checkout 由 Human 明确确认后提交；本次增强增加 Human 已确认具体内容后 Agent 执行提交的入口。具体授权与泛化预授权并非同一概念，但不能据此推定既有文档已批准新增执行者和路径。
- **影响：** D-01 的选择及未来候选边界；D-02/06/17 的确认与安全承接；Requirements 角色/非目标、旅程、ORDER-01/02、SEC-01/02 与授权验收；UX-04、EX-01、Product Design 的确认/编辑/再确认/结果路径；未来 MCP/HTTP 权限契约。五个基础 MCP 工具和 WebMCP 不提交最终订单的边界目前保留，不暗中新增提交入口。
- **建议修订（Proposed）：** 保留 Hosted Checkout 为 MVP；将「Human 知情确认具体购买内容」与「由谁执行请求」分开。未来只允许服务端可验证、绑定 Cart/Quote 版本的特定短期授权委托 Agent 提交；内容变化重新确认、不可重放、订单/库存/购物车原子一致及同车幂等继续适用。需说明 Human 看摘要和签发授权的可信界面/入口，以及任何新增提交工具的调用资格；本轮不指定工具名或凭证设计。
- **选项与代价：** A：维持现有 Hosted Checkout 范围，增强方向留存但不进入有效基线，成本最低；B：批准上述受限代提交修订，再更新相关产品/UX 结论及基线，增加授权生命周期和负面验证成本。建议 MVP 继续 A，增强前专项审议 B；这是归档建议，不代 Human 选择。
- **传播与停止边界：** Human 明确批准修订后，先在 DECISIONS 保留 D-01 的演进/替代关系，再按影响同步 Requirements、UX/Product Design 和后续 Technical Design/正式 Change。不在本轮改 Approved 产品结论；受影响的代提交设计与实现不推进，其余归档不受阻。

#### C-02 — 五工具边界与完整查询/编辑能力映射

- **Status：Conflict（潜在契约覆盖缺口）+ Pending Detail**；尚非已证实无法兼容，也不是产品能力已获删减。
- **来源与影响（Observed / Inferred）：** D-16 要求评论列表独立分页，Agent 可逐页读取全部评论，Web/Agent 共享查询；D-19 要求有界搜索。五工具列表未给出独立评论查询调用语义，不能把全部评论嵌回详情来消除此缺口。本次又允许 Agent 修改购物车，但五工具仅列建车/取车，没有明确修改入口；WebMCP 编辑被后置，不能据此断言基础 MCP 已支持修改。
- **需审议的契约方案：** 保留五个工具，在既有工具中明确独立分页评论查询及购物车修改的操作/schema（若能保持语义与安全边界）；或批准增加专门工具；或明确基础 MCP 与后续增强的修改能力范围。后者不能自行删减既有 Web 修改能力或本次允许的 Agent 能力方向。独立查询能力是否由既有工具模式承载须明确认可，不能以名称相同假定满足 D-16。
- **处理建议：** Human 审议工具集合或能力范围变化；既有五工具定义不变时，后续设计给出清楚映射和验收再核对。不在归档中偷偷扩为第六工具、不取消评论分页、不把 `create_cart` 自动解释为更新接口；依赖此映射的接口定稿须先解决。

### Pending Detail — 重要设计缺口与重访条件

以下为设计输入与缺口索引，不是 Technical Design、实现任务或新增正式计划；涉及产品语义的部分仍需 Human 确认，局部实现细节在后续授权内处理。

| 主题 | 已确定边界 / 后续需细化 |
| --- | --- |
| 查询与公开契约 | 沿用 D-15/16/19/20；P-02 的匹配、筛选、同分次序、摘要/详情/评论字段仍未决；分页方式/默认与最大数量、结构化报价、运行时校验及错误形状待设计；先解决 C-02 |
| 状态、目录与数据 | 沿用 T-03；明确只读目录与可变库存所有权/初始化、三表约束和 JSON 版本；不修正或删除原始异常；指标有效创建事实不随购物车当前内容覆盖 |
| 金额与 Quote | 计价公式、TWD 两位、订单级 HALF_UP 已由 D-09～13 确认；待定精确表示/实现库、Quote 版本及比较、确认与重验衔接；不重开公式或缩小再次确认条件 |
| 匿名访问与可信来源 | 不登录仍需车级访问控制；24 小时不续期沿用 D-04。待设计凭证签发/存储/传递、防泄漏与日志处理、编辑往返、MCP/HTTP/WebMCP 的可信来源；购买授权与访问权分开 |
| 原子一致性与重试 | 明确订单/库存/Cart 事务边界、并发库存与编辑冲突、唯一约束/同车幂等、失败回滚和成功响应丢失后的原结果恢复；不能只靠按钮禁用或客户端幂等键 |
| 恢复与生命周期 | P-04 的通用故障、Cart 独立保留期限、订单后续查询和凭证到期后结果访问仍未获决；不能从 24 小时链接推导数据删除或永久订单查询权限 |
| Host 与降级 | 协议/SDK 版本、真实 Host/浏览器能力、页面/UI 资源、安全上下文及连接方式待验证；基础 MCP、WebMCP、MCP Apps 分别举证，不互相推定兼容 |
| 验证与运行 | 后续按契约覆盖金额门槛、异常商品、评论分页、未授权/越权/注入、Quote 变化、并发/重试/回滚与真实 Agent 交接；保留 UI/UX 未完成项。具体工具、Compose、CI、演示入口及公网方案尚未决定/执行 |

## ENG-012 — 产品、设计与最终交付集成（待 Review）

- 状态：**Proposed**；Human 于 2026-10-28 授权本轮 Workflow Integration 的制作和非破坏性验证，具体文档/Skill 增量待 Human Review，不将 ENG-008/009 自动改为 Accepted。
- 问题与选择：已有双循环、权限守卫与 Review，缺少产品/体验/技术结果型基线及统一交付映射。复用现有工程决策文件承载 T-*，以 [产品、设计与交付契约](PRODUCT_ENGINEERING.md) 集中维护产物规则；Workflow 只路由，Review 只审查，OpenSpec 仍是唯一变更级 Spec/Design/Tasks 来源。
- 理由与取舍：新增一份按需参考比复制多份空基线、另建技术决策副本或第三套流程更易维护；完整结果型基线在足够决策及 Human Review 后才生效，不变成固定瀑布审批。
- 边界与后果：本轮不生成 Requirements、Product Design、Technical Design 或完成版 Showcase，不作技术选型、业务开发或产品决策变更；后续普通实现不强制改全局基线。既有 docs/presentation 讲解材料保留，最终 Showcase 只索引真实资产。
- 证据：修改前只读模拟已观察到 UI/UX、总体技术设计与最终交付缺少明确输出和检查规则；后续集成验证及覆盖限制见 TOOLING。本条记录拟议机制，不宣称商城或真实 Agent 已运行。

后续仅在重大工程决策或关键变更时新增条目，按需说明状态、依据、理由与影响；不把例行操作写成决策。本文件不替代需求决策、结果型基线、正式规格或任务清单。
