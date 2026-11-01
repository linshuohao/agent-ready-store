# Spec Delta

## MODIFIED Requirements

### Requirement: Demo定位与可信字段
系统 SHALL 按cartId定位车，按orderId定位订单；两者同时提交须关联一致。服务端决定创建归因、价格及生单通道，拒绝客户端覆盖。Demo不提供车级访问隔离或自然人身份保证，仍保留既有服务入口认证及同源防护，不将商品评论视为操作指令。 本地MCP Demo仅按agent-shopping的「本地Demo入口模式」免除Token认证，其他边界不变。

#### Scenario: 参数混用和来源伪造
- **WHEN** 操作携带不一致的车/订单ID，或普通请求覆盖价格、origin、aiEligible
- **THEN** 拒绝不一致及越权字段；只看B订单不自动把当前购物目标从A变成B

#### Scenario: 零价缺库存与不存在操作目标
- **WHEN** 创建/add/set目标为零价P010、异常或缺库存商品，或对不存在行set/remove、把数量设为0
- **THEN** 明确拒绝且不部分修改；有效remove可删除已有问题行，未触及问题行保留，不因为其他问题行阻止合法目标操作

#### Scenario: 纯浏览与原ID不存在
- **WHEN** 无当前车时浏览、咨询或进入空车页，或尝试恢复不存在的已知cartId
- **THEN** 前者无持久建车/有效创建统计；后者明确不存在，不自动初始化替代车，首次明确写意图才使用新建分支

