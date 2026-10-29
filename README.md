# Agent-Ready Store

面向人类与 AI Agent 的商店作业。目标与交付约束见只读的 [作业原件](references/home-quiz.md) 和 [商品原件](references/products.json)；PM 需求仍是草稿。

本轮产品与技术设计阶段已由 Human 批准结束（2026-10-29，Asia/Shanghai）：Requirements v0.2、Product Design v0.2 与 [Technical Design v0.5](docs/engineering/TECHNICAL_DESIGN.md) 均为 Approved Baseline；产品/技术决策及演进保留。已批准五页结构、三份视觉方向和前端主导的 Next.js/NestJS/Agent 架构；Proposed Implementation Details、L-01/P-04、WebMCP 来源及运行验收缺口继续保留。基础 MCP、WebMCP、MCP Apps 均属本次完整交付目标，尚无商城代码或实际 Host 验证。

阶段关闭记录见 [Technical Design §10.4](docs/engineering/TECHNICAL_DESIGN.md#104-设计阶段关闭与交接--2026-10-29)。下一阶段为 **Implementation Phase — S1 Product Discovery**，等待 Human 发起；当前没有业务 Change、正式业务 Spec 或 Tasks。启动/业务测试/CI 命令待实现后补充；Workflow/Review Skill 治理机制仍保留原审阅状态。

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
| 工程方案：`docs/engineering/` | [工程与技术决策](docs/engineering/ENGINEERING_DECISIONS.md)保存理由和批准范围；[Technical Design](docs/engineering/TECHNICAL_DESIGN.md)是已批准的全局 How 基线；[Tooling](docs/engineering/TOOLING.md)保存工具入口与关键验证事实 |
| 工作流标准：`docs/workflow/` | [工作流使用指南](docs/workflow/WORKFLOW_GUIDE.md)介绍从需求到归档的实际操作；[Git Checkpoint Policy](docs/workflow/GIT_CHECKPOINT_POLICY.md)定义阶段提交与转换 Gate；[产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md)维护产物职责、验收及变更传播；唯一任务入口是 [Workflow Skill](.agents/skills/ai-native-workflow/SKILL.md) |
| 历史证据：`docs/ai-collaboration/` | [外部协作原件及来源核对](docs/ai-collaboration/README.md)；精选结果见 [AI_NOTES](AI_NOTES.md) |
| 设计资产：`design/` | [统一预览](design/index.html)、[打开方式与来源](design/README.md)，包含五页线框、三个视觉稿和截图 |
| 正式增量：`openspec/` | [OpenSpec 配置](openspec/config.yaml)，唯一变更级 Spec / Design / Tasks 来源；当前无业务 Change / Spec |
| 根目录入口与决策 | [AGENTS](AGENTS.md)定义协作权限；[DECISIONS](DECISIONS.md)保留产品取舍及 PM 回复；[只读原件](references/home-quiz.md)不因归档成为批准依据 |

Draft / Accepted / Approved 等状态维护在文档开头及对应条目，不按状态复制文件或另建目录。展示讲解入口见上方“交付讲解”，不参与日常默认上下文。

## 待 Review 与验收

设计基线已归档，以下是批准范围与剩余验收的导航；当前状态见各文档最终批准记录。2026-10-29 Design Phase Closure 已批准 Technical Design v0.5，保留 Proposed/Pending 和未运行事项；不批准业务实施或把静态设计当运行验证。

| 编号 | 审阅对象 | 当前状态 / 你需要确认什么 |
| --- | --- | --- |
| 1 | [Requirements v0.2](docs/product/REQUIREMENTS.md) | Approved Product Requirements Baseline；本聊天的直接批准已补记于文档开头；[§11](docs/product/REQUIREMENTS.md#11-pending缺口与后置边界)的 P-02 查询/字段、P-04 恢复/保留/结果权限为非阻塞设计细化，P-01/P-03 已解决 |
| 2 | [Product Design 与 UX 决策](docs/product/PRODUCT_DESIGN.md) | Approved（2026-10-29，Human）；15 项 Accepted UX 决策、结构、页面职责、关键交互与视觉方向已批准；Pending Verification、Planned Enhancement、P-02 / P-04 保留，工程状态已同步，非业务实施授权 |
| 3 | [工程与技术决策](docs/engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29) | T-01～T-06 主要选择已 Accepted；具体 Pending Detail 仍待设计。[C-01/02](docs/engineering/ENGINEERING_DECISIONS.md#c-01--c-02--历史冲突解决与增强边界)已同步：C-01 为 Planned Enhancement，产品语义冲突关闭；C-02 Resolved / Accepted 七工具 |
| 4 | [Technical Design v0.5](docs/engineering/TECHNICAL_DESIGN.md) | Approved；架构/组件/四入口复用设计归档，§10.4 记录阶段关闭。Proposed Implementation Details、L-01/P-04 与运行/Host 验证保留；不启动 S1 |
| 5 | [产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md)及 [ENG-008](docs/engineering/ENGINEERING_DECISIONS.md#eng-008--ai-native-workflow-轻量路由待-review) / [009](docs/engineering/ENGINEERING_DECISIONS.md#eng-009--横向-ai-native-review待-review) / [012](docs/engineering/ENGINEERING_DECISIONS.md#eng-012--产品设计与最终交付集成) | PRODUCT_ENGINEERING v1.0 Approved / ENG-012 限定 Accepted（2026-10-29）；产物职责与交付契约已接受。ENG-008/009 仍 Proposed，Workflow/Review Skill 机制及相关集成仍需独立 Review；本次不自动批准它们 |
| 6 | [实际设计验收 §7](docs/product/PRODUCT_DESIGN.md#7-design-review验收与实际证据)、[设计预览](design/index.html) | 待补验收；真机、多浏览器、屏幕阅读器、完整键盘/焦点和缩放，以及未定位浏览器日志；需实际证据或明确接受限制，文档 Review 不能代替运行验收。视觉回归平台仍是可选项 |

后续只处理实际 Pending、运行验收和新的 Human 授权任务，不因阶段结束重开已批准架构。批准文档不自动授权业务实施、Push、Merge 或发布。Tooling、原始附件及协作摘要作为证据按需查阅，不增设逐份批准关卡。

保留真实完整的提交历史；当前仍待后续完成产品、GitHub Actions 和真实购物 Agent 记录。原件含保密要求，发布或分享须确认授权。
