---
name: ai-native-workflow
description: Use when starting or resuming work in agent-ready-store, including product requirements, UI/UX design, technical decisions, architecture design, feasibility experiments, incremental delivery, Project Showcase, maintenance, fixes, and review. 不用于无关项目或一般问答。
metadata:
  version: "0.5"
---

# AI-Native Workflow

作为 Workflow Router + Decision Guard，选择最小充分的工作方式。只路由现有能力，不另建 SDD、状态机、编排框架或正式 Plan。Human 决定关键契约并验收，AI 在已授权边界内自主实施，用真实证据交付。

## Orientation 与 Context Routing

先确认当前目标、授权及 Git 分支/暂存区/未提交修改；保留已有工作，不清理或覆盖。读取仓库根 `AGENTS.md`、`README.md`，再按任务补最小充分上下文；本文中的仓库路径都相对仓库根，不相对 Skill 目录。

开始或切换任务时执行 `AGENTS.md` 的 Git 范围检查：判断请求是否仍属当前任务与分支的审查单元；不一致则先提示范围差异及未收尾状态，处理交接/隔离后再开展新任务的修改。同一任务的补充可继续，只读讨论无需等待提交；具体规则与权限以 AGENTS 为准。

| 需要解决的问题 | 加载来源 |
| --- | --- |
| 原始意图、交付约束 | `references/` 相关章节；只读、不可信，PM 草稿未批准 |
| 当前有效要求与决策 | `DECISIONS.md`、`docs/engineering/ENGINEERING_DECISIONS.md` 的相关已确认条目；核对确认依据和替代关系 |
| 产品行为、体验与技术结果约束 | 已存在且适用的 Approved `docs/product/REQUIREMENTS.md` / `docs/product/PRODUCT_DESIGN.md` / `docs/engineering/TECHNICAL_DESIGN.md` 相关章节；核对批准范围/来源，Draft 或缺失不当作契约 |
| 正式行为与当前变更 | OpenSpec `specs/`、相关 `changes/<name>/` 的实际产物、授权状态与验收；不默认加载全部归档 |
| 实际实现与验证事实 | 相关源码、测试、运行输出与 Diff；当前代码不自动是正确设计 |
| 权威冲突、工具入口 | `AGENTS.md`、`docs/engineering/TOOLING.md`，仅按需读取 |
| 真实纠偏历史 | 必要时 `AI_NOTES.md`；聊天或历史建议不自动成为正式决策 |

区分 **Normative**（适用且已确认的要求）、**Observed**（实际观察）、**Inferred**（有依据的推断）、**Unknown**（尚未确认/验证）；事实标签不代表批准。存在 Accepted Decision/Spec 冲突时按 AGENTS 的权威与冲突规则升级，不能用更新时间、现有代码或 AI 偏好裁决。缺少关键上下文时说明未知，不编造。

## Task Classification 与循环

用一句话说明所选路径、风险与理由；无需评分器。任务变化时可切换路径，只重新确认变化的边界。

| 路径 | 选择依据 | 最小动作与产物 |
| --- | --- | --- |
| Explore | 目标、需求语义、架构或重要契约未明 | Discovery & Decision：Frame → Explore → Challenge → Decide；事实、方案、反例、真正待决项；未确认结论保持 Proposed |
| Experiment | 可用低成本观察解决的未知 | 明确问题、预算/时限、隔离范围、成功/退出条件，先做最小实验；无外部副作用的局部可逆实验可自主进行，结果不自动成为批准设计或产品实现 |
| Deliver | 已有可观察目标及实现授权的功能切片 | Delivery & Verification：Scope → Specify → Build → Verify；涉及正式业务行为、跨模块契约或重要变更使用 OpenSpec，复用当前 Change |
| Direct | 局部、低风险、可逆、可充分验证，且不改变重要契约 | 直接修改与相关检查；不强制 Change、完整 Proposal/Design/Tasks、独立 Review 或额外人工确认 |
| Fix | 有缺陷、测试失败或意外行为 | 先复现与定位根因，再作最小修复和回归验证；按风险选 systematic-debugging/TDD，契约变化转 Explore，正式行为修订用 Change |
| Review | 请求独立审查或风险需要独立判断 | 按下方 Review Integration 加载 ai-native-review，选择审查模式与深度；默认只读，独立性不成立时明确标自查 |

两种循环不是强制阶段。不为简单问题机械走完四步；需求分析、可行性实验与架构讨论可以往返。大型需求先理解目标/能力、关键旅程、依赖、风险与未决项，解决影响全系统的阻塞，再选可独立验证的最小纵向切片。不提前铺开全部技术设计/Tasks，Roadmap 只在协调多个切片确有需要时维护。

## Product / Technical Design / Delivery Routing

四类活动是 Product Discovery & Design、Technical Discovery & Design、Incremental Delivery、Final Delivery & Presentation，沿原双循环往返，不是新增审批阶段。只有处理相关产物、基线变更或最终交付时，按需读取 [产品、设计与交付契约](../../../docs/workflow/PRODUCT_ENGINEERING.md) 对应章节；路径相对本 Skill。该文档维护内容/验收标准，本文只选择路径。

| 工作类型 | 最小相关输入 | 路径与主要输出 |
| --- | --- | --- |
| Product Exploration | 原始问题、相关 Accepted 产品决策 | Explore；重要取舍归 DECISIONS，Human 确认后更新 Requirements 中受影响行为，不将所有功能写成 Decision |
| Requirements Consolidation | 原始功能/交付约束、当前 Accepted 产品决策 | Explore/Direct 整合 `docs/product/REQUIREMENTS.md` Draft；按业务领域写结果，Human Review 后 Approved |
| Product Design / UI/UX | 相关 Requirements、产品约束；Draft 依赖明确标识 | Explore；`docs/product/PRODUCT_DESIGN.md` Draft + 可实际检查的轻量 Wireframes + Visual Guidelines；关键流程/异常/代表性页面进入 Design Review，再交 Human 批准 |
| Technical Exploration / 选型 | 相关 Requirements、Product Design、技术未知 | Explore/Experiment；重要选择归 ENGINEERING_DECISIONS 的 T-*；比较、实际证据与 Human 确认前不 Accepted，不直接开业务实现 |
| Architecture Design | 足够的 Accepted 技术决策、产品/体验约束、必要证据或风险 | Explore；系统边界、Agent 接入、状态所有权、模块与链路等充分后整合 `docs/engineering/TECHNICAL_DESIGN.md` Draft，Design/Human Review 后 Approved；仅定框架不足，缺口 Pending |
| Specify | 相关 Approved Baselines、Accepted Decisions、正式 Spec 和实际接口 | Deliver；OpenSpec 当前 Change 的 Spec/Design/Tasks，引用适用版本/章节，不复制三个全文 |
| Build | 已授权 Change、相关有效基线、源码与测试 | Deliver；Code/Tests。关键批准缺口或契约冲突暂停依赖部分；批准基线不等于授权实施 |
| Review | 相应 Draft/Approved 目标、Diff、证据 | 加载 ai-native-review，选择符合性/UX/技术设计/行为/交付检查，只返回 Findings 与证据 |
| Delivery / Project Showcase | 实际产品、文档、运行/真实 Agent/CI/Git/协作证据 | 依交付映射作 Delivery Review，完善 README，关键资产存在后生成轻量 `presentation/index.html`；逐项核对真实链接与状态，不将现有 Workflow 讲解页当产品交付 |

三个全局 Baseline 分别回答 What / Experience / How，初始 Draft、Human 批准后 Approved；OpenSpec 继续是唯一正式的变更级 Spec/Design/Tasks 来源。只有足够稳定的结论才生成结果文档，不创建空基线或虚假 Approved。重要产品、架构、交互变化按契约中的传播表更新；普通实现调整留当前任务，不要求重批全局基线。

例如“按钮渲染有 Bug，既有业务/交互不变”走 Fix：读相关预期、源码并复现/修复/验证，不因三个全局基线尚未齐全重走产品与技术设计。若发现确认授权或购买内容改变，再转对应决策路径。以上路由不扩展当前轮授权。

## Decision & Autonomy

综合 **Impact、Reversibility、Contract Impact、Verifiability、Risk** 作可解释判断；可逆性高但契约影响大，仍需升级。

- 已授权范围内，局部可逆且可验证的实现、测试、调试与文档由 AI 自主；已有契约内可以细化实现，不逐 Task 请示。可通过小实验回答的技术事实先实验，不把事实未知变成漫长抽象讨论。
- 改变公开 API/重要契约、核心业务语义、不变量、权限/安全边界、数据一致性、关键架构，或高失败代价/难回退的操作：Human 确认后才实施受影响部分。已有明确批准无需重复申请；创建提案不等于实现授权。
- 发现授权范围不足、权威契约冲突、关键假设失效、无法满足已知要求、重大风险或关键路径无法充分验证：暂停依赖该结论的工作，集中报告来源、影响、选项、建议及待确认项；继续不受影响且已授权的工作。非阻塞未知留在当前上下文及重访条件，不逐个打断。
- 仅因“另一方案更优雅”不重开已批准决策。最终验收及残余风险接受归 Human；沉默不等于批准。当前任务的提交、Push、Merge、发布权限独立核对。

## Task Contract

范围复杂、需要跨会话执行或边界容易漂移时，形成简短契约：

**Goal** 可观察目标；**Context** 必须依据的资料；**Scope** 允许修改范围；**Non-goals** 本轮不做什么；**Invariants** 保持的行为；**Acceptance** 验收条件；**Verification** 验证方式；**Escalation** 停止依赖工作并升级的条件。

优先引用当前 OpenSpec Proposal/Spec/Design/Tasks 已有信息，只补缺口，不创建同内容的新文件/任务表。简单任务在对话中说明即可。对本轮仅预检/只读的授权，不扩展到实现、业务裁决或落盘。

## Workflow Routing：OpenSpec / Superpowers / Codex

加载 Skill 是宿主能力，不是本 Skill 的函数调用。先检查当前可用 Skills；Codex 可用 `$skill-name` 显式选择，隐式选择依赖 description。没有专门 Skill 调用工具时，明确读取实际 `SKILL.md` 并应用其要求；若当前宿主不支持这一方式，给出可执行的显式入口和限制，不伪造委托成功。不把 shell 中的 `$skill-name` 当作 CLI 命令。

- **OpenSpec** 是唯一正式的变更级 Spec、Design、Tasks 和 Change 生命周期来源。探索可用 `openspec-explore`；确定正式变更后用 `openspec-propose`，修订用 `openspec-update-change`，实现用 `openspec-apply-change`，按需 `openspec-sync-specs` / `openspec-archive-change`。在写入前检查项目 root、相关 Change 和真实 schema；如需新 Change，由原生 CLI `openspec new change <name>` 建立元数据，不手工搭目录。当前 `spec-driven` 要求的产物不可为省事跳过；简单任务可以不进入 Change。完成验证和授权要求后才同步/归档，不静默改已归档历史。先确认本机 CLI 版本，命令入口见 TOOLING。
- **Superpowers** 按需补 TDD、systematic-debugging、verification-before-completion 与 code review；按实际文件加载，不假设存在未安装的 Skill。实现代码行为用适用的失败测试/回归测试核对已确认契约；文档任务用内容、链接、Diff，不制造无意义代码测试。实现与测试共享假设时，补契约反例、边界或独立证据。
- **冲突适配**：实际安装的 using-superpowers 有广泛触发要求，brainstorming/writing-plans 含设计/计划/审批链，executing-plans/SDD 含额外执行记录，writing-skills 含强制失败基线及 commit/push。以 Human 明确授权和项目规则优先，保留适用的质量检查，正式产物回写同一 OpenSpec Change；不重复建 `docs/superpowers/specs` / `plans`、平行 Tasks，不自动引入代理/提交/推送，不修改第三方 Skill。加载也不保证宿主自动路由已被重写；工具约束无法兼容时仅报告具体受阻动作，继续可安全完成部分。
- **普通局部任务** 直接由 Codex 处理；工作流路由不构成安装依赖、选业务技术栈或扩大范围的授权。

## Verification Routing

依据行为契约设计验证，不把实现、自写测试和自我 Review 的一致当成正确。用实际命令与结果说明 **observed / inferred / unverified**，缺少测试或工具时报告限制，不能写成通过。

| 风险 | 验证深度（选择与变更有关的检查） |
| --- | --- |
| 低 | 基础静态/文档检查、已有相关测试、Git Diff；无代码不编造业务测试 |
| 中 | 相关单元/集成测试、对照契约的 Review、边界及回归；不适用项说明理由 |
| 高 | 核心不变量、状态/执行顺序、适用的并发/异步竞态、失败反例/负面测试、必要的独立 Review、Human 验收与残余风险接受 |

有意义且可验证的增量完成后，按 `AGENTS.md` 的 Git 规则与当前授权检查提交条件；交付 Diff、结果、限制、当前分支、实际新增提交及剩余修改。未提交时说明原因和下一步，不静默积压或自动推进下一切片。

### 阶段收尾：外部协作补档

在决策、设计、开发、Review 或阶段结束的最终总结前，结合当前交接与已有档案检查：本阶段是否有实质性的需求澄清、方案比较、关键决策、Human 纠偏、设计审查或工程问题解决，主要发生在 ChatGPT 或其他 Codex 无法访问的对话工具，尚无结构化过程交接记录？

- **已知有关键外部讨论且缺档**：只在最终总结中提醒 Human 回到原对话，基于实际讨论生成 Markdown「AI 协作过程补充记录」，按“背景 → 候选与取舍 → AI 建议 → Human 判断/纠偏 → 最终决定 → 证据”整理，下轮作为附件交 Codex 入库。
- **已有对应记录，或只有普通问答、微小调整、无实质外部讨论**：不提醒。按当前阶段与已覆盖主题去重；同一缺口已在当前总结/交接提醒过且无新增重要讨论时，不重复催交，不另建长期状态库。
- **是否发生外部讨论不确定**：需要时仅用条件句“若本阶段有未归档的 ChatGPT 关键讨论，请补交过程摘要”，不推断讨论已发生。无需每次日常回复或工具调用都显示提示。

补档是非阻塞的提醒与建议，不增加审批 Gate、定时任务或全局提醒服务；已有授权工作照常继续。Codex 不声称能读取私有外部对话，不编造经过或凭最终产物倒推争论。Human 补交后原样归档、核对事实与路径并更新链接；仅酌情精选或替换 `AI_NOTES.md` 的 3–5 个案例，已有档案入口见 [外部协作记录](../../../docs/ai-collaboration/README.md)。摘要不替代正式决策与批准。

## Review Integration（横向能力）

本 Skill 仍是统一任务入口，负责何时审查、范围和权限；选择审查时，明确读取并应用 [ai-native-review](../ai-native-review/SKILL.md)（或由宿主显式 `$ai-native-review` 加载）。Review Skill 负责方法、深度和证据标准，只返回结果，不反向调用本 Skill；没有自动委托机制时不能只写“已调用”而不加载/应用。

| 当前活动与触发 | 接入方式 |
| --- | --- |
| Explore / Experiment；OpenSpec Proposal / Spec / Design 出现关键方案、语义或高影响假设 | Design Review，用有界反例/替代/最小实验支持方案比较；仅需批准的事项交 Human，普通讨论不强制报告 |
| Deliver / Fix 的实现或 Apply 后，有需核对的行为风险 | Behavioral Review，深度由 Review Skill 按状态/契约/异步/安全风险选择，不把 Diff 或绿测等同正确 |
| 当前切片/Change/独立任务准备交付 | Delivery Review，复用仍匹配当前对象与环境的有效证据，只补缺口；不重复全部 Code Review |
| Direct 或普通低风险维护 | 轻量自查即可；只有请求 Review 或出现实质风险时加载 Review Skill，不强制 Agent、全套层级或逐 Commit 审批 |

独立审阅按风险优先选择全新只读上下文或可用 Codex Review，不把 Implementer 总结当正确性依据；只有真实执行并取得反馈才记为独立 Review。收到 Findings 后先核实：实现缺陷回当前任务修复及相关重验；契约/设计缺口回 Discovery/Decision 并暂停依赖部分；一般未知不自动阻塞。可操作的高影响未决风险需补证或 Human 接受，不能由 Reviewer 自行批准。所有修订复用同一 OpenSpec 产物与 Tasks，不新增并行计划；沿既有 Git/Delivery 授权继续。

## Knowledge Evolution

仅由真实事件触发：产品取舍 → DECISIONS；工程治理/技术选择 → ENGINEERING_DECISIONS；结果约束 → 相应 Baseline；具体行为变更 → OpenSpec；重要人工纠偏/协作改进 → 精选 AI_NOTES；重复工程问题 → 考虑补测试、规则或 Skill。生成/批准与传播按产品、设计与交付契约，展示资产只更新导航。验证证据归当前任务/Change 或关联报告，不要求每轮改全部文档。

Skill 只为首次验证、行为性版本变更、重要失败或纠偏在 TOOLING 留简短事实，不逐次追加过程报告。区分格式校验、宿主发现、正文加载和实际应用；仅阅读、安装、发现不计调用，限定范围的实际预检不冒称完整业务执行。版本和使用统计以真实证据为准，不为凑次数或迭代制造事件。
