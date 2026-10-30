# Tasks

状态：规划已批准，已授权提交及实施（2026-10-30）；直接依据为 Human“OK，批准，然后提交并且开始实施”。来源边界见 [D-07 S5 补充](../../../DECISIONS.md#s5-webmcp-source-20261030)。不包含 Push、Merge、发布或最终验收授权。

## 1. 规划批准与运行能力预检

- [x] 1.1 完成 Planning Review，核对原子转换、权限、确认失效、创建统计及真实 Host 验收；将 Findings 修订回本 Change，并取得 Human 整份规划批准和实施授权，保留直接批准记录。
- [x] 1.2 获提交授权后形成规划 Checkpoint；按 Git Checkpoint Policy 对本 Change 及限定决策/需求路径运行 Guard，成功后才进入实现，不用文件存在或 schema 校验替代批准。
- [x] 1.3 在已授权环境记录可用浏览器、真实 Agent Host、WebMCP API 及安全上下文；先注册最小只读工具验证发现/调用/撤销，留真实结果。环境不支持时报告具体阻塞，不安装新环境或用模拟结果代替真实 Host。

## 2. 创建事实与原子来源转换

- [x] 2.1 为 Cart 增加不可变有效 Agent 创建事实并回填旧数据，调整本地统计查询；真实 PostgreSQL 验证迁移前后计数一致、普通车升级不计创建、有效 MCP/WebMCP 创建仅计一次，更新迁移/回退说明，不 seed 或删卷。
- [x] 2.2 扩展共享创建/编辑用例，成功工具写将 HUMAN 转 AGENT，与条目及版本同事务提交；真实 DB 回归覆盖同条目转换、失败回滚、空车、权限到期、完成车拒绝及 Human 后续编辑保留来源，核对报价和库存不变。
- [x] 2.3 增加明确 WebMCP 创建/编辑 HTTP 契约，复用现有证明/幂等、Cookie 和 Origin/JSON 防护；HTTP 测试覆盖合法新建、原创建重放、升级后重放、错车、跨站和来源/价格越权字段，确认浏览器无 MCP 服务秘密。记录专用入口不防请求模拟的既有限制。
- [x] 2.4 真实 PostgreSQL 并发验证升级与同版本编辑、升级与订单提交竞争；分别证明最多一次版本写入、旧确认拒绝、成单后不升级及订单快照不变，将实际证据留本 Change。

## 3. 页面工具与共享协调

- [x] 3.1 实现薄页面 Adapter 与能力检测，按现行已验证 API 管理注册和撤销；测试重复挂载、路由变化、不支持及卸载，确保无重复工具、无确认/提交工具、无非法 Hook 调用，记录工具名称与输入输出契约。
- [x] 3.2 接入目录搜索导航、商品详情和评论分页，沿用公开 DTO/有界查询；验证工具结果与页面一致、导航不重复查询、评论只作数据、离页结果不再导航。
- [x] 3.3 将工具加购/读取/编辑接入现有 CartProvider 和 Commands，购物车页显式报告脏草稿；浏览器测试覆盖 busy/草稿阻止、当前车同步、换车响应归属及 HUMAN 升级后折扣展示，保留原草稿和既有普通 Web 行为。
- [x] 3.4 扩展创建/编辑恢复意图保留入口及目标来源；测试版本未推进仍未知、版本推进且条目/AGENT 均符合时当前符合意图、版本推进但来源或条目不符时冲突；必含版本 3 转换响应丢失、Human 先保存为版本 4 且同条目仍 HUMAN 的反例，验证解除等待、保留草稿、不重试旧版本且不自动换版本覆盖。另覆盖创建响应丢失及刷新材料丢失，证明不跨通道重建，更新恢复限制说明。

## 4. 集成验收与交付

- [x] 4.1 在桌面/移动运行受影响 Web 旅程：工具新建优惠车、接手普通车、Human 再编辑、进入 Checkout 重新审阅并点击成单；校验页面金额、Order 快照、库存及统计，不把自动点击称为 Human 验收。
- [ ] 4.2 使用真实浏览器 Agent Host 验证发现、搜索/详情/评论、加购/编辑、生命周期及人工 Checkout 接续；逐项记录 Host/浏览器/API/应用 revision 与结果，真实调用和模拟自动化分别记证，未获证据保留缺口。
- [x] 4.3 执行受影响静态、契约、DB、HTTP 与浏览器检查，检查生产构建/Hydration 及 Adapter 脚本增量，复用环境未变的有效证据；修复失败后定向重验，不以 skipped 充当通过。
- [ ] 4.4 完成适用独立 Code Review 与定向修复复核；更新 README、运行与安全限制、工具契约及技术基线传播，提交可核对证据与剩余风险，获得 Human 验收。提交/合并按独立授权执行。

## Workflow follow-up

- Human 验收与归档授权后同步正式 Spec、归档当前 Change，并按授权提交/合并；不把归档或 S6 自动纳入本轮实施授权。
- Agent 来源防伪是 Human 明确后置的目标；未来拟扩展部署/信任边界时重访，不在 S5 暗加认证机制或声称已经解决。

## Planning Review

以下为规划批准前的历史记录；当前批准见本文开头，实施 Review 见下方证据。规划阶段为 Codex 聚焦设计自查，未冒充独立 Review：核对本轮优惠规则、成功写入触发、原子版本/确认边界、创建指标、普通建车重放及浏览器生命周期。发现的创建统计与来源升级耦合、恢复仅比较条目的问题已纳入 Design 和对应任务；来源防伪按 Human 后置指令记录。短摘要足以审阅本轮范围，未生成额外可视化。整份规划 Human Approval 和正式 Planning Review 结论仍待完成。

2026-10-30 定向复核修订：本轮 Planning Review 的 P2 指出“仍为 HUMAN 一律未知”会使已被新版本阻断的原转换继续等待。按 Human 修复指令，Design、WebMCP Spec 和 3.4 已统一按版本是否推进、条目及目标来源分类，并补充版本 3/4 反例。此处仅记录规划修订，业务实现与运行回归均未执行；静态验证和定向复核结果见当前对话，不标记实施任务完成。


## Implementation Verification — 2026-10-30

- **范围与批准：** 基于规划提交 `eec1e87` 实施同一 S5 Change。实现前以精确文件路径运行 Git Checkpoint Guard，planning transition PASS；本轮未 Push/Merge/归档。1.1～4.3 的实施完成项不代表 Human 最终验收。
- **预检：** Codex IAB（Chrome UA 156.0.0.0，localhost 安全上下文）原生 `document.modelContext` 可用；本机 Chrome 156.0.8078.76。临时只读探针由真实 Host 发现/调用，返回 `S5_REAL_HOST_PROBE_OK`，AbortSignal 撤销后发现列表为空。无 polyfill 或新增 SDK/依赖。
- **迁移与创建事实：** 演示库迁移前 AGENT 43、HUMAN 94；回填后 agentCreated=true 43、false 94，全部保留，不 seed、不删卷。新增 PostgreSQL 用例验证升级普通车不补计创建、Agent 创建恢复不重复、来源及条目/版本原子更新、失败不转换、原创建重放及订单后只读。后续自动化模拟购买会正常扣演示库存，不宣称数据量恒定。
- **真实 DB：** 专用 `store_test` 迁移后，容器内设 `TEST_DATABASE_URL=postgresql://store_test:test_only@db-test:5432/store_test`，串行运行 `webmcp-db.test.ts`、`handoff-db.test.ts`、`cart.test.ts`、`checkout-db.test.ts`：37/37 通过；含真实锁屏障下转换先/订单先两种顺序。既有 Checkout 到期测试发现毫秒边界偶发失败，测试 SQL 改为 `date_trunc('milliseconds',clock_timestamp())-24h`，避免 timestamptz(3) 向未来半毫秒舍入；未放宽生产期限判断。
- **HTTP / Commands：** 容器内 `API_BASE_URL=http://127.0.0.1:3001 pnpm exec vitest run apps/api/test/cart/webmcp-http.test.ts apps/web/test/cart-commands.test.ts`：6/6 通过，覆盖同源、Cookie、普通/工具创建隔离与重放、越权字段及恢复版本三分支。
- **浏览器自动化：** `WEB_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/webmcp.spec.ts`：桌面/移动16/16通过；注册替身用于协议/协调测试，包含普通车升级、Human 后续编辑与模拟成单、草稿阻止、恢复解锁、原创建重试、降级、跨车恢复隔离、工具/Human 两条冲突恢复草稿路径。既有 `e2e/cart.spec.ts e2e/checkout.spec.ts`：30/30通过。以上自动点击不称为真实 Human 验收。
- **真实 Host：** Codex 通过 IAB tab WebMCP capability 发现并调用商城 `get_product`、`list_product_reviews`、`add_to_cart`、`update_cart`、`search_products`；真实车 `b54313d5-c1e5-47de-b3fe-45af7b21077c`，P001×1 报价1700.50，编辑为×2后版本2、AI优惠184.00、应付3496.00，页面同步。搜索返回3件公开商品并更新URL；离开详情后当前注册只保留相应页面工具，Checkout仅发现 get_cart，无确认/提交工具。该车停留显式确认页面，真实 Human 接手/编辑/确认尚待验收，因此4.2保持未完成，不用自动化点击替代。
- **静态与构建：** `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`git diff --check` 通过。宿主 `pnpm build` 因 Turbopack CSS子进程绑定端口 EPERM 未通过；使用既有 `docker compose -f compose.yaml -f compose.production.yaml build` 隔离生产构建通过，未连接/迁移/seed数据库。宿主 Nest build 一度触发开发API dist重启失败，重启既有API恢复，后续HTTP和浏览器回归通过。
- **脚本与 Hydration：** 生产镜像中包含 WebMCP 的组合脚本块为16,729～41,696字节，gzip6,272～15,972字节（含既有页面逻辑，不等同纯增量或完整首屏体积；无同条件前版对照，不宣称性能提升）。无新增 Host SDK/独立 Store。开发热更新中曾出现旧 Provider Context 的渲染错误；最终 Checkout 冷刷新并等待确认按钮就绪后无新增 console error，不将热更新噪声写成未发生。
- **独立 Review：** 全新只读 reviewer 核对未提交源码、测试、迁移及契约，发现2项P2：跨车恢复可能把A结果送入B页面、工具冲突丢失原条目。分别先取得失败复现，再增加当前车/创建代次与回调cartId校验，统一工具和Human重试的原意图草稿处理。16项最终回归通过，Reviewer定向复核确认两项均关闭，无新增Finding。短摘要和现有页面足以验收，未增加额外Recap。
- **剩余：** 4.2的真实人工接续与4.4的Human最终验收仍未完成；来源防伪按D-07限定后置。批准实施不等于接受最终产品、批准归档或合并。README与Technical Design已传播来源边界及运行说明，正式Spec仍待验收后按授权同步。
