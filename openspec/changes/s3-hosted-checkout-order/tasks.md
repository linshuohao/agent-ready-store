# Tasks

状态：Approved / S3实施已授权（2026-10-30，Asia/Shanghai）。Human在修订后定向Review交付后明确回复“批准，然后开始去实施”，批准本Change的Proposal、三份Specs、Design与Tasks并授权实施。Git提交/Push/Merge与归档须对应授权；进入实现前须完成规划Checkpoint与Guard。

此前规划状态与来源（历史记录）：状态：Planning Draft；以下全部为未执行的实施/验证任务。三项限定边界已由Human确认；完整规划与实施授权待取得。进入Implementation前，依Git Checkpoint Policy对本Change及关联决策/基线补充完成规划Checkpoint与Guard，不以CLI产物齐全代替Human批准。

## 1. 数据与确认基础

- [x] 1.1 在packages/contracts定义Review/Order严格DTO与CartView完成标记，复用Quote金额类型；以非法字段、越权价格/来源、快照序列化及原S2 DTO回归验证，更新相应接口说明。
- [x] 1.2 在Prisma增加唯一Order及Cart.checkoutEpoch，生成向前迁移；在专用store_test保留既有S2车/Inventory升级，验证默认epoch、唯一键、限制删除及无历史数据丢失，并记录迁移/前向修复步骤。
- [x] 1.3 实现独立用途密钥派生、浏览器会话绑定、与Review时Cart访问截止一致、无独立短倒计时的签名确认及完整购买摘要指纹；以篡改、错会话/错车、期限等号、超过五分钟仍有效、同总额换内容、关键描述变化、仅足量库存变化等契约反例验证，不修改原件。

## 2. 审阅、恢复与原子订单

- [x] 2.1 提取最少Cart授权/摘要复用能力并实现同车锁内Review递增epoch、返回受阻或完整确认；以真实DB验证提交先锁、Review先锁、Review响应丢失及重启三类顺序，普通GET无订单不作为失败证明，受阻Review也须完成旧确认隔断。
- [x] 2.2 实现Cart锁→按ID有序库存锁→完整重验→数据库clock_timestamp最终准入→条件扣减/唯一订单写入；用真实DB多连接争购、多商品中途失败、写单故障与同车并发验证无超卖、无半单、最多一次扣减，测试不使用定时sleep猜测执行顺序。
- [x] 2.3 实现同车原订单读取、有效权限内重试返回原快照、完成车拒绝编辑/创建重放不复原；用真实DB覆盖提交/编辑两个顺序、目录改变后重试、commit后丢响应及服务重启，不把未知DB异常当作成功。
- [x] 2.4 完成准入期限与有界锁等待验证：Cart锁等待到期、Inventory锁等待到期、确认期限等号、准入后跨截止仍完整提交、到期后拒绝查询/重试；记录实际超时预算与原事务仍在途时的结果语义。
- [x] 2.5 提供薄HTTP Review/Order endpoints与no-store、Cookie、Origin/JSON和严格输入验证；在真实API覆盖两浏览器/多车、伪造确认、缺车能力、会话Cookie竞态、未授权信息泄漏及读接口404不证明失败。同步README新增接口/错误/权限与恢复说明。

## 3. Web购买与恢复旅程

- [x] 3.1 组合Checkout/Order App Router页面与features局部状态/commands，复用金额展示及购买摘要；以桌面/移动Playwright完成原车→审阅→明确点击→快照，检查明细完全来自服务端、同步commit后返回成功、无待支付状态/支付倒计时、无自动提交、无秘密进入RSC/持久缓存。结果页使用按cartId隔离的成功响应内存快照，覆盖准入后跨截止仍展示成功、刷新后按权限查询和内存丢失/切车不串单。
- [x] 3.2 实现changed/blocked/expired及原车编辑返回路径、完成车只读和明确开始新购物；以并发编辑、同额不同内容、库存减少、空车及A→B迟到响应验证旧确认不重新启用，失败原车内容保留；更新对应操作说明。
- [x] 3.3 实现Unknown有限GET查询、手动Review屏障、非敏感待确认标记及刷新恢复；以真实API配合可控断连覆盖“GET无订单后原提交commit”、屏障先行阻断迟到提交、恢复再断连/超时和到期，不自动重试POST或隐藏建车。
- [x] 3.4 验证首次会话Cookie/多标签审阅冲突、键盘焦点与状态公告、移动布局及完整金额可读；记录实际浏览器证据，未做真实读屏则明确保留限制，不以自动检查代替。

## 4. 集成、Review与交付

- [x] 4.1 将S3真实DB/API测试接入现有CI：补足显式API用例入口与专用测试配置，DB破坏性套件串行且与运行API场景隔离；验证未配置时skip不计通过，记录实际本地及GitHub Actions运行结果/限制，不自动Push触发远程。
- [x] 4.2 按受影响范围运行contracts/Cart/Pricing/Catalog/HTTP/MCP回归及typecheck、lint、build、format检查；复用未改变环境的有效证据，新失败先定位修复重验，README启动/迁移/恢复命令与实际行为一致。
- [x] 4.3 依ai-native-review路由对金额、事务、权限与Unknown竞态做一次独立只读代码审查；核实修复后定向重验/复核，记录准确范围及结果；如无法取得独立上下文，明确标记自查并保留独立审查待办。
- [ ] 4.4 汇总真实运行证据、未解决限制、分支/提交/未提交范围及Human验收入口，完成适用Delivery Checkpoint/Guard；Human验收失败则定向修复再交付，不能自动开始S4或宣称完整Agent购买交付。

## Planning evidence

2026-10-29：本轮读取ai-native-workflow、openspec-propose、brainstorming、ai-native-review与verification-before-completion，使用原生OpenSpec 1.15.0新建spec-driven Change。仅规划与已有文档补充，无安装、迁移、业务代码或运行测试。规划审阅为当前上下文聚焦自查，不冒称独立Review；已执行`openspec validate s3-hosted-checkout-order --strict`通过，四类产物状态齐全；本地链接/锚点、新文档空白、原Web场景保留及16项未执行任务检查通过，`git diff --check`通过。聚焦自查补充了受阻Review必须提交恢复栅栏、技术回滚不能证明安全重试的约束；没有独立Reviewer或业务运行证据。

2026-10-30：按Human纠偏移除独立5分钟期限，同步澄清事务生单与成交快照不可变；保留同步请求丢响应的恢复需求。前轮P2-1通过消除独立确认超时路径处理；P2-2补充成功响应内存快照展示及刷新权限场景。此次仍为规划修订与定向自查，无业务实现或运行验收。

## Workflow follow-up

- 当前交付止于规划；取得完整Planning Approval、实施授权与Git提交授权后才可完成相应Checkpoint并进入apply，三者不互相替代。
- Human验收及对应授权后同步正式Specs、归档本Change，按授权提交/合并/Push；不将归档计为预先完成的实施任务。

## S3 implementation evidence — 2026-10-30

- 规划Checkpoint：`bd03b84`；逐文件Planning Guard通过。实施沿本Change，未扩展S4或支付范围。
- TDD：严格提交DTO、确认会话校验、真实DB用例和浏览器结账入口均先观察缺失行为失败再实现。数据库故障注入/锁屏障只在store_test中使用，不增加生产测试端点。
- 迁移：在专用库临时schema中从S2结构插入既有Cart(version=3)/Inventory(quantity=7)，应用S3迁移后验证数据保留、epoch=0、Order为空；仅清除临时schema。未删除演示库或持久卷。
- 独立审查：全新只读上下文审查`bd03b84`后的实际Diff与未跟踪源码/测试，发现两项P2（完成车重试前置会话拒绝、新旧摘要差异缺失）；均有失败回归、修复，审查者定向复核确认代码层关闭。Reviewer未冒称独立执行测试；实际重验由实现者运行。
- 构建：宿主Turbopack因临时端口权限失败；相同`pnpm build`在项目已有Compose容器内通过。typecheck/lint/format均用真实命令核对。
- 限制：远程GitHub Actions本轮未触发，不冒称远程CI通过；真实读屏、真机及完整多浏览器验收未执行。浏览器使用桌面/移动Chrome模拟，订单/恢复并发事实由真实PostgreSQL与HTTP测试补证。数据保留及到期后额外查询仍按P-04；无外部发布或S4真实Agent购物证据。

### Final verification / retained limits

- `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`git diff --check`、OpenSpec strict validate通过；容器中`pnpm build`通过（含两条新动态页面路由）。
- `TEST_DATABASE_URL=.../store_test pnpm test --no-file-parallelism`：57 passed，HTTP/MCP的7项在该阶段按配置skip；另阶段真实HTTP/MCP 8 passed（含后加的首次会话并发场景），不把skip当通过。未配置环境的本机套件33 passed，其余明确skip。
- 浏览器桌面/移动共60项覆盖：最终全套56 passed，另4项旧夹具在开发Strict Mode重复GET时失败；修正初始拒绝应持续至创建开始的夹具后，4项定向重验全通过。前一轮旧CartView缺orderId和结算消耗低库存样品的问题已修正；S3购买使用P003隔离低库存S2编辑样品，没有放宽业务验证。复用其余56项有效证据，不伪造“最后单次命令60通过”。
- S3真实DB12项覆盖多车争购/同车唯一、版本与完整语义变化、会话错误、受阻Review栅栏、订单写入故障回滚、多商品失败、Cart/Inventory锁等待到期、原提交在途时无订单查询及恢复串行化、准入后跨截止及原单快照重启读取。升级测试另验证既有行保留。
- S3 Web 8项桌面/移动覆盖明确键盘购买、成交快照刷新、后续查询失效仍展示已收到成功、丢响应后刷新并显式恢复、改车后差异展示/新点击；结果页截图已实看桌面布局。真实读屏/真机/其他浏览器、远程CI仍未验证。
- 独立Reviewer对两项P2定向复核确认代码层关闭；最终真实HTTP与E2E包含对应失败→修复→通过的回归。Human产品验收及归档待进行，不提前同步正式Specs或开启S4。
