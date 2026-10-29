# S1 Preflight Report

检查日期：2026-10-29（Asia/Shanghai）。范围仅为仓库和本地环境只读预检；未安装依赖、初始化应用、启动数据库或执行 apply。

## 实际环境

| 项目 | Observed / 边界 |
| --- | --- |
| Git | 分支 `docs/s1-lean-planning`，HEAD `2ab6c6a`；无远程。已有 README、OpenSpec 配置及 S1 草案未提交，与本轮同一规划范围；未暂存、提交或切换任务 |
| 仓库 | 已有 `.agents/`、`docs/`、`design/`、`openspec/`、`references/`；无业务应用目录、package.json、pnpm-workspace.yaml、pnpm-lock.yaml、Compose 或 `.github/workflows` |
| 基线 | Requirements v0.2、Product Design v0.2、Technical Design v0.5 为 Approved；T-01～T-06 适用 Accepted 范围已核对。全局架构不重做，候选实施细节继续待审 |
| Node / pnpm | `node --version` → v24.22.1；`pnpm --version` → 12.11.2。命令实际可运行；不代表已验证与未来 Next/Nest/Prisma 版本兼容 |
| Docker | CLI/daemon 29.9.2，Compose v5.6.1。初次查询因沙箱 socket 权限失败，经获准的只读查询确认 daemon 可用；未创建或改动容器 |
| PostgreSQL | PATH 未发现 psql/postgres/pg_isready；Docker 中另一个项目已有健康的 `postgres:18.4-alpine`，映射 127.0.0.1:5432。本项目尚无 DB；未连接该数据库或读取其中数据，不将它当作 S1 数据库 |
| 端口 | `lsof` 观察 127.0.0.1:5432、127.0.0.1:3001 已有监听；未观察到 3000 监听。3001 为 node 进程，归属未核实；不停止现存进程，端口状态需在未来启动前再查 |
| OpenSpec | CLI 1.15.0；`list --json` 解析 root 为本仓库；schema 为 spec-driven。现有 `s1-product-discovery` 已含四类规划产物，实施任务 0/9；无需重复初始化或创建同名 Change |
| AGENTS / Skills | 根 AGENTS.md、ai-native-workflow v0.5、ai-native-review v0.2 和六个 OpenSpec Skills 已存在且可读；`.openspec-target` 为 codex。无项目 `.codex/`，现有入口已足够，不为目录缺失新增配置 |

以上来自 Git/status/log/remote、目录存在性、工具 version、Docker info/ps、lsof 和 OpenSpec list/status 的实际输出；工具安装/发现不等于业务栈、Skills 自动路由或 Host 联调成功。

## 必要设施与缺口

- **Bootstrap 第一组建立：** Workspace/lockfile、Next Web、Nest HTTP + Streamable HTTP MCP、contracts、Prisma Inventory 与独立 PostgreSQL/持久卷、最小三服务 Compose、环境变量样例及真实开发/构建/质量检查命令。此处只列计划，不执行搭建。
- **端口处理：** 建议 Web 使用可配置的 loopback 3000，API 宿主端口候选 3002（容器内仍可为 3001）；PostgreSQL 默认不映射宿主端口，通过 Compose 内网和容器 SQL 工具验证。3002 尚未验证，未来启动前检查即可；不复用或重置其他项目数据库。
- **待运行核实：** 选定版本兼容、依赖 registry/镜像拉取、Prisma 生成与迁移、dev/production build/start、端口、Codex Streamable HTTP 握手和身份配置。当前无业务依赖清单/镜像/端点，不用无目标网络探测或模拟结果宣称可用。
- 宿主 psql 非必需；可以使用项目数据库容器内工具，不因此要求安装 PostgreSQL 到宿主。

## 工作流适配与 Human Review

现有 AI-Native Workflow/OpenSpec 可以继续使用；不需要新编排、计划层、审批层或第三方 Skill 修改。Human 的精益执行原则现由 [AGENTS](../../../../AGENTS.md#默认执行原则) 维护，[PRODUCT_ENGINEERING](../../../../docs/workflow/PRODUCT_ENGINEERING.md#精益执行的工作流应用) 说明应用方式，OpenSpec 配置引用这些来源。基础 typecheck/lint/测试命令随 Bootstrap 建立，Catalog 集成与页面 E2E 随功能建立，最终组只做跨模块验收。ENG-008/009 原有 Proposed 状态不因本次预检变为获批。

**实际阻塞：** 暂无必须先裁决才能完成本轮规划的环境阻塞。已有端口冲突通过独立配置处理，不需 Human 选择另一套架构。S1 Spec 与关键设计（含 P-02 候选）需集中 Review，工程实施授权尚未取得；这不等同环境故障。真实 Codex 接入若在实施时失败，必须记录具体证据再集中升级，不预先假定失败或要求公网。

本报告只承载本次所要求的预检结果；正式范围、行为、实施选择和任务分别归 Proposal/Spec/Design/Tasks，不作为额外进度表。
