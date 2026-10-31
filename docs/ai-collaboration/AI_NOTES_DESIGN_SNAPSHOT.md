# 设计阶段 AI_NOTES 历史快照

保存自本轮整理前的 AI_NOTES（最后修改提交 `876de50`）。下文“当前”“本轮”和未实现描述均属于当时记录，不代表当前交付状态。仅调整迁移后的相对链接，原始协作附件未改。当前精选见 [AI_NOTES](../../AI_NOTES.md)。

# AI 协作关键时刻

> **当前状态校注 — 2026-10-29：** 下文过程与接收核对保留当时快照；Human 本轮 Baseline Finalization 已批准 Requirements 已确认范围，C-01 产品语义冲突已关闭（代提交仍 Planned Enhancement），C-02 已接受七工具。当前结论见 [工程决策](../../docs/engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29)。2026-10-29 Design Phase Closure 已批准 Technical Design v0.5 并结束设计阶段，Proposed/Pending/未运行项仍保留。旧 Draft、五工具与 Conflict 表述仅用于追溯，不是当前状态；不改附件原件或补造历史过程。


依据 [作业说明「二、繳交內容」第 3 项](../../references/home-quiz.md)，最终精选 **3–5 个真实关键时刻**，解释人如何发现 AI 的问题、保留哪些判断权，以及如何根据失败改进 context 或 skill。这里不按轮次追加流水账，不汇总每次 AI 决策、命令和例行验证。

当前精选 **5 个案例**：将原有两例治理纠偏合并为一例，将购买确认与计价/结账澄清合并为一例，保留 UX 跨工具交接，再融入技术栈与 Scope 收敛、Agent 多协议与授权演进两例。合并保留原事件及证据，不按轮次扩张主体。每例包含 Context、AI Contribution、Human Intervention、Outcome、Evidence、Lesson。

详细过程原件见 [产品/UX 协作摘要](../../docs/ai-collaboration/AI_COLLABORATION_NOTES.md)与 [技术决策协作补充记录](../../docs/ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md)，来源、完整性、状态对照及事实分类见 [入库核对](../../docs/ai-collaboration/README.md)。外部讨论经过来自 Human + ChatGPT 过程摘要，**未提供可访问的完整原始对话**；附件 E-T01～E-T13 是摘要内定位号，其引述未独立核验为逐字原话。仓库可核对的结果另列，不据最终产物反推讨论，也不以摘要批准业务修订。

## 1. Human 纠正交付文件职责与过量过程记录

- **Context**：Phase 0 提交 `8205834` 曾将工程基线、工具选择和例行操作写入需求决策及 AI 关键时刻；后续 Workflow/Review 重构又保留多份重复说明和两份长验证报告，偏离交付目的并增加维护成本。这是两次相关纠偏，未合称同一次事件。
- **AI Contribution（Codex）**：先重新核对作业，将工程决策迁至 ENGINEERING_DECISIONS、例行验证和 Skill 记录归 TOOLING，同步当时的协作入口；后按反馈合并重复规则、提炼验证摘要，移除冗余报告，将交付讲解独立存放、按需引用。
- **Human Intervention**：Human 明确 DECISIONS 应逐条说明需求判断与 PM 回复，AI_NOTES 只精选 3–5 个关键时刻；随后要求只保留重大决策和必要证据，避免 Agent 默认加载讲解材料。
- **Outcome**：需求判断、工程约定、验证与讲解各归其位；早期职责偏差未被当时 AI Review 拦住。后续治理整理于 2026-10-29 获 Human 补交授权后提交为 `8f66e5f`；该提交保存整理后的成果，不补造此前过程快照。
- **Evidence**：历史提交 `8205834`、纠偏提交 `4bfa369`；[工程决策](../../docs/engineering/ENGINEERING_DECISIONS.md)、[TOOLING](../../docs/engineering/TOOLING.md)、[ENG-010](../../docs/engineering/ENGINEERING_DECISIONS.md#eng-010--精简记录与独立交付讲解)及 [AGENTS](../../AGENTS.md)。前两次提交支持早期迁移，`8f66e5f` 支持后续整理；本次补交做了静态检查，未重跑历史浏览器或工具集成测试。
- **Lesson**：真实发生不等于值得长期记录；Human 对交付目的的判断与 AI 的例行检查各有职责。

## 2. Human 将购买确认、优惠与结账歧义收敛为可验证约束

- **Context**：PM 草稿的自动下单、永久交接、建车锁库存与隐蔽毛利排序存在信任和范围问题；满减、免运、Agent 折扣又缺顺序与精度定义，变价和响应丢失影响购买确认及重试。
- **AI Contribution（ChatGPT / Codex）**：据既有摘要，ChatGPT 比较转化、信任与权限取舍，拆解计价、重新报价/确认及幂等场景；Codex 负责归档与对照有效规则，未参与原始讨论。
- **Human Intervention**：据摘要和产品记录，Human 保留最终明确确认、有限交接期、建车不预留及不做毛利加权；再确认优惠前免运、先满减后 AI 折扣、订单级 HALF_UP、实质变化再次确认、整笔成败与成功重试返回原结果。24 小时等后续参数以原决策的确认记录为准。
- **Outcome**：形成 Accepted 产品约束及可检验的不变量；共享计价、原子成单和幂等仍无真实实现证据。D-01 保持原有效结论，后续代提交方向的冲突另见第 5 例。
- **Evidence**：[产品过程 Case 01](../../docs/ai-collaboration/AI_COLLABORATION_NOTES.md#case-01--对-agent-自动下单需求说不)、[Case 02](../../docs/ai-collaboration/AI_COLLABORATION_NOTES.md#case-02--将优惠规则和结账一致性从文字变为可检验约束)支持经过；[DECISIONS](../../DECISIONS.md) D-01～06、D-09～15、D-21 支持选择；[Requirements §6](../../docs/product/REQUIREMENTS.md#6-计价优惠与金额透明)与 [§8](../../docs/product/REQUIREMENTS.md#8-最终确认模拟结账与订单)承接结果但整体仍为 Draft。无本例业务测试或真实 Agent Demo。
- **Lesson**：购买意愿、金额、库存及重试都应留下明确约束，规则获确认与工程验证分别举证。

## 3. ChatGPT 设计讨论交接给 Codex，并保留 Human 的方向判断

- **Context**：UX 候选、流程与响应式讨论发生在外部 ChatGPT 对话，Codex 无法直接取得完整上下文；需要可供机器核对与人审查的交接。
- **AI Contribution（ChatGPT / Codex）**：摘要记载 ChatGPT 整理 UX Markdown/HTML 与设计取舍；仓库保留两份交接原件、Codex 设计预览、五页线框和三个视觉稿。本次 Codex 只核对档案与现有设计记录，没有重跑历史浏览器检查。
- **Human Intervention**：据摘要及现有 UX 记录，Human 选择页面与共享 Checkout 方向，撤回双语、最终仅保留 zh-TW；Product Design 记录 Human 接受线框/视觉稿方向。摘要另记载 Human 将 Review 注意力集中到购买安全、金额、权限及关键路径，并要求关键技术选择先经 Human + ChatGPT 讨论确认；具体纠偏经过无原始消息证据。
- **Outcome**：跨工具交接有 Markdown、HTML 和可渲染设计资产支撑；设计方向已接受、阶段已归档，完整响应式/无障碍验收仍未完成。技术决策与 Technical Design 未因此启动。
- **Evidence**：[过程摘要 Case 03–04](../../docs/ai-collaboration/AI_COLLABORATION_NOTES.md#case-03--chatgpt-设计决策到-codex-可执行原型的跨工具交接) 支持过程；[UX 决策](../../docs/product/PRODUCT_DESIGN.md#ux-decisions)、[原件及设计资产索引](../../design/README.md)、[Product Design §7、§9](../../docs/product/PRODUCT_DESIGN.md#7-design-review验收与实际证据) 支持当前产物、确认范围和历史有限检查记录。截图存在不等于本轮浏览器重验；原始对话及未覆盖验收仍缺证据。
- **Lesson**：跨工具交接需保存结构与来源；方向接受、有限检查和完整验收分开表述。AI 工具能力不替代 Human 的关键决策权，Review 深度按风险选择。

## 4. Human 将技术栈完整性收敛为熟悉栈与最小真实业务范围

- **Context**：据技术补充记录，Human 希望展示完整前后端和 Agent 工程能力，也担心 Next.js + NestJS、全量数据库建模和基础设施让虚拟交易作业过重；纯前端 Mock 又不足以展示真实状态变化。
- **AI Contribution（ChatGPT / Codex）**：据摘要 §2～3，ChatGPT 比较 Next.js 全栈、双框架、Fastify/NestJS 及不同持久化方向；在 Human 提出熟悉度约束后，建议 React + Vite + NestJS + Prisma/PostgreSQL，将精简重点放到业务 Scope。Codex 在上一轮依 Human 明确交接归档 T-*，本轮仅核对过程和结果，不声称做过框架实验。
- **Human Intervention**：据摘要 E-T01～05、09，Human 强调熟悉 NestJS/Prisma/PostgreSQL 的交付收益、薄后端及投入产出，同时坚持购物车、订单和模拟库存要有可观察的真实变化，排除登录、真实支付、物流、Redis/MQ、微服务及完整 DDD。
- **Outcome**：[T-01/03/04/06](../../docs/engineering/ENGINEERING_DECISIONS.md#决策索引)已记录 Accepted 技术与范围方向：只读目录、最小交易持久化、共享能力与本地优先；三表是初始方案，字段、约束、JSON、库存初始化和验证仍属 Pending Detail。摘要中的短事务、条件库存更新属于待核对设计建议，未因此成为已选定实现。
- **Evidence**：[技术过程 §2](../../docs/ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md#2-候选与取舍)、[§4](../../docs/ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md#4-human-判断与纠偏)、[E-T01～05/09](../../docs/ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md#6-证据与追溯)支持讨论回顾；[技术决策归档](../../docs/engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29)支持仓库选择；[Product Design 的展示限制](../../docs/product/PRODUCT_DESIGN.md#8-限制未决与下一步)说明当前设计资产不是真实商城。没有迁移、事务、性能或端到端运行证据。
- **Lesson**：控制复杂度可以从业务范围入手；熟悉栈与最小正确性需要结合交付目标判断，不能把虚拟交易等同无状态展示。

## 5. Human 推进多协议复用，并澄清购买授权与提交者的区别

- **Context**：据技术摘要，Agent 体验曾讨论仅返回链接、基础 MCP、MCP Apps 与 WebMCP；ChatGPT 起初倾向禁止 Agent 最终提交，Human 随后提出对具体购买内容有效授权后可以委托提交。该演进涉及已生效的 D-01 与 Checkout 权限边界。
- **AI Contribution（ChatGPT / Codex）**：据摘要 §3，ChatGPT 建议统一 Commerce 能力、结构化商品/报价摘要、以 MCP + Hosted Checkout 为基础，后续用独立 Adapter 和可复用 React 组件增强；在 Human 反馈后改为区分购买授权与执行者。Codex 将方向、设计缺口与产品冲突分别归档，本轮不实现或验证 Adapter。
- **Human Intervention**：据 E-T06～13，Human 要求保留多入口展示与组件复用价值、丰富 MCP 返回内容，明确 Monorepo/NestJS 内置 MCP 和 WebMCP 页面级范围，并提出有效人工授权后 Agent 代提交；同时保留 Human + ChatGPT 决策、Codex 归档的分工。
- **Outcome**：[T-02/04/05/06](../../docs/engineering/ENGINEERING_DECISIONS.md#决策索引)承接基础 MCP 五工具与 Hosted Checkout 的 Accepted 方向；WebMCP/MCP Apps 为 Planned Enhancement，独立验证且可降级。授权机制仍 Pending Detail，代提交保持 [C-01：Conflict — Pending Human Approval](../../docs/engineering/ENGINEERING_DECISIONS.md#c-01--agent-经具体授权后代提交产品体验权限修订)，不能由补充摘要覆盖 [D-01](../../DECISIONS.md#d-01--agent-购物权限与最终确认)。WebMCP 不暴露最终订单提交；摘要未解决 [C-02 的评论分页/修改映射](../../docs/engineering/ENGINEERING_DECISIONS.md#c-02--五工具边界与完整查询编辑能力映射)。
- **Evidence**：[技术过程 §3～5](../../docs/ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md#3-ai-建议按实际讨论演进)、[E-T06～13](../../docs/ai-collaboration/AI_COLLABORATION_TECH_DECISIONS.md#6-证据与追溯)支持建议与纠偏经过；[UX-04/05](../../docs/product/PRODUCT_DESIGN.md#ux-04--agent-handoff)、[Product Design §3](../../docs/product/PRODUCT_DESIGN.md#3-用户旅程与确认边界)支持当前共享 Checkout/原车编辑与确认路径。摘要中的 Codex 演示 Host 是讨论意向，未证明真实 MCP 调用或 MCP Apps iframe 展示；现有 HTML 原型也不是可直接复用的正式 React 业务组件。
- **Lesson**：共享业务能力可以承接多个入口，能力发现、UI 展示和购买权限仍须分别举证；新方向与旧产品决策的冲突要显式裁决，Agent 自述同意不能代替服务端可验证授权。
