# Proposal

**规划Review修订 — 2026-10-30：** 尚未进入正式specs的webmcp-shopping/mcp-app-shopping已由[当前购买Change](../agent-confirmed-purchase/proposal.md)承接完整目标规格；旧Spec保留历史批准/实施依据，不能再次同步覆盖新购买契约。[同步与收尾顺序](../agent-confirmed-purchase/design.md#规格同步与旧change收尾)规定S5 shopping-cart单独保留、重叠能力只由新Change同步，旧未通过验收不改记成功，归档仍需Human验收/处置与授权。

**2026-10-30当前需求补充：** 三入口便利购物、Apps允许直接导航/Agent跨步准备及Human最终点击支付的边界以[D-01](../../../DECISIONS.md#d01-agent-convenience-20261030)及[agent-confirmed-purchase](../agent-confirmed-purchase/proposal.md)为准；本Change旧查询/编辑/外链实现和验收记录保留，不代表新增便利购物/最终Human支付要求已完成。新增批准通道与资源接续尚待设计/实施批准。

**2026-10-30当前需求增量：** [D-01最新决定](../../../DECISIONS.md#d01-direct-payment-20261030)规定Apps/WebMCP由Human支付点击后的受保护UI直接下单并原地展示结果，不依赖Agent接续；基础MCP保留原生确认后Agent提交及Host限制。具体增量统一由[agent-confirmed-purchase](../agent-confirmed-purchase/proposal.md)承接，本轮只修订Spec、不实施代码。下文历史切片批准/实施及外链失败证据保留，不据此抵扣新购买验收。


**本次修订状态：Approved Planning — 电商逐项操作与按场景刷新（2026-10-30）。** 聚焦独立规格审查无重要 Finding 后，Human 明确“批准当前修订版，提交之后开始实施”，批准本次 Proposal、Design、两份 Spec 和 Tasks §6 并授权提交规划后实施；不包含 Push、Merge、发布或最终验收。原 S5 批准历史继续保留，§6 新行为以本次修订为准。

## Why

S1～S4 已验收归档，现有 Web 及基础 MCP 闭环尚不能由浏览器 Agent 通过注册页面工具完成购物准备。S5 补齐本次完整交付内的 WebMCP，复用既有购物车与 Checkout，不复制交易实现。

状态：Approved Planning，已授权实施。2026-10-30，定向复核通过后 Human 明确“OK，批准，然后提交并且开始实施”，批准本 Change 当前 Proposal、Spec、Design、Tasks，授权提交并开始实施；不包含 Push、Merge、发布或最终验收。此前 Human 明确：注册 WebMCP 工具属于 Agent 入口，无需额外身份认证；工具新建车享 AI 优惠；工具接手编辑普通车也转为 AGENT 并享优惠。此业务决定不等于浏览器提供服务端可验证的身份凭证。Human 随后明确将来源防伪作为后续规划目标，本轮不做；正式限定依据见 [D-07 补充](../../../DECISIONS.md#s5-webmcp-source-20261030)。

## What Changes

- 页面注册搜索、详情/评论、加购、当前车读取及编辑能力；按所在页面提供适用工具，不强制复制服务器七工具。
- WebMCP 新车固定 AGENT；普通车经成功 WebMCP 编辑原子转换为 AGENT，重新计价并使旧确认失效。Human 后续编辑保留 AGENT，不改变完成订单。
- 共用 Browser Commands、页面协调与服务端用例，Web/WebMCP 用单次加购、设定数量、移除表达意图，取消 Web 整车“儲存調整”；同车请求期间短暂互斥，不排队重放。服务端版本裁决保持，冲突或未知提示重新加载，不比较/合并/重放编辑。
- 购物车重新进入或干净页面返回前台时重新读取；有数量草稿时保护输入并提示刷新。Cart 版本不代表报价/库存仍新鲜，Checkout 保留独立重新计价、库存与 Human 购买确认边界。
- 保持车级权限、到期、不预留库存及 Human Checkout 确认；工具不提供最终提交。
- 来源可转换后，统计改为读取不可变的有效 Agent 创建事实，避免普通车接手被误计为 Agent 创建。该口径为沿用正式统计 Spec 的建议，待整份规划审阅。
- 明确无额外身份认证时 WebMCP HTTP 通道可被模拟的残余边界，来源防伪按 Human 决定后置；不将工具注册当成后端身份认证，不阻塞 S5 规划。

## Capabilities

### New Capabilities

- `webmcp-shopping`: 页面工具、生命周期、来源转换、状态同步、降级及独立真实 Host 验收。

### Modified Capabilities

- `shopping-cart`: 来源从绝对不可变调整为成功 WebMCP 编辑允许 HUMAN → AGENT；新增浏览器逐项操作与页面新鲜度契约，车权限和原子版本规则保持。原 HTTP 整车替换和基础 MCP 七工具保持兼容。

## Impact

- `apps/web` 增加薄 WebMCP Adapter，复用 cart commands/provider、目录与购物车页面协调；不引入统一工具框架。
- `apps/api` 增加固定 WebMCP 意图的创建/编辑通道，共享 CartService；普通 HTTP 不接受任意来源字段；MCP_SERVICE_TOKEN 不进入浏览器。
- `packages/contracts` 扩展必要 DTO；数据库为历史创建事实增加最小持久表达，迁移不 seed、不删卷、不从当前可变来源推导未来统计。
- 本次修订新增普通/WebMCP 操作 HTTP 路径和单操作 DTO，WebMCP `update_cart` 从整车 items 改为单操作参数，须重新发现工具。基础 MCP `update_cart(expectedCartVersion,items)` 与现有 HTTP 整车路径不变。复用 Cart 行锁与服务端用例，不新增状态管理库、操作流水表或本次修订专属数据库迁移。
- 相关来源不可变规则与 Technical Design §6.3 的 Pending 将由本 Change 表达差异；D-07 与 Requirements SEC-02 已记录 Human 的限定补充；整体规划批准后再传播技术基线，正式 Spec 待验收后同步，不静默覆盖历史。
- 依据：Requirements v0.2 §6/SEC-02/METRIC-01、Product Design v0.2 Agent UI 边界、Technical Design v0.5 §5.2/6/10.2、D-07/D-22 及本轮 Human 澄清。S6、代提交、登录/支付、公网部署不在范围内。

2026-10-30 Human 追加授权：按服务端单一权威简化 Web/WebMCP 购物车编辑，取代当前 Change 的客户端编辑恢复和冲突比较方案；具体边界见 Design §4。创建幂等、购买恢复与服务端交易保障保持。
