# Tasks

状态：Approved Planning / S6 实施已授权（2026-10-30）。Human 要求提交当前规划后开始实施；进度以以下勾选和实际证据为准。先按 Git Checkpoint Policy 完成本 Change 精确路径的规划提交与 Guard，再执行兼容性前置任务；Push、Merge、发布及最终验收仍须对应授权。

## 1. 兼容性与真实 Host 验证

- [x] 1.1 在规划审查及 Human 批准后，核对 ext-apps 版本/peerDependencies 与现有 SDK 1.32.2、低层 Server 的兼容路径，记录实际版本及最小资源/Bridge 探针结果；如须重大协议栈迁移则先修订规划，不自动升级。仅安装本地工程必要依赖，不安装新 Host 或开放公网。
- [ ] 1.2 优先在当前真实 Codex Host 验证 Apps 扩展、UI 资源加载、完整工具输入/结果传递、Bridge 调用及 localhost 外链能力，记录 Host/协议/应用 revision；Human于2026-10-30授权先实现，当前未通过的真实外链改为交付前必须完成；若届时仍不支持则交Human选择可用Host，替身成功不算通过。

## 2. MCP 资源与独立构建

- [x] 2.1 建立 apps/mcp-app 最小 React 单文件构建及必要 lockfile/根构建/Compose/现有CI入口，验证六个固定URI共用React代码且各自静态入口标识正确，开发与隔离生产构建都能交付资源，不连接数据库/seed、不新增常驻服务；记录实际命令与 SDK 兼容结论。
- [x] 2.2 在原 MCP 认证入口增加静态资源 list/read 与六工具 UI 关联，验证正确 URI/MIME/元数据、未知 URI 错误、认证/Host/Origin 拒绝、无车数据入资源及不支持 Apps 的旧七工具发现/schema/调用结果兼容；同步 README 中资源与降级入口。

## 3. 展示复用与 Host Adapter

- [x] 3.1 按真实消费者提取最小 commerce-ui 展示，拆除共享部分的 Next/Commands 依赖，复用金额/摘要；以 Web 商品/Cart/Checkout 展示回归、Apps 窄宽容器与键盘测试验证不改金额、无重名合并、标题ID唯一、基础控件方向一致，无 Next/服务端秘密进入 Apps 产物。
- [x] 3.2 通过官方 App Bridge 接收完整工具输入/结果并用现有 contracts 校验，按静态资源入口工具名及车匹配后仅在 Adapter 内存保留必要能力；测试Host未提供toolInfo仍正确解包、可选toolInfo冲突拒绝、Bridge返回按实际调用名处理、缺能力只读、非法/错车输入拒绝、纯组件props/DOM/日志/存储无秘密、恶意文本不执行及资源CSP/权限限制，更新运行和信任边界说明。
- [x] 3.3 实现商品结果、原车问题/空/完成状态及显式刷新，覆盖首次校准、低版本/旧代次拒绝、换车/销毁清理、重挂载无持久权限恢复；用替身 Bridge 消息与渲染测试验证，不将该结果记为真实 Host 验收。

## 4. 原车编辑与外部结账

- [x] 4.1 实现数量/移除草稿及明确整车保存，经 Bridge 调用现有 update_cart；回归非法数量、全移除、旧问题行整车拒绝、成功服务端报价、同车在途互斥、外部快照保护草稿、冲突/unknown后需刷新、旧成功不得解锁及显式放弃重读；验证初次校准/重载/保存发出前同步忙碌，期间数量/移除/保存/重载/结账的控件和动作处理器均拒绝，重载发出后无法新增草稿，旧操作结束不解除新操作忙碌，无自动合并/换版本/重放。
- [x] 4.2 实现显式结账前校准、create_handoff 与受校验 openLink；覆盖草稿阻止、校准后受阻/完成/到期、交接未知显式幂等重试、恶意URL拒绝、外链拒绝/不支持/未知反馈及无自动打开/提交；验证整个读取→交接→打开期间禁止编辑/保存/重载/重复结账，每次异步返回后检查原车/存活/操作代次/无草稿与刷新要求/可结账状态，校准或交接等待期间尝试输入被拒绝，换车/销毁后原交接返回不打开；复用固定24h和原Checkout契约并更新README。
- [x] 4.3 经真实 MCP 入口对专用测试环境验证 Apps 所用原车链路，核对数量/报价、同版本竞争最多一次、编辑不扣库存、完成车拒绝和旧七工具兼容；服务端交易未变则引用有效PG不变量证据，若改变权限/交易路径必须补受影响真实PG/并发验证，不能只用Bridge替身。

## 5. 集成、Review 与 Human 验收

- [x] 5.1 执行受影响静态检查、生产构建、Web/Apps集成回归，检查Apps资源版本、Web脚本无Host SDK扩散、无Hydration警告与窄宽布局；只重跑受影响测试，skip与环境限制单独记录，失败定位修复后定向重验。
- [ ] 5.2 在真实目标Host完成商品结果→Agent建车→Apps编辑→同车外链的可见闭环，记录资源隔离、实际Bridge调用、版本/金额及脱敏UI证据；由Human在浏览器实际审阅确认，核对同车唯一订单与库存，自动化点击不代签人工接续。
- [x] 5.3 对最终Diff完成适用独立Code Review、Findings修复/重验及必要定向复核，交付验证证据/限制及Human验收入口；传播实际批准的基线/运行说明，不提前标记三模式完整交付。核对S5待办保留状态，不在S6中勾销。
- [ ] 5.4 取得Human最终验收与残余风险判断，完成精确范围Delivery checkpoint/Guard并报告分支/提交/未提交内容；验收不通过则修复重验，不自动发布或开始最终Showcase。

## Planning Review

规划起点为 `66b2e0a`。本轮仅创建本 Change；未改业务代码/正式 Spec/Approved Baseline，未安装依赖、运行 Host 探针或购买。Human 已选择最小购物闭环；整份规划批准与实施授权待取得。

2026-10-30：全新只读 `/root/s6_builder_check` 做可实施性 Design Review，指出共用资源无法依赖可选 HostContext.toolInfo 识别触发工具。已将 Design §2/4 与 Tasks 2.1/3.2 修订为六个固定 URI 共用代码、资源内置入口工具名，主动 Bridge 结果按实际调用关联；Reviewer 定向复核确认关闭，其余权限/编辑/Checkout/草稿竞态边界足以规划实施。审阅者未运行实现测试。当前短摘要足以审阅本轮范围，未生成额外可视化。

本轮静态证据：OpenSpec 1.15.0 `validate s6-mcp-apps --strict` 通过，四类产物齐全；四份 Markdown 的 Prettier、内部链接存在性、路径归属及空白检查通过，14项实施任务全部未执行。无业务测试或真实 Host 兼容性证据。进入 Implementation 涉及权限边界，须先完成 Human Approval 与规划提交/Guard；本轮未进入该转换，不声称 Guard 已通过。

2026-10-30 定向修订：独立 `/root/s6_plan_review` 指出读取/交接在途期间未明确保护新输入的 P2。Human 授权最小修订后，Design §5/6 明确同步忙碌、控件与处理器同时拒绝、整个结账链路互斥及每次异步返回后的原车/操作代次等重验；Spec 增加重载后输入、校准/交接期间输入、交接等待换车/销毁三个反例，Tasks 4.1/4.2 同步验证。原 Reviewer 定向只读复核确认 P2 在规划层关闭、修订无直接矛盾；未运行实现测试，不代表业务效果已验证或整份规划获批。Proposal 范围不变，本次无需修改；无新增文件或实施任务。

2026-10-30 最终规划复审：全新只读 `/root/s6_final_plan_review` 核对修订后的完整规划、原 MCP/CartService/contracts 与正式契约，无新的可行动 Finding；未运行实现测试或改文件。Human 随后要求提交当前规划后开始实施，本次记录该批准及提交/实施授权，尚不代表 Host 兼容性或产品验收通过。

## Implementation evidence — 2026-10-30

- 规划提交 `4ab37ad`，本 Change 五个精确文件的 planning Checkpoint Guard PASS；Verification/Review/Human Approval 来自本轮真实记录。未 Push、Merge、归档。
- 1.1：官方 npm 元数据确认 `@modelcontextprotocol/ext-apps@1.1.2` 的 SDK peer 为 `^1.24.0`，兼容现有 `@modelcontextprotocol/sdk@1.32.2`。在 `/private/tmp/agent-store-s6-probe` 隔离安装固定版本及 zod 4.3.6；pnpm 下载/链接完成但命令因 ext-apps 的 postinstall 未获运行返回 `ERR_PNPM_IGNORED_BUILDS`，未批准或运行该脚本（其用途为 setup-bun）。已发布 dist 可直接导入，不能把安装命令标为成功。项目 package.json/lockfile 未改。
- `node /private/tmp/agent-store-s6-probe/probe.mjs` PASS：使用低层 Server + Client + InMemoryTransport 验证 UI 工具元数据、资源读取/MIME；官方 App/AppBridge 验证握手、完整输入/结果、工具转发和替身 openLink。无业务购物、数据库写入或实际打开操作；该证据仅证明固定 SDK 组合的隔离兼容性，不代表真实 Host、iframe 隔离或浏览器成功。
- 1.2 阻塞：当前聊天工具目录无本项目七工具；本机 Codex 配置中未发现商店服务项。cua 实际发现 Codex MCP Apps surface，但 tabs 为空，不能据此证明项目兼容。尝试获取 Codex 原生窗口被安全策略明确拒绝（app com.openai.codex），未尝试其他技术绕过。已请 Human 在 Host 接入现有 `http://localhost:3002/mcp` 与本机 Bearer 凭证或指定可用 Apps Host；未输出/修改凭证。未证明 Host 不支持，只是当前连接/操作入口不足；按 1.2 停止依赖实施，2.1 及后续未开始。
- 正常 Compose Web/API 与两数据库服务已在运行，本轮只读检查状态，未重启、迁移、seed 或清理卷。宿主 Node 24.22.2、pnpm 12.11.2。最初沙箱内 npm 元数据查询因 DNS 失败，获准的注册表查询/临时依赖下载成功取得上述固定版本；不将网络失败当作版本不兼容。

2026-10-30 连接补验：Human 报告已连接后，只读确认本机新增 `mcp_servers.agent_ready_store`，URL 为既有 localhost:3002/mcp。使用本机 .env 凭证的诊断 SDK Client 成功 initialize、发现七工具、search_products(limit=1) 返回 ok=true；服务版本 0.1.0、capabilities 仅 tools。该连接为独立诊断客户端，不是当前 Codex Host。当前聊天 ALL_TOOLS 仍无七工具，针对该 server 的 MCP 资源查询实际返回 unknown MCP server，说明配置尚未进入本会话可用工具运行时；1.2 保持未完成。需在 Host 刷新/重启连接并使当前会话可发现工具后继续，未将诊断成功冒充 Apps UI 验收。

2026-10-30 重启/复测：本机 CLI 提供 config/mcpServer/reload 协议，但默认 app-server 控制 socket 不存在，无法向当前桌面进程发出重载；未连接未知 IPC 或启动另一 daemon 冒充当前 Host。只读 MCP 复测发现 localhost:3002 ECONNREFUSED，Compose ps 无运行服务；按 Human 重启并复测指令恢复现有 api/web 与 db 依赖（保留卷，无迁移/seed），API 健康后再次诊断认证成功、发现7工具、search_products ok=true。当前聊天 ALL_TOOLS 仍无商店工具，1.2 继续未完成，需要 Host 重新加载连接。

2026-10-30 当前聊天工具加载：真实 Host 工具目录已出现七工具，直接调用 search_products(limit=1) 返回 ok=true，原“无商店工具”阻塞已解除。为 1.2 接入临时只读 UI 探针（非完整 S6 实现）：search_products 关联 ui://store/s6-host-probe.html，原 MCP 认证入口提供无秘密的单文件 SDK UI；仅公开诊断、只读查询和打开商城首页按钮，不建车/编辑/购买。资源契约测试先因缺 UI 元数据按预期失败，接入后与原 MCP 回归3/3通过；测试text/blob联合类型收窄修正后 API typecheck、lint、Prettier、Diff检查通过。重启清除临时目录后已重新以固定版本、ignore-scripts/no-optional恢复 SDK 探针依赖，安装命令成功且未运行脚本，项目依赖不变。

Host 刷新后再次查询成功，原生资源发现列出 S6 Host Probe；但 cua MCP Apps 侧边栏列表仍为空，已请 Human 确认是否有内嵌卡片并展开。尚无真实 UI/Bridge/外链操作证据，1.2不勾选，未断言Host不支持；依赖任务仍未开始。临时适配/测试/ignored dist探针仅用于本门槛，待兼容性结论后移除或由正式实现替代，不作为生产交付或提交对象。

2026-10-30 rebase main：Human 明确允许临时 stash 保存三个 S6 未提交文件后 rebase 并恢复。已基于 main 238fcfa 完成 rebase，原规划提交4ab37ad重写为5ba3397；adapter/tasks/未跟踪测试恢复后的SHA-256分别与操作前完全一致，本次专用stash在核对后删除，无遗留stash。rebase后 MCP资源与原查询/认证回归3/3通过，真实Host search_products成功，但Apps侧边栏仍无视图，1.2保持未完成。当前已向Human提出仅调整实施顺序、真实Host仍作交付必需门槛的建议；取得明确答复前不扩大到后续生产实现。

2026-10-30 Host 定位继续：Human 明确选择保持原顺序，真实 Host 门槛仍是后续实施前提，不将其移至交付阶段。对照固定 ext-apps 1.1.2 helper 源码发现其同时补齐 legacy ui/resourceUri；临时探针补入该兼容字段及官方可选 openai/outputTemplate。新增兼容断言先观察到 undefined 的预期失败，补齐后与原MCP回归3/3通过，API typecheck/lint通过。增加临时无凭证初始化能力/资源读取次数诊断，不记录Headers或工具参数。当前直接Host查询成功，但未观察到新Host初始化（最近记录仍为测试客户端），已请Human刷新连接以采集真实Host声明。未以测试客户端的空UI能力判定真实Host不支持；当前仍1/14，尚无UI/Bridge/外链证据。

2026-10-30 重启后的真实 Host 证据：诊断捕获 codex-mcp-client 0.166.0-alpha.5.1 于 08:05:09 UTC 的 initialize，未声明 io.modelcontextprotocol/ui 扩展。原生 search_products(limit=1) 返回 ok=true，调用前后资源读取计数由6增至7，说明 Host 已请求探针资源；不能仅凭未声明能力认定其无法渲染。cua MCP Apps侧边栏仍为空，已请Human确认内嵌卡片并展开，Bridge/外链仍待真实视图验证，1.2保持未完成。

2026-10-30 探针空白修复：Human确认卡片存在但内容无法显示。检查实际资源发现临时内联生成使用字符串replacement，bundle中的$&被展开为原script标签，导致HTML出现3个script结束标签并截断模块。新增真实资源断言先复现失败（3而非1），改用函数replacement重建ignored探针后资源仅1个结束标签，模块node --check通过，资源与原MCP回归3/3通过。重新触发真实Host查询成功，Human随后确认内容显示并已展开，但评价临时探针样式欠佳。cua tabs与全surface清单仍未暴露该视图，因此已请Human在真实卡片执行只读查询及打开本地首页并反馈五项状态；尚不以内容可见替代真实Bridge/外链验收，1.2仍未完成。

2026-10-30 Human真实卡片验证：反馈handshake/input/result/read均为true，确认UI、输入/结果和只读Bridge查询可用；open原为true但商城首页实际未打开，外链不计通过。检查固定SDK声明发现openLink可返回isError而非抛异常，原临时探针漏查该字段；已修正诊断并显示Host公开name/version、openLinks能力声明及openIsError，重建后语法/单结束标签检查通过。Human反馈真实Host为chatgpt 26.1027.30824，openLinksDeclared=true、openIsError=false，握手/输入/结果/查询均true，但两次确认实际页面未打开。结论限定为该Host此次localhost外链请求返回成功而未观察到打开；不推断所有Host不支持，不继续盲改服务端或放宽策略。自动化仍无可用App tab，未冒充自动化操作或外链成功；1.2保持未完成，依Human此前保持原顺序的决定暂停后续实施，等待选择另一可用Host或明确修订该门槛。

2026-10-30 顺序修订授权：Human明确回复“授权先实现，交付前补验”，替代此前保持原顺序的选择。仅解除1.2对编码的前置阻塞，不降低真实Host外链、可见闭环和最终Human验收标准；Proposal/Design/Tasks同步，1.2仍未勾选，业务Spec无需变更。


2026-10-30 实现任务组（本轮收尾）：

- 2.1–4.2：正式 apps/mcp-app 使用 React 19.3、ext-apps 1.1.2 / SDK 1.32.2、Vite 8.3.5，生成六个固定 v1 单文件资源与静态工具入口；原认证入口只读白名单资源。已移除临时探针元数据/诊断代码，ignored探针HTML由正式构建替换。commerce-ui提取金额/成交摘要/商品展示壳，Web适配保留Next导航及加购；报价标题useId避免重复。Adapter内存权限、完整输入校验、首次校准、原版本整车草稿保存、显式刷新锁、全链同步忙碌/代次校验、受校验外链及拒绝/未知/到期反馈均已实现，无新增业务工具/常驻服务/数据库迁移。
- 受影响验证：controller最终28/28、共享SSR2/2；无环境全量unit/contract最近68通过/64跳过，随后补充完成车controller回归通过（环境跳过不等于集成通过）。运行中API正式资源/七工具与认证/Origin/原始HTTP Host拒绝4/4；专用store_test经真实HTTP MCP及原handoff/checkout DB测试22/22，覆盖同版本最多一次、编辑不扣库存、固定交接期限、完成车只读与唯一订单。只迁移/清理/seed专用测试库，无正式库迁移或库存重置。
- UI/构建：官方AppBridge替身的桌面与真实窄视口2/2（测试夹具UTF-8、viewport及报价字段错误已定位修复）；既有Web商品/Checkout/订单布局18/18，无Hydration错误。test-results/mcp-app-*/mcp-app-fixture.png为替身UI截图，非真实Host证明。typecheck/lint/Prettier/OpenSpec strict/Diff检查通过。Compose开发启动构建六资源，隔离production镜像默认API/Apps/Next构建通过且无DB连接；镜像资源6份、Web客户端无ui/initialize桥代码。宿主Next/Turbopack因沙箱端口权限失败，未冒称宿主构建通过。WEB_ORIGIN同时传入生产构建参数，文档记录修改后重建；SDK setup-bun禁用且忽略无消费者可选Bun二进制，不改变Next/Vite平台绑定。
- 独立Review：全新只读 /root/s6_implementation_review 审查最终S6实现范围，发现needsRefresh被Host快照自动解锁及修复后的缺失权限恢复死锁两项P2。各新增回归先复现失败，修复后Reviewer定向重跑controller20/20并确认关闭；后续到期反馈/构建origin/专用PG测试/文档增量定向复核无新增Finding（Reviewer实际重跑21+2，其余新增URL/完成车测试由实现者运行）。简单摘要和真实替身截图足以审阅，本轮不生成额外Recap。
- 进度11/14：1.2、5.2、5.4仍未完成；Human授权只移动了实施顺序，不批准真实外链失败、不替代浏览器实际购买验收、不替S5关闭待办。正式资源元数据已更换，真实Host需刷新连接加载后继续验收。首次implementation checkpoint Guard因尚无实现提交、成果路径仍有修改而拒绝。Human随后明确授权“允许提交实现 checkpoint”；本次仅在codex/s6-mcp-apps提交精确实现/测试/构建/文档范围，再重跑Guard，结果留当前对话；真实Host与最终验收仍未完成。无Push/Merge/归档。

## Workflow follow-up

- Human 验收及对应授权后同步正式 `mcp-app-shopping` Spec、归档当前 Change；Git 提交/Push/Merge按独立授权，不把文件齐全当成批准。
- S5 的真实人工接续、最终验收与归档沿原 Change 处理；完整交付前核对 S4/S5/S6 真实证据及保留限制，最终 Showcase 另按授权开展。
