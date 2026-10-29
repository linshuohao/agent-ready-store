# Design

状态：Approved / S3实施已授权（2026-10-30，Asia/Shanghai）。Human在修订后定向Review交付后明确回复“批准，然后开始去实施”，批准本Change的Proposal、三份Specs、Design与Tasks并授权实施。Git提交/Push/Merge与归档须对应授权；进入实现前须完成规划Checkpoint与Guard。

此前规划状态与来源（历史记录）：状态：Proposed / 待规划审查与Human批准。Proposal列明的三项限定决定及2026-10-30确认期限/同步生单补充已确认；其余确认绑定、恢复栅栏、DTO及事务方案均为本Change拟议实现，不冒充Accepted工程决策。

## Context

Observed：规划起点main `0474471`，工作区干净；S2已归档。Prisma只有Inventory与Cart，Cart已有版本、JSON条目、创建幂等和加密Token。CartService的PUT持Cart行锁并锁后读取clock_timestamp；GET计算当前报价；无Order、浏览器确认会话或恢复栅栏。HTTP通过每车HttpOnly Cookie、精确Origin和JSON限制写请求；这些材料不构成独立确认会话。

现有priceCart输出完整金额和quoteHash，但哈希不含品牌/规格等关键描述，不能原样冒充完整购买摘要指纹。目录在单进程生命周期内不可变，库存来自PostgreSQL；沿当前单实例边界工作，不新增热更新/分布式目录机制。版本升级/重启后的目录变化仍须被新旧摘要比较发现。

Normative：动机、有效基线与授权见[Proposal](proposal.md)。三项Human限定决定的正式记录见[DECISIONS S3补充](../../../../DECISIONS.md#s3-checkout-boundary-20261029)。Requirements/Technical Design中P-04历史Pending由该限定记录局部补充，不等于长期查询/保留全部解决。

## Goals / Non-Goals

**Goals:** 复用现有Cart/Pricing/HTTP/数据库基础，以短事务和最少持久字段支持安全确认、唯一成单及重启恢复；将关键竞态变成可控制执行顺序的真实数据库测试。

**Non-Goals:** 不建持久Submitting/订单任务表、队列、授权中心、通用状态机或仓储接口框架；不为将来接入增加空模块。现有普通fetch/局部React状态足够，无新增客户端状态库。

## Decisions

### 1. 最小接口与数据边界

使用薄Checkout/Order模块调用同一Cart授权/快照构造能力；按实际复用提取必要函数，不复制目录投影或计价。扩展共享DTO/Zod与现有Result，不另造错误协议。

| HTTP `/api/v1` | 输入与结果 | 约束 |
| --- | --- | --- |
| POST `/carts/:id/checkout-review` | 空JSON → 完整summary、cartVersion、purchaseHash、confirmation、confirmationExpiresAt，或受阻/原订单 | 同源、车Cookie、会话绑定；持Cart锁推进恢复栅栏，既是审阅也是明确的恢复屏障 |
| POST `/carts/:id/orders` | 仅confirmation → OrderResult | 新购买须有效车能力、会话、签名、栅栏、版本、完整摘要；已有订单在有效车权限内回原快照 |
| GET `/carts/:id/order` | 无body/query → OrderResult或ORDER_NOT_FOUND | 只读，不推进栅栏；404绝不表示其他请求已终止 |
| 既有GET/创建重放 | 扩展CartView：orderId为可空标记 | 不生成确认，不在Cart估价中重算历史成交金额 |

写请求沿用精确Origin/JSON；拒绝越权字段、query Token与冲突凭证。权限失败403、已确认过期410、版本/语义/栅栏变化409、受阻409，技术故障503；延续现有严格错误投影，不能泄露秘密。错误新增代码如CONFIRMATION_INVALID/STALE、PURCHASE_CHANGED、CART_COMPLETED，实施时在contracts中锁定。全部私有响应no-store。

OrderResult按原车路由读取（建议Web `/orders/[cartId]`，字段明确为cartId），不增加订单ID直接查询权限；Web Checkout为 `/checkout/[cartId]`。结果页优先使用本次成功响应提供的、按cartId匹配的Client临时内存快照；仅在没有该快照（刷新/直接打开）时GET读取原订单，不增加到期后的服务端查询权限。

### 2. 会话绑定与确认有效性

现有Cart Cookie是可分享能力，没有可复用的浏览器会话。因此Review在缺少会话Cookie时设置独立随机32字节HttpOnly会话Cookie，host-only、SameSite=Strict、Path=/api/v1，Secure策略复用本机HTTP例外；浏览器会话关闭后不保证保留。它不授予任何车访问权，不创建账户或会话数据库。

服务端签名确认封装cartId、cartVersion、purchaseHash、checkoutEpoch、会话绑定摘要、issuedAt和expiresAt。HMAC使用现有稳定CART_ENCRYPTION_KEY派生独立用途密钥，域与Cart创建/加密分离；签名不泄露Token/Cookie，不新增密钥存储服务。确认expiresAt等于此次Review时服务端确定的Cart访问截止时间，不增加独立5分钟期限，不代表锁价、预留库存或等待支付。后续Cart生命周期变化不重签或延长已有签名材料；S4首次交接切换期限后如需新的确认截止，须重新Review，不自动延长旧材料。服务端严格验证字段/大小与签名，比较会话绑定；确认仅在Client内存，刷新重新Review。

购买摘要从服务端当前目录/库存与priceCart输出构造，包含ID、名称、品牌、规格等实际关键描述、数量、单价、全部Quote、来源及适用规则标识；以规范字段/稳定排序计算purchaseHash，不含库存余量/取数时间。沿用quoteHash作为金额语义信息，不修改既有Pricing规则。避免把catalogRevision整体变化当作任意车都要重新确认的依据；只比较本次完整购买内容，另保存目录/规则版本作溯源。

并发首次Review可能分别设置会话Cookie，导致一份确认绑定失效；客户端按请求归属丢弃旧响应，失败明确重新Review，不能降级为只绑定Cart Token。匿名边界保持：持Cart Token者可模拟浏览器；该设计防跨会话搬用，不能证明自然人。

### 3. 恢复栅栏替代持久提交任务

在Cart增加checkoutEpoch（默认0，单调递增的大整数，对外签名中用十进制字符串）。每次显式Review在短事务中锁Cart、验证有效车能力、查唯一订单；已完成直接返回原结果。未完成则递增epoch并取得当前摘要，可购买时签发绑定新epoch的确认；业务受阻作为结果提交epoch后返回，不能通过抛出异常回滚栅栏却声称旧提交已结束。技术异常导致事务回滚则不提供安全恢复保证。

**关键性质：Review返回前，所有旧epoch提交要么已完整结束，要么未来必被拒绝。** 提交和Review都先持同一Cart行锁，提交锁后核对epoch：

1. 原提交先锁车：Review等待，随后只能看到已提交订单或已回滚的无订单状态。
2. Review先锁车：推进epoch并提交；迟到原请求锁车后因旧epoch被拒绝。
3. Review响应丢失：保持未知，可再次显式Review；重复推进只撤销旧确认，不产生订单。

普通GET未查到订单不能替代此屏障。Unknown期间先有限只读查询；未发现订单时用户可明确选择“確認原提交結果並重新審閱”，调用同一Review屏障。刷新/重新进入也必须Review，防旧请求迟到；普通Cart读取和进入编辑页不自动推进epoch。

选择该方案而非新attempt表/持久Submitting：单个栅栏加同车锁即可阻止旧请求，不需要记录每个网络请求状态或后台清理。代价是同车任何新Review都会使其他标签/浏览器旧确认失效，提示重新审阅；购物车访问权、条目和版本不因此改变。恢复/Review锁等待超时仍为技术未知，不返回安全失败证明。Unknown界面在屏障完成前不开放编辑；其他持能力入口的编辑仍由版本/成单锁保护。

### 4. 原子提交与最终准入

生单采用同步HTTP请求：Human点击后，服务端在本次短事务中完成重验、订单保存与库存扣减，commit后才返回成功。没有异步生单任务、待支付状态或支付倒计时；事务行锁只在事务期间持有，成交价格固定依靠持久快照而非长期持锁。同步请求仍可能丢响应，故保留Unknown与幂等恢复。

按固定顺序在单个短事务内执行：

1. 取得目标Cart行锁；验证车能力和当前期限，查同车唯一Order，存在则有效权限内回原快照，早于旧确认校验。
2. 未成单时验证会话/签名/epoch/版本；按productId排序锁定所有所需Inventory行，缺行阻止购买。
3. 从锁后库存与当前目录构造完整摘要，重验可购买性、数量和purchaseHash；变化回PURCHASE_CHANGED（不顺便签新确认），库存不足整笔拒绝。
4. 全部锁与重验完成后，以数据库clock_timestamp再次核对Cart与确认截止，完成最终准入；不使用事务开始的now()代替。准入前到期拒绝，准入后允许本次短事务完成并返回本次结果。
5. 按同序条件更新库存（quantity>=请求量）并插入唯一Order；任一受影响行数不符/插入失败则全部回滚。Order.cartId唯一约束兜底，不把任意DB异常当作重复成功。

Cart编辑也必须在同Cart锁内查Order并拒绝完成车；Review/提交/编辑锁顺序一致，不能先取库存再取Cart。库存条件更新保留不变量，即使其他库存写入者不遵守预读约定也不超卖。缺失库存行不回退JSON。

沿PostgreSQL默认Read Committed与显式行锁，不新增Serializable自动重试。事务不含网络或前端交互，使用现有Prisma超时机制并为锁等待设置有界预算；具体数值在真实测试中调校并留证，不静默多层重试。客户端超时和服务端异常仍可能是Unknown，禁止缓存库自动重试POST。

### 5. 最小持久化与成交投影

Order：id(UUID)、cartId(UUID唯一外键/限制删除)、createdAt、cartVersion、purchaseHash、catalogRevision、pricingRuleVersion、origin、snapshot(JSON)。snapshot保存服务端明确字段投影，包括ID/名称/品牌/规格、数量、单价、行小计、全部金额分项和币别；不存评论、秘密或内部毛利。写入前用公开Order DTO约束，历史读取只验证快照，不补取当前目录字段。Order存在即完成，不新增可漂移的Cart完成布尔值。

GET Cart可继续表达当前估价，但orderId存在时canCheckout=false，Web优先展示完成及原快照入口，不将当前估价标为成交价。创建重放保持既有有效权限/原材料规则并返回完成标记。所有新消费者上线时同步contracts；保留S1公开字段及既有Cart字段，新增orderId并更新严格DTO测试。

### 6. Web状态与恢复

在features/checkout和features/order下组织Client流程与普通commands；App Router页面壳不读取确认秘密。复用features/cart/money-breakdown及必要PurchaseSummary，不预抽packages/ui。明确loading/reviewing/ready/submitting/changed/blocked/unknown/success/expired，按钮能力从状态派生。

提交前在sessionStorage写仅含cartId的非敏感待确认标记；不存确认材料或会话秘密。服务成功/已知原子拒绝清标记；技术失败保留。刷新若有标记先走Unknown恢复入口；即使标记缺失，初始Review屏障也阻止旧提交迟到。恢复失败保留未知，不自动新建/购买。轮询最多3次且仅串行安全GET，预算耗尽继续提供手动查询/恢复；页面隐藏/卸载停止客户端查询，不声称服务端交易取消。

版本/语义变化清旧确认并展示新旧差异，新的Review完成后等待新点击。空车/问题车不启用确认；编辑入口返回原车，回来重新Review。跨车/乱序响应按cartId和本地请求代次隔离，旧响应不得恢复确认或覆盖成功。成功响应的OrderResult保留在跨路由仍存活的轻量Client内存中，并按cartId匹配后展示；不将订单写入URL或localStorage/sessionStorage，不强制二次GET。准入后跨截止但成功响应已到达时仍展示该已知成功，不能因本地计时或额外GET失败将成功降级为Unknown/Expired。刷新失去内存后才重新按权限查询，过期拒绝仅表示无法再次读取，不证明购买失败。新购物/切车时清理对应显示归属，避免串车。已完成车不再加购/编辑；当前车指向已完成车时明确让用户开始新购物，不自动新建隐藏车。

保持繁体中文、现有视觉方向、完整金额、键盘操作、可见焦点与反馈公告；桌面/移动验证错误与Unknown等异常，不仅检查成功截图。

## Risks / Trade-offs

- [准入后越过到期仍可能成功] → 已获Human限定确认，测试锁前/锁后/准入后三个边界，原响应可交付结果，后续读取不延长权限。
- [到期后成功但无法再查询] → 已收到成功响应则展示其内存快照；响应未知或刷新丢失结果后按Human确认保留查询限制，不能虚构失败或补发凭证。
- [新Review撤销其他标签确认] → 显式409及重新审阅；只阻止旧提交，不改变车能力，不新增任务系统。
- [匿名持能力者可模拟确认] → 保持已接受匿名限制，签名/会话绑定不冒称自然人认证。
- [数据库故障与长锁等待] → 短事务、固定锁顺序、有界超时；以可控并发屏障测试，不以Mock证明真实事务。
- [当前目录无法在线修改] → 以隔离目录fixture/进程重启验证语义变化，绝不修改references原件。

## Migration Plan

仅在完整规划批准并授权实施后：新增Order表/唯一键/限制删除外键与Cart.checkoutEpoch默认0的向前迁移，保留Cart/Inventory及既有数据。生成客户端并验证已有S2车可继续读取/编辑/进入新Checkout；不seed、不删卷。

回退先停新购买入口并停旧版本API写入，保留Order/epoch/库存。已有订单后不通过drop表或恢复旧API写逻辑回退，否则完成车可能再次编辑；采用前向修复或经Human确认的维护方案。迁移失败停止上线，不自动修改数据。S4后续接入同车串行化及首次分享期限，不能重置epoch或完成事实。

## Open Questions

长期保留期限、过期后新的结果访问方式仍为P-04，不影响本次已确认的“无自动删除、到期停止查询”边界。没有以Open Question留给实施自行决定的业务契约。

## S3 acceptance refinement — 2026-10-30

沿Human实际验收反馈，将全站品牌和购物车入口合并至保持视口顶部的Header，导航始终可用；空购物车入口不依赖已创建的持久Cart。建车继续发生在首次加购，不进行后台自动初始化。订单“开始新的购物”清除当前车选择后直接进入商品列表，旧订单不被改写。

结算/订单共用PurchaseSummary展示：桌面商品卡与金额摘要分栏，移动端上下排列；商品、金额和动作区保留明确间距。确认购买为唯一主购买操作，编辑原购物车/继续选购为次级导航；订单主操作返回新购物旅程，另可查看原车。动作通过当前真实消费者的React展示插槽组合，不抽取新业务框架。金额仍来自原Quote/Order，样式变动不修改计价与确认机制。
