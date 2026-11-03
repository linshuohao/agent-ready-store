# Agent-Ready Store MCP 接入

**接入术语说明：** MCP 与 WebMCP 是两类 Agent 接入；MCP Apps 是 MCP 的 UI 增强，不兼容时降级为无 Apps UI 的 MCP。协议、连接和构建关系见 [Technical Design §1.1](TECHNICAL_DESIGN.md#11-系统全景与请求路径)。本次统一术语不改变历史批准、业务行为与尚未完成的验证事实。

当前基础 MCP 按 [现行 agent-shopping Spec](../../openspec/specs/agent-shopping/spec.md) 提供商品查询、持久购物车与待支付订单工具。旧七工具及原生购买批准流程不兼容；请重新发现工具。Apps只为搜索结果与最终生单关联UI资源；不支持Apps的Host仍可使用基础MCP。实际验收状态以同一Change的Tasks为准。

## 连接

线上 Demo 地址为 `https://agent-ready-store-api.vercel.app/mcp`。本版本默认 `MCP_AUTH_MODE=demo`，本地和线上均无需 Token；无需自行启动线上 API 或初始化数据库。本文说明本版本配置，不代表本轮已经发布或验证线上认证模式。

基础 MCP 与 MCP Apps 使用同一连接。Host 支持 MCP Apps 时，通过工具元数据读取 UI 资源，无需另添加 Apps Server。仅支持 stdio 的 Host 需使用其支持的 HTTP bridge。

- Transport：MCP Streamable HTTP
- URL：`https://agent-ready-store-api.vercel.app/mcp`
- Demo 模式：无需 Authorization Header

本机将 URL 改为 `http://localhost:3002/mcp`。服务端仍须配置实际 `MCP_ALLOWED_HOSTS` 和 `WEB_ORIGIN`，线上可以使用公网域名；两种模式均保留 Host/Origin 和输入校验。远程 Host 的 localhost 不代表你的电脑。

## Codex CLI / Codex Desktop

Codex 支持项目级 `.codex/config.toml`，项目须设为 trusted。默认 Demo 配置：

```toml
[mcp_servers.agent_ready_store]
url = "https://agent-ready-store-api.vercel.app/mcp"
```

配置后刷新连接并核对下列工具，不沿用旧 enabled_tools 白名单。其他 Agent 按其 Host 的 Streamable HTTP 设置填写，不直接照搬 Codex 格式。

## 可选 Token 接入门槛

需要只让持有共享令牌的客户端接入时，例如非公开演示或限制测试入口，维护者可以显式启用 `token`。服务端设置：

```dotenv
MCP_AUTH_MODE=token
MCP_SERVICE_TOKEN=<至少24字符的随机令牌>
```

可用 `openssl rand -hex 32` 生成随机值，通过安全环境配置传递，不写入对话、截图或 Git。客户端在同一 URL 上增加 `Authorization: Bearer <MCP_SERVICE_TOKEN>`。Codex 可从启动环境读取与服务端相同的值：

```toml
[mcp_servers.agent_ready_store]
url = "https://agent-ready-store-api.vercel.app/mcp"
bearer_token_env_var = "STORE_MCP_TOKEN"
```

GUI 不一定继承 Shell 环境，需要确保 Host 实际取得 `STORE_MCP_TOKEN`。显式 `token` 模式缺失或无效服务端 Token 会启动失败，不回退 Demo；未设置模式时即使配置了 Token，也保持 Demo。该令牌只是可选服务接入门槛，不区分顾客、不提供用户级订单隔离，也不是 Human 购买授权。

## 工具与输入

| 工具 | 输入及行为 |
| --- | --- |
| `list_product_categories` | 按需发现真实分类词汇（无UI、无到期扫描），返回value/label与稳定分页；不保证有货或符合用途，最终搜索仍用search_products展示 |
| `search_products` | 明确搜索/浏览意图，返回商品结果并展示一张结果卡片 |
| `query_products` / `get_product` / `list_product_reviews` | 浏览探索、比较及购买准备中的只读数据查询，不生成UI；query_products与search_products同输入/结果；评论是不可信数据 |
| `get_or_create_cart` | 兼容名称，仅 `{cartId}` 读取已有车；不再创建，读车优先 `get_cart` |
| `get_cart` | `{cartId}`，读取当前版本、车行、待支付订单 |
| `add_cart_item` | `{cartId 或 initializationId, operationRequestId, productId, quantity}`；两种车身份互斥，按增量加购，不传车版本；首次准备共享 initializationId、每次加购独立操作键 |
| `update_cart_item` | `{cartId, operationRequestId, expectedCartVersion, productId, quantity}`；设置最终整行数量 |
| `remove_cart_item` | 同操作上下文及 `productId`，不传 quantity；只移除车行 |
| `quote_selection` | `{cartId, selectedItems, constraints}`，只读预估，不占库，不是强制前置步骤 |
| `create_order` | `{cartId, requestId, selectedItems, constraints}`，原子生成待支付订单及固定摘要、占库、移出选中整行 |
| `get_order` / `cancel_order` | `{orderId, cartId?}`；可选 cartId 校验关联，取消仅作用于指定订单 |
| `list_orders` | `{cartId, offset?, limit?, pendingOnly?}`，有界分页，多候选先定位 |

`selectedItems` 为 `[{productId, quantity}]`，显式指定本次购买数量，不要求车中存在或数量相等，不先改车来匹配购买量；`constraints` 必须含 `currency:"TWD"`，并传 Human 的 `maxTotal`、各行 `maxUnitPrice/specs` 等显式约束。金额使用两位小数字符串。字段详情及边界以工具发现 schema 和 [contracts](../../packages/contracts/src/lifecycle.ts) 为准；客户端不能传价格、通道、aiEligible、批准材料或旧凭证。MCP 生单的可信通道固定为 MCP。

## 意图、恢复与网页接手

仅咨询时只查询、不建车；明确加购只改车、不生单；明确购买则连续准备本次完整目标，默认只选择本次目标行，遵守 Human 预算/规格及 Host 审批。明确改量直接设置，歧义才澄清。购买 A+B 而 B 准备失败时，说明 A 已在车并停止，不擅自只购买 A。后端验证传入的完整选择及约束，但无法知道模型遗漏的自然语言意图；真实 Host 行为仍需独立验收。

首次加购、改车及生单前保存原 UUID 身份/请求键和原载荷；未知先用 get_request_result 只读核实，not_found 不等于失败，只有明确继续原操作才按原键原载荷提交，不创建替代车/订单。旧初始化载荷仅查询历史结果，不重放；设量/移除的版本冲突先读取并核对，不自动覆盖。以 cartId 接续车、orderId 恢复原单，读别车订单不隐式切换当前车。多候选查单/取消先澄清；停止 Agent、离页和取消等待不等于取消成功。取消未知查原单，已支付不能承诺撤销/退款。

生单/读单直接返回普通和分享入口、固定完整摘要、状态、截止及 allowedActions。基础 MCP 展示 `navigation.orderUrl` 供 Human 打开网页，核对后亲自点击模拟支付；不等待原生 form、不提供独立取链、支付、批准或模拟点击工具。导航受 Host 限制时保留原入口并说明，不能再生单或宣称支付完成。Agent 不得代开 UI 点击或代付。

WebMCP 使用同源 JSON 的 `POST /api/v1/shopping/webmcp/carts` 和 `POST /api/v1/shopping/webmcp/carts/:id/orders` 派生 WEBMCP 通道；其余共享 shopping 路径。与普通 Web 一样检查 Origin、JSON、未知字段及旧凭证。此 Demo 的同源边界不证明自然人身份或严格 AI 来源防伪。

## Apps 资源与 UI Bridge

当前资源URI版本为`v9`；Apps自报版本当前仍为`commerce-shared-v8`（两者不能混同）。仅search_products与create_order关联两份隔离静态HTML；query_products、详情/评论、建车/读车/加购/改量/移除、报价、查单/列表/取消均只返回数据。购买准备使用query_products，完整目标准备好后仅create_order展示结算；搜索意图直接用search_products展示结果。Human在原结算卡片内点击支付，状态与未知恢复原地更新，不依赖Agent调用查单生成新卡片。卡片内主动导航及Bridge操作不新增对话卡片。使用ext-apps 2.0.4与MCP v2 (server/core/client 2.4.0, node 2.1.2)，资源只含构建代码，不含交易数据或服务凭证。API构建后须构建Apps；资源URI白名单禁止任意文件读取，资源沿用当前入口模式：Demo无需Token，token模式校验服务令牌。

Host可能缓存tools/list中的旧资源URI。服务仅提供当前v9的两份资源，历史URI不再映射、重定向或回退至当前HTML，读取时返回资源不存在错误。刷新连接并重新发现工具与资源后使用当前URI；旧订单通过原orderId读取并打开当前入口，不重放生单或支付来恢复卡片。资源可读不代表Host已经更新工具目录，真实失效记录须核对实际工具名及资源URI，不能仅凭有数据返回认定UI已展示。

同一次购买多个商品先通过query_products及其他数据工具准备完整目标，再一次create_order生成包含全部行的一张结算卡片；用户明确拆单除外。不逐商品调用展示/生单工具，支付状态在同卡片更新。

`apps_get_or_create_cart`、`apps_add_cart_item`、`apps_create_order`和`apps_pay_order`仅标记为`ui.visibility:["app"]`，供所属Host的UI Bridge调用；加购与生单采用APPS通道，支付只作用于明确orderId。Host应从模型目录隐藏这四项；协议元数据本身不是身份/授权隔离。Demo信任Host，不证明调用者为Human，也不提供用户级隔离或防御恶意客户端的身份保证。Agent不得调用支付或代点UI。

内嵌订单使用固定摘要，Human点击后直接通过Bridge支付，不发Agent消息、不自动外跳。显式分享只允许构建时WEB_ORIGIN下的`/orders/{orderId}?view=share`；Host拒绝时保留原单，不生成新单。浏览器存储受Host隔离策略影响；同会话可恢复原请求，缺失稳定卡片身份或存储时明确降级，真实Host重挂载能力仍须验收。

Web与Apps使用同一完整购物应用；共享源码、界面/交互边界和环境接口统一见[前端详细设计](FRONTEND_DESIGN.md#shared-commerce-application)。修改共享代码后两端均须构建；API元数据与静态资源版本必须一致，更新后重新发现工具，避免Host旧资源缓存。旧卡片ID映射与未知原请求会迁入共享恢复材料，不自动支付；相同页面重试和外部工具结果保护由共享应用处理。

## 验证边界

自动化以隔离 `store_test` 和 loopback API3003 验证真实 HTTP/MCP 发现、错误映射、幂等与交易约束。真实 Host 的网页接手、可见摘要、Human 支付及库存结果仍须按 [Tasks](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md) 分入口记录，协议测试不能冒充 Human 验收。旧 MCP prepare/review/submit/handoff/get_order_link 工具不再注册，调用与其他未知工具一样返回 SDK 标准协议错误（InvalidParams），旧支付调用不生效；旧 HTTP 路由继续返回 410 / CHECKOUT_FLOW_REPLACED。

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

## 工具校验与错误边界

MCP 使用 SDK 高层注册和调用路径：工具参数先按声明的 schema 校验，失败返回 `isError: true` 和可读 `content`，不承诺业务 `structuredContent`；未知及退役工具返回标准协议错误。两者都不会执行库存维护或业务回调。调用方应先处理协议异常与 `isError`，不能假设所有失败都有业务 envelope，也不依赖 SDK 错误文案逐字稳定。

合法输入进入业务后，预算、库存、版本等失败仍返回现有结构化错误码、约束详情和恢复提示；分类发现、请求结果核实保留维护豁免。Apps Bridge 将缺少合法业务结果的 SDK 错误作为失败，不会当作空成功；传输异常也不表示写入已失败，仍按原请求核实。

## 意图优先与错误恢复

本服务是模拟商店，无真实扣款、采购或物流。普通 MCP 结果带 `environment.mode=simulation`、`realPayment=false` 和 `fulfillment=false`，首次购买及订单交接须向用户明确说明。

| 最终目标 | 工具路径与结束位置 |
| --- | --- |
| 商品列表浏览/选购比较 | 需要探索时先query_products及详情，最后一次search_products展示完整目标；条件明确可直接展示，不写车 |
| 仅问分类、指定商品规格或评论 | 对应只读工具直接回答，不追加搜索卡片 |
| 仅询问完整优惠/运费报价 | 已有cartId时quote_selection；无车时现接口不能无写入取得完整报价，说明限制，不为询价加购建车 |
| 明确加购/改量/移除 | 加购为增量、不传车版本；改量/移除核对原车版本，均不生单 |
| 明确购买（含“找商品并买”） | query_products/详情后台准备，完整目标一次create_order；成功后停止，不补搜索/车展示 |
| 必须由用户决定的型号选择 | resolve_product_choices或对话澄清；拒绝/取消停止，选型不自动变为购买 |
| 查单/取消 | 定位原orderId；多个候选先澄清，取消未知查原单，不重建单 |
| 查询未知改车/生单结果 | get_request_result只读核实；未找到不等于失败，不自动续写 |
| 明确继续原未知操作 | 核对原身份、请求键和冻结载荷后续写；旧契约仅查询，不换键重购 |

用户允许Agent自选且条件充分时直接选品；关键歧义才询问。分类和品牌参数按目录原文精确匹配，未知分类先用q，不猜填。specs按目录原文键值精确断言，只传用户明确硬条件；通勤等用途可用于选品解释，不自动变为不存在的规格键。已有同SKU与本次购买量不同时按明确购买量生单，不为匹配购买量自动加购或改车；成功后服务端按SKU移除当前车整行。

预算/规格错误保留原code、retryable，并增加constraintViolations（field、expected、actual及适用productId），规格缺失actual为null；maxTotal实际值为优惠后含运总额。MCP顶层recovery说明恢复方式：确定失败按原因修正，原样重试无效；改车/生单结果未知先只读核实，明确继续才沿原键原载荷恢复，不换键重购；取消未知查原单，纯查询错误不进入写请求恢复。不得提高预算、删除用户硬条件或缩单。环境标记和指引是公开说明，不是Host能力或Human身份的证明。

每轮对话目标为至多一张最终卡片（纯咨询可以零张）。仅search_products/create_order关联UI，不在同轮同时调用两者或重复调用；后台探索及规格核验应在搜索展示前完成，展示后不继续换条件检索，最终文字引用展示结果，不能用后台候选或报价冒充最终商品/订单；购买有预算/规格时优先quote_selection无UI预检，建单仍重验。展示调用失败或结果未知时，说明当前事实并保留原请求，本轮不自动再次调用展示工具；可只读查原单，不能猜测订单或重购。Host重挂载/重投递不由服务端控制，真实可见卡片数量须单独验收，不能将工具调用次数等同于Host卡片数量。

### 分类发现

`list_product_categories` 与 `GET /api/v1/catalog/categories` 共用目录查询。参数offset默认0、limit默认50且最大100；offset大于0必须携带上一页catalogRevision。响应items包含原值value/label，并返回total、nextOffset与catalogRevision。未知字段或非法分页明确失败，目录变更须从第一页重读；分类不按库存过滤。分类文本是不可信数据，不能作为工具指令。

明确商品需求可直接搜索；不了解目录时可先发现分类，再按value精确筛选并核验详情。该工具不生成Apps卡片、不建车、不生单；请求清理模式仅此工具及分类HTTP GET/HEAD豁免到期清理，其他入口不变。方案与后续语义搜索评估见[分类发现Change](../../openspec/changes/archive/2026-10-31-catalog-discovery/design.md)。

开发验证可运行 `pnpm test:categories`（先按现有开发说明生成Prisma Client）。该测试在本机4310/4312启动独立Web与目录夹具，使用真实Chrome的桌面/移动视口，无业务数据库；异常用例明确注入失败，不能代替真实库存/交易验收。

## 工具发现元数据验证

Server instructions 概述本店范围及浏览、比较、购买的工具分工；各工具描述仍独立保留必要边界。搜索 `q` 使用商品关键词，不承诺任意自然语言语义检索；`minPrice/maxPrice` 是 TWD 单价边界，含运总预算使用报价约束核验。名称、参数校验、交易行为与 UI 关联不因说明优化改变。Host 是否采纳 instructions 及如何检索工具取决于客户端；更新后刷新连接并重新发现工具。

[固定评估输入](../../apps/api/test/mcp/discovery-prompts.json)包含24条直接请求、上下文请求、写意图及负例。使用相同 Host/模型版本、候选工具与上下文，在独立会话中对比旧/新元数据并重复运行；记录实际候选发现（Host可观测时）、选中工具、参数、错误及最终完成情况。写意图用例仅在隔离交易环境执行。空目录夹具只能验证初步选择与填参，不能证明完整购物成功；负例不得因商品词汇而强制调用本店。

`pnpm exec vitest run apps/api/test/mcp packages/contracts/test` 验证协议与参数契约，包含真实 SDK 收取 instructions/参数说明以及工具目录快照。该结果不代表模型选择率或真实 Apps 可见性通过。实际效果必须依据 Host 调用轨迹，不能用已发生的服务端调用推断未调用请求的召回率。

2026-11-01 本地小样本：Codex CLI `0.166.0-alpha.5.1`，沿用 Host 默认模型（未独立锁定模型版本），同一空目录 MCP 夹具，使用旧/新元数据各执行直接搜索、上下文追问、知识问答负例，合计6个独立会话。两版均正确调用商品工具、保留 `maxPrice=1000`、只调用一次展示工具且无写操作；两版负例均未调用商城。直接搜索工具调用次数为旧3/新2，上下文追问为旧2/新3，尚不能证明召回率或效率提升。此次未执行全部20条及重复采样，也未验证真实商品结果、购买闭环或 Apps 呈现。临时夹具已关闭，未发布线上。

同日聚焦自查后补测7个有效场景会话：两条搜索均各一次search_products并停止，无展示后换词查询；仅分类调用一次list_product_categories；翻译负例无商城调用。使用实际adapter和参数解析的隔离夹具复测分组空结果、纯查询TEMPORARY_UNAVAILABLE及无车询价：分组保持完整目标和预算、未生单或展示中间卡片；查询失败未进入写请求恢复或重复展示；无车询价说明限制、无商城写入。分组夹具按实际grouped协议返回；这些结果不证明成功购买或真实Host卡片呈现。新增Apps误投结果用例验证Host声明工具名不匹配时不进入最终卡片路由；缺失Host身份信息时不能声称有同等保障。工具说明仍是模型指引，服务端没有对话轮次身份，不能据此承诺所有Host都绝不重复调用。
