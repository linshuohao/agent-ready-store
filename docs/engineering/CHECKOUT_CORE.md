# 结算交易核心（实施分支）

本文件说明本轮已实现的共享用例及隔离验证方式。权威契约仍为 [checkout-lifecycle-redesign](../../openspec/changes/checkout-lifecycle-redesign/design.md)，进度和运行证据见同一 Change 的 [Tasks](../../openspec/changes/checkout-lifecycle-redesign/tasks.md)。这是不兼容旧购买schema的重构；交易核心、Web/MCP/WebMCP及Apps共享应用已实施，剩余真实Host/Human验收与正式Spec同步见Tasks 9.1/9.3。旧交易HTTP返回410 / CHECKOUT_FLOW_REPLACED；当前MCP工具及UI-only能力以[MCP_CONNECT](MCP_CONNECT.md)为准，不沿用旧工具清单或将实现完成当最终交付接受。

## 普通 Web HTTP 与 Next 代理

新接口统一使用 `/api/v1/shopping`，复用 `{ok,data|error,requestId}` envelope，成功与错误响应均 `Cache-Control: no-store`。成功包含同键恢复均返回200；已知业务错误保留400/404/409等状态，依赖失败返回503且不泄露内部异常。不签发或读取车Cookie、Review、旧Token；旧 `/api/v1/carts`、handoff、购买及order-link路径保持410，不能作为新接口别名。

| HTTP（相对新前缀） | 输入 / 用例 |
| --- | --- |
| `POST /carts` | getOrCreate输入；新建或按cartId恢复 |
| `GET /carts/:cartId` | get；不会隐式创建 |
| `POST /carts/:cartId/operations` | operate输入，必须携原operationRequestId |
| `POST /carts/:cartId/quote` | quoteSelection输入，无预留 |
| `POST /carts/:cartId/orders` | createOrder输入，返回原单和剩余车 |
| `GET /carts/:cartId/orders` | 可选查询offset、limit、pendingOnly=true/false；严格解析、拒绝重复/未知参数，默认/上界见共享用例 |
| `GET /orders/:orderId` | 可选查询cartId；携带时校验关联 |
| `POST /orders/:orderId/pay` | UI专用模拟支付；JSON `{}` 或 `{cartId}` |
| `POST /orders/:orderId/cancel` | 关闭原单；JSON `{}` 或 `{cartId}` |

本组创建、报价与生单固定由适配器派生 `WEB`，不从body/车来源推导AI资格。所有POST要求JSON且Origin等于配置的WEB_ORIGIN；未知字段、旧x-cart-token和非预期查询参数拒绝。UI专用仅为产品交互边界，不证明自然人身份，不新增Agent支付工具。

Next继续复用既有 `/api/v1/:path*` rewrite到服务端API_INTERNAL_URL，保留请求方法、JSON及Origin，无需新增代理业务代码。隔离验证Next端口3004 → API端口3003 → store_test；两端测试写请求的Origin均为API配置的 `http://localhost:3004`。`lifecycle-http.test.ts` 需要TEST_DATABASE_URL仅指向store_test、CHECKOUT_CORE_API_URL为本机3003或3004，且该API确实连接store_test。套件会重置测试库交易与库存，必须与其他破坏性DB套件串行运行；实际业务库不得作为代理目标。

## 共享用例与输入

`CartService` 是共享交易边界，输入均拒绝未知字段。通道是适配器参数 `WEB | MCP | WEBMCP | APPS`，不得从 JSON body 的 origin/aiEligible/price 派生。普通网页生单使用 WEB；MCP 服务工具使用 MCP；WebMCP 专用同源路径使用 WEBMCP；Apps Bridge/工具专用路径使用 APPS。这个通道约定不是自然人或 AI 身份证明。只有 WEB 不享本单 AI 折扣，车的 agentCreated 不参与优惠。

| 用例 | 输入及结果 |
| --- | --- |
| getOrCreate | `{cartId}` 只接续；或 `{requestId, initialItems:[{productId,quantity}]}` 原子初始化。Agent 通道不接受空条目；普通 Web 允许空车。浏览咨询不得调用创建分支 |
| get | cartId → 车 ID、版本、行、问题、有效待支付订单；没有业务 TTL、单个完成订单字段或自动建车 |
| operate | cartId + `{operationRequestId, expectedCartVersion, operation}`。operation 为 add_item / set_quantity（正数量）或 remove_item（无 quantity） |
| quoteSelection | cartId + `{selectedItems, constraints}` + 可信通道；只计算本次选中集合，不占库 |
| createOrder | cartId + `{requestId, expectedCartVersion, selectedItems, constraints}` + 可信通道 → `{order,cart}`；每个 selectedItems 元素为 `{productId,expectedQuantity}`，只断言整行数量，不拆分 |
| getOrder | orderId，可选 cartId；同时传入时必须关联同一车 |
| listOrders | cartId + `{offset?,limit?,pendingOnly?}`；默认20，最多100，稳定 createdAt/id 倒序，nextOffset 表示后页 |
| payOrder / cancelOrder | orderId，可选 cartId；返回原单当前事实。支付只给 UI，不注册为模型工具；调用失败恢复原单 |

`constraints` 必须含 `currency:'TWD'`，可含十进制两位金额 `maxTotal`；`items` 可逐项约束 `{productId,maxUnitPrice?,specs?}`，规格使用目录键和精确值。约束 ID 必须属于选中集合，重复/缺失/数量不符/预算或规格不符整笔拒绝。金额上限和规格不由最终支付兜底。

初始化键持久且全局去重，车操作键和订单创建键分别按 cartId 去重。恢复先检查请求指纹，返回原车当前内容/原单当前事实；不重放历史行、不续期。请求键、目标和未知标记应由调用方在发请求前保存。错误区分校验、版本冲突、请求键异载荷、目标缺失、预算/规格不符、配额和技术故障，不能静默换车重试。

OrderView 保存唯一明细/金额快照，状态为 CHECKOUT / PAID，关闭原因是 CANCELLED / EXPIRED。effectiveStatus 的派生到期且 closedAt 为空并不是已提交终态。navigation 同时包含 `/orders/{orderId}` 与 `?view=share`；后续分享 UI 限制导航及取消入口，不是数据权限隔离。

## 数据库与运行

新迁移仅能在旧 Cart/Order/PurchaseReview 均为空时应用，否则明确中止；不会自动清空旧交易或重置库存。真实环境停写、清理、SKU 核对及切换仍按 Tasks 8 单独授权。新数据产生后不可再次清理或回退到旧写服务。迁移保留 P008 负库存原值：负库存必须零预留，不可用于新订单。

`MAX_PENDING_ORDERS_PER_CART=10` 必须为正安全整数；下调不取消旧单，同键恢复不受额度限制。到期不占笔数配额，但尚未物化释放仍占库存。API 启动即补扫，每次扫描结束一秒后再扫，单批最多100笔，每单独立短事务；多实例按数据库行锁协调。单笔失败会记录日志并在后续扫描轮转后重试；非持久游标避免异常订单饿死后续批次，重启从头补扫，故障期间无5秒保证。

只读运维入口：`pnpm --filter @store/api metrics:checkout`。在同一只读可重复读事务中返回 Agent 建车、创建订单、有效待支付、物化关闭、PAID/收入、过期未关闭积压和最老超时，以及预留账实差异；不自动修复。`metrics:agent-carts` 保留独立创建事实口径，后续删空或普通车 AI 生单不修改归因。

隔离验证仅用 `TEST_DATABASE_URL` 指向 `/store_test`，串行运行 `pnpm test apps/api/test/cart/lifecycle-db.test.ts apps/api/test/inventory/inventory.test.ts --no-file-parallelism`。测试会删除该库交易和库存，禁止指向业务库。HTTP 退役验证另需指向测试库的 API，`CHECKOUT_CORE_API_URL=http://127.0.0.1:3003`，与该 API 匹配的 WEB_ORIGIN/MCP_SERVICE_TOKEN。跳过环境依赖测试不算通过。


## 普通 Web 购物车（Task 5.2）

`features/cart/lifecycle-commands.ts`提供无React请求/原键恢复，Provider仅维护跨页面车指针、车副本及车操作；`use-cart-page.ts`管理页面草稿、选择、请求代次与选中预估，`cart-orders.tsx`提供有界分页历史。沿用已有React/Context、共享展示组件与Next代理，无新状态库/依赖。

- localStorage的`store.currentCartId`定位持久车；`store.cart.initialize`和`store.cart.pending.{cartId}`在初始化/逐项写请求前保存原键、载荷和目标。未知保留，显式恢复沿原键；存储失败不发新写入，旧版本冲突不自动换版本重送。旧cartToken/Cookie及旧sessionStorage指针不导入新流程。
- 首次加购才建车，纯浏览/空车页零创建；原车存在订单后仍可继续加购。URL显示另一辆车不会覆盖已有当前指针，编辑受当前目标核对；完整本人跨入口确认接续仍属5.5。
- 车页首次全不选，提供全选和逐行选择；保存/移除按单行提交，Enter或失焦保存数量，非法草稿可恢复已保存量。连续单版本快照保留仍存在且数量相同的选择；跨越多个版本可能隐藏移出/重加，因此保守要求重新选择。显式重载也清空选择，新行不自动勾选。
- 前台刷新保护未保存草稿；在途返回先记录待校准，写入完成后再查询。车结果核对ID/version，报价核对完整选择与版本，不用迟到响应覆盖新状态。未知逐项操作用全局可见的原请求恢复入口，不由GET猜测写入是否执行。
- 生单使用5.1接口并提供原订单链接，空车仍显示待支付及所有历史订单。原创建请求在`store.order.create.{cartId}`发送前保存，未知恢复不会把另一份草稿清掉；统一订单页已在5.3接入；完整终态乱序协调及跨入口接续仍属5.4～5.5，不等于全部入口交付。
- 旧WebMCP的准备/编辑调用在Provider明确拒绝，专用新通道与PageTools迁移仍属6.3；旧Commands仅供尚未迁移的旧入口，不参与普通Web新车操作。

浏览器集成：`CHECKOUT_INTEGRATION=1 WEB_BASE_URL=http://127.0.0.1:3004 pnpm exec playwright test e2e/cart-lifecycle.spec.ts --workers=1`，测试Web必须代理store_test API3003且API的WEB_ORIGIN同为`http://127.0.0.1:3004`。这是自动化Chrome桌面/移动视口，不是真实Host/Human验收；测试以代理HTTP准备车、注入响应丢失/延迟，再通过真实核心验证结果。测试前可按已有测试重置方式只初始化store_test，严禁业务库。


## 普通 Web 订单页（Task 5.3）

`/orders/{orderId}`统一读取订单并展示固定商品/规格/数量/单价、金额分项、生单通道、AI资格、截止和当前状态。支付仅由UI按钮直接调用原orderId，不生成第二笔订单；取消只关闭原单且不自动回车。同车提供继续购物与分页订单导航，已支付可刷新重读。`SiteHeader`不再从订单URL推断cartId。

- 无React的`order-commands.ts`复用既有shoppingRequest；`use-order-page.ts`负责本页查询和动作状态，展示继续复用commerce-ui的金额组件，无新增依赖或金额算法。
- 请求前将orderId和pay/cancel保存在`store.order.pending.{orderId}`；未知只查原单，显式重试限原动作，存储不可用不发送。已确认快照不因后续404消失；本地到期只禁用新支付并查询，不当作已提交关闭。跨页迟到结果由共享OrderCommands保存，原目标终态协调及竞态验证证据见Tasks 5.4与§10，不因页面卸载丢失原操作结果。
- 同车多单导航已实现；其他车/无当前车不自动改指针。`?view=share`先隐藏来源车、其他单及取消，页头也不显示车导航；完整本人接续确认、分享集成及最终体验仍属5.5，尚未验收。
- 旧`/checkout/{cartId}`及`/order-details/{orderId}`只显示退出提示，不兑换fragment、不加载旧购买控制器。`/orders`动态参数仅作orderId查询，不按cartId映射；不存在时提供新流程提示及重查。旧控制器文件仍供后续迁移清理核对，不再由这些路由挂载。

浏览器回归：`CHECKOUT_INTEGRATION=1 WEB_BASE_URL=http://127.0.0.1:3004 pnpm exec playwright test e2e/order-lifecycle.spec.ts e2e/cart-lifecycle.spec.ts --workers=1`；环境同上，仅store_test。订单用例包含真实HTTP生单、UI支付/取消、同ID固定摘要、继续购物/多单、旧路由无写入、丢响应刷新、技术故障/存储失败、本地到期，以及取消未知/已支付后404两项回归。浏览器故障注入不替代共享核心已执行的真实PostgreSQL事务与竞态验证，也不代表真实Human点击验收。


## 订单恢复与上下文接续（Tasks 5.4～5.5）

`OrderMemory`的浏览器Provider持有按orderId隔离的`OrderCommands`查询副本与订阅，SSR无模块级交易状态。页面卸载只停止观察，不丢弃已发动作结果；晚到支付仍写入原单，不抢新页面。读取序号拒绝旧查询，已提交终态不回退，矛盾终态保留已知结果、停用动作并至多自动重查一次；派生/本地到期不是提交终态。刷新从原单与`store.order.pending.{orderId}`恢复，未知只查、重试限原操作。

创建请求由CartProvider协调同车在途状态；完成后通知当前车页重读恢复材料，`store.order.created.{cartId}`保留原单入口，包含离开后提前返回的顺序。通知不把旧Cart快照装进新草稿、不覆盖当前车、不导航。输入/创建请求键仍在写前保存。

本人订单无当前车时接续原车；同车继续购物；跨车先看单，点击接续再明确确认，确认时核对原指针和在途/草稿，保留另一车数据。单订单分享由显式链接打开，支付仍需点击；分享无车/兄弟单/取消入口、不自动采用原车，并隐藏全局车提示，刷新亦不改变指针。这是Demo展示约定，不是权限隔离。


## MCP / WebMCP 新订单入口（Tasks 6.1～6.3）

基础MCP的13项工具及Host接入见[MCP_CONNECT](MCP_CONNECT.md)。加购只改持久车，明确完整购买目标才调用create_order；服务端校验整行数量、版本、预算及规格，未知沿原请求键恢复。Agent目录没有支付工具，返回原orderId的网页入口，由Human在网页点击支付。协议测试不能证明模型不会遗漏自然语言目标，也不能代替Host/Human验收。

WebMCP在商品、目录、车及非分享订单页注册当前工具；初始化/生单通过专用WEBMCP入口，其余共享无React Commands。原请求保存入口通道，刷新重试仍用同键/同通道；同车在途、未保存草稿及版本冲突不会被工具绕过。加购默认展示车，购买的内部准备或明确留页用stayOnPage；生单成功默认直接导航原订单。仅打开页面和查询不写入、不导航。

pathname、目录查询条件和实体变化撤销旧句柄；迟到写入保存原结果，不抢回导航。目录搜索结果在layout阶段先交付，再注销旧工具，避免搜索本身返回失效错误。普通Web按钮生单始终使用WEB来源，即便该车由WebMCP建立，也不继承AI资格。无WebMCP浏览器保留普通Web操作，分享页不注册购物工具。

`e2e/webmcp.spec.ts`使用document.modelContext注册替身、真实隔离API和Chrome；覆盖零写、留页/导航、草稿、未知逐项写/生单刷新恢复、旧句柄、跨路由及同目录查询迟到响应、同单UI支付和来源隔离。旧purchase-webmcp的Review/材料测试已移除，由新生命周期场景替代；不是实际WebMCP Host或Human验收。

## 前端共享应用接入

Web和Apps消费同一commerce-ui页面、Hooks/Commands、控件与完整CSS入口，Web原feature路径为薄导出；源码职责和运行环境接口统一见[Technical Design §5.2](TECHNICAL_DESIGN.md#shared-commerce-application)。本文HTTP/工具契约仍由协议适配进入同一后端用例，不能在两端另写购物流程或前端计价。

Bridge将标准请求映射到APPS专用初始化/生单及UI专用支付工具，保留目标ID、版本和原请求键。暂不可用/未知结果不得映射为可清除未决材料的已知拒绝；卡片重挂载先恢复原位置与材料再读取。共享层承担草稿/跨车结果保护、同页重试和原订单终态协调。实际新增验证见Tasks §10，不将旧DB/Host证据算作本轮新验证。
