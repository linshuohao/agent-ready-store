# Agent-Ready Store

## 当前购买增量（2026-10-30）

本轮收尾：`agent-confirmed-purchase`、S5、S6已于2026-10-30按Human授权归档，六份正式规格已同步；下文旧阶段描述保留历史语境，当前状态以本节及归档Tasks末尾为准。Apps历史准备重挂载P2已修复并独立复核；最终完整Review无新增发现，本地测试89通过、76环境依赖跳过。未完成的基础MCP原生确认/实施、真实Host/Human购买与显式分享验收仍为后续工作，归档不代表三入口全部交付。

[agent-confirmed-purchase](openspec/changes/archive/2026-10-30-agent-confirmed-purchase/proposal.md) 按Human授权先实现Apps/WebMCP与共享交易核心，基础MCP保持原生确认Host阻塞；本节替代下文S5/S6中正常购买外跳Checkout及“无新增购买工具”的现状描述，旧验收事实保留。实施与验证见[Tasks](openspec/changes/archive/2026-10-30-agent-confirmed-purchase/tasks.md)，Human已授权保留已披露缺口归档并本地合入；真实Host/Human最终验收及基础MCP原生确认仍未完成。

- Apps在原卡片核对并准备购买，完整摘要后由Human点击“确认支付”，Bridge直接下单并原地显示结果。WebMCP新增当前车prepare_checkout、确认页get_purchase_status/wait_for_purchase，网页点击确认直接下单。支付均不依赖Agent消息或接续。
- MCP保留原七工具和原schema/输出，新增五个规划工具名称；基础MCP目标prepare_checkout只给报价预览，不创建review，request_purchase_confirmation/submit_order/cancel_purchase明确返回NATIVE_CONFIRMATION_UNAVAILABLE。get_purchase_status当前只支持Apps准备。app-only的pay_purchase/cancel_app_purchase/get_order_link靠用途绑定材料与车权限鉴权，visibility不是安全边界。不能将工具已发现视为基础MCP购买已实现。
- Apps的准备/状态新增两个资源，共八个静态资源。确认材料只经工具结果_meta给UI，Web材料只经同源Cookie接口给支付控制器，不进入模型工具输出。信任已授权Host/浏览器隔离，不声称防御恶意Host或证明自然人身份；Agent不得代点支付。
- 准备与取消绑定原车、入口、scope、内容、版本、epoch及截止；同键恢复不续期、不复活。支付结果未知/刷新仅查询原review，不自动重送或新建车；Human显式重试使用原review。普通Web/Handoff共用原交易核心，同车最多一单。
- 成交后可显式取得 `/order-details/{orderId}#order-read=…` 只读链接。短期可转交，持链接者在原车截止前能读该订单；fragment先清除再兑换订单专用HttpOnly Cookie，不能编辑车或购买，不自动打开。

迁移新增PurchaseReview表，不回填批准、不seed、不改历史订单。升级先停API写服务，运行 `docker compose run --rm api pnpm --filter @store/api db:migrate` 后重启API/Web；本地已执行。回退应停止新增准备/UI支付入口并保留表、订单和幂等事实，使用兼容数据的代码；不反向扣回已成交库存、不恢复旧批准或删除数据卷。基础MCP后续实施仍须真实原生确认与相应数据扩展，不预建未验证的批准通路。

隔离验证：`apps/api/test/cart/purchase-db.test.ts` 指向 `TEST_DATABASE_URL` 的store_test；真实HTTP/MCP新增 `purchase-http-db.test.ts` 还要求独立 `PURCHASE_TEST_API_URL`（loopback 3001/3003），禁止指向业务库。真实UI集成 `e2e/purchase-integrated.spec.ts` 仅在 `PURCHASE_INTEGRATION=1 WEB_BASE_URL=http://localhost:3004` 启用，测试Web须代理store_test API且其WEB_ORIGIN匹配；普通默认测试跳过它。命令上下文与本轮实际结果见Tasks。


面向人类与 AI Agent 的商店作业。目标与交付约束见只读的 [作业原件](references/home-quiz.md) 和 [商品原件](references/products.json)；PM 需求仍是草稿。

本轮产品与技术设计阶段已由 Human 批准结束（2026-10-29，Asia/Shanghai）：Requirements v0.2、Product Design v0.2 与 [Technical Design v0.5](docs/engineering/TECHNICAL_DESIGN.md) 均为 Approved Baseline；产品/技术决策及演进保留。已批准五页结构、三份视觉方向和前端主导的 Next.js/NestJS/Agent 架构；其余 Proposed Implementation Details、P-04 及运行验收缺口继续保留；WebMCP 来源已有 S5 限定补充；L-01 已由 S2 限定补充批准解决，见下方当前规划。基础 MCP、WebMCP、MCP Apps 均属本次完整交付目标，S1 商品发现已实现并记录 Human 验收，Web交易已实现，S4基础MCP闭环已通过Human验收（真实接手链路补证限制见S4 Tasks）；S5 WebMCP 实施中，MCP Apps 实施中（真实 Host 外链及最终验收未完成）。

阶段关闭记录见 [Technical Design §10.4](docs/engineering/TECHNICAL_DESIGN.md#104-设计阶段关闭与交接--2026-10-29)。Human 已批准 [S1 规划](openspec/changes/archive/2026-10-29-s1-product-discovery/proposal.md) 并授权实施；S1 已完成本轮 Review 并归档，运行证据与保留限制见 [归档 Tasks](openspec/changes/archive/2026-10-29-s1-product-discovery/tasks.md)；后续切片等待对应授权。精益执行原则见 [AGENTS](AGENTS.md#默认执行原则)。

S2当前状态见 [Cart与报价Change](openspec/changes/archive/2026-10-29-s2-cart-quote/proposal.md)及[Tasks](openspec/changes/archive/2026-10-29-s2-cart-quote/tasks.md)。Web/HTTP购物车与报价已实现，完成自动验证、独立Review及定向修复复核，Human于2026-10-29明确验收通过；两份正式Spec已同步，S2 Change已按Human授权归档。未交接创建起24h、现有恢复限制及S2 Web/HTTP—S4 MCP写工具分期的正式来源见[D-04补充](DECISIONS.md#d-04--交接链接有效期)。S3订单已实现并通过Human验收，S4交接已通过Human验收，不能将当前Cart报价视为完成购买。

S3已完成实施并于2026-10-30通过Human验收：[Proposal](openspec/changes/archive/2026-10-30-s3-hosted-checkout-order/proposal.md)、[Design](openspec/changes/archive/2026-10-30-s3-hosted-checkout-order/design.md)、[Tasks与验收记录](openspec/changes/archive/2026-10-30-s3-hosted-checkout-order/tasks.md)。Human已确认到期准入/结果访问/无自动清理的三项限定边界，见[D-21补充](DECISIONS.md#s3-checkout-boundary-20261029)。三份正式Spec已同步，S3 Change已按Human授权归档；Push/Merge须对应授权。S3范围为普通Web Hosted Checkout与原子订单，S4 Agent交接状态见下文，S5/S6分期验收保持。

## S4 Agent Handoff

[S4 Change](openspec/changes/archive/2026-10-30-s4-agent-handoff/proposal.md) 已实施七工具、同车分享/兑换及本地有效创建统计，并于2026-10-30通过Human验收；验证与保留限制见 [Tasks](openspec/changes/archive/2026-10-30-s4-agent-handoff/tasks.md)。四份正式Spec已同步，Change已归档。真实Host七工具已有证据，Human实际接手/编辑/确认的新增可核对证据未补齐，按Human知悉限制后的明确授权保留此缺口归档；S5 实施中，S6 实施中，状态见下方 MCP Apps。

基础 MCP 仍为 `http://localhost:3002/mcp`，使用本机 `MCP_SERVICE_TOKEN` 的 Bearer 认证及既有 Host/Origin 限制。七工具为 `search_products`、`get_product`、`list_product_reviews`、`create_cart`、`get_cart`、`update_cart`、`create_handoff`。无订单提交工具。单个配置的服务身份共享创建键命名空间，不能区分 Host 或顾客；每个新意图使用随机 UUID `createRequestId`。

`create_cart` 只接收请求键和非空 `items`，服务端固定 AGENT 来源并返回 `cart`、`cartAccessToken`；响应未知时用同键、原条目重试，恢复同车同凭证及当前内容，不还原后续编辑。`get_cart` 携 `cartId/cartAccessToken` 返回 `cart` 和已完成时的原 `order`；`update_cart` 另带 `expectedCartVersion/items` 整车保存，版本冲突先重读核对；不能伪造来源或价格。`create_handoff` 携同车能力，返回原车、完整当前报价/问题、`handoff.url/issuedAt/expiresAt` 和 `requiresHumanConfirmation=true`。

链接形如 `/checkout/{cartId}#handoff={秘密凭证}`，只应交给实际接手者。Human 浏览器先清除 fragment，再经同源 JSON POST `/api/v1/handoffs/exchange` 兑换对应车 HttpOnly Cookie，随后审阅/编辑原车并明确确认。首次分享前创建起24h、分享后首次签发起完整24h；各入口共用期限，重复签发/兑换/失败不续期。完成车不能再次签发或编辑，有效权限内旧链接可读取原结果。

旧购买确认不随首次分享延长。`CONFIRMATION_EXPIRED/409` 允许显式重新审阅并等待新点击；`CREDENTIAL_EXPIRED/410` 表示车权限到期。客户端确认计时到期本身不证明车已过期。兑换未知时原材料仅在内存中供重试；刷新且 Cookie 未到达，或旧 Cookie 已被浏览器移除时，须重新打开原有效链接，不凭车ID补权限。链接/Token不应写入公开日志、截图、持久客户端缓存或共享材料。

已有数据库只需执行 `docker compose exec api pnpm --filter @store/api db:migrate`（服务未启动时使用前文 `run --rm` 入口），新增可空 `handoffIssuedAt`，不 seed、不删卷。已分享后不能回退到忽略此字段的旧权限实现。只读统计执行 `docker compose exec api pnpm --filter @store/api metrics:agent-carts`，按持久 AGENT Cart ID 计数；后续删空、到期或成交不撤销创建，不代表独立顾客或运营目标已达成。本轮无自动清理。

S4测试：专用 `store_test` 库迁移后，设置 `TEST_DATABASE_URL` 串行运行 `apps/api/test/cart/handoff-db.test.ts`；MCP/HTTP测试设置 `API_BASE_URL=http://localhost:3002`、`MCP_SERVICE_TOKEN`、`WEB_ORIGIN` 后运行 `apps/api/test/cart/handoff-http.test.ts`；桌面/移动 `e2e/handoff.spec.ts` 另需相同服务Token与匹配 `WEB_BASE_URL`。真实Host调用和模拟协议/浏览器测试分别记证，不把自动化点击称为Human验收。

## S5 WebMCP

**当前已批准修订：** [电商逐项操作与按场景刷新](openspec/changes/archive/2026-10-30-s5-webmcp/design.md#4-电商逐项操作服务端权威与按场景刷新本次拟议修订) 已在本地实施；[Tasks §6](openspec/changes/archive/2026-10-30-s5-webmcp/tasks.md#6-电商逐项操作与按场景刷新本次修订) 记录实际验证和剩余验收。

[S5 Change](openspec/changes/archive/2026-10-30-s5-webmcp/proposal.md) 已由 Human 批准规划并授权实施，当前实现与验证进度见 [Tasks](openspec/changes/archive/2026-10-30-s5-webmcp/tasks.md)，尚未获得最终验收；S6 实施中，状态见下方 MCP Apps。以下是本轮新增运行契约，不将基础 MCP 成功当作 WebMCP 验收。

支持 `document.modelContext` 的浏览器按页面提供工具：目录页 `search_products`、`add_to_cart`；详情页 `get_product`、`list_product_reviews`、`add_to_cart`；活动购物车页 `update_cart`。上述页面还提供 `get_cart`；目录/详情另提供仅用于原创建重试的 `retry_cart_creation`，购物车编辑无恢复工具；Checkout 仅 `get_cart`，无购买确认/提交工具。Host 发现名称可能带本次注册后缀，必须使用当前发现结果，不能缓存旧句柄。

商品详情/评论为当前页商品，不接受任意 `productId`；评论分页沿用 offset/limit/catalogRevision。搜索参数沿用目录契约，更新 URL 后返回同一次页面查询的结构化结果；导航未确认不声称已取得新结果。工具加购传 productId；WebMCP 编辑传 expectedCartVersion/operation，操作当前车，不接收车 Token 或客户端来源/报价。返回完整服务端 CartView/报价或明确错误。数量在 Enter/失焦时逐项保存，移除直接提交，取消整车保存按钮；输入非法保留并可显式恢复已保存数量。同车在途时短暂阻止 Human/工具重复写入，未保存输入拒绝工具写入。进入/返回前台更新干净快照，有草稿则保护并要求刷新。编辑冲突或响应未知须显式重新加载，不比较、不合并、不重放；旧响应不能解除刷新要求，离页结果不更新新车。仅创建重试保留原入口、请求键和材料。

新车及成功接手编辑的普通车享 AGENT 优惠；来源升级不延长车权限，不代表购买确认。来源防伪按 Human 决定后置，本轮不额外认证，不能防止模拟 WebMCP 的 HTTP 请求；车 Cookie、同源防护、服务端计价及 Human Checkout 确认保持。无 WebMCP 时显示限制并可继续普通 Web 购物。

浏览器创建通道为 `POST /api/v1/webmcp/carts`；逐项操作为 `POST /api/v1/carts/:id/operations` 与 `POST /api/v1/webmcp/carts/:id/operations`。请求严格为 `{expectedCartVersion,operation}`，operation 为 `add_item(productId,quantity)`、`set_quantity(productId,quantity)` 或 `remove_item(productId)`；成功返回完整 CartView，冲突或行不存在须刷新，未知不自动重试增量。目标行严格校验，未触及旧问题行可保留并逐条修复，整车有问题不可结算。原 `PUT /carts/:id/items`、`PUT /webmcp/carts/:id/items` 与基础 MCP 七工具参数保持兼容，WebMCP 的同名 update_cart 不再接收 items。各入口沿用普通车的浏览器证明和 HttpOnly Cookie，不使用或下发 `MCP_SERVICE_TOKEN`。WebMCP 与普通创建命名空间隔离，原车升级后普通创建请求仍可恢复原车。

升级时先停止 API 写服务，再运行 `docker compose run --rm api pnpm --filter @store/api db:migrate`，生成客户端并重启 API/Web；保留所有卷，不 seed。新增不可变 `agentCreated`：迁移时历史 AGENT 回填 true，HUMAN false，今后只有有效 Agent 新建写 true，HUMAN 后续升级不改此事实。不可回退到仅按 origin 统计的旧应用；需回退时先停用 WebMCP 新写入口，保留新数据并使用兼容创建事实的修订版，不能批量降来源或重写订单。

S5 隔离 DB 测试为 `apps/api/test/cart/webmcp-db.test.ts`，及 `apps/api/test/cart/cart-operations-db.test.ts`，与其他 DB 套件串行运行且仅指向 `store_test`。HTTP 测试为 `apps/api/test/cart/webmcp-http.test.ts`及 `apps/api/test/cart/cart-operations-http.test.ts`（API_BASE_URL、WEB_ORIGIN）；浏览器协调测试为 `e2e/webmcp.spec.ts` 和 `e2e/cart-operations.spec.ts`（WEB_BASE_URL 必须匹配 WEB_ORIGIN）。注册替身测试与真实 Host 证据分开记录，自动化确认不称为 Human 验收。


## S6 MCP Apps

[S6 Change](openspec/changes/archive/2026-10-30-s6-mcp-apps/proposal.md) 已获实施授权，进度与真实 Host 限制见 [Tasks](openspec/changes/archive/2026-10-30-s6-mcp-apps/tasks.md)。当前 Host 的 UI、输入/结果和 Bridge 查询已实测；localhost 外链虽返回成功但未实际打开，Human 授权先实施、交付前补验，不能视为完整验收。

六个资源为 `ui://store/{search-products,get-product,create-cart,get-cart,update-cart,create-handoff}-v1.html`，均为 `text/html;profile=mcp-app`。它们共用 React 单文件代码，各自内置入口工具名；原七工具 schema、报价、权限和订单逻辑保持。基础 MCP 不支持 Apps 时仍返回原文本与结构化结果；评论工具不关联视图。

商品选择与建车由 Agent 完成；Apps 编辑原车数量、移除条目，点击“儲存調整”按原版本整车替换（不是 WebMCP 单操作）。首次载入、手动重载及结账前重新读取服务端报价；草稿、冲突或未知结果阻止继续写入/结账，须明确放弃并重载，不自动重送。读写与结账全链在途禁止输入和重复操作。

“前往商城結帳”经 Bridge 读取同车、签发原交接并请求 Host 打开。Host 返回成功只表示请求返回，页面没有打开时仍需核对 Host 限制；此处不会购买。必须由 Human 在 Hosted Checkout 审阅并明确确认。车 Token 与交接 URL 仅在 Adapter 内存及显式 Bridge 请求中使用，不进入展示 props、DOM、日志或存储；不直连网站 API，不复制链接到 DOM，不申请额外浏览器权限。

根 `pnpm build` 和本机 `pnpm dev` 会生成 Apps；资源随 API 的 `dist/mcp-app/` 交付，无新增常驻服务。开发时 Apps/共享 UI 修改会自动重建，再让 Host 重新调用工具；生产产物可用 `pnpm --filter @store/mcp-app build` 单独构建；元数据变更后刷新 MCP 连接。单独 `nest build` 会清理 dist，应使用根构建或随后构建 Apps。构建使用 `WEB_ORIGIN` 固定合法 Checkout origin；交付 Compose 将其传入构建参数，修改 origin 后重建。官方 ext-apps 固定 1.1.2，复用 SDK 1.32.2；不运行其 setup-bun 脚本，不安装未使用的可选 Bun 运行时。

实现回归：`pnpm test apps/mcp-app/test`、`pnpm test packages/commerce-ui/test`；先构建再运行 `pnpm test:e2e e2e/mcp-app.spec.ts`。该浏览器测试使用官方 AppBridge **替身 Host**，不是目标 Host 验收。专用 PostgreSQL 的 `apps/api/test/mcp/apps-cart-db.test.ts` 需要 `TEST_DATABASE_URL` 指向 `store_test`，会清理该测试库并模拟已有 Checkout；禁止指向正式库。资源 HTTP 测试使用原 `API_BASE_URL` 与本机服务凭证，具体命令按现有测试入口配置。

## 本机开发

日常开发使用本机 Node 24（>=24.11 <25）和 pnpm 12.11.2。Web/API 在本机运行；推荐只用 Docker 启动 PostgreSQL 18，不必在本机安装 PostgreSQL。完整应用镜像用于交付，开发不使用应用容器。

**首次准备**（先启动 Docker Desktop）：

1. 没有 `.env` 时才执行 `cp .env.example .env`。已有 `.env` 不要覆盖，保留原来的 `CART_ENCRYPTION_KEY` 和 `MCP_SERVICE_TOKEN`；旧 Compose 配置通常没有 `DATABASE_URL`，需要补上。
2. 配置 `POSTGRES_PASSWORD`，以及 `DATABASE_URL=postgresql://store:<同一个密码>@127.0.0.1:5432/store`。URL 中的密码须做百分号编码；可用只含字母/数字的随机密码避免编码问题。设置稳定的 `CART_ENCRYPTION_KEY` 与随机 `MCP_SERVICE_TOKEN`，`WEB_ORIGIN` 与浏览器地址一致，本机 HTTP 显式设置 `CART_COOKIE_SECURE=false`。
3. 执行以下命令：

```sh
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:generate
pnpm db:migrate
# 仅首次空库；自动准备 API 编译，不构建 Web，已有库存时拒绝初始化。
pnpm db:seed
pnpm dev
```

`db:up` 使用 `compose.local.yaml`，只启动 PostgreSQL，并等待健康检查。首次创建的空数据卷会自动创建 `store` 用户和 `store` 数据库；业务表仍由 `db:migrate` 创建。数据库端口仅绑定 `127.0.0.1`，默认 5432；如被占用，在 `.env` 设置 `LOCAL_DB_PORT` 并同步修改 `DATABASE_URL`。开发数据卷为 `agent-ready-store-local_inventory`，与交付配置的 `agent-ready-store_inventory` 分开，不自动迁移或覆盖已有交付数据。已有卷的数据库密码不会因修改 `.env` 自动变化。

**日常启动**：

```sh
pnpm db:up
pnpm dev
```

数据库已运行时可只执行 `pnpm dev`。停止应用用 Ctrl+C；需要停止开发数据库时运行 `pnpm db:down`，数据卷保留。不要使用 `down -v` 删除已有数据。若已有本机或远程 PostgreSQL，直接将 `DATABASE_URL` 指向其专用库，跳过 `db:up/db:down`，其余步骤相同。

无需先执行 `pnpm build`。入口加载根 `.env`（已导出的变量优先），自动生成 Prisma Client 和必要的 contracts/API/Apps 产物，然后监听 contracts、API、Apps 及共享 UI，Web 使用 Next dev。这里的首次 TypeScript 编译不是 Next 生产构建。Apps 文件更新后由 Host 重新加载资源；Host 内已打开的卡片不承诺热更新。Ctrl+C 停止本次进程组。

默认 Web 为 http://localhost:3000，API 为 http://localhost:3002/api/v1/health，MCP 为 http://localhost:3002/mcp。`WEB_PORT`、`API_PUBLIC_PORT` 可配置，同时调整 `WEB_ORIGIN`、`MCP_ALLOWED_HOSTS`。`CATALOG_PATH` 相对仓库根解析，默认只读原件。不要与相同端口的交付服务同时运行。

已有本机数据库升级：停止写服务 → `pnpm db:migrate` → `pnpm dev`，不 seed、不删数据。Prisma schema 变化后独立执行测试/构建前运行 `pnpm db:generate`。

本机生产预览单独使用 `pnpm db:generate && pnpm build && pnpm start`。`start` 只运行已构建产物，不编译、迁移或 seed。修改代码或构建期 `API_INTERNAL_URL`/`WEB_ORIGIN` 后重新构建；日常开发不走此入口。

## Docker 交付

默认 `compose.yaml` 是生产模式：Web/API 使用同一个交付镜像，PostgreSQL 保留 `inventory` 持久卷。没有源码挂载、开发依赖卷或 watcher；只有 API 只读挂载 `references/`。原件不打入镜像，部署机器必须提供该目录。镜像保留 Prisma CLI 所需工作区依赖，未做极限依赖裁剪。

配置根 `.env` 中的 `POSTGRES_PASSWORD`、稳定密钥、Token、origin 后，首次交付：

```sh
pnpm build:docker
# 若未安装宿主 pnpm，可直接 docker compose build。
docker compose up -d db
pnpm db:migrate:docker
# 仅首次空库，已有库禁止重复执行：
pnpm db:seed:docker
pnpm start:docker
```

`build:docker` 只构建镜像，不连接业务数据库。`db:migrate:docker` 与 `db:seed:docker` 使用同一生产镜像的工具/编译产物。`start:docker` 不隐式构建、迁移或 seed。

已有部署升级：

```sh
pnpm build:docker
docker compose stop api web
pnpm db:migrate:docker
pnpm start:docker
```

迁移失败时保持写服务停止，排查后重试迁移；不要启动旧的不兼容代码或重新 seed。回退使用兼容现有数据的镜像，不反向删除订单/库存事实。`IMAGE_TAG` 可标识镜像版本，构建、迁移、启动必须使用相同值。旧 `compose.production.yaml` 和 `dev:docker`/`dev:deps` 已移除；旧开发容器切换时先停止，再按上述入口重建/迁移/启动，既有 project 名与库存卷名不变。旧依赖卷不会自动删除。

Web/API 仍仅映射到宿主 loopback，默认端口 3000/3002；数据库不映射宿主端口。这是本机交付验证配置，公网入口/TLS 不在本轮范围。`WEB_ORIGIN` 编入 Apps，Next 代理使用镜像构建时的 `http://api:3001`，更改构建配置须重建。停止用 `docker compose down`，保留库存卷，不使用 `down -v` 清理已有部署。

CI 执行本机应用检查及独立项目中的交付镜像构建、迁移、seed、健康与 Web/API 冒烟检查，不推送镜像或自动发布。

基础检查：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。`pnpm format` 只处理工程文件，保留原件/设计/历史文档。`pnpm test` 运行 Catalog 契约；真实 DB/API 套件分别需 TEST_DATABASE_URL/API_BASE_URL，无配置时明确 skipped，不代表集成通过。Playwright 用例随页面建立，入口 `pnpm test:e2e`。

## S2 购物车与报价

商品列表/详情支持加购，导航进入独立 `/cart/{cartId}` 页面，可修改数量并逐项保存、直接移除商品。报价由API唯一实现：满1000减100、可信Agent来源在满减后95折，优惠前小计满990免运；当前普通Web创建固定HUMAN，不提供AI来源开关。建车不预留库存，数量/商品异常会提示调整，空车不计算运费。可购买且已保存的购物车可进入S3结算页，由Human明确确认后同步生单。

`POST /api/v1/carts`、`GET /api/v1/carts/:id`、`PUT /api/v1/carts/:id/items`提供创建/读取/整车替换。写请求必须为JSON且Origin精确匹配`WEB_ORIGIN`；本地打开Web时也须使用该配置中的同一origin。车ID只定位，访问通过每车HttpOnly Cookie；来源、价格不能由请求伪造。输入/DTO细则见Change与`packages/contracts`。

未交接Cart创建起固定24小时，到期不续期。服务端重验权限和版本；按 [D-23](DECISIONS.md#d-23--服务端权威与购物车客户端简化)，保存冲突或结果未明提示“重新载入购物车（放弃未保存修改）”，刷新后以完整服务端数据替换；不比较差异、合并或重放编辑。当前请求结束即解除提交状态，服务端继续校验版本。创建响应丢失时复用原材料恢复；刷新丢失内存材料后，标签页仅保留非敏感待确认标记，提示结果无法确认，须明确重新发起才允许新建。内存材料与Cookie均丢失时无法自动恢复，不凭ID补发；重新发起可能留下无法访问的旧车。首次分享后完整24小时已由S4实现，分享通过MCP工具提供，普通Web不另增分享操作。

现有数据库升级仅新增Cart表，执行`docker compose run --rm api pnpm --filter @store/api db:migrate`，保留Inventory，不重新seed或删卷。`CART_ENCRYPTION_KEY`仅存本机安全环境，备份并跨重启保留；丢失或替换会使既有Cart凭证无法恢复。`.env.example`只含空占位。`CART_COOKIE_SECURE=false`只允许显式的本机HTTP例外，HTTPS使用true。加密实现与精确计价依赖均已锁定，运行证据以Tasks为准。

Cart DB测试必须指向专用`store_test`并与Inventory DB测试串行，不能指向演示库。复用上方DB命令，测试文件改为`apps/api/test/cart/cart.test.ts`，加`--no-file-parallelism`。HTTP测试使用`S2_API_BASE_URL=http://localhost:3002/api/v1`且`WEB_ORIGIN`须与服务一致；`pnpm test:e2e`包含桌面/移动购物车旅程。无DB/API变量时对应套件会明确跳过，不能算集成通过。

## 日常协作

从 [AGENTS.md](AGENTS.md) 与 [ai-native-workflow](.agents/skills/ai-native-workflow/SKILL.md) 开始，按任务获取最小上下文。关键设计、行为与交付风险按需接入 [ai-native-review](.agents/skills/ai-native-review/SKILL.md)。OpenSpec 管变更级正式规格和任务，Superpowers 提供测试、调试等执行方法，不维护平行计划。

## 交付讲解

[打开 Workflow 图与设计思想讲解](docs/presentation/ai-native-workflow.html)。下载仓库后，用浏览器打开该 HTML 即可，离线可用；GitHub 文件页显示的是源码，可下载后打开。

这是面向人的独立演示页，介绍目标、三平面、两种循环、Review 与工具分工；不作为 Agent 默认上下文或批准依据。

最终 Project Showcase 尚未生成；其信息架构、真实资产映射与验收规则见 [产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md#project-showcase-生成与维护)。当前讲解页不代表产品已交付。

## 文档与资产导航

| 分层 | 入口与职责 |
| --- | --- |
| 产品结果：`docs/product/` | [Requirements](docs/product/REQUIREMENTS.md) 定义业务行为；[Product Design](docs/product/PRODUCT_DESIGN.md) 定义体验、视觉与验收，[UX 决策与演进](docs/product/PRODUCT_DESIGN.md#ux-decisions)已并入正文 |
| 工程方案：`docs/engineering/` | [工程与技术决策](docs/engineering/ENGINEERING_DECISIONS.md)保存理由和批准范围；[Technical Design](docs/engineering/TECHNICAL_DESIGN.md)是已批准的全局 How 基线；[Tooling](docs/engineering/TOOLING.md)保存工具入口与关键验证事实 |
| 工作流标准：`docs/workflow/` | [工作流使用指南](docs/workflow/WORKFLOW_GUIDE.md)介绍从需求到归档的实际操作；[Git Checkpoint Policy](docs/workflow/GIT_CHECKPOINT_POLICY.md)定义阶段提交与转换 Gate；[产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md)维护产物职责、验收及变更传播；唯一任务入口是 [Workflow Skill](.agents/skills/ai-native-workflow/SKILL.md) |
| 历史证据：`docs/ai-collaboration/` | [外部协作原件及来源核对](docs/ai-collaboration/README.md)；精选结果见 [AI_NOTES](AI_NOTES.md) |
| 设计资产：`design/` | [统一预览](design/index.html)、[打开方式与来源](design/README.md)，包含五页线框、三个视觉稿和截图 |
| 正式增量：`openspec/` | [OpenSpec 配置](openspec/config.yaml)，唯一变更级 Spec / Design / Tasks 来源；[product-discovery 正式规格](openspec/specs/product-discovery/spec.md)；[shopping-cart 正式规格](openspec/specs/shopping-cart/spec.md)、[cart-pricing 正式规格](openspec/specs/cart-pricing/spec.md)；[S2 归档](openspec/changes/archive/2026-10-29-s2-cart-quote/tasks.md)；[S1 Change](openspec/changes/archive/2026-10-29-s1-product-discovery/proposal.md) 已实施、Review 并归档，证据与限制见归档 Tasks |
| 根目录入口与决策 | [AGENTS](AGENTS.md)定义协作权限；[DECISIONS](DECISIONS.md)保留产品取舍及 PM 回复；[只读原件](references/home-quiz.md)不因归档成为批准依据 |

Draft / Accepted / Approved 等状态维护在文档开头及对应条目，不按状态复制文件或另建目录。展示讲解入口见上方“交付讲解”，不参与日常默认上下文。

## 待 Review 与验收

设计基线已归档，以下是批准范围与剩余验收的导航；当前状态见各文档最终批准记录。2026-10-29 Design Phase Closure 已批准 Technical Design v0.5，保留 Proposed/Pending 和未运行事项；不批准业务实施或把静态设计当运行验证。

| 编号 | 审阅对象 | 当前状态 / 你需要确认什么 |
| --- | --- | --- |
| 1 | [Requirements v0.2](docs/product/REQUIREMENTS.md) | Approved Product Requirements Baseline；本聊天的直接批准已补记于文档开头；[§11](docs/product/REQUIREMENTS.md#11-pending缺口与后置边界)的 P-02 查询/字段、P-04 恢复/保留/结果权限为非阻塞设计细化，P-01/P-03 已解决 |
| 2 | [Product Design 与 UX 决策](docs/product/PRODUCT_DESIGN.md) | Approved（2026-10-29，Human）；15 项 Accepted UX 决策、结构、页面职责、关键交互与视觉方向已批准；Pending Verification、Planned Enhancement、P-02 / P-04 保留，工程状态已同步，非业务实施授权 |
| 3 | [工程与技术决策](docs/engineering/ENGINEERING_DECISIONS.md#技术决策归档--2026-10-29) | T-01～T-06 主要选择已 Accepted；具体 Pending Detail 仍待设计。[C-01/02](docs/engineering/ENGINEERING_DECISIONS.md#c-01--c-02--历史冲突解决与增强边界)已同步：C-01 为 Planned Enhancement，产品语义冲突关闭；C-02 Resolved / Accepted 七工具 |
| 4 | [Technical Design v0.5](docs/engineering/TECHNICAL_DESIGN.md) | Approved；架构/组件/四入口复用设计归档，§10.4 记录阶段关闭。Proposed Implementation Details、L-01/P-04 与运行/Host 验证保留；不启动 S1 |
| 5 | [产品、设计与交付契约](docs/workflow/PRODUCT_ENGINEERING.md)及 [ENG-008](docs/engineering/ENGINEERING_DECISIONS.md#eng-008--ai-native-workflow-轻量路由待-review) / [009](docs/engineering/ENGINEERING_DECISIONS.md#eng-009--横向-ai-native-review待-review) / [012](docs/engineering/ENGINEERING_DECISIONS.md#eng-012--产品设计与最终交付集成) | PRODUCT_ENGINEERING v1.0 Approved / ENG-012 限定 Accepted（2026-10-29）；产物职责与交付契约已接受。ENG-008/009 仍 Proposed，Workflow/Review Skill 机制及相关集成仍需独立 Review；本次不自动批准它们 |
| 6 | [实际设计验收 §7](docs/product/PRODUCT_DESIGN.md#7-design-review验收与实际证据)、[设计预览](design/index.html) | 待补验收；真机、多浏览器、屏幕阅读器、完整键盘/焦点和缩放，以及未定位浏览器日志；需实际证据或明确接受限制，文档 Review 不能代替运行验收。视觉回归平台仍是可选项 |

后续只处理实际 Pending、运行验收和新的 Human 授权任务，不因阶段结束重开已批准架构。批准文档不自动授权业务实施、Push、Merge 或发布。Tooling、原始附件及协作摘要作为证据按需查阅，不增设逐份批准关卡。

保留真实完整的提交历史；GitHub Actions CI 已配置并纳入数据库/API 集成测试，修订后首次完整运行结果待验证；真实购物 Agent 记录也待后续完成。原件含保密要求，发布或分享须确认授权。

## S1 公開查詢與 MCP

HTTP GET `/api/v1/products`、`/api/v1/products/:id`、`/api/v1/products/:id/reviews` 使用相同用例；結果為 `{ok,data,requestId}` 或 `{ok:false,error,requestId}`。商品搜尋參數與細則見 S1 Design：q、category、brand、minPrice/maxPrice、purchasableOnly、sort=recommendation、offset/limit/catalogRevision。預設 12 筆，最多 50 筆。動態庫存回應 no-store，非法輸入 400、未知商品 404、目錄變化 409、依賴失敗 503。

固定目錄/庫存/條件時分頁穩定；可購篩選翻頁間若庫存改變，不保證跨頁快照，需從第一頁重查。評論目錄版本固定時可逐頁讀完。評論是純文字資料，不能成為購買授權。

Agent Host 的手動 MCP 接入步驟、Codex 範例、憑證方式與信任邊界見 [MCP 接入說明](docs/engineering/MCP_CONNECT.md)。S4目前提供上文所列七工具，其中三個商品查詢工具唯讀；不得公開本機 `.env` 或 loopback 服務。

隔離資料庫整合測試：

```sh
# 测试使用本机源码和专用 PostgreSQL store_test；设置 DATABASE_URL/TEST_DATABASE_URL 后：
pnpm db:generate
pnpm db:migrate
pnpm test apps/api/test/inventory/inventory.test.ts --no-file-parallelism
API_BASE_URL=http://localhost:3002 node --env-file=.env node_modules/vitest/vitest.mjs run apps/api/test/http/http.test.ts apps/api/test/mcp/mcp.test.ts
pnpm test:e2e
```

DB 測試會修改並清理專用 store_test 資料，禁止指向演示庫。E2E 使用本機 Google Chrome，桌面與移動視窗各驗證一遍；沒有 Chrome 時需明確準備瀏覽器，不將未執行當通過。

## S3 结算与订单

结算入口为 `/checkout/{cartId}`，完整审阅后明确点击“確認購買”；服务端在同步短事务中重验内容与库存、保存唯一订单并扣减库存。无支付步骤、无5分钟倒计时；确认材料与审阅时Cart截止一致，内容/版本/会话/重新审阅可使旧材料失效。订单价格与金额快照固定，成功车不能再编辑或重复购买。

新增HTTP：`POST /api/v1/carts/:id/checkout-review`（空JSON）、`POST /api/v1/carts/:id/orders`（confirmation），以及 `GET /api/v1/carts/:id/order`。写请求继续要求精确WEB_ORIGIN、JSON、目标车Cookie；新购买另须独立浏览器会话及服务端签名确认。Review是有副作用的安全恢复屏障，不可换成普通GET。未查到订单不能证明在途提交已失败；结果未知时有限查询或明确重新审阅，不自动重下单。

订单结果页 `/orders/{cartId}` 优先展示成功响应内存快照，刷新/直达才重新查询。Cart到期后不能新增查询或购买权限；已收到成功结果不因到期改成失败。响应丢失后再到期可能无法确认结果，不能宣称购买失败或补发凭证。开始新购物须明确操作。

升级仍执行 `pnpm db:migrate`（Compose用既有API命令），只增加Order/唯一外键和Cart恢复栅栏，保留现有Cart/Inventory，不重新seed。已有订单后不可删除Order表或回滚成允许完成车写入的旧API；先停购买/写入，保留数据并前向修复。无自动清理或长期保留期限政策。

S3 DB测试 `apps/api/test/cart/checkout-db.test.ts` 只接受专用store_test，使用TEST_DATABASE_URL且与其他破坏性DB套件串行；HTTP测试另用 `S3_API_BASE_URL=http://localhost:3002/api/v1`。HTTP/API测试和DB重置分阶段运行。浏览器入口 `pnpm test:e2e`，含桌面/移动主线、内容变化、响应丢失及快照显示；未配置DB/API变量时skip不算通过。当前实现/Review/验收事实见S3 Tasks，不将本地通过表述为远程CI通过。
