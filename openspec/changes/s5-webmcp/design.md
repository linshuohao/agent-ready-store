# Design

## Context

Approved Planning（2026-10-30），批准依据与授权范围见 proposal.md。以下实现现状为规划时观察：cart/commands.ts 是无 React 的同源 HTTP 函数，CartProvider 协调建车材料、同页锁与未知结果；CartService.replace 锁车后校验权限/版本/完成状态并保存，来源原先固定不变。现有统计直接 count(origin=AGENT)，来源转换后不能继续这样推导创建事实。规划时尚无 WebMCP Adapter。

全局依据为 Approved Requirements v0.2、Product Design v0.2 和 Technical Design v0.5；来源转换是本轮明确增量。现有 agent-shopping 正式 Spec 只约束经过服务认证的基础 MCP，其创建/编辑规则不因 WebMCP 扩展改变。

## Goals / Non-Goals

**Goals:** 页面工具复用 Commands 与业务用例；转换原子、报价一致、旧确认失效；可独立核对真实浏览器/Host；保护既有有效创建统计。

**Non-Goals:** S6、Agent 自动提交购买、额外身份认证服务、通用工具框架、跨入口实时推送、公开部署或新增长期恢复权限。

## Decisions

### 1. 显式页面工具入口，业务用例共用

采用 imperative WebMCP Adapter，按页面注册并用生命周期取消机制清理。搜索工具更新 URL，由现有页面查询渲染，不额外并行取同一列表；详情/评论复用公开查询。购物工具调用普通 Commands，页面提供选择车、忙碌/草稿检查、刷新与导航回调。Adapter 不调用 Hook、不模拟 DOM 点击，不独立持有购物车 Store。工具名与精确 schema 在实现时按页面用途细化，不照搬服务器七工具。

替代方案：DOM 自动点击不能提供本轮要求的明确工具入口；另建 WebMCP 服务与已有前端能力重复；统一跨协议 Registry 无当前需求。

### 2. 来源通道与认证边界

建议增加同源 `/api/v1/webmcp/carts` 创建及对应 `/:id/items` 整车编辑通道。Controller 固定 AGENT 意图，复用普通浏览器车 Cookie、Origin/JSON 防护、建车证明/幂等与 CartService，不放行请求任意 source/origin 或报价。普通 `/carts` 行为保持。WebMCP 建车采用浏览器每意图证明命名空间，不借用基础 MCP 的全服务 principal 或把其秘密下发。

采用独立路由是为区分业务意图、审计和校验，不构成防伪认证：浏览器代码、请求路径或自定义 Header 均可被模拟。Human 已明确不要额外身份依据，并在获知可模拟限制后将来源防伪列为后续规划目标，本轮不做。按 D-07 S5 补充与 SEC-02 限定记录当前边界，不再将此项作为 S5 规划阻塞，也不能声称已防止模拟工具请求。替代“仅发送 source=AGENT”缺少清楚的普通/WebMCP 契约边界；服务秘密进浏览器不可接受。

### 3. 原子转换与报价/确认

WebMCP 成功写入在 Cart 事务与现有行锁内检查有效车权限、锁后期限、未完成、预期版本及整车条目，再一次写入 items、origin=AGENT 和递增版本，返回同一服务端报价。首次转换即使数量未变也递增版本；普通编辑不降回 HUMAN。搜索、读取、注册和失败不升级。合法清空编辑可转换来源，但空车无报价、不增加创建统计。

同车成单与转换使用既有锁及唯一订单约束：订单先提交则拒绝转换；转换先提交则旧版本确认失效。Human 必须重新审阅新报价并新点击；不把来源变化局限为总额变化。保留原 cartId、createdAt、handoffIssuedAt、凭证及权限截止。

### 4. 同页同步与未知结果

将工具写操作接入 CartProvider 现有协调，不绕开 busy/creation/pendingEdit；购物车页向协调层报告脏草稿。脏草稿或同页写入中返回结构化可行动错误；不静默覆盖，不自动丢弃。成功刷新当前车视图；用页面/车代次隔离迟到结果。Checkout 注册只读能力，禁止复用确认提交回调。

编辑恢复意图增加入口/目标来源。成功重读同一车后，inspectEdit 先比较当前版本与原 expectedCartVersion，再核对条目与目标来源：

- 当前版本未推进：保持结果未明，即使条目相同也不能据此认定原写入已完成；只允许显式使用原版本、原条目及原入口恢复。
- 当前版本已推进，条目相同且目标来源已满足：报告“当前符合意图”，不推断原请求一定成功。
- 当前版本已推进，但条目或目标来源不符合：返回冲突并附最新快照，解除本次结果未明的等待状态，保留原草稿供核对；即使条目相同但仍为 HUMAN，也不能继续归为未知。原版本已被推进，原转换请求不可能再以该版本成功，不自动重试或改用新版本覆盖。

读取失败不推导写入结果，继续沿用权限失效或技术故障的明确反馈。冲突后只有显式核对并重新发起，才使用最新版本建立新写意图。创建重试保持同通道、请求键、证明和原始条目，来源升级不能破坏 HUMAN 原创建重放。

### 5. 有效创建事实保持原口径

建议 Cart 增加不可变 `agentCreated` 布尔事实：迁移前来源不变，历史 AGENT 可据旧 origin 回填 true、HUMAN false；后续只有 MCP/WebMCP 合法非空 Agent 创建写 true，普通创建 false，来源转换不修改。汇总查询此事实，不再依赖可变 origin。原车来源供优惠使用；不改变 agent-cart-metrics 正式 Spec 或声称接手等于创建。无需通用事件表。

### 6. 浏览器与 Host 兼容性先实测

2026-10-30 核对的官方文档使用 `document.modelContext`；注册清理由 signal 管理，旧 navigator API/注销接口不能直接照抄。实现前记录实际可用 Chromium/Host 及 API 版本，功能检测且仅在有效页面能力就绪后注册。没有所需环境时保留未验证状态，不用 polyfill 或测试扩展模拟成功替代真实 Host 验收；不因官方支持 Chrome 就假定当前 Codex 工具链可调用。

来源：[Chrome WebMCP](https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/webmcp)、[Imperative API](https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/agentic-javascript-tools)、[规范草案](https://webmachinelearning.github.io/webmcp/)。API 仍需以实测版本锁定，当前未运行浏览器验证。

## Risks / Trade-offs

- 无独立调用者证明 → Human 已将来源防伪后置，限定记录见 D-07 S5 补充；本轮保留既有权限防护，Origin/专用路由不能证明 Agent 身份。后续扩展部署或信任边界时重访。
- 普通车升级影响金额、确认与创建统计 → 事务/并发反例及独立不可变创建事实，使用真实 PostgreSQL 验证。
- 浏览器/Host 尚未确认可用 → 实现首项能力预检；具体支持结论留真实证据，不提前承诺兼容。
- 组件共享协调易遗漏脏草稿或迟到响应 → 保留页面状态所有权，桌面/移动回归并验证切车/离页。

## Migration Plan

先完成 Planning Review、Human 整体批准、提交授权与高风险规划 Checkpoint，再进入实施。迁移只新增/回填创建事实，保留 Cart/Order/Inventory；不 seed 或清理。验证迁移前后创建统计一致。

来源转换上线后不能直接回退到仅按 origin 统计的旧版本；回退前停用 WebMCP 新写入口并保留来源及创建事实，使用兼容旧数据的应用修订，不把已获优惠车批量降回 HUMAN。完成订单快照不改写。全局基线的限定补充与正式 Spec 同步按批准/验收阶段处理，不先改历史归档。
