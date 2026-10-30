# 工具与关键验证

仅在定位工具或核对关键验证事实时读取；不保留安装流水、临时路径、逐轮检查报告。以下为 2026-10-28 的实际记录，不代表业务技术栈选型。

## 工具入口

- OpenSpec 1.15.0：本机裸 `openspec` 已可用；换环境先用 `command -v openspec`、`openspec --version` 确认，不依赖个人绝对路径。保留原生 spec-driven 与 6 个 core Skills，未重复初始化。
- Codex CLI 0.164.0-alpha.11.1；项目 Skills 位于 `.agents/skills/`。显式 `$skill-name` 或由宿主读取实际 SKILL.md 并应用，不把它当 shell 命令或伪造自动委托。发现不等于实际应用。
- Superpowers 7.0.1：复用现有插件的 TDD、调试、审阅和完成验证；与项目授权冲突的额外计划、重复审批或自动推送不适用，不修改第三方文件。
- core 未安装 openspec-verify-change，CLI 无通用 `openspec verify`；status/validate 检查产物或结构，行为正确性还需真实测试与契约审阅。Codex Review 的实际参数先查 `codex review --help`。

## Skill 关键变更与验证摘要

下表只统计专门的集成验证，不是日常调用总量；加载、格式校验、发现和实际应用分别判断，不为凑版本或次数制造事件。

| 版本 / 关键变更 | 真实验证 | 覆盖边界 |
| --- | --- | --- |
| Workflow v0.1：建立任务路由 | 2 次独立只读应用：文档预检 → Direct，复杂需求 → Explore；格式、原生发现通过 | 仅路由预检；不等于业务实现 |
| Workflow v0.2 + Review v0.1：单向横向审查 | 3 个独立上下文各实际应用两个 Skill：真实 Design、模拟 Behavioral、真实 Delivery；低风险子活动仅做 L0/L1；格式与原生发现通过 | Design 未批准规则；模拟并发反例真实运行，但不是商城缺陷；Delivery 核对七个文件哈希后复用证据 |
| Workflow v0.3：文档引用与记录策略收敛 | 本轮仅做格式、引用、迁移完整性和 HTML 静态检查；未重复运行模型路由案例 | Review 方法未变；旧版本验证不冒称新版本完整验证，浏览器渲染预览受本地文件协议策略限制未完成 |
| Workflow v0.4：任务切换与 Git 收尾提醒 | 本轮实际核对 Git 状态与任务范围，确认治理文档补充可在原分支继续；Skill 格式、相关本地链接与 Diff 空白检查通过 | 仅当前任务预检与静态验证；未运行独立的无关任务切换案例，未执行提交或分支切换 |
| Workflow v0.5 + Review v0.2：产品、设计与交付集成 | 修改前 1 个独立上下文应用旧版两个 Skill，发现 UI/UX、总体技术方案、最终交付缺少明确输出/检查；修改后 1 个全新上下文显式读取并应用新版两个 Skill，完成 A–G 七项只读模拟路由；另 1 个独立上下文应用 Review 做真实治理 Design/Delivery 审查，发现重要交互传播遗漏相关 OpenSpec，修订后复核关闭。两个 Skill 的 quick_validate、相关本地链接/锚点、Git 空白检查通过 | A 新需求、B UI/UX、C 技术选型、D 总体方案、E 功能切片、F 局部 Bug、G 最终交付均为模拟请求；未产生业务设计/代码、真实购物 Agent 或 CI 结果。属于代表性应用验证，不是自动触发成功率或业务验收 |

| Review v0.3：风险自适应代码审查补强（2026-10-29） | 按 Human 提供的提示词对照旧版，补充范围/契约摘要、设计符合性、复杂度判断及五项报告内容；skill-creator quick_validate 与 Git 空白检查通过 | 仅正文对照和静态检查；未进行独立模型行为验证或重跑 S1 测试，不声称新版本已完成业务 Review。ENG-009 保持 Proposed |

| Workflow v0.6 + Review v0.4：轻量审查路由（2026-10-29） | 两个 Skill 的 quick_validate、变更文件相对链接及 Git 空白检查通过；一个全新只读子代理实际读取新版入口，完成文案、库存条件、未修复 Finding、无 PR/未安装 Recap、权限变更后旧证据、拟议设计六个路由模拟，未报告可行动缺口 | 仅静态检查与代表性路由模拟，无旧版对照实验，不代表自动触发成功率、完整代码审查或业务验证；未安装/运行 Visual Recap，未测量耗时/token 收益，未重跑商城测试。未重复验证宿主发现；Human 已授权本轮修订提交并合并 |

历史两次原生发现均返回相应项目 Skills 为 repo/enabled、errors=[]。本轮通过 Codex app-server 的 `initialize → skills/list`（项目 cwd、forceReload=true）再次发现 Workflow/Review，返回更新后的 description、repo/enabled、errors=[]；首次受沙箱禁止状态目录初始化阻断，获准访问本地 Codex 状态后同一查询成功，未创建线程或调用模型。显式读取并应用可用；自动触发、桌面选择器刷新、CLI 模型审阅、真实业务和完整 Apply/Archive 尚未验证。

本轮 `openspec --version` 为 1.15.0，`list --json` 返回本仓库 root、changes=[]，`schemas --json` 仍为原生 spec-driven（proposal/specs/design/tasks）；`validate --all --json` 返回 0 items，不算业务验收。两个只读原件哈希与下方基线一致；DECISIONS、AI_NOTES、Handoff 模板及既有讲解 HTML 均未改动。未重新初始化工具或修改第三方 Skills。

原件 SHA-256 基线：

```text
5db27433fe19761c6a9def418913498adbb8d316c061ff532e387a1975f6be0a  references/home-quiz.md
c0c09b271f528fab8925eab041982c056dd94f3e38183976102139050c020889  references/products.json
```

后续只有首次有效使用、行为性版本变更、重要失败/纠偏才补简短记录；普通验证放当前任务/PR，重大决策归 ENGINEERING_DECISIONS，关键人工协作归 AI_NOTES。

2026-10-29：Codex CLI `0.165.0-alpha.1.2` 帮助可见 Hook trust 相关选项；仓库原先无 `.codex` Hook 配置。官方 Hooks 文档说明支持生命周期 Hook，但本轮未验证本机/仓库级 Hook 的实际信任加载、触发与阻断。新增的确定性 Git Checkpoint Guard 由 Workflow 在阶段转换时显式调用；Hook 不作为强制门禁。

## 订单生命周期受控切换入口

[`scripts/checkout-cutover.mjs`](../../scripts/checkout-cutover.mjs) 仅供当前 Change 8.1 的隔离演练准备；不是启动、取消/超时恢复或日常 seed 命令。实际环境切换须另行确定目标、备份/恢复方案并取得该环境的执行授权；脚本当前只允许 loopback `store_test`，不能通过参数解锁业务库。

先完成 API 构建以复用既有 Catalog 的受控库存种子。通过安全环境方式单独提供 `CUTOVER_DATABASE_URL`（不自动加载 `.env`，也不读取默认 `DATABASE_URL`），明确指定数据库：

```sh
node scripts/checkout-cutover.mjs --database store_test
# 等价的显式只读模式
node scripts/checkout-cutover.mjs --database store_test --dry-run
node --test scripts/checkout-cutover.test.mjs
```

默认使用 READ ONLY 事务输出脱敏目标、结构类型、交易数量、SKU/种子覆盖、库存实况与预留对账、其他数据库会话数、范围外外键依赖、清理对象及阻塞项。目录/评论保留在原始目录文件，脚本不改原件、不删除范围外表或数据卷。SKU 少项、多项或受控种子无效均阻止执行，不猜测数量；负初始库存沿种子保留且不能预留。

只有旧结构、全部 SKU 精确匹配、无范围外外键依赖及其他数据库会话时才允许执行。正式写库演练前应停止旧 API、到期 worker、所有 Host/浏览器写源与计划任务，排空在途请求，确认 `pg_stat_activity` 无其他客户端会话；保留可恢复的隔离数据备份及只读清单。命令中的确认只记录操作者已完成停写，不是脚本能够证明进程永不重连；切换窗口必须一直保持停止。写库需要明确授权后才运行：

```sh
node scripts/checkout-cutover.mjs --database store_test --execute \
  --confirm-target store_test --writers-stopped-and-drained
```

执行先锁定旧交易/库存表并再次检查实际目标与清单，在单事务中按 PurchaseReview → Order → Cart 删除旧交易及其嵌入的幂等/确认/接手材料与创建统计来源，然后按已匹配 SKU 定向恢复受控初始数量，不删除/重建库存行；此时旧结构没有预留字段。提交前刷新 PostgreSQL 活动统计快照并重新核对所有阻塞项（含执行中新连接及等锁的旧写连接）、空交易及种子数量；有任一阻塞即回滚。清理阶段任一步失败会回滚该阶段，可在旧结构上重新 dry-run 后重试。

之后使用同一限定 URL 调用标准 `pnpm --filter @store/api db:migrate`，复用 Prisma migration ledger 及已有“旧交易必须为空”迁移保护，不手写 ledger。结构迁移与前述清理是两个明确阶段，不承诺整段跨进程原子回滚。迁移失败后保持所有写服务停止，核对 Prisma migration 状态及最后成功阶段，前向修复；不要自动启动旧写进程、恢复旧写接口或静默重跑清理。迁移成功需核对新结构交易表为空、原库存数量与种子一致、预留为零、订单行与预留对账无差异后，再启动新流程并验证旧 HTTP/MCP 写入口拒绝。脚本不启动服务、不发送旧入口探针；这两项须由演练另行记录。

**一旦检测到新生命周期结构，入口一律禁止清理/重置，即便当前新表为空。** 再运行仅提供只读清单和预留对账，不删除新车、新订单或幂等记录。新流程已有数据时只能停写并用兼容代码前向修复，不能恢复旧写服务或重清新单。旧浏览器/Host需重新发现工具；仅清理商店命名空间的旧车指针、Cookie/批准材料与缓存，不波及其他应用。

无数据库检查与只读 dry-run 不等于目标库切换成功。隔离验证可在停止其他测试库连接后运行 `TEST_DATABASE_URL` 指向 loopback store_test 的 `node --test scripts/checkout-cutover-db.test.mjs`：仅使用随机 `checkout_cutover_test_<hex>` 独立 schema，覆盖触发器故障回滚、再运行、SKU/范围外依赖拒绝、活连接拒绝、初查后重连等锁导致提交前回滚、原迁移 SQL 与新结构拒绝重清，并核对 public 的交易数量和库存摘要不变；该测试不执行 Prisma deploy、不删除 public 数据。真实 Prisma deploy、目标环境停写排空、旧进程/客户端写拒绝及完整切换前后对账须另行记录。真实业务环境未获清理授权时保留待执行状态，不据此切换。
