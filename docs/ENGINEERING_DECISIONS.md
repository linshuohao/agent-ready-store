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

## ENG-012 — 产品、设计与最终交付集成（待 Review）

- 状态：**Proposed**；Human 于 2026-10-28 授权本轮 Workflow Integration 的制作和非破坏性验证，具体文档/Skill 增量待 Human Review，不将 ENG-008/009 自动改为 Accepted。
- 问题与选择：已有双循环、权限守卫与 Review，缺少产品/体验/技术结果型基线及统一交付映射。复用现有工程决策文件承载 T-*，以 [产品、设计与交付契约](PRODUCT_ENGINEERING.md) 集中维护产物规则；Workflow 只路由，Review 只审查，OpenSpec 仍是唯一变更级 Spec/Design/Tasks 来源。
- 理由与取舍：新增一份按需参考比复制多份空基线、另建技术决策副本或第三套流程更易维护；完整结果型基线在足够决策及 Human Review 后才生效，不变成固定瀑布审批。
- 边界与后果：本轮不生成 Requirements、Product Design、Technical Design 或完成版 Showcase，不作技术选型、业务开发或产品决策变更；后续普通实现不强制改全局基线。既有 docs/presentation 讲解材料保留，最终 Showcase 只索引真实资产。
- 证据：修改前只读模拟已观察到 UI/UX、总体技术设计与最终交付缺少明确输出和检查规则；后续集成验证及覆盖限制见 TOOLING。本条记录拟议机制，不宣称商城或真实 Agent 已运行。

后续仅在重大工程决策或关键变更时新增条目，按需说明状态、依据、理由与影响；不把例行操作写成决策。本文件不替代需求决策、结果型基线、正式规格或任务清单。
