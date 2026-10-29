# Git Checkpoint Policy

本文件是阶段 Git Checkpoint 与 Transition Guard 的唯一规则来源。Workflow Skill 路由到本规则；AGENTS 只提供入口链接。

## 阶段检查与 Commit 时机

| 阶段 | 质量条件 | Checkpoint 时机 |
| --- | --- | --- |
| Requirements / Discovery | 稳定需求、约束或已确认决策已写入正式文档；需要的 Review 已完成 | 形成需长期保留的文档后提交；纯讨论不提交 |
| Product / UX Design | 当前设计轮次完成所需 Design Review，反馈已处理或明确待裁决 | 该轮设计成果、视觉资产或重要决策稳定后提交 |
| Technical Design | 架构/技术方案完成适用 Review，未决项有标记 | 稳定版本写入仓库后提交 |
| OpenSpec Planning | Proposal / Specs / Design / Tasks 完成规划 Review 与必要修订；Human Approval 已取得 | Approval 与质量检查齐备后提交；两项均完成才进入 Implementation |
| Implementation task group | Verification 通过，所需 Code Review 通过 | 一个有意义任务组完成后、下一组开始前提交 |
| Verification failure | 修复原因并重新验证；若风险要求 Review，则一并复核 | 不把已知失败作为正常完成 checkpoint；修复闭环完成后提交 |
| Review findings | Findings 已核实、修复、受影响范围重验并复核 | 下一任务组前提交修复，可与同一逻辑增量合并为一个提交 |
| Delivery | Delivery Review 通过，交付材料和持久验证记录已整理 | 提交 Human Acceptance 前提交持久变更 |
| Human Acceptance | 未通过时修复受影响内容，Verification → Review → Delivery 重新闭环 | 修复提交；纯批准不产生空提交 |
| Archive & Close | Human 接受；Spec 同步/归档及仓库范围检查完成 | 归档与状态变更检查后提交，再依授权处理 PR/Merge |

### Commit Before Next Stage

推进阶段或实施任务组前，Workflow 必须针对本阶段明确的成果路径调用 `scripts/git-checkpoint-guard.py`。必须给出阶段名、精确成果路径、适用的 Verification / Review 状态、所需 Human Approval 状态及 checkpoint commit。

Guard 通过条件：

1. 所要求的 Verification、Review、Human Approval 均明确为 `pass` / `approved`；不适用项须显式标记 `na` 并给出理由。
2. 有持久文件变更时，指定 checkpoint 是当前仓库可解析的 commit，且该 commit 包含列出的全部成果路径。
3. 列出的成果路径自 checkpoint 后没有 staged、unstaged 或 untracked 变更。
4. 不检查或要求清理成果路径之外的无关工作区变更。
5. 没有成果路径且显式声明 `--no-change` 时，允许无提交通过；不创建空提交。

Commit 不等于 Human Approval、Verification 或 Review。Guard 失败时停止阶段转换，修复/完成缺失条件后重试。不得自动暂存、提交、修改或清理文件；不得由通过结果自动触发 Push、Merge 或下一业务 Slice。Git 操作失败时如实报告并暂停。

建议调用格式：

```sh
python3 scripts/git-checkpoint-guard.py \
  --stage implementation \
  --path path/to/result.ts \
  --verification pass \
  --review pass \
  --approval na --approval-reason '本任务不需新增业务审批' \
  --checkpoint HEAD
```

若阶段要求 Human Approval，使用 `--approval approved`；缺少批准必须阻断。仅无文件变更时使用 `--no-change`，路径参数不得同时提供。

### Hook 协作与限制

显式 Transition Guard 是阶段转换的强制机制。Codex Lifecycle Hook 可作为提醒，但不得代替 Workflow 调用 Guard：通用 Stop 事件不能可靠推断当前阶段、有效成果范围、审查状态或 Human Approval。当前仓库未配置或验证项目 Hook 的信任、加载与阻断能力，因此本策略不将 Hook 提示宣称为强制门禁，也不增加每次工具调用的 Git 扫描。

阶段状态和质量声明由 Workflow 从当前 OpenSpec / 对话记录中取得并作为参数传入；Guard 对 Git commit、路径覆盖和路径状态做确定性检查，不把自然语言承诺当作 Git 证据。对无法由 Git 独立证明的 Review / Approval，Workflow 必须基于实际记录提供状态；不得伪造或推断。
