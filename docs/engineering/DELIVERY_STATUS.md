# 题目交付与当前证据

**项目状态：待交付。** 当前Demo的需求与设计基线已定稿；交付材料的可访问性及证据覆盖按下表核对。

本页汇总已交付能力、可访问入口、验证证据和现有缺口。业务契约见[正式Spec](../../openspec/specs/)，总体方案见[Technical Design](TECHNICAL_DESIGN.md)；变更过程与阶段记录维护于OpenSpec及关联PR。

## 题目要求与证据

| 要求 | 当前结果及证据 | 剩余缺口／限制 |
| --- | --- | --- |
| 可运行网页与Agent结构化接口 | [在线商店](https://agent-ready-store.vercel.app)可直接体验；MCP 地址为 `https://agent-ready-store-api.vercel.app/mcp`（当前线上Demo无需令牌）；Web、MCP、WebMCP及MCP Apps已实现；[README](../../README.md)提供本机及Docker启动；[结算Tasks](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md)记录交易与入口验证 | CI已覆盖生产服务冒烟与真实浏览器购物；浏览器测试不替代真实Agent对话或Host验收 |
| 每条调整／存疑需求的决策与PM回复 | [DECISIONS](../../DECISIONS.md)当前摘要覆盖D-01～D-25，保留假设、取舍、沟通草案及历史 | 回复未向PM实际发送；Demo边界与生产能力分开 |
| Agent context与实现前spec/plan/tasks | [AGENTS](../../AGENTS.md)、项目Skills及[OpenSpec归档](../../openspec/changes/archive/)，提供实现前规格、设计与任务依据 | 不把事后整理当作事前规划，不重写归档时间线 |
| 至少一个自写Skill、使用次数及版本 | Workflow v0.1～v0.6、Review v0.1～v0.4；可复核的限定应用次数与统计口径见[TOOLING](TOOLING.md#自写skill使用与版本口径) | 有记录的使用下限不等于全部业务调用次数；无可靠总量不编造 |
| GitHub Actions实际测试 | 已记录发布提交 `78e3d76` 的[run 41275113495](https://github.com/linshuohao/agent-ready-store/actions/runs/41275113495)中 Verify 与 Delivery image 均通过，包含真实数据库、token兼容、关键桌面/移动购物、生产镜像冒烟及免凭据demo MCP；[PR CI](https://github.com/linshuohao/agent-ready-store/actions/runs/41274607908)亦通过 | 历史测试计数见各Change；跳过用例不计通过，CI不替代真实Host验收 |
| 唯一计价实现，Web与Agent共用 | [priceSelection](../../apps/api/src/cart/pricing.ts)由共享CartService调用，HTTP/MCP进入同一服务；[计价测试](../../apps/api/test/cart/pricing.test.ts)保留门槛、叠加、舍入验证 | CI计价与交易测试已通过；历史真实Host记录仍按其版本与环境解释 |
| 真实AI Agent购物对话或录影 | 结算Tasks的真实验收段记录基础MCP、WebMCP、Apps三笔订单、Human支付与只读确认；不是仅有Mock | 尚缺可直接观看的完整对话导出或录影。需补可访问材料入口，不能把订单摘要等同题目要求的完整购物记录 |
| GitHub repo与完整commit历史 | [仓库](https://github.com/linshuohao/agent-ready-store)已配置为origin；保留完整规划、实现、修复与合并历史 | 仓库当前公开；`main` 保护与安全配置见[仓库配置](#repository-settings) |
| AI_NOTES 3～5个关键时刻 | [AI_NOTES](../../AI_NOTES.md)精选4例，聚焦风险分级自治、上下文权威与Spec传播、Skill职责收敛、独立行为审查与真实竞态验证 | 外部摘要不是完整原始对话；没有量化效率收益证据 |
| 现场演示及增量开发 | README提供开发/测试入口，既有切片可追溯协作路径 | 尚缺现场增量开发的演练证据；不能仅凭文档声称已准备充分 |

<a id="repository-settings"></a>

## 仓库配置

2026-11-01 通过 GitHub API 回读确认以下设置已生效。仓库公开，默认分支为 `main`；[仓库主页](https://github.com/linshuohao/agent-ready-store)优先提供[在线商店](https://agent-ready-store.vercel.app)与 MCP 接入，文档与交付入口见 README。

| 配置 | 当前生效状态 |
| --- | --- |
| `main` 分支保护 | 必须经 PR 合并，管理员同样受限；禁止强推和删除 |
| 必需 CI | GitHub Actions 的 `Verify`、`Delivery image` 均须通过，待合并分支须包含最新 `main` |
| 审查讨论 | 必须解决全部审查讨论；新提交使已有批准失效 |
| 审批人数 | 0；目前仅一位维护者，不要求另一位 GitHub 审批人。Human 的审查、合并授权仍按 AGENTS 执行，平台不代为判断 |
| 合并与历史 | 仅允许 Merge Commit，禁用 Squash / Rebase Merge；合并后自动删除来源分支 |
| 依赖安全 | Dependabot 漏洞告警、安全修复 PR 已开启；修复仍经 PR 与 CI 门禁 |
| 密钥保护 | Secret Scanning 与 Secret Scanning Push Protection 已开启 |
| Actions 权限 | 默认 `GITHUB_TOKEN` 只读，禁止 Actions 创建或批准 PR |

[分支保护设置](https://github.com/linshuohao/agent-ready-store/settings/branches)与[仓库通用设置](https://github.com/linshuohao/agent-ready-store/settings)可供管理员复核。以上是核查日期的实际配置；后续变更须同步本节，GitHub 门禁不替代 Commit、Push、Merge 或发布的 Human 授权。

### 主工作区依赖审计（2026-11-01）

移除仅为导入样式而安装的 shadcn CLI 包，保留已有 shadcn/Base UI 组件源码；复选框实际使用的 `data-checked` 变体由共享样式直接定义。其带入的 deepmerge 4.3.1 及 registry/CLI 依赖已从工作区安装树移除，不依赖尚未发布的 deepmerge 补丁。现代 minimatch 10.2.6 路径限定覆盖至 11.0.1，修复 glob 预处理放大问题。

主工作区 `pnpm audit` 仍报告旧版 minimatch 3.1.5 的 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)。ESLint/import 插件等仍有调用者使用旧版可调用模块接口，不能直接替换成 11 的模块对象；本轮未引入兼容包装或修改第三方 lint 插件。3.x 源码没有公告对应的 `optimizationLevel` / `firstPhasePreProcess` 优化阶段；上游 30 段 `**/../a/b` 反例在 3.1.5 中仅生成 1 个模式，未出现该放大现象。这是对具体机制与反例的核查，不据此忽略告警或宣称该版本全面安全。

实际使用边界：这些旧依赖用于开发阶段的 lint、文件匹配和构建工具；业务源码不调用 minimatch/deepmerge，也不将商品、评论或 HTTP/MCP 请求参数传入 glob。当前未发现该告警通向线上交易请求的执行路径；若将外部仓库、配置或任意 glob 交给开发工具，仍需按不可信输入处理。残余告警继续保留，后续随上游消费者兼容升级复核；没有设置审计忽略项。GitHub Dependabot 清单与 npm 审计的收录及同步可能不同，不能由前者为零推定全仓库无已知问题。

## 当前产品结果

- 持续Cart、按明确购买量生单并清理所购SKU整行、固定金额、15分钟预留、同单支付/取消/到期、多单额度与统计已实现。真实PostgreSQL事务、并发、幂等、回滚和释放记录见结算Tasks。
- Web与Apps共用commerce-ui完整购物应用；MCP无Apps时由网页承接Human支付，WebMCP导航原单，Apps内嵌支付。型号选择不是购买或支付批准。
- 多目标搜索最多5组、默认每组4项；简繁规范化及受控中英文别名，保留预算、品牌与规格约束。支持能力不足时对话兜底，不承诺任意翻译。
- SDK v2与新协议增量已实现；搜索/结算采用两份v9资源；当前实现已移除历史资源URI别名，Host需刷新工具和资源发现。协议、Host与浏览器验证分别举证。本轮真实Host发现刷新、卡片及错误反馈验收由Human于2026-11-03批准延期并允许合并归档；范围和证据见[SDK注册归档](../../openspec/changes/archive/2026-11-03-simplify-mcp-sdk-registration/tasks.md#acceptance-and-archive)，不代表该项已通过或线上已发布。

## 验证覆盖与限制

商品发现、交易不变量和跨入口行为的证据分别见[搜索验证](../../openspec/changes/archive/2026-10-31-grouped-multilingual-search/tasks.md)、[结算验证](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md)及[购物命令验证](../../openspec/changes/archive/2026-11-01-cart-command-state-isolation/tasks.md)。真实Host、SDK替身、浏览器、数据库与CI证据按各自覆盖范围解释；自动化通过不替代真实Host验收，历史结果不证明后续版本全部通过。

Demo按ID接续购物车与订单，分享页仅限制展示，不提供生产级身份或访问隔离。真实支付、账户隐私、生产运行保障及十万商品性能承诺不在当前交付范围。完整购物对话或录影仍缺可直接观看的材料；购物命令隔离的外部真实Host验收未在其证据中记录为通过。

## 文档与证据职责

Requirements / Product Design表达产品与体验结果，Technical Design表达当前架构，DECISIONS / ENGINEERING_DECISIONS解释取舍，OpenSpec保存具体变更及其实施验收，AI_NOTES精选协作事件。设计原型和Workflow讲解页不是实际产品证据；Showcase HTML不是题目硬性要求，但项目既有最终展示约定仍有效；现已提供[展示与答辩入口](../presentation/index.html)，保留离线讲解与备查；它是摘要与证据导航，不替代产品、CI或真实Agent证据。

面试阅读顺序：运行README → 业务决策 → 技术方案 → AI_NOTES → 按追问查看Spec、测试与历史。已有CI证据覆盖所记录的发布版本；仍需补充真实购物可观看材料。

## 在线文档与展示

[统一文档与展示站](https://agent-ready-store-docs.vercel.app)提供[产品Demo](https://agent-ready-store-docs.vercel.app/demo.html)、章节讲解和设计正文；[离线展示](../presentation/index.html)提供本地阅读入口。发布机制与运行配置见[部署说明](DEPLOYMENT.md#当前发布与自动更新)。

## 云端 Demo

商城与API运行于Vercel，交易数据使用Neon PostgreSQL；本地开发和Docker交付入口见README。线上采用请求触发的有界到期清理，无访问时不保证库存释放时限；十五分钟支付截止仍由服务端执行。配置及运行限制见[部署说明](DEPLOYMENT.md#到期清理与限制)。

## 分类发现增量

共享分类API/MCP及Web分类下拉框提供目录分类发现，分类入口不触发到期扫描。搜索采用确定性文字匹配、简繁规范化和受控别名；当前不提供向量或混合搜索。设计见[商品发现](BACKEND_DESIGN.md#商品发现与运行数据)。

<a id="购物车命令隔离已部署2026-11-01"></a>
## 购物车与明确购买

各次加购独立发送，首次加购共享初始化身份以接续同车；购买使用明确的商品数量，无须等待车内数量保存。生单固定金额并清理所购SKU整行，同键重放不会再次清理后加商品。未知结果提供只读查询，继续原请求需要明确操作。完整规则见[交易核心](CHECKOUT_CORE.md)。

## 共享购物界面

Web与Apps共用页面、交互协调、控件及样式。购物车与订单分别呈现商品、金额和操作；内嵌界面通过概览、商品及费用明细切换和分页控制长度，订单列表支持商品预览与展开。常规加购和改量采用安静的局部反馈，报价更新保留金额区域，评论翻页等待时保留原内容与控件。设计见[前端呈现](FRONTEND_DESIGN.md#购物车订单与内嵌呈现)及[布局稳定原则](../product/PRODUCT_DESIGN.md#stable-local-updates)。

## Agent接入与服务组织

MCP默认demo免Token，显式token提供可选服务接入门槛；两种模式均保留Host/Origin和输入校验。工具按职责独立定义并注册，共用后端交易用例；Apps通过Host Bridge承接Human支付。具体组织见[后端设计](BACKEND_DESIGN.md#mcp工具组织与维护边界)，接入配置见[MCP指南](MCP_CONNECT.md)。
