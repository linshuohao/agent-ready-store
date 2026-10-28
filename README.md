# Agent-Ready Store

面向人类与 AI Agent 的商店作业。目标与交付约束见只读的 [作业原件](references/home-quiz.md) 和 [商品原件](references/products.json)；PM 需求仍是草稿。

已有工程工具与工作流集成草案，尚无商城代码、业务 Change 或正式业务 Spec；产品决策 D-01～D-22 已记录。Product Design 阶段已归档：Human 接受五页线框与三个代表性视觉稿的设计方向，完整验收仍有未完成项。Human + ChatGPT 已确认的主要技术选择归档于 [T-01～T-06](docs/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29)，记录准确性待 Human Review；Agent 代提交等冲突与契约缺口单列待审。尚未生成 Technical Design 或授权业务开发。启动、业务测试及 CI 命令待实际实现后补充；治理增量待 Human Review。

## 日常协作

从 [AGENTS.md](AGENTS.md) 与 [ai-native-workflow](.agents/skills/ai-native-workflow/SKILL.md) 开始，按任务获取最小上下文。关键设计、行为与交付风险按需接入 [ai-native-review](.agents/skills/ai-native-review/SKILL.md)。OpenSpec 管变更级正式规格和任务，Superpowers 提供测试、调试等执行方法，不维护平行计划。

## 交付讲解

[打开 Workflow 图与设计思想讲解](docs/presentation/ai-native-workflow.html)。下载仓库后，用浏览器打开该 HTML 即可，离线可用；GitHub 文件页显示的是源码，可下载后打开。

这是面向人的独立演示页，介绍目标、三平面、两种循环、Review 与工具分工；不作为 Agent 默认上下文或批准依据。

最终 Project Showcase 尚未生成；其信息架构、真实资产映射与验收规则见 [产品、设计与交付契约](docs/PRODUCT_ENGINEERING.md#project-showcase-生成与维护)。当前讲解页不代表产品已交付。

## 记录入口

- [Product Design](docs/PRODUCT_DESIGN.md)：归档的页面、旅程、交互、视觉与响应式方向；确认范围、实际验证及未完成项。
- [Design Preview](design/index.html)：五页线框、三个代表性视觉稿与异常状态；资产与来源说明见 [design/README](design/README.md)。
- [UX Decisions](docs/UX_DECISIONS.md)：已确认设计决策及其历史；原始交接材料索引见设计资产说明。
- [DECISIONS](DECISIONS.md)：逐条需求的假设、判断、取舍及 PM 回复。
- [ENGINEERING_DECISIONS](docs/ENGINEERING_DECISIONS.md)：工程治理及 T-01～T-06 技术决策、增强方向、冲突与待细化项；唯一技术决策源。
- [PRODUCT_ENGINEERING](docs/PRODUCT_ENGINEERING.md)：三个全局基线的职责、维护与最终交付映射；按任务读取相关基线及其确认范围。
- [AI_NOTES](AI_NOTES.md)：精选真实协作关键时刻。
- [TOOLING](docs/TOOLING.md)：必要工具入口与简短 Skill 验证记录。
- [OpenSpec](openspec/config.yaml)：正式规格、设计、任务与变更生命周期配置。

保留真实完整的提交历史；当前仍待后续完成产品、GitHub Actions 和真实购物 Agent 记录。原件含保密要求，发布或分享须确认授权。
