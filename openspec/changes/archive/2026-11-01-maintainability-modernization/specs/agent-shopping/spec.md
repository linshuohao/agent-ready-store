# Spec Delta

## MODIFIED Requirements

### Requirement: 订单工具与共享服务语义
系统 SHALL 保留商品搜索、详情、独立评论查询能力；search_products用于明确搜索展示，query_products提供同输入/结果的无UI查询供购买准备使用，提供get_or_create_cart、get_cart、add/update/remove_cart_item、create_order、get_order、list_orders、cancel_order；quote_selection仅无占用预估，不强制为前置步骤。工具使用共享业务语义，返回结构化及可读结果，可区分校验、冲突、受阻、配额和技术故障，不包含支付工具。 MCP Demo仅按agent-shopping的「Demo入口模式」免除Token认证，其他边界不变。

#### Scenario: 工具切换与发现
- **WHEN** 新流程Host发现工具并调用，或旧客户端调用旧prepare/review/submit/create_handoff/get_order_link写流程
- **THEN** 新schema明确cartId/orderId、请求键、版本和selectedItems；旧写流程不再生效，提示重新发现，不能以兼容别名绕回旧购买；注解不替代服务端校验

#### Scenario: 服务边界与公开数据
- **WHEN** 显式token认证模式下无有效MCP服务认证、Host/Origin非法，或商品评论带操作指令
- **THEN** 保留既有入口拒绝，商品评论仅数据；公开结果不包含内部经营字段、凭证或堆栈，Demo ID接续不等于移除服务入口保护

## ADDED Requirements

### Requirement: Demo入口模式
系统 SHALL 未配置模式时默认使用Demo免认证模式，允许显式选择demo或token；token模式要求服务Token；demo模式开放全部现有工具和Apps资源，不改变工具可见性、Human支付、Host/Origin、输入及交易约束。显式token模式缺少Token不得回退Demo，非法模式配置MUST拒绝启动；本地及线上演示部署均使用demo；需要限制服务访问时显式选择token。

#### Scenario: 显式token认证和配置失败
- **WHEN** 显式选择token且Token缺失或少于24字符，或模式为空字符串、拼写错误或其他非法值
- **THEN** 服务启动明确失败；token模式启动后缺失或错误Token的MCP请求被拒绝

#### Scenario: 本地及线上完整体验
- **WHEN** 未配置模式或显式选择demo，且已配置的Host/Origin合法，客户端不提供Token
- **THEN** 可发现并调用全部原有工具、读取Apps资源；商品查询、购物车、订单与Human在Apps或网页点击模拟支付的业务语义不变，模型仍不能代付

#### Scenario: 认证例外不绕过其他边界
- **WHEN** Demo请求携带非法Host/Origin、非法参数或不满足交易约束
- **THEN** 按原有边界拒绝，不因免认证绕过校验、幂等、库存或支付确认


#### Scenario: 模式不依赖Token是否存在
- **WHEN** 未配置模式且环境中存在服务Token
- **THEN** 仍使用demo模式，不根据Token存在隐式切换；显式token模式下才校验凭证

#### Scenario: 无Origin的合法Host请求
- **WHEN** 非浏览器Host在demo模式下不发送Origin及Token，但请求Host在允许列表内
- **THEN** 不因Origin缺失拒绝合法请求；若发送Origin则必须与配置精确匹配，token模式仍另行校验Bearer Token

#### Scenario: 非本地部署配置
- **WHEN** demo模式使用非回环WEB_ORIGIN或允许Host，或运行于现有Vercel托管入口
- **THEN** 允许启动并免除Token认证，仍按配置校验Host/Origin，不根据部署平台自动切换认证模式
