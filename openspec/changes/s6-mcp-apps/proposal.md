# Proposal

**规划Review修订 — 2026-10-30：** 尚未进入正式specs的webmcp-shopping/mcp-app-shopping已由[当前购买Change](../agent-confirmed-purchase/proposal.md)承接完整目标规格；旧Spec保留历史批准/实施依据，不能再次同步覆盖新购买契约。[同步与收尾顺序](../agent-confirmed-purchase/design.md#规格同步与旧change收尾)规定S5 shopping-cart单独保留、重叠能力只由新Change同步，旧未通过验收不改记成功，归档仍需Human验收/处置与授权。

**2026-10-30当前需求补充：** 三入口便利购物、Apps允许直接导航/Agent跨步准备及Human最终点击支付的边界以[D-01](../../../DECISIONS.md#d01-agent-convenience-20261030)及[agent-confirmed-purchase](../agent-confirmed-purchase/proposal.md)为准；本Change旧查询/编辑/外链实现和验收记录保留，不代表新增便利购物/最终Human支付要求已完成。新增批准通道与资源接续尚待设计/实施批准。

**2026-10-30当前需求增量：** [D-01最新决定](../../../DECISIONS.md#d01-direct-payment-20261030)规定Apps/WebMCP由Human支付点击后的受保护UI直接下单并原地展示结果，不依赖Agent接续；基础MCP保留原生确认后Agent提交及Host限制。具体增量统一由[agent-confirmed-purchase](../agent-confirmed-purchase/proposal.md)承接，本轮只修订Spec、不实施代码。下文历史切片批准/实施及外链失败证据保留，不据此抵扣新购买验收。


状态：Approved Planning / S6 实施已授权（2026-10-30，Asia/Shanghai）。Human 在两轮独立规划审查及最小修订关闭后，要求提交当前规划后开始实施；批准本 Change 当前 Proposal、Spec、Design、Tasks，并授权规划提交后实施。不包含 Push、Merge、发布或最终验收。此前“最小购物闭环”选择仅授权规划的历史边界保留。

## Why

现有 Web、基础 MCP 与已实施的 WebMCP 尚未提供 Host 内可交互的 MCP Apps 视图。S6 补齐本次完整交付的第三种 Agent 接入，以商品结果展示、原车编辑与外部 Hosted Checkout 接续验证最小购物闭环。

## What Changes

- 为既有工具关联受隔离的 Apps UI 资源，在 Host 内展示商品结果与购物车完整报价；不另建完整商城导航、搜索表单或评论工作台。
- Agent 沿用七工具查询、建车；Apps 消费结果，在有效同车能力内读取、修改数量、移除条目，并经 Host Bridge 打开服务端生成的交接链接。
- Apps 编辑沿用基础 MCP `update_cart(expectedCartVersion,items)`，不将 S5 WebMCP 的单操作 schema 移植到服务器同名工具。冲突或未知结果后显式重读，不自动合并或重放。
- 纯 React 展示组件按真实消费者提取，Host 协议与秘密留在适配器内；不直接访问网站 API、Cookie 或 Next Router。
- 真实 Host 已完成部分验证；Human 于 2026-10-30 授权先实现，真实 localhost 外链验证保留为交付前必须通过的门槛；不支持 Apps 时保留基础 MCP 文本/结构化结果与已有交接能力，但降级不算 Apps 完成。Human 最终确认与购买仍只在 Hosted Checkout。

## Capabilities

### New Capabilities

- `mcp-app-shopping`: Apps 资源关联、Host Bridge、商品/原车视图、编辑协调、秘密隔离、外部结账与独立验收。

### Modified Capabilities

无。现有 `agent-shopping` 七工具参数/结果与 `cart-handoff` 的权限、期限和购买边界不变；本 Change 只增加可选 UI 元数据及资源，不改变原消费者要求。

## Impact

- `apps/api/src/mcp/mcp.adapter.ts` 增加资源能力与资源读取、工具 UI 元数据；复用 CatalogService/CartService 及既有认证，无新增常驻服务、数据库迁移或业务工具。
- 拟新增 `apps/mcp-app` 独立 React 构建入口；仅抽取 `packages/commerce-ui` 中实际复用的展示部分。现有 ProductCard 耦合 Next Image/Link/AddButton，需拆出展示壳；MoneyBreakdown/PurchaseSummary 及金额格式化可按需复用，保留 Web 行为。
- 拟使用官方 `@modelcontextprotocol/ext-apps` 和轻量单文件构建工具；实施前核对锁定的 MCP SDK 1.32.2 兼容性。当前官方示例采用新版拆分 SDK，不据此自动升级项目协议栈。
- 依据：[Requirements v0.2](../../../docs/product/REQUIREMENTS.md)、[Product Design v0.2 Agent UI 范围](../../../docs/product/PRODUCT_DESIGN.md)、[Technical Design v0.5 §6/10.2](../../../docs/engineering/TECHNICAL_DESIGN.md)、[T-02/T-04/T-06](../../../docs/engineering/ENGINEERING_DECISIONS.md)。S5 已合入 main，但其真实人工接续、最终验收与归档仍以 [S5 Tasks](../s5-webmcp/tasks.md) 为准，不由 S6 代签。
- 本轮不含完整 Host 内商城、Apps 独立建车表单、最终购买工具、登录/支付、公网部署、来源防伪增强、长期结果恢复或最终 Showcase；允许实施所需本地工程依赖与验证；不自动执行最终购买。
