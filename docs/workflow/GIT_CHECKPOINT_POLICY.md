# Git Checkpoint Policy

本文件是阶段 Git Checkpoint 与 Transition Guard 适用条件及时机的唯一规则来源。按变更风险选择所需流程；Guard 是高风险或需要明确阶段交接时的检查工具，不是所有修改的通用门槛。Workflow Skill 路由到本规则；AGENTS 只提供入口链接。

## 阶段检查与 Commit 时机

| 阶段 | 质量条件 | 常见 Checkpoint 时机（按风险选择） |
| --- | --- | --- |
| Requirements / Discovery | 稳定需求、约束或已确认决策已写入正式文档；需要的 Review 已完成 | 需长期保留或交接的成果可形成 Checkpoint；纯讨论不提交 |
| Product / UX Design | 当前设计轮次完成适用的 Design Review，反馈已处理或明确待裁决 | 重要成果稳定且需要保留/交接时形成 Checkpoint |
| Technical Design | 架构/技术方案完成适用 Review，未决项有标记 | 重要方案稳定且需要保留/交接时形成 Checkpoint |
| OpenSpec Planning | 适用的规划产物、Review 与 Human Approval 已完成 | 复杂/高风险 Change 在进入 Implementation 前形成规划 Checkpoint；简单、可逆的单点变更不因使用 OpenSpec 而自动增加提交 Gate |
| Implementation task group | Verification 通过，所需 Code Review 通过 | 多阶段或高风险工作在有意义任务组交接时形成 Checkpoint；单一低风险任务不逐组造提交 |
| Verification failure | 修复原因并重新验证；若风险要求 Review，则一并复核 | 不把已知失败作为正常 checkpoint；修复并入所属增量，只有需要交接/保留时再提交 |
| Review findings | Findings 已核实、修复、受影响范围重验并复核 | 需要隔离交接时在下一任务组前 checkpoint；否则可与同一逻辑增量合并 |
| Delivery | 按风险完成适用 Review，交付证据已整理 | 有独立验收、发布或交接需要时形成 Checkpoint；普通局部变更可与实现一次完成 |
| Human Acceptance | 未通过时修复受影响内容，Verification → Review → Delivery 重新闭环 | 修复按风险并入原增量；纯批准不产生空提交 |
| Archive & Close | Human 接受；适用的 Spec 同步/归档与范围检查完成 | 有需持久保存的归档差异时，按提交授权与风险安排 Checkpoint；再依授权处理 PR/Merge |

## Risk-Based Guard Applicability

每次先按影响、可逆性、契约影响、验证难度及协作/交接需要判断是否需要独立 Checkpoint。OpenSpec 阶段本身、文件数量或任务数量不自动触发 Guard。

以下情况必须在阶段转换或高风险任务组交接前使用 `scripts/git-checkpoint-guard.py`：

- 涉及金额、库存、订单、幂等、权限/安全、数据一致性或关键竞态的不变量。
- 涉及不可逆或难回滚的数据/配置迁移、外部副作用，或失败代价明显较高的操作。
- 变更跨多个阶段/负责人，或需要将已验证成果作为明确交接基线。
- 适用的 OpenSpec Change 明确要求该 Checkpoint，且当前不是已说明的低风险例外。

单点、局部、可逆且可聚焦验证的低风险维护（例如小范围文档/目录调整、无行为变化的文件移动）可以跳过正式 Guard。Codex 在当前对话简要说明风险判断与验证方式即可；不为通过 Guard 新造提交、额外报告或工作流文件。中等风险按上述因素判断，必要时设置一个有意义的 Checkpoint，而非机械地每阶段/每 Task 提交。

跳过 Guard 不等于跳过必要验证、Human 对关键契约的决定或 Git 权限要求；Commit、Push、Merge、发布授权仍分别遵循 `AGENTS.md`。也不要求清理成果路径以外的无关修改。

当 Guard 适用时，针对本阶段精确成果路径给出阶段名、适用的 Verification / Review 状态、所需 Human Approval 状态及 checkpoint commit。

Guard 通过条件：

1. 所要求的 Verification、Review、Human Approval 均明确为 `pass` / `approved`；不适用项须显式标记 `na` 并给出理由。
2. 有持久文件变更时，指定一个或多个 checkpoint commit；这些 commit 均须是当前 HEAD 的祖先，且合并覆盖列出的全部成果路径。
3. 列出的成果路径自 checkpoint 后没有 staged、unstaged 或 untracked 变更。
4. 不检查或要求清理成果路径之外的无关工作区变更。
5. 没有成果路径且显式声明 `--no-change` 时，允许无提交通过；不创建空提交。

Commit 不等于 Human Approval、Verification 或 Review。Guard 适用且失败时暂停依赖该交接的阶段转换，修复/完成缺失条件后重试；不影响不依赖该阶段的已授权工作。不得自动暂存、提交、修改或清理文件；不得由通过结果自动触发 Push、Merge 或下一业务 Slice。Git 操作失败时如实报告。

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

若阶段要求 Human Approval，使用 `--approval approved`；缺少批准必须阻断。若本阶段成果分布在多个逻辑提交，重复传入 `--checkpoint <commit>`。仅无文件变更时使用 `--no-change`，路径参数不得同时提供。

### Hook 协作与限制

当风险判断要求 Guard 时，Workflow 显式调用；不设置对所有阶段/任务一律强制的 Guard。Codex Lifecycle Hook 可作为提醒，但不得代替 Workflow 调用 Guard：通用 Stop 事件不能可靠推断当前阶段、有效成果范围、审查状态或 Human Approval。当前仓库未配置或验证项目 Hook 的信任、加载与阻断能力，因此本策略不将 Hook 提示宣称为强制门禁，也不增加每次工具调用的 Git 扫描。

阶段状态和质量声明由 Workflow 从当前 OpenSpec / 对话记录中取得并作为参数传入；Guard 对 Git commit、路径覆盖和路径状态做确定性检查，不把自然语言承诺当作 Git 证据。对无法由 Git 独立证明的 Review / Approval，Workflow 必须基于实际记录提供状态；不得伪造或推断。
