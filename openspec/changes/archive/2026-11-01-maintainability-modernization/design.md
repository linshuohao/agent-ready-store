# Design

## Context

规划基线为本地 main 45797ad；2026-11-01 已从 3275e19 快进合入独立提案分支。新增分类发现、MCP结果引导及文档站均纳入本轮保护范围。动机与九项范围见 proposal.md。正式规格为行为依据；全局 Requirements/Product Design/Technical Design 未整体 Approved，不扩大历史批准。延续工程决策 T-08～T-11、T-11完整应用复用和MCP新协议增量；Demo认证模式来自当前Human明确确认。

## Goals / Non-Goals

目标是全仓检查并完成有实际收益的升级与职责整理，公开业务语义保持不变。核心业务、集成、E2E场景及断言完整复用；内部方法单测按职责重写。默认Demo免认证适用于本地及线上演示。无数据迁移、真实支付、视觉重做或动态插件平台。

## Decisions

### 1. Demo入口模式

新增 MCP_AUTH_MODE=token|demo，默认demo，显式token启用认证；非法值启动失败。token模式沿用24字符要求；demo不要求Token。保留Host/Origin、资源路径和输入校验，全部现有能力开放，Apps-only支付可见性不变。demo用于本地及线上演示，包含Vercel入口；不要求Host/Origin为回环地址，但仍检查配置格式及请求Host/Origin。Compose的默认回环端口绑定保持。未配置模式时即使存在Token也保持demo。仅变量未定义使用默认值，空字符串、拼写错误与未知值拒绝启动。具体错误信息与解析集中在配置模块，不新建配置框架。

### 2. 工具逐个注册

使用McpServer.registerTool及单工具注册闭包。每个工具在一个独立文件中完整声明名称、Schema（或导入已有业务契约）、描述、显式annotations/_meta和handler；工厂只接该工具实际依赖。实例化入口直接逐个 `register(createGetCart(carts))`，新增普通工具只增加该文件、必要import和一条register调用，不改中央schema、handler、UI名单或名称分派，也不另建barrel清单。公共注册仅处理协议结果、维护钩子与既有退役兼容；通用parse helper不承担工具配置。工具handler在本文件捕获已知业务失败并给出恢复提示；公共错误原样抛出。提示载体仅保留原AppError的code/status/details，外层负责统一序列化，不能新增业务分派表，也不在捕获错误后重试或改变交易状态。

有UI的工具直接携带资源descriptor及其metadata，资源列表由已注册工具收集，不通过uiTools/includes(name)判断。两个现有HTML产物的共享构建清单仍服务Apps构建；新增一种HTML产物属于资源功能，需实现对应静态资源并纳入构建，不等同新增普通工具。该边界不引入动态插件加载或通用构建框架。

保留逐请求Server生命周期、choiceCodec校验、2026-07-28 input_required、旧协议、Apps旧URI、退役工具拒绝语义。适配SDK自动校验时保持现有错误封装；无法保持则先解决兼容，不擅改断言。工具自己的业务错误及恢复建议由该工具文件处理；外层只处理公共输入错误、未知异常、维护及协议封装，不集中按业务错误码或工具名称分派。保留environment/recovery与constraintViolations，以及错误码、retryable和请求关联语义；list_product_categories不依赖库存维护，不能被统一beforeToolCall误拦截。Apps构建与服务端资源版本抽取单一来源。

### 3. 全仓现代化与配置复用

逐工作区及独立site/检查依赖、废弃API及构建配置，依据实施时官方迁移说明确定候选版本，在本Change记录当前/目标/理由/兼容证据；不预先限制大版本，也不凭版本新旧盲目更新。site保留独立安装与锁文件，不为统一强行并入商城workspace。根目录ESLint提供可复用基础，Web叠加Next规则；TS公共项沿用tsconfig.base.json，Node和浏览器差异局部保留。统一适用的TS、Node类型及重复依赖声明，不新增配置包。语法迁移和依赖升级分批验证，不顺手改变公开契约。

### 4. 旧代码、职责与阅读性

追踪旧purchase-commands及页面、contracts、Provider的acquirePurchase/toolSave/retryTool调用链后删除不可达内部实现；保留公开退役入口410和有效转导出。cart.service先抽取纯视图映射、配置、校验，保留事务编排、锁顺序和幂等恢复顺序。Provider先清理退役接口，再分离反馈展示及状态协调，状态所有者保持唯一。加购独立指令、客户端排队/互斥、版本前置条件、逐操作恢复与升单清理移交独立购物车Change `cart-command-state-isolation`；本Change不把现有active锁或命令Context当作已满足Human隔离要求的方案。此前混入工作树的交互补丁已保存并拆出，实际路径与验证见tasks.md。改善命名、分段和多变量声明，注释解释不变量和原因，不逐行翻译代码。

### 5. 异常诊断

shared/result.ts未知异常通过现有日志能力记录requestId、操作名和经过筛选的错误信息，返回原错误形状。禁止记录Token、连接串、完整请求或原始商品数据；错误message/stack也必须避免携带秘密。调用链仅记录一次，不新增遥测服务；补关联与脱敏单测。

### 6. 文档源目录和发布路径

复用main新增的documentation-delivery-hub构建与兼容映射，不另建静态发布系统。design/delivery/presentation源文件分别收拢docs对应目录；与现有docs/presentation按职责合并，根README和AGENTS保持入口，openspec与references不移动。输出继续提供旧URL、资源路径及锚点，内部源链接同步更新。保持清单式分发，不复制references或秘密；迁移前核对原工作区delivery成果是否已合入，不能用旧副本覆盖新成果。

## Verification

| 范围 | 复用/补充证据 | 通过标准 |
| --- | --- | --- |
| 认证 | 未配置/显式demo（含Token存在）、显式token下正确/错误/缺失Token、demo全能力、非法配置与公网/Vercel配置测试 | 本地及线上demo免认证，Host/Origin拒绝保持 |
| MCP | mcp、lifecycle-mcp、apps-resource、protocol-upgrade；guidance-protocol、result-guidance | 工具Schema/注解/可见性/结果及新旧协议一致；重写注册内部单测 |
| 分类 | categories、categories-http、category-e2e及request-maintenance测试 | 分类发现独立于库存故障、分页与UI行为不变 |
| 交易 | lifecycle-db/http、库存、request-expiry、constraint-details及计价测试 | 真实隔离PostgreSQL验证幂等、库存、支付取消过期竞争及详细约束错误 |
| 前端 | cart/order-lifecycle、webmcp、mcp-app及购物冒烟 | 草稿保护、切车、迟到响应、原键恢复与Human支付一致 |
| 文档 | 现有文档站构建、链接/锚点及浏览器测试 | 旧入口、深链、返回导航及所有资源可用；受限内容不分发 |
| 工程 | 冻结锁安装、format:check、lint、typecheck、build、本地脚本测试；相关Docker验证 | 各应用运行环境兼容，无新增跳过或弱化规则 |

修改期间定向验证，最终按现有CI跑一次完整适用验证；测试数据库隔离且破坏性套件串行。核心场景与断言不因重构改写，允许路径和启动适配；失败先定位，基线缺陷与回归分别记录。真实Host发现、选型续调和Apps点击另列人工验收，替身与跳过不算通过。实施与验证证据见tasks.md；真实Host人工验收已由Human于2026-11-01在当前对话确认通过，记录见tasks.md。

### Verification execution and comparison

实施前固定基线commit与环境、数据库fixture和现有核心用例清单；保存工具发现的名称、描述、Schema、注解、可见性，以及代表性成功/失败响应。重构后只归一化requestId、时间等非确定字段，不归一化金额、状态、错误码、约束详情、工具描述或恢复引导。除已授权Demo免认证模式外不得有未解释的契约差异。不存在的覆盖先补业务反例测试，不能仅靠新实现的方法单测证明等价。

在现有CI之外显式执行 `pnpm test:categories`、`pnpm docs:build`、`pnpm docs:check`、`pnpm docs:test`；site先使用自身锁文件冻结安装。根Vitest不包含site脚本测试，商城构建也不替代文档构建。CI命令的测试环境变量沿现有配置准备，确认测试确实执行而非条件跳过。日志故障不能遮蔽原业务错误。

真实并发覆盖同键同载荷、同键异载荷、两订单争库存、支付/取消/到期竞争；验证库存不负、预留不重复释放、终态不反转。前端覆盖原请求恢复和迟到响应。认证模式分别使用同一业务契约测试入口，不复制两套预期；补本地生产构建及Compose冒烟，不能只测开发模式。显式token认证保留完整既有负面测试。

测试提供有限场景内的回归证据，不能数学保证全业务不变。缺失真实Host或环境时标记未验证，不据此宣布验收完成；由Human决定剩余缺口是否可接受。范围拆分后以实际提交Diff重新核对受影响路径：没有代码/环境变化的证据可以复用；Provider、测试入口等重新组合的部分须定向重验。不得将“其他按钮忙时不发第二请求”的历史测试作为独立加购验收依据。

## Risks / Trade-offs

- SDK高层自动校验可能改变错误行为 → 契约比较及负面测试先行。
- 多依赖升级扩大回归 → 分批记录版本和证据，业务变化升级Human裁决。
- 服务拆分误改事务/状态 → 保留所有者与原子边界，真实并发验证。
- 源目录改变破坏已分享URL → 复用文档站映射，验证产物而不只检查源码链接。
- Demo入口对访客开放 → 文档明确token适用场景与接入；两种模式均不宣称具备用户级身份隔离。

## Migration Plan

Human审阅并授权实施后，按tasks分组执行。无数据库迁移；依赖与代码成组回退，目录迁移同时回退构建映射，不回滚用户数据。线上演示部署和CI默认使用demo，无需Token；需要限制服务访问时显式配置token及有效Token。CI的认证负面套件单独使用token，其余构建/交付默认demo并验证无凭证MCP接入；Human随后已明确允许本轮合并触发自动部署，不包含无关远端配置变更。安全及交易相关阶段转换按Git Checkpoint Policy检查；最终代码审阅及拆分验证已完成，交付事实以PR和平台结果为准。

## Open Questions

依赖处理结果见tasks.md的Dependency review，不再视为尚未开始的选型。若后续升级必须改变业务或公开契约，暂停依赖部分提交Human裁决。

2026-11-01 Human针对真实Host验收明确回复“已经验收通过了”，Task 5.2关闭，验收是否后置至合并后的问题不再待决。此记录来源于Human确认，不冒充Codex现场执行，也不推断未提供的Host型号、版本或操作日志。购物车范围拆分及拆分后的验证、审查已完成，证据见tasks.md。

Human已确认购物车修复作为单独一轮Spec，在新会话及独立工作区的 `cart-command-state-isolation` 中统一规划、审阅和实施。本轮收尾仅需隔离相关补丁并验证保留的工程整理，不以新一轮购物车修复完成作为本轮验收前提。购物车独立指令及版本取舍只在该独立Change讨论；本轮shopping-cart增量仅同步MCP入口认证例外，不覆盖主规格中的版本化操作要求，也不将其视为Human对后续购物车设计的再次确认。

## Review notes

2026-11-01聚焦规划自查（非独立审查）：九项均有任务承接，修正site范围遗漏、专用测试入口遗漏、等价对照不足及过宽环境检测。保持简单注册函数，不建插件生命周期/动态发现；配置仅抽取确有重复部分，服务/Hook不按行数强拆。文件提取须有明确职责或真实复用收益，否则保留原结构并说明。旧代码清理同时检查路由、包导出、动态引用和兼容测试，不能仅凭文本搜索无调用删除。

| 确认项 | 任务 |
| --- | --- |
| 1 Demo全能力免认证 | 2.4 |
| 2 全仓升级/废弃用法 | 1.2、3.5 |
| 3 与模块无关的逐工具注册 | 2.1–2.3 |
| 4 文档目录与旧URL | 4.1–4.2 |
| 5 可读性 | 3.2、3.3、3.5 |
| 6 历史代码 | 3.1 |
| 7 配置复用 | 1.3 |
| 8 异常诊断 | 3.4 |
| 9 职责整理 | 3.2–3.3 |


### 本轮复核补充

默认demo修订后发现并修正：Proposal仍写显式开启、Spec中“该模式”指代不清、认证矩阵没有Token存在时默认行为、公开部署切换顺序不明确。当时新增非本地配置失败场景；该限制已由下文“线上Demo范围修订”明确替代，当前验收必须允许合法公网/Vercel demo配置。

九项范围继续保持完整，不增加新架构。全仓检查不等于所有文件都必须修改：记录每项发现的处理或保留理由即可；公共注册封装仅在实际公共处理需要时增加。升级与结构调整分成可辨识增量，避免把失败来源混在一起。

业务不变的差异允许清单只有：本地及线上默认demo、显式token及非法模式配置行为；其余公开Schema、错误语义、金额、状态、库存、导航和UI操作契约必须一致。工具描述也须保持main已有意图引导，不以精简为由删除。未知异常日志为内部诊断变化，不得改变调用结果。


### 单工具组织纠正（2026-11-01）

Human指出集中tools.ts仍使工具Schema、UI名称与注册分散维护。本轮按上述单文件完整定义方式重做Task 2.1，期间撤销完成勾选，保留原公开工具fixture及协议回归作为验收；没有更改业务契约或已有工具描述。

### MCP Apps构建边界确认（2026-11-01）

Human确认保留apps/mcp-app独立构建目标。Web与Apps继续复用commerce-ui，Apps保留Host Bridge与单文件HTML资源交付；不迁入Next SSR或新增网页路由来代替MCP资源。

### 线上Demo范围修订（2026-11-01）

Human明确正常线上演示部署也使用demo，替代本Change先前仅限本地及公开部署强制token的限制。部署文档和CI以demo为默认路径；token仅作为需要访问门槛时的可选模式，保留其认证负面测试。此前非本地配置拒绝场景已相应替换，其他业务约束不变；本次不执行远端发布。
