# Proposal

状态：Approved / S3实施已授权（2026-10-30，Asia/Shanghai）。Human在修订后定向Review交付后明确回复“批准，然后开始去实施”，批准本Change的Proposal、三份Specs、Design与Tasks并授权实施。Git提交/Push/Merge与归档须对应授权；进入实现前须完成规划Checkpoint与Guard。

此前规划状态与来源（历史记录）：状态：Draft / Planning。Human 于 2026-10-29（Asia/Shanghai）回复“嗯，按这组建议去形成”，确认下列三项限定边界并授权形成规划；尚未批准完整规划、业务实施或 Git 提交/Push/Merge。

2026-10-30补充：Human明确要求按Cart截止时间调整确认材料，并澄清同步生单、成交价格固定、无支付步骤；本次授权仅修订规划，完整规划/实施/Git授权仍待取得。

## Why

S2 已交付购物车和统一报价，但顾客尚不能完成购买。S3 以普通 Web 购物为入口，交付可明确确认、整笔成单与扣库存、可恢复未知结果的最小购买闭环，为 S4 Agent Handoff 复用。

## What Changes

- 增加 Hosted Checkout 审阅、独立且与Cart访问截止一致的确认上下文、Human 点击提交与订单结果页；编辑返回原车，任何关键内容变化均重新确认。
- 增加同车唯一订单、成交后价格不可变的快照及真实 PostgreSQL 原子扣库存；成功车只读，原车重试返回原结果。
- 明确点击后在同步请求的短事务内完成生单与扣库存，不设置支付倒计时或待支付状态。确认材料无独立5分钟期限，内容/版本/会话失配或重新审阅仍使旧材料失效。
- 结果页优先展示成功响应中的临时内存快照，刷新后查询仍受原访问期限约束。
- 未知结果以原车查询和可阻止迟到提交的恢复操作处理，不因一次无订单而开放第二次购买。
- Human 本次确认：获得 Cart 和所需库存锁、完成重验后，用数据库当前时间作最终准入；准入前到期拒绝，准入后允许短事务完成。
- Human 本次确认：S3 只在原 Cart 权限有效时读取原结果，到期不新增凭证或续期；不引入自动清理，不删除 Cart/Order/去重事实，长期保留期限继续 Pending。
- 修改购物车体验契约以开放 S3 结账，并限制成功车编辑；S1/S2 金额规则与可信来源保持。

## Capabilities

### New Capabilities

- `hosted-checkout`：完整摘要、确认绑定、显式交互状态及未知结果恢复。
- `order-placement`：原子订单/库存、同车唯一性、准入期限与受保护快照读取。

### Modified Capabilities

- `shopping-cart`：成功车只读、有效权限内返回原订单标记，购物车提供真实结账入口；取代 Web 体验中 S2 不开放购买的阶段限制。

## Impact

- 依据：Requirements v0.2 §5～8、§9.1、§11 P-04，Product Design v0.2 §2～6，Technical Design v0.5 §3/5/8/9/10.2，Accepted D-01/02/04～07/18/21，以及本次三项限定确认。其余 Proposed 实施细节保持待审状态。
- API：复用 CartService、Catalog、priceCart、Prisma 和 Result；新增 Checkout/Order 用例及薄 HTTP adapter，无新增进程或外部服务。
- 数据：仅新增 Order 与 Cart 恢复栅栏字段，保护现有 Cart/Inventory；不运行迁移、安装或修改业务代码。
- Web/contracts：新增 DTO、确认/订单功能和路由，复用 MoneyBreakdown 与现有 UI；确认秘密不进入 RSC/持久缓存。
- 非目标：S4 交接/MCP 写工具、S5/S6、Agent 代提交、登录/支付/物流、长期查询权限、自动清理及新增查询状态库。
- 验收：真实数据库事务/并发/故障注入，HTTP 权限边界，Web 主线与异常旅程；本轮仅规划，无新增运行验证。
