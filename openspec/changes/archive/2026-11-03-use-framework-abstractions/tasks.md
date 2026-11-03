# Tasks

2026-11-03 Human已明确授权上一轮五项审查建议的实施与复查。本轮无正式业务契约变化，skip_specs=true。

## 1. HTTP响应职责

- [x] 1.1 用真实Nest HTTP验证当前成功200、已知失败状态/envelope、未知失败503脱敏、no-store和旧入口410；移除两个Controller的手动send/Res及重复状态表，迁至HTTP专用interceptor/filter，再跑相同断言与相关HTTP集成。

## 2. Web与共享UI

- [x] 2.1 Web注入Next Link，嵌入保留导航适配；用共享组件测试与浏览器导航回归验证href、prefetch和修饰键/普通点击行为。
- [x] 2.2 页面工具声明统一Zod输入转换；验证搜索与评论声明中的长度/范围/描述与输入契约一致、非法输入仍被拒绝，并跑页面工具浏览器回归。
- [x] 2.3 删除退役结账/购物车请求模块、未用导出/属性及只验证旧实现的测试；检索导出/动态引用并通过Web类型检查和旧入口拒绝回归，保留现行恢复功能。

## 3. 开发监听与复查

- [x] 3.1 隔离验证Nest start --watch的源码、共享JS实现变化与资源行为；等价则迁移并跑根启动回归，否则记录不能替换的实际证据和保留理由。
- [x] 3.2 完成受影响类型检查、lint、构建、格式、HTTP与浏览器验证；独立审查本轮Diff并修复实际发现，再扫描非MCP范围是否仍有同类遗漏，记录结果。

## Workflow follow-up

- 保留上一轮MCP未提交修改；完成Diff与证据后按授权处理提交，不自动Push/Merge/发布。

## Verification evidence

2026-11-03，当前分支refactor/mcp-sdk-registration；保留上一轮MCP改动，无提交/Push/Merge/发布。

- HTTP真实Nest基线在改造前通过，改造后相同断言通过：成功200、404/409/410/403、未知503脱敏、requestId和no-store。最终受影响单元与Nest分类集成合计13文件38项通过（response-adapter、categories-http、shared/result、commerce-ui/test、web/test、mcp-app/test，排除上一轮已验bridge-adapter）。
- 当前工作区根pnpm dev启动Web3000/API3002，核对两端cwd，使用隔离store_test。桌面Playwright：acceptance-navigation、shopping-smoke、webmcp共26项通过；补充普通点击保持客户端状态、修饰键开新页1项通过。嵌入Host fixture的共享购物车、支付/分享/导航及详情3项通过，合计30项。fixture不代替真实Host验收。
- 新导航测试首轮误用空购物车预期，实际beforeEach已注入cartId，纠正预期后通过。嵌入分享首轮因构建WEB_ORIGIN=127.0.0.1与fixture固定localhost不一致被正确拒绝，按fixture域名重建后通过，未放宽生产校验。
- 停止本轮根启动服务后，临时API3003配合真实PostgreSQL store_test，串行执行lifecycle-http、retired-http、grouped-http、http：4文件16项通过，无跳过。首轮grouped-http暴露上一轮MCP遗漏的旧错误envelope断言，按已批准SDK原生错误契约修正后全部通过；未修改生产行为。临时API自动退出，确认3000/3002/3003均无本轮监听残留。
- 最终全项目pnpm typecheck、pnpm lint通过；API/Apps经根开发预构建成功，Web生产构建成功。Web首轮构建被沙箱阻止CSS子进程绑定本地端口，正常权限重验通过。最终Apps按fixture域名重建成功。最终删除与prefetch补充后类型检查/lint重验通过。
- Nest CLI隔离fixture实测：启动删除dist/mcp-app资源；稳定后修改只有JS实现的共享依赖，不触发重启；修改TS触发重启。相同共享JS改动由Node --watch成功触发重启。首次沙箱内Node watcher遇EMFILE，正常权限完整重验取得上述结果。因此保留现有tsc+node watcher，无新增监听补丁或依赖。
- requesting-code-review独立只读reviewer /root/review_framework_abstractions审查后无阻断findings；提出两处交易链接显式prefetch=false补齐建议，已修正并定向复核。复扫又发现无生产消费者的旧cart commands链，删除实现、re-export、旧测试、包导出及PageTools未使用onCartChanged属性；独立复核无新增findings。所有退役请求模块/类型引用检索无残留。
- 非MCP复扫覆盖响应写入、手写Schema、导航、fetch封装、事件/定时器及启动脚本；未发现本范围内其他明确绕过既有封装的缺陷。SQL锁、状态机、显式不重叠过期调度和不可信输入验证保留。短摘要足够审阅，不额外生成可视化。
- 格式、git diff --check及OpenSpec strict validate通过。Human验收/提交授权待后续，上一轮真实Host验收缺口仍在其独立Change中，不标记完成。

## 4. 持续清理与框架职责优化（2026-11-03追加授权）

Human授权清理旧契约/组件、扫描列清单并逐步实施，强调Next/Nest最佳实践；本轮沿原分支，提交授权不从上次自动推定。

- [x] 4.1 清除无消费者旧契约、PurchaseSummary组件及只测试退役契约的测试；保留Quote/CartItem等现行基础类型与历史只读恢复（负责人cleanup）。
- [x] 4.2 Bridge复用cartOperationInput；删除无用Bridge.open/reviewId；Web PageTools复用PageToolsProps（负责人ui）。
- [x] 4.3 Nest准入改Guard，HTTP参数转换改Pipe/参数装饰器；保持拒绝顺序、400/403/410/envelope/no-store，Service继续跨传输校验（负责人root）。
- [x] 4.4 按当前Next/Nest官方及本地实现扫描：路由/导航、Server/Client边界、数据读取、Guard/Pipe/DI/异常/生命周期，形成有证据的优化处置清单（负责人root）。
- [x] 4.5 定向类型/lint/构建、实际HTTP及Bridge回归和独立审查；修复发现并复验，更新清单状态（负责人root）。

## 优化扫描清单（本轮处置）

|优先级|对象/证据|处置|
|---|---|---|
|P1|CartController逐方法checkRequest；Catalog重复Origin判断|已改Guard与路由metadata；拒绝顺序、退役410保留，Controller无手工准入调用|
|P1|HTTP参数转换/校验混入Controller|已使用ZodValidationPipe、CatalogQueryPipe及Body/Query/Param；Service跨传输业务校验保留|
|P1|contracts旧cart/checkout/handoff/purchase及PurchaseSummary/旧Memory无消费者|已删除旧Schema、组件、状态、专有CSS和仅测试旧契约的3文件；现行基础类型保留|
|P2|Bridge手写operation Schema约束变宽|已复用cartOperationInput；无效quantity本地拒绝且零Bridge调用|
|P2|PageTools Props重复；reviewId/Bridge.open无消费者|已复用共享类型并删无用字段/stub；实际share校验保留|
|P2|Web publicApi访问内部API但缺少服务器模块边界标记|已加server-only，Next生产构建验证|
|保持|Next页面默认Server Components、Promise params/searchParams、Promise.all商品/分类取数、Next Link|已有实践符合当前用途；不引入额外客户端请求库或强换Server Actions（Web/嵌入/MCP共用Nest服务）|
|保持|交易数据no-store、交易链接禁止预取|保留新鲜度与显式动作契约，不为了缓存指标改变业务语义|
|保持|Nest DI factory/lifecycle、SQL行锁、requestMaintenance、原生body parser异常边界|现有factory负责连接就绪/共享db，生命周期负责释放；锁/维护顺序有不变量；解析发生Controller之前，不移入Guard/Filter强行替换|
|保持|历史只读恢复、旧路径410、迁移/切换脚本|有明确恢复/拒绝/审计用途，不归入无消费者旧代码|
|暂不改|原生dialog及手动滚动/单按钮Tab控制|原生showModal已有模态能力，当前单按钮且有浏览器验证；Base UI Dialog可减少辅助逻辑，但无已复现缺陷，本轮不为换库扩大交互改动|
|保持|开发tsc+Node watcher|上轮隔离实验确认Nest watcher会漏共享JS并删除Apps资源；根构建顺序仍须API之后生成Apps|

官方依据（2026-11-03核对；实际安装Next16.4.3/Nest12.3.2）：[Nest Guards](https://docs.nestjs.com/guards)、[Pipes](https://docs.nestjs.com/pipes)、[请求生命周期](https://docs.nestjs.com/faq/request-lifecycle)、[Next Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)、[Link](https://nextjs.org/docs/app/api-reference/components/link)。这是当前范围清单，不宣称对未来功能穷尽所有优化。

## 本轮追加验证证据

- 4.1/4.2按已记录写入边界并行完成；集成后旧契约/组件/无用字段及checkRequest源码检索无残留。保留旧请求结果只读恢复和数据库迁移历史。
- 最终相关Vitest 17文件82项通过（contracts、commerce-ui、web、mcp-app、response-adapter、categories-http、shared/result）。新增HTTP断言验证多错误优先级、Guard拒绝不调用Service、Pipe转换，以及所有拒绝no-store和退役410。
- 全项目typecheck/lint、API构建、Apps构建、Next生产构建、修改文件Prettier、git diff --check通过。server-only由Next构建实际接受，未增加依赖。
- 真实PostgreSQL store_test+临时API3003串行HTTP四文件16项通过；首次因独立Nest build清空Apps HTML导致grouped-http失败，补Apps构建后完整重验通过，未改变业务代码。临时API自动关闭。
- 当前工作区根pnpm dev启动Web3000/API3002，核对两端cwd，连接store_test；desktop购物、WebMCP、cart-card三个文件11项浏览器回归通过（包含金额明细、草稿恢复和支付）。无操作业务库。
- requesting-code-review独立reviewer /root/review_cleanup_guards 核对最终Diff与原始行为，未发现需修复findings；仅静态审查，未冒充重跑本轮集成。
- 当前分支refactor/mcp-sdk-registration，上一轮提交51d59dc保留。本轮追加修改尚未提交/推送/归档；未从已完成的上一轮提交授权推定新提交授权。真实Host验收仍属于上一轮MCP Change的未完成项。

## Acceptance and archive

2026-11-03：Human 明确回复“延期验收，合并归档”，授权本轮合并与归档。实现及独立审查已完成；PR #22 的 CI（Verify、Delivery image）在 44af42c 全部通过。真实 Host 发现刷新、搜索/订单卡片及错误反馈现场验收延期，未声称通过；其范围保留在 simplify-mcp-sdk-registration 的任务 3.2，未来接入目标版本时补验。此决定允许带该已知缺口归档，不取消真实 Host 验收要求，也不构成发布授权。
