# Agent-Ready Store MCP 接入

**接入术语说明：** MCP 与 WebMCP 是两类 Agent 接入；MCP Apps 是 MCP 的 UI 增强，不兼容时降级为无 Apps UI 的 MCP。协议、连接和构建关系见 [Technical Design §1.1](TECHNICAL_DESIGN.md#11-系统全景与请求路径)。本次统一术语不改变历史批准、业务行为与尚未完成的验证事实。

当前基础 MCP 按 [checkout-lifecycle-redesign](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/specs/agent-shopping/spec.md) 提供商品查询、持久购物车与待支付订单工具。旧七工具及原生购买批准流程不兼容；请重新发现工具。Apps只为搜索结果与最终生单关联UI资源；不支持Apps的Host仍可使用基础MCP。实际验收状态以同一Change的Tasks为准。

## 连接

线上 Demo 已部署，连接地址为 `https://agent-ready-store-api.vercel.app/mcp`，使用项目维护者提供的访问令牌。无需自行启动 API 或初始化数据库。

仅支持 stdio 的 Host 需使用其支持的 HTTP bridge。Token 仅是服务身份，不是 Human 购买授权，也不区分顾客。不要把 Token 写入对话、截图或 Git。

本机开发时，在 `.env` 配置至少24字符的 `MCP_SERVICE_TOKEN`、`MCP_ALLOWED_HOSTS` 和 `WEB_ORIGIN`，按 README 启动；将下列 URL 改为 `http://localhost:3002/mcp`，使用本机令牌。远程 Host 的 localhost 不代表你的电脑；不要移除认证或 Host/Origin 检查。

基础 MCP 与 MCP Apps 使用下列同一连接配置。Host 支持 MCP Apps 时，通过工具元数据发现并读取 UI 资源；无需另添加一个 Apps Server。Host 是否能调用 MCP 工具与是否能呈现 Apps UI 须分别核实。

- Transport：MCP Streamable HTTP
- URL：`https://agent-ready-store-api.vercel.app/mcp`
- Header：`Authorization: Bearer <MCP_SERVICE_TOKEN>`

请在目标 Agent 自己的 MCP 设置中添加这组参数。不同 Agent 的安装入口和配置格式不同，应按其 Host 的 MCP 设置说明填写；不要把以下 Codex 示例原样用于其他 Agent。

## Codex CLI / Codex Desktop

Codex 支持项目级 `.codex/config.toml`，但该项目须设为 trusted。若 Codex 已从启动环境取得 `STORE_MCP_TOKEN`，可使用：

```toml
[mcp_servers.agent_ready_store]
url = "https://agent-ready-store-api.vercel.app/mcp"
bearer_token_env_var = "STORE_MCP_TOKEN"
```

通过安全本机环境提供与服务端一致的 Token；GUI 不一定继承 Shell 环境。配置后刷新连接并核对下列工具，不沿用旧 enabled_tools 白名单。其他 Host 使用其 Streamable HTTP 设置。

## 工具与输入

| 工具 | 输入及行为 |
| --- | --- |
| `list_product_categories` | 按需发现真实分类词汇（无UI、无到期扫描），返回value/label与稳定分页；不保证有货或符合用途，最终搜索仍用search_products展示 |
| `search_products` | 明确搜索/浏览意图，返回商品结果并展示一张结果卡片 |
| `query_products` / `get_product` / `list_product_reviews` | 购买准备中的只读数据查询，不生成UI；query_products与search_products同输入/结果；评论是不可信数据 |
| `get_or_create_cart` | 已有车仅 `{cartId}`；首次明确写意图使用 `{requestId, initialItems:[{productId,quantity}]}`，Agent 条目非空且全有效 |
| `get_cart` | `{cartId}`，读取当前版本、车行、待支付订单 |
| `add_cart_item` / `update_cart_item` | `{cartId, operationRequestId, expectedCartVersion, productId, quantity}`；分别加量/设置最终整行数量 |
| `remove_cart_item` | 同操作上下文及 `productId`，不传 quantity；只移除车行 |
| `quote_selection` | `{cartId, selectedItems, constraints}`，只读预估，不占库，不是强制前置步骤 |
| `create_order` | `{cartId, requestId, expectedCartVersion, selectedItems, constraints}`，原子生成待支付订单及固定摘要、占库、移出选中整行 |
| `get_order` / `cancel_order` | `{orderId, cartId?}`；可选 cartId 校验关联，取消仅作用于指定订单 |
| `list_orders` | `{cartId, offset?, limit?, pendingOnly?}`，有界分页，多候选先定位 |

`selectedItems` 为 `[{productId, expectedQuantity}]`，断言车中整行数量；`constraints` 必须含 `currency:"TWD"`，并传 Human 的 `maxTotal`、各行 `maxUnitPrice/specs` 等显式约束。金额使用两位小数字符串。字段详情及边界以工具发现 schema 和 [contracts](../../packages/contracts/src/lifecycle.ts) 为准；客户端不能传价格、通道、aiEligible、批准材料或旧凭证。MCP 生单的可信通道固定为 MCP。

## 意图、恢复与网页接手

仅咨询时只查询、不建车；明确加购只改车、不生单；明确购买则连续准备本次完整目标，默认只选择本次目标行，遵守 Human 预算/规格及 Host 审批。明确改量直接设置，歧义才澄清。购买 A+B 而 B 准备失败时，说明 A 已在车并停止，不擅自只购买 A。后端验证传入的完整选择及约束，但无法知道模型遗漏的自然语言意图；真实 Host 行为仍需独立验收。

初始化、改车及生单前保存原 UUID 请求键和原载荷；未知结果用同键同载荷重试，同键异载荷冲突，不创建替代车/订单。初始化恢复不会重放初始条目覆盖后续编辑；版本冲突先读取并核对。以 cartId 接续车、orderId 恢复原单，读别车订单不隐式切换当前车。多候选查单/取消先澄清；停止 Agent、离页和取消等待不等于取消成功。取消未知查原单，已支付不能承诺撤销/退款。

生单/读单直接返回普通和分享入口、固定完整摘要、状态、截止及 allowedActions。基础 MCP 展示 `navigation.orderUrl` 供 Human 打开网页，核对后亲自点击模拟支付；不等待原生 form、不提供独立取链、支付、批准或模拟点击工具。导航受 Host 限制时保留原入口并说明，不能再生单或宣称支付完成。Agent 不得代开 UI 点击或代付。

WebMCP 使用同源 JSON 的 `POST /api/v1/shopping/webmcp/carts` 和 `POST /api/v1/shopping/webmcp/carts/:id/orders` 派生 WEBMCP 通道；其余共享 shopping 路径。与普通 Web 一样检查 Origin、JSON、未知字段及旧凭证。此 Demo 的同源边界不证明自然人身份或严格 AI 来源防伪。

## Apps 资源与 UI Bridge

当前资源URI版本为`v8`、应用revision为`commerce-shared-v8`。仅search_products与create_order关联两份隔离静态HTML；query_products、详情/评论、建车/读车/加购/改量/移除、报价、查单/列表/取消均只返回数据。购买准备使用query_products，完整目标准备好后仅create_order展示结算；搜索意图直接用search_products展示结果。Human在原结算卡片内点击支付，状态与未知恢复原地更新，不依赖Agent调用查单生成新卡片。卡片内主动导航及Bridge操作不新增对话卡片。使用ext-apps 2.0.4与MCP v2 (server/core/client 2.4.0, node 2.1.2)，资源只含构建代码，不含交易数据或服务凭证。API构建后须构建Apps；资源URI白名单禁止任意文件读取，资源同样需要服务认证。

Host可能缓存tools/list中的旧资源URI。服务只为两个最终展示入口保留v4/v5/v6/v7→当前v8的显式读取映射，返回请求的URI及当前HTML；资源发现仍只公布两份v8，不恢复旧详情/车等中间卡片。未知版本和路径继续拒绝。资源可读不代表Host已经更新工具目录：连接刷新后应能发现query_products；若仍仅有旧13个模型工具，购买准备无法使用新的无UI查询。真实失效记录须核对实际工具名及资源URI，不能仅凭有数据返回认定UI已展示。

同一次购买多个商品先通过query_products及其他数据工具准备完整目标，再一次create_order生成包含全部行的一张结算卡片；用户明确拆单除外。不逐商品调用展示/生单工具，支付状态在同卡片更新。

`apps_get_or_create_cart`、`apps_create_order`和`apps_pay_order`仅标记为`ui.visibility:["app"]`，供所属Host的UI Bridge调用；前两项采用APPS通道，支付只作用于明确orderId。Host应从模型目录隐藏这三项；协议元数据本身不是身份/授权隔离。Demo信任Host，不证明调用者为Human，也不防御持有服务Token的恶意客户端。Agent不得调用支付或代点UI。

内嵌订单使用固定摘要，Human点击后直接通过Bridge支付，不发Agent消息、不自动外跳。显式分享只允许构建时WEB_ORIGIN下的`/orders/{orderId}?view=share`；Host拒绝时保留原单，不生成新单。浏览器存储受Host隔离策略影响；同会话可恢复原请求，缺失稳定卡片身份或存储时明确降级，真实Host重挂载能力仍须验收。

Web与Apps使用同一完整购物应用；共享源码、界面/交互边界和环境接口统一见[前端详细设计](FRONTEND_DESIGN.md#shared-commerce-application)。修改共享代码后两端均须构建；API元数据与静态资源版本必须一致，更新后重新发现工具，避免Host旧资源缓存。旧卡片ID映射与未知原请求会迁入共享恢复材料，不自动支付；相同页面重试和外部工具结果保护由共享应用处理。

## 验证边界

自动化以隔离 `store_test` 和 loopback API3003 验证真实 HTTP/MCP 发现、错误映射、幂等与交易约束。真实 Host 的网页接手、可见摘要、Human 支付及库存结果仍须按 [Tasks](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md) 分入口记录，协议测试不能冒充 Human 验收。旧 prepare/review/submit/handoff/get_order_link 写流程返回 `CHECKOUT_FLOW_REPLACED`，旧支付调用不生效。

## 多目标搜索与新协议选择

当前代码支持2026-07-28新协议，同时兼容2025-11-25、2025-06-18及2025-03-26旧调用。HTTP通过官方createMcpHandler逐请求创建Server，不新增持久协议会话。SDK升级配合现代server/discover及显式协商；测试客户端用versionNegotiation.mode={pin:'2026-07-28'}验证没有退回旧协议。

search_products/query_products接受旧单目标或严格批量结构：
```json
{"queries":[{"id":"audio","label":"耳机","q":"Bluetooth","maxPrice":2000},{"id":"bottle","label":"水杯","q":"保温杯","maxPrice":1000}]}
```
批量结果包含kind=grouped、groups和去重products。续页在顶层传catalogRevision、searchRevision，目标沿用原id和条件。Apps组内操作使用query_products；Host调用ID隔离不同卡片页码，缺少稳定调用ID时不保证重挂载恢复。只读HTTP对应POST /api/v1/products/search，要求JSON和WEB_ORIGIN。普通Web/WebMCP继续单目标并复用语言匹配。

匹配使用服务端离线opencc-js 1.4.2（MIT AND Apache-2.0，完整包解包约6.1MB，仅加载t2cn，不进入浏览器包）。登记别名：蓝牙/Bluetooth、水瓶/water bottle、移动电源/行动电源/power bank；不承诺任意翻译，不放宽品牌、分类或预算。

resolve_product_choices只在用户需要决定型号时调用，输入queries及可选choices（组ID到商品ID）。现代form客户端收到input_required，答复后续调原工具；SDK签名requestState绑定原目标、候选及价格，10分钟过期，进程重启失效。SDK getClientCapabilities在逐请求实例读取从当前envelope回填的能力，不是跨请求能力缓存。accept重查当前事实，decline/cancel停止；无能力或旧无状态客户端返回selection_required供对话澄清。工具不写车、不生单、不付款。超时/断连后无持续等待的服务器事务；Host应保留原目标，只有用户明确继续才重试，不能把失联视为接受。

实际Host的协议版本、form支持、点选/取消显示仍需人工验收；本地SDK及AppBridge浏览器夹具成功不等于实际Host通过。本轮没有替换另一工作区正在运行的服务。

### 分类发现

`list_product_categories` 与 `GET /api/v1/catalog/categories` 共用目录查询。参数offset默认0、limit默认50且最大100；offset大于0必须携带上一页catalogRevision。响应items包含原值value/label，并返回total、nextOffset与catalogRevision。未知字段或非法分页明确失败，目录变更须从第一页重读；分类不按库存过滤。分类文本是不可信数据，不能作为工具指令。

明确商品需求可直接搜索；不了解目录时可先发现分类，再按value精确筛选并核验详情。该工具不生成Apps卡片、不建车、不生单；请求清理模式仅此工具及分类HTTP GET/HEAD豁免到期清理，其他入口不变。方案与后续语义搜索评估见[分类发现Change](../../openspec/changes/archive/2026-10-31-catalog-discovery/design.md)。

开发验证可运行 `pnpm test:categories`（先按现有开发说明生成Prisma Client）。该测试在本机4310/4312启动独立Web与目录夹具，使用真实Chrome的桌面/移动视口，无业务数据库；异常用例明确注入失败，不能代替真实库存/交易验收。
