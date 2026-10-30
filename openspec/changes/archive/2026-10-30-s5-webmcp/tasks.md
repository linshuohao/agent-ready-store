# Tasks

> 2026-10-30 归档收尾：Human 已授权保留已披露缺口归档并本地合入；详见末尾记录。历史任务勾选不改写。

**本次修订：Approved Planning — 电商逐项操作与按场景刷新，见 §6。** 2026-10-30 Human 明确“批准当前修订版，提交之后开始实施”，批准具体修订版并授权提交规划后实施。原 §1～5 勾选与运行结果仅对应当时实施，不能视为 §6 已实现。

状态：规划已批准，已授权提交及实施（2026-10-30）；直接依据为 Human“OK，批准，然后提交并且开始实施”。来源边界见 [D-07 S5 补充](../../../../DECISIONS.md#s5-webmcp-source-20261030)。不包含 Push、Merge、发布或最终验收授权。

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
- [x] 3.3 将工具加购/读取/编辑接入现有 CartProvider 和 Commands，购物车页显式报告脏草稿；浏览器测试覆盖 busy/草稿阻止、当前车同步、换车响应归属及 HUMAN 升级后折扣展示，原实现保留草稿（本轮由 §5 替代）。
- [x] 3.4 原实现（恢复方案已由 §5 替代）：扩展创建/编辑恢复意图保留入口及目标来源；测试版本未推进仍未知、版本推进且条目/AGENT 均符合时当前符合意图、版本推进但来源或条目不符时冲突；必含版本 3 转换响应丢失、Human 先保存为版本 4 且同条目仍 HUMAN 的反例，验证解除等待、保留草稿、不重试旧版本且不自动换版本覆盖。另覆盖创建响应丢失及刷新材料丢失，证明不跨通道重建，更新恢复限制说明。

## 4. 集成验收与交付

- [x] 4.1 在桌面/移动运行受影响 Web 旅程：工具新建优惠车、接手普通车、Human 再编辑、进入 Checkout 重新审阅并点击成单；校验页面金额、Order 快照、库存及统计，不把自动点击称为 Human 验收。
- [ ] 4.2 使用真实浏览器 Agent Host 验证发现、搜索/详情/评论、加购/编辑、生命周期及人工 Checkout 接续；逐项记录 Host/浏览器/API/应用 revision 与结果，真实调用和模拟自动化分别记证，未获证据保留缺口。
- [x] 4.3 执行受影响静态、契约、DB、HTTP 与浏览器检查，检查生产构建/Hydration 及 Adapter 脚本增量，复用环境未变的有效证据；修复失败后定向重验，不以 skipped 充当通过。
- [ ] 4.4 完成适用独立 Code Review 与定向修复复核；更新 README、运行与安全限制、工具契约及技术基线传播，提交可核对证据与剩余风险，获得 Human 验收。提交/合并按独立授权执行。

## 5. Human 授权的客户端简化（2026-10-30）

- [x] 5.1 更新 Commands/Provider/CartPage/PageTools：删除编辑推断/恢复和差异展示；冲突/未知明确重新加载；只保留当前请求状态、创建同键重试、草稿与离页保护。
- [x] 5.2 将原恢复/比较测试改为服务端权威行为测试，覆盖冲突后最新数据、未知后无重放及可继续操作、多页隔离、创建恢复；执行可用静态/浏览器验证与定向 Review，记录环境缺口。
- [x] 5.3 同步当前 Decision、基线及 README 的受影响说明，记录替代关系与真实验证，不改历史归档或未验收正式 Spec。

## 6. 电商逐项操作与按场景刷新（本次修订）

- [x] 6.1 完成 Proposal/Design/两份 Spec/Tasks 的聚焦 Planning Review，处理 Findings 并取得修订版 Human Approval；核对 D-23 → D-24 的限定替代及旧接口兼容范围，获相应 Git 授权后按 Checkpoint Policy 形成精确成果范围的 planning checkpoint/Guard，再进入受影响实施。
- [x] 6.2 增加普通/WebMCP 单操作 DTO、HTTP 路径和共享服务端用例；用真实 PostgreSQL 覆盖加购/设量/删除、空车、行不存在、多条旧问题行逐条修复且未修完不可结算、目标行无效回滚、同版本重复和并发最多一次、来源原子转换、权限/完成/到期及旧确认拒绝；HTTP 验证 Origin/JSON/Cookie/越权字段及旧整车路径、基础 MCP schema 兼容，更新相应接口说明。
- [x] 6.3 将 Browser Commands、Provider、Web 目录/详情加购与 CartPage 接入单操作；数量 Enter/失焦去重、非法输入保留/显式恢复、移除直接提交、完整服务端报价及同车 Human/工具短暂互斥用单测和桌面/移动浏览器验证，无整车保存按钮，无操作队列/换版本重试。
- [x] 6.4 实现车页进入/返回前台的读取校准、草稿保护与在途后一次校准，统一旧代次/低版本拒绝；先复现并修复“先到冲突、迟到旧成功清除刷新要求”的已有 P2，验证冲突/未知后仅有效显式加载解除、刷新旧读后旧写迟到、A→B→A、后台 GET 后新输入与旧响应均不能覆盖；桌面/移动回归通过。
- [x] 6.5 更新 WebMCP update_cart 的单操作 schema/描述及注册契约，验证旧 items 拒绝、草稿/忙碌、来源/报价同步、只读不转换与无购买提交；用注册替身测试和真实 Host 分别记录发现/调用/重发现证据，不把模拟当真实 Host 或 Human 验收。
- [x] 6.6 传播已批准的 D-24 限定补充至相关 Baseline 与 README，复用相应服务端交易保障证据并补必要的真实操作/Checkout 并发验证；桌面/移动覆盖同车跨入口先后操作、报价/库存变化后的重新审阅、购买未知结果恢复和旧 HTTP/MCP 兼容，记录命令/环境/revision；生产构建补验与静态检查如实记证。
- [ ] 6.7 对最终受影响 Diff 作适用独立 Code Review、修复/重验及必要定向复核，交付简短结果与剩余风险，由 Human 验收；与 4.2/4.4 合并核对真实 Host 和人工接续缺口，不自动归档、Push 或 Merge。

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
- **本轮 Review 定向修复：** 新增 P2 指出工具传未来预期版本时，明确版本拒绝被误归为未知结果并持续锁定当前页。已区分版本拒绝与响应未知：前者重读成功且版本未推进时返回冲突、保留草稿并解除等待；后者仍保持原恢复规则。新增单测先观察到预期失败，修复后 `cart-commands.test.ts` 6/6通过；桌面/移动新增未来版本用例及既有 newer Human save 恢复用例4/4通过，Web typecheck、lint通过。首次浏览器运行遇沙箱启动限制；沙箱外首次执行因测试定位普通保存按钮而超时，改用既有冲突页“以目前草稿儲存”后通过。独立只读定向复核确认原P2关闭，无新增Finding。此次浏览器测试只创建/编辑车，不提交订单；本次无数据库或HTTP服务端变更，未重跑DB/HTTP套件。最终Human验收状态保持待完成。

## 客户端简化验证 — 2026-10-30

- Human 授权与替代关系见 D-23、Design §4 和本文件 §5；§3 原实现及此前验证是历史证据，不代表新交互已通过运行验收。删除 pendingEdit、inspectEdit/sameItems、原编辑重试、双份内容比较和编辑全局锁；创建同键恢复、服务端与 Checkout 保持。
- Commands 冲突反馈测试先观察到预期失败，修改后 4/4 通过。`pnpm exec vitest run`：39 passed、50 skipped（未配置 DB/HTTP 环境，不算集成通过）；Web typecheck、lint、OpenSpec strict 与 Diff 检查按当前对话实际输出记证。
- 使用 superpowers requesting-code-review 派发全新只读 Reviewer `/root/review_cart_authority`，仅审本次客户端简化。发现同车工具成功响应逆序可回退页面，已增加旧版本响应忽略和回归用例；未新增请求队列、编辑恢复或条目合并。整页刷新解决原页请求回写问题；工具响应期间新输入保持并提示重新加载。
- 浏览器用例已改为真实冲突/未知后显式刷新、无自动 GET/重放、整车替换（含空车）、创建恢复、迟到响应和新输入保护。Playwright 尝试运行 `cart-review-fixes.spec.ts --project=desktop --grep 'reload replaces' --max-failures=1`，Chrome 在 sandbox 启动 SIGABRT/EPERM，1 个启动失败、1 个未运行，未进入业务断言，不冒称通过。
- `pnpm --filter @store/web build` 在 Turbopack CSS 子进程绑定端口时被 sandbox 拒绝（Operation not permitted）。`docker compose ps` 提权读取未执行：自动审批服务额度限制导致审核失败，并非安全否决；未尝试绕过审批。构建与桌面/移动浏览器回归待可用权限环境补验，5.2 保持未完成，暂不做验证完成/验收/归档的阶段交接或提交。
- **本轮定向修复与补验：** 再次独立只读审查发现 Human 保存的迟到响应未覆盖在低版本保护内。新增混合入口回归先复现失败：工具 v3 数量 3 已展示，Human v2 迟到后退为数量 1。统一成功响应接纳入口，同步记住最新服务端快照，忽略旧版本；工具期间新输入保留并提示刷新时也记录服务端版本，旧响应不得解除刷新要求。后续保存仅携服务端返回版本，不生成版本或换版本重放，Human 的版本权威补充见 D-23。
- **本轮运行结果：** 通过授权后的沙箱外 Chrome 访问现有 `http://localhost:3000`，`WEB_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/cart-review-fixes.spec.ts e2e/cart.spec.ts e2e/webmcp.spec.ts --max-failures=1` 桌面/移动 **60/60 通过**，补齐此前受限的客户端回归。首轮定向运行因 Next 路由播报器同样使用 alert 角色导致定位歧义，改为定位已有 `#cart-error` 后通过，未放宽业务断言。Web `tsc --noEmit`、lint、Commands 单测 4/4、受改代码 Prettier、OpenSpec strict、Diff 检查通过；服务端无修改，复用此前 DB 不变量证据，未重跑 DB 或生产构建。
- **本轮复核：** 全新只读 Reviewer `/root/review_version_fix` 定向核对源码、测试与契约，确认原 P2 关闭，无新增可行动问题；运行证据由实现者执行，Reviewer 未声称自行重跑。5.2 完成仅代表客户端简化与定向补验完成，4.2 真实人工接续、4.4 Human 最终验收及此前生产构建补验限制继续保留；未作阶段提交、验收、归档或合并交接。

## 本次修订规划记录 — 2026-10-30

- Human 在讨论电商跨端先后操作、购物意图及交易新鲜度后选择逐项操作方向，并要求“按照这个去做一次正式的修订，再实施”。本次仅修订当前 S5 planning artifacts 与关联决策索引；详细接口、交互及兼容边界待修订版整体批准，未改业务代码。
- 既有迟到成功清除先到冲突刷新要求的 P2 仍未修复，纳入 6.4；§5 的 60/60 是旧实施证据，不覆盖该反例，也不覆盖 §6 新功能。正式 Spec 与历史归档不改写。
- 聚焦独立 Design Review 由全新只读 `/root/review_cart_operation_plan` 执行：发现逐项操作若复用整车全有效校验，会使多条旧问题行无法逐步修复。已同步 Design §4.1、shopping-cart Spec、6.2 与 D-24 的目标行校验/未触及问题保留/禁止结算边界；Reviewer 定向复核确认规划问题关闭，无其他关键遗漏。未运行或声称新实现测试通过。
- `openspec validate s5-webmcp --strict`、`git diff --check` 通过。修订状态仍为 Draft、6.1 未完成（Human Approval 与 planning checkpoint 待办）；不修改旧证据、不提交或推进业务实施。此轮短摘要足以审阅，无额外可视化。

- **修订版批准与复核：** 全新只读 `/root/complete_spec_review` 核对 Design §4、两份 Spec、Proposal、Tasks §6、D-23/D-24，独立规格审查无重要 Finding（未运行实现测试）。Human 随后明确“批准当前修订版，提交之后开始实施”。本次仅提交规划及相关基线，既有未提交源码保留；规划 Guard 实际输出留当前对话，通过后才开始 §6 实施。

## 逐项操作实施证据 — 2026-10-30

- **规划交接：** Human 批准后提交 `394eada`（仅规划、决策及限定基线，旧源码差异保留）；对精确十个文档路径运行 planning Guard，Verification/Review/Approval 均基于实际记录，结果 PASS，之后才实施。执行复用本 Tasks §6，不建平行计划/流水账。
- **RED → GREEN：** 新隔离 PostgreSQL 单操作套件先观察到 operate 未实现的8项预期失败，补实现后通过；新浏览器逐项 Enter/blur 用例先观察到0次操作请求（预期1次），补实现后通过。新建车仍原同键幂等，已有车操作同版本最多一次，不加队列、日志表或依赖。
- **数据库：** 新增操作10项（包括真实锁屏障下操作先/订单先两种竞争顺序），与旧Cart、WebMCP、Handoff、Checkout套件在 store_test 串行 **47/47通过**。覆盖未触及问题行保留/逐步修复、目标校验/失败回滚、原创建恢复、版本/来源/权限、库存不因编辑扣减和旧确认失效。新增锁竞争测试最初误放套件作用域外、随后断言使用toBe匹配非固定ID，均为测试编写错误，已定位修正后重验，未放宽生产逻辑。
- **HTTP：** 容器内 API_BASE_URL=http://127.0.0.1:3001，cart-operations-http与旧webmcp-http **2/2通过**，确认Cookie/Origin/JSON、错车、越权字段、旧整车路径兼容。原基础MCP handler/schema未改，沿用现有协议回归，不声称HTTP测试等于真实Host。
- **浏览器：** 购物车四套件桌面/移动 **72/72通过**，新单操作UI与后台GET/草稿/冲突/未知/兼容覆盖；按已批准互斥契约替换原允许同页并行写的三项测试。追加旧读后原写迟到与在途返回校准，以及Checkout/Handoff接续正在补验，最终结果见后续证据。
- **当前静态：** Web/API lint、Web tsc --noEmit、容器API typecheck通过。初次Web lint指出effect内同步setState，改为可取消的初始化微任务后通过。宿主vitest 39 passed/61 skipped（DB/HTTP环境未配置，跳过不算通过，真实套件另有上述结果）。
- **生产与追加运行：** 隔离生产镜像构建成功，Next/Nest/契约完整生产编译，不连库、不迁移或seed。追加 Cart operations/Checkout/Handoff 桌面移动36/36通过，含刷新读旧版本后原操作迟到、新意图仍携旧读取版本被拒绝、在途返回后一次校准、购买未知恢复及改车后旧确认拒绝；最终修复后的整套回归另见下文。
- **真实 Host：** Codex IAB 的 localhost 原生 WebMCP（未注入注册替身）在详情调用 add_to_cart 创建 AGENT 车 `abd8fb68-6dca-446a-a33b-d0377901d614`；导航车页重新发现 get_cart/update_cart，schema 为 expectedCartVersion + operation(oneOf)。实际调用 set_quantity(P001,2) 成功 v1→v2，页面同步P001×2、AI优惠184.00、应付3496.00。未提交该车订单，自动化 UI/工具验证不冒充 Human 验收。
- **旧协议补验：** 基础 MCP/Handoff 协议3/3、旧 Cart/Checkout HTTP5/5通过。首次误用容器内3001导致MCP Host白名单拒绝，改为配置允许的宿主 localhost:3002 后通过，未更改安全配置；旧HTTP套件初次因S2/S3专用环境变量未提供而跳过，按正确配置补跑通过。
- **最终独立 Review 与修复：** 全新只读 `/root/review_cart_operations_implementation` 核对最终业务范围，发现1项P2：目录/详情加购冲突或unknown后仍能再次发起增量。先用浏览器复现按钮错误保持可用，再补页面级刷新要求、拒绝工具新写入与打开原车核对入口；离页不保留全局锁。修复后桌面/移动4/4通过。其余已审范围无可行动问题；运行由实现者执行，Reviewer未自行重跑。此轮修复用回归重验，不叠加全量复核。
- **剩余验收：** 6.2～6.6 实施与对应验证已完成，6.7 中独立代码审查及发现修复已执行，但 Human 最终验收、4.2 真实人工接续仍待完成，故6.7/4.2/4.4不勾选；不自动归档、Push、Merge或进入S6。
- **最终修复后验证：** 六个受影响浏览器套件 `cart-operations/cart-review-fixes/cart/webmcp/checkout/handoff` 桌面/移动 **94/94通过**；同一最终源码的隔离 Docker 生产构建通过。Web/API lint、Web/API typecheck、Prettier 全仓格式检查、OpenSpec strict、Diff 检查通过。宿主 vitest 为39 passed/61 skipped，真实DB47/47、HTTP/MCP分别另行通过，如上记录；无Skipped冒充成功。完整冷刷新仍读取同车P001×2，未执行真实Human购买。
- **追加 Review 修复（2026-10-30）：** 已复现并修复两项 Findings：Human/工具编辑收到 `CART_COMPLETED` 后转入已有完成车视图、阻止继续编辑/结账并提供原订单入口；创建恢复在途时再次调用明确返回 `CART_BUSY`，不额外请求且保留原创建材料，并收紧返回类型以排除空结果。
- **定向证据：** 桌面/移动六项反例修复前按预期失败、修复后6/6通过；`WEB_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/cart-operations.spec.ts e2e/webmcp.spec.ts e2e/cart.spec.ts e2e/cart-review-fixes.spec.ts --max-failures=1` 为84/84通过，Commands单测4/4、Web typecheck/lint、受改文件Prettier与Diff检查通过。仅修改前端及回归，后端不变量复用本 Change 已有证据，未重跑DB或生产构建。
- **定向复核：** 全新只读 Reviewer Helmholtz 核对四文件修复及相关生命周期，无新增可行动问题；运行验证由实现者执行，Reviewer未自行重跑。4.2/4.4/6.7中的真实人工接续和Human最终验收继续待办，本记录不代表验收、归档或合并授权。


## 本轮归档与剩余工作 — 2026-10-30

随当前 agent-confirmed-purchase 的 Human 归档合入授权收尾。保留功能与 UI 优先购买增量一并接受代码交付；4.2/4.4/6.7中缺少的真实Host/人工接续证据保留为未通过事实，不补勾。原普通Checkout接续目标由 agent-confirmed-purchase 的网页直接支付/只读恢复替代，后续实际验收按新契约执行。非重叠 shopping-cart delta 已单独同步，webmcp-shopping 由新Change完整规格接管；归档跳过旧重叠delta，避免反向覆盖。
