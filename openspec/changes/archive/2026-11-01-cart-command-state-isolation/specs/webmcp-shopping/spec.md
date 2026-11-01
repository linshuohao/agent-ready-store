## MODIFIED Requirements

### Requirement: 单次操作契约与来源
页面工具 SHALL 使用cartId（首次add可用共享初始化身份）、operationRequestId及明确操作；add不要求读取或提交expectedCartVersion，set/remove必须携原意图的expectedCartVersion，生单和报价使用单一selectedItems的productId/quantity，不提交版本、不要求车行数量匹配。工具schema拒绝旧整车items及来源/价格覆盖，Host重新发现当前句柄。WebMCP生单有本单AI资格，仅咨询、加购、读单不使后续普通Web生单获得资格；Agent建车事实另计。

#### Scenario: 改车和普通生单
- **WHEN** 工具成功改普通车，之后Human在普通Web生单，或Host传旧工具参数
- **THEN** 前者普通订单无AI资格，不补计Agent建车；后者明确校验失败，不自动转换旧参数或沿用旧车来源折扣；旧未知请求须沿已明确的迁移恢复路径处理，不丢弃原键

#### Scenario: Human与工具交错加购
- **WHEN** Human商品A加购尚未返回，工具明确加购B
- **THEN** 两次add独立发送，不读取整车版本、不因全车busy拒绝，结果沿共享快照及逐请求恢复规则处理

## ADDED Requirements

### Requirement: 页面结果查询与主动移除
WebMCP SHALL 与Human复用本页主动移除即取消未提交选择的行为；所有首次新建走共享初始化身份的add，不再调用旧initialItems新建。提供独立只读get_request_result，查询不得触发原写或到期释放，继续原操作须另行明确调用。

#### Scenario: 页面工具移除后查询
- **WHEN** 页面工具明确移除已选A且删除失败，或用户仅要求查询未知生单
- **THEN** 前者A不自动选回；后者仅返回原请求已提交事实或暂未查到，不生单、不改车
