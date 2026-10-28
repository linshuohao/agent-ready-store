# Agent-Ready Store

本项目将完成面向人类与 AI Agent 的商店作业。原始目标、交付要求和商品资料直接见 [作业原件](references/home-quiz.md) 与 [测试数据原件](references/products.json)，不在这里复制。PM 需求仍为草稿，需在后续阶段讨论确认。

当前为 **Phase 0 — Bootstrap & Governance，等待 Human Review**。已初始化 Git、OpenSpec 和项目工程规范，复用现有 Superpowers 插件。尚无商城代码、业务 Change 或正式业务 Spec；业务技术栈、Agent 协议、Backend、持久化、模块与顺序均未确定。当前没有业务启动、测试或 CI 命令；在确定技术栈与实现后补充。

采用 **Global Baseline + Incremental Change Loop**：Phase 1 建立全局需求认知，Phase 2 建立必要的最小架构基线，随后逐个业务切片经历规格、实现、验证和归档。Phase 5 汇总交付和复盘。阶段允许按证据回退，禁止提前铺开全项目详细任务。

## 开始协作

1. 先读 [AGENTS.md](AGENTS.md)，确认本轮授权与分支；按任务查阅需求决策或工程治理决策。
2. 按 [WORKFLOW](docs/WORKFLOW.md) 加载当前切片的必要上下文。
3. OpenSpec Skills 从 Codex Skills 入口调用；版本、实际可执行路径及验证命令见 [TOOLING](docs/TOOLING.md)。本机裸 `openspec` 指向旧版，须按该文档选择 1.15.0。
4. 在 OpenSpec Change 内维护唯一正式任务清单，按需使用 Superpowers 的测试、调试、Review 和验证技能。

## 导航

- [Workflow 与 Review Gate](docs/WORKFLOW.md)
- [GitHub Flow](docs/GIT_WORKFLOW.md)
- [Context Engineering](docs/CONTEXT_STRATEGY.md)
- [工具集成与 Phase 0 验证](docs/TOOLING.md)
- [需求决策与 PM 沟通](DECISIONS.md)
- [工程治理决策](docs/ENGINEERING_DECISIONS.md)
- [AI 协作关键时刻](AI_NOTES.md)
- [OpenSpec 配置](openspec/config.yaml)

后续交付仍需落实原件要求的自定义 Skill 创建、真实使用与迭代记录、GitHub Actions、真实 Agent 验证和完整提交历史；本阶段只建立机制。原件含保密要求，发布或分享资料前须确认授权。本轮不建远程、不 Push、不创建 PR、不合并；Human Review 后另行授权下一阶段。
