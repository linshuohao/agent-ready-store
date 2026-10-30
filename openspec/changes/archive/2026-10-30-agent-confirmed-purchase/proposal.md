# Proposal

状态：Human Approved Planning / 已授权提交并按当前规划验证、实施（2026-10-30）。Human本轮明确“提交代码，并根据当前的规划实施”，随后明确接受Design §4.3的可信Host/浏览器UI隔离边界及§6的短期可转交只读订单权限。此授权替代此前仅修订Spec/暂不实施的执行限制；不代表真实Host证据、购买验收或全部任务已完成，不包含Push/Merge、配置切换或发布。基础MCP真实Host确认及各入口实施前验证条件仍适用。

**分入口实施授权（2026-10-30）：** Human明确“授权这个实施顺序”：先实施Apps/WebMCP及共享交易核心，基础MCP保留真实Host阻塞，未验证路径拒绝购买；不以此缩减三入口最终交付，不修改MCP配置或自动Push/Merge。该授权替代此前分入口需另行批准的待决状态。UI材料真实Host模型隔离、组件接收与Bridge回传已有本Change Tasks证据；正式权限负例、事务及并发随实现验证。

## Why

Agent应完成选购和结算准备，Human审阅具体内容后一次点击支付即可购买。Apps与WebMCP若在支付后还依赖Host唤醒Agent才能提交，会把订单完成绑定到额外的会话能力，增加不必要的不确定性。

## What Changes

- **MCP Apps与WebMCP：** Agent可跨步骤准备到结算；Human点击“支付/确认购买”后，页面经受保护通道直接请求后端验证具体确认并下单，在原App/网页展示订单或明确状态。取消“先仅批准、再唤醒Agent提交”的正常路径，不要求复制回聊、额外继续或第二次确认。消息发送或Agent后续回复不是成单条件。
- **基础MCP：** 保留T-07已批准的Host原生form elicitation方向，完整摘要、Human确认及结果留在会话；有效原生回执由服务端核验后，Agent才可提交。当前Host虽声明form能力，但工具请求未关联初始化会话，尚未实际验证确认界面；不支持时禁止新购买并说明限制，不静默改用Apps、外部Checkout或模型自述批准。
- **共享交易：** 三入口共享原车、准备摘要、内容绑定、期限、报价重验与订单/库存原子事务；区别在确认载体和提交执行者。Apps/WebMCP的受保护支付请求不得被公开Agent提交工具代用，Agent不得代点支付。沿既有模拟结账，不新增真实金流。
- **工具和页面：** 原七MCP工具发现、schema与既有输出保持，新增prepare_checkout、request_purchase_confirmation、get_purchase_status、submit_order、cancel_purchase五个工具仍为待实施目标；submit_order用于基础MCP有效批准后的提交，不能提交Apps/WebMCP准备。prepare_checkout只准备；request_purchase_confirmation仅为基础MCP请求Host原生表单，不接收模型批准值；cancel_purchase只撤销指定基础MCP准备/批准，不退款。后两者以当前上下文的准备/确认等待/状态能力支持Agent协作，支付写入由UI处理，不开放可自动批准下单的模型工具。
- **兼容与外链：** Apps允许内嵌直接跳页；原create_handoff仅用于Human明确分享/交接，不用于新正常购买。基础MCP/Apps不跳外部Checkout，实际completed后才可提供受保护的外部只读订单详情链接。普通Web与独立Handoff路径保持。

## Capabilities

### New Capabilities

- `mcp-app-shopping`: 承接尚未同步的S6能力，保留资源/展示/编辑/权限要求，以内嵌支付替代正常外部Checkout；完整目标规格由本Change唯一同步。
- `webmcp-shopping`: 承接尚未同步的S5能力，保留来源/编辑/生命周期要求，补齐准备、等待/状态及网页直接支付。
- `agent-purchase-authorization`: 三入口准备与具体Human确认；Apps/WebMCP点击直接下单、基础MCP原生确认后Agent提交，及结果恢复、权限和独立验收。

### Modified Capabilities

- `agent-shopping`: 保持原七工具兼容，分入口约束新增购买工具及会话展示，禁止模型自授批准或代用UI支付准备。
- `hosted-checkout`: 普通Web及WebMCP网页支付直接下单，保持确认/会话绑定、完整摘要和原车事务；不强制基础MCP/Apps外跳。

两份承接能力目前不存在于正式 `openspec/specs`，因此采用完整 `ADDED Requirements`，不是对不存在基线执行MODIFIED。旧S5/S6规格留作历史批准/实施依据；同步所有权、替代范围和归档顺序见Design「规格同步与旧Change收尾」，不将历史失败改写为通过。

## Impact

- 依据：[D-01最新直接支付决定](../../../../DECISIONS.md#d01-direct-payment-20261030)、[Requirements §3.3](../../../../docs/product/REQUIREMENTS.md)；本轮替代Apps/WebMCP必须批准后由Agent提交的先前规划，保留T-07基础MCP方向与历史验证事实。
- 复用CartService、计价、checkoutEpoch、锁后准入、唯一订单和库存事务；准备记录及确认Adapter仍待实施，不新增独立订单/支付服务。
- Apps/WebMCP需完成受保护支付请求、原地结果与未知恢复；准备阶段消息仍可选，支付阶段不发送购买接续消息，不把“没有Agent接续依赖”写成无Host兼容要求或百分之百保证。
- 基础MCP限制见[Design §4](design.md#4-确认边界与基础mcp限制)。HTTPS不自动修复会话关联；STDIO只完成隔离协议测试，尚未批准配置切换或通过桌面UI验收。
- 具体确认材料交付/隔离及成功后只读订单链接权限仍待设计验证。本轮授权按当前OpenSpec产物验证并实施；不自动改变MCP配置、不执行真实Human购买、不Push/Merge。
