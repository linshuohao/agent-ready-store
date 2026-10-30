# Tasks

状态：Implementation，2026-10-31（Asia/Shanghai）。Human本轮明确要求“继续在实施分支开发结算流程重构，按同一 Change 的 Tasks 推进，先完成数据模型、共享契约和交易核心及相关验证”，据此批准实施本Change相关规划差异；不扩大为实际库清理、Push、Merge或发布授权。依赖顺序为1→2→3→4→5→6→7→8→9；每组同步自己的测试与文档，不建立平行计划。

依据：[Proposal](proposal.md)、[Design](design.md)、本Change的12份[Delta Specs](specs/)、T-08～T-11及Technical Design目标方案。旧正式Spec仍描述旧实现；产品基线已传播为v0.3 Draft，原批准全文保留在历史快照；只在本Change获批范围内替代，历史批准不改写。2026-10-31 Human已确认本轮不新增停售/禁售功能；SALE_BLOCKED仅保留未来条件性讨论，不进入本轮字段、工具或验证承诺。

## 1. 规划审查与实施前交接

- [x] 1.1 将Design §2的限定差异传播到DECISIONS的D-01/D-04～07/D-21～24及Requirements §3/5～9、Product Design §2～4/8，Technical Design同步本轮禁售范围澄清；保留旧批准历史与T-08～T-11来源，不标记整体Approved。验证：逐条对照12份Delta，无旧原生确认、一车一单、支付实时计价或车TTL残留为新流程约束。
- [x] 1.2 对本Change做独立只读Planning Review，重点核对完整旧要求替代、同键恢复、锁序/截止、配额/可售量区别、来源、分享及迁移；在本Tasks记录Findings与处理证据。验证：阻塞发现已解决或经Human明确裁决，不能把本轮自查算独立Review。
- [x] 1.3 呈交规划及受影响基线取得Human批准与实施授权，按Git Checkpoint Policy形成获授权的规划Checkpoint并运行Guard。验证：真实审批来源、提交和精确成果路径可核对；Guard通过才进入业务实现，提交不替代批准。

## 2. 数据结构与共享契约

- [x] 2.1 修改apps/api/prisma/schema.prisma及新迁移：Cart.orders一对多、Order CHECKOUT/PAID与关闭/截止字段、OrderLine唯一明细、固定金额、Inventory.reservedQuantity和持久操作幂等；删除旧Review/epoch/凭证依赖，不新增Checkout/Session。验证：独立store_test迁移及约束检查通过，正常库存不变量和PAID/关闭互斥成立，P008负库存样本仍保真且不可预留；不得为CHECK约束静默修正原件。
- [x] 2.2 更新packages/contracts的Cart/Order视图、selectedItems、请求键、预算/币种/规格约束、分页、错误、allowedActions及普通/分享入口；明确每个用例的输入和通道派生方式。验证：契约测试覆盖非法/未知字段、重复ID、数量断言、ID关联、配额和终态；文档标明新接口不兼容旧购买schema。
- [x] 2.3 保留apps/api/src/cart/pricing.ts精确金额算法，输入改为选中集合和本单服务端AI资格，订单快照只存一份明细/金额；删除purchaseHash依赖。验证：现有pricing测试迁移后覆盖990/1000门槛、HALF_UP、未选商品不贡献门槛、入口资格矩阵及金额上界。

## 3. 持续购物车与原子生单

- [x] 3.1 在现有CartService边界实现ID接续、初始化幂等与加购/设量/移除持久幂等；不引入通用编排层。验证：扩展cart-operations-db.test.ts等真实PostgreSQL测试，初始条目与Agent归因原子创建、纯浏览不建车、初始空Agent车拒绝、同键并发/跨重启/丢响应只操作一次，同键异载荷拒绝，旧版本冲突且无丢失更新；已关联订单不使车只读；创建/add/set零价/缺库存拒绝，set/remove不存在行拒绝，0不当删除，remove问题行可用。
- [x] 3.2 实现quote_selection与create_order共享用例：完整选择/预算/规格校验、锁价、预留、转出整行及递增版本同事务；按Design §6锁序，同键恢复优先。验证：真实库故障注入覆盖每个持久化边界，空/重复/缺失/数量不符整笔拒绝，未选问题行不阻止；两车竞争最后库存不超卖，不同键同车旧版本至多一次成功。
- [x] 3.3 实现默认10且可配置的待支付额度，校验正整数、Cart锁内准入、满额同键恢复及到期不占名额。验证：9→10竞争、降配置、支付/取消/到期释放名额，以及已到期未释放库存时不能借额度超卖；同步配置说明。
- [x] 3.4 实现get_order/list_orders及有效待支付列表，返回固定快照和当前状态，不调用实时计价重构历史。验证：同车多单、空车查单、有界分页、长期/跨重启查询，价格涨跌/促销结束/运费改变后原单金额和资格不变。

## 4. 支付关闭、可售投影与最小运行核对

- [x] 4.1 实现原订单UI模拟支付、取消及到期关闭短事务；锁订单后有序锁库存，锁后数据库时间准入；实际量与预留量只消费/释放一次。验证：真实PostgreSQL确定性并发覆盖支付/取消/到期、多实例竞争、等锁跨截止、截止前准入后提交、重复终态和事务回滚；已支付不退款，关闭原因不改写。
- [x] 4.2 在API进程内实现默认每秒扫描及启动补扫，不新增队列/Redis；提供只读预留账实核对及积压/最老超时信息。验证：多实例和重启补扫不重复释放，正常服务/数据库与明确记录的设计负载下释放延迟目标≤5秒；报告样本量、并发量、环境和实际最大延迟，故障期间不承诺上限。
- [x] 4.3 修改CatalogService可售投影与购物查询，保留异常原值、缺库存错误及初始化保护。验证：catalog/inventory及真实库集成覆盖预留、消费、释放后的可售一致性，公开可售零时原持有单仍可支付，依赖失败不fallback。
- [x] 4.4 更新受控本地统计：有效Agent建车一次，订单创建/有效待支付/物化关闭/PAID分别计量，收入仅PAID；文档说明过期未物化口径。验证：同车多单、重试、普通车AI生单、取消、超时数据集与数据库事实逐项一致，不新增公开统计服务。

## 5. 普通Web最小完整闭环

- [x] 5.1 替换HTTP和Next代理中的旧车Token/Review/提交路径，提供新购物/订单接口及UI专用支付调用，保留适用同源和MCP服务入口保护。验证：真实HTTP在隔离测试API上覆盖新输入、ID关联、错误映射和重复请求；旧写入口不能购买，不将UI专用宣称为身份证明。
- [ ] 5.2 更新features/cart的Provider/Commands/Hook和车页：持久currentCartId、逐项操作、默认全不选/全选、页面内有效选择、新商品不自动选、未保存数量不得生单、所选预估及待支付列表。验证：Commands测试与cart相关E2E覆盖初始化并发、草稿保护、前台刷新、版本乱序、同SKU重加和未知原键恢复；空车仍可找到原订单。
- [ ] 5.3 将features/checkout和路由改为/orders/{orderId}统一页，直接UI支付、取消、固定摘要、已支付/关闭反馈和多单导航，旧地址仅提示新流程。验证：checkout相关桌面/移动E2E完成真实测试API生单→支付/取消→继续购物；成功是同orderId，旧cartId路由不能误查或写单。
- [ ] 5.4 实现创建/支付/取消未知材料在请求前保存，Order按ID/查询顺序/已提交终态协调；区分本地到期、派生到期与物化关闭。验证：Commands与E2E注入丢响应、刷新、A/B切页、迟到创建/支付成功、旧查询及矛盾终态，不抢导航、不覆盖新车、不自动重付/重建。
- [ ] 5.5 实现本人接续与分享入口：无当前车/同车接续，跨车先看单再确认继续购物；分享不改变指针、不提供车/其他单/取消入口，有效待支付可模拟支付。验证：有无指针、A/B冲突、分享刷新、支付未知和关闭单；同步页面提示、键盘/辅助状态及Demo边界说明。

## 6. 基础MCP与WebMCP

- [ ] 6.1 重构apps/api/src/mcp/mcp.adapter.ts工具注册与协议映射，复用新用例并移除旧准备/原生批准/提交/独立取链工具；更新工具说明和接入文档。验证：mcp.test.ts及真实HTTP/MCP测试核对发现schema、结构化/文本错误、入口认证、公开字段、无支付工具及旧写入口失效。
- [ ] 6.2 完成基础MCP从明确购买目标到网页订单入口的结果，初始化及恢复沿原键/ID；遵守完整目标、预算、歧义澄清和Host审批。验证：可控工具场景覆盖咨询零写、加购不生单、A准备成功B失败不缩单、同键恢复、多候选查单/取消；不以提示词测试替代后端约束测试。
- [ ] 6.3 更新WebMCP PageTools，复用Web无React Commands并按页面注册；明确加购通常展示车、购买直接导航，用户要求留页时遵守；仅启用不导航。验证：webmcp相关自动化覆盖重发现、旧句柄、同车在途/草稿、迟到响应不抢页、刷新恢复及Human点击网页支付，普通Web仍可用；同步使用说明。

## 7. MCP Apps

- [ ] 7.1 更新apps/mcp-app的controller/view及资源映射，实例绑定cartId/orderId，按新操作契约编辑及整行生单；保持Host适配与Next分离。验证：controller.test.ts和资源测试覆盖静态数据隔离、旧卡片、草稿、错实体/乱序、直接导航、未知初始化及Bridge失败，不索取服务Token。
- [ ] 7.2 实现内嵌原单摘要和UI专用Bridge模拟支付、多单/旧卡片恢复、单订单显式分享；Agent无支付工具。验证：替身Bridge和mcp-app E2E覆盖Agent已结束、支付响应丢失/重挂载、倒计时与迟到PAID、分享可信路径及Host拒绝；同步资源/通道说明，替身证据单列。

## 8. 受控切换演练与集成回归

- [ ] 8.1 编写限定目标库的清理/迁移入口和运行说明，先只演练隔离store_test：停止旧写入并排空，核对SKU/种子覆盖，按依赖清理旧交易/幂等/材料、重置受控库存及预留，保留目录/评论和范围外数据。验证：dry-run清单、执行前后对账、故障中断再运行、旧进程/客户端写入拒绝；不删整个数据卷、不把日常重启变seed。
- [ ] 8.2 准备具体目标环境、数据清单、停写方式及恢复方案，取得对应清理执行授权后才切换实际环境。验证：目标确认、授权、前后数量及库存对账留在本Tasks；新流程产生数据后只能停写并用兼容数据代码前向修复，不能恢复旧写服务或再次清空新单。未授权则保留演练证据及待执行状态。
- [ ] 8.3 在隔离库/API/Web完成跨层回归及本地/Docker交付构建，更新README与DELIVERY_STATUS的真实结果。验证：相关单测、串行真实DB、HTTP/MCP、浏览器集成及typecheck/lint/build按受影响范围通过；记录环境变量/数据库名/端口，不记录秘密，跳过不计通过，不混用业务库或并行破坏性DB套件。

## 9. 真实入口、审查与交付验收

- [ ] 9.1 分别在真实基础MCP Host、WebMCP浏览器和Apps Host完成生单→Human支付→查同单、多单继续购物、未知恢复与显式分享；记录版本、应用revision和入口特有证据。验证：人工点击与自动化分开，同单金额/预留/支付结果可核对；缺口明确交Human接受，不能互相抵扣。
- [ ] 9.2 完成独立Code Review，核实修复并针对受影响路径重验；按Git Checkpoint Policy记录真实验证/Review及提交，呈交实现Diff、迁移证据和残余风险。验证：无未裁决阻塞发现，Guard与交付事实一致，不宣称未执行验证通过。
- [ ] 9.3 取得Human最终验收及残余风险接受，核对新规范与Decision/Baseline限定传播；完成正式Spec同步前逐项审阅合并预览，并更新旧Purpose/旧阶段说明，防止旧授权模型残留。验证：12项能力无重复要求、无旧契约冲突，批准范围可追溯；不改写原归档历史。

## Workflow follow-up

- 验收及授权满足后使用OpenSpec同步/归档；不要手改归档目录或为归档伪造完成项。
- Commit、Push、Merge及发布分别核对当前授权；本轮规划没有继承上一轮文档提交合并授权。

## 本轮规划证据

- 范围：基于main@436ac33，隔离于codex/checkout-lifecycle-planning。本轮修改同一Change、DECISIONS、三份目标基线及ENGINEERING_DECISIONS限定传播说明；新增两份传播前产品基线快照，旧批准全文保留，仅修相对链接。不改业务源码、正式Spec或已归档Change，不执行迁移/清理/安装。
- 依据：T-08～T-11为已采用设计选择；2026-10-31 Human确认不新增禁售功能，并明确授权基线传播、独立审查、发现后修订同一Change且不开发。Requirements/Product Design v0.3仍Draft，未新增整体Approved。
- 独立审查：`/root/planning_review`在全新只读上下文审阅Proposal/Design/12份Delta/Tasks、既有正式Spec、T-08～T-11、目标基线及必要源码；初审发现下表三项，主代理对照原契约核实修订后，由同一审阅者定向复核及检查传播。最终结论：通过，可交Human规划审阅，无新增实质性规划缺陷或待裁决业务冲突。不是自查冒充独立审查，也不代表运行验证。

| Finding | 核实与修订 | 定向复核 |
| --- | --- | --- |
| P2 初始化缺初始商品使有效Agent建车漏计 | Design §8.1/8.2、shopping-cart/agent-shopping Delta、Tasks 3.1与基线补initialItems；首次写意图原子建车/条目/归因，Agent非空且有效，纯浏览不建车，原键恢复当前内容 | 已解决 |
| P2 替换规格遗失可购买性及操作语义 | Design §6.1、shopping-cart Delta、Tasks 3.1与基线补创建/add/set目标可购买性；set/remove不存在行拒绝、0不当删除、remove问题行可用及相应反例 | 已解决 |
| P3 Proposal遗留停售旧句 | Proposal、Technical Design、决策传播统一无禁售功能；关闭仅CANCELLED/EXPIRED，SALE_BLOCKED条件性后置 | 已解决 |

- 文档验证：OpenSpec 1.15.0的`validate checkout-lifecycle-redesign --strict --json`通过（1项，0 issues）；status四类产物done，仅表示齐全。相对文件链接、能力覆盖及Delta目标/合并去重另做静态检查，`git diff --check`通过；历史快照正文保留由独立审阅者复核。2/30任务完成（1.1、1.2），其余28项未完成。
- 行为限制：未运行业务测试；真实PostgreSQL并发/回滚、正常负载5秒释放目标、清理演练/实际切换、真实Agent接入Host/Human验收均未完成，旧证据不用于宣称新模型通过。
- 可视化：沿用目标方案已有状态/流程图和本次限定替代矩阵，足以审阅本轮传播与修订；没有新建Recap或发布展示。
- 阶段边界：Planning Review已pass，Human规划批准/实施授权未取得；此前尚无checkpoint；本轮针对22份成果路径执行Guard，实际返回BLOCKED，仅因Human Approval pending与缺少checkpoint；Review已pass，不进入Implementation。Human随后于2026-10-31明确“那就提交”，授权提交本次规划与基线文档；该授权不等于规划整体批准或实施授权。实际提交由Git历史核对，未获Push/Merge授权。原main及两个未跟踪目录保持原状。

## 实施交接（2026-10-31）

- 本轮实施授权见本Tasks开头的Human原话；实施分支 `codex/checkout-lifecycle-implementation`，现有worktree `/private/tmp/agent-ready-store-checkout-planning`。规划checkpoint `55d8cfe`已包含于HEAD `4d9e945`。以该提交22份实际成果文件逐项运行Guard：verification=pass、review=pass（沿用上文独立规划审查）、approval=approved，结果PASS。首次传目录路径被Guard拒绝，改用精确文件清单后通过；没有绕过检查。


### 数据模型、共享契约与交易核心增量

- 完成 Tasks 2.1～4.4，连同本轮1.3交接为14/30；Tasks 5～9仍未完成。新接口/通道、配置、迁移和验证入口见 [CHECKOUT_CORE](../../../docs/engineering/CHECKOUT_CORE.md)，不建立第二套计划。迁移删除旧Review/epoch/凭证结构，但遇到任何旧交易记录先拒绝，未执行实际库清理；P008保留-1且不能预留。
- 核心实现：持久Cart初始化/逐项操作幂等；整行选择与预算/规格校验；一车多CHECKOUT、固定金额/明细、15分钟预留和Cart内配额；原单支付/取消/到期事务；长期快照/分页；可售投影；API启动补扫、周期扫描及只读预留/生命周期统计。旧交易HTTP明确410，旧MCP写流程拒绝且从发现中退出，目录查询保留。旧权限/Review/TTL/一车一单数据库测试由本轮生命周期用例替代；旧前端及待改HTTP测试不作为新流程证据，三入口尚不能完成新购物流程。
- 真实验证环境：本机darwin arm64 / Node v24.22.2 / pnpm12.11.2，已有本地PostgreSQL容器、127.0.0.1:5432新建独立store_test。安装仅按已有锁文件恢复worktree依赖，未新增依赖或更改锁文件。离线安装因缺元数据失败，联网锁文件校验后安装成功；首次受sandbox限制的迁移连接失败，获工具许可后仅对store_test迁移成功。未读出或记录秘密，业务store没有迁移/清理。
- `pnpm --filter @store/api db:generate`、`db:migrate`（DATABASE_URL=store_test）通过；新增迁移约束与回滚schema演练1项通过，确认旧Cart存在时迁移拒绝且保留记录，空交易模型迁移保留负库存。该演练不是Tasks8受控清理/切换完成。
- `pnpm test apps/api/test/cart/lifecycle-db.test.ts apps/api/test/inventory/inventory.test.ts --no-file-parallelism`（TEST_DATABASE_URL=store_test）：30项通过。覆盖持久键/跨客户端恢复、同键异载荷、非法选择、来源矩阵、预算规格、每个生单写边界回滚、操作幂等回滚、支付/关闭回滚、竞争最后库存、同车旧版本、9→10配额、降配置、到期额度与库存区别、锁后跨截止、截止前准入后提交、固定快照/多单、异常库存/账实统计。`migration-db.test.ts`另1项通过。
- 到期运行样本：同一进程两个真实数据库工作实例，20笔启动前已到期单+1笔周期到期单；启动补扫83ms，全部样本最大物化释放延迟884ms。正常本机小负载满足≤5秒目标；没有声称故障期间、任意负载或多主机性能保证。单笔异常保持原状并逐笔报告、批次轮转，不自动修账。
- 实际编译启动API（store_test，loopback 3003，WEB_ORIGIN=http://localhost:3004）成功，`retired-http.test.ts`真实HTTP/MCP 1项通过：旧车/支付/接手/链接入口410、MCP仅目录工具及旧写调用拒绝；测试API已停止。没有把这一退役验证称作新Web/MCP/Apps购买验收。
- 工作区 `pnpm typecheck`、`pnpm lint`、API `build`通过；默认 `pnpm test`为86通过、45环境条件跳过，跳过不算通过（本轮核心环境用例另按前两项实跑）。OpenSpec strict validate通过，git diff --check通过。旧UI自动化仍验证旧前端局部行为，不证明其已接入新核心；未跑全流程E2E、Docker交付构建或真实Host/Human支付。
- 独立Code Review：全新只读上下文 `/root/core_review` 对本轮未提交Diff及原Change契约审阅，发现P2“最旧坏单令到期整批饿死”。已核实、真实DB复现，逐单失败报告+keyset轮转修复，batchSize=1跨批回归及全部受影响DB重验通过；独立定向复核通过。随后对终态/Cart关联输出契约、配额入口及新增约束测试再次定向复核，无新增可行动缺陷。审阅者未运行破坏性测试，运行证据由实施者提供，不将其说成审阅者执行。
- Git：本轮未新增提交；当前所有核心修改/新增/旧代码删除都在实施worktree，未触碰main工作区两个未跟踪配置目录。当前授权不含本次实现Commit/Push/Merge；可审查Diff与验证已准备，实施Checkpoint等待Human提交授权；本轮针对全部实际修改/新增路径执行 `implementation-task-group` Guard，Verification/Review/Approval均满足，但因没有本次checkpoint commit实际返回BLOCKED（exit 1），未进入后续入口阶段或归档。无需新可视化：本轮用例/事务已有Design图和契约，核心增量摘要及测试证据足够审阅。


### 核心Checkpoint与普通Web HTTP接入（2026-10-31）

- Human明确授权：“授权提交现有已验证的核心增量，然后继续按同一 Change 的 Tasks 推进，从 5.1 开始，不 Push、不 Merge、不切换实际库。”本段补充本Tasks开头的实施范围，仍不授权实际环境切换；提交授权针对当时已有核心增量。
- 已按精确范围暂存并提交核心40个文件：`7151fdb feat: implement checkout lifecycle transaction core`。复用上节匹配的验证/独立Review证据，本轮diff检查通过；对提交全部40个成果路径运行implementation-task-group Guard，结果PASS。首次写Git索引被sandbox拒绝，随后获得工具许可完成；未Push/Merge，main工作区未动。
- 完成5.1，现为15/30。新HTTP以`/api/v1/shopping`分离旧入口，提供持久车、逐项幂等操作、选中报价、生单、分页查单、原单UI支付及取消；普通入口固定WEB、严格输入与关联校验、同源JSON写保护、no-store、业务错误状态映射。Next既有泛型rewrite直接覆盖新路径，未新增代理业务逻辑。接口表及验证约束见CHECKOUT_CORE。页面/Commands与其他入口尚未接入，不宣称普通Web闭环完成。
- TDD：先新增真实HTTP套件，在旧编译API上因新路由缺失失败；接入后重验通过。补测过程中发现测试用例误嵌套和测试headers类型问题，已修复测试并完整重跑，不改变业务契约。
- 真实隔离验证：沿用已迁移store_test，不运行迁移或实际库清理。API只监听127.0.0.1:3003，WEB_ORIGIN=http://localhost:3004；Next只监听127.0.0.1:3004且API_INTERNAL_URL指向3003。`lifecycle-http.test.ts`与`retired-http.test.ts`串行6项通过；另经Next代理跑`lifecycle-http.test.ts`5项通过。覆盖初始化/操作/生单重复与冲突、选择/预算失败无写入、WEB资格、空车查单、关联错误、原单重复支付/取消、严格分页与输入、Origin/JSON拒绝；旧HTTP写及MCP购买工具继续退役。测试服务均已停止，测试会清理store_test内测试数据，不连接业务store。
- API build、工作区typecheck/lint通过；默认pnpm test为86通过、50环境依赖跳过，本段前项已单独实跑新增5项及旧退役1项，其他环境跳过不算通过。未重跑未改的核心并发/迁移套件，沿用核心Checkpoint证据；未运行新页面E2E、Docker构建或真实Host/Human验收。
- 独立只读Code Review：全新上下文`/root/http_review`核对5.1未提交controller/test、原Change契约、核心及Next代理，未发现可行动缺陷；自行diff检查通过，未声称执行DB/HTTP测试。ID定位无身份隔离、Origin不证明自然人是已批准demo边界，UI/分享/WebMCP属于后续任务。短接口说明足以审阅，无需新增可视化。
- 此HTTP写入/支付适配增量作为下一组前端接入的交接基线，涉及服务来源与交易入口边界，按Git Checkpoint Policy使用Guard；本轮新增5.1增量尚未获提交授权。下一项5.2待此增量Checkpoint后继续，旧核心提交授权不扩展为自动提交后续增量。
- 本轮对上述4个精确成果路径实际执行implementation-http-adapter Guard，verification=pass、review=pass、approval=approved（实施授权），返回BLOCKED（exit 1），唯一缺项为本增量checkpoint commit；不是验证或业务批准失败。5.1成果保留未提交，未开始5.2修改。
