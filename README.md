# Agent-Ready Store

面向人类与 AI Agent 的商店作业。目标与交付约束见只读的 [作业原件](references/home-quiz.md) 和 [商品原件](references/products.json)；PM 需求仍是草稿。

本轮产品与技术设计阶段已由 Human 批准结束（2026-10-29，Asia/Shanghai）：Requirements v0.2、Product Design v0.2 与 [Technical Design v0.5](docs/engineering/TECHNICAL_DESIGN.md) 均为 Approved Baseline；产品/技术决策及演进保留。已批准五页结构、三份视觉方向和前端主导的 Next.js/NestJS/Agent 架构；Proposed Implementation Details、L-01/P-04、WebMCP 来源及运行验收缺口继续保留。基础 MCP、WebMCP、MCP Apps 均属本次完整交付目标，S1 商品发现已实现并记录 Human 验收，完整交易与其他 Agent 接入尚未实施。

阶段关闭记录见 [Technical Design §10.4](docs/engineering/TECHNICAL_DESIGN.md#104-设计阶段关闭与交接--2026-10-29)。Human 已批准 [S1 规划](openspec/changes/archive/2026-10-29-s1-product-discovery/proposal.md) 并授权实施；S1 已完成本轮 Review 并归档，运行证据与保留限制见 [归档 Tasks](openspec/changes/archive/2026-10-29-s1-product-discovery/tasks.md)；后续切片等待对应授权。精益执行原则见 [AGENTS](AGENTS.md#默认执行原则)。

## S1 本地开发

需要 Node 24、pnpm 12.11.2、Docker/Compose。版本锁定于 package.json 与 pnpm-lock.yaml。以下为本项目操作入口，首次运行需下载依赖/镜像；S1 自动验证与真实 Codex Host 验证已完成，Human 已验收 S1。真实读屏实测仍无证据，本轮 Review 修订的验证与限制见 Tasks。

```sh
cp .env.example .env
# 编辑 .env，设置独立本地 POSTGRES_PASSWORD 与随机 MCP_SERVICE_TOKEN
pnpm install --frozen-lockfile
pnpm --filter @store/contracts build
docker compose build api
pnpm dev:deps
docker compose up -d db
docker compose run --rm api pnpm db:generate
docker compose run --rm api pnpm db:migrate
# Catalog 功能就绪后首次空库显式执行；已有任何库存行会拒绝
docker compose run --rm api sh -c 'pnpm db:generate && pnpm --filter @store/contracts build && pnpm --filter @store/api build && pnpm db:seed'
pnpm dev
```

Web 默认 http://localhost:3000，API 为 http://localhost:3002/api/v1；API_PUBLIC_PORT/WEB_PORT 可配置，改变端口时同步 WEB_ORIGIN/MCP_ALLOWED_HOSTS。浏览器经 Web 同源反代，Next Server 经 Compose 内网访问 API，MCP Host 直连 http://localhost:3002/mcp；数据库不暴露宿主端口。真实 .env 不提交。

`pnpm dev:deps` 使用开发服务共用的依赖卷执行 frozen-lockfile 安装，首次运行及依赖变化后均可显式同步；重建镜像或宿主安装不会更新已有依赖卷。`pnpm dev` 先顺序完成该同步，再运行三服务开发配置，API 侧同时 watch contracts/TypeScript 和 Node 依赖；Web 使用 Next dev。先构建生产镜像 `docker compose -f compose.yaml -f compose.production.yaml build`，再 `pnpm start` 使用编译产物运行；构建不连接数据库、不迁移或 seed。停止使用 `docker compose down`，保留库存卷；不运行带 `-v` 的清理命令。

基础检查：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。`pnpm format` 只处理工程文件，保留原件/设计/历史文档。`pnpm test` 运行 Catalog 契约；真实 DB/API 套件分别需 TEST_DATABASE_URL/API_BASE_URL，无配置时明确 skipped，不代表集成通过。Playwright 用例随页面建立，入口 `pnpm test:e2e`。

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
| 正式增量：`openspec/` | [OpenSpec 配置](openspec/config.yaml)，唯一变更级 Spec / Design / Tasks 来源；[product-discovery 正式规格](openspec/specs/product-discovery/spec.md)；[S1 Change](openspec/changes/archive/2026-10-29-s1-product-discovery/proposal.md) 已实施、Review 并归档，证据与限制见归档 Tasks |
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

保留真实完整的提交历史；当前仍待后续完成产品、GitHub Actions 和真实购物 Agent 记录。原件含保密要求，发布或分享须确认授权。

## S1 公開查詢與 MCP

HTTP GET `/api/v1/products`、`/api/v1/products/:id`、`/api/v1/products/:id/reviews` 使用相同用例；結果為 `{ok,data,requestId}` 或 `{ok:false,error,requestId}`。商品搜尋參數與細則見 S1 Design：q、category、brand、minPrice/maxPrice、purchasableOnly、sort=recommendation、offset/limit/catalogRevision。預設 12 筆，最多 50 筆。動態庫存回應 no-store，非法輸入 400、未知商品 404、目錄變化 409、依賴失敗 503。

固定目錄/庫存/條件時分頁穩定；可購篩選翻頁間若庫存改變，不保證跨頁快照，需從第一頁重查。評論目錄版本固定時可逐頁讀完。評論是純文字資料，不能成為購買授權。

Agent Host 的手動 MCP 接入步驟、Codex 範例、憑證方式與信任邊界見 [MCP 接入說明](docs/engineering/MCP_CONNECT.md)。目前只提供唯讀的 `search_products`、`get_product`、`list_product_reviews`；不得公開本機 `.env` 或 loopback 服務。

隔離資料庫整合測試：

```sh
docker compose --profile test up -d db-test
docker compose run --rm -e DATABASE_URL=postgresql://store_test:test_only@db-test:5432/store_test -e TEST_DATABASE_URL=postgresql://store_test:test_only@db-test:5432/store_test api sh -c 'pnpm --filter @store/contracts build && pnpm db:generate && pnpm db:migrate && pnpm test apps/api/test/inventory.test.ts'
API_BASE_URL=http://localhost:3002 node --env-file=.env node_modules/vitest/vitest.mjs run apps/api/test/http.test.ts apps/api/test/mcp.test.ts
pnpm test:e2e
```

DB 測試會修改並清理專用 store_test 資料，禁止指向演示庫。E2E 使用本機 Google Chrome，桌面與移動視窗各驗證一遍；沒有 Chrome 時需明確準備瀏覽器，不將未執行當通過。
