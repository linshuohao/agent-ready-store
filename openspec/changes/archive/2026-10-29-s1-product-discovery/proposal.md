# Proposal

## Why

让 Human 与真实 Codex 能从同一商品目录完成浏览、查询详情与评论的只读闭环，并尽早验证 Next.js、NestJS、Inventory 和 MCP 的实际连接。按最小充分设计推进，先取得 S1 运行证据，再扩展后续切片。

## What Changes

- 规划最小 pnpm Workspace、Web/API/PostgreSQL 本地运行及 S1 检查入口。
- 提供商品列表、详情、独立评论分页，以及共享用例的 NestJS HTTP 与 Streamable HTTP MCP 三个只读工具。
- 将运行 Inventory 与只读目录组合，保留异常样本、限制公开字段与查询结果边界。
- 遵循 [AGENTS 默认执行原则](../../../../AGENTS.md#默认执行原则)及既有工作流，Design/Tasks 只记录 S1 适用细节与证据。

**批准与实施授权：** Human 于 2026-10-29 在本聊天明确“规划已批准，开始实施”，批准本 Change 当前规划（含 P-02 查询细化及自查修复），授权 S1 实施。此前仅规划授权由本条扩展；最终 Slice 验收、Git Commit/Push/Merge/发布权限仍独立。

S1 非目标：Cart/Quote/Checkout/订单、WebMCP、MCP Apps、S2～S6 基础设施、复杂 CI/CD/监控/设计系统、公开部署。后续切片的完整交付范围不变。

## Capabilities

### New Capabilities

- `product-discovery`：Web 与 Agent 共享的有界商品查询、详情、评论和公开可购买状态。

### Modified Capabilities

无；当前没有正式业务 Spec。

## Impact

实施涉及 `apps/web`、`apps/api`、`packages/contracts` 和最小 Compose/Inventory 持久化；本轮按已批准 Tasks 实施 S1，原有治理与规划修改保留。

依据：Requirements v0.2 §4、Product Design v0.2 §2/4/6、Technical Design v0.5 §5.1/5.4、§6.2、§8.1、§10.1～10.2 及附录 A/B；Accepted T-03/04/06。已批准架构直接沿用；附录中的查询参数、DTO、错误码等候选由本次 Change 批准细化，不改写全局历史批准范围。

### Dependencies

预检事实与缺口见 [Preflight Report](preflight.md)。实施需要兼容且锁定版本的 Node/pnpm、Next/React、Nest/MCP SDK、Prisma/PostgreSQL，以及本地 Docker/Compose 和可连接 Nest 的真实 Codex Host；不依赖 S2～S6、既有其他项目数据库或公网服务。基础工程设施在任务组 1 建立。

### Acceptance Outcomes

S1 验收须取得：可复现的 dev/production 运行；Web 列表/详情/查询/评论闭环；真实 PostgreSQL Inventory 初始化与重启保留；HTTP/MCP 正常与错误语义一致；真实 Codex 完成三个只读工具调用；基础质量检查、关键集成/E2E 与 S1 页面可用性证据。具体风险与验收节点见 Design/Tasks。以上为 S1 验收目标，实际执行结果见 Tasks；最终验收仍归 Human。
