# 产品、设计与交付契约

本文件是工作流的按需参考，规定产物职责、基线维护和最终交付映射，不是另一套 Spec、Plan 或 Tasks。当前为 **Approved — 产物职责与交付契约 v1.0**；本次批准不授予业务实施权限，也不批准引用的项目 Baseline 或 Workflow / Review Skill。任务入口仍是 [Workflow Skill](../../.agents/skills/ai-native-workflow/SKILL.md)，权限及冲突处理见 [AGENTS](../../AGENTS.md)。

- **批准记录：** Human，2026-10-29（Asia/Shanghai）；直接依据为本聊天「PRODUCT_ENGINEERING — Governance Review Finalization」：Human + ChatGPT 已完成 Review，整体接受现有治理契约，并授权本次小幅修订和定稿。对应决策见 [ENG-012](../engineering/ENGINEERING_DECISIONS.md#eng-012--产品设计与最终交付集成)。
- **历史与范围：** 2026-10-28 首次形成治理草案；本次在保留职责分工和取舍的基础上定稿，草案演进见 ENG-012 与 Git Diff。治理契约的批准与项目 Requirements / Product Design / Technical Design 的批准分别记录；ENG-008/009 仍待独立 Review。
- **精益执行修订依据：** Human 于 2026-10-29「AI-Native Workflow — Lean Execution Alignment」授权调整默认执行规范及其应用方式；保留上述批准历史、权限和验收边界，不扩展为业务实施或 Workflow / Review Skill 机制批准。

## 工作活动与双循环

工作分类、双循环及任务路由统一维护于 [Workflow Skill](../../.agents/skills/ai-native-workflow/SKILL.md#task-classification-与循环)。本文只维护产物职责、生效条件、内容/验收标准、变更传播及最终交付映射，不再重复流程说明。

## 产物职责与生效条件

下表中的未来路径只是约定，文件不存在时不作为有效链接或已交付产物。仅在对应任务中创建有实质内容的文档，不批量建立空模板。

| 产物 / 位置 | 回答的问题、生成时机 | 生效与维护 |
| --- | --- | --- |
| AGENTS：`AGENTS.md` | 项目级约束与权限是什么？ | 项目权限与权威冲突处理入口；本文不复制其规则 |
| Workflow / Review Skills | 如何分类、路由和协调任务；如何按风险审查设计、行为与交付？ | Workflow 负责执行协调，Review 负责审查路由与按需可视化，代码审查复用 Superpowers；各自正文是唯一维护源，v1.0 批准不包含其机制，本轮仅按 Human 授权同步职责引用 |
| Product Decision：`DECISIONS.md` | 为什么这样定义产品？出现重要取舍或需求歧义时，记录来源、问题、假设、备选、商业/体验权衡、选择、放弃理由、PM 回应和未决项 | Human 确认后 Accepted；保留 ID、历史及替代关系。不把无争议功能或验收条目都升级为 Decision |
| Requirements：`docs/product/REQUIREMENTS.md` | What？关键产品选择足以形成稳定行为后，按 Product、Cart、Pricing、Handoff、Checkout、Order 等领域整理结果 | 初始 Draft，Human Review 后 Approved；关联重要 Decision，不按历史重抄讨论 |
| Product Design：`docs/product/PRODUCT_DESIGN.md` 与必要设计资产 | Experience？基于相关 Requirements 设计页面、流程、交互及视觉；可用 Draft Requirements 探索，但明确未批准依赖 | 初始 Draft；Design Review 与 Human Review 后成为 Approved Product Design Baseline，约束 Web 交互及视觉验收 |
| Tech Decision：复用 `docs/engineering/ENGINEERING_DECISIONS.md` | Why this architecture/technology？重要技术选择有实际取舍时记录；普通实现细节直接归当前 Change/代码 | 技术专题用 T-*；Proposed / Investigating / Accepted / Superseded，Accepted 需 Human 依据。既有 ENG-* 治理记录保留，不另建 TECH_DECISIONS 副本 |
| Technical Design：`docs/engineering/TECHNICAL_DESIGN.md` | How？系统边界、主要选型、Agent 接入、状态所有权、模块职责与关键链路已有充分决策/证据后整合 | 初始 Draft；Design Review 与 Human Review 后 Approved。只选一个前端框架不足以生成可信总体方案；缺口登记 Pending |
| OpenSpec：`openspec/specs/`、`openspec/changes/` | 当前切片具体改变什么、如何实现与验证？遵循原生 schema 生成本次 Spec、Design、Tasks | 唯一正式的变更级规格与执行任务来源；正文引用相关基线章节，不全文复制全局文档。文件齐全不代表实现授权 |
| Project Showcase：拟用 `presentation/index.html` | 如何让面试官找到真实成果与依据？关键产物存在后逐步制作，最终交付时核对全部入口 | 导航、摘要与证据索引，不是权威设计源，也不是第二商城。当前不创建 HTML；既有 Workflow 讲解页只是其中未来可引用的材料 |

三个 Baseline 只维护全局当前有效结果；OpenSpec 仍管理增量及变更生命周期，不在全局文档另建逐切片 Spec、Plan 或 Tasks。Requirements 不代替 DECISIONS，Technical Design 不代替技术决策理由。

## 精益执行的工作流应用

执行原则唯一正文见 [AGENTS 默认执行原则](../../AGENTS.md#默认执行原则)。以下只规定它们在现有流程中的应用，不新增审批阶段、质量评分、报告模板或流程管理文件。

| 活动 | 应用方式 |
| --- | --- |
| Planning | OpenSpec 按 Slice 或独立可审查的正式行为/重要契约变更管理；已有 Change 内的普通内部任务不另建 Change，局部低风险维护按现有 Direct/Fix 路径处理。Proposal 简述目标、范围、非目标；Spec 只写必需的可观察行为与核心约束，不为组件、Hook、函数或纯配置虚构产品需求；Design 只补相对基线的实施细节与重要取舍；Tasks 按可执行、可验收的逻辑组拆解，不拆到文件/函数。各产物引用职责来源，不重复维护同一正文 |
| Implementation | 在已批准且获实施授权的 Spec/Tasks 范围内按逻辑任务组连续执行，随功能落地必要测试与使用说明；进度只更新现有 Tasks。每组完成针对性验证，取得相应 Git 授权后可分批 Commit，不强制全部开发一个提交或逐 Task 审批 |
| Verification | 低风险展示/配置用 typecheck、构建或 smoke，无需强制独立单测；中风险查询、状态与 API 契约验证核心正常路径及少量明确异常，复用现有设施；高风险按 AGENTS 保留真实行为和不变量证据。完整 build、集成及关键 E2E 在 Slice/阶段验收或跨模块影响确有需要时执行；不重复运行仍有效检查，失败先定位根因再重验 |
| Review | 沿既有 Review Skill 聚焦可行动的正确性、契约、安全及交付风险，复用已有有效证据，只补缺口；一般风格偏好或普通实现细节不反复中断执行。实质决策变化、冲突和阻塞才升级，必要 Review、Human 验收与残余风险接受仍保留 |

先使当前最小闭环实际运行，再根据运行反馈最小修订当前产物；不并行尝试多套完整方案或提前铺设后续 Slice。上述执行方式不替代下文的产物生效条件、变更传播与最终交付要求。

每份 Baseline 的开头记录 **Status、适用范围/版本、依据、批准记录（确认人、日期与可追溯来源）、取代关系、Pending**。无批准记录保持 Draft，AI Review 通过不等于 Human 批准。若已有 Approved 版本，修订未批前仍保留有效旧版及可追溯 Diff，明确拟改部分，不将混合正文整体冒充 Approved。正式替代时记录 Superseded 与后继版本，不覆盖批准历史。

## Requirements 内容标准

Requirements 是结果型文档，覆盖产品背景与目标、Human / External Agent 角色、功能范围与非目标、核心旅程、功能需求、业务规则、产品权限、关键状态与异常、非功能约束、验收场景和未决产品事项。无争议原始要求用来源追溯，重要取舍关联 Decision ID；Observed / Assumption / Accepted 分开。

整合时核对全部当前有效决策，而不只依据外部 Handoff 摘要。当前实际记录为 D-01～D-22；例如 D-04 已确认链接自生成起固定 24 小时且访问不续期，D-12 已确认 HALF_UP、舍入时点与明细口径，D-21/22 已补结账和指标语义。本文首次制定时不生成或批准 Requirements；当前整合结果与状态见 [Requirements](../product/REQUIREMENTS.md)，本文不替其批准。

## Product Design 内容与验收标准

本 Home Quiz 已确认五页 Wireframe 与三份代表性 Visual Mockup，范围和内容标准保持不变；这是本项目的选择，不是所有项目的通用硬性模板。Product Design 与 Technical Design 的深度随项目复杂度、风险和实际复用需要调整。

本项目采用 **Lightweight Wireframe + Visual Guidelines**，不先实现整套临时商城，不强制 Figma 或完整 Design System。文档应包含：

- 信息架构：页面清单、职责、导航和完整购买路径；Human 直接购物、Agent 查询/建车、Handoff、Human 确认、模拟结账和订单结果的用户流程，必要时用 Mermaid。
- 可实际阅读检查的轻量 Wireframe：列表/搜索、详情/评论、购物车、Handoff/Checkout、订单结果；重点是信息层级、操作与页面关系。资产形式按实际工具选择，必须提供可打开的链接或嵌入；只有“以后生成原型”的文字不算交付。
- 关键交互/状态：搜索筛选、商品/评论分页、数量修改、售罄/不可购买、空车、价格/库存变化、交接过期、最终确认、成功/失败、重复提交反馈。可以是页面状态、提示或局部组件，不为每种异常另建页面。
- 精简视觉规范与 Design Tokens：字体/排版、颜色/状态色、间距、圆角、容器/栅格、按钮、商品卡、价格明细、输入/表单、弹窗/提示/反馈，以及桌面与移动端响应式规则；少量关键页面的代表性视觉设计。当前视觉方向及批准范围见 [Product Design v0.2](../product/PRODUCT_DESIGN.md)，完整运行验收仍待完成。
- UI/UX 验收：关键路径与异常完整、最终购买内容和金额明细清楚、确认授权明确、键盘/焦点/标签/状态提示及对比度可用、响应式不隐藏关键内容；列出尚未确认事项。

Review 使用 [ai-native-review](../../.agents/skills/ai-native-review/SKILL.md) 的 Design Review 核对业务符合性、交互与视觉理解风险。Approved 后普通组件细节可自主实现；重要交互或视觉契约改变才返回设计 Review 和相应 Human 确认。未选技术栈不妨碍轻量体验探索，技术限制也可反馈给产品设计。

## 技术决策与 Technical Design 标准

技术决策的字段与 T-01～T-06 决策条目在 [ENGINEERING_DECISIONS](../engineering/ENGINEERING_DECISIONS.md#技术决策记录约定)；本文不重新选型；当前 T-01～T-06 已确认方向继续有效，后续新选择不由本契约预定。讨论依业务约束比较有意义的候选，必要时最小 Spike → Design Review → Human 确认 → Accepted。来自 Human + ChatGPT 的 Decision Handoff 核对来源、确认范围及证据后再记录，不冒称 Codex 独立探索或已执行实验；既有根目录 Handoff 模板不是批准凭证。

Technical Design 整合足够的 Accepted Tech Decisions 和适用产品/体验约束，说明如何满足 Requirements 与 Product Design，覆盖：

1. Goals & Constraints、Technology Stack、Architecture Overview、Module Boundaries。
2. Data & State Models、Public API & Agent Contracts、Critical Business Flows。
3. Pricing & Inventory Consistency、Security & Trust Boundaries、Error Handling & Recovery。
4. Testing Strategy、Build & Deployment、Known Limitations、Trade-offs & Future Evolution。

关键状态与调用链按需画 Mermaid。报价与最终确认、Cart/Handoff 生命周期、幂等与失败处理若没有真正选型分歧，可以直接写入 Design，不强造 Decision。设计允许未决局部实现细节，但关键决策不足时只能记录已知内容和缺口，不能自动补齐成完整方案。

小型、局部变更可由当前 OpenSpec Change 的局部设计承接，不强制修改全局 Technical Design。关键授权、交易一致性、共享契约及跨 Agent 边界的变化仍须有足够设计和验证证据，不以“轻量”为由省略关键安全和业务正确性验证。

## 执行上下文与变更传播

创建 Change 时仅读取相关 Approved Requirements、Product Design、Technical Design 的章节、Accepted Decisions、现有正式 Spec 和实际源码/接口。记录适用版本/章节和未决依赖；Draft 可作探索输入，不能当作实施依据。缺少相关批准基线且影响关键契约时，先补足或请 Human 明确范围；不要求无关领域的全部基线先齐备。

实施及 Review 以有效基线和当前 Change 为约束；批准基线也不自动授予实施权限。Review 由同一个 Review Skill 按风险路由，相关基线与交付要求作为同一次审查输入；代码审查复用 Superpowers，修复/重验后再按人的理解成本选择可视化，不新建并行 Review 流程。

变更传播表是影响分析清单，不是强制逐层文档审批流水线。仅更新实际受影响的文档，不为流程形式制造无意义 Diff；重大产品行为、架构、权限及安全契约变化才需同步受影响的全局 Decision / Baseline。Human 保留关键决策与最终风险接受权，不扩展为逐字段或逐任务审批。

| 变化 | 按实际影响检查与维护 |
| --- | --- |
| 重大产品行为 | 有重要取舍时记录 Product Decision；同步受影响的 Requirements、Product Design / Technical Design 及相关 OpenSpec |
| 重要架构、权限或安全契约 | 按职责记录产品或 Tech Decision，更新受影响的 Baseline、OpenSpec 与验证证据 |
| 重要交互或视觉契约 | 对受影响设计作 Review 与 Human 确认，维护 Product Design、相关 OpenSpec 和 UI 验收；不逐层重批无关文档 |
| 已批准契约内的功能开发 | OpenSpec 管理正式变更与验收；不强制重新批准全局 Baseline |
| 普通实现、局部重构或样式调整 | 按风险处理当前任务及必要验证；不强制修改或重新批准全局 Baseline，普通视觉细节不强制 Change |
| 交付状态变化 | 按重要里程碑、交付 Review 或实际交付状态变化维护映射及 Showcase，不复制权威正文 |

原件、Accepted Decision、Approved Baseline、Change、源码发生不一致时，列出来源、确认状态、影响与选项；按 AGENTS 交 Human 裁决受影响部分。PM 草稿不覆盖已批准决定，代码与绿测也不反推要求；已授权 Change 的差异应有相关基线/决策的批准或明确替代依据，不能仅靠 Change 文件存在改变核心语义。

## Project Showcase 生成与维护

独立轻量静态 HTML/CSS，支持章节直达；商城未启动时仍能阅读项目说明和已有证据。本轮只规定信息架构与资产映射：

| 区域 | 摘要与实际入口 |
| --- | --- |
| Project Overview | 题目背景、目标、产品能力、工程亮点、实际完成范围与限制 |
| Product Experience | Web Store、关键页面、完整购物流程、重要交互/异常说明；本地服务需启动说明 |
| Agent Demo | 真实 Agent 对话/录影、实际工具调用、建车 → Handoff → Human 确认的可追溯链路 |
| Product Decisions & UX | DECISIONS、Requirements、Product Design、Wireframes/关键视觉设计；只摘录重要理由 |
| Architecture & Technical Design | ENGINEERING_DECISIONS 的技术条目、Technical Design、架构/状态图与接口契约，说明业务规则如何共享 |
| AI-Native Engineering | Workflow、两个自定义 Skills、OpenSpec、AI_NOTES 和真实 Skill 使用/版本记录；可链接既有 Workflow 讲解页 |
| Quality & Evidence | GitHub Actions 对应 run/revision、测试与 Review 范围、Git 历史、README、已知限制 |

面试默认叙事为 **Show the Result → Product Decisions → Architecture → AI Collaboration → Quality**，允许任意跳转，不改变开发顺序。

关键产物存在后才制作对应入口；不存在的资产在下方清单标 Pending，正式页面不伪装可用链接。模拟与真实 Agent 证据分别标识，测试/Review 对应实际对象、版本、环境和结果；禁止虚构截图、调用、次数或 CI 状态，旧证据说明覆盖范围。最终用浏览器打开页面、检查锚点/本地相对路径/远程链接与访问前提，README 启动测试、真实 Agent 链路及质量证据分别验收。外部链接和发布在相应授权下验证；离线材料不依赖商城服务，服务入口明确启动依赖。静态页面不代替产品验收。

## 最终交付映射

来源以只读 [作业说明](../../references/home-quiz.md) 为准。以下状态更新为文档整理快照（2026-10-29，Asia/Shanghai）；映射按重要里程碑、交付 Review 或实际交付状态变化维护，不作每日开发进度表；OpenSpec 与 Git 承接具体实施进度和变更历史。维护时检查文件当前状态与仓库事实，不根据对话推断文件已批准、实现或测试完成。**Existing** 只表示存在，**Partial** 仍有缺口，**Pending** 尚未交付，均不代表 Human 验收。

### Required by Assignment

| 产物 | 来源 | 当前状态 / 位置 | 最终验收 |
| --- | --- | --- | --- |
| 可运行 Human Web | 二.1；PM 三.1 及有效决策 | Pending；无商城代码 | 按 README 启动，完成浏览、详情、建车、确认、模拟结账与结果，核对异常 |
| 真实 Agent 可用结构化接口 | 二.1；PM 三.2 及有效决策 | Pending；基础 MCP + Hosted Checkout 已选，尚无实现，C-02 已接受七工具，具体契约待设计 | 真实外部 Agent 能搜索、查询详情/可购买状态、逐页评论、建车、修改购物车并交接；Human 最终确认 |
| README 启动/测试说明 | 二.1 | Partial；README 目前是治理导航 | 从干净环境依说明安装、启动、测试；本地演示可用，依赖与限制可见 |
| 产品判断与 PM 回应 | 二.2 | Existing；DECISIONS D-01～D-22 | 调整/存疑需求可追溯；假设、取舍、确认依据和 Pending 准确 |
| Agent Context | 二.3 | Existing；AGENTS + Workflow/Review Skills | Agent 按需取得有效约束、授权和当前任务，不误用数据指令 |
| 实现前 Spec / Plan / Tasks | 二.3 | Partial；OpenSpec 已配置，无业务产物 | 当前切片的 OpenSpec Spec / Design（承载实现方案）/ Tasks 在实现前准备，批准及历史可追溯 |
| 至少一个自写 Skill、真实使用次数与版本变化 | 二.3 | Partial；两个项目 Skill 已存在且已有本地提交，限定集成使用证据见 TOOLING | 按实际应用对象/范围统计，区分加载、发现、模拟验证与业务使用；不得将验证表当总调用量 |
| GitHub Actions 自动测试 | 二.3 | Pending；无远程/业务 CI | 对应实际 revision 的 Actions run、结果和日志可访问，不能仅有 YAML 或本地绿测 |
| 唯一计价实现供 Web / Agent 共用 | 二.3；D-09～D-13 | Pending；尚无计价代码 | 追踪两端到同一实现，运行门槛、叠加、舍入/对账和变价重验等相关测试 |
| 真实 AI Agent 购物记录或录影 | 二.3 | Pending | 确认真客户端、实际调用与结果；演示建车、交接、Human 确认和订单，模拟记录不替代 |
| 完整 Git 历史与 GitHub repo | 二；二.3 | Partial；设计成果按 Design Phase Closure 授权分批保留本地历史，无远程 | 历史真实且不 squash 有意义提交；获得分享/Push 授权后提供可访问仓库 |
| AI_NOTES 3–5 个关键时刻 | 二.3 | Existing；当前 5 个精选关键时刻 | 精选 3–5 个真实协作事件及判断/改进，不为凑数造记录 |
| 面试现场增量能力 | 三；一的时间建议 | Pending；尚无可运行开发环境 | 备好环境与屏幕分享，能用现有流程新增并验证小功能；约两工作日是建议投入，不伪称实耗 |

### Added for Engineering Quality

| 产物 | 当前状态 / 依据 | 验收方式 |
| --- | --- | --- |
| Requirements | Approved Product Requirements Baseline；[v0.2](../product/REQUIREMENTS.md)，本轮 Human Baseline Finalization 确认已确认范围 | 按领域整合，来源/验收/Pending 明确，Human Review 后 Approved |
| Product Design、Wireframes、Visual Guidelines | Approved Baseline / Direction；[设计结构与方向已批准、验证未完成](../product/PRODUCT_DESIGN.md)，完整验收未完成 | 可打开设计资产、覆盖关键状态和响应式，Design/Human Review |
| Tech Decisions | Partial；[T-01～T-06](../engineering/ENGINEERING_DECISIONS.md#决策索引)主要方向 Accepted，C-02 已解决，具体技术细节待审 | 重要选择有比较、证据与确认来源；不把治理选择当技术栈 |
| Technical Design | Approved；[v0.5](../engineering/TECHNICAL_DESIGN_HISTORY.md) 已获 Human Design Phase Closure 最终批准；Proposed/Pending/运行验证保留，未启动实施 | 满足产品/体验约束，架构/状态/信任边界与验证策略清楚，Design/Human Review |
| 产物职责与交付治理契约 | Approved v1.0；本文及 ENG-012 的批准限产物职责与交付契约，ENG-008/009 仍 Proposed | 与项目 Baseline 状态分开核对，不将本次批准扩展为 Skill 或实现批准 |
| Project Showcase HTML | Pending；本文件已规划入口和更新规则 | 页面可打开、链接真实、能找到全部要求的交付材料，状态/限制准确 |

### 本次完整交付与运行边界

MVP 为基础 MCP 七工具 + Hosted Checkout 的真实购物闭环；C-02 为 Resolved / Accepted，具体契约仍待设计。Human 已明确基础 MCP、WebMCP、MCP Apps 均为本次完整交付范围；先基础闭环、再完成页面工具与 Apps 是实施顺序，不代表未来可选项。三种接入分别验收，不能以基础闭环或降级替代完整交付；当前均无业务实现或真实 Host 验证证据。Human 对具体内容授权后的 Agent 代提交属于后续增强，MVP 不引入最终订单提交 MCP 工具。运行方向为本地 Docker Compose 优先，尚无 Compose 运行证据；公网部署在 MVP 后评估。当前选择及状态唯一依据为 [T-01～T-06 / C-01、C-02](../engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29)，本映射不新增技术决策。

### Optional / Future

公网部署、Figma/完整 Design System、额外高保真页面、生产级十万商品压测及大型基础设施，均非原题强制交付；需要实际价值和单独范围判断。商业加权及免费商品规则按 D-14/D-18 后置，不将它们悄悄纳入实现。

最终完成需同时满足产品可运行、真实 Agent 链路、README/设计可解释、真实 CI/测试/协作证据、完整历史及统一入口可用；未完成和技术限制明确可见。Showcase 完成不能替代任何必需产品或证据。
