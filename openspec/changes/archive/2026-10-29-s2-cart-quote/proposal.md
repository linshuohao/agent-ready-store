# Proposal

状态：Approved / S2实施已授权（2026-10-29，Asia/Shanghai）。Human在规划审查及三项限定决定接受后，明确“批准这部分规划，开始实施”，批准本Change的Proposal、Specs、Design和Tasks并授权S2实施；先前限定决定的批准来源保留。Git提交、Push、Merge及后续切片仍需对应授权。

## Why

交付状态（2026-10-29）：S2实施、Review及Human验收已完成，Human进一步明确授权归档；正式Spec同步与归档使用已验收契约。规划批准来源、L-01/恢复限制及分期决定保持，验证证据与保留限制见Tasks。

S1 已交付 Web、HTTP 与真实 Codex 的商品发现；顾客仍无法把选品保存为可编辑购物车或获得统一报价。S2 建立购物车与报价的 Web 闭环，优先验证金额、持久化、访问权限、创建重试和编辑冲突，为 S3 的最终确认与订单提供可信输入。

## What Changes

- 新增普通 Human 购物车创建、按 ID 读取、整车替换条目；列表/详情加购提供轻量反馈，独立购物车页支持改量、删除、空车和错误状态。
- 以唯一 Pricing 实现已批准的 TWD、满减、AI 折扣及运费规则；对外仅返回结构化报价，Web 不计算优惠。
- 新增持久 Cart、版本并发控制、创建幂等及车级权限；不预留或扣减库存。S2 普通 HTTP 创建固定 HUMAN，不能由客户端伪造 Agent 来源。
- 已有创建请求先验证证明并恢复原车，后续库存/目录变化不阻断幂等恢复；Web 首次加购统一协调并禁用页面内全部加购入口，避免不同商品同时创建多车。
- 沿Human已接受的Technical Design §9.3/9.4恢复方向，采用单凭证恢复与每车Cookie；接受首次材料/Cookie均丢失后无法自动恢复的限制。L-01已确认为未交接创建起固定24h，有效期内首次分享后使用完整24h；S2仅实现创建期，S4接入首次分享期限切换。
- S2不开放最终购买入口。S3负责Checkout/Order；S4负责MCP建车/编辑/交接与有效Agent创建事实；S5/S6负责WebMCP/MCP Apps。S2/S4分期已获Human限定批准，完整交付目标保持。

## Capabilities

### New Capabilities

- `shopping-cart`：车级访问、创建幂等、数量校验、持久编辑、版本冲突及 Web 购物车体验。
- `cart-pricing`：当前购物车的唯一精确报价、分项金额、不可购买问题及报价语义指纹。

### Modified Capabilities

无。S1 `product-discovery` 查询与公开字段保持既有契约；加购是新增购物车操作。

## Impact

- `apps/api`：基于main `03c51eb` 的源码分层，在 `src/cart/` 新增Cart/Pricing与HTTP adapter，复用 `src/catalog/`、`src/infrastructure/database/` 和 `src/shared/`。当前 schema 只有 Inventory，不提前建立 Order、确认记录或 Handoff 服务。
- `packages/contracts`：新增 Cart/Quote 输入输出与错误结构；共享契约不承载优惠实现或秘密。
- `apps/web`：在 `src/features/cart/` 组织商品加购、导航与commands/局部状态，接入现有 `features/product-discovery/`，由App Router组合 `/cart/[cartId]`；复用通用UI及Next同源代理。现有只读 `publicApi` 不适合作为带 Cart Cookie 的浏览器写客户端。
- 拟使用 API 内精确十进制库，依赖版本、许可和 Node 24 兼容性在实施前核对并锁定；草案阶段不安装依赖。需要独立稳定的凭证加密密钥配置。
- 依据：Requirements v0.2 §5/6/9.1、Product Design v0.2 UX-03/§6、Technical Design v0.5 §5.5/9/10.2/附录 A.3，及 D-05/07/09～13/18。以上基线 Approved；技术文档内 Proposed 和 Pending 保留其状态。
- 验收聚焦：真实 PostgreSQL 的建车幂等/并发编辑/重启恢复、金额边界与对账、车级隔离、Web 加购编辑及相关 S1 回归。草案无实现或新增运行证据。
- 三项决定及来源见Design的Human Review Queue；本次最终规划批准及实施请求已取得。进入业务实施前按适用Checkpoint完成交接；CLI结构校验不代替运行验证或Git授权。
