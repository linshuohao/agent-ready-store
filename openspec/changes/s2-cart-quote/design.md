# Design

状态：Approved / S2实施已授权。批准来源见[Proposal](proposal.md)：Human于2026-10-29明确“批准这部分规划，开始实施”。先前三项限定决定及批准来源保留；Git授权单独核对，运行行为尚待实施验证。

## Context

Observed：已 rebase 至 main `03c51eb`。现有 `apps/api/prisma/schema.prisma` 只有 Inventory；`apps/api/src/catalog/` 内 CatalogService 组合静态目录和运行库存，公开价格为两位字符串，目录解析内部仍用 JS number/JSON.parse。HTTP/MCP 共用只读用例，分别位于 Catalog 模块和 `src/mcp/mcp.adapter.ts`；结果/错误在 `src/shared/`，Prisma 连接在 `src/infrastructure/database/`。HTTP 统一结果、no-store，尚无车级写权限。Web 已有 Next 同源 rewrite、`src/features/product-discovery/`、商品页与 `src/components/ui/` 基础组件；没有 Cart、状态查询库或优惠实现。

Normative：基线与来源见Proposal Impact及D-04/T-05的S2限定补充。单Cart Token、来源不可伪造、唯一计价、独立购买确认等约束保持；Human已接受每车Cookie、单密文恢复及浏览器建车证明的现有方案方向和恢复限制，具体实现和运行证据仍待完成。L-01已解决为创建起24h及首次分享后完整24h。

Accepted切片边界：S2限定为普通Web/HTTP闭环，S4接MCP写工具、交接与有效Agent创建事实。S2 Pricing 仍验证 HUMAN/AGENT 两类可信领域输入，但不通过客户端参数或测试端点开放 Agent 优惠，不伪造真实 Agent 建车指标证据。

## Goals / Non-Goals

**Goals:** 用最小 Cart 持久化、纯 Pricing 与薄 HTTP adapter 支持两份新规格。沿已有架构复用，不新增进程/身份服务或通用凭证框架；完成建车、改车和报价的异常闭环。

**Non-Goals:** 本切片不建 Order 表、Checkout/确认上下文、Handoff 签发接口、MCP 写工具、长期恢复/清理系统。S2 的 canCheckout 表示当前内容可购买性，界面不显示可执行下单按钮。不提前给 S3～S6 增加占位服务。

## Decisions

### 1. 共享用例与接口

API 在 `apps/api/src/cart/` 内新增 CreateCart、GetCart、ReplaceCartItems、Cart 模块及纯 Pricing；HTTP adapter 只做边界解码、权限与响应。复用 `catalog/` 导出的可信能力、`shared/` 结果/错误及 `infrastructure/database/` 连接，AppModule 组合模块。contracts 保存 Zod 输入及 CartView/Quote 类型，不放服务端秘密/优惠实现。按实际需要提取最少接口，不复制目录投影或创建 Repository 框架。Web 的 Cart 功能放 `src/features/cart/`，商品发现仅接入加购操作，App Router 页面负责组合；通用 UI 继续放 `components/ui/`，不把所有业务组件堆入该目录。

| HTTP `/api/v1` | 草案输入/结果 | 约束 |
| --- | --- | --- |
| POST `/carts` | createRequestId、cartToken、items → CartView + Set-Cookie | HUMAN 固定；首次201、重放200；成功体不含 Token |
| GET `/carts/:id` | 对应车 Cookie → CartView | 受保护、no-store；不建车、不改库存 |
| PUT `/carts/:id/items` | expectedCartVersion、完整唯一 ID items → CartView | 对应车 Cookie、同源校验；整车原子替换 |

字段严格白名单。非法输入400，权限无效统一403（不泄露车是否存在），版本/幂等内容冲突409，商品或数量业务受阻409，依赖故障503；已确认凭证到期410。错误沿现有 Result，但加入有界 issues/当前版本的方式需要扩展 contracts，不能只返回不可操作的泛化错误。未授权错误不得携带 CartView。

每次最多100个唯一条目、JSON body最多64KiB（拟议资源限制，不是每商品限购）；超限明确400/413，不截断。单项数量正整数且不超过当前 Inventory；字段表示与现有 PostgreSQL Int 兼容。输入顺序无业务含义，按 ID 排序形成规范原始意图和报价指纹。

### 2. 最小持久化与并发

仅增加 Cart 表：id、origin、items(JSON)、version、createdAt、createRequestId、createPayloadHash、encryptedCartToken 以及创建去重约束。原始内容指纹独立于可变 items；version 初值1。创建键与 Token 的验证绑定采用带独立用途域的服务端 HMAC 指纹，作为浏览器创建作用域及唯一键材料，避免保存明文 Token；它只绑定幂等意图，不成为第二种访问凭证。具体列名在迁移细化中决定。

创建请求先做同源、严格格式及创建证明校验，按创建作用域和请求键查找已有记录。命中后验证原始 payload 指纹、Token与当前访问期限，直接读取该车当前内容、问题和报价；不再次要求原条目满足新建条件，不重写items、不恢复过期权限。只有真正的新请求才执行当前商品/数量/库存校验。

首次查找未命中仍可能遇到同键并发。短事务内先通过唯一键插入候选 Cart 取得创建归属；仅本次成功取得归属的请求执行当前业务校验，通过才提交，失败则整笔回滚候选行。冲突请求等待该键裁决后读取已提交原车，验证原始请求并走恢复分支，不先执行会受库存变化影响的新建校验。唯一冲突必须精确处理，不能宽泛 catch 后新建。此顺序避免“原车已成功，重试却因后续售罄被拒绝”，也不暴露未提交的无效 Cart。

PUT在一个短事务中取得目标Cart写锁，再按锁后服务端当前时钟重验权限/到期，随后以 `id + expectedVersion` 条件更新整车和版本，失败无部分写入。库存读是当前观察，不锁定或预留库存；并发库存减少由后续读取暴露，并由 S3 提交重验。持久化不保存报价或 quoteVersion。

读取时为每个保存的 ID 联合当前目录和库存；失效条目保留 ID/数量，不凭缺失目录虚构名称/单价。编辑可删除问题项；有效剩余整车才保存。服务故障不降级成不存在或空车。

不提前增加 handoffIssuedAt、完成标志、订单或指标字段。S4 在首次签发能力时增加交接事实，不能覆盖 S2 的既有 Cart 或把重复创建算成有效 Agent 创建。L-01已确认有限期限；S2按持久createdAt计算expiresAt=createdAt+24h，不新增可互推的到期字段。createdAt记录服务端校验成功并提交创建时的时间，重试保持原值。所有GET/PUT/创建重放在权限验证后按服务端时钟判定，now>=expiresAt拒绝；等待写锁后重验须用实时钟而非事务启动时冻结的时间。S4新增handoffIssuedAt时，访问谓词切换为首次分享时间+24h，不取两期限最小值；首次签发在同车锁下确认未完成且创建期尚有效。

### 3. 单 Token 与浏览器恢复方案

推荐继续 §9.3：浏览器用安全随机源生成32字节 Token及独立 requestId，仅在当前创建请求期间保留内存；Nest 使用 Node 标准认证加密保存随机 Token，稳定密钥由环境提供，不入库或日志。无需为一个调用引入 Token 服务或身份表。密文包含必要格式版本、nonce/tag；密钥缺失/错误应启动或调用失败，禁止生成新密钥静默替代。规划阶段不宣称算法和反代链已验证。

首次成功及有效重放设置 host-only HttpOnly 每车 Cookie，Path=/api/v1，SameSite=Strict，生产Secure；本地HTTP开发的Secure例外须显式配置。写接口只收 application/json 并严格验证 Origin 等于 WEB_ORIGIN，CORS不开放跨源凭证；GET不接受 body/header 任意 Token。POST 的 Token 用作唯一创建证明；普通 GET/PUT 仅收 URL 所指车 Cookie，不能拿另一车 Cookie 兜底。响应全 no-store、不入 RSC/Query持久缓存，反代/请求日志禁止 body/Cookie 记录。XSS 对创建瞬间 Token 仍有风险，Cookie不是该阶段的保护。

同材料请求在 API 重启后恢复原车和原 Token，不重新执行原 items。Cookie已送达则刷新后读原车；Cookie与内存均丢失时只能明确无法确认结果，不自动重复建车或仅凭ID恢复。此体验代价已由Human限定批准，来源见Human Review Queue。

比较：verifier-only 不能恢复后续 MCP 创建丢失的原秘密；创建身份握手增加生命周期和标签页协调；localStorage保存Token延长脚本可读暴露。单密文+当前请求内存及每车Cookie方向和体验限制已获Human接受；具体加密API/密钥配置/反代Cookie仍须实施验证，不以批准冒称运行通过。

### 4. Pricing 与报价语义

Pricing 在 API 内使用精确十进制，拟采用 decimal.js（实施前查官方资料与锁定版本）；比 BigInt 自建比例/舍入工具减少专门金额代码。商品价格从保真十进制来源构造；当前 Catalog 的 JSON.parse/number 链路是实际差距，应采用保留数字字面量的解析方式并验证与 S1 投影兼容，不能把 binary number 转字符串当保真恢复。是否新增解析库以实施时最小改动比较为准，不改变原件。

仅依赖可信 origin 和当前商品事实。公式唯一引用 Requirements §6；Quote 返回 items、subtotal、thresholdDiscount、aiDiscount、shipping、total 和 currency。quoteHash 为规范购买语义（ID/名称/数量/单价/各分项/适用优惠标识）的确定性摘要，排除时间、库存数量和 cartVersion。哈希不持久化、不授予购买权，未来 S3 重新计算和比较。

空车无 Quote/Hash；有效商品仅库存不足仍可估价但 canCheckout=false。零/负/缺库存或失效/零价行按 Spec 返回 issues及null报价。所有金额序列化为两位字符串，结果超过未来 numeric(20,2)范围明确拒绝。精确内部值与外部金额转换只在边界完成，避免多层重复转换。

### 5. Web 数据与页面

商品页窄 Client 加购控件调用普通 TS commands；浏览器通过既有同源 rewrite发送credentials，密钥/Token不进入 Server Component。当前页面的 Cart 协调 Hook/轻量Provider统一持有首次创建状态和请求材料，所有商品加购按钮共用；从接收第一次点击起同步关闭全部加购入口，创建成功后先设置 currentCartId 再恢复入口，不引入加购队列或跨标签初始化锁。期间第二次点击不接受、不排队，也不显示成功；按钮有可感知的进行中状态。Provider只协调当前页面交互，不持久保存权威车快照。

创建结果未明且材料仍在时，保持全页加购入口受控，显式重试复用同Token/同键/同原始条目，恢复成功后再接受新操作；创建明确未落库失败才允许顾客修正并发起新意图。若页面刷新导致材料与Cookie均丢失，沿既定无法确认提示处理，不自动新建。

已选当前 Cart 的后续加购是 GET后带版本的PUT；同页面加购/保存共享写入状态，一次只接受一项新的写意图。冲突要求重读并由顾客确认，不自动覆盖；跨标签竞争仍由服务端版本裁决。Commands保持无React/DOM依赖的普通函数，不持有当前车全局变量或锁。

PUT响应丢失采用Human已选择的方案A：页面保留原cartId、expectedCartVersion和完整items，仅在当前恢复流程内存持有，进入结果未明并暂停新写意图。GET读取版本仍等于原预期版本时，原事务可能尚在执行，不能认定保存失败或恢复普通编辑。提供明确的“重试原保存”操作；仅用户显式触发时重发同车、同预期版本、同完整条目，不重新计算增量、不换成最新版本，不由缓存库自动重试。恢复请求也只允许一个在途触发。

原PUT与恢复重试共用服务端原子版本条件；版本单调递增且不复用，故最多一个请求成功写入。重试成功可确认该次保存；版本冲突后GET最新车，版本高于原预期值说明所有仍在途的旧版本请求已不能再写入。若当前条目与原目标一致，提示“目前內容已符合原調整”；若不同，保留原草稿并显示冲突/差异，供Human重新调整，不推断原请求从未成功，也不自动覆盖其他入口的结果。恢复流程按cartId/原版本归属，已确认更高版本或成功后，原请求迟到的超时/冲突不能使界面退回失败/未知，较旧响应也不能覆盖新快照。

恢复重试再次超时、GET失败或读取仍为原版本时保持结果未明；单独一次业务校验拒绝也不证明其他在途请求已结束。访问失效则停止恢复并显示失效，不补发权限。页面离开/刷新可丢失内存草稿和恢复状态，浏览器中止请求不等于服务端回滚；重新进入后以原车当前快照为准，不自动重发旧操作或保证找回未保存草稿。方案A无需新增编辑操作记录表；验证覆盖原请求先提交、恢复重试先提交、第三方写入先提交三个顺序。

`/cart/[cartId]` 拥有编辑草稿，权威结果来自 API。首次创建/访问车后，在 sessionStorage仅记非秘密 currentCartId，导航链接恢复该车；cartId不授予权限。新标签无记录时可建新车，明确不承诺跨设备/自动找回全部车，也不建多车管理页。每车 Cookie 使已有 URL 的 A/B 标签各自可操作；每次进入URL车以URL为准。

请求按 cartId和版本归属隔离，切车/卸载取消或忽略迟到结果。保存失败保留草稿，后台重读不能覆盖脏草稿；读到新版本显示冲突并提供“读取最新后重新调整”。S2先用局部state与现有fetch，不为单一页面预装Query库/全局Store；发生真实复用需求再讨论。CartEditor、金额展示按实际消费者提取，金额组件仅展示服务端值。

界面沿用繁体中文、黑白极简、独立购物车页及轻量加购反馈；数量输入保留错误原值，移除用明确按钮，反馈可读屏感知、焦点稳定。准备结账处解释当前切片尚未提供购买功能，不跳入不存在的路由。

## Review修复选择（Human已选择A+A，2026-10-29）

- 冲突采用完整草稿与最新已保存内容对照。表单由草稿条目驱动，包括已被他端删除的条目；缺少当前商品事实时明确待重新验证，不沿用旧报价。全部提交项可见、可改量/移除；用户明确选择“以目前草稿儲存”或“放棄草稿，載入最新”，不做逐项自动合并。最新为空也能保存草稿或明确保存空车，失效条目可移除。
- 创建刷新采用sessionStorage标签页非敏感待确认标记。发请求前写入，仅表示存在未确认创建，不保存Token、请求键或条目；成功确认或明确拒绝时清除，网络/服务故障保留。刷新丢失内存材料后，先显示“建立結果無法確認”并阻止新写意图；用户明确重新发起时清除标记。原车不可恢复及可能留下不可访问旧车的代价沿既有批准；不新增恢复接口、身份或持久秘密。内存材料仍在时继续同材料重试。

## Risks / Trade-offs

- [两阶段期限切换] → 创建期固定24h、首次分享后完整24h；S2验证创建期与锁后到期，S4验证签发边界/统一切换，均不自动续期。
- [Token短暂可被脚本读取、Cookie数量随车增长] → 当前请求内存、每车隔离、少量并行车边界；不记录秘密，测试错车和反代Cookie。
- [建车成功但浏览器丢失全部证明] → 明确无法确认，不自动新建；Human已接受该限制，运行表现待验证。
- [目录解析改动影响S1] → 重跑相关Catalog边界与HTTP/MCP公开投影检查，保持原件、原排序/分页语义。
- [整车PUT与多标签编辑冲突] → 乐观版本拒绝覆盖，保留草稿；代价是用户需要重新调整。
- [报价随库存/目录变化] → 不承诺锁价或库存；现阶段展示当前快照，S3再次确认与重验。

## Migration Plan

批准后新增 Cart 迁移，不重置/重seed Inventory，不运行删卷。使用createdAt推导创建期截止，不另存expiresAt；首次分享事实由S4增量迁移承接。稳定加密密钥以安全环境配置跨重启保留，示例只含占位符。

先部署兼容新增表的API，再Web；S2前旧版本无Cart消费者。回滚应用时保留新增表与Cart数据和密钥，不用drop回滚销毁匿名凭证/意图；本地专用测试库按既有隔离规则清理。该步骤为规划，尚未运行迁移。

## Verification

| 风险/契约 | 计划证据 |
| --- | --- |
| 金额 | Requirements §6样例、990/1000两侧、一次满减、HALF_UP半分、非整数单价及行顺序；独立手算期望和明细对账，不从被测函数生成expected |
| Cart一致性 | 真实PostgreSQL+独立连接/barrier：同请求并发一车、同版本两写仅一胜、失败无部分保存、重启后重试当前车且不复原旧条目；成功丢响应后库存下降/售罄/商品失效仍恢复原车；覆盖首次查找未命中后同键并发提交，以及PUT恢复GET读旧版本后原请求/同版本重试/第三方写入各自先提交的顺序；断言写入次数、最终版本/内容和Inventory零净变化 |
| 权限/恢复 | 猜ID、错车、异Token同键、异内容、伪造origin/price、无Origin/跨站写、创建起24h截止前/等号/之后、编辑等待锁后到期、创建重放/Cookie重设不续期、body上限、密钥丢失、响应丢失；经真实Next反代验证Set-Cookie/HttpOnly和多车隔离 |
| 报价与错误 | 空车、失效/零价/异常库存/缺行、库存下降、同总额异内容hash变化、仅足量库存变化hash不变、DB错误不当空车 |
| Web | 桌面/移动加购、首次A/B快速点击仅一次创建、创建丢响应时所有入口受控且原材料恢复、已有车写操作互斥；PUT恢复读取旧版本仍为未知、显式重试保持原版本/完整条目、冲突后重读与相同/不同条目提示、再次超时/读取失败不误报、离页不自动重放；刷新、导航、改量/删除、保存失败、快速切车/迟到结果、键盘/焦点/反馈；真实读屏实测如无证据则明确披露 |
| 回归 | contracts/API/Web相关typecheck/lint/build；受影响Catalog与只读HTTP/MCP，复用未改变环境且仍适用的S1证据，不无条件重跑全部Host |

## Human Review Queue

1. **L-01 / Resolved、Accepted：** Human在本聊天收到三项建议后明确“批准这些建议”。未交接Human/Agent Cart创建起固定24h；有效期内首次分享后改用首次分享起完整24h，不被创建截止截短；到期等号拒绝，访问/编辑/重试不续期，过期不能首次分享。取代v0.5的不设预交接超时候选，接受旧车可能需重新发起的代价。规则正文与批准来源见 [D-04](../../../DECISIONS.md#d-04--交接链接有效期)，已传播Requirements及Technical Design相关章节。
2. **恢复与多车方向 / Accepted，运行未验证：** 接受单密文恢复、浏览器创建证明、每车Cookie及丢失内存+未收Cookie后无法恢复的体验限制；同材料仅在有效期限内恢复原车。不批准凭公共ID补发权限或自动重建。具体加密API/反代/密钥实现仍须验证，P-04长期恢复/保留/过期结果权限保持Pending。
3. **切片边界 / Accepted：** 接受S2 Web/HTTP，S4接MCP写工具、交接和有效Agent创建事实；S2 Pricing的AGENT分支仅为可信领域测试证据，完整交付目标保持。

三项待裁决建议已全部接受；Human随后明确“批准这部分规划，开始实施”，整份Change已获最终规划批准及S2实施授权，没有新增待裁决项。按适用Checkpoint交接后实施；Commit、Push、Merge仍单独核对，不把批准当运行通过。
