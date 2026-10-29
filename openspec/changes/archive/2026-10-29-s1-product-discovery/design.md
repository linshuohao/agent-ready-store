# Design

## Context

动机与范围见 [Proposal](proposal.md)。状态为 **Approved / Implementation authorized**；Human 于 2026-10-29 批准当前规划并授权 S1 实施，批准来源与权限边界见 Proposal。

现有架构与批准来源见 Proposal 的基线引用，不重开选型。规划时的预检见 [Preflight Report](preflight.md)；实施时重新核实变化的环境事实，进展与阻塞记录于 Tasks。

默认执行原则见 [AGENTS](../../../../AGENTS.md#默认执行原则)，应用方式见 [PRODUCT_ENGINEERING](../../../../docs/workflow/PRODUCT_ENGINEERING.md#精益执行的工作流应用)；以下仅补 S1 实施选择和验证安排。

## Goals / Non-Goals

**Goals:** 以现有 Next.js/NestJS/Prisma/PostgreSQL/pnpm 架构实现一个共享只读闭环；业务行为见 [Spec](specs/product-discovery/spec.md)。

**Non-Goals:** 不预建 Cart/Order 表或未来权限恢复体系；不为复用提前抽 packages/ui、查询总线、Repository/Factory/Registry 层；S1 页面只呈现已实现的只读功能，不提供假成功的加购按钮。加购及 Cart 交互依全局切片顺序在 S2 接入。

## Decisions

### 最小 Bootstrap 与数据通路

沿用 `apps/web`、`apps/api`、`packages/contracts`。只配置 S1 的开发、typecheck、build、测试入口和 Web/API/PostgreSQL Compose 三服务；版本在实施开始核对相容性后锁定，不把本机版本等同最终依赖选择。仅引入所需框架、MCP SDK、Prisma 和一套共享运行时 schema；具体库选择说明实际用途，避免重复校验库与通用测试框架。

Next RSC 通过 Nest 公共 HTTP 获取列表/详情；浏览器评论请求经同源配置反代，Codex 直连 Nest `/mcp`。保守逐请求读取动态库存，显式验证所选 Next 版本缓存行为；不同时为列表建立客户端 Query 副本。使用原生表单/导航及少量客户端状态，不因未来 Cart 提前安装状态层。

模块和数据流沿用 Technical Design §5/6/8：contracts 仅持有公共 schema/DTO；Catalog 模块持有只读目录和查询逻辑，Inventory 持有运行数量，HTTP controller 与 MCP adapter 只解码/调用/包装相同用例。`RSC/浏览器 → HTTP → 查询用例 → Catalog + Inventory → 公开投影`，`Codex → Streamable HTTP MCP → 同一查询用例`。Next 不导入 Prisma 或后端实现，contracts 不反向依赖 apps。

列表 `/` 与详情 `/products/:productId` 首屏由 Server Components 获取，客户端只承担 URL 导航及独立评论分页；评论状态键包含 productId/offset/revision，切商品清理旧页。所有包含动态库存的响应按逐请求/no-store 方案验证；S1 不引入跨请求持久评论缓存，目录只读内存与临时页面状态足够。无结果、未找到与依赖失败分别呈现，旧结果过渡须标 pending。

### 开发环境与质量工具（实施候选）

| 范围 | 最小方案及建立时点 |
| --- | --- |
| 版本/脚本 | Bootstrap 核对各框架 engines 与兼容矩阵后锁 Node/pnpm/依赖，提交 lockfile；提供 dev、typecheck、lint、format/format:check、build、test 入口。当前未安装，不能宣称脚本可运行 |
| 静态质量 | TypeScript strict + ESLint 共享必要规则，沿用 Next/Nest 对应配置；用最小 Prettier 配置统一格式，忽略生成物和只读 references，不与 ESLint 重复承担格式规则，不另建审批 Gate |
| 定向测试 | 候选统一 Vitest 承载 contracts/查询测试，API HTTP/真实 DB 集成随任务组 2 建立；需 Nest 测试启动时使用其官方测试工具，不自建通用测试框架 |
| 浏览器验证 | Playwright 随任务组 3 的真实页面建立关键 E2E，复用到 Slice 验收；异步 RSC 主要以集成/E2E 验证，不强求组件单测 |
| MCP | Nest 内嵌官方 SDK 的 Streamable HTTP transport，保留协议头/流/状态码，三个工具只读；先作协议及身份边界对照，再由真实 Codex 验收，不改全局 Host 配置或公开服务来绕过失败 |
| 本地服务 | 独立 Compose 项目、数据卷及测试库；建议 API 映射可配置宿主 3002 避开已占用 3001，DB 不映射已占用 5432。具体端口启动前复核；仅必要 loopback 暴露 |
| 配置边界 | DATABASE_URL/服务秘密只供 API，API_INTERNAL_URL 仅 Next Server，浏览器相对路径访问同源反代；环境样例不含秘密。JSON 只读挂载，开发隔离容器 node_modules；构建不依赖在线 API/DB |

工具各自解决静态错误、查询/持久化和浏览器时序风险；相比多套 runner、Turborepo/Nx 或预建 CI，本方案直接用 pnpm 顺序执行必要命令。依赖相容性以 Bootstrap 实测为准，若需变动仅修订受影响选择，不把工具版本未知扩大为全局架构重做。

### 基础 UI 增量接入 shadcn/ui（Human 已确认）

项目级依据唯一维护在 [T-01 基础 UI 演进](../../../../docs/engineering/ENGINEERING_DECISIONS.md#t-01-演进--基础-ui-优先-shadcnui2026-10-29human-accepted)。S1 已有业务组件与原生控件，没有 Tailwind、Base UI 或 Radix；以下为当前 Change 的必要增量，既有完成项保留。

- 按 [官方 Existing Project](https://ui.shadcn.com/docs/installation/next) / [手动接入](https://ui.shadcn.com/docs/installation/manual)在 apps/web 配置 Tailwind 4、PostCSS、components.json 与既有 @/* alias；只用官方 CLI 添加 Button、Input、Label、Checkbox 源码至 src/components/ui，保留一个官方 cn 工具，不新建 UI 包或封装层。本轮无既有 headless 实现需迁移，选择官方 Radix 组件路径；后续遇到既有 Base UI/Radix 保持兼容。
- 基础组件仅承担控件、样式与可访问性交互，不 fetch、不计价、不拥有商品/车状态。业务组件保留职责，SearchForm/Reviews/页面组合这些基础控件；按钮链接仍由 Next Link 承担导航。仅必要控件保持 Client 边界，不将页面或根 layout 改为 Client。
- 主题采用浅色 neutral 与少量 CSS variables，对齐现有 #191919/#595959、白底/轻灰背景、3px 控件圆角和至少 44px 操作高度；保留系统字体、繁体文案和既有布局断点。接入 Tailwind preflight 时显式保留必要标题/段落/链接排版，移除覆盖全部 button/input 的重复控件 CSS。不开暗色切换、图表/侧栏 tokens 平台或新 Design System。
- Checkbox 必须保留 name/value/defaultChecked 与 FormData 行为，Label 关联、pending/disabled、焦点、评论重试及分页语义保持。无商品发现行为变化，因此不改业务 Spec。新增依赖仅服务 Tailwind 构建、官方基础控件及 class 合并，不引入新表单或状态库。
- 验证仅重跑 Web typecheck/Lint/build、桌面/移动 UI smoke（含 checkbox 查询、键盘、错误重试与评论分页）；API/Inventory/MCP 代码与依赖未改时复用既有证据。旧前端构建/UI 证据仅作迁移前记录，增量完成后补当前 Web 证据。

### 从空仓库到可开发工程

以下是初始化方案，具体执行结果以 Tasks 为准。初始化使用锁定版本的官方 Next/Nest 生成器，只向新建的 `apps/web`、`apps/api` 写入；关闭嵌套 Git/独立安装，统一在 workspace 根管理 pnpm 安装与 lockfile。保留现有文档及只读原件，不在仓库根直接运行会覆盖文件的脚手架。

| 工程单元 | 初始化与完成标准 |
| --- | --- |
| Workspace / TypeScript | 根 package.json 设 private、packageManager，pnpm-workspace.yaml 包含 apps/*、packages/*；根 tsconfig.base.json 只共享 strict 等通用规则。Web 使用 Next 所需 bundler/JSX/noEmit 配置，API 使用 Nest 所需 Node 模块/装饰器/emit 配置，避免一套 module 配置强套两端 |
| contracts | 普通 workspace 包，以 `workspace:*` 被两个 app 消费；显式 package exports、构建后的 JS 与声明文件，浏览器和 Node 均可解析，不依赖仅在 TS 生效的路径别名。根 build 先 contracts 后 apps；开发先构建 contracts，并行运行其 watch 与两应用 watch，由根 dev 入口统一协调。用双端实际导入及各自构建验证，不为共享包引入发布工具链 |
| Web / API 壳 | Next App Router + TypeScript 最小页面、Nest 最小启动及健康入口；删除生成器演示业务与多余示例测试。此阶段先验证页面、健康响应、HMR 与构建；Catalog 路由和 MCP 工具随后接入，不将空壳成功称为业务验收 |
| Prisma / DB | Prisma schema、生成客户端和迁移归 apps/api；S1 仅 Inventory（商品 ID 唯一、运行数量保留负值），不建 Cart/Order。先启动独立 PostgreSQL 并通过 readiness，再显式执行 client generate 与版本化 migration，API 随后启动；不在 build 时连 DB、迁移或 seed。Catalog 首次 seed 由下一任务组接入，独立命令且不随每次启动重置 |
| 本地网络 | 开发与演示都沿用 Web/API/DB 三服务；开发挂载源码并 watch，production 用编译产物。容器内 API 监听 0.0.0.0 供 Web/宿主映射访问，宿主只绑定 loopback；API 用 db:5432，Next Server 用 api 的内部地址，浏览器用 Web 同源 /api/v1，Codex 用宿主 API 映射端口 /mcp。不能将容器服务名给宿主 Host，或将容器内 localhost 当另一服务 |
| 配置 / 使用入口 | 提供无秘密的 .env.example，明确 DATABASE_URL、API_INTERNAL_URL、WEB_ORIGIN、API 端口、MCP 服务凭证与 Host/Origin allowlist 的所属进程；真实 .env 忽略提交。缺必要配置时明确失败。根脚本包含 dev/build/start、质量检查及 db:generate/db:migrate/db:seed 入口，具体 Compose 调用和工作目录写入 README；不为本轮只读功能配置 Cart 凭证或 Checkout 秘密 |

初始化顺序为：版本/网络前置核对 → Workspace/contracts → Web/API 壳 → 质量命令与 runner → Compose/PostgreSQL/Inventory 迁移 → Catalog 导入/首次 seed 与 HTTP → Web 业务页面 → MCP 工具与真实 Host → Slice 验收。测试配置只先建立一个 runner 和可定向执行入口，不用空测试证明能力；真实 DB 契约测试与 Playwright 用例分别在 Catalog/Web 功能组落地。Bootstrap 做一次编译和网络 smoke；后续不因每项配置修改反复全量构建。

目录单实例启动只读加载，基础 Map/数组筛选足够 30 商品。启动验证重复 ID、必需结构与金额可解析性；保留合法异常样本，失败则不就绪，不静默丢数据。Prisma 本轮只建必要 Inventory 持久化与首次 seed；不覆盖已有行，不自动补回被删行。相较只用 JSON，多一个数据库成本用于验证已批准的运行库存所有权；不建立商品/评论关系表或搜索/缓存服务。测试库/volume 与演示隔离，禁止自动 reset 现存数据。

首次 seed 是面向明确新建空库的显式命令，先完整校验目录，再在单个数据库事务中检查 Inventory 为空并插入全部来源库存；任一步失败整笔回滚，可在确认仍为空后重新执行。已有任意 Inventory 行时明确拒绝执行且不改数据，不用 upsert 或跳过冲突继续插入来补齐缺行；API 启动不自动调用 seed。初始化成功后，改量、删行、目录更新均不触发重新导入；需要重建环境时使用明确的新库/新卷，不提供隐式 reset。此方案只需现有 Inventory 与事务，不增加初始化状态表；并发误执行由唯一键冲突使失败方整笔回滚。

### 本 Change 已批准的查询细化（P-02）

采用 Technical Design 附录 A/B 的最小候选，以下已随本 Change 获批准：

- q：trim、NFKC、拉丁小写，空白分词，各词 AND、每词匹配 name/brand/category/description 任一字段；不搜索 specs/reviews。
- category/brand 精确筛选，minPrice/maxPrice 含边界，purchasableOnly 默认 false；未知筛选值为空集，格式错误/负价格/上下界颠倒拒绝。排序仅 recommendation：原分数降序、ID 固定码点升序。不引入 OR/相关度排序，保持可解释的确定性查询。
- offset 默认 0、非负整数；limit 默认 12、最大 50，超界拒绝；q 最长 200 字符。商品/评论返回 items/total/nextOffset/catalogRevision，末页 nextOffset=null；offset 超出结果集返回空页。目录 revision 用原文件内容哈希，旧版本报 CATALOG_CHANGED。Offset 比 Cursor 更适合当前不可变小目录，不增加查询指纹框架。
- 稳定商品分页的无遗漏/重复保证以目录、库存与查询条件不变为前提。每页组合当次运行库存；例如 purchasableOnly 查询翻页间商品售罄，候选集合与 total/页位置可能变化，不保证跨页快照，也不将库存变化报告为 CATALOG_CHANGED。需要当前完整可购列表时从第一页重新查询；不为此新增库存版本或快照存储。评论仅依赖不可变目录，目录版本不变时仍保证逐页完整读取。
- HTTP 候选：GET `/api/v1/products`、`/products/:id`、`/products/:id/reviews`（后两者同前缀）；对应三个既定 MCP 工具。HTTP 文本参数仅在边界解码为共享 schema 输入，不重复业务规则，未知字段拒绝。
- 列表/详情/评论公开字段采用 Technical Design B.1 三种 DTO 投影（Summary、Detail、ReviewPage），Money 为 TWD 两位十进制字符串；不公开经营字段。错误至少区分 VALIDATION_ERROR、NOT_FOUND、CATALOG_CHANGED、TEMPORARY_UNAVAILABLE；HTTP 分别为 400/404/409/503，MCP 保持同 code 与含义，协议错误按 SDK 处理。无效身份/Host/Origin 在查询前拒绝，MCP 服务秘密仅 API 与 Host 配置持有，不进入 Web props 或日志。

上述细化由本次 Change 的批准确定，不静默改写全局附录的历史草稿状态。

### 风险驱动验证计划

| 对象与风险 | 最小充分证据 | 执行节点 |
| --- | --- | --- |
| Bootstrap、展示、样式（低） | 受影响包 typecheck、启动/HMR smoke；卡片/静态映射不强制单测 | 对应任务组结束 |
| Catalog、查询、公开契约（中，字段泄露为安全重点） | P001/P002、P002/P016、P008、P010、P005 真实样本；一组组合筛选/同分排序/末页/空页/全部评论；非法输入、内部字段排除、版本变化、启动失败代表反例 | Catalog/API 任务组，复用同一套契约样例作 HTTP/MCP 对照，不穷举组合 |
| Inventory 持久化（数据一致性） | 真实 PostgreSQL 首次 seed、提交前故障整笔回滚后空库重跑成功；改量/删行后重跑 seed 明确拒绝且数据不变；重启不覆盖、缺行不可购、DB 失败不伪装零库存 | Inventory 任务组；不用内存 Mock 证明持久化 |
| Next 查询与状态（中） | 关键浏览器路径：首屏 HTML、URL 恢复/前后退、筛选归零、迟到结果与跨商品评论隔离、库存更新可见、失败重试；检查 Hydration 和客户端边界 | Web 任务组定向验证，验收复用仍有效证据 |
| MCP 边界与实际接入（高） | 真实 Codex 调三个工具；无效服务身份和适用 Host/Origin 拒绝、P005 只为文本、与 HTTP 同语义 | MCP 任务组及 Slice 验收；模拟客户端只辅助定位 |
| 整体 S1 | 一轮完整 typecheck/build、真实 DB 集成及关键 E2E、dev/production 启动、基础桌面/移动键盘可用性；轻量页面性能基线记录 revision/构建/设备网络条件 | Slice 验收；不建性能平台或虚构阈值 |

每个任务组只记录实际命令、结果与必要限制在 Tasks/当前对话；通过且代码/环境未变的证据直接复用。失败先定位再修复并重验受影响部分。S1 没有交易写操作，金额公式、订单幂等与交易并发的真实验证归后续相关 Slice，不以本轮只读测试替代。

## Risks / Trade-offs

- Host 或 Docker 未可用 → 实施时只检查实际所需 daemon/Compose/端口/网络，集中报告缺失项；不安装可选设施、不自动公网暴露。真实 Codex 无法验证则 S1 验收保留缺口，不冒称完成。
- 原始评论含指令 → 纯文本展示、输出白名单和只读工具边界共同验证；不尝试通过删评论绕过风险。
- Proposed 细节与运行事实不符 → 先最小修订当前产物；涉及公开行为、安全、架构或范围变化时集中交 Human 判断，普通可逆实现自主推进。
- L-01/P-04 等后续生命周期问题 → 沿用全局状态，不阻塞 S1 只读规划，也不在本轮解决或暗中批准。

## Migration Plan

本轮从空业务工程增量建立 S1，迁移和 seed 仅对明确的本地库执行；回退代码不自动删除持久卷或覆盖原件。最终 Slice 验收与 Git Commit/Push/Merge 继续按已有授权边界执行。

### Review 修订 — Base UI 与开发入口（2026-10-29）

Human 明确要求将本项目基础组件改为 Base UI，并修复 Review 中的开发依赖卷与价格输入问题。此指令替代本 Change 上述最初 Radix 实施选择，保留历史记录及 shadcn 优先约束。使用官方 base-nova 的 Button/Input/Label/Checkbox，Button 链接组合改用 render（非原生按钮设置 nativeButton=false）；Checkbox 采用 Base UI 的 data-checked 状态。主题/44px 控件及 RSC 边界保持既定方向，不新增通用组件层。

Compose 提供共用依赖卷的 deps 一次性服务，在 dev 启动前顺序运行 frozen-lockfile install；单独的 dev:deps 也用于首次 generate/migrate 前准备及 lockfile 更新后的显式同步，避免多服务并发安装。保留 Inventory 卷，不用 down -v 解决依赖问题。

价格输入仍由既有 min/max 与共享 schema 校验；表单把浏览器合法数值转为无指数的十进制 URL 文本，避免 1e2 等合法输入与 HTTP 十进制解码不一致。不扩大 HTTP 参数契约。验证和进度归 Tasks §6。

### 分页原生链接修订（2026-10-29，Human 授权修复）

前述 Button render/nativeButton=false 加 role=link 的组合仍由 Base UI 模拟空格键激活，与链接语义不一致。本轮以 Next Link + buttonVariants 直接呈现上下页，替代该组合；仅复用样式，导航使用原生链接的 Enter/Space 行为，不扩大基础组件 API。回归与证据见 Tasks 6.4。
