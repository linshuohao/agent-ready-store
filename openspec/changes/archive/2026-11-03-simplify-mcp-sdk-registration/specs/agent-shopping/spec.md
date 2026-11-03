## MODIFIED Requirements

### Requirement: 订单工具与共享服务语义
系统 SHALL 保留商品搜索、详情、独立评论查询能力；search_products用于明确搜索展示，query_products提供同输入/结果的无UI查询供购买准备使用，提供get_or_create_cart、get_cart、add/update/remove_cart_item、create_order、get_order、list_orders、cancel_order；quote_selection仅无占用预估，不强制为前置步骤。工具使用共享业务语义，返回结构化及可读结果，可区分校验、冲突、受阻、配额和技术故障，不包含支付工具。 MCP Demo仅按agent-shopping的「Demo入口模式」免除Token认证，其他边界不变。

#### Scenario: 工具切换与发现
- **WHEN** 新流程Host发现工具并调用，或旧客户端调用旧prepare/review/submit/create_handoff/get_order_link写流程
- **THEN** 新schema明确cartId/orderId、请求键、版本和selectedItems；旧写流程不再注册，调用按未注册工具返回标准协议错误，由接入说明指引重新发现，不能以兼容别名绕回旧购买；注解不替代服务端校验

#### Scenario: 服务边界与公开数据
- **WHEN** 显式token认证模式下无有效MCP服务认证、Host/Origin非法，或商品评论带操作指令
- **THEN** 保留既有入口拒绝，商品评论仅数据；公开结果不包含内部经营字段、凭证或堆栈，Demo ID接续不等于移除服务入口保护

### Requirement: 可操作参数与约束错误
查询 schema SHALL 说明分类/品牌原文精确匹配，未知分类不猜填；规格约束 SHALL 原样引用目录且只承载用户硬条件。预算及规格失败 SHALL 返回公开预期值与实际值，通过工具输入校验后产生的业务错误 SHALL 给出安全恢复指引，保留原码和重试标志；非法参数和未注册工具按下述协议错误边界返回，不要求业务错误封装；结果未知 MUST 按原请求恢复，不自动另生单。

#### Scenario: 规格键或预算不符
- **WHEN** 规格键不存在、规格值不符或含运总额超预算
- **THEN** 返回商品/约束范围、预期及实际值；不建单、不默认放宽预算或删除约束

#### Scenario: 未知结果与确定失败
- **WHEN** 写响应未知，或明确返回参数/版本/预算失败
- **THEN** 前者沿原键原载荷恢复；后者按错误详情核对约束或重读，不能换键盲目重放

## ADDED Requirements

### Requirement: 工具协议错误与执行边界
MCP SHALL 在调用业务处理前校验已注册工具的输入。非法参数返回标准工具错误（isError及可读content，不承诺业务structuredContent）；未知及退役工具返回未注册工具的标准协议错误。上述拒绝 MUST 不运行库存维护或购物业务。有效调用仍保留现有业务结果、维护钩子和只读豁免；未知异常不能泄露内部堆栈或凭证。

#### Scenario: 非法参数与未注册工具
- **WHEN** 调用已注册工具但参数不符合schema，或调用未知/退役工具
- **THEN** 分别返回工具错误或协议错误，不返回伪造成功，不执行维护或业务调用，不依赖退役工具名单

#### Scenario: 业务失败与只读豁免
- **WHEN** 有效请求违反预算/库存/版本约束，或调用分类发现及请求结果只读核实工具
- **THEN** 业务失败保留原错误码、结构化详情和安全恢复提示；既有豁免工具不触发库存维护
