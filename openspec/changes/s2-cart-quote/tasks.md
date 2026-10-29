# Tasks

状态：规划Approved、S2实施已授权（2026-10-29，Human；来源见Proposal），全部任务尚未实施。范围见 [Proposal](proposal.md)，实现与验证依据见 [Design](design.md) 和两份 [Cart](specs/shopping-cart/spec.md) / [Pricing](specs/cart-pricing/spec.md) 规格。

实施交接条件：规划复核已完成，Human已明确批准整份S2规划并发起实施，L-01等决定已记录并传播。按最新版Git Checkpoint Policy，本Change涉及金额、幂等和权限不变量，进入实施及需要交接的高风险任务组前形成适用Checkpoint并运行Guard；不以任务数量机械增加提交。Git授权仍独立核对，任务完成以真实实现和验证为准。

## 1. 精确报价与共享契约

- [x] 1.1 在 contracts 定义严格 Cart 输入、CartView/Quote、Money/问题及错误结构；明确资源上限、版本和报价指纹语义，不放入 Token 输出或优惠实现。
- [x] 1.2 在 API Cart 模块实现唯一服务端 Pricing，核对并锁定精确十进制依赖；改造 `apps/api/src/catalog/` 价格入口保留十进制来源，同时保持 S1 公开字段、异常数据和排序分页契约。
- [x] 1.3 验证 Requirements §6 样例、990/1000边界、一次满减、AI优惠、HALF_UP半分、金额对账/溢出、空车和受阻估价，以及语义指纹的正反例；补受影响Catalog回归。

## 2. Cart 持久化、幂等与版本

- [x] 2.1 添加最小Cart schema/迁移，使用持久createdAt推导创建起24h截止，不存重复expiresAt；读取/编辑/创建重放均拒绝now>=截止时刻，PUT取锁后使用服务端实时钟重验。保留Inventory数据，创建原始意图和当前items分离，不存派生报价；首次分享字段及期限切换留S4。
- [x] 2.2 在 `apps/api/src/cart/` 实现 CreateCart/GetCart/ReplaceCartItems，复用 Catalog 导出能力与既有 infrastructure/database；先识别和恢复已有创建请求，仅新请求执行当前库存校验，以唯一键事务仲裁首次查找未命中的并发；整车原子保存/条件版本递增，编辑后重放不覆盖新内容，读取保留失效问题项，不预留/扣库存。
- [x] 2.3 在专用真实PostgreSQL以独立连接/barrier验证创建同键并发/异内容、同版本双写、失败候选行回滚、持久重启恢复；覆盖“成功丢响应→库存下降/售罄/商品失效→重启重试”及首次未命中后另一请求提交的时序；另覆盖PUT恢复GET读旧版本后，原请求/同版本同条目重试/第三方写入各自先提交的顺序，断言同版本最多一次写入成功、最终版本/内容、原访问能力和Inventory零净变化。

## 3. 车级权限与 HTTP

- [x] 3.1 按批准设计实现浏览器创建证明、Token认证加密、稳定环境密钥、每车Cookie与到期访问规则；缺密钥拒绝，响应/日志不泄漏秘密，不凭公共ID恢复。
- [x] 3.2 在 Cart 模块添加创建/读取/整车替换HTTP adapter，由 AppModule 组合，固定普通HUMAN来源、严格Origin/JSON/输入白名单/body上限、no-store及可操作错误；复用 `src/shared/` Result/AppError 并验证对现有只读接口兼容。
- [x] 3.3 验证错车、猜ID、异证明同键、伪造origin/price、跨站写；覆盖创建起24h截止前/等号/之后、等待写锁期间到期、编辑/创建重放/Cookie重设不续期；经真实Next同源代理验证Cookie与权限，包含A/B并行车和响应丢失/有效原材料重试/密钥错误。S4首次分享切换仅作为兼容约束，不伪造本切片运行证据。

## 4. Web 加购和独立购物车

- [x] 4.1 在 `apps/web/src/features/cart/` 增加页面协调Hook/轻量Provider、无React依赖commands和加购反馈，接入product-discovery列表/详情；首次创建同步禁用全部加购入口，成功设置currentCartId后再接受操作，结果未明持原材料恢复；已有车的写操作共享进行中状态，不引入操作队列或全局状态框架。
- [x] 4.2 由 App Router 组合 `/cart/[cartId]` 与Cart功能组件，实现权威快照、局部编辑草稿、数量修改/移除、报价/问题行、空车与失效状态；版本冲突/保存失败保留草稿。按方案A保留原PUT车/版本/完整条目，GET旧版本仍保持结果未明并暂停新意图；提供显式原请求重试、冲突后重读和当前条目相同/不同两种反馈，不增加编辑记录表或最终购买动作。
- [x] 4.3 验证首次A/B快速点击只有一次创建、成功后B加入原车、创建丢响应时入口受控/原材料恢复、已有车连续写操作不重叠；覆盖PUT丢响应后GET旧版本不解锁、用户重试材料不变、冲突重读、第三方改写不自动覆盖、再次超时/读取失败保持未知以及离页不自动重放；补刷新/导航、API失败、快速编辑/切车/迟到响应、A/B标签隔离和材料丢失提示，完成桌面/移动、键盘/焦点/错误关联/反馈检查，记录真实读屏证据或明确限制。

## 5. Slice 验证与交付

- [x] 5.1 对实际增量执行相关typecheck/lint/build、金额/真实DB/HTTP及Web E2E；复核S1受影响查询与MCP投影，无变化的Host证据可有依据复用，失败先修复重验。
- [x] 5.2 按 ai-native-review 对权限、金额、持久幂等/冲突、恢复与状态归属进行适用审查；核实Finding并定向修复/重验，明确自查或独立Review及证据范围。
- [x] 5.3 更新README/环境示例及必要运行说明，在本Tasks记录实际命令、构建/commit对象、结果和残余限制；向Human交付Web Cart闭环验收，不把领域AGENT合成测试当真实Agent建车。

## Workflow follow-up

- 按最新版Git Checkpoint Policy依据金额、权限、幂等风险与交接需要安排Checkpoint，复用同一逻辑增量的验证/审查；不要求每Task或每任务组独立提交，不为Guard新造提交。本Change适用的高风险阶段/任务组交接在条件满足后运行Guard，Git授权仍单独核对。
- Human验收及相应归档授权后同步两份正式规格并归档，保留旧S1历史；本轮不执行。
- S3确认/订单与S4 Agent建车/编辑/交接/有效创建事实等待对应授权；当前Cart数据与Pricing为复用基础，不提前铺开后续Tasks。

## Planning Evidence

- 2026-10-29：在main `e632e0c`基础的新规划分支完成只读源码调查和Draft编写；仅新增本Change文件，无业务实现、迁移、依赖安装或新增运行测试。文档结构检查与规划自查结果在最终交付时报告，不预填通过。
- 后续按Human指令rebase到main `03c51eb`，并按已确认的Review改进意见修订幂等恢复顺序、页面级加购协调、对应Spec/验证任务及源码分层/风险驱动Checkpoint表述。两项设计Finding已补齐方案和反例，运行行为仍待实施验证；当时Human Review Queue保留待裁决；随后Human明确“批准这些建议”，三项已接受，当前状态以Design的Human Review Queue为准。

## Implementation Evidence

- S2任务组1实施证据：decimal.js 10.6.0、lossless-json 4.3.3已锁定；新增测试首先因缺失契约/计价实现失败，实施后契约/金额/Catalog共28项通过。contracts/API typecheck、lint及API build通过；完整Vitest为28 passed / 6 skipped（DB/API环境未配置），不作集成通过。无商品原件修改。

- S2后端任务组证据：真实PostgreSQL Cart 9项、Inventory回归3项通过；包含数据库锁等待barrier及原请求/重试/第三方先提交场景，非随机sleep制造竞争。隔离API的Cart HTTP 3项通过；凭证/精确到期边界3项通过，API typecheck/lint/build通过。已定位并修复容器直接导入Express但未声明依赖的启动问题，直接依赖与Nest使用的Express 5.3.0对齐。3.3的Next反代/浏览器Cookie验证留Web任务组，未提前勾选；未连接演示库执行破坏性验证。


### 最终验证与交付状态（2026-10-29，Asia/Shanghai）

- 规划Checkpoint `914dd62`、精确计价/契约 `b877388`、持久Cart/权限 `df94b10`；Web交付与本记录同一提交，沿已授权分批提交执行，未Push/Merge。15/15实施任务完成，**Human验收待进行，未同步正式规格或归档**。
- 全套实测：在本轮隔离API容器内执行 `TEST_DATABASE_URL=postgresql://store_test:test_only@db-test:5432/store_test API_BASE_URL=http://127.0.0.1:3001 S2_API_BASE_URL=http://127.0.0.1:3001/api/v1 pnpm test --no-file-parallelism`，继承容器服务凭证但未打印：**49 passed、0 skipped**。覆盖精确报价、目录保真、凭证、真实PG幂等/编辑/到期、HTTP及实际Streamable HTTP MCP adapter。普通宿主未配置变量时的31 passed/18 skipped不替代该证据。
- 真实Next同源代理：`S2_API_BASE_URL=http://127.0.0.1:3005/api/v1 WEB_ORIGIN=http://127.0.0.1:3005 pnpm test apps/api/test/cart/http.test.ts`，3 passed；浏览器Cookie为HttpOnly、同浏览器A/B车隔离，不能从document.cookie读取。
- Web最终产物：Docker Node24.22.1 / Next16.4.3，`pnpm --filter @store/contracts build && pnpm --filter @store/web build`成功，再以Next production server运行。本机Turbopack CSS子进程绑定端口被环境拒绝，已通过现有Docker构建链完成等价生产构建，不将宿主失败隐瞒为通过；API Nest生产build通过。
- `WEB_BASE_URL=http://127.0.0.1:3005 pnpm test:e2e`最终 **30 passed**，Google Chrome桌面/移动视窗各验证S1六场景与S2九场景：加购/刷新/改量/删除、页面统一创建、成功创建丢响应恢复原车、历史导航迟到请求隔离、同版本PUT恢复、草稿保留、真实版本冲突、多车隔离及过期界面。包含精确大金额格式化断言。页面错误选择器曾与Next路由播报节点歧义，定位后定向修正并复测。
- `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、Git空白检查通过；API入口及已有Inventory测试有纯格式修订。运行时依赖decimal.js10.6.0、lossless-json4.3.3、express5.3.0均核对为MIT许可，版本已锁定。原件无Diff，真实.env仍ignored，密钥未提交。
- 行为/交付审查：使用ai-native-review自查（**非独立Review**），核对金额/车级权限/Origin/幂等/到期/写锁/结果恢复及草稿状态。发现“新草稿仍显示旧已储存提示”的P2，先观察失败回归，再在改量/移除/载入最新时清提示，最终E2E重验通过。商品与Cart展示统一按服务端十进制字符串格式化，不再在展示阶段转浮点。未发现新增阻塞性Finding，不宣称无缺陷。
- 实际检查桌面与390px移动截图、键盘焦点/输入关联/反馈及200%字体缩放；截图仅为本地检查产物。**没有真实VoiceOver或其他读屏实测，也未新增真实Codex Host操作证据**；MCP transport/输入/输出边界已重验，真实Host连接能力复用S1仍适用证据，不能当新Host验收。
- 交付入口：本轮隔离Web `http://127.0.0.1:3005`、API `http://127.0.0.1:3004`，均连接专用store_test；原3000/3002演示容器和演示库存未重建/迁移。README给出正常本地环境的新增Cart迁移/稳定密钥要求。测试库为临时数据，后续测试可能重置，不能当正式订单/永久购物车存储。
- 下一步建议：Human在上述预览验收加购、金额明细、改量/移除、刷新和异常提示；取得验收及归档授权后再同步/归档。本轮不启动S3、MCP写工具或任何公开部署。

### Human验收反馈修复：加购提示（2026-10-29）

- Human指出顶部成功提示在滚动后不可见，且进入Cart仍残留；按既有轻量反馈契约作局部修复。成功通知固定在视窗底部，220ms淡入上移动画，5秒后关闭，可手动关闭；悬停/键盘焦点暂停计时，支持prefers-reduced-motion。路由变化清除旧页面通知，返回亦不复现；结果未明的原请求恢复状态独立保留，不自动丢弃。
- 参考：[Baymard加购确认案例](https://baymard.com/ecommerce-design-examples/added-to-cart-confirmation)、[Shopify Dawn通知源码](https://github.com/Shopify/dawn/blob/main/assets/cart-notification.js)。采用动画通知与明确关闭入口，具体位置/时长是本项目实现选择。
- 验证：Docker Next生产构建、Web lint/typecheck通过；完整桌面/移动E2E 32 passed，追加减少动态效果/焦点暂停/手动关闭定向测试2 passed。实际检查1280px/390px截图，滚动到底仍可见，无横向溢出；自查非独立Review。首次宿主Chrome启动受sandbox限制，提升执行权限后取得上述浏览器证据。本次仅影响提示展示，复用此前后端权限、报价及并发验证，不重跑数据库测试。
- 后续按钮反馈修复：原先所有按钮直接用全局busy控制文字及变淡，Human观察到整页闪动。保留全局写锁/禁用保护，每个按钮独立记录本次请求进度；只有被点击的按钮显示处理中，其余可购买按钮保持原文字及不变淡。桌面/移动回归先实测失败（预期1个处理中，实际12个），修复后Cart相关22项E2E通过，覆盖独立文字/透明度及原创建恢复/编辑保护；Web生产构建、lint/typecheck、格式及Diff检查通过。局部展示修复，不改变Cart交易契约。
