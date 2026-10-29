# Proposal

状态：Human Accepted / S4 已验收（保留真实 Human 链路证据缺口，见 Tasks）；2026-10-30（Asia/Shanghai）。Human 在修改后规划审核通过后明确回复“批准这次规划开始实施”，批准本 Change 的 Proposal、四份 Specs、Design 和 Tasks 并授权实施。Human后续明确“提交，然后实施”，规划已提交为 `d69b8c0`，规划 Checkpoint Guard 已通过；后续提交/Push/Merge须对应授权。

## Why

S3 已验收并合并，但 Agent 仍只能查询商品，不能将选购内容交给 Human 完成购买。S4 补齐已批准的基础 MCP 购物闭环，使真实 Agent 可建车、编辑、取得完整报价并分享同车，由 Human 在现有 Hosted Checkout 明确确认后原子成单。

## What Changes

- 在现有三个查询工具上增加 create_cart、get_cart、update_cart、create_handoff，共七工具；复用 Cart/Pricing/Order，不提供订单提交工具。
- 可信 MCP 创建固定 AGENT 来源，建车幂等绑定服务 principal、请求键与原始条目，支持响应丢失及服务重启后恢复同车同 Token。
- 首次交接持久记录时间：创建期有效且未完成时可分享；全部持有者此后共用首次分享起完整24h，重复分享/兑换/失败不续期。
- 链接通过 fragment 交付同一 Cart Token；浏览器先清除 fragment，再同源兑换每车 Cookie，随后进入原结算/编辑/独立确认流程。
- 首次分享不延长旧购买确认；区分确认到期与车权限到期，车仍有效时允许显式重新审阅，并等待新的明确购买点击。
- 记录并可本地核对有效 Agent 创建数；按 Cart ID 去重，编辑为空、过期或成交不撤销历史创建事实。
- 补充真实 Codex → Handoff → Human Checkout → Order/Inventory 证据及异常/竞态验证。

## Capabilities

### New Capabilities

- `agent-shopping`：受保护的七工具集合、可信来源、Agent 建车恢复及跨入口编辑/原结果读取。
- `cart-handoff`：同车分享、固定期限切换、fragment 兑换和接手体验。
- `agent-cart-metrics`：有效 Agent 创建事实、去重口径及本地汇总验证。

### Modified Capabilities

- `shopping-cart`：将已预留的首次分享规则落为本轮行为，补足 MCP 入口下的来源与创建证明语义。

## Impact

涉及 packages/contracts、Nest MCP adapter、CartService/Credentials/Controller、Prisma Cart 向前迁移、Web Checkout 入口与当前车选择、相关测试和 README。预计仅新增 Cart.handoffIssuedAt，无新服务、表或依赖；实现中如出现关键契约变化须升级。

依据：Approved [Requirements v0.2](../../../../docs/product/REQUIREMENTS.md) §3.2、§5～9、AC-02/08/09/12；Approved [Product Design v0.2](../../../../docs/product/PRODUCT_DESIGN.md) Agent 接手、EX-01～03；Approved [Technical Design v0.5](../../../../docs/engineering/TECHNICAL_DESIGN.md) §6、§8～10（含 S2/S3 限定补充）；Accepted [D-04](../../../../DECISIONS.md#d-04--交接链接有效期)、D-07、D-13、D-22 及 T-05 单 Token 演进。S3 确认/准入/结果权限沿[现有归档 Design](../2026-10-30-s3-hosted-checkout-order/design.md)，不重开已批准选择。

不包含 S5 WebMCP、S6 MCP Apps、Agent 代提交、真实支付、登录、长期过期结果查询、自动清理、分析后台、运营指标达标或公网发布。统计输出为本地受控操作；不新增第八个 MCP 工具。P-04 长期保留/额外结果访问继续 Pending；本轮保留无自动清理及到期拒绝读取的既有边界。
