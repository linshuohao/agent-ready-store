# Tasks

状态：Approved / S3实施已授权（2026-10-30，Asia/Shanghai）。Human在修订后定向Review交付后明确回复“批准，然后开始去实施”，批准本Change的Proposal、三份Specs、Design与Tasks并授权实施。Git提交/Push/Merge与归档须对应授权；进入实现前须完成规划Checkpoint与Guard。

此前规划状态与来源（历史记录）：状态：Planning Draft；以下全部为未执行的实施/验证任务。三项限定边界已由Human确认；完整规划与实施授权待取得。进入Implementation前，依Git Checkpoint Policy对本Change及关联决策/基线补充完成规划Checkpoint与Guard，不以CLI产物齐全代替Human批准。

## 1. 数据与确认基础

- [ ] 1.1 在packages/contracts定义Review/Order严格DTO与CartView完成标记，复用Quote金额类型；以非法字段、越权价格/来源、快照序列化及原S2 DTO回归验证，更新相应接口说明。
- [ ] 1.2 在Prisma增加唯一Order及Cart.checkoutEpoch，生成向前迁移；在专用store_test保留既有S2车/Inventory升级，验证默认epoch、唯一键、限制删除及无历史数据丢失，并记录迁移/前向修复步骤。
- [ ] 1.3 实现独立用途密钥派生、浏览器会话绑定、与Review时Cart访问截止一致、无独立短倒计时的签名确认及完整购买摘要指纹；以篡改、错会话/错车、期限等号、超过五分钟仍有效、同总额换内容、关键描述变化、仅足量库存变化等契约反例验证，不修改原件。

## 2. 审阅、恢复与原子订单

- [ ] 2.1 提取最少Cart授权/摘要复用能力并实现同车锁内Review递增epoch、返回受阻或完整确认；以真实DB验证提交先锁、Review先锁、Review响应丢失及重启三类顺序，普通GET无订单不作为失败证明，受阻Review也须完成旧确认隔断。
- [ ] 2.2 实现Cart锁→按ID有序库存锁→完整重验→数据库clock_timestamp最终准入→条件扣减/唯一订单写入；用真实DB多连接争购、多商品中途失败、写单故障与同车并发验证无超卖、无半单、最多一次扣减，测试不使用定时sleep猜测执行顺序。
- [ ] 2.3 实现同车原订单读取、有效权限内重试返回原快照、完成车拒绝编辑/创建重放不复原；用真实DB覆盖提交/编辑两个顺序、目录改变后重试、commit后丢响应及服务重启，不把未知DB异常当作成功。
- [ ] 2.4 完成准入期限与有界锁等待验证：Cart锁等待到期、Inventory锁等待到期、确认期限等号、准入后跨截止仍完整提交、到期后拒绝查询/重试；记录实际超时预算与原事务仍在途时的结果语义。
- [ ] 2.5 提供薄HTTP Review/Order endpoints与no-store、Cookie、Origin/JSON和严格输入验证；在真实API覆盖两浏览器/多车、伪造确认、缺车能力、会话Cookie竞态、未授权信息泄漏及读接口404不证明失败。同步README新增接口/错误/权限与恢复说明。

## 3. Web购买与恢复旅程

- [ ] 3.1 组合Checkout/Order App Router页面与features局部状态/commands，复用金额展示及购买摘要；以桌面/移动Playwright完成原车→审阅→明确点击→快照，检查明细完全来自服务端、同步commit后返回成功、无待支付状态/支付倒计时、无自动提交、无秘密进入RSC/持久缓存。结果页使用按cartId隔离的成功响应内存快照，覆盖准入后跨截止仍展示成功、刷新后按权限查询和内存丢失/切车不串单。
- [ ] 3.2 实现changed/blocked/expired及原车编辑返回路径、完成车只读和明确开始新购物；以并发编辑、同额不同内容、库存减少、空车及A→B迟到响应验证旧确认不重新启用，失败原车内容保留；更新对应操作说明。
- [ ] 3.3 实现Unknown有限GET查询、手动Review屏障、非敏感待确认标记及刷新恢复；以真实API配合可控断连覆盖“GET无订单后原提交commit”、屏障先行阻断迟到提交、恢复再断连/超时和到期，不自动重试POST或隐藏建车。
- [ ] 3.4 验证首次会话Cookie/多标签审阅冲突、键盘焦点与状态公告、移动布局及完整金额可读；记录实际浏览器证据，未做真实读屏则明确保留限制，不以自动检查代替。

## 4. 集成、Review与交付

- [ ] 4.1 将S3真实DB/API测试接入现有CI：补足显式API用例入口与专用测试配置，DB破坏性套件串行且与运行API场景隔离；验证未配置时skip不计通过，记录实际本地及GitHub Actions运行结果/限制，不自动Push触发远程。
- [ ] 4.2 按受影响范围运行contracts/Cart/Pricing/Catalog/HTTP/MCP回归及typecheck、lint、build、format检查；复用未改变环境的有效证据，新失败先定位修复重验，README启动/迁移/恢复命令与实际行为一致。
- [ ] 4.3 依ai-native-review路由对金额、事务、权限与Unknown竞态做一次独立只读代码审查；核实修复后定向重验/复核，记录准确范围及结果；如无法取得独立上下文，明确标记自查并保留独立审查待办。
- [ ] 4.4 汇总真实运行证据、未解决限制、分支/提交/未提交范围及Human验收入口，完成适用Delivery Checkpoint/Guard；Human验收失败则定向修复再交付，不能自动开始S4或宣称完整Agent购买交付。

## Planning evidence

2026-10-29：本轮读取ai-native-workflow、openspec-propose、brainstorming、ai-native-review与verification-before-completion，使用原生OpenSpec 1.15.0新建spec-driven Change。仅规划与已有文档补充，无安装、迁移、业务代码或运行测试。规划审阅为当前上下文聚焦自查，不冒称独立Review；已执行`openspec validate s3-hosted-checkout-order --strict`通过，四类产物状态齐全；本地链接/锚点、新文档空白、原Web场景保留及16项未执行任务检查通过，`git diff --check`通过。聚焦自查补充了受阻Review必须提交恢复栅栏、技术回滚不能证明安全重试的约束；没有独立Reviewer或业务运行证据。

2026-10-30：按Human纠偏移除独立5分钟期限，同步澄清事务生单与成交快照不可变；保留同步请求丢响应的恢复需求。前轮P2-1通过消除独立确认超时路径处理；P2-2补充成功响应内存快照展示及刷新权限场景。此次仍为规划修订与定向自查，无业务实现或运行验收。

## Workflow follow-up

- 当前交付止于规划；取得完整Planning Approval、实施授权与Git提交授权后才可完成相应Checkpoint并进入apply，三者不互相替代。
- Human验收及对应授权后同步正式Specs、归档本Change，按授权提交/合并/Push；不将归档计为预先完成的实施任务。
