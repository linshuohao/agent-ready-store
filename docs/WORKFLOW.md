# 项目执行流程

## 两层工作流

**Global Baseline + Incremental Change Loop**。全局基线建立整体认知并随反馈更新；详细规格和任务只属于当前选定的业务切片。基线不要求一次解决所有细节，也不生成全部功能的 Spec、Design、Plan 和 Tasks。

| 阶段 | 目标与产物 | 推进条件 |
| --- | --- | --- |
| Phase 0 — Bootstrap & Governance | Git、工具、治理、上下文与验证机制 | Human Review 本轮结果后再授权 Phase 1 |
| Phase 1 — Requirement Analysis | 全局需求盘点、多轮讨论，建立需求地图、能力边界、依赖、风险、问题和初步 Roadmap | 关键目标与边界足以支持最小架构讨论；允许保留非阻塞问题 |
| Phase 2 — Architecture & Technology | 基于确认的关键需求，形成最小架构基线和增量交付顺序 | Human 确认全局影响或阻塞开发的架构决策；避免过早定案局部细节 |
| Phase 3 — Specification & Planning | 为当前切片创建 OpenSpec Change，维护 Proposal、Spec、Design、Tasks | 审核范围、验收标准、Blocking Decisions 与实现授权 |
| Phase 4 — Implementation & Verification | 按 Change Tasks 实现、测试、Review、纠偏、提交 | 验收证据完整，阻塞缺陷修复并重验 |
| Phase 5 — Delivery & Retrospective | 整体交付、真实 Agent 记录、CI、文档、自定义 Skill 与人机协作复盘 | Human 验收交付要求和剩余风险 |

Phase 3–4 对每个切片重复，Phase 1–2 可因新证据局部重访。阶段编号不代表不可回退的瀑布流程。CI 在技术栈确认后配置。

## 全局需求基线

Phase 1 才创建以下文件；本轮不填业务内容：

| 位置 | 唯一职责 |
| --- | --- |
| `docs/requirements/INVENTORY.md` | Requirement Inventory：稳定 ID、原件定位、需求摘要、Draft/Confirmed/Deferred/Rejected 状态及 Decision/Change 链接 |
| `docs/requirements/CAPABILITY_MAP.md` | Capability Map 与 Cross-Module Dependencies；边界与依赖，不存详细实现任务 |
| `docs/requirements/RISKS_AND_QUESTIONS.md` | Risk & Open Questions：风险、问题分级、影响范围与解决条件 |
| `DECISIONS.md` | 需求 Decision Log：针对每条调整或有疑问的需求，记录原意、假设、判断、取舍及 PM 回复；工程治理选择另见 `docs/ENGINEERING_DECISIONS.md` |
| `docs/ROADMAP.md` | Incremental Roadmap：切片目标、优先级、依赖、状态与 Change 链接 |

Roadmap 不存逐项技术任务或第二份任务勾选表。状态可用 Candidate、Ready、In progress、Delivered、Deferred；Delivered 必须有验收和归档证据。

## 增量 Change 循环

1. 从 Roadmap 选择下一业务切片，核对前置依赖。
2. Explore 当前需求、约束和证据；复用已有全局认知，不重新分析全部项目。
3. 分类问题并处理 Blocking Decisions，完成必要 Human Review。
4. 使用 OpenSpec 原生命令/Skill 创建 Change，不手工绕过生命周期元数据。
5. 按原生 schema 完成 Proposal、Spec、Design、Tasks。Design 深度按风险调整；当前 `spec-driven` schema 要求 design 时，简单变更用简短说明，不擅自删除必需产物。
6. 审核范围、非目标、验收标准和关键任务完成条件；实现需有明确授权，生成 proposal 本身不代表获准实现。
7. Codex 按唯一 Tasks 执行，按需加载 Superpowers 的 TDD、调试和验证能力。
8. 测试、Review、修复、重验并提交；走 Git Review/PR/合并流程的条件见 [Git 规范](GIT_WORKFLOW.md)。
9. 对已实现且通过验收的 Change 执行 OpenSpec Archive；确认规格同步情况。优先先在工作分支归档并验证，再交由 PR 合并；若流程上合并后才归档，另建短分支补归档提交，不直接改 main。
10. 更新需求覆盖状态、Decision 和 Roadmap，评估下一切片。归档表示该 Change 完成，不自动授权下一切片、合并或发布。

## 拆分与回退

优先采用 Vertical Slice：目标清晰、可独立验证、范围可控、依赖已知、完成条件明确。不要机械按前端、后端、数据库拆分，也不要让一个 Change 大到难以 Review。高风险不确定性可先做限时验证，事先明确问题、时限、产物与退出条件；实验结果不自动成为已批准架构。

- 未进入 Change 的需求变化：更新全局清单和相关 Decision，保留来源与状态。
- 设计或实现中的变化：评估范围、依赖、验收和已有代码影响，修改当前 Change 对应 Spec、Design、Tasks；显著扩范围先 Human Review，必要时拆出后续 Change。
- 已归档后的行为变化：创建新 Change，引用旧 Change 和被替代 Decision；不得静默重写归档记录掩盖演进。OpenSpec 正式 specs 通过后续 Change 同步更新。
- 发现关键假设失效：暂停受影响任务，回到 Explore/Decision/规格修订；不受影响且已授权的低风险工作可继续。

## 职责与 Review Gate

Human 对业务、架构及重要工程决策拥有最终决定权。AI 可自主处理已授权范围内的局部实现、测试、调试、文档、验证及提交，不为每个细节重复申请审批。

| 问题级别 | 处理规则 |
| --- | --- |
| Blocking | 阻塞当前 Change 安全实施；停止依赖该问题的工作，带证据和选项交 Human 决策 |
| Deferrable | 暂不阻塞；记录影响、暂定边界、负责人和重访触发条件 |
| Non-critical | 已授权范围内可逆细节由 AI 自主处理；必要时留下简要理由 |

以下事项需必要的 Human Review：业务规则变化；系统边界或关键架构变化；安全、数据一致性、用户授权决策；实现与正式 Spec/Decision 冲突；Change 范围重大变化。已明确授权的具体事项无需反复审批。没有回复不等于批准，草稿不能自行转 Accepted。

## 任务级闭环

**Context → Implement → Test → Review → Correct → Commit**。先确认当前 Spec、Decision、验收标准与任务完成条件，再实现；适用时 TDD 的失败测试发生在实现前。失败需修复并重验，Review 修订后跑受影响检查。

每个 Change 必须有可观察的验收标准；关键任务必须说明如何证明完成。记录实际命令、结果、失败与限制，区分未执行和通过。Review 至少覆盖规格符合性、质量、安全/授权边界及回归；AI Review 支持必要的 Human Review，不替代它。提交后仍核对工作区和提交范围。

验证证据放在当前 Change 的 Tasks 验证条目或关联报告；工具初始化记录放在 `docs/TOOLING.md`。失败、人工纠偏、相关 Commit/Change 应可追溯，但无需每轮写入 AI_NOTES。`AI_NOTES.md` 仅精选最终 3–5 个关键协作时刻，确有价值时链接相关证据；自定义 Skill 使用与迭代明细按 TOOLING 的机制记录。纯文档任务用链接、内容一致性和差异检查，不编造业务测试结果。
