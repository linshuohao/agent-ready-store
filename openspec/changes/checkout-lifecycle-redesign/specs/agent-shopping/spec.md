# Spec Delta

## REMOVED Requirements

### Requirement: 七工具与共享语义
**Reason**: T-08～T-11的订单生命周期、ID接续及入口约定替代该旧流程要求；保留的行为在下列新要求中明确。
**Migration**: 按Design §10受控切换至新订单流程；不保留旧Review/凭证/同车唯一订单兼容，不改写归档历史。

### Requirement: 可信 Agent 创建及持久恢复
**Reason**: T-08～T-11的订单生命周期、ID接续及入口约定替代该旧流程要求；保留的行为在下列新要求中明确。
**Migration**: 按Design §10受控切换至新订单流程；不保留旧Review/凭证/同车唯一订单兼容，不改写归档历史。

### Requirement: 跨入口访问编辑与原结果
**Reason**: T-08～T-11的订单生命周期、ID接续及入口约定替代该旧流程要求；保留的行为在下列新要求中明确。
**Migration**: 按Design §10受控切换至新订单流程；不保留旧Review/凭证/同车唯一订单兼容，不改写归档历史。

## ADDED Requirements

### Requirement: 订单工具与共享服务语义
系统 SHALL 保留商品搜索、详情、独立评论查询能力，提供get_or_create_cart、get_cart、add/update/remove_cart_item、create_order、get_order、list_orders、cancel_order；quote_selection仅无占用预估，不强制为前置步骤。工具使用共享业务语义，返回结构化及可读结果，可区分校验、冲突、受阻、配额和技术故障，不包含支付工具。

#### Scenario: 工具切换与发现
- **WHEN** 新流程Host发现工具并调用，或旧客户端调用旧prepare/review/submit/create_handoff/get_order_link写流程
- **THEN** 新schema明确cartId/orderId、请求键、版本和selectedItems；旧写流程不再生效，提示重新发现，不能以兼容别名绕回旧购买；注解不替代服务端校验

#### Scenario: 服务边界与公开数据
- **WHEN** 无有效MCP服务认证、Host/Origin非法，或商品评论带操作指令
- **THEN** 保留既有入口拒绝，商品评论仅数据；公开结果不包含内部经营字段、凭证或堆栈，Demo ID接续不等于移除服务入口保护

### Requirement: 完整意图执行与约束
Agent SHALL 在明确目标下连续准备本次完整商品集合，默认只选本次涉及行；明确改量直接操作，语义含糊才澄清。生单传selectedItems的整行数量断言和显式预算/币种/规格，服务端验证；多工具准备失败不自动缩小目标。

#### Scenario: A成功B失败
- **WHEN** 购买A和B的准备中A加购成功，B失败或实际数量与意图不符
- **THEN** 保留并如实说明A已在车，停止生单；只有Human明确修改目标才以新意图请求购买A，不把最终支付当作遗漏约束的兜底

#### Scenario: 咨询与直接购买
- **WHEN** 用户咨询、明确加购或明确购买
- **THEN** 分别只读、不生单的改车、完整生单并显示支付入口；不强制车页中转，未支付明确标为待支付

### Requirement: 持久上下文与原请求恢复
系统 SHALL 以cartId接续同车；纯浏览/咨询不建车，首次明确写意图的新建分支携初始化键及非空initialItems，所有初始条目可购买且与车、创建归因同事务持久化。初始化请求键和操作键持久幂等；同键恢复先于当前库存/版本检查，不覆盖后续编辑。同键异载荷冲突；查询订单按orderId，多候选先定位，list_orders按cartId有界分页，不因未知结果创建替代车或订单。

#### Scenario: 跨重启和多单
- **WHEN** 建车/加购/生单已提交后丢响应并重启，或查看旧订单时仍在另一车购物
- **THEN** 恢复原车/操作/订单事实，不重复加量或预留；看单不隐式切换当前车，支付/关闭只影响目标订单

### Requirement: 结果与导航明确
系统 SHALL 在生单和读单结果返回orderId、cartId、状态、完整固定摘要、截止、可用操作以及普通/分享入口。基础MCP可展示网页入口，不等待原生form；导航失败保留原单，状态读取不等于支付，模型不得代开UI点击支付。

#### Scenario: 链接打开失败
- **WHEN** 已生单但Host不能打开网页入口，或工具结果晚于用户切页
- **THEN** 显示可用原入口及限制，不再生单、不抢新页面、不宣称已支付；按原orderId恢复
