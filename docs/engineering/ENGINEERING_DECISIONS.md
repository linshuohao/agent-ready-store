# 工程与技术决策

**最新实施授权（2026-10-30）：** Human已明确接受当前购买Change §4.3可信Host/浏览器UI隔离与§6短期可转交订单只读权限，并授权提交、验证与实施。以下“仅修订/尚未批准”保留历史语境；真实Host证据与验收条件不变，见[权限补充](../../DECISIONS.md)及[当前Design](../../openspec/changes/agent-confirmed-purchase/design.md)。

**2026-10-30最新Human确认：** [D-01直接支付决定](../../DECISIONS.md#d01-direct-payment-20261030)将MCP Apps/WebMCP改为Human支付点击后经受保护UI直接下单并原地显示结果，不依赖Agent接续；基础MCP保留Host原生确认后Agent提交及当前兼容限制。下方较早的三入口统一Agent提交描述保留当时范围；最新机制见当前Change，本轮只修订Spec、不实施代码。


**当前补充 — 2026-10-30：** Human已批准[T-07基础MCP原生确认方向](#t-07--基础mcp原生确认与协议会话)，并有条件授权验证通过且无关键待决后实施。下方较早的“尚未获技术方案或实施批准”保留当时范围；不得据此重复请求本方向批准，也不将其解释为全部确认机制或真实Host验收已通过。

**2026-10-30 Human三入口与便利购物澄清：** [D-01当前边界](../../DECISIONS.md#d01-agent-convenience-20261030)保持MCP会话内、WebMCP全步骤工具及Apps内完成购买；Apps允许直接跳页和Agent跨步准备，不强制每页提示/点击，三入口均以减少操作为目标。最终须Human在结算界面亲自点击“支付/确认购买”，Agent不得代点；沿现有模拟结账，成功后才可提供外部订单详情链接。此补充替代增量规划中每步提示唤起/禁止直接跳页的限制；历史基线批准/验收保留，具体确认/权限及Host接续见[当前Change](../../openspec/changes/agent-confirmed-purchase/design.md)，尚未获技术方案或实施批准。

**2026-10-30 Human 需求变更（当前方向）:** [D-01 两步 Agent 购买确认](../../DECISIONS.md#d01-agent-two-step-20261030) 已将基础MCP/WebMCP/MCP Apps两步确认后的Agent代提交纳入当前需求，替代旧的C-01 Planned Enhancement范围判断。人先请求准备，审阅最终摘要后再明确确认，Agent才可执行已授权提交；普通Web人工路径与交易不变量保持。本文既有“七工具无提交/仅浏览器人工提交/代提交后置”描述保留为已批准旧设计及现有实现的范围，不作为新需求排除依据；新确认入口、可验证授权、提交通道和异常恢复须另行完成统一设计与OpenSpec规划，尚未获技术设计或实施批准。历史批准与验收不追溯改写。


> **当前基线状态 — 2026-10-29：** Human「Design Phase Closure & Git History Consolidation」已批准 [Technical Design v0.5](TECHNICAL_DESIGN.md) 并结束本轮设计阶段。下文 Draft/待审记录保留其当时范围；Proposed 实施候选、L-01/P-04 等 Pending 与未运行证据不因整体批准自动升级，既有 Accepted 决策不重写。

本文件保存工程治理与重要技术选择，保留原有 ENG-* 决策 ID，业务技术专题按需使用 T-*。针对 PM 需求的假设、判断、取舍及回复另见 [DECISIONS.md](../../DECISIONS.md)，不在这里混合维护；不另建职责相同的 TECH_DECISIONS.md。

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
- 影响范围：需求资料、Roadmap、Change 拆分与验收。ENG-008 拟议替代关系保留且仍 Proposed；实际运行规范与该历史条目的差异后续独立治理 Review 核对。

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

### ENG-009 本轮修订 — 轻量审查路由（2026-10-29）

Human 本聊天明确授权精简现有 Review Skill，复用 Superpowers 审查与反馈核实，并在修复/重验后按人的理解成本选择可视化；本轮制作该可审查增量，不追溯接受 ENG-008/009 的旧机制。Review v0.4 移除通用质量清单、L0–L4 与固定报告，保留项目契约适配、审查路由和证据交接；Workflow v0.6 同步入口职责。审查状态复用对话、当前 Change 或已有 PR，不新建持久状态系统；Visual Recap 为可选展示，不替代验证或验收，本轮不安装或发布。旧版机制保留以上历史记录；Human 本聊天已明确授权本次修订提交并合并，不追溯接受旧版整体机制。验证事实见 TOOLING 的对应版本条目。

## ENG-010 — 精简记录与独立交付讲解

- 状态：Accepted（仅指 Human 本轮明确要求的文档整理方向；ENG-008/009 的 Proposed 状态不变）。
- 决策：过程仅保留重大决策、关键变更和必要验证事实；上下文/Git 规则归 AGENTS，执行方法归 Skills，工具与历史验证摘要归 TOOLING，不再为例行整理新增过程报告。
- 关键变更：移除三个重复说明文件和两份长验证报告；用户提供的图与讲解整合为独立演示页，从 README 链接，日常 Agent 不默认加载。原件、需求决策、既有工程决策与协作历史保留。

## ENG-011 — 任务切换与 Git 收尾提醒

- 状态：Accepted（2026-10-28，Asia/Shanghai）；Human 本轮明确要求：新任务与原任务或分支不一致时提醒，尚未提交/收尾时不建议继续无关任务。
- 决策：在任务开始、切换与交付时执行 [AGENTS Git 规则](../../AGENTS.md#git)，检查范围匹配并显式报告提交状态；同一任务的补充继续，无关任务修改前先处理收尾或交接隔离。
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
- **文档状态：** 已确认结论归档；Human 本轮 Baseline Finalization 已确认 Review 建议及 T-01～T-06 既有选择，记录日期 2026-10-29（Asia/Shanghai）。Accepted 只覆盖明确确认且不冲突的选择，不自动批准 Technical Design、Requirements 整体、业务修订或开发。当次 ENG-008/009/012 的 Proposed 状态不变；ENG-012 后续限定接受记录见本文件对应条目。
- **现有约束：** [DECISIONS](../../DECISIONS.md) D-01～D-22 与 [UX Decisions](../product/PRODUCT_DESIGN.md#ux-decisions) 的 Accepted 范围继续有效；[Requirements v0.2](../product/REQUIREMENTS.md) 为 Approved Product Requirements Baseline；[Product Design v0.2](../product/PRODUCT_DESIGN.md) 为 Approved Design Baseline / Approved Design Direction，完整验收未闭合。批准限本轮明确范围，技术设计及实现未获批准。
- **去重：** 既有文件只有治理决策和 T-* 讨论索引，没有同一批已确认技术条目；复用本文件，不新增 TECH_DECISIONS.md。旧文档中的「技术栈尚未选择」按各次交接时的状态解读；当前技术选择以本节为准，不借归档修改 Workflow / Skills。
- **证据分类：** Normative＝本次 Human 明确确认及既有有效决策；Observed＝本轮实际读取的仓库文档及 Git 状态；Inferred＝下文为解释选择整理的工程取舍与约束推论；Unknown＝实现、性能与 Host 兼容性。Codex 未参加原始 ChatGPT 讨论，技术决策首次归档时尚未取得该阶段过程总结；后续补件见下方 AI Collaboration Evidence Check，不声称独立选型、跑过 Spike 或验证过协议/Host。
- **候选与理由：** 以下未由交接直接给出的候选对照与代价，均为 Codex 归档时的工程分析，供核对，不描述为 ChatGPT 当时提出、Human 否决或实际测得的结果；未提供的框架候选名、比较指标和历史发言不补造。
- **状态读法：** 技术选择沿用上方生命周期；本批用 **Planned Enhancement** 标记已规划后续能力方向，用 **Pending Detail** 标记尚缺设计/产品细则，用 **Conflict** 标记与有效基线待裁决的差异。它们标注具体子项，不能把整项 Accepted 误读为子项全部获批；不修改全局 Workflow 状态体系。
- **本轮边界：** 只归档和检查；不生成 TECHNICAL_DESIGN.md，不创建 OpenSpec Change，不做实验、商城/Agent 实现、部署或自动 Commit / Push / Merge。后续活动须另获对应授权。

### 决策索引

| ID | 主题 | 已确认范围与子项状态 |
| --- | --- | --- |
| T-01 | 整体系统与技术栈 | Accepted：最小真实全栈、Next.js App Router/React/TypeScript、NestJS 薄模块化单体；原 Vite 选择保留为历史 |
| T-02 | Agent 接入 | Accepted：基础 MCP 七工具、WebMCP、MCP Apps + Hosted Checkout 均属本次完整交付；分入口验收；演进见 T-02 |
| T-03 | 状态与持久化 | Accepted：Prisma/PostgreSQL、只读目录、Cart/Inventory/Order 初始方案；Pending Detail：字段、约束、初始化与生命周期 |
| T-04 | 工程组织与共享业务 | Accepted：pnpm Monorepo、共享可信 Commerce UseCases 与 contracts，按需抽 UI |
| T-05 | 确认、权限及交易一致性 | Accepted：Human 明确确认、重验、原子一致性与同车幂等；Planned Enhancement：Agent 代提交方向（C-01），不改变当前权限 |
| T-06 | 本地运行、交付顺序与部署 | Accepted：Docker Compose、本地可复现；本次交付内先基础闭环再完成 WebMCP/MCP Apps；Pending Detail：验证/运行配置及后续公网评估 |

### T-01 — 最小真实全栈与薄模块化单体

- **Status：Accepted**；确认依据与日期见本批记录。
- **Problem / Context：** 需要交付虚拟交易但具有真实状态变化的购物系统，展示前端工程、Agent 集成、共享业务能力和端到端交付；纯展示不能证明订单、库存和重试行为。约束见 D-05/06/13/21、Requirements §5～8 和既有共享 Checkout 体验。
- **Historical Decision（已被下方 2026-10-29 演进替代前端部分）：** 前端 React + Vite + TypeScript；后端 NestJS 模块化单体，保持薄后端，不引入完整 DDD。保留模拟库存扣减、订单持久化、必要事务和幂等。
- **Alternatives / Trade-offs：** 纯静态/无持久化 Mock 交付更快，但不能承接真实状态一致性；完整 DDD 或微服务会增加本题的分层、部署和协调成本。本次选择单体与真实持久化，接受 API、数据库及运行环境的必要维护成本；不补造其他框架的历史比较或性能优势。
- **Consequences / Scope：** 不实现注册登录、真实支付、物流、商品管理后台、Redis、消息队列、微服务；匿名访问仍须满足 D-03/04 的权限边界。不把「薄」解释为跳过服务端校验，不把未列入 MVP 的增强当作已完成。
- **Evidence / Revisit：** Human 明确确认方案；未建应用、未运行栈集成。只有后续实际约束无法满足或范围获批变化时再评估，不因框架偏好重开选择。

#### T-01 演进 — Next.js App Router（2026-10-29，Human Accepted）

- **确认来源：** Human「Next.js Architecture Decision & Technical Design Update」明确最终决定。仅替代原前端 React + Vite 选择；上述原决定及理由保留为历史，T-02～T-06 的业务/权限/交易边界不变。
- **Current Decision：** Web 为 Next.js App Router + React + TypeScript；NestJS 薄模块化单体内置 Streamable HTTP MCP；Prisma + PostgreSQL；pnpm Workspaces，`apps/web`、`apps/api`、`packages/contracts`。
- **原因与收益：** Home Quiz 需要更完整展示现代 React 的 SSR/RSC、Server/Client 边界、服务端获取与缓存、客户端交互状态及多入口 UI 复用能力。不是 Server State 必须依赖 Next.js，也不宣称其天然提高交易安全或性能。
- **候选与代价：** 保留 Vite 可减少服务端渲染与运维复杂度，仍能管理 Server State，但无法在该选择内直接展示 App Router/RSC；Next.js 增加 Node Web Server、双执行环境、Hydration、缓存与 Cookie/反代联调成本。Human 接受这些代价以匹配岗位重点，具体效果待实际验证。
- **职责限制：** Next 负责页面、SSR/RSC、初始公开数据获取、客户端交互及 Hosted Checkout；只通过 Nest HTTP API 取得业务数据，不直接用 Prisma 执行交易。Pricing、库存扣减、订单创建、权限和 Agent 来源始终由 Nest Commerce UseCases 唯一维护。MCP 不迁至 Next，不逐接口复制 Route Handler/Server Action。
- **实施与证据：** 技术栈选择 Accepted；Technical Design v0.4 仍 Draft。渲染/缓存 API、Next/React/Node 版本与自托管行为由 S1 按官方适用版本验证。无代码、运行或 Host 兼容证据；未授权 Change、提交、云托管或付费服务。

#### T-01 演进 — 基础 UI 优先 shadcn/ui（2026-10-29，Human Accepted）

- **来源与选择：** Human 在本聊天明确确认项目级前端约束：基础 UI 统一优先使用 shadcn/ui；适用于当前 S1 及后续工程。保持 Product Design 的黑白极简、繁体中文及响应式方向。
- **边界与取舍：** shadcn/ui 提供可维护的基础组件源码，减少重复维护控件状态与可访问性；接受 Tailwind/PostCSS 和实际控件所需依赖。仅按当前消费者添加组件，不建设完整 Design System 或额外封装层，不替代 ProductCard、PurchaseSummary、CartEditor 等业务组件。已有 Base UI/Radix 实现优先兼容，不为选型形式迁移底层。
- **传播与授权：** 在已有 Next.js 项目增量接入，当前实施细节与验证归 S1 Change；既定服务、数据/权限/交易边界及完整交付范围不变。不修改通用 Workflow，不扩展 Git/发布授权；此前批准历史保留。

#### T-01 演进 — Base UI（2026-10-29，Human Accepted）

- Human 本聊天明确“改为 Base ui”，替代本项目首次 shadcn 接入时的 Radix 实施选择；后续本项目基础组件采用 Base UI。最初并无既有 Radix 消费者需要兼容，保留原取舍记录，不把此前 shadcn 优先确认解释为 Human 指定了 Radix。迁移与定向验证归当前 S1 Change，不改变服务、业务或权限边界及 Git 授权。

### T-02 — 三种 Agent 接入与 Hosted Checkout

- **Status：Accepted**（基础 MCP、WebMCP、MCP Apps 与 Hosted Checkout 本次交付范围）；各入口实现/兼容性未验证，演进依据见本节末尾。
- **Decision：** NestJS 内置 Streamable HTTP MCP，与 HTTP API 共用业务能力。基础 MCP 七个工具为 `search_products`、`get_product`、`list_product_reviews`、`create_cart`、`update_cart`、`get_cart`、`create_handoff`。必须返回有用的商品/购物车结构化信息与报价摘要，不能只返回 URL；通过 Hosted Checkout 完成人工购买确认。基础工具不包含最终订单提交。
- **Context / Alternatives / Trade-offs：** 仅普通 Web 或只返回链接无法充分承接结构化 Agent 购物；另建独立 MCP 后端会增加部署和逻辑同步成本。选择 API 内集成 MCP 和共享 Checkout，接受协议适配及真实 Host 联调工作，不把协议选定当成 Host 已兼容。
- **本次交付 — WebMCP：** 在 `apps/web` 暴露页面级搜索、商品详情、加购和购物车编辑，不直接暴露最终订单提交工具，不单建服务器。未选择具体浏览器/Host、API 版本或适配方式。
- **本次交付 — MCP Apps：** 优先复用 React 商品卡片、购物车摘要和价格组件；不为它提前增加独立常驻服务。当前是复用方向，尚无可复用的正式业务 React 组件，不把现有 HTML 设计稿称为已实现组件。
- **Consequences：** WebMCP 与 MCP Apps 面向不同运行环境，属于本次交付内分别验收的接入方式，不形成强制升级链。不支持相应增强的 Agent Host 仍有基础 MCP 或普通 Web 降级路径；具体路径按实际 Host 能力验证，不能承诺所有 Host 同时支持两者。
- **Evidence / Pending Detail：** 未执行 MCP、WebMCP、MCP Apps 的真实 Host 连接、能力发现、UI 资源、浏览器安全上下文或降级测试；SDK/协议版本、端点、输入输出 schema、错误、能力检测均未定。C-02 已接受七工具：评论独立分页、商品查询有界、Agent 可修改购物车；车级访问控制、可信 Agent 来源与结构化报价保持，七工具共用 Commerce UseCases，不复制业务逻辑。具体 JSON Schema、错误结构、参数及实现交 Technical Design。

<a id="agent-integration-delivery"></a>

#### T-02 / T-06 交付范围澄清 — 2026-10-29（Human Accepted）

- **来源：** Human 在本聊天明确要求 MCP 部分不写“未来”，目标是本次一次性完整交付。基础 MCP、WebMCP、MCP Apps 与 Hosted Checkout 均纳入；不把分阶段实施解释为未来可选范围。
- **演进 / Superseded：** 原 T-02 将 WebMCP/MCP Apps 标为 Planned Enhancement，是先保证基础闭环、分别处理 Host 风险的安排；当前替代其“后置交付”分类，保留独立运行环境、渐进实施、分别验证和降级边界。T-06 的先后顺序仍适用，但 S1～S6 都在本次完整交付内。历史批准记录保留当时范围，不反推其当时已包括本次澄清。
- **代价与验收：** 本次需承担浏览器/Host 适配、Bridge/UI 复用及三种模式的真实验证成本；不能以基础 MCP 成功或降级说明替代其余模式验收。环境不支持时应明确证据与受影响范围，必要时交 Human 决定，不自行删减本次交付。
- **保持：** 七工具、唯一业务用例/Pricing、NestJS MCP、Human Hosted Checkout 确认与安全边界不变。Agent 经具体授权代提交仍 Planned Enhancement，不进入本次交付。此决定明确目标范围，不批准 Technical Design、不代表已实现/兼容，不授权本轮代码、Change、提交或部署。

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

**2026-10-30限定补充：** [D-21追加确认](../../DECISIONS.md#s3-confirmation-lifetime-20261030)明确无独立5分钟时限、同步生单与成交价格固定；取代本条及历史演进中“短期”所可能暗示的额外短倒计时，独立绑定和服务端重验保持。

**S3限定补充（2026-10-29）：** Human确认的到期准入、原权限结果访问及无自动清理边界见[D-21补充](../../DECISIONS.md#s3-checkout-boundary-20261029)；具体确认会话/恢复/事务实现仍为[S3 Design](../../openspec/changes/archive/2026-10-30-s3-hosted-checkout-order/design.md)中的Proposed，未授权实施。

- **Status：Accepted**（现有确认与一致性约束及本次技术边界）；Agent 代提交为 **Planned Enhancement**，见 C-01。
- **Decision：** Agent 可以准备、修改购物车；Human 必须明确授权具体购买内容。MVP 由 Human 在 Hosted Checkout 看完整摘要并确认。最终订单创建、模拟库存扣减、购物车完成状态保持原子一致性；同一购物车重复提交不得重复成单或重复扣库存。
- **Context：** 沿用 D-01/02/04/05/06/17/21 与 Requirements 的 CART-06、再次确认规则。商品、数量、单价、优惠、运费或应付金额任一变化都需重新展示并确认，即使总额未变；仅库存变化但仍足量无需再次确认，仍须重验。建车不预留库存，失败不成单/扣库存，不允许部分订单；实际已成功的重试返回原结果，过期后的结果访问仍属 P-04。
- **Alternatives / Trade-offs：** 信任 Agent 的 `userApproved: true` 或类似自述不能证明 Human 授权；仅禁用按钮不能防并发重试；订单、库存和购物车分别写入会留下部分成功风险。采用服务端校验、必要数据库事务与持久幂等约束方向，接受冲突、重试及失败恢复的设计和测试成本。此处没有选定隔离级别、锁或具体授权方案。
- **Planned Enhancement：** Human 对具体内容明确授权后，允许 Agent 持服务端可验证有效授权代提交的产品原则已确认，见 D-01 当前有效结论与 C-01。MVP 仍由 Human Hosted Checkout 直接确认并提交，不新增 `confirm_order` 或其他最终订单提交 MCP Tool。授权入口、凭证、有效性、失效/消费/重放及恢复机制留增强阶段设计；Handoff 访问权或 `userApproved: true` 不能替代购买授权，内容/报价实质变化须重新授权。不将草稿的具体版本绑定、期限或 Token 建议提升为已批准实现。
- **Evidence / Pending Detail：** 尚无权限、并发、事务或幂等运行证据。MVP 确认上下文、报价比较、并发编辑/提交、唯一订单约束及回滚待 Technical Design；本轮未批准具体实现。

### T-06 — 本地可复现、先闭环后增强

- **Status：Accepted**（运行方向与顺序）；验证与公网部署细节为 **Pending Detail**。
- **Decision：** 优先本地可复现，Docker Compose 组织必要的 Web、API、PostgreSQL 服务。MVP 先完成基础 MCP + Hosted Checkout 的真实购物闭环，随后在本次完整交付内完成 WebMCP、MCP Apps 和相关 UI 复用；三种接入分别验收，无强制升级依赖。公网部署在 MVP 完成后再评估，不预先绑定付费云资源。
- **Alternatives / Trade-offs：** 同时展开所有接入或云端基础设施会把未验证 Host 和托管依赖放进 MVP 关键路径；只描述手工环境会增加本地复现成本。选择本地服务编排与先闭环，接受容器构建、配置与启动依赖的维护成本，不宣称 Compose 已存在或端口已可用。
- **Consequences：** WebMCP 不单建服务器，MCP Apps 不提前增加独立常驻服务。先后顺序不删除 D-16 评论分页、D-22 指标口径、真实 Agent 购物记录、GitHub Actions 与 UI/UX 验收等已有交付约束；MVP 不等同最终全部交付完成。真实外部 Host 若需可访问端点，后续以验证需求评估连接方式，不由本条自动授权公网暴露或购买资源。
- **Evidence / Pending Detail：** 尚无 Compose、容器运行、CI 或真实 Agent 闭环证据。Node/pnpm/依赖版本、服务启动/健康检查、数据卷/初始化、环境变量、开发与演示命令、测试工具及 Host 联调入口待细化；本轮不新增配置或验证脚本。

<a id="conflict--需-human-批准的修订与契约缺口"></a>

### C-01 / C-02 — 历史冲突、解决与增强边界

#### C-01 — Agent 经具体授权后代提交（产品/体验/权限修订）

- **Status：Planned Enhancement；产品授权语义冲突已关闭。**
- **确认依据：** Human 本轮「Baseline Finalization」明确确认产品原则、MVP 与增强边界；确认人 Human，记录日期 2026-10-29（Asia/Shanghai）。此前 Conflict — Pending Human Approval 是产品传播前的状态，现由本次明确确认关闭，不表示授权技术机制已获批准。
- **演进：** D-01 保留原 B 路径与理由，并补充区分 Human 授权和执行提交者；Requirements §2/§3.3/ORDER-01/SEC-02/AC-09 与 Product Design §3/UX-04 已同步。MVP 仍是 Human 在 Hosted Checkout 看完整摘要、明确授权并直接提交；未来 Agent 可在取得服务端可验证有效授权后代提交该次具体内容。未授权自动购买始终禁止，泛化预授权场景未整体获批。
- **设计边界：** 具体授权交互、凭证及验证细则待增强阶段设计；报价或实质购买内容变化须重新确认/授权，原子成单、库存一致及同车幂等继续适用。当前不新增 `confirm_order` MCP Tool，不以该增强要求重做现有 Checkout；没有残留的产品授权语义冲突。

#### C-02 — 五工具边界与完整查询/编辑能力映射

- **Status：Resolved / Accepted。**
- **确认依据：** Human 本轮「Baseline Finalization」第 IV.2 项明确接受由五个工具调整为七个职责清晰的工具；确认人 Human，记录日期 2026-10-29（Asia/Shanghai）。
- **历史与原因：** 原 T-02 五工具为 search_products、get_product、create_cart、get_cart、create_handoff，缺独立评论分页及修改购物车入口。此次增加 `list_product_reviews`、`update_cart`，选择专用工具而非将评论嵌回详情或让 create_cart 隐含更新；关闭原能力映射冲突，保留 D-16/19 和 Agent 编辑能力。
- **有效范围：** 七工具集合见 T-02；商品查询有界、评论独立分页，车级访问控制、可信 Agent 来源及结构化报价均保持。HTTP / MCP / WebMCP 共用 Commerce UseCases，不重复实现业务逻辑；基础 MCP 无最终订单提交工具。具体 JSON Schema、错误结构、参数与工具实现归 Technical Design，未因此获批。

### Pending Detail — 重要设计缺口与重访条件

以下为设计输入与缺口索引，不是 Technical Design、实现任务或新增正式计划；涉及产品语义的部分仍需 Human 确认，局部实现细节在后续授权内处理。

| 主题 | 已确定边界 / 后续需细化 |
| --- | --- |
| 查询与公开契约 | 沿用 D-15/16/19/20；P-02 的匹配、筛选、同分次序、摘要/详情/评论字段仍未决；分页方式/默认与最大数量、结构化报价、运行时校验及错误形状待设计；七工具范围已由 C-02 解决，具体契约待细化 |
| 状态、目录与数据 | 沿用 T-03；明确只读目录与可变库存所有权/初始化、三表约束和 JSON 版本；不修正或删除原始异常；指标有效创建事实不随购物车当前内容覆盖 |
| 金额与 Quote | 计价公式、TWD 两位、订单级 HALF_UP 已由 D-09～13 确认；待定精确表示/实现库、Quote 版本及比较、确认与重验衔接；不重开公式或缩小再次确认条件 |
| 匿名访问与可信来源 | 不登录仍需车级访问控制；24 小时不续期沿用 D-04。待设计凭证签发/存储/传递、防泄漏与日志处理、编辑往返、MCP/HTTP/WebMCP 的可信来源；购买授权与访问权分开 |
| 原子一致性与重试 | 明确订单/库存/Cart 事务边界、并发库存与编辑冲突、唯一约束/同车幂等、失败回滚和成功响应丢失后的原结果恢复；不能只靠按钮禁用或客户端幂等键 |
| 恢复与生命周期 | P-04 的通用故障、Cart 独立保留期限、订单后续查询和凭证到期后结果访问仍未获决；不能从 24 小时链接推导数据删除或永久订单查询权限 |
| Host 与降级 | 协议/SDK 版本、真实 Host/浏览器能力、页面/UI 资源、安全上下文及连接方式待验证；基础 MCP、WebMCP、MCP Apps 分别举证，不互相推定兼容 |
| 验证与运行 | 后续按契约覆盖金额门槛、异常商品、评论分页、未授权/越权/注入、Quote 变化、并发/重试/回滚与真实 Agent 交接；保留 UI/UX 未完成项。具体工具、Compose、CI、演示入口及公网方案尚未决定/执行 |

### AI Collaboration Evidence Check

本次已知技术讨论主要发生在 Human + ChatGPT，交接提供的是结论而非过程证据。现有 [外部协作摘要](../ai-collaboration/AI_COLLABORATION_NOTES.md) Case 01～04 覆盖产品、计价、UX 及职责纠偏，未覆盖本批技术栈、三表取舍、Agent 增强或代提交的新讨论；[AI_NOTES](../../AI_NOTES.md) 已有 5 个精选案例。本轮不编造 AI 建议、Human 纠偏或候选比较历史，不直接新增第 6 个案例。阶段补档提醒只在本次最终汇报提出；Human 补交真实过程摘要后，再核对来源并酌情替换/合并精选案例，摘要不代替正式决策批准。

**后续补件（2026-10-29，Asia/Shanghai）：** Human 已提供 [技术决策协作补充记录](../ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md)，原样归档并完成来源/状态对照，详见 [入库核对](../ai-collaboration/README.md#技术协作补件接收与核对)。上段保留为首次归档时的缺口记录，当前该批讨论的结构化过程摘要已补齐；原始对话与工程/Host 验证仍未取得。AI_NOTES 合并旧案例并融入两类技术协作，保持 5 例；不再重复催交同一过程摘要。补件不改变 T-*、C-01/02 或 D-01 的决策状态，也不将其中 Codex Host 意向、条件库存更新等细节提升为新的 Accepted 设计。

## ENG-012 — 产品、设计与最终交付集成

- 状态：**Accepted（仅产物职责与交付契约）**；Human，2026-10-29（Asia/Shanghai）。直接批准依据：本聊天「PRODUCT_ENGINEERING — Governance Review Finalization」明确说明 Human + ChatGPT 已完成 Review、整体接受现有治理契约，并授权限定修订后定稿。Workflow / Review Skill 机制不在本次批准范围，ENG-008/009 保持 Proposed。
- 状态演进：2026-10-28 为 Proposed，授权仅覆盖 Workflow Integration 制作与非破坏性验证，具体文档/Skill 增量待 Review；2026-10-29 仅本文所引用的 PRODUCT_ENGINEERING 产物职责与交付契约获接受，不追溯批准历史 Skill 修改。
- 问题与选择：已有双循环、权限守卫与 Review，缺少产品/体验/技术结果型基线及统一交付映射。复用现有工程决策文件承载 T-*，以 [产品、设计与交付契约](../workflow/PRODUCT_ENGINEERING.md) 集中维护产物规则；Workflow 只路由，Review 只审查，OpenSpec 仍是唯一变更级 Spec/Design/Tasks 来源。
- 理由与取舍：新增一份按需参考比复制多份空基线、另建技术决策副本或第三套流程更易维护；完整结果型基线在足够决策及 Human Review 后才生效，不变成固定瀑布审批。
- 初次制作边界（2026-10-28 历史）：本轮不生成 Requirements、Product Design、Technical Design 或完成版 Showcase，不作技术选型、业务开发或产品决策变更；后续普通实现不强制改全局基线。既有 docs/presentation 讲解材料保留，最终 Showcase 只索引真实资产。
- 本次定稿：传播表仅作影响分析，按实际影响更新；里程碑/交付 Review/状态变化时维护映射；设计深度按风险与复用需要调整，保留本项目已批准资产范围。全局 Baseline、技术选择及实际实现/验证状态分别记录，本次不授予实施、提交或发布权限。
- 证据：修改前只读模拟已观察到 UI/UX、总体技术设计与最终交付缺少明确输出和检查规则；后续集成验证及覆盖限制见 TOOLING。此为初次制作时拟议机制的历史证据；当前限定接受范围见上方状态演进，不宣称商城或真实 Agent 已运行。

后续仅在重大工程决策或关键变更时新增条目，按需说明状态、依据、理由与影响；不把例行操作写成决策。本文件不替代需求决策、结果型基线、正式规格或任务清单。

### T-07 — 基础MCP原生确认与协议会话

- **Status：Accepted（方向）；实际Host支持待验证。** Human，2026-10-30（Asia/Shanghai），本聊天在明确询问“Host原生购买确认表单，并增加必要的MCP会话/传输支持”后回复“同意”。
- **Decision：** 基础MCP采用Host原生form elicitation承载完整结算摘要和Human最终购买确认；保留能力协商及确认请求/响应关联所必需的协议会话/传输支持。具体绑定、恢复、拒绝/取消和断连行为归[当前Change Design §4.1](../../openspec/changes/agent-confirmed-purchase/design.md#41-本轮验证结果及需human确定的基础mcp确认架构)。
- **理由与取舍：** 满足基础MCP全程会话内且不依赖Apps的要求；接受从逐POST无状态Server调整为必要的协议会话。没有选择外部Checkout、复制回聊或让模型提交一个批准布尔值。
- **边界：** 模型不获得自授批准工具；只接受与原请求关联、经可信Host取得的具体Human确认。拒绝、取消、缺少能力和确认回执未知均不新增批准；协议会话不延长Cart期限、不替代数据库订单/授权事实。该方向不保证当前Host已支持，不授予Git、发布或真实金流权限。
- **实施条件：** 复用Human先前“验证无问题且无关键待决后正式实施”的授权；先完成无购买副作用的真实Host探针及其余必要机制验证。失败不得静默改用Apps或外部页面。

### Technical Design Final Review — 2026-10-29

Human 已通过整体架构，授权收敛 [Technical Design v0.2](TECHNICAL_DESIGN.md)，文件仍待最终批准。接受七工具、确定性文本查询/必要筛选、推荐分数降序/同分稳定及有界 Offset，P-02 参数边界和错误结构由切片细化。接受独立 Hosted Checkout 确认上下文、匿名保证范围、必要 Cart 版本/完整报价语义指纹、独立访问与 24h Handoff 权限、短事务条件扣减/原子订单/永久同车去重、精确十进制与订单级 HALF_UP。具体 Schema、凭证编码、Challenge 生命周期、Prisma API、锁及重试配置是 Implementation Detail，不提前固定。有效权限内可读原订单；长期过期结果读取/清理/保留仍为非阻塞 P-04。C-01 保持 Planned Enhancement，C-02 已解决；S1 即验证真实 Codex 只读 MCP，后续依次 Cart/Quote、Checkout、完整 Handoff、WebMCP、MCP Apps。未授权业务代码、Change、Commit、Push、Merge 或部署。

### T-05 演进 — 单 Cart Token 与分享式 Handoff（2026-10-29）

**S2当前补充（Human Accepted，2026-10-29）：** Human“批准这些建议”解决下方历史L-01 Pending：未交接Cart创建起24h；有效期内首次分享后，所有同Token入口使用首次分享起完整24h，创建期限不截短已签发期限。取代先前“不设预交接超时”候选，产品依据见 [D-04](../../DECISIONS.md#d-04--交接链接有效期)。接受浏览器单Token创建证明、单密文恢复及每车Cookie的现有方案方向和材料/Cookie均丢失后无法自动恢复的限制；具体加密API、安全及运行验证仍须实施举证。接受S2 Web/HTTP、S4 MCP写工具/交接/指标分期；S3确认绑定及P-04长期数据/结果权限保持未决。以下段落保留原设计轮次状态，不作为L-01当前状态或运行通过证据；此次不授予业务实施或Git操作权限。

- **Status：Accepted（方向）**；来源：Human「Technical Design v0.5 Final Alignment」明确决定。技术设计 v0.5 仍 Draft，不授权实现。
- **Current Decision：** 每车一份受限 Cart Token，Agent 经工具参数、Human 经 HttpOnly Cookie 使用同一访问能力；Handoff 只分享同一 Cart，不复制车、不改变来源或库存，不是新业务实体/状态。MCP Service Token 仍只做连接认证和可信来源。
- **Superseded：** v0.2～v0.4 的独立管理/Handoff 双 Token 草案与分别恢复/到期模型被本条替代；其原理由是分离用途，代价是重复状态与生命周期交叉。此前 Final Review 中“独立访问与 Handoff 权限”保留为历史批准范围，本次由 Human 明确替代该访问凭证分离部分；独立购买确认不受替代。
- **期限不变量：** 首次 create_handoff 记录时间，之后所有同 Token 持有者共同受 issuedAt+24h 限制；重复调用/访问/编辑/失败不续期，旧车不能重签延期。不能让相同 Token 的所谓管理者有更长权限。
- **Proposed / Pending：** v0.5 推荐每车一份加密随机 Token 材料同时服务验证与授权恢复，不维护第二个 Token/verifier；每车独立命名 Cookie 支持少量并行购物车。恢复只经可信创建作用域或现有有效 Cart Token；不凭公开 ID 发放秘密。具体机制仍待设计 Review/实施验证。
- **L-01 Pending Product Decision：** 未交接 Agent Cart 与 Human 普通 Cart 的统一访问期限尚未批准；v0.5 建议先不增加预交接超时，避免管理到期截短交接24h，但此为待确认的匿名能力存续承诺，不称为已批准永久访问。有限预交接期限为 Human 可选项，确认后实施。数据保留/过期长期结果仍归 P-04。
- **保持：** Hosted Checkout 独立短期确认绑定浏览器会话、车版本与语义指纹，Nest 重验、原子扣库存与同车唯一订单。匿名 UI/Origin/CSRF 不严格识别自然人；七工具不含提交。T-01～T-04/T-06 与产品行为不变，无新增服务。
- **Evidence：** 仅文档决策与设计自查，无运行、恢复、并发或 Host 证据。L-01 不阻塞只读 S1，阻塞相关 S2 期限定稿；S2/S4 必须验证响应丢失/重启/到期/多车隔离。

#### T-04 / T-05 设计候选收敛 — 2026-10-29（Proposed，待 Human Review）

本次 Focused Architecture Refinement 保留 Next.js、单 Cart Token、24h Handoff、独立确认、七工具与三种 Agent 接入的完整交付范围；未重开 Accepted 决策。Technical Design §5.2 明确 Commands 为不依赖 React/Query 的普通 TypeScript 操作，Hooks/Adapter 协调 UI 和缓存；§4.3 明确 Unknown 不能从一次无 Order 查询推导提交失败，S3 验证原提交与恢复的协调。

替代的仅是此前 v0.5 中尚未批准的实现候选：去除普通 Web 建车前的创建身份 Cookie/引导与跨标签初始化协调，推荐使用浏览器此次生成的同一 Cart Token 证明建车重试；每车 Cookie 保留，确认会话绑定不预设第二个每页身份。服务器单密文恢复方案不变。该候选需 S2 安全/恢复验证；首次响应前浏览器丢失 Token 且 Cookie 未到达时不能自动恢复或重复建车，其体验限制需在 S2 Review 接受或调整。旧候选保留为演进历史，不作为当前实施默认。L-01、P-04 与浏览器会话绑定细化继续 Pending，不新增业务表/身份服务/全局 Store。本轮仅文档自查，无实现或运行证据，Technical Design 仍 Draft。
