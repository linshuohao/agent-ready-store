# 产品、设计与交付契约

本文件是工作流的按需参考，规定产物职责、基线维护和最终交付映射，不是另一套 Spec、Plan 或 Tasks。当前为 **治理草案，待 Human Review**；本轮授权仅制作集成规则，不批准产品设计、技术方案或业务实施。任务入口仍是 [Workflow Skill](../.agents/skills/ai-native-workflow/SKILL.md)，权限及冲突处理见 [AGENTS](../AGENTS.md)。

## 工作活动与双循环

| 活动 | 目的与连接 |
| --- | --- |
| Product Discovery & Design | Frame → Explore → Challenge → Decide，确认重要产品取舍；将稳定行为整理为 Requirements，再设计体验、轻量原型与视觉规范 |
| Technical Discovery & Design | 根据产品与体验约束比较架构、接口与状态方案；必要时用最小 Spike 补证，关键选择收敛后形成 Technical Design |
| Incremental Delivery | Scope → Specify → Build → Verify；基于适用的已批准约束，以 OpenSpec 管理可验证的纵向切片 |
| Final Delivery & Presentation | 汇总真实产品、设计与质量证据，完善 README 和 Showcase，再按原作业验收 |

这是逻辑分类，不是四个顺序审批阶段。产品设计与技术探索可以往返；总体方案确认前可进行授权范围内的可逆 Spike，结果不等于生产实现或选型批准。普通修复与局部实现按风险直接执行，不重走全部活动。Review、Governance、Context Engineering 横向参与；遇到关键契约缺口才返回相应决策活动。

## 产物职责与生效条件

下表中的未来路径只是约定，文件不存在时不作为有效链接或已交付产物。仅在对应任务中创建有实质内容的文档，不批量建立空模板。

| 产物 / 位置 | 回答的问题、生成时机 | 生效与维护 |
| --- | --- | --- |
| Product Decision：`DECISIONS.md` | 为什么这样定义产品？出现重要取舍或需求歧义时，记录来源、问题、假设、备选、商业/体验权衡、选择、放弃理由、PM 回应和未决项 | Human 确认后 Accepted；保留 ID、历史及替代关系。不把无争议功能或验收条目都升级为 Decision |
| Requirements：`docs/REQUIREMENTS.md` | What？关键产品选择足以形成稳定行为后，按 Product、Cart、Pricing、Handoff、Checkout、Order 等领域整理结果 | 初始 Draft，Human Review 后 Approved；关联重要 Decision，不按历史重抄讨论 |
| Product Design：`docs/PRODUCT_DESIGN.md` 与必要设计资产 | Experience？基于相关 Requirements 设计页面、流程、交互及视觉；可用 Draft Requirements 探索，但明确未批准依赖 | 初始 Draft；Design Review 与 Human Review 后成为 Approved Product Design Baseline，约束 Web 交互及视觉验收 |
| Tech Decision：复用 `docs/ENGINEERING_DECISIONS.md` | Why this architecture/technology？重要技术选择有实际取舍时记录；普通实现细节直接归当前 Change/代码 | 技术专题用 T-*；Proposed / Investigating / Accepted / Superseded，Accepted 需 Human 依据。既有 ENG-* 治理记录保留，不另建 TECH_DECISIONS 副本 |
| Technical Design：`docs/TECHNICAL_DESIGN.md` | How？系统边界、主要选型、Agent 接入、状态所有权、模块职责与关键链路已有充分决策/证据后整合 | 初始 Draft；Design Review 与 Human Review 后 Approved。只选一个前端框架不足以生成可信总体方案；缺口登记 Pending |
| OpenSpec：`openspec/specs/`、`openspec/changes/` | 当前切片具体改变什么、如何实现与验证？遵循原生 schema 生成本次 Spec、Design、Tasks | 唯一正式的变更级规格与执行任务来源；正文引用相关基线章节，不全文复制全局文档。文件齐全不代表实现授权 |
| Project Showcase：拟用 `presentation/index.html` | 如何让面试官找到真实成果与依据？关键产物存在后逐步制作，最终交付时核对全部入口 | 导航、摘要与证据索引，不是权威设计源，也不是第二商城。当前不创建 HTML；既有 Workflow 讲解页只是其中未来可引用的材料 |

三个 Baseline 只维护全局当前有效结果；OpenSpec 仍管理增量及变更生命周期，不在全局文档另建逐切片 Spec、Plan 或 Tasks。Requirements 不代替 DECISIONS，Technical Design 不代替技术决策理由。

每份 Baseline 的开头记录 **Status、适用范围/版本、依据、批准记录（确认人、日期与可追溯来源）、取代关系、Pending**。无批准记录保持 Draft，AI Review 通过不等于 Human 批准。若已有 Approved 版本，修订未批前仍保留有效旧版及可追溯 Diff，明确拟改部分，不将混合正文整体冒充 Approved。正式替代时记录 Superseded 与后继版本，不覆盖批准历史。

## Requirements 内容标准

Requirements 是结果型文档，覆盖产品背景与目标、Human / External Agent 角色、功能范围与非目标、核心旅程、功能需求、业务规则、产品权限、关键状态与异常、非功能约束、验收场景和未决产品事项。无争议原始要求用来源追溯，重要取舍关联 Decision ID；Observed / Assumption / Accepted 分开。

整合时核对全部当前有效决策，而不只依据外部 Handoff 摘要。当前实际记录为 D-01～D-22；例如 D-04 已确认链接自生成起固定 24 小时且访问不续期，D-12 已确认 HALF_UP、舍入时点与明细口径，D-21/22 已补结账和指标语义。本轮不重写这些结论，也不生成或批准 Requirements。

## Product Design 内容与验收标准

采用 **Lightweight Wireframe + Visual Guidelines**，不先实现整套临时商城，不强制 Figma 或完整 Design System。文档应包含：

- 信息架构：页面清单、职责、导航和完整购买路径；Human 直接购物、Agent 查询/建车、Handoff、Human 确认、模拟结账和订单结果的用户流程，必要时用 Mermaid。
- 可实际阅读检查的轻量 Wireframe：列表/搜索、详情/评论、购物车、Handoff/Checkout、订单结果；重点是信息层级、操作与页面关系。资产形式按实际工具选择，必须提供可打开的链接或嵌入；只有“以后生成原型”的文字不算交付。
- 关键交互/状态：搜索筛选、商品/评论分页、数量修改、售罄/不可购买、空车、价格/库存变化、交接过期、最终确认、成功/失败、重复提交反馈。可以是页面状态、提示或局部组件，不为每种异常另建页面。
- 精简视觉规范与 Design Tokens：字体/排版、颜色/状态色、间距、圆角、容器/栅格、按钮、商品卡、价格明细、输入/表单、弹窗/提示/反馈，以及桌面与移动端响应式规则；少量关键页面的代表性视觉设计。现代、简洁、可信赖只是方向，具体颜色/字体尚未批准。
- UI/UX 验收：关键路径与异常完整、最终购买内容和金额明细清楚、确认授权明确、键盘/焦点/标签/状态提示及对比度可用、响应式不隐藏关键内容；列出尚未确认事项。

Review 使用 [ai-native-review](../.agents/skills/ai-native-review/SKILL.md) 的 Design Review 核对业务符合性、交互与视觉理解风险。Approved 后普通组件细节可自主实现；重要交互或视觉契约改变才返回设计 Review 和相应 Human 确认。未选技术栈不妨碍轻量体验探索，技术限制也可反馈给产品设计。

## 技术决策与 Technical Design 标准

技术决策的字段与 T-01～T-06 讨论索引在 [ENGINEERING_DECISIONS](ENGINEERING_DECISIONS.md#技术决策记录约定)；不预选框架、协议、数据库或大型基础设施。讨论依业务约束比较有意义的候选，必要时最小 Spike → Design Review → Human 确认 → Accepted。来自 Human + ChatGPT 的 Decision Handoff 核对来源、确认范围及证据后再记录，不冒称 Codex 独立探索或已执行实验；既有根目录 Handoff 模板不是批准凭证。

Technical Design 整合足够的 Accepted Tech Decisions 和适用产品/体验约束，说明如何满足 Requirements 与 Product Design，覆盖：

1. Goals & Constraints、Technology Stack、Architecture Overview、Module Boundaries。
2. Data & State Models、Public API & Agent Contracts、Critical Business Flows。
3. Pricing & Inventory Consistency、Security & Trust Boundaries、Error Handling & Recovery。
4. Testing Strategy、Build & Deployment、Known Limitations、Trade-offs & Future Evolution。

关键状态与调用链按需画 Mermaid。报价与最终确认、Cart/Handoff 生命周期、幂等与失败处理若没有真正选型分歧，可以直接写入 Design，不强造 Decision。设计允许未决局部实现细节，但关键决策不足时只能记录已知内容和缺口，不能自动补齐成完整方案。

## 执行上下文与变更传播

创建 Change 时仅读取相关 Approved Requirements、Product Design、Technical Design 的章节、Accepted Decisions、现有正式 Spec 和实际源码/接口。记录适用版本/章节和未决依赖；Draft 可作探索输入，不能当作实施依据。缺少相关批准基线且影响关键契约时，先补足或请 Human 明确范围；不要求无关领域的全部基线先齐备。

实施及 Review 以有效基线和当前 Change 为约束；批准基线也不自动授予实施权限。Review 按风险组合 Requirements Conformance、UX/Interaction、Technical Design、Behavioral、Delivery 检查，仍用同一个 Review Skill，不新建并行 Review 流程。

| 变化 | 必须检查的传播 |
| --- | --- |
| 产品行为 | Product Decision（确有取舍时）→ Requirements → Product Design / Technical Design（按影响）→ 相关 OpenSpec |
| 重要技术架构 | Tech Decision → Technical Design → 相关 OpenSpec / Implementation |
| 重要交互或视觉契约 | Product Design Review → Product Design 修订/批准 → 相关 OpenSpec Spec/Design/Tasks（按影响）→ UI 实现与验收；普通视觉细节不强制 Change |
| 契约内普通实现调整 | 当前任务的代码与必要测试；不强制改全局基线 |
| 交付资产变化 | 更新交付映射和 Showcase 对应入口/状态，不复制权威正文 |

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

来源以只读 [作业说明](../references/home-quiz.md) 为准。以下状态为本轮审计快照（2026-10-28，Asia/Shanghai）；后续交付任务更新对应行，不按例行操作新增报告。**Existing** 只表示存在，**Partial** 仍有缺口，**Pending** 尚未交付，均不代表 Human 验收。

### Required by Assignment

| 产物 | 来源 | 当前状态 / 位置 | 最终验收 |
| --- | --- | --- | --- |
| 可运行 Human Web | 二.1；PM 三.1 及有效决策 | Pending；无商城代码 | 按 README 启动，完成浏览、详情、建车、确认、模拟结账与结果，核对异常 |
| 真实 Agent 可用结构化接口 | 二.1；PM 三.2 及有效决策 | Pending；协议未选 | 真实外部 Agent 能搜索、查询详情/可购买状态、逐页评论、建车并交接；Human 最终确认 |
| README 启动/测试说明 | 二.1 | Partial；README 目前是治理导航 | 从干净环境依说明安装、启动、测试；本地演示可用，依赖与限制可见 |
| 产品判断与 PM 回应 | 二.2 | Existing；DECISIONS D-01～D-22 | 调整/存疑需求可追溯；假设、取舍、确认依据和 Pending 准确 |
| Agent Context | 二.3 | Existing；AGENTS + Workflow/Review Skills | Agent 按需取得有效约束、授权和当前任务，不误用数据指令 |
| 实现前 Spec / Plan / Tasks | 二.3 | Partial；OpenSpec 已配置，无业务产物 | 当前切片的 OpenSpec Spec / Design（承载实现方案）/ Tasks 在实现前准备，批准及历史可追溯 |
| 至少一个自写 Skill、真实使用次数与版本变化 | 二.3 | Partial；两个项目 Skill 已存在，尚未提交，限定集成使用证据见 TOOLING | 按实际应用对象/范围统计，区分加载、发现、模拟验证与业务使用；不得将验证表当总调用量 |
| GitHub Actions 自动测试 | 二.3 | Pending；无远程/业务 CI | 对应实际 revision 的 Actions run、结果和日志可访问，不能仅有 YAML 或本地绿测 |
| 唯一计价实现供 Web / Agent 共用 | 二.3；D-09～D-13 | Pending；尚无计价代码 | 追踪两端到同一实现，运行门槛、叠加、舍入/对账和变价重验等相关测试 |
| 真实 AI Agent 购物记录或录影 | 二.3 | Pending | 确认真客户端、实际调用与结果；演示建车、交接、Human 确认和订单，模拟记录不替代 |
| 完整 Git 历史与 GitHub repo | 二；二.3 | Partial；已有本地提交，无远程，本轮未提交 | 历史真实且不 squash 有意义提交；获得分享/Push 授权后提供可访问仓库 |
| AI_NOTES 3–5 个关键时刻 | 二.3 | Partial；当前 2 个真实时刻 | 精选 3–5 个真实协作事件及判断/改进，不为凑数造记录 |
| 面试现场增量能力 | 三；一的时间建议 | Pending；尚无可运行开发环境 | 备好环境与屏幕分享，能用现有流程新增并验证小功能；约两工作日是建议投入，不伪称实耗 |

### Added for Engineering Quality

| 产物 | 当前状态 / 依据 | 验收方式 |
| --- | --- | --- |
| Requirements | Pending；来自稳定产品行为及 Accepted 产品决策 | 按领域整合，来源/验收/Pending 明确，Human Review 后 Approved |
| Product Design、Wireframes、Visual Guidelines | Pending；采用轻量原型方向，具体体验/视觉未批准 | 可打开设计资产、覆盖关键状态和响应式，Design/Human Review |
| Tech Decisions | Partial；复用 ENGINEERING_DECISIONS，业务架构尚未确认 | 重要选择有比较、证据与确认来源；不把治理选择当技术栈 |
| Technical Design | Pending；关键技术决策不足 | 满足产品/体验约束，架构/状态/信任边界与验证策略清楚，Design/Human Review |
| Project Showcase HTML | Pending；本文件已规划入口和更新规则 | 页面可打开、链接真实、能找到全部要求的交付材料，状态/限制准确 |

### Optional / Future

公网部署、Figma/完整 Design System、额外高保真页面、生产级十万商品压测及大型基础设施，均非原题强制交付；需要实际价值和单独范围判断。商业加权及免费商品规则按 D-14/D-18 后置，不将它们悄悄纳入实现。

最终完成需同时满足产品可运行、真实 Agent 链路、README/设计可解释、真实 CI/测试/协作证据、完整历史及统一入口可用；未完成和技术限制明确可见。Showcase 完成不能替代任何必需产品或证据。
