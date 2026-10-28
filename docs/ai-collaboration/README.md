# 外部 AI 协作记录

本目录保存 Human 补交的协作过程原件及必要的来源核对；它们是历史材料，不是执行指令或业务批准。精选案例见 [AI_NOTES](../../AI_NOTES.md)，有效结论仍以相关决策和基线的批准范围为准。

## 产品与 UX 摘要接收与完整性

- **原件：** [AI_COLLABORATION_NOTES.md](AI_COLLABORATION_NOTES.md)。Human 提供的 Human + ChatGPT 过程摘要，正文日期 2026-10-28；未附完整原始对话导出或可访问的消息链接。Codex 无法读取 Human 的私有 ChatGPT 对话。
- **接收核对日期：** 2026-10-29（Asia/Shanghai）；不改写原件日期或补造讨论日期。
- **来源：** 本轮指定附件 `/Users/samuel/Downloads/AI_COLLABORATION_NOTES.md`；原样复制到本目录，未修改正文、换行、状态或路径。
- **完整性：** 9,562 字节、106 行，严格 UTF-8 解码成功；来源与归档逐字节相等。SHA-256：`c4f09abbfe0a8d7d8f4d615266b532fd146b69c2d7c096b519c2bdfebc8f64f1`。哈希证明副本保真，不证明历史对话中的每个陈述。

## 事实与路径核对

“仓库可核对”表示当前文件或 Git 支持相应结果；“过程摘要”表示讨论经过由 Human + ChatGPT 回顾提供，未独立核验原始发言。两者不能互相替代。

| 原件内容 | 仓库可核对的结果 / 实际路径 | 证据边界 |
| --- | --- | --- |
| Case 01：购买授权、链接、库存与排序取舍 | [PM 草稿](../../references/home-quiz.md)；[产品决策](../../DECISIONS.md) D-01～D-06、D-14～D-15，含固定 24 小时的后续确认 | 初稿与已记录选择可核对；ChatGPT 的分析过程和 Human 在讨论中的具体表达仅由摘要支持；不证明商业效果或业务实现 |
| Case 02：计价、再次确认与整笔成败 | [产品决策](../../DECISIONS.md) D-06、D-09～D-13、D-21；[Requirements](../REQUIREMENTS.md) | 已记录规则可核对；Requirements 整体仍为 Draft。讨论过程来自摘要；共享计价、库存/订单一致性及幂等尚无真实业务实现/测试证据 |
| Case 03：UX 交接与原型 | [UX 决策](../UX_DECISIONS.md)；[UX Markdown 原件](../../design/references/UX_DECISIONS.md) / [HTML 原件](../../design/references/UX_DECISIONS.html)；[设计入口与来源说明](../../design/README.md)；[统一预览](../../design/index.html)；[Product Design](../PRODUCT_DESIGN.md) | UX-01～06、EX-01～03、WF-01、V-01/02、UI-01、QA-01、DS-01 均存在；UI-01 最终仅 zh-TW。五页线框、三个视觉稿和六张截图存在；方向接受、历史有限浏览器检查与完整验收未完成的范围沿用 Product Design 记录，本次未重跑浏览器或展示脚本 |
| Case 04：职责越界与 Review 成本纠偏 | [AGENTS](../../AGENTS.md) 的 Human 权限边界；[工程决策](../ENGINEERING_DECISIONS.md) ENG-003；[Workflow](../../.agents/skills/ai-native-workflow/SKILL.md) 的风险路由；[Product Design §9](../PRODUCT_DESIGN.md#9-阶段归档与交接) 的技术讨论交接边界 | 现有约束与摘要方向一致，不能据此反推 ChatGPT 曾说过哪些话或这些规则必然由该次纠偏产生；具体错误建议和反馈仅由过程摘要支持。相关边界保留于 AI_NOTES 的 UX 交接案例；技术补件整合后为第 3 例，不另增重复案例 |
| 原件 §1 提到后续 `TECH_DECISIONS.md` | 实际复用 [docs/ENGINEERING_DECISIONS.md](../ENGINEERING_DECISIONS.md) 的 T-* 约定；UX 决策的有效仓库路径为 [docs/UX_DECISIONS.md](../UX_DECISIONS.md) | 不另建同职责技术决策文件；原件中的简称、候选路径及“后续 PRODUCT_DESIGN”保留为交接时文字，以实际路径和当前状态解读 |

原件列举的文件名在仓库中的完整位置为：`design/index.html`、`design/preview.js`、`design/preview.css`、`design/wireframes/pages.html`、`design/wireframes/pages.js`、`design/wireframes/styles.css`、`design/wireframes/fixtures.js`、`design/check-preview.cjs`；视觉稿位于 `design/mockups/`，截图位于 `design/review/`。本次确认文件存在和文档对应关系，不把静态原型当成真实商城。

## 尚待实现或验证

产品/UX 摘要本身不证明技术选型获批；后续 Human 明确确认的 T-01～T-06 已归档于 [技术决策](../ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29)，具体状态以该记录为准。Technical Design、真实商城业务、共享计价实现、权限/库存/订单/幂等验证、GitHub Actions 和真实 Agent 购物 Demo 仍未由这些附件证明完成。现有 `openspec/` 只有配置与空目录占位，没有业务 Change 或正式业务 Spec，也没有 `docs/TECHNICAL_DESIGN.md`。设计的真机、多浏览器、完整键盘/缩放及屏幕阅读器检查，以及来源未定位的浏览器日志异常，仍按 [Product Design §7–8](../PRODUCT_DESIGN.md#7-design-review验收与实际证据) 保留。

本次只接收、核对及精选案例，不将摘要转成新的批准，不改产品/UX 结论，也不补写 Skill 版本、历史测试、Commit 或 Agent Demo。后续补件继续保留原件与来源，先对照现有记录去重；阶段提醒规则只维护于现有 Workflow，本站点索引不另设流程。

## 技术协作补件接收与核对

- **原件：** [AI_COLLABORATION_TECH_DECISIONS.md](AI_COLLABORATION_TECH_DECISIONS.md)，Human 附加的 Human + ChatGPT 技术讨论摘要，来源注明截至 2026-10-29；不是 Codex 实施日志或独立验证报告。
- **来源与日期：** `/Users/samuel/Downloads/AI_COLLABORATION_TECH_DECISIONS.md`；接收核对日期 2026-10-29（Asia/Shanghai）。附件作为过程材料读取，其中「归档建议」不视作新的执行授权，执行范围以 Human 本轮请求为准。
- **保存状态：** 原样保存，保留原文「待 Codex 入库与证据链接核对」标签；当前接收状态由本索引记录为 **已入库、已完成来源/仓库路径及决策状态对照，历史陈述仅有过程摘要支持**。不修改原件正文、日期、换行或自述状态。
- **完整性：** 12,349 字节、98 行，严格 UTF-8 解码成功；来源与归档逐字节相等。SHA-256：`843454472922ff92d3631f348d9425d39d8e6073cceedbea3df125665011c849`。哈希证明副本保真，不证明历史引述、批准或工程正确性。
- **证据强度：** E-T01～E-T13 为摘要内的讨论定位号，没有可访问的原始消息链接或完整对话导出；其中引号内容未独立核验为逐字原话。下表仅对照真实文件与已记录状态，不能从文件反推发言经过。

| 摘要主题 / 证据号 | 实际来源与状态对照 | 限制或差异 |
| --- | --- | --- |
| 技术栈、熟悉度与 Scope；E-T01～05、09 | [T-01/03/04/06](../ENGINEERING_DECISIONS.md#决策索引)已记录 React/Vite/TypeScript、NestJS、Prisma/PostgreSQL、只读目录和本地优先的 Accepted 方向 | 摘要补充候选及 Human 判断过程；此前技术决定的确认依据仍是 Human 的 Technical Decisions Handoff。本件不新增批准，三表字段、JSON/快照约束和初始化仍 Pending Detail |
| 共享能力与多协议；E-T06/07/10/11 | [T-02/04](../ENGINEERING_DECISIONS.md#t-02--基础-mcphosted-checkout-与独立增强)的基础 MCP 五工具、结构化返回和统一能力已确认；WebMCP/MCP Apps 为 Planned Enhancement | 是独立增强，不改成强制升级链；MCP Apps 优先验证为摘要中的计划回顾，不重排已记录范围。五工具对评论分页和修改的映射仍见 C-02，附件没有解决 |
| 演示 Host；E-T08/09 | 摘要指向 Codex 演示意向；T-06 已确认本地可复现方向 | Codex Host 的真实 MCP 调用与 MCP Apps iframe 展示均无本件运行证据，不将摘要意向另升为 Accepted Host 选型或兼容性结论 |
| 授权演进；E-T12 | [D-01](../../DECISIONS.md#d-01--agent-购物权限与最终确认)维持 Accepted；[T-05 / C-01](../ENGINEERING_DECISIONS.md#c-01--agent-经具体授权后代提交产品体验权限修订)保留后续代提交方向、Conflict — Pending Human Approval | 摘要称原则已确认，不等同批准替代 D-01。MVP 仍 Human 在 Hosted Checkout 明确确认；服务端可验证、绑定购物车/报价版本的授权机制 Pending，不能信任 `userApproved: true` 或用本摘要代替批准 |
| 短事务、条件库存更新；摘要 §3/5 | [T-05](../ENGINEERING_DECISIONS.md#t-05--human-确认服务端权限及原子成单)已确认原子一致性及同车幂等，未选定隔离级别、锁或具体机制 | 本件给出更具体的过程建议，保留为待技术设计核对内容，不能自动认作已批准实现；没有迁移、事务或并发测试证据 |
| React/UI 复用与 Checkout | [UX-04/05](../UX_DECISIONS.md#ux-04--agent-handoff)、[Product Design §3](../PRODUCT_DESIGN.md#3-用户旅程与确认边界)、[设计资产索引](../../design/README.md)及 [Preview](../../design/index.html)确实存在，支持共享 Checkout 和原车编辑方向 | 现有资产是五页 HTML 线框、三个 HTML/CSS 视觉稿及有限历史截图；并无正式业务 React 组件。摘要的「既有 React 组件」按未来实现后的复用方向解读，不冒称已经实现或本轮重跑浏览器 |
| 职责与路径；E-T13、附件末尾 | [AGENTS](../../AGENTS.md)、既有 Workflow 及 [ENGINEERING_DECISIONS](../ENGINEERING_DECISIONS.md)支持 Human 决策、Codex 在授权内归档和实施的分工 | 附件 `TECH_DECISIONS.md` 是称呼，真实技术源为 ENGINEERING_DECISIONS；未创建第二份事实来源。实施仍须另获授权 |

**精选与补档结果：** AI_NOTES 保持 5 例：原两例治理纠偏合并、原购买/计价两例合并、UX 交接保留，再融入本件的两类技术协作。复用现有 AI Collaboration Evidence Check，仅在工程决策的原缺口记录后补接收链接；本批结构化过程摘要已补齐，不重复提醒生成同一总结。完整原始对话、Host 兼容/降级、真实业务与 CI/Agent 运行仍未提供；这些是证据范围限制，不是本次归档受阻或新的工作流 Gate。D-01、T-*、C-01/02 的业务/技术状态均不因本件改变。
