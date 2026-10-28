# AI 协作记录

仅记录真实发生的事件。日期：2026-10-28（Asia/Shanghai）。本阶段无业务实现、业务 Change、自定义 Skill 或业务测试；不把下列工程检查称作最终交付验收。

## P0-01 — Human 限定治理范围，AI 保留业务问题

- 事实：Human 在本轮明确规定只做 Phase 0，提供工程基线并保留业务/架构决策权。AI 直接读取两份原件，未复制需求和商品数据到工程文档。
- 处理：只提取协作记录、完整 Git 历史、自定义 Skill、CI 与最终验证等工程交付约束；PM 草稿、商品与评论未升级为指令或批准需求。
- 关联：ENG-002、ENG-003、ENG-005、OPEN-001；业务 Change：无。
- 证据：原件基线 SHA-256 见下；`e595bf1` 是仅含原件及最小 ignore 的 Bootstrap Commit。

## P0-02 — 实际工具版本与表面命令不一致

- 事实：裸 `openspec` 返回 1.5.0，而 `npm ls -g` 显示另一个 Node 环境中的 1.15.0。
- 处理：AI 核对符号链接、包 manifest 和两个 CLI 帮助，使用现成 1.15.0 的绝对路径完成初始化；未伪称新装，也未改全局 PATH。
- 关联：ENG-001、ENG-007；路径、参数和生成结果见 [TOOLING](docs/TOOLING.md)。
- 结果：原生 core profile 生成 6 个 Codex Skills；`skills/list` 实际发现并启用全部 6 个，解析错误为空，doctor 健康。

## P0-03 — 沙箱阻挡与原件保护

- 事实：Git 索引写入和 `.agents` 生成首次受沙箱限制。Bootstrap 差异检查又发现原始 Markdown 的行尾双空格；OpenSpec 还尝试清理既有全局旧 prompts。
- 处理：通过运行环境权限机制完成已授权的项目 Git/Skills 写入；原件不修剪，仅对 Bootstrap 的一次检查临时排除行尾空格规则。重跑 OpenSpec 时额外禁止全局 `.codex`/`.config` 写入，保留旧 prompts；未修改第三方 Skills。
- 结果：Bootstrap 提交 `e595bf1`，随后切到 `docs/governance`；5 个旧 prompts 的前后哈希均匹配。原件校验按下列固定基线进行。
- 说明：这是 AI 发现并处理的环境问题，本轮没有发生可冒充为“Human 抓错”的业务纠偏。

## 原件完整性基线

读取前记录的 SHA-256：

```text
5db27433fe19761c6a9def418913498adbb8d316c061ff532e387a1975f6be0a  references/home-quiz.md
c0c09b271f528fab8925eab041982c056dd94f3e38183976102139050c020889  references/products.json
```

复核入口：`shasum -a 256 references/home-quiz.md references/products.json`，并与 Bootstrap 的 Git blob 核对；最终检查记录在交付说明及本文件后续条目中。

## P0-04 — 有限验证与独立 AI Review

- 事实：使用 Superpowers `verification-before-completion`，实际校验原件哈希与 main blob（2/2）、要求文件（9/9）、本地链接（30 个）、业务 Spec/Change 为空、6 个 Codex 项目 Skills 启用且无解析错误、Superpowers 7.0.1 manifest 和 4 个适用品质技能文件可读。`doctor`、两种 `list` 和 `validate --all --strict` 均退出 0；validate 明确没有待验证项目。暂存差异的 `git diff --cached --check` 无输出且退出 0。
- Review：依 `requesting-code-review` 委派独立只读 AI 审阅，检查本轮完整治理文件及生成集成。结果无 Critical/Important 问题；审阅还核对 6 个 Skills 与本机 1.15.0 官方 core 生成内容逐字一致。唯一状态提醒是：治理提交发生前不可声称已有该 Commit；最终以真实 Git 日志为准。
- 处理：依 `receiving-code-review` 核对反馈，仅记录真实完成的 Review 和验证，不把 AI Review 作为 Human 批准。此条与治理文件由同一治理提交保存，可用 `git log --oneline main..docs/governance` 定位；不在提交前预填其哈希。
- 限制：未运行业务构建、业务测试、CI 或真实购物 Agent；这些留待后续实现和交付。原件、治理规则和工具发现检查不能替代业务验收。

## Skill 与后续证据机制

本轮实际读取并应用 Superpowers `using-superpowers`；读取 `brainstorming` 后，依 Human 已给定的完整治理要求直接执行，未另造正式设计/计划；使用 `verification-before-completion` 检查声明是否有新证据。OpenAI Docs 用于核对 Codex Skills 官方说明。只读检查 OpenSpec Explore 的入口与约束，没有开展业务探索。

自定义 Skill：**尚未创建；真实使用次数 0；尚无版本迭代**。后续在有真实需求时创建并实际使用，按“日期 / Skill 路径与版本或 Commit / 当前任务与 Change / 输入目的 / 结果与证据 / 失败或人工纠偏 / 下一版调整”逐次记录。使用次数从这些记录计算，不预填目标次数，不把安装、阅读或第三方 Skill 调用计入自定义 Skill 使用。

后续关键事件同样记录触发、Human/AI 各自行为、决定或纠偏、真实命令结果及关联 Requirement/Decision/Change/Commit；整理成原作业要求的关键时刻时保留原始事实，不补造尚未发生的协作历史。
