# webmcp-shopping Specification

## Purpose

让浏览器Agent通过当前页面工具发现商品并按明确意图编辑购物车或创建完整待支付订单，与Human共用网页交互和服务端快照；页面导航不改变原实体，支付只由Human在原订单页面发起，并保留不支持环境与未知结果恢复边界。

## Requirements

### Requirement: 当前页面工具与直接生单
WebMCP SHALL 按当前页面提供查询、详情/评论、当前车读取和明确加购/设量/移除，并在适用上下文提供生单、查单/列表/取消工具。明确加购成功通常展示车，用户要求留页时遵守；购买中的内部加购不插入车页。明确购买时生单后直接导航/orders/{orderId}，不强制车页中转；网页Human支付不作为模型工具，注册或打开页面本身无写入和跳转。

#### Scenario: 查询和明确购买
- **WHEN** 真实Host仅打开WebMCP/咨询，或提出完整购买目标
- **THEN** 前者不建单、不预留、不导航；后者共享完整选择及预算校验，成功显示原订单待支付，Human点击后网页直接支付，无须Agent接续

### Requirement: 单次操作契约与来源
页面工具 SHALL 使用cartId、operationRequestId、expectedCartVersion及明确操作，生单使用单一selectedItems。工具schema拒绝旧整车items及来源/价格覆盖，Host重新发现当前句柄。WebMCP生单有本单AI资格，仅咨询、加购、读单不使后续普通Web生单获得资格；Agent建车事实另计。

#### Scenario: 改车和普通生单
- **WHEN** 工具成功改普通车，之后Human在普通Web生单，或Host传旧工具参数
- **THEN** 前者普通订单无AI资格，不补计Agent建车；后者明确校验失败，不自动转换旧参数或沿用旧车来源折扣

### Requirement: 页面生命周期与实体隔离
系统 SHALL 在离页注销旧工具，新页重新注册；Human与工具共享同车Commands和服务端快照，草稿及在途写保护沿shopping-cart。车按cartId/version接收，订单按orderId和终态接收；局部未决不锁全局，不因导航/刷新重建scope、Review或订单。

#### Scenario: 迟到创建及多单切页
- **WHEN** 生单或加购响应晚于用户导航，或同车新快照在草稿期间到达
- **THEN** 记录原请求结果但不抢新页面、不覆盖新输入或另一车；必要时提示重读，页面恢复从原ID及未知标记继续

### Requirement: 浏览器恢复降级与独立验证
系统 SHALL 在刷新后按持久ID恢复车/订单，不依赖checkout_session或车Token交换；保留既有同源请求保护。无WebMCP环境保留普通Web并明确工具不可用，真实发现、调用、导航和Human支付须分别记录，不把模拟调用当作实测。

#### Scenario: 支付未知与不支持
- **WHEN** 网页支付响应丢失后刷新，或浏览器无WebMCP能力
- **THEN** 前者只读原orderId、不自动支付/生单，后者正常人工购物且报告能力限制；新通道成功不能抵扣其他入口缺口
