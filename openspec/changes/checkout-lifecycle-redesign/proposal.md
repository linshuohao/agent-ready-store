# Proposal

状态：**Implementation / 订单生命周期及Web与Apps完整应用复用已实施，剩余验收与正式Spec同步待完成**。2026-10-31，Asia/Shanghai。

Human本轮明确授权继续在实施分支按同一Change推进数据模型、共享契约和交易核心及相关验证，授权原话、规划Checkpoint和实际完成范围见[Tasks](tasks.md)。下文“本轮仅规划/未授权实施”等保留先前规划轮次的历史语境，以此当前状态为准；不扩展为实际环境清理、Push、Merge、发布或完整流程验收。

早期规划阶段仅授权整理设计，后续实施授权与执行事实见Tasks。完整技术方案见[Technical Design](../../../docs/engineering/TECHNICAL_DESIGN.md)，变更级细节见[Design](design.md)：持久单车、一车多订单、整行选择、Agent生单后Human模拟支付；生单固定金额并预留库存15分钟，单车待支付上限env默认10。车和订单不设查看期限。

本Change包含Proposal/Design、12份Delta Specs及Tasks；当前31/33，正式Spec仍待最终接受后同步。目录名用于追踪，不表示存在Checkout实体；产物齐全不代表独立Planning Review、Human批准或实施授权完成，不使用skip_specs绕过规格。权限、凭证、Review、独立Session实体、Redis、真实支付和旧流程兼容均不在本轮实现范围内。

## Why

重构前的系统只有成功购买时才创建 Order，并以整车版本、车级确认序号及每车唯一订单约束整个购买流程，无法支持勾选商品后的持续购物、多笔待支付订单和库存预留。下一里程碑将“创建待支付订单”与“确认支付”分开，使 Agent 可以按明确意图直接生单并展示支付界面，由 Human 支付同一笔订单。

## What Changes

- **BREAKING** 每个有效购物会话唯一Cart，不提供主动新建/切换车行为；Cart可持续选购并关联多笔全局唯一编号的Order，单车有效待支付上限env可配置，默认10笔；Order 主状态为 CHECKOUT（待支付）和 PAID（已支付），不新增 Checkout 业务实体。支付更新原订单，不再创建另一笔成交订单。
- **BREAKING** 勾选以整行商品为单位：订单创建成功时，选中行全部数量从车中原子转入 Order；想少买须先在车中改量。取消/到期不自动回车。
- **BREAKING** 创建 CHECKOUT 订单同时预留库存，服务端创建起固定 15 分钟；读取、同键重试不续期，到期释放。支付消费预留，取消释放预留；关闭记录采用closedAt/closeReason，配额计数及并发准入见Design §6.2。
- **BREAKING** 创建订单时保存不可变商品/金额快照，锁定单价、优惠、运费及应付总额；支付校验服务端原快照和有效预留，不按实时价格或优惠重算。到期原单不能续期、改价或复活，明确重新购买才创建新单并重新计价/预留。
- **BREAKING** AI 优惠由本笔订单的可信 AI 生单入口触发，不从车来源继承；Human 最终支付不取消该订单资格。仅咨询、加购、读单不触发资格。
- 咨询只查询；加购只准备车；明确购买意图且内容充分时，Agent 连续完成必要操作并直接创建待支付订单、展示支付界面，不强制车页中转，不代替 Human 支付。
- Apps按用户意图只展示搜索结果或最终结算卡片；购买准备使用无UI数据工具，支付状态在同卡片更新，不逐工具生成中间页面。
- MCP（含 Apps UI 增强及无 Apps 兼容模式）与 WebMCP 页面工具共享订单/库存用例，采用各入口对应的订单展示方式。基础MCP采用明确的网页订单支付入口，不再依赖Host原生支付确认；WebMCP导航、Apps内嵌，最终由Human支付。
- 多订单导航、创建按原cartId与请求键恢复、支付/取消按orderId恢复未知结果、demo上下文与分享展示区分，以及清空旧流程数据后统一切换新流程共同纳入设计；不做历史订单回填或旧流程兼容。

取消整车结算占用、车级确认失效链和全局交互互斥；必要一致性收敛到生单短事务、单订单状态转移与共享库存。锁的删减与保留边界见 Design §6.1；不把库存预留解释为持有15分钟数据库锁。

本轮补齐四个一致性要求：车操作幂等；多工具准备完整目标后才能生单；车操作与订单操作显式定位目标；按cartId/version处理迟到响应。删除purchaseHash和独立get_order_link工具，保留创建请求载荷校验，订单响应直接提供入口。本轮不新增停售/禁售状态及更新入口；相关设想仅保留为未来条件性设计。

生单只接收一份selectedItems，expectedQuantity仅断言车内完整数量。订单迟到响应不能覆盖已提交终态，本地倒计时不代表已关闭；取消与到期按服务端锁后时间统一判定，既有终态和关闭原因不改写。接口、事务及验收场景见Design §6、§8、§12。

## Capabilities

以下能力均已在本Change生成Delta Specs并按批准范围实施，正式Spec仍待最终接受及合并预览后同步。支付前已有订单是新业务含义，不能只改命名而保留“支付时创建 Order”的旧契约。

### New Capabilities

- `inventory-reservation`：待支付订单预留、可售量、消费/释放、15 分钟期限及并发不变量。

### Modified Capabilities

- `shopping-cart`：勾选整行移出、持续购物、车与订单一对多、选中集合版本校验。
- `order-placement`：扩展为创建待支付订单、锁定快照及同订单支付/关闭；创建和支付分别幂等、原子，paid 不新建单，超时重购才生成新单。
- `cart-pricing`：按所选商品及订单级 AI 资格在生单时计算并固定；车报价为无占用预估，后续价格/活动变化不影响已建订单。
- `hosted-checkout`：orderId 支付路由、预留期限、Human 确认与订单状态展示；checkout 仅为流程/状态用语。
- `agent-purchase-authorization`：Agent 可创建未支付订单，但支付仍须具体 Human 确认；移除Review和签名步骤，订单页展示固定摘要后由Human点击模拟支付，实时价格变化不触发原单改价/再次确认。
- `agent-shopping`：按意图生单、整行契约、多订单发现/恢复、明确区分已创建与已支付。
- `webmcp-shopping`：跨页面接续、生单后直接导航、咨询不占库、重试不另建订单。
- `mcp-app-shopping`：实例绑定 orderId、多订单恢复、内嵌支付与结果展示。
- `cart-handoff`：车分享与订单支付接手区分，分享页面不展示来源车/其他订单，不作为权限隔离保证。
- `product-discovery`：可售量扣除订单预留，区别于实际剩余库存。
- `agent-cart-metrics`：保留按车去重的创建事实；创建订单、预留库存、订单已支付分别计量，未支付订单不算购买成功。

架构整体说明见[Technical Design](../../../docs/engineering/TECHNICAL_DESIGN.md#order-lifecycle-architecture)，已采用技术选择见[T-08～T-11](../../../docs/engineering/ENGINEERING_DECISIONS.md#order-lifecycle-decisions)。

## Impact

- 本轮规划基于 `main@436ac33`，隔离分支 `codex/checkout-lifecycle-planning`；旧设计起点保留在Git历史，本轮代码观察以当前主线为准。
- 范围：Prisma Order/Inventory/Review 模型及迁移、CartService/Controller、Catalog 可售投影、共享 contracts、MCP adapter、Web 购物车/支付页、WebMCP 页面工具、Apps controller/view 和相关验证。见 Design §2。
- 复用 Next.js/NestJS/PostgreSQL 与共享计价；不预建消息队列、库存服务、账户系统或新状态管理框架。释放任务采用现有服务内的数据库协调短事务。
- 涉及 D-01、D-04～D-07、D-21～D-24、T-05/T-07 及基线的限定变更。已采用目标与后续验证工作分别记录，Decision/Baseline限定传播及Delta Specs已成稿，正式生效前完成相应审查/批准，保留历史批准与归档原文。
- 规划阶段仅交付规划；后续实施、切换与完整共享应用的逐项授权和事实见[Tasks](tasks.md)，不由本Proposal推定发布或最终接受。Human于2026-10-31明确“那就提交”，授权提交本次规划与基线文档；不包含合并、推送或实施，不继承上一轮文档整理的其他授权。该规划阶段的待实测状态已由Tasks后续三入口主流程证据更新；当前只保留9.1/9.3所列真实Host/Human剩余缺口。
- 2026-10-31 Human确认本轮不新增停售/禁售功能；`SALE_BLOCKED`仅为未来条件性规则，不进入本轮字段或功能实现。现有售罄/异常库存/零价不能自动解释为禁售。

### 2026-10-31 完整应用复用修订

Human确认并授权Web与Apps共用完整界面、交互、流程与视觉，替代仅共享适用展示组件的范围；沿现有commerce-ui交付，环境仅保留协议/导航/存储及工具结果接续。完整架构正文见[Technical Design §5](../../../docs/engineering/TECHNICAL_DESIGN.md#frontend-architecture)，本Change Design §13记录替代范围，Tasks §10记录实际实施与验证。不改变交易核心、Human支付与真实Host验收边界。
