# Git 协作规范

采用轻量 GitHub Flow：**Branch → Commit → Verify → Review → PR → Merge**。本地每次提交前先做适当检查，提交后对最终提交再次核验；顺序不意味着提交前可以省略验证。

- `main` 保持稳定，不直接开展开发；不设置长期 `develop`。
- 从稳定基线创建短生命周期分支：`docs/*`、`feat/*`、`fix/*`、`test/*`、`refactor/*`、`chore/*`。一个可审查工作单元或 Change 使用一个分支；无需每个细小 Task 新建分支。
- 不覆盖已有工作区、改写他人历史或编造 Git 身份。先检查当前分支、暂存区、未提交修改和远程配置；显式暂存本次范围内的文件。
- 使用 Conventional Commits：`type(scope): summary`，scope 可省略。例如 `docs: establish engineering governance`；正文按需关联 Decision、Change 与验证证据。
- 提交应表达真实工作历史；禁止为展示过程伪造提交。不 squash 有意义的历史，不随意 amend 已共享提交。

## Review 与合并

1. 完成当前范围并验证最终 diff，确认原件、机密和无关文件未被修改或提交。
2. PR 说明具体问题、最终行为、范围、关联 Decision/Change、实际验证及剩余风险。明确哪些测试未执行以及原因。
3. Review 检查需求/Spec 符合性、实现质量和验证证据；关键决策仍按 [Workflow](WORKFLOW.md) 交 Human Review。问题修复后重验，再请求复审。
4. 必需检查和 Review 通过且获得合并授权后，优先 **Merge Commit（`--no-ff`）** 保留有意义历史；不以 squash 替代原作业要求的完整历史。
5. 合并后验证 main，按需删除已完成分支。归档位置与时机见 Workflow，不能因归档直接写 main。

后续技术栈确定后设置 GitHub Actions，并在具备远程与权限时落实分支保护/必需检查。当前没有远程或服务器端保护，以上是协作约定，不能声称已被平台强制执行。

## 本轮实际状态

- 2026-10-28，检查确认无既有 Git 仓库，使用已有用户身份初始化 `main`。
- `e595bf1`：`chore: bootstrap original reference materials`，仅包含两份原始资料与最小 `.gitignore`。
- 原始 Markdown 自带行尾双空格。默认 `git diff --check` 曾报告该行；未改动原件，仅对 Bootstrap 检查临时排除行尾空格规则，无持久配置变更。
- Bootstrap 后创建 `docs/governance`；工具集成和治理文档在该分支提交。以 `git log --oneline main..docs/governance` 查看本轮治理提交。
- 本轮不创建远程、不 Push、不建 PR、不合并到 main。完成本地提交与验证后停止等待 Human Review。
