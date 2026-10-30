# Design

**2026-10-30当前需求增量：** [D-01最新决定](../../../DECISIONS.md#d01-direct-payment-20261030)规定Apps/WebMCP由Human支付点击后的受保护UI直接下单并原地展示结果，不依赖Agent接续；基础MCP保留原生确认后Agent提交及Host限制。具体增量统一由[agent-confirmed-purchase](../agent-confirmed-purchase/proposal.md)承接，本轮只修订Spec、不实施代码。下文历史切片批准/实施及外链失败证据保留，不据此抵扣新购买验收。


状态：Approved Planning / S6 实施已授权（2026-10-30）。Human 在最终独立复审无新增 Finding 后要求提交当前规划后开始实施；批准范围与 Git 边界见 [Proposal](proposal.md)。

## Context

动机和有效基线见 [Proposal](proposal.md)。Observed：起点 `main` 为 `66b2e0a`，工作区原干净；S5 已合并但其验收项仍未全部关闭。现有 Nest MCP 在每次 POST 中创建低层 `Server`，声明 tools 能力，提供七工具，统一返回 `{isError, structuredContent: result, content}`；尚无资源处理或 Apps 依赖。服务认证、Host/Origin 白名单仍生效。

现有 `ProductCard` 导入 Next Image/Link 与 AddButton，不能直接打入 Apps；`MoneyBreakdown` 与 `PurchaseSummary` 主要为 props 展示。`@modelcontextprotocol/sdk` 锁为 1.32.2。以下均为拟议实现，不从现有代码推导新增批准。

## Goals / Non-Goals

**Goals:** 以一个独立 React 入口承载商品结果和原车编辑，用既有 MCP/交易实现完成同车外部结账；版本兼容已验证；Human 于 2026-10-30 授权先实施完整视图，真实 Host 外链仍为交付前必须通过的门槛。

**Non-Goals:** 不建设 Host 工作台、通用协议/状态框架或新后台；不复制 Browser CartProvider、WebMCP 单操作 API、Checkout 确认状态机。无 Apps 建车/加购表单，商品选择与首次建车由 Agent 七工具完成；视图负责查看与编辑既有车。

## Decisions

### 1. 最小视图与替代方案

Human 在本轮选择“最小购物闭环”，取代完整 Host 购物工作台方向。商品视图消费搜索/详情结果，不设搜索筛选或评论分页控件；购物车视图提供数量输入、移除、一次明确“儲存調整”、显式“重新載入”和“前往商城結帳”。保存整车与基础 MCP 既有契约一致，区别于 S5 Web 页逐项提交。

沿用繁体中文、黑白视觉、可见键盘焦点/状态公告和窄容器布局。金额五项与商品 ID/名称/数量保留；受阻原因显式呈现，草稿不伪装成当前报价。商品卡不含 Apps 新建车操作。完成车以原 OrderResult 展示成交内容，不再提供交接/编辑。

替代方案：只给链接无法验证 Host UI/Bridge；完整导航/新增 Apps 建车会扩大状态与恢复范围；iframe 嵌现有网站会引入 Cookie/Next 环境耦合，均不采用。

### 2. 原 MCP 服务资源扩展

拟在原 `/mcp` 为 `search_products/get_product/create_cart/get_cart/update_cart/create_handoff` 各注册一个固定版本化 URI（例如 `ui://store/get-cart-v1.html`），MIME 按已核对协议使用 `text/html;profile=mcp-app`，通过各工具 `_meta.ui.resourceUri` 关联。六份静态 HTML 共用同一 React 入口/代码，构建时仅内置固定入口工具名；URI与工具名使用显式白名单映射，不接受任意路径/模板输入。评论工具不关联 UI，仍可由 Agent 调用。七工具保持原 schema、输出和注解，Apps 所需工具声明适用 app 可见性；不增加第八个工具或修改模型可见七工具集合。

扩展现有低层 Server 的 resources 能力与 list/read handlers，未知 URI 明确失败，不做文件路径拼接。构建产物由 API 随包交付，通过同一认证 transport 读取；无每车 HTML、用户数据内嵌或独立 UI 服务。不要求 Host 具有 Apps 扩展才能使用原工具，能力协商与元数据形式在前置兼容验证中核对。

### 3. 独立构建与必要共享

拟新增 `apps/mcp-app`，React + 官方 ext-apps 的 View 侧 App Bridge，采用 Vite 单文件 HTML 构建，将脚本、样式及必要图形随资源交付，不访问 CDN 或第三方网络。该构建器仅用于 Apps 资源，Web 继续 Next。

`packages/commerce-ui` 仅容纳已被 Web/Apps 同时使用的展示组件及格式化：先复用 MoneyBreakdown 与摘要展示，商品卡拆为纯展示壳和 Web 适配壳，链接/图片/按钮由环境提供。共享层不导入 Next、Host SDK、Cookie、fetch 或服务端计价；允许 Apps 省略商品插画以减少资源依赖。检查重复挂载的标题 ID 唯一性。基础控件沿用项目已批准 shadcn/Base UI 方向，仅引入当前控件需要部分。

依赖收益：官方 ext-apps 处理握手、消息关联与生命周期，避免手写 postMessage 协议；单文件工具使 Nest 只交付静态资源，省去新服务。实施前核对具体版本、peerDependencies、当前 Server SDK 与 Host 协议。若必须全量迁移到新版拆分 SDK 或改变认证/transport，则停止并提交方案修订，不借安装自动迁移全站。

### 4. Host Adapter 与能力边界

Adapter 按静态资源内置的入口工具名和现有 contracts 解包完整输入/结果（不是流式部分输入），匹配 cartId 后接受数据。HostContext.toolInfo 为可选字段，不作为识别工具的前提；若 Host 提供且与资源入口冲突则拒绝。Bridge 主动调用的结果按本地已知调用名/请求代次处理，不套用入口工具 schema。create_cart 结果含 Token；后续 get/update/handoff 的完整输入含原 Token。Host 若不投递必要输入，视图只读，提示 Agent 重新调用 get_cart；不可只凭 cartId 补权。真实 Host 必须验证这条传递链，不能靠测试注入绕过验收。

原七工具已向 Host/模型交付车能力，S6 不额外声称能对 Host 隐藏该能力。Apps 适配器必要内存也会持有它；同 iframe 内的 props 分离是代码边界，不是额外安全沙箱。通用组件仅收到公开 DTO/意图回调，Token 不进入 JSX、data 属性、日志、存储、URL query、updateModelContext 或自动 chat 消息。交接 URL 在 Adapter 内验证并直接传 openLink，不做可复制链接或 DOM href。

仅调用所属服务的 get_cart/update_cart/create_handoff；读操作不生成确认，UI 不主动 create_cart。无直接 HTTP、Cookie、服务 Token 或任意工具名执行。资源 CSP 不开放外部 connect/resource/frame 域，不申请相机/定位等权限，商品文本不使用原始 HTML。采用官方 SDK 握手/来源校验，不自制接受任意 postMessage 的桥。

### 5. 快照、草稿与竞态

Host 工具结果是快照，版本不代表库存/价格新鲜。首次获得完整车能力后只读 get_cart 校准；显式重载和外部结账前再读当前车。状态仅含当前车能力、最后服务端快照、草稿、在途标记、需刷新原因及视图代次，不建立全局多车 Store。

Human 修改已有数量/移除行，点击保存后以最后快照版本及整车草稿调用 update_cart。复用原整车严格校验：未修改的旧问题行仍可能使整车保存受阻，明确提示可移除问题行后保存，不承诺 S5 单操作逐条修复体验。保存期间禁止本视图重复写，不锁住其他入口。

初次校准、显式重载、保存以及整个结账校准/交接/打开流程共用本视图在途标记：请求发出前同步进入忙碌，禁用数量、移除、保存、重载及重复结账，动作处理器同样拒绝，直至当前操作结束。显式重载仅在用户确认放弃已有草稿后开始；忙碌期间不能产生新本地输入，迟到读取不获覆盖新草稿的例外。只用已有在途标记和操作代次，不新增草稿版本或操作队列。

成功接纳同车当前代次且不低于已见版本的结果。新 Host 结果遇草稿则保留草稿并要求刷新；冲突/技术未知立即置需刷新，迟到成功不能清除。显式重新载入确认放弃草稿、发新读取，只有该代次读取成功才解除；不自动重放旧写。失效/权限拒绝终止操作，CART_COMPLETED 引导读取原结果。换车清空能力/草稿，销毁关闭 Bridge 监听和内存；旧代次不能更新新视图。无自动轮询、请求队列或对比合并界面。

### 6. 外部结账与真实门槛

无草稿/刷新要求且可结账时，Human 点击按钮，先 get_cart 校准，再 create_handoff，消费其最新完整车/报价并验证 URL 固定 origin、`/checkout/{当前cartId}` 路径、仅预期 fragment、无 query/用户名/密码等异常。完成/到期/受阻/未知即停止打开。校准不是锁价或预留，外部 Checkout 仍重新审阅。

该流程从首次读取发出前至 openLink 返回保持同一次忙碌操作。每次异步返回后、发起下一步前，检查视图仍存活、原 cartId/操作代次仍为当前、无草稿/刷新要求，服务端快照已按 §5 接纳且仍可结账；任何条件失效立即停止后续调用/打开。换车或销毁使原操作失效，旧操作结束也不能清除新车/新操作的忙碌标记；已发出的工具或打开请求不因本地失效而被声称撤销。

由 Adapter 请求 Host openLink；Host 拒绝或不支持时显示限制，可重新显式尝试，基础 MCP 仍能由 Agent 交付原链接。交接未知可同能力显式重试既有幂等签发，不续期；打开未知不等于购买未知，也不触发订单恢复或自动重开。不自动签发或打开链接，不模拟外部购买。

前置目标优先当前 Codex Host，与基线真实 Codex 证据方向一致；支持情况 Unknown。实施获批后的第一任务只在本地确认扩展协商、资源、输入/结果、Bridge 工具和 localhost 外链能力。当前 Host chatgpt 26.1027.30824 的 UI/输入/结果/只读 Bridge 已由 Human 实测，localhost openLink 返回成功但未实际打开。Human 于 2026-10-30 明确授权先实现，交付前补验；本项不得提前勾选或由替身代替。若交付前仍不支持，记录限制并交 Human 选择另一个可用 Apps Host；不自行安装 Host、开放公网、降级认证或把自建 AppBridge 测试器称为真实验收。

## Risks / Trade-offs

- [Host/SDK 未实测] → 前置验证及退出条件明确；版本失败须升级；已知真实外链缺口按 Human 新授权在交付前补验。规划只查官方资料，未运行或安装探针。
- [能力存在 Host 与 Adapter 内存] → 延续现有 Bearer 信任边界，纯组件无秘密，测试 DOM/日志/产物及生命周期；不声称隔绝恶意 Host。
- [整车保存与跨入口竞争] → 服务端原版本裁决，冲突显式刷新；不静默改基础 MCP schema。
- [提取展示影响 Web] → 定向 Web/Apps 展示回归、生产构建及包依赖检查；共享只提当前需要部分。
- [S5 未验收] → 本轮规划不替代 S5 收尾；完整项目交付前逐模式核对未决项和实际证据，S6 不能冲销 S4/S5 已记录缺口。

## Migration Plan

无数据库变更，不 seed、不重置库存。实施批准及 planning checkpoint/Guard 后，先验证兼容性，再锁实际依赖、构建静态 Apps 资源并随 API 打包；检查开发与生产入口都能读取同版本资源，修改根 build/Compose/CI 必要入口，不新增常驻服务。旧七工具和 Web 仍可单独使用。

回退移除 UI 元数据/资源或回到原构建，不回退购物车交易数据；已发生的编辑/首次分享仍保留，不能以 UI 回退为由恢复旧条目或续期。旧 Host 结果与新资源版本不匹配时禁用操作并要求重新调用工具。

## Verification

按新边界验证资源发现/认证/未知 URI、旧七工具兼容、契约解包/去秘密、Bridge 调用、草稿/冲突/unknown/完成/到期/切车销毁、恶意文本及非法 URL。替身 AppBridge 测试 iframe 消息与渲染；共享组件 Web 回归、窄/宽容器键盘、静态/生产构建与无 Next/秘密入包检查。

服务端交易未变时复用有效 PG 不变量证据；经真实 MCP 进行车创建/编辑/分享的受影响集成验证，专用测试库核对无编辑扣库存、同版本最多一次与完成后拒绝。真实 Host 单独记录版本/revision/UI/Bridge/外链，Human 在浏览器实际确认后核对同车唯一订单及库存。无证据明确写未验证，不以 mock 或自动点击代签。

## Sources

2026-10-30 查阅官方 [Apps 概览](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html)、[Quickstart](https://apps.extensions.modelcontextprotocol.io/api/documents/quickstart.html)、[App API](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html)、[资源元数据](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiResourceMeta.html)。资料用于确认资源/Bridge/隔离模式，非当前项目兼容性证据；依赖以实施时实际锁定及测试为准。
