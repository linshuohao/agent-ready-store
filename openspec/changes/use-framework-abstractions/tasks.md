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
