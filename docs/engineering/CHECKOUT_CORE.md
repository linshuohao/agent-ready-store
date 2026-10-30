# 结算交易核心（实施分支）

本文件说明本轮已实现的共享用例及隔离验证方式。权威契约仍为 [checkout-lifecycle-redesign](../../openspec/changes/checkout-lifecycle-redesign/design.md)，进度和运行证据见同一 Change 的 [Tasks](../../openspec/changes/checkout-lifecycle-redesign/tasks.md)。这是不兼容旧购买 schema 的重构；Tasks 5.1 的普通 Web HTTP 适配已完成，页面及其余入口仍待 Tasks 5.2～7。旧交易 HTTP 返回 410 / CHECKOUT_FLOW_REPLACED，MCP 仅发现三个目录查询工具，旧交易调用同样拒绝。不要将本分支作为完整可购物交付部署。

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

`CartService` 是共享交易边界，输入均拒绝未知字段。通道是适配器参数 `WEB | MCP | WEBMCP | APPS`，不得从 JSON body 的 origin/aiEligible/price 派生。普通网页生单使用 WEB；MCP 服务工具使用 MCP；后续 WebMCP 专用同源路径使用 WEBMCP；Apps Bridge/工具专用路径使用 APPS。这个通道约定不是自然人或 AI 身份证明。只有 WEB 不享本单 AI 折扣，车的 agentCreated 不参与优惠。

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
