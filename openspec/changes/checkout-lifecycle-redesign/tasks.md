# Tasks

### 当前完整复用增量（2026-10-31）

Human确认并授权完整复用设计后，§10三项已实施与验证，当前31/33；9.1真实入口剩余验收和9.3最终接受/正式Spec同步仍未完成。Web与Apps现共用同一购物应用；旧阶段的独立Apps/局部复用描述由Design §13及T-11限定替代更新。Human本轮已明确授权提交本次完整共享应用与文档整合；提交及Git checkpoint以实际Git/Guard结果为准，9.1/9.3未完成前不关闭Change，未Push/Merge或归档。

### 最新实际切换记录（2026-10-31）

- Human对本机store清理1辆旧车、重置30SKU并迁移明确回答“是的，清理数据”；8.2已完成，当前28/30。9.1真实Host/Human和9.3最终验收仍待完成，未Push/Merge或公网发布。
- 目标127.0.0.1:5432/store/public。正式dry-run：Cart1、Order0、PurchaseReview0、Inventory30，无缺失/额外SKU，无其他DB会话或阻塞。刷新备份为`/private/tmp/checkout-store-authorized-cutover-20261031.dump`（0600），SHA256 `a1d5ac0f6c4d7b85cbe55e7a442af2daec67cbaf0043918d0b5efaaf978c4ba9`。
- 显式`--authorized-local-store`只放行该本机目标，原事务/重清保护不变；6项准入单测及独立只读order_review定向复核通过。实际execute完成清理和第七条Prisma迁移，四交易表全0、30SKU与受控种子一致、预留0、账实差异0；原件和卷保留。
- 实际停写检查存在缺口：DB零会话时main旧dev仍监听3000/3002，直到新服务启动EADDRINUSE才识别；确认项目归属后停止旧dev及子进程，恢复新实施版本，再查四交易表仍0。未声称首次检查充分；以后停写必须同时核对端口/watcher和DB连接。
- 新应用从实施worktree的既有构建启动，使用根.env，未重新build/seed。Web3000、API3002健康与产品代理均200，新订单不存在ID返回404；只读验证无新增交易，服务保持运行。不要启动main旧程序写新库。代码提交`c3eb667`，后续记录提交按连续授权执行；未查看图片。

以下为各阶段历史记录，实际环境的先前“待授权”描述由以上明确授权和执行事实更新。

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
- [x] 5.2 更新features/cart的Provider/Commands/Hook和车页：持久currentCartId、逐项操作、默认全不选/全选、页面内有效选择、新商品不自动选、未保存数量不得生单、所选预估及独立订单列表入口。验证：Commands测试与cart相关E2E覆盖初始化并发、草稿保护、前台刷新、版本乱序、同SKU重加和未知原键恢复；空车仍可找到原订单。
- [x] 5.3 将features/checkout和路由改为/orders/{orderId}统一页，直接UI支付、取消、固定摘要、已支付/关闭反馈和多单导航，旧地址仅提示新流程。验证：checkout相关桌面/移动E2E完成真实测试API生单→支付/取消→继续购物；成功是同orderId，旧cartId路由不能误查或写单。
- [x] 5.4 实现创建/支付/取消未知材料在请求前保存，Order按ID/查询顺序/已提交终态协调；区分本地到期、派生到期与物化关闭。验证：Commands与E2E注入丢响应、刷新、A/B切页、迟到创建/支付成功、旧查询及矛盾终态，不抢导航、不覆盖新车、不自动重付/重建。
- [x] 5.5 实现本人接续与分享入口：无当前车/同车接续，跨车先看单再确认继续购物；分享不改变指针、不提供车/其他单/取消入口，有效待支付可模拟支付。验证：有无指针、A/B冲突、分享刷新、支付未知和关闭单；同步页面提示、键盘/辅助状态及Demo边界说明。

## 6. 基础MCP与WebMCP

- [x] 6.1 重构apps/api/src/mcp/mcp.adapter.ts工具注册与协议映射，复用新用例并移除旧准备/原生批准/提交/独立取链工具；更新工具说明和接入文档。验证：mcp.test.ts及真实HTTP/MCP测试核对发现schema、结构化/文本错误、入口认证、公开字段、无支付工具及旧写入口失效。
- [x] 6.2 完成基础MCP从明确购买目标到网页订单入口的结果，初始化及恢复沿原键/ID；遵守完整目标、预算、歧义澄清和Host审批。验证：可控工具场景覆盖咨询零写、加购不生单、A准备成功B失败不缩单、同键恢复、多候选查单/取消；不以提示词测试替代后端约束测试。
- [x] 6.3 更新WebMCP PageTools，复用Web无React Commands并按页面注册；明确加购通常展示车、购买直接导航，用户要求留页时遵守；仅启用不导航。验证：webmcp相关自动化覆盖重发现、旧句柄、同车在途/草稿、迟到响应不抢页、刷新恢复及Human点击网页支付，普通Web仍可用；同步使用说明。

## 7. MCP Apps

- [x] 7.1 更新apps/mcp-app的controller/view及资源映射，实例绑定cartId/orderId，按新操作契约编辑及整行生单；保持Host适配与Next分离。验证：controller.test.ts和资源测试覆盖静态数据隔离、旧卡片、草稿、错实体/乱序、直接导航、未知初始化及Bridge失败，不索取服务Token。
- [x] 7.2 实现内嵌原单摘要和UI专用Bridge模拟支付、多单/旧卡片恢复、单订单显式分享；Agent无支付工具。验证：替身Bridge和mcp-app E2E覆盖Agent已结束、支付响应丢失/重挂载、倒计时与迟到PAID、分享可信路径及Host拒绝；同步资源/通道说明，替身证据单列。

## 8. 受控切换演练与集成回归

- [x] 8.1 编写限定目标库的清理/迁移入口和运行说明，先只演练隔离store_test：停止旧写入并排空，核对SKU/种子覆盖，按依赖清理旧交易/幂等/材料、重置受控库存及预留，保留目录/评论和范围外数据。验证：dry-run清单、执行前后对账、故障中断再运行、旧进程/客户端写入拒绝；不删整个数据卷、不把日常重启变seed。
- [x] 8.2 准备具体目标环境、数据清单、停写方式及恢复方案，取得对应清理执行授权后才切换实际环境。验证：目标确认、授权、前后数量及库存对账留在本Tasks；新流程产生数据后只能停写并用兼容数据代码前向修复，不能恢复旧写服务或再次清空新单。未授权则保留演练证据及待执行状态。
- [x] 8.3 在隔离库/API/Web完成跨层回归及本地/Docker交付构建，更新README与DELIVERY_STATUS的真实结果。验证：相关单测、串行真实DB、HTTP/MCP、浏览器集成及typecheck/lint/build按受影响范围通过；记录环境变量/数据库名/端口，不记录秘密，跳过不计通过，不混用业务库或并行破坏性DB套件。

## 9. 真实入口、审查与交付验收

- [ ] 9.1 分别在真实基础MCP Host、WebMCP浏览器和Apps Host完成生单→Human支付→查同单、多单继续购物、未知恢复与显式分享；记录版本、应用revision和入口特有证据。验证：人工点击与自动化分开，同单金额/预留/支付结果可核对；缺口明确交Human接受，不能互相抵扣。
- [x] 9.2 完成独立Code Review，核实修复并针对受影响路径重验；按Git Checkpoint Policy记录真实验证/Review及提交，呈交实现Diff、迁移证据和残余风险。验证：无未裁决阻塞发现，Guard与交付事实一致，不宣称未执行验证通过。
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


### 持久购物车Web接入（2026-10-31）

- Human在上一轮5.1提交请求后回复“授权”；据此提交四文件增量为`f3727d9 feat: expose checkout lifecycle HTTP endpoints`，精确路径Guard PASS。未Push/Merge/切换实际库。本段追加后续事实，不覆盖此前待提交历史。
- 完成5.2，当前16/30：Provider持久当前车/原请求恢复，新增无React lifecycle-commands、页面Hook及分页历史组件；车页默认全不选、逐行选择/全选、Enter/失焦设量/移除、有效选择保留、选中预估、空车可查原待支付及历史订单。普通Web新车已接入5.1，完整订单页仍待5.3，未将5.4/5.5提前标完；生单未知存前及草稿保护为本次车页必需的有限接线。使用说明见CHECKOUT_CORE。
- 独立只读审查`/root/cart_review`发现硬加载覆盖当前车指针、未知生单恢复清掉草稿、生单冲突缺重载、失焦保存遗漏；核实后修复并补回归。另补在途前台延迟校准及空车已支付历史入口。定向复核再发现跨版本移出/同SKU同量重加仍被勾选，真实浏览器复现后采用跨多版本保守清空选择，连续单版本保留有效选择；最终定向复核通过，无未决可行动发现。审阅者只读静态复核，未执行DB/E2E；其尝试替身浏览器受环境阻止，不作为运行证据。
- Commands新增4项通过，覆盖存前、未知跨实例原键恢复、存储不可用零写、目标/版本保护及冲突不重放；默认`pnpm test`90通过、50环境依赖跳过。工作区typecheck/lint通过；最后选择修复后Web typecheck/lint再次通过。按React best practices聚焦核对Hook/派生状态/请求归属，无新增依赖或额外平行Review。
- 最终稳定代码的真实浏览器集成`cart-lifecycle.spec.ts --workers=1`共18项通过（Chrome桌面9、移动视口9），全部无pageerror；覆盖初始化重复点击/丢响应刷新、操作原键恢复、草稿保护、Enter/失焦、冲突重载、旧响应、在途前台刷新、新行/跨版本同SKU重加、空车历史及当前指针不被URL覆盖。API127.0.0.1:3003、Next127.0.0.1:3004、WEB_ORIGIN=http://127.0.0.1:3004，仅store_test；测试前仅重置该库交易/库存并按受控种子初始化，未迁移或触碰业务store。测试服务已停止。
- 首轮浏览器失败因测试WEB_ORIGIN使用localhost而浏览器使用127.0.0.1，正确触发同源拒绝；统一测试来源后通过。中途修复误替换产生的临时TS/浏览器错误已修正，热更新期间14项不作为最终证据；最终另以18项和pageerror断言完整重跑。运行仍有现有商品图LCP优化提示及终端颜色提示，无业务失败。
- 旧cart/checkout/handoff/WebMCP等E2E仍按旧schema/页面契约，未作为新流程通过证据；它们随剩余入口迁移及8.3集成清理，不把本轮18项等同全仓E2E、真实Host、Human支付或最终验收。服务核心/HTTP未改变，复用7151fdb/f3727d9对应有效证据。
- Web生产构建通过。首轮sandbox中Turbopack CSS进程无法绑定端口，获工具许可后缓存仍重复错误；保留并移开生成的.next缓存，再干净构建成功（未改源码或切换打包器）。OpenSpec strict validate与git diff --check通过。
- 本轮5.2的请求持久化、UI生单与响应协调形成下一订单页接入的可审查基线；按高风险交接检查Checkpoint。当前提交授权仅覆盖已提交的5.1，5.2新增/修改保持未提交，下一项5.3等待本增量本地提交授权。没有改正式Spec、归档或实际环境；不新增可视化，现有设计图、交互用例及Diff足以审阅。
- 对上述9个精确成果路径实际运行implementation-web-cart Guard：verification=pass、review=pass、approval=approved（实施授权），结果BLOCKED（exit 1），仅缺本增量checkpoint commit。未开始5.3修改。


### 统一订单支付页（2026-10-31）

- Human明确“提交并继续 5.3 订单支付页”。据此提交上一轮已验证/独立审查的5.2九文件增量：`4f28b86 feat: connect persistent shopping cart web flow`；精确九路径implementation-web-cart Guard PASS。首次写Git索引遭sandbox限制，取得工具许可后成功。继续原worktree和实施分支，main及其两个未跟踪目录未动；未Push/Merge/切换实际库。
- 完成5.3，当前17/30。统一`/orders/{orderId}`直接查询、固定摘要/来源/截止、UI支付原单、取消、已支付/关闭反馈、同车继续购物和分页多单导航；旧checkout/order-details只提示退出，orders参数不按cartId映射。页头不再把orderId当cartId。复用既有请求和commerce-ui金额组件，无新增依赖。实现说明见CHECKOUT_CORE。
- 页内未知动作发送前持久化，未知只读原单、显式重试限原动作，存储失败零写；按ID/读取顺序与已知终态协调，本地到期不宣称关闭。5.4完整跨页迟到结果保存与竞态验证、5.5本人跨车接续/分享完整集成仍未完成；本轮只接必要页面保护和分享导航隐藏，不提前勾选。旧未挂载控制器及其他入口迁移清理仍随后续任务，不将旧E2E当新流程证据。
- TDD：新订单E2E在旧页因无待支付标题真实失败；新增审查回归也先在旧实现复现两项失败，再修复重跑。首次Chrome受sandbox限制，获工具许可后实跑。测试误把Next诊断POST计为业务写、alert选择器碰到路由播报器，均按实际语义修正。加入pageerror断言后发现服务端仍输出旧“订单结果”，核对实际HTML后保留移开.next生成缓存并重启，最终无hydration/pageerror；中间重复测试耗尽测试库存的失败保留，不当有效证据。
- 最终真实集成：`CHECKOUT_INTEGRATION=1 WEB_BASE_URL=http://127.0.0.1:3004 pnpm exec playwright test e2e/order-lifecycle.spec.ts e2e/cart-lifecycle.spec.ts --workers=1`，34/34通过（订单16、车18，Chrome桌面/移动视口）。覆盖真实API生单→UI支付/取消→同ID固定快照/继续原车、多单、旧路由无写、丢响应刷新、读故障/存储失败、本地期限、未知取消原操作重试及PAID后404保留。断言无页面异常及横向溢出，另检查桌面/移动截图。自动化点击不是Human验收。
- 测试API127.0.0.1:3003和Web127.0.0.1:3004，WEB_ORIGIN一致，只连store_test。最终回归前停止测试服务、仅重置该库交易/库存并用受控种子恢复；没有迁移、清理或连接业务store。测试服务已停止。API/交易核心未改，复用7151fdb/f3727d9真实事务/HTTP证据，不机械重跑并发套件。
- Web typecheck/lint、生产build通过；默认pnpm test90通过、50环境跳过（不算通过）；OpenSpec strict validate、git diff --check通过。React best practices聚焦核对依赖、初始化、派生状态及组件复用；无额外Review叠加。页面与现有设计一致、短摘要足以审阅，不新增可视化产物。
- 独立只读Code Review：全新上下文`/root/order_review`发现两项P2：取消未知丢失action误开放支付重试；后续404遮掉已确认PAID/关闭快照。核实、失败回归、修复及定向2/2通过；同一审阅者定向复核通过，无新增阻断问题。审阅者未执行写库测试，34项运行由实施者完成。
- 5.3修改保留未提交，当前“提交”授权用于上一轮5.2，未扩展为后续增量自动提交。按订单交接风险执行implementation-web-order Guard，具体结果见下项；5.4/5.5及其他未完成任务不推进。本轮没有新增提交以外的Push/Merge/发布，也未同步正式Spec或归档。
- 对本轮12个精确成果路径（含路由重命名两端）实际执行Guard，verification=pass、review=pass、approval=approved，返回BLOCKED（exit 1），唯一缺项为本增量checkpoint commit；不是验证或业务审批失败，下一任务仍待本增量提交授权。

### 连续实施授权（2026-10-31）

Human明确：“授权之后往下推进，如果没有什么需要我审批的，就直接往下推进，不用停下来。”据此授权提交已验证的5.3及同一Change后续常规实现增量；继续原分支实施、验证、独立Review及必要Checkpoint，不再逐增量请求提交。实际环境清理/切换、Push/Merge/发布、契约变化及最终Human验收仍须各自明确授权；遇到该类事项先备妥可审查结果，其余不依赖工作继续。


### 订单恢复与本人/分享接续（2026-10-31）

- 5.3提交为`fab4e0e`，精确路径Guard PASS。按上节连续授权完成5.4/5.5，当前19/30；原单跨页状态协调、请求前持久化、迟到创建入口通知、本人无车/同车接续及跨车显式确认、单订单分享详见CHECKOUT_CORE新增章节。没有引入状态库/新依赖，SSR无模块级交易状态，不改数据库/计价/权限契约。
- 单测先失败（初次导入别名不被Vitest识别，改相对路径后4项明确因缺少OrderCommands失败），实现后4项通过。涵盖按ID与查询顺序、迟到支付、终态防回退、有界矛盾重查、未知取消原操作及存储失败零写。默认pnpm test94通过50环境跳过；Web typecheck/lint/build通过。
- 真实浏览器最终48/48通过（订单30、车18，桌面/移动），沿用API3003/Web3004与匹配Origin，仅store_test；最终运行前只重置测试交易/库存及受控种子，未触碰业务库，服务已停止。新增覆盖本人无指针/跨车确认拒绝与同意、分享有/无指针及支付刷新、A/B切页迟到支付、迟到创建不抢页面/指针、本地截止与迟到PAID、矛盾终态有界重查。故障注入边界独立说明，不代替真实Human/Host验收。
- 初次跨车确认测试发现重复插入确认区域，修复后通过；迟到支付测试原快进16分钟同时触发网络超时，修正为只移Date并运行1秒，覆盖真正的截止与在途响应顺序；中间失败不计通过。
- 独立Review `/root/order_review`发现P2：离开后在响应前返回车页未收到迟到创建成功通知。精确等待新页挂载后复现失败，改由CartProvider协调创建及完成通知，只刷新当前页原恢复材料，不覆盖草稿/车快照/导航；定向回归通过，同一审阅者复核通过，无新增问题。最终48项包含此顺序；Review仅静态，运行证据由实施者提供。
- OpenSpec与Diff检查及提交Checkpoint按当前连续授权执行；5.4/5.5完成不代表Agent入口或最终验收完成。不新增可视化/过程报告，现有Tasks和源码/测试为证据。


### MCP / WebMCP 入口（2026-10-31）

- 5.4/5.5已提交`ce032d0`。按连续授权完成6.1～6.3，当前22/30；基础MCP13工具、新WEBMCP专用初始化/生单路径、PageTools共享Commands及原通道恢复，使用说明见MCP_CONNECT/CHECKOUT_CORE。旧purchase-webmcp测试由新生命周期集成替代。Apps旧资源元数据暂移除，随后7组迁移，不声称Apps已完成。
- 后端委派`/root/agent_entry`实施并验证，报告41项真实测试通过：MCP目录/认证2、MCP生命周期5、HTTP6、旧入口1、交易核心27；API typecheck/lint/build通过。测试只连loopback store_test/API3003。实际SDK发现union根type及Agent初始非空schema问题，先失败后修复。未执行自然语言真实Host或Human验收。
- 前端新增原通道初始化测试，默认pnpm test95通过56环境跳过；Web typecheck/lint/build、OpenSpec strict validate和diff检查通过。最终Chrome桌面/移动真实集成60/60通过（购物车18、订单30、WebMCP12），API127.0.0.1:3003/Web3004同Origin，仅store_test，测试前恢复受控库存，测试后停止服务。WebMCP使用注册替身；UI点击自动化不算Human验收。
- 独立只读`/root/order_review`发现同目录query变化未撤销写句柄、迟到生单抢导航P2。新增真实回归复现，注册增加queryKey依赖；初次修复暴露passive cleanup先清搜索Promise，改layout阶段消费匹配目录结果后通过。定向2/2及最终60项覆盖，审阅者重新读最终代码后定向复核通过，无未决发现。审阅者未跑写库/浏览器。
- 其他初次浏览器失败来自测试错误草稿恢复按钮与未等导航完成，按实际UI和导航完成条件修正，不当产品通过证据。保持同一worktree/分支，无Push/Merge/发布/实际库切换，正式Spec与最终验收仍待后续。高风险入口交接按精确路径执行Checkpoint；本组短摘要与原契约足以审阅，不新增可视化。


### 实际环境切换准备（8.2，待单独执行授权）

- 2026-10-31只读核对候选本机目标：`agent-ready-store-local-db-1`，loopback5432的`store/public`，开发卷由compose.local.yaml管理。六条旧迁移均finished，旧Cart1、Order0、PurchaseReview0、Inventory30；SKU/数量与受控种子一致（保留P008=-1异常样本），当时无其他store会话。只读事务已回滚，无业务写入；此快照在正式执行前须重新核对。
- 拟执行范围：停止原Web/API/扫描任务及Host写入口并排空，明确连接目标；删除上述旧交易/幂等材料，定向恢复30SKU受控库存并迁移新结构/预留0，保留商品/评论只读原件、其他表和数据卷。先对账，确认新服务兼容后恢复写入。不得删整个卷，不得将日常启动变成seed。
- 已以只读pg_dump准备权限0600的本地备份`/private/tmp/checkout-store-before-cutover-20261031.dump`，SHA256=`a949967ba6bcd8a214bb47cb9a2b580ba35be837e4002add9c6468f81a6a93e0`，未上传/加入Git。实际执行窗口须刷新备份和数量；临时目录备份不代表长期备份策略。
- 失败时保持写服务停止，检查Prisma ledger并以前向兼容修复恢复；新流程产生数据后不恢复旧写服务、不重清新单。备份用于隔离核对与必要数据修复，不授权覆盖新数据。当前脚本硬限制store_test，真实store执行需在Human确认具体目标/清理范围后审阅扩展目标准入，不能绕过限制自行执行。
- 8.2尚未完成：实际目标执行/停写与恢复未授权也未运行；此处准备不代表批准。8.3及9.2的独立工作继续，9.1真实Host/Human验收与9.3最终接受仍待Human参与。


### Apps内嵌购物与原单支付（2026-10-31）

- 第6组提交`2ddf6f2`，精确18路径Guard PASS。完成7.1/7.2，当前24/30。Apps Controller/View/Main迁移共享生命周期契约，11静态资源关联步骤工具，3个app-only Bridge入口；后端可信APPS生单、原ID支付和共享查单/取消。操作及信任边界见MCP_CONNECT。无新依赖，无Token/Cookie索取，未在模型目录开放支付。
- `apps_lifecycle`实施前端，root实施API资源/Bridge。21项Controller测试通过，Apps typecheck/lint/build通过；真实MCP/HTTP定向9项（含UI原单支付一次/错车/来源/严格输入）与资源/目录4项通过，store_test/API3003，不混业务库。资源测试先在旧适配器因无metadata失败，再实施。全仓默认74通过53环境skip、typecheck/lint通过；skip不计通过。
- 官方SDK AppBridge替身Chrome桌面/移动4/4通过，覆盖实际iframe重挂载PAID、原未知支付恢复、完整选行/内嵌摘要/同ID支付/显式分享、pageerror及溢出。Host替身的connect前context导致Not connected和初次focus误刷新已定位修正；未把中间失败当通过。检查移动截图并调整checkbox继承样式。替身不是实际Host或Human验收。
- 独立只读`order_review`发现跨卡片覆盖未知材料、损坏材料被重新解锁、派生EXPIRED误称关闭、UI生单重挂载不恢复原单四项P2；实施者补失败回归并修复。恢复按入口+Host toolInfo.id+原目标区分，目标/原载荷严格校验，前台在途完成后校准，有界终态冲突重查。最后补返回位置存储失败的红测，先保存位置再清匹配pending；21项全绿，审阅者逐项及最终定向复核通过，无未决可行动发现。
- 稳定卡片恢复依赖Host保留同sessionStorage和稳定toolInfo.id，缺ID只保留原实体查询/订单列表，不假称支持跨Host恢复；存储不可用零写，未知损坏阻写。真实Host版本/隔离/iframe支付/人工动作仍待9.1，未改变Demo信任契约。高风险交接按本组精确路径提交和Guard，不Push/Merge/发布。


### 隔离切换入口与完整迁移演练（8.1）

- 完成8.1，当前25/30；`scripts/checkout-cutover.mjs`默认READ ONLY，仅专用CUTOVER_DATABASE_URL、loopback/store_test及明确参数，执行须确认目标和停写排空。检查完整SKU/旧结构/依赖/其他连接；事务清理旧PurchaseReview→Order→Cart并定向重置受控库存，保持原件/范围外表/卷。新结构无论是否有订单均拒绝再次清理。运行入口见TOOLING，不支持直接清理实际store。
- 独立schema故障演练：库存触发器失败回滚全部删除/更新，解除后重试；SKU/FK/其他连接拒绝；原迁移SQL及新数据保护；public前后数量/库存一致。独立Review发现清理提交前忽略after.blockers，真实peer初查后重连等锁复现；仅加blockers仍因统计缓存失败，再加pg_stat_clear_snapshot后通过，提交前拒绝全部复查阻塞。审阅者定向复核通过。
- 完整Prisma部署演练使用缓存postgres:18.4-alpine新tmpfs容器，loopback62244/store_test，不挂业务卷；真实Prisma建立旧六迁移ledger与1车1单1Review/30SKU/范围外标记，正式CLI默认dry-run再明确execute清理并标准migrate deploy第七条。后验四交易表0、库存30及受控数量一致/预留0/账实差异0，范围外标记保留、七条ledger finished；插新车后再execute预期拒绝且保留新车。临时容器已删除，原5432业务/测试库未被此演练清理。
- 最终root复跑cutover+local脚本14/14通过（含真实schema子场景），另库存初始化3/3通过；此前独立完整deploy报告事实已核对。没有自动终止其他连接/修改角色权限，持续停写仍需实际操作者控制。实际store仍只读盘点和备份，8.2不标完成。


### 集成交付检查与审查收尾（8.3、9.2）

- 完成8.3与9.2，当前27/30；剩余8.2实际环境切换、9.1真实三入口Host/Human、9.3最终接受与正式Spec同步。实现组独立审查覆盖core/http/cart/order/Agent入口/Apps/迁移及最终集成增量，Findings均经核实修复和受影响复验，无未裁决可行动缺陷；复用各组有效证据，不将自查、自动化或静态复核混称Human验收。
- 清理5份过时API测试，先将JSON/大小边界、Origin/逐行输入/伪造字段、旧GET/PUT/Review/链接退休矩阵及WEB→WEBMCP归因补入新HTTP套件；新真实HTTP11项通过。旧Token/Review/整车只读E2E由新cart/order/webmcp生命周期替代，保留商品发现与toast/键盘/减弱动画/在途锁定/空车入口场景。旧未挂载Web控制器及其类型/局部测试仍保留，不算新入口验收。
- 集成回归发现导航后购物提示残留，真实红测后以pathname条件重置修复；20项商品/反馈浏览器通过，最终调整状态重置方式后定向2项再过。Catalog改用当前可见ARIA角色，避免Next隐藏旧树的重复定位，全部新增pageerror断言。一次清理生成缓存没有解决全部重复定位，最终按可见页面语义修正；无以隐藏错误换通过。
- 最终默认单测74通过53环境skip；后续在store_test/API3003串行运行8文件50项真实DB/迁移/HTTP/MCP/资源，再停止API单跑库存3项，覆盖53项环境用例。cutover/local脚本另14/14通过。Web浏览器60项（订单/车/WebMCP）、商品/反馈20项及Apps官方SDK替身4项均有通过证据；末次局部调整仅定向复验，未宣称84项来自同一次完整运行。测试服务均已停止，不碰业务store写入。
- 全仓typecheck/lint/format、pnpm build及OpenSpec strict validate/diff检查通过。Docker离线首次缺缓存未通过；按现有Dockerfile恢复既定依赖后发现Web未声明其直接使用的Zod，本机旧依赖掩盖。补与现有共享契约一致的zod4.6.7直接声明及lock importer，无新库/版本；最终Docker生产镜像agent-ready-store-production:checkout-lifecycle构建成功，离线容器检查确认无原件/.env/API源码、具API/Web产物及11资源，未部署或推送。
- Compose去旧Cart密钥/Cookie设置、传入待支付上限；README精简为新流程与运行导航，DELIVERY_STATUS如实区分实现/隔离演练/实际切换/真实Host及Human。独立最终Review发现CI引用已删旧测试与8资源断言，已更新3003/Origin/生命周期环境变量、串行新套件、切换测试及11资源；定向复核通过。仓库CI配置未在远程运行，不宣称平台保护或远程CI通过。
- 精确范围提交与Guard后交付；没有Push/Merge/发布、实际库清理或正式Spec同步。Human要求后续不查看图片、构建级验证集中在最终交付；本轮已有证据复用，不再扩展重复验证。

### Human验收界面修复（2026-10-31）

- Human要求车页/详情移除内嵌待支付与全部订单列表、独立列表、统一勾选与按钮样式、正常生单直达原单、「確認支付」文案及明显操作反馈。复用现有组件和查询契约，新增/orders?cartId=…；同步Design、hosted-checkout delta及产品/技术页面职责。未知、草稿保护、迟到不抢导航、分享单订单范围与Demo不扣款说明保持。
- 原工作区main为旧实现，实际验收服务来自本worktree；在干净codex/checkout-lifecycle-implementation上修复。未改API/交易/库存/幂等，不迁移、不seed、不清理业务数据。采用已有连续提交授权，本轮不Push/Merge/归档，最终Human验收仍待确认。
- 浏览器替身测试先在旧构建复现列表混杂与无反馈；Chrome首次沙箱启动失败后使用本地执行权限。3004开发服务通过12项，最终3000生产构建桌面/移动12/12通过，含几何对齐/间隔/黑色按钮/无溢出、自动直达、焦点与滚至顶部、动画/减弱动画、5秒消失、连续结果重置计时、迟到不抢页、未知不报成功和分享边界。交易API均被拦截，无真实支付/取消，不冒称真实交易或Human验收；旧真实集成测试按新导航/文案同步，本轮未重跑数据库集成。
- 默认单测74通过、53环境skip（不算通过）；Web typecheck/lint、生产build、OpenSpec strict validate、格式与diff检查通过。构建先因沙箱端口权限失败，提权后仍命中Turbopack错误缓存，移出可再生cache/turbopack后重新构建通过。按原配置重启本地API/Web，3000健康接口ok；3004临时服务已停止。
- 独立只读acceptance_review发现提示计时受每秒重渲染重置、连续生单→支付未重播/重计时及旧兄弟订单测试导航断言；稳定dismiss回调、按反馈结果重挂载并补计时回归，旧断言经独立列表导航。最终定向复核通过，无新增可行动发现；审阅者未运行测试。React best practices聚焦核对hooks/派生状态/可访问性，verification-before-completion核对实际结果；不另建报告或可视化。

### 数量操作验收纠偏（2026-10-31）

- Human指出数量修改不应要求手动储存。移除多余「儲存數量」按钮及先储存文案，保留既有失焦/Enter自动更新、非法输入与未知恢复，恢复按钮简化为「還原數量」；未改变数量的Enter不发重复请求。此为既有自动保存契约的局部呈现修复，无新交易/架构契约。
- 新浏览器回归先在旧页面因多余按钮失败，最终3000生产构建Chrome桌面/移动2/2通过：自动更新、未改零重复提交、非法值零请求、修正后Enter提交及刷新保留。测试用交易API替身，不操作业务订单；首次修复后测试定位同时命中Next announcer，限定main内错误提示后通过。Web生产构建（含TypeScript）、lint、diff检查通过，旧集成测试入口同步；复用上轮无变化的交易验证，不重跑数据库。
- 聚焦自查，无独立Review冒称；低风险单组件交互修复不追加正式Guard。依已有连续授权提交；按原配置重启本地验收服务，无迁移/seed/清理、Push或Merge。

### 勾选标记与继续购物（2026-10-31）

- Human反馈勾选图标不清晰，并要求「繼續購物」到商品列表。实际浏览器读取稳定选中态为白色描边/黑色背景，未复现同色；增强为显式前景色、16px/3px描边，部分选中用Minus标记。订单页同车「繼續購物」改为/且保留当前车，分享/跨车确认边界不变；同步技术页面职责和原集成测试导航。
- 新回归先因原购物车href失败，最终3000生产构建桌面/移动4/4定向通过，核对显式白色描边/黑底、图标尺寸、对齐/间隔及生单、继续购物目标。交易接口均为替身；未改变业务数据。Web构建（含TypeScript）、lint及diff检查通过，服务已按原配置更新。局部呈现与链接调整做聚焦自查，不额外独立Review/Guard；依连续授权提交，不Push/Merge。

### Checkbox实际绘制根因修复（2026-10-31）

- Human指出上轮仍未解决。直接读取当前IAB页面并检查实际截图：白勾确实未显示在黑框中。根因为globals.css全局`.grid`商品列表三列及28px间距覆盖Checkbox Indicator的Tailwind `grid`，图标在框左侧偏移20px，白色落在白背景上；上轮只查颜色和尺寸的证据不足，不算真实视觉修复。
- 将商品列表及响应式选择器限定为`.product-grid`，保留组件正常grid布局，修复目录筛选与购物车共同根因。补图标包含于框及中心偏移断言，旧版两项明确失败；最终Chrome桌面/移动4/4通过，Web生产构建/TypeScript、lint及diff检查通过。当前IAB刷新后实际截图已确认白勾在框内；恢复原未勾选状态，未提交筛选或操作交易数据。
- 局部CSS命名冲突修复，聚焦自查；按连续授权提交并更新本地运行服务，无额外架构/交易变化、Push或Merge。

- 后续跨页面样式巡检：320px页头文字被挤成多行，改为导航不压缩、页头按需整组换行；跨车接续确认复用commerce-actions的24px上距/12px按钮间隔，次操作改outline；订单列表错误文案与重试按钮分开。均为局部可逆呈现调整，不改交易契约。新窄屏/确认回归旧版4项失败，最终桌面/移动验收22/22通过；新增错误恢复间距与确认截图定向4/4通过，Web生产构建（含TypeScript）、lint及diff检查通过。IAB实际检查商品列表/详情、车、订单列表/详情及320/390px布局，白勾可见、文字不挤行；确认/错误分支用接口替身的真实浏览器截图核对。复用已有组件、无新增依赖，聚焦自查，未冒称独立Review。
- 本地Web/API与Docker数据库原已停止，恢复既有本地容器和原配置服务，未迁移/seed/清理。规划复核仍28/30，9.1真实Host/Human验收、9.3最终验收/Spec同步/归档保持未完成；local-dev-delivery-build开发5/5，归档仍待收尾。按已有连续授权提交，不Push/Merge。


### 真实三入口主流程与内嵌卡片验收（2026-10-31）

- 9.1部分完成，保持未勾选；9.3最终接受/正式Spec同步仍待执行。真实Host为ChatGPT/Codex桌面26.1027.30824（22943），MCP server agent-ready-store 0.1.0，Apps checkout-lifecycle-v1，ext-apps SDK1.1.2；应用基于2763f4a及本次UI修订，Web3000/API3002，使用既有本机store。没有清理、迁移或seed。
- 验收专用车`0e9437e7-ea31-4fad-9fd2-ad03762a7c0a`：基础MCP订单`0ce5a253-7f0c-4af0-82a2-06d8559f104b`（P001×1，TWD1700.50，paidAt00:03:32.736Z）；真实WebMCP订单`d5f3aad4-5115-4f32-a8e7-acdcc1e67eaa`（P001×1，TWD1700.50，paidAt00:06:25.458Z）；真实Apps Bridge订单`83df182c-8bc9-45b2-825f-37ece618ca84`（P009×1，TWD841.00，paidAt00:10:36.562Z）。日期均2026-10-31 UTC。三单均经Human支付、只读查询确认PAID和固定金额；Apps由Human直接在内嵌卡片点击，AI未代点支付。
- 基础MCP和WebMCP重放原创建键均返回原单，无重复生单；真实WebMCP跨车STALE_CONTEXT拒绝、显式接续原车后成功、正常生单直达原订单、单订单分享页无车/订单列表导航已观察。真实Apps选行、生单、内嵌Human支付和Host收到显式分享请求已观察；分享目标最终打开、继续原车及重挂载恢复尚缺完整实际Host证据。验收后已通过Web确认入口恢复此前购物车`41c61adf-2bd1-4f93-89f7-8f2a1000f761`，未改其条目。
- 未在真实Host注入响应丢失；同键重放不是丢响应恢复验收。官方SDK替身已覆盖未知支付/原操作重试和重挂载，不能抵扣9.1真实Host缺口；后续仅补这些未完成场景，无需重复创建已支付主流程订单。
- 按Human反馈，Apps待支付/历史条目改链接并留间距、商品使用本地SVG示意、支付文案统一、成交金额移除预估提示，正常快照/重新载入提示与按钮移除；Web正常订单移除手动刷新，错误/未知恢复入口保留。冲突使用弹窗，说明草稿影响后显式刷新；稍后处理可重新打开。无新依赖或CSP放宽。
- 商品库存下方空白根因为`.product-card height:100%`，已删除。实际Host仍加载同URI旧CSS，测得301px空白；统一资源URI/构建文件升为v2后，Human明确确认「已消失了」，并要求后续视觉效果由Human查看验收，AI不再重复视觉检查。
- 验证：Apps官方SDK浏览器桌面/移动10/10通过（布局、图片、链接间距、冲突弹窗/刷新、未知支付恢复）；真实MCP只读资源/安全探测2/2通过，11资源与工具元数据URI一致；Apps typecheck/lint、API/Apps build通过。此前本增量Web导航回归24/24、控制器/共享呈现单元23项通过，Web build及lint通过；这些替身与构建证据均不冒称Human支付或真实Host异常恢复。聚焦自查，未新增独立Review声明。
- 最终资源`get-product-v2.html` SHA256：`d3bb46319b1285b77204092f8f47ec28c6b99fbe99f5784a6d17decc57853d6f`；API/Web lint、OpenSpec strict validate及diff检查通过。此增量为已授权UI/资源版本修复，未改变交易不变量，按局部风险采用聚焦自查、不追加阶段转换Guard；依既有连续提交授权提交，无Push/Merge。


### 共享按钮、报价卡片与间距收拢（2026-10-31）

- Human反馈Apps报价和生单按钮贴合，要求各页面统一复用。根因为Apps生单按钮未使用操作区，且两Host分别定义MoneyBreakdown/按钮/间距。现有commerce-ui新增共享样式导出与CommerceActions组件，Web/Apps消费同一规则，删除两端重复报价/操作区CSS；Apps Base UI按钮包装器与Web既有Button共享样式，保留特殊尺寸/变体能力。未新建框架或引入依赖。
- 购物车报价→生单→提示、订单主次操作、跨车确认、订单列表/评论/购物车未知恢复与错误重试统一操作区；Apps商品详情使用显式纵向间距。主要操作深色、次要操作描边；尺寸与间距约定只维护在Design及共享CSS。当前已挂载商品/车/订单页面在范围内，未接入旧流程不作为新验收入口。
- 自动验证：Apps桌面/移动10/10通过，新增实际几何断言确认报价到生单24px、按钮到说明12px、订单按钮间12px及主次背景。Web商品/购物反馈/导航回归36通过、8条件跳过（不计通过）；真实MCP只读资源/安全探测2/2通过。API/Apps build、各受影响包typecheck/lint及Web生产build通过；构建曾发现导入移动了use-client指令，已恢复文件首部并移除重复表达式后通过。
- 资源升级v3避免Host复用v2；本地服务按原环境更新，无支付/数据清理/迁移。视觉验收按Human明确要求由Human自行查看，不新增AI视觉检查或将自动化称为Human验收。聚焦自查，不冒称独立Review；9.1/9.3保持原未完成状态。依既有连续提交授权提交，不Push/Merge。
- 最终补齐错误恢复分支后，Web定向6/6通过，Web lint、Prettier、OpenSpec strict validate和diff检查通过；本地已提供v3购物车卡片供Human勾选后查看报价/按钮间距。

## 10. Web与Apps完整应用复用（Human已确认并授权实施）

- [x] 10.1 将Web商品/评论、车、订单列表/详情、基础控件/导航/样式/资源及交互协调迁入commerce-ui，注入请求/导航/存储；Web保留薄路由/首屏及WebMCP适配。验证：原Web流程回归，共享模块无Next依赖，两端同一控件和CSS入口。
- [x] 10.2 Apps通过Bridge/工具结果适配接入同一应用，删除旧View/购物Controller/独立CSS；保留原ID接续、APPS入口、UI专用支付及固定可信分享。验证：SDK替身覆盖完整流程、原键恢复/错误/错实体/重挂载，无网站HTTP和自动支付。
- [x] 10.3 完成共享/适配回归、两端构建和一次独立代码审查，记录真实结果与Host/Human验收缺口；不以自动化抵扣9.1/9.3。

### §10实施、审查与运行证据（2026-10-31）

- 文档整合：完整共享应用已融入Technical Design §1/§5/§7的正文、流程图与职责表，移除末尾补丁和仍指向独立Apps控制器/局部复用的当前描述；README、Product Design、CHECKOUT_CORE、MCP_CONNECT、DELIVERY_STATUS及本Change引用同步。T-11保留旧决策与明确限定替代，架构正文集中在Technical Design；本轮只更新文档，复用§10已有代码/运行验证，不重复业务测试，不修改历史归档或正式Spec验收状态。
- 沿用commerce-ui迁入Web现有页面、Hooks/Commands、基础控件、导航外壳和CSS；Web保留薄Next路由、SSR公开读取和WebMCP挂载。Apps删除997行购物Controller、独立View/CSS/按钮/图片组件，改为Bridge协议、工具投递/内嵌路由及sessionStorage适配。两端商品图仅从共享artwork.ts构建，旧Web重复SVG资源移除；依赖仅移动/声明仓库已使用版本，lockfile无包版本升级。
- 共享购物流程不依赖Next，HTTP与Bridge为实例级注入，不做跨Host共享React状态。初始化/生单使用APPS入口、支付仅UI专用apps_pay_order；工具投递只读恢复原ID。共享DeliveryCoordinator保护外部结果切换时的草稿/在途动作。相同保存版本的前台重读保留草稿而不误报冲突，不同版本仍显式刷新。
- 独立只读审查由/root/shared_app_review完成（HEAD 9ddad1f+本轮未提交Diff，含未跟踪文件）。确认完整共享结构，但发现5项：暂不可用清除原请求键、旧商品卡初始化/卡片映射恢复缺口、外部跨车投递丢草稿、同路由无法重试、分享未绑定原orderId。逐项核实修复；暂不可用与错误订单分享新增单测先明确失败再通过，旧材料迁移补对应单测，重挂载/同页重试/外部投递补SDK浏览器回归。修复后定向验证通过；未另声称有第二轮独立批准。
- 首次浏览器基线在旧Apps无法找到共享cart-page；新实现初轮数量保存用例出现焦点重读误报冲突，读取实际调用确认仅发生get_cart无写请求，修复共享Hook。最终Apps桌面/移动两轮28/28通过；最终生产构建全量受影响浏览器（acceptance-navigation、catalog、mcp-app）50/50通过。购物写入/支付均为接口或官方SDK Host替身，目录查询只读，不是Human支付/真实Host恢复验收。
- 默认pnpm test69通过、53环境依赖跳过（含16项Bridge适配/恢复单测）；API/共享包/Apps typecheck及Web构建TypeScript通过，各受影响包lint、Prettier、diff和OpenSpec strict validate通过。API与Apps生产构建通过；Next默认Turbopack两次因本机PostCSS子进程端口权限失败，使用next build --webpack生产构建成功，未改默认构建配置，不把Turbopack记为通过。额外React Hooks规则复核无Hook警告，Next专用img优化提示因共享本地SVG不引入Next运行时而保留。
- 正常依赖安装保持pnpm安全策略与安装脚本禁用，最终安全检查通过，836包均复用缓存、无下载；离线元数据不足与冻结锁文件不匹配的尝试未冒称成功，最终锁文件仅更新现有依赖归属。
- 原实施工作树启动器及本轮3104临时Web已停止；按原root .env及scripts/local.mjs start恢复Web3000/API3002。Web首页、API健康及Web代理健康均200；使用原凭证的真实MCP只读资源/拒绝探测2/2通过，11份静态资源/工具元数据均为v4。应用revision commerce-shared-v4；get-cart-v4.html SHA256为464017478ae6a5c0b36f0d3d921fb4e35b71d508f49b9448e326b40e7c7a7091。Host需刷新连接并重新发现/调用工具加载v4。未迁移/seed/清理或自动化真实购买。
- 复用既有交易核心/真实DB验证；本轮交易服务、schema和金额/库存事务无变化，API差异仅资源URI/文件名v4。未启动store_test集成服务，42项订单/WebMCP真实集成在只读检查轮按环境条件跳过，未计入50项通过。9.1/9.3保持未勾选，后续只补真实Host/Human缺口及正式Spec同步/归档。
- Git：当前codex/checkout-lifecycle-implementation。授权提交前Guard按shared-commerce-implementation、已验证/已审查且Human设计批准运行，实际BLOCKED仅因持久变更缺少checkpoint commit。Human随后明确回复「提交」，授权将完整共享应用及本文档整合作为同一审查单元提交；实际提交与提交后Guard结果由Git及交付对话核对。9.1/9.3未完成，不归档；原main保持7ec9aa2且干净，未Push/Merge。

## 11. 内嵌搜索与布局修订（2026-10-31 Human明确要求）

- [x] 11.1 共享runtime增加环境展示标记，Apps目录不渲染搜索/筛选表单并展示搜索结果；内嵌商品列表、详情、车/订单结算网格始终单栏。Web默认行为保持；无新增依赖、业务接口或交易变更。
- [x] 11.2 Apps SDK替身浏览器桌面/移动16/16通过，包含无搜索表单、商品结果可见与三类网格实际单栏断言；共享包/Apps typecheck、lint及Apps生产构建通过。首轮Chrome因沙箱权限无法启动，放宽执行沙箱后测试通过，不记首轮为功能失败或Human验收。资源同步升级v5避免Host复用旧UI。
- v5收尾：API生产构建、OpenSpec strict validate及diff检查通过；API构建会清除dist，按API→Apps顺序重建后，本地真实MCP只读资源/认证2/2通过，v5桌面/移动布局定向6/6通过。Web3000/API3002已用原环境配置重启；Host需刷新连接重新调用工具。无迁移、seed或真实购买写入。
- 本次为局部可逆UI调整，聚焦验证与自查，不触发交易Checkpoint Guard。真实Host视觉验收仍待Human；Human随后明确回复「提交」，授权提交本轮UI、资源版本、测试与Change记录。实际提交由Git历史核对；未Push、Merge或归档。
