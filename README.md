# Agent-Ready Store

面向人类与 AI Agent 的商店作业。目标与交付约束见只读的 [作业原件](references/home-quiz.md) 和 [商品原件](references/products.json)；PM 需求仍是草稿。

已有工程工具与工作流集成草案，尚无商城代码、业务 Change 或正式业务 Spec；产品决策 D-01～D-22 已记录。Product Design Baseline v0.2 已获 Human 正式批准：涵盖五页结构、关键交互与三个代表性视觉稿的方向，完整验收及计划增强仍保留。Human + ChatGPT 已确认的主要技术选择归档于 [T-01～T-06](docs/engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29)，本轮基线定稿已确认其范围。[Technical Design v0.2](docs/engineering/TECHNICAL_DESIGN.md) 已完成架构 Review 并收敛为 v0.2 Draft，待 Human 最终批准；七工具及 MVP 确认保证范围已接受，实施细节与运行验证另行细化，尚未授权业务开发。启动、业务测试及 CI 命令待实际实现后补充；产物职责与交付契约已批准，Workflow / Review Skill 治理机制仍待 Human Review。

## 日常协作

从 [AGENTS.md](AGENTS.md) 与 [ai-native-workflow](.agents/skills/ai-native-workflow/SKILL.md) 开始，按任务获取最小上下文。关键设计、行为与交付风险按需接入 [ai-native-review](.agents/skills/ai-native-review/SKILL.md)。OpenSpec 管变更级正式规格和任务，Superpowers 提供测试、调试等执行方法，不维护平行计划。

## 交付讲解

[打开 Workflow 图与设计思想讲解](docs/presentation/ai-native-workflow.html)。下载仓库后，用浏览器打开该 HTML 即可，离线可用；GitHub 文件页显示的是源码，可下载后打开。

这是面向人的独立演示页，介绍目标、三平面、两种循环、Review 与工具分工；不作为 Agent 默认上下文或批准依据。

最终 Project Showcase 尚未生成；其信息架构、真实资产映射与验收规则见 [产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md#project-showcase-生成与维护)。当前讲解页不代表产品已交付。

## 文档与资产导航

| 分层 | 入口与职责 |
| --- | --- |
| 产品结果：`docs/product/` | [Requirements](docs/product/REQUIREMENTS.md) 定义业务行为；[Product Design](docs/product/PRODUCT_DESIGN.md) 定义体验、视觉与验收，[UX 决策与演进](docs/product/PRODUCT_DESIGN.md#ux-decisions)已并入正文 |
| 工程方案：`docs/engineering/` | [工程与技术决策](docs/engineering/ENGINEERING_DECISIONS.md)保存理由和批准范围；[Technical Design](docs/engineering/TECHNICAL_DESIGN.md)是全局 How 草稿；[Tooling](docs/engineering/TOOLING.md)保存工具入口与关键验证事实 |
| 工作流标准：`docs/workflow/` | [产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md)维护产物职责、验收及变更传播；实际任务路由归 Workflow Skill |
| 历史证据：`docs/ai-collaboration/` | [外部协作原件及来源核对](docs/ai-collaboration/README.md)；精选结果见 [AI_NOTES](AI_NOTES.md) |
| 设计资产：`design/` | [统一预览](design/index.html)、[打开方式与来源](design/README.md)，包含五页线框、三个视觉稿和截图 |
| 正式增量：`openspec/` | [OpenSpec 配置](openspec/config.yaml)，唯一变更级 Spec / Design / Tasks 来源；当前无业务 Change / Spec |
| 根目录入口与决策 | [AGENTS](AGENTS.md)定义协作权限；[DECISIONS](DECISIONS.md)保留产品取舍及 PM 回复；[只读原件](references/home-quiz.md)不因归档成为批准依据 |

Draft / Accepted / Approved 等状态维护在文档开头及对应条目，不按状态复制文件或另建目录。展示讲解入口见上方“交付讲解”，不参与日常默认上下文。

## 待 Review 与验收

以下按建议阅读顺序列出；这是导航清单，具体问题与批准记录仍归各自正文。2026-10-29 Baseline Finalization 已批准产品需求与设计的已确认范围；不批准 Technical Design、业务实现或未完成验证；治理契约的独立批准见下表。

| 编号 | 审阅对象 | 当前状态 / 你需要确认什么 |
| --- | --- | --- |
| 1 | [Requirements v0.2](docs/product/REQUIREMENTS.md) | Approved Product Requirements Baseline；本聊天的直接批准已补记于文档开头；[§11](docs/product/REQUIREMENTS.md#11-pending缺口与后置边界)的 P-02 查询/字段、P-04 恢复/保留/结果权限为非阻塞设计细化，P-01/P-03 已解决 |
| 2 | [Product Design 与 UX 决策](docs/product/PRODUCT_DESIGN.md) | Approved（2026-10-29，Human）；15 项 Accepted UX 决策、结构、页面职责、关键交互与视觉方向已批准；Pending Verification、Planned Enhancement、P-02 / P-04 保留，工程状态已同步，非业务实施授权 |
| 3 | [工程与技术决策](docs/engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29) | T-01～T-06 主要选择已 Accepted；具体 Pending Detail 仍待设计。[C-01/02](docs/engineering/ENGINEERING_DECISIONS.md#c-01--c-02--历史冲突解决与增强边界)已同步：C-01 为 Planned Enhancement，产品语义冲突关闭；C-02 Resolved / Accepted 七工具 |
| 4 | [Technical Design v0.2](docs/engineering/TECHNICAL_DESIGN.md) | 整体架构与指定设计方向通过；v0.2 Draft 待 Human 最终批准。Schema 精简及唯一不变量见 §4.1，实质风险与非阻塞 Pending 见 §10；无业务实施授权 |
| 5 | [产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md)及 [ENG-008](docs/engineering/ENGINEERING_DECISIONS.md#eng-008--ai-native-workflow-轻量路由待-review) / [009](docs/engineering/ENGINEERING_DECISIONS.md#eng-009--横向-ai-native-review待-review) / [012](docs/engineering/ENGINEERING_DECISIONS.md#eng-012--产品设计与最终交付集成) | PRODUCT_ENGINEERING v1.0 Approved / ENG-012 限定 Accepted（2026-10-29）；产物职责与交付契约已接受。ENG-008/009 仍 Proposed，Workflow/Review Skill 机制及相关集成仍需独立 Review；本次不自动批准它们 |
| 6 | [实际设计验收 §7](docs/product/PRODUCT_DESIGN.md#7-design-review验收与实际证据)、[设计预览](design/index.html) | 待补验收；真机、多浏览器、屏幕阅读器、完整键盘/焦点和缩放，以及未定位浏览器日志；需实际证据或明确接受限制，文档 Review 不能代替运行验收。视觉回归平台仍是可选项 |

可按编号或具体章节反馈“通过 / 修改 / 保留未决”，注明范围。收到明确结论后，再在对应文档记录确认人、日期、范围及替代关系；部分通过保留其他 Pending。批准文档不自动授权业务实施、Push、Merge 或发布。Tooling、原始附件及协作摘要作为证据按需查阅，不增设逐份批准关卡。

保留真实完整的提交历史；当前仍待后续完成产品、GitHub Actions 和真实购物 Agent 记录。原件含保密要求，发布或分享须确认授权。
