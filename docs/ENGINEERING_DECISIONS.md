# 工程治理决策

本文件保存工程治理与工具协作选择，保留原有决策 ID。针对 PM 需求的假设、判断、取舍及回复另见 [DECISIONS.md](../DECISIONS.md)，不在这里混合维护。

状态：**Accepted**＝Human 已确认；**Proposed**＝待审议；**Deferred**＝明确后置；**Superseded**＝被后续决策替代。Accepted 治理基线来自 Human 的 Phase 0 指令；本轮生成的具体文档仍待 Human Review。日期均为 2026-10-28（Asia/Shanghai）。

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

- 状态：Deferred，尚无 Accepted 业务技术选择。
- 背景：前端框架/业务栈、Agent 接口协议、独立 Backend、数据库持久化、业务模块与交付顺序均未确定。
- 内容：Phase 1 建立确认需求，Phase 2 仅裁决全局影响和阻塞后续的方案，其余随具体切片审议。PM 业务规则保持 Draft，不在 Phase 0 分析或裁决。
- 理由：避免用工程工具初始化代替需求和方案决策。
- 替代方案：本轮自行选型或把原始需求全量标为批准；不采用。
- 影响范围：后续需求基线与业务 Change；当前 Phase 0 不阻塞。

后续工程条目沿用以上字段，并按需增加关联 Requirement/Change、Human 确认依据和替代关系。本文件不替代需求决策、正式规格或任务清单。
