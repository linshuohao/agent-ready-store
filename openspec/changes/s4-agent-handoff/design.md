# Design

状态：Approved / S4 实施已授权（2026-10-30，Asia/Shanghai）。Human 在修改后规划审核通过后明确回复“批准这次规划开始实施”，批准本 Change 并授权实施。Git 提交/Push/Merge 仍须对应授权，规划 Checkpoint 与 Guard 完成后才进入实现。动机、有效基线与非目标见 [Proposal](proposal.md)。

## Context

Observed：起点 main `42596bf`，工作区干净，S3 已合并；当前规划分支 codex/s4-agent-handoff-planning。OpenSpec 1.15.0，原生 spec-driven；本轮创建前无活动 Change。

现有 MCP 使用单一 MCP_SERVICE_TOKEN 认证及 Host/Origin 限制、无状态 Streamable HTTP，仅暴露三个 Catalog 工具。CartService 已有唯一计价、每车密文、浏览器创建幂等、版本控制、Cart 行锁、checkoutEpoch 与唯一订单；权限和确认截止仍按 createdAt+24h。Cart 没有 handoffIssuedAt，Credentials 仅支持匹配而非恢复明文；CartController 只接受浏览器 Cookie。CheckoutPage 挂载即 Review，必须在 Handoff 兑换完成前阻止该请求。

Normative：沿 Proposal 引用的 Approved/Accepted 范围，S3 的会话确认、锁后准入、恢复栅栏和过期结果限制继续有效。以下接口、principal 表达与统计实现原为本轮拟议细化，现随本 Change 获 Human 批准；不反推此前已经批准，不另冒充全局 Accepted Decision。

## Goals / Non-Goals

**Goals:** 以同一 CartService 为写入权威，薄适配 MCP 和兑换端点；使期限、创建恢复、购买确认和指标口径可由真实 DB/API/Host 证据核对。

**Non-Goals:** 不抽通用仓储/权限框架、不引入第二种 Token、会话表、事件总线或跨 Host 实时同步；不把匿名会话当自然人认证，不在本轮加入其他 Agent 协议。

## Decisions

### 1. 复用用例与最小协议契约

向 CartModule 导出既有 CartService，main 给 attachMcp 注入同一服务；HTTP 和 MCP 仅提供受信上下文，禁止把 MCP 请求体当浏览器 cartCreateInput。提取创建公共内部步骤，浏览器路径继续固定 HUMAN、由浏览器提供 Token；Agent 路径只接收原键/条目，服务端生成 Token、固定 AGENT。不复制计价、条目校验、事务或订单投影。

保留既有 Result envelope（ok/data 或 error/requestId），MCP structuredContent 与文本表达相同结果；沿现有错误语义，不把 503/异常伪装成空车。新增 Zod 严格输入/输出契约及有界 body；列表精确七工具，无 submit/review 工具。

| MCP 工具 | 输入 | 成功 data |
| --- | --- | --- |
| create_cart | createRequestId、items（1～既有最大条目数） | cart:CartView、cartAccessToken |
| get_cart | cartId、cartAccessToken | cart:CartView、order:OrderResult或null |
| update_cart | cartId、cartAccessToken、expectedCartVersion、items（沿既有可空整车规则） | CartView |
| create_handoff | cartId、cartAccessToken | cart:CartView、handoff:{url,issuedAt,expiresAt}、requiresHumanConfirmation:true |

CartView 不含秘密，报价沿现有可空 Quote/问题列表；get_cart 在同车一致读取中取得完成标记及原订单，不签确认、不增 epoch，完成后的当前估价与历史成交明确分开。读工具准确标只读；update 为修改，create/handoff 按实际副作用标注，幂等提示不承诺自动重试安全。原三个查询工具及其契约不改。

### 2. Agent 建车证明与同 Token 恢复

本地单共享服务身份对应稳定的内部 principal `store-mcp-v1`，仅在验证 MCP_SERVICE_TOKEN 后由 adapter 注入；不是客户端字段，不宣称每个 Host/自然人隔离。同 principal 的调用者共享创建键命名空间，应使用随机 UUID 请求键。未来多租户身份须另行设计。

使用现有密钥派生的独立用途 HMAC 将 principal 映射为 createScope，与浏览器 Token scope 域隔离；不保存 Bearer Token，不因认证 Token 轮换改变已认证服务的 principal。唯一键仍为 (createScope, createRequestId)，原条目规范排序/哈希规则复用现有逻辑。

首次事务生成随机32字节 Token、绑定 cartId 加密，验证非空有效条目后提交 AGENT Cart。并发使用唯一键/冲突后读取收敛，仅成功插入者计一次；失败候选 Token 丢弃。重放必须锁原 Cart 再读取当前事实，校验原 payload、统一期限并从现有密文恢复同 Token，不重校验原始条目是否仍可新建、不重置原车或创建时间。完成车在有效权限内仍可恢复原能力及完成标记。

Credentials 提取受控解密，保持 AES-GCM/cartId AAD，现有 matches 复用；密文损坏/密钥错误明确技术失败，不补发 Token/Cart 或静默降级。另一 principal 不对应原 scope，仅凭公开 ID/请求键不能领原秘密；持有效车 Token 的读/编辑按既有 bearer 能力，不增加 principal 所有权锁。

取舍：复用已接受的单密文和唯一键即可跨重启恢复；不新增恢复表或把首次请求 Token 暴露给客户端生成。共享服务身份不是独立顾客身份，不能据此解释统计人数。

### 3. 首次交接串行化与期限唯一来源

Cart 只新增可空 handoffIssuedAt（timestamptz，旧行 null）；统一 expiresAt=(handoffIssuedAt ?? createdAt)+24h。公共期限函数替换 authorize、view、Review 签名截止及提交最终准入的 createdAt-only 计算，避免漏改造成接口不一致。旧签名自身 expiresAt 保持不变，首次分享不签新确认、不重置 epoch/版本或完成事实。

create_handoff 在现有3秒有界车锁内验证 Token、当前统一期限、无订单，锁后读取 clock_timestamp；首次写入前再次以当前 DB 时间检查创建截止，以该准入时刻为 issuedAt。准入后允许当前短事务完成；若响应在截止后才到达，以持久 issuedAt 为准，不能重试生成新期限。已分享时仅返回原 issuedAt/链接与当前车，不续期；已完成始终拒绝再签。空车/库存受阻不妨碍分享调整能力，但不能获得购买确认。

分享、创建重放、编辑、Review、Submit 使用同 Cart 锁顺序，库存锁仍排在 Cart 后；首次分享与购买串行化。分享先执行时 Submit 仍必须同时满足 Cart 当前截止和原确认截止，其余会话/hash/epoch/版本重验不变；成单先执行时分享被拒绝。普通 GET 不需要推进 epoch，不建设分布式锁或新状态机。

编辑锁后判断同样使用当前统一截止：未分享取 createdAt+24h，已分享取 handoffIssuedAt+24h。验证反例为创建第23小时首次分享、编辑等锁跨创建第24小时但仍早于分享截止：权限、版本及条目有效时允许保存；只有等锁跨当前统一截止才拒绝，不能额外保留原创建截止作为第二道期限。

### 4. 链接兑换与浏览器接手

固定格式 `${WEB_ORIGIN}/checkout/{cartId}#handoff={cartAccessToken}`，不接受 redirectUrl。新增 POST `/api/v1/handoffs/exchange`，严格 JSON `{cartId,cartAccessToken}`，沿精确 Origin、body 大小限制及 no-store；拒绝 query/x-cart-token/畸形 body、重复或冲突的同车 Cookie。没有对应 Cookie或相同 Token 时允许兑换；不同车 Cookie 不干扰。验证该车已首次分享、Token 匹配且当前权限有效，完成车可兑换以便显示原订单，不签新链接/确认。

返回 CartView 并设置与现有属性相同的 cart_<id> HttpOnly、SameSite=Strict、host-only、/api/v1 Cookie，expires 等于统一截止；Secure 沿现有显式本机 HTTP 例外。成功的浏览器 Cart 响应可按服务端当前截止刷新对应 Cookie，不改变服务端期限；曾持较早 Cookie 的浏览器若已丢失 Cookie，须重开原有效链接，不能按 ID 恢复。不覆盖其他车权限，不延长 checkout_session 或已有确认。

在 Checkout 外包最小 Client 接手门：读取当前 fragment 后立即 history.replaceState 清除，再校验材料并兑换，兑换完成前不挂载/启动现有 Checkout Review。只在 Client 内存保留材料，成功后清除，失败不回显 Token；不用 RSC、URL query、storage、通用缓存或埋点传秘密。next.config 现有反代复用，body 日志和错误投影须核查此新路径，避免仅保护旧 carts 前缀。

无 fragment 时保持普通 S3 入口；有非法 fragment 必须显示错误，不能忽略后使用旧 Cookie 进入另一意图。成功兑换再以 cartId/请求代次核对当前路由、更新现有 CartProvider 选择后进入 Checkout，编辑回原车；切车/卸载后的迟到响应不驱动导航或状态。兑换响应未知时允许内存原材料显式重试；刷新后若 Cookie 未到达，提示重开原链接，不在清除 fragment 后承诺自动恢复。已存在的未知购买标记仍交现有 S3 恢复处理，不被兑换清除。

Handoff 接手显示可信 AGENT 来源与AI优惠、完整金额、调整原车入口和明确确认。到期在同页独立失效状态说明重新购物；服务故障显示可重试反馈；已完成由原流程展示原订单。沿用繁体中文和现有桌面/移动布局，不新增第六核心页面。

**确认到期恢复：** 现有 Checkout 将 confirmationExpiresAt 的计时到期和 CREDENTIAL_EXPIRED 都映射为车过期；S4须修订该映射。Cart权限到期继续返回 CREDENTIAL_EXPIRED/410；签名/会话合法但确认自身到期返回 CONFIRMATION_EXPIRED/409（初次验证及库存锁后最终准入均适用），保持车权限先校验、有效权限内已有订单优先回原结果的顺序。新增错误通过共享契约/HTTP严格投影，不更改原确认截止或创建新查询权。

Client 的 ready 计时到期只清旧确认并进入可重新审阅状态，提示“確認資料已到期，請重新審閱”，不能仅凭本地时间断言车过期；提交收到 CONFIRMATION_EXPIRED 也走该路径。用户显式重新Review后由服务端裁决：ready展示最新摘要并等待新点击，success显示原成交结果，车权限已到期才终止，技术故障仍走S3未知/恢复流程。不得自动提交、自动新建或清除既有未知购买标记；ready计时器不驱动submitting/unknown/success状态，也不能因客户端到期覆盖已知成功。若旧Cookie已经到期丢失，沿上文规则重开原有效链接，不凭车ID补权限。

取舍：先清 fragment 避免后续导航携密；代价是刷新可能失去尚未兑换的内存 Token，需要原链接重开。这属于既有材料丢失恢复限制的局部应用，须纳入 Human 规划审阅。

### 5. 指标最小落点

所有生产 AGENT Cart 只由非空且全量有效的首次创建提交产生，origin/createdAt 永久不因编辑/到期/成交改变，现无自动删除，因此现有 Cart 行即可表达有效创建事实。受控本地只读脚本统计 origin=AGENT 的唯一 Cart ID 数，输出总数与“有效创建车数，不是独立顾客”的口径，不输出 Token/条目/订单，不增加公开 HTTP 或第八工具。

不按当前 items 非空、当前可购买状态或是否成交过滤，不用进程内计数器，不新增事件表/分析库。迁移前核对现有 AGENT 行是否存在、是否来自受控 fixture；若发现生产历史行不保证此不变量，暂停指标部分交 Human 决定事实补记，不盲目追认。未来清理 Cart 前必须先设计保留有效创建事实及订单去重，本轮不删数据。

### 6. 验证与真实证据

自动验证以四份 delta 为准：contracts/计价一致性及凭证负例；真实 PostgreSQL 同请求并发、重启恢复、首次分享锁等待与统一期限、分享/编辑/Review/订单竞态；HTTP/MCP 契约、fragment/Cookie 兑换及桌面/移动 E2E。并发测试使用可控制屏障，不以 sleep 时序或 Mock 证明 DB 原子性。对期限函数所有调用点作定向审阅，特别是最终准入和确认 expiresAt。

真实 Codex Host 调七工具并生成真实链接；Human 打开、编辑并明确确认，核对原车 ID、AGENT 来源、完整金额、同车唯一订单和库存前后值。记录 revision、环境、命令/实际输出及未验证项，脱敏服务 Token、Cart Token、Cookie 和带 fragment 的完整 URL；截图/录影亦不得泄密。模拟协议测试与真实 Host 分列。不能由自动化替 Human 验收或伪造真实购物对话；未取得真实证据时保持未完成。

## Risks / Trade-offs

- [同 bearer Token 可被所有持有者读/编辑及模拟浏览器] → 保留已接受匿名边界；服务凭证不单独授予车权，购买仍走独立会话确认。
- [首次分享后所有入口期限改变，旧 Cookie/确认不自动变长] → 统一服务器计算，Cookie 按当前事实重设；旧确认保持原期限，重新 Review 才取得新材料。
- [清 fragment 后刷新丢失材料] → 原有效链接重开；不偷偷持久化秘密或自动新建车。
- [Host/聊天保留建车 Token 与交接链接] → 明确它们是受限能力，证据脱敏；不把 MCP 输出或可分享链接称为公开无敏感数据。
- [依赖 Cart 行统计] → 本轮无删除，origin 不变；清理或引入其他 AGENT 创建路径前重访事实留存设计。

## Migration Plan

仅在完整规划批准且获实施授权、规划 Checkpoint/Guard 满足后：新增可空 handoffIssuedAt，保留现有 Inventory/Cart/Order，不 seed、不删卷、不回填伪造分享时刻。验证旧 HUMAN 车按 createdAt 原期限运行、既有订单和确认不变；更新 API/contracts/Web 的同一交付版本。

一旦签发过 Handoff，不可回退到忽略 handoffIssuedAt 的旧权限代码，否则已承诺的完整24h被截短。故障时停新建/签发/购买入口并保留数据库，前向修复；任何破坏性回退需 Human 明确决定。归档/同步主 Spec 仅在实施验证、Review、Human 验收和对应授权后进行。

## Open Questions

P-04 长期保留及额外过期结果访问仍后置，沿无自动清理/到期不再读取的既有边界。S5 的 WebMCP 可信来源、S6 的 Host 能力不由本轮解决。没有留给实施自行选择的新业务权限；若上述边界不能成立须停止依赖部分并升级。
