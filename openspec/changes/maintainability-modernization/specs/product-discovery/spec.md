# Spec Delta

## MODIFIED Requirements

### Requirement: 批量查询入口一致与单目标兼容
系统 SHALL 在只读HTTP及MCP批量查询间保持同一数据、筛选、排序及错误语义；合法旧单目标输入继续返回原Page形状，新增批量结果由显式kind区分。单目标也采用新文字匹配规则。所有读入口保留认证及适用Origin/Host/输入边界，不引入服务端搜索会话或交易副作用。 本地MCP Demo仅按agent-shopping的「本地Demo入口模式」免除Token认证，其他边界不变。

#### Scenario: 新旧调用并存
- **WHEN** 旧客户端传q，或新客户端传queries，或同时传两种模式
- **THEN** 前两者分别获得原Page和grouped结果，后者被拒绝；无Apps的Host仍得到全部组状态及可读摘要

