# Tasks

状态：**规划已批准，S1 实施已授权（2026-10-29，Human；来源见 Proposal）。** 默认约束见 [AGENTS](../../../../AGENTS.md#默认执行原则)，验证计划见 [Design](design.md#风险驱动验证计划)。Spec 与关键设计（含 P-02）已获集中批准，不逐 Task 审批；未勾选项尚未完成。

## 1. 最小 Bootstrap

- [x] 1.1 在 Spec 审阅及实施授权后，按 [Preflight](preflight.md) 只补查版本兼容、registry/镜像、启动端口与 Codex 连接条件，复用已确认工具事实；以实际输出核对必要缺失项及解决办法，不触碰现有其他项目服务、不安装可选工具或启动 S2～S6 设施。
- [x] 1.2 依赖 1.1：建立 private pnpm Workspace、版本锁定/单一 lockfile、apps/web、apps/api、packages/contracts 与共享 TS 基础配置；定义 contracts 的 exports/JS/声明构建及 workspace 依赖，Web/API 分别覆盖框架编译选项。先以 contracts 构建及 exports/声明产物检查验证共享包；双端实际导入在 1.3 验证，不新增构建编排框架。
- [x] 1.3 依赖 1.2：使用锁定版本的官方脚手架初始化最小 Next App Router 和 Nest 壳，统一根安装且不创建嵌套仓库；建立 contracts watch → Web/API dev 及生产 start 的入口。用两端实际导入 contracts 的编译检查、最小页面、API 健康响应和一次源码改动的 HMR/watch smoke 验证，保留原有文件；不接入交易功能。
- [x] 1.4 依赖 1.3：配置必要 ESLint、Prettier、typecheck、按依赖顺序 build 和统一测试 runner/定向测试入口；忽略生成物及只读原件。验证 format:check/lint/typecheck 和一次空壳 build 可运行，build 不连在线 API/DB；不以空测试当通过，真实测试随功能建立。README 写明各命令及用途，不预建 CI/CD 或质量平台。
- [x] 1.5 依赖 1.3/1.4：建立独立三服务 Compose 的 dev/production 运行方式、持久卷/隔离测试库、API 内 Prisma Inventory schema 与生成/迁移入口、无秘密环境样例及配置检查；启动 PostgreSQL readiness → client generate/migrate → API/Web，验证迁移可应用且重复执行不重置数据、Web 到 API 健康链路/同源反代和宿主到 API 映射端口可达。README 记录端口、环境变量、启动顺序及停止方式；JSON 只读挂载，DB 不占现有宿主 5432，不自动清卷或引入 S2～S6 模型。Catalog seed 在 2.1 完成，/mcp 协议在第 4 组验证。

后续依赖：第 2 组在 1.5 完成后建立真实数据通路；第 3、4 组均依赖 2.2，默认按下列顺序执行；第 5 组汇总所有功能组证据。各组验证通过后才标记完成，不要求逐任务重新审批或全量测试。

## 2. 目录、Inventory 与 HTTP 契约

- [x] 2.1 实现只读目录加载、必要结构校验、不可变 revision 与 Inventory 首次初始化，遵循 Design 的空库显式 seed/事务规则；用真实样本验证同名/异常值保真、坏结构启动失败，以隔离的真实 PostgreSQL 验证首次 seed、提交前故障全回滚后重跑成功、改量/删行后重跑拒绝且无数据变化、已有值重启不覆盖、缺行不可购及 DB 失败，记录实际命令。
- [x] 2.2 实现共享查询用例、公开投影/schema 与三个 HTTP 读取入口；以少量契约测试覆盖组合筛选、推荐/同分排序、固定目录/库存条件下分页末页/空页、全部评论、非法参数/未知字段、未知 ID、revision 变化及内部字段排除；补一个 purchasableOnly 翻页间改库存的反例，验证按当次库存查询、不误报目录变化或承诺跨页快照。核对 P005 纯文本，补充 README 接口说明及分页保证边界，运行相关 API/contracts 检查。

## 3. Web 商品发现

- [x] 3.1 接入列表与详情 RSC、URL 查询导航、独立评论分页与加载/错误/空状态，沿用已批准视觉方向；定向验证首屏 HTML、URL 恢复/前后退、筛选归零、快速查询迟到结果/跨商品评论隔离、失败重试和库存更新可见，运行 Web typecheck/相关 smoke，不为普通展示组件强制单测。

### 3A. 已授权 UI 选型增量

- [x] 3.2 在现有 apps/web 按官方既有项目方案接入 Tailwind/PostCSS、shadcn 配置与四个实际基础控件，锁定所需依赖；保留业务组件、RSC/Client 边界和主题/断点，迁移原生基础控件并去除冲突 CSS。验证 checkbox 的真实 FormData、标签/焦点、pending/disabled、页面/评论导航与重试语义。
- [x] 3.3 对增量执行 Web typecheck、Lint、build 及桌面/移动 UI smoke，核对黑白极简/繁体中文/响应式无回归；复用未受影响的后端/数据库/MCP 证据，将新 Web 验证与 5.2 待验收范围记录于本文件。此增量依赖已完成 3.1，不重做第 1/2/4 组或新增 S2 任务。

## 4. 只读 MCP 与真实 Codex

- [x] 4.1 在 Nest 内通过 Streamable HTTP 将三个既定工具接入同一查询用例和 schema，落实服务身份及适用 Host/Origin 边界；复用 2.2 的正常/异常契约样例对照 HTTP/MCP 数据、分页与错误语义，检查握手/协议头/流，验证身份/Host/Origin 拒绝及秘密不泄露，README 补充不含秘密的配置方式。
- [x] 4.2 用真实 Codex 连接 Nest，完成搜索 → 指定 ID 详情 → 评论分页读取；保留实际 Host/transport/工具调用及结果证据，确认 P005 文本不触发商城操作。若失败，按 transport/auth/schema/网络/Host 定位后重验；未通过保留验收缺口，模拟客户端结果不替代真实证据。

## 5. Slice 集成验收

- [x] 5.1 汇总仍有效的任务组证据，在最终 revision 运行一轮完整 typecheck/build、必要真实 DB 集成和关键 E2E；验证 dev/production 启动、构建无需在线 API/DB、反代状态码/响应头、Hydration 与动态库存缓存边界，新增变更后仅重验受影响链路。
- [x] 5.2 验证 S1 桌面/移动、键盘/焦点/标签、缩放与基本读屏可用性，对照列表/详情既有设计；记录轻量性能基线的 revision/构建模式/设备网络条件。复核 Spec 场景、真实 Codex 结果和残余风险，交 Human 最终验收；证据只更新本 Tasks/对话和必要 README，不另建进度或方法报告。

## 6. 本轮 Review 修订（Human 授权，2026-10-29）

- [x] 6.1 按 Human 明确要求将四个基础组件迁至 shadcn Base UI，移除应用直接 Radix 依赖，保留主题、链接、标签及 Checkbox 表单/键盘行为，完成 Web 静态检查、生产构建和桌面/移动回归。
- [x] 6.2 修复已有 Docker 开发依赖卷不随 lockfile 更新的问题，在开发服务启动前同步依赖；验证既有卷中新依赖可解析，更新可复现命令，不删除库存卷。
- [x] 6.3 修复合法价格文本提交后被拒绝，以浏览器回归验证指数表示与普通小数查询；同步 README 当前 S1 状态，记录实际证据及限制。

- [x] 6.4 修复分页链接的空格键误导航：使用 Next Link 与 buttonVariants 保留样式，验证上下页 Space 不激活、Enter 正常导航，完成 Web 检查及 Docker 回归。

6.4 验证（2026-10-29）：新增回归在旧 Docker 版本失败，确认 Space 会派发点击；改用原生 Next Link + buttonVariants，去除 Button 的 nativeButton/role/render 组合。Web typecheck、Lint、格式检查通过。首次生产构建因未使用的 Geist 字体下载失败中止；body 已使用批准的系统字体栈，移除 layout 多余字体导入与 html 字体类后，Docker production build 成功。仅更新本机 Web；镜像 sha256:a8346f584ef088e8c6cb892056a49b511bed742812ad05d9040e62cd11b08536。桌面/移动全套 E2E 12 passed（6.6s），含上下页 Space 不激活、Enter 导航和既有价格/Checkbox/评论场景。不重跑未受影响的后端或真实 Host，不新增真实读屏证据；未提交、归档、Push/Merge，不冒称 Human 已重新验收本轮修订。

## Workflow follow-up

- 2026-10-29 收尾 Review 与归档授权：Human 明确“再进行一轮 review，没问题就归档”。本轮为行为/交付自查，未发现新增阻塞性 Finding；核对运行镜像与 page/layout/search-form/button 四文件哈希一致，复用上一轮 Docker production E2E 12 passed 和仍有效的定向证据，不重复昂贵构建。18/18 Tasks 完成，规格 strict 与 Git 空白检查通过。已同步 product-discovery 的 6 条正式需求，Purpose/需求正文完整保留。按本次授权归档，原 Human 验收历史与真实读屏未实测限制均保留；不将本次自查说成独立 Review 或新增读屏测试。相对链接随归档位置调整，README 导航同步；未授权 Commit/Push/Merge 或 S2。

- Git Commit/Push/Merge 取得对应授权后按逻辑审查单元执行；不逐任务建分支。
- 后续允许按逻辑任务组分批 Commit，不要求所有开发集中为一个提交；每组先完成对应验证，不将其解释为本轮已授权提交或实施。
- S1 验收后按已有 OpenSpec 流程同步/归档；S2 及后续 Slice 等待对应授权。

## 实施证据

- 2026-10-29：Human 批准规划并授权实施。1.1 已核对官方 registry 版本/engines：Node 24.22.1、Next 16.4.3、Nest 12.3.2、稳定 Prisma 7.10.1、MCP SDK 1.32.2；npm 网络可用，Docker 29.9.2 已启动，固定 Node/PostgreSQL 镜像已拉取。宿主 3000/3002 本次未观察到监听。业务与 Host 行为仍待验证。

- Bootstrap 1.2/1.3：官方 Next/Nest 脚手架已生成，无嵌套仓库；contracts JS/声明构建及双端实际导入、初始 production build/typecheck 已通过。Next 本机 3000→Nest 3002 的 health 反代及页面源码热更新已验证。依赖构建脚本仅批准 Prisma 引擎与 unrs-resolver；未启用监控。

- 1.4/1.5/2.1：初始 build、typecheck、Lint/Format 检查已通过；独立 Compose Web/API/PostgreSQL 已运行，Prisma generate、迁移及重复 migrate（No pending migrations）通过。真实 store_test 的三项初始化测试通过（全回滚/重试、改量删行后拒绝重跑、并发只成功一次）；演示库已首次 seed 30 行。Catalog 七组真实数据/查询契约测试通过。运行证据不表示最终 Slice 验收完成。

- 2.2/3.1/4.1/4.2：HTTP 与官方 Streamable HTTP 客户端三项真实集成检查通过（含工具发现、公共数据/错误一致性、身分/Host/Origin 拒绝）；Chrome 桌面/移动六项 E2E 通过（URL/前后退/筛选归零、完整评论、异常状态/重试、跨商品迟到请求隔离、键盘与无横向溢出）。真实 Codex CLI 临时只读 Host 已完成 search_products(Pulso,limit=2)、get_product(P005)、list_product_reviews(P005,limit=1,offset=0/1/2) 五次成功调用，读完三评论，未执行其中指令；工具发现/调用由 Host 的 functions 包装，原始事件暂存 /private/tmp/s1-codex-host/events.jsonl，摘要为同目录 result.txt；未写全局 MCP 配置。
- 真 DB 故障验证：临时改动演示 P001 库存后新请求可见，API 重启后保留，再恢复原值；停止本项目 DB 时商品查询返回 TEMPORARY_UNAVAILABLE/503，无 JSON stock fallback，随后已恢复 DB/API。
- 独立只读审查发现 production rewrite 构建期地址问题（P1）及 HTTP 详情未知 query 漏校验（P2）；均进入当前任务修复，待 production 验收确认，不代表审查自动批准。

- 独立审查修复：HTTP 详情未知字段用例先复现 200/400 与 HTTP/MCP 不一致，修复后相同三项 HTTP/MCP 集成检查全部通过。production rewrite 已改为构建阶段显式 API_INTERNAL_URL build arg；生产浏览器链路尚待本轮构建完成。
- UX 已对照实际桌面/移动截图与批准方向：沿用本地原创建构示意 SVG、黑白样式；Chrome 可访问性树能读取标题/标签，200% CSS 缩放无横向溢出。尚未运行真实 VoiceOver/其他浏览器，不能将自动语义检查当完整读屏验收；最终 Human 验收待交付。

- 5.1：生产 Docker 镜像构建通过（schema generate 使用无效构建期 DB 凭据、不访问运行数据库；Next 列表/详情为 Dynamic），生产 API/Web 已启动。manifest 中反代目标为 http://api:3001，实际同源评论代理返回成功；生产 Chrome 桌面/移动六项 E2E 全通过。生产 API 上完整 Vitest 运行 10 passed / 3 skipped（未配置 TEST_DATABASE_URL）；隔离 store_test 中另跑 3 passed，跳过不计为通过。缺少测试库时的 setup 收集错误已修复并重验。typecheck、Lint、Format、OpenSpec strict、Diff 检查通过，真实本地秘密在非忽略文件中扫描为 0，references 未修改。
- 生产性能基线（单次实验室观察，非性能承诺）：Chrome 156.0.8078.73，1440×1000，本机 loopback、无节流，列表 TTFB 44ms、DOMContentLoaded 86ms；此次采样未取得 Paint 指标。截图为 /private/tmp/s1-production-desktop.png、s1-production-mobile.png。实现文件树 SHA256 cb1ca761cf5c864a3acc6b7b5ef1b8a8b21813aa74f47561f902c46e8b9989db；生产镜像 sha256:4624a2c401395770d4fef5dd3765ce0b7980e39fa08d733c17e19d70cbf690d3。均对应当前未提交实现，不能记为 main/CI 结果。
- 独立审查两项 Findings 已核实并修复：P2 用失败→通过的 HTTP/MCP 对照验证；P1 用生产 manifest、实际评论反代及生产 E2E 验证。没有未解决的已确认 P1/P2；不将此视为最终 Human 验收。5.2 保持未勾选：已完成截图/自动语义/键盘/200% CSS 重排检查和证据汇总，真实读屏软件实测及最终 Human 验收尚未完成。Git 未获本轮提交/Push/Merge 授权，保留可审查工作区。

- 2026-10-29 shadcn/ui 增量 3.2/3.3：复用现有 Next.js，官方 shadcn 4.23.0 CLI 初始化 radix-nova/neutral；Tailwind 4.3.3 + PostCSS，添加 Button/Input/Label/Checkbox，主题保留黑白、3px 圆角、44px 输入/按钮、繁体中文与既有断点。ProductCard/Reviews/SearchForm 的业务职责和 RSC/Client 数据边界保留；业务行为未变化，Specs 未修改。生成 Checkbox 的 data-checked 样式与实际 Radix data-state 不符，已修复并以真实浏览器选中配色断言覆盖。
- 本增量验证：Web typecheck、Lint（0 warning）、最终 production build、格式检查和 Diff 检查通过；Chrome 桌面/移动 8 passed，覆盖既有 6 项及新增键盘 Checkbox/FormData/URL 状态/选中主题两项。初次新增测试的多元素断言错误已修正；失败不计为通过。新生产 Web 本机 127.0.0.1:3003 → 既有 API 3002 → PostgreSQL，实际评论反代通过；未重跑未受影响的后端测试。截图 /private/tmp/s1-shadcn-desktop.png、s1-shadcn-mobile.png。旧 5.1 Docker 镜像/性能指标只代表迁移前版本，新 UI 验证来自本机 Web 构建，未重建 Docker 镜像；无发布。5.2 真实读屏与最终 Human 验收继续待办，未推进 S2。

- 2026-10-29 最终验收更新（取代上述待验收状态，保留历史证据）：Human 在获知 Task 5.2 的真实读屏实测缺口及最终验收范围后，于本聊天明确“我已經驗收通過了”。据此记录 S1 Human 验收通过，5.2 按 Human 验收结案，全部 14 项完成。真实 VoiceOver/其他读屏软件实测仍无新增证据，不记录为技术测试通过；该已披露限制随本次 Human 验收保留。最新 UI 验证对象仍为本机 Web production build，旧 Docker 镜像未包含 shadcn/ui 增量。本次仅更新验收状态，不扩展 Git Commit/Push/Merge、发布、OpenSpec 归档或 S2 实施授权。

- 2026-10-29 Review 修订 6.1/6.3：Human 明确授权 Base UI 迁移及缺陷修复。官方 CLI 按 base-nova 重生成 Button/Input/Label/Checkbox，安装 @base-ui/react 1.9.0、移除 Web 直接 radix-ui 依赖；保留 44px 控件与既定主题，分页链接使用 render/nativeButton=false 并显式 role=link。Web typecheck、Lint、最终 production build 通过。新增价格 E2E 在旧构建以 minPrice=1e2 原样提交失败；修复为十进制文本后，本机 production Web 3003 → API 3002 的桌面/移动全套 10 passed，覆盖 1e2、100.25、-0 与上下界拒绝及既有功能。迁移首轮发现链接角色回归并已修复；新增测试最后反例原有数据设错（0≤1），修正为100>1后通过，失败不计通过。README 已改为引用当前实施/验收与本轮修订状态。后端代码未变，复用先前有效 DB/HTTP/MCP 证据；不重复真实 Host 或真实读屏验证。

- 6.2 开发依赖卷修复：新增 Compose deps（tools profile）与 pnpm dev:deps，pnpm dev 先同步再启动服务；README 首次步骤同步更新。用既有 root_modules/web_modules/api_modules 执行 frozen install 成功，随后容器解析 @base-ui/react/button、cn、tailwindcss、shadcn 均成功。临时 Docker Web 3004 使用同一开发配置与既有卷编译真实首页，HTTP 200 且包含 Base UI；桌面/移动价格与 Checkbox 定向 E2E 4 passed。未删除或重置任何库存卷，未改演示库存。

- 最终 Docker 补证：已构建最新 production 镜像并仅更新本机 Web 容器3000，API/数据库继续运行；镜像 sha256:56637f677016b6876bf698fbe2af5d3aae22b0351bcdd215d1d8e28502fff459。Docker production Web → API 的桌面/移动全套 E2E 再次10 passed（6.3s），包含实际评论同源代理与新回归；移动截图 /private/tmp/s1-base-ui-mobile.png。当前镜像已包含 Base UI 与价格修复，取代此前“最新 UI 仅本机构建、Docker 镜像过旧”的限制；本轮没有新增真实读屏证据。依赖下载曾因连接中断被包管理器重试后成功，不是构建或业务测试失败。临时3003/3004服务均已关闭。所有新增任务完成，原 Human 验收记录只代表当时对象，不冒称 Human 已重新验收本轮修订；无提交、归档、Push/Merge 或公开发布。
