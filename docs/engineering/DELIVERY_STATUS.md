# 题目交付与当前证据

核对日期：2026-11-01（Asia/Shanghai）；购物车命令隔离已通过[PR #9](https://github.com/linshuohao/agent-ready-store/pull/9)以 Merge Commit `78e3d76` 合入 main 并部署。本页集中维护交付结果与缺口；业务契约见[正式Spec](../../openspec/specs/)，方案见[Technical Design](TECHNICAL_DESIGN.md)。不将文件存在、局部测试通过、Human接受和可直接查看的交付证据混为一谈。

## 题目要求与证据

| 要求 | 当前结果及证据 | 剩余缺口／限制 |
| --- | --- | --- |
| 可运行网页与Agent结构化接口 | [在线商店](https://agent-ready-store.vercel.app)可直接体验；MCP 地址为 `https://agent-ready-store-api.vercel.app/mcp`（当前线上Demo无需令牌）；Web、MCP、WebMCP及MCP Apps已实现；[README](../../README.md)提供本机及Docker启动；[结算Tasks](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md)记录交易与入口验证 | CI已覆盖生产服务冒烟与真实浏览器购物；浏览器测试不替代真实Agent对话或Host验收 |
| 每条调整／存疑需求的决策与PM回复 | [DECISIONS](../../DECISIONS.md)当前摘要覆盖D-01～D-24，保留假设、取舍、沟通草案及历史 | 回复未向PM实际发送；Demo边界与生产能力分开 |
| Agent context与实现前spec/plan/tasks | [AGENTS](../../AGENTS.md)、项目Skills及[OpenSpec归档](../../openspec/changes/archive/)；例如搜索规划`09e014f`先于实现`9fda258` | 不把事后整理当作事前规划，不重写归档时间线 |
| 至少一个自写Skill、使用次数及版本 | Workflow v0.1～v0.6、Review v0.1～v0.4；可复核的限定应用次数与统计口径见[TOOLING](TOOLING.md#自写skill使用与版本口径) | 有记录的使用下限不等于全部业务调用次数；无可靠总量不编造 |
| GitHub Actions实际测试 | 发布提交 `78e3d76` 的[run 41275113495](https://github.com/linshuohao/agent-ready-store/actions/runs/41275113495)中 Verify 与 Delivery image 均通过，包含真实数据库、token兼容、关键桌面/移动购物、生产镜像冒烟及免凭据demo MCP；[PR CI](https://github.com/linshuohao/agent-ready-store/actions/runs/41274607908)亦通过 | 历史测试计数见各Change；跳过用例不计通过，CI不替代真实Host验收 |
| 唯一计价实现，Web与Agent共用 | [priceSelection](../../apps/api/src/cart/pricing.ts)由共享CartService调用，HTTP/MCP进入同一服务；[计价测试](../../apps/api/test/cart/pricing.test.ts)保留门槛、叠加、舍入验证 | CI计价与交易测试已通过；历史真实Host记录仍按其版本与环境解释 |
| 真实AI Agent购物对话或录影 | 结算Tasks的真实验收段记录基础MCP、WebMCP、Apps三笔订单、Human支付与只读确认；不是仅有Mock | 本轮仓库检索未定位可直接观看的完整对话导出或录影。需补可访问材料入口，不能把订单摘要等同题目要求的完整购物记录 |
| GitHub repo与完整commit历史 | [仓库](https://github.com/linshuohao/agent-ready-store)已配置为origin；本地历史保留规划、实现、修复和merge commit，未因本次整理squash | 面试方访问权限另需确认；本轮不修改远程或发布原件 |
| AI_NOTES 3～5个关键时刻 | [AI_NOTES](../../AI_NOTES.md)精选4例，聚焦风险分级自治、上下文权威与Spec传播、Skill职责收敛、独立行为审查与真实竞态验证 | 外部摘要不是完整原始对话；没有量化效率收益证据 |
| 现场演示及增量开发 | README提供开发/测试入口，既有切片可追溯协作路径 | 尚无本轮现场加小功能的演练证据；不能仅凭文档声称已准备充分 |

## 当前产品结果

- 持续Cart、按明确购买量生单并清理所购SKU整行、固定金额、15分钟预留、同单支付/取消/到期、多单额度与统计已实现。真实PostgreSQL事务、并发、幂等、回滚和释放记录见结算Tasks。
- Web与Apps共用commerce-ui完整购物应用；MCP无Apps时由网页承接Human支付，WebMCP导航原单，Apps内嵌支付。型号选择不是购买或支付批准。
- 多目标搜索最多5组、默认每组4项；简繁规范化及受控中英文别名，保留预算、品牌与规格约束。支持能力不足时对话兜底，不承诺任意翻译。
- SDK v2与新协议增量已实现；线上搜索/结算两份v9资源已由MCP SDK发现，精确保留v4～v8最终资源别名。协议、Host与浏览器验证分别举证。

## 验收与版本边界

[搜索Tasks](../../openspec/changes/archive/2026-10-31-grouped-multilingual-search/tasks.md)记录61项技术边界与10项桌面/移动浏览器检查通过且无跳过；只读搜索/选型前后五表摘要不变。Human明确确认人工部分通过，结算和搜索两个Change已同步Spec、归档，并通过`bf955af`合入main。本轮未重跑这些测试，不把记录当作当前CI全部通过。

未采集的Host逐项版本、原生表单拒绝/取消/断连轨迹不补造。真实验收记录、官方SDK替身、浏览器夹具、构建和CI各自说明覆盖范围，不能互相替代。默认Turbopack曾受环境端口权限阻断、后续其他环境成功等历史结果按各Tasks保留，不推导所有构建路径一直通过。

Demo的ID接续和分享页不提供生产级身份/访问隔离；Host存储、工具调用ID及能力影响恢复与呈现。真实支付、账户隐私、生产级运行保障及十万商品性能承诺不在当前范围。人工接受不自动将全局Draft改为整体Approved。`local-dev-delivery-build`仍保持原Change状态，不随文档整理归档。

## 文档与证据职责

Requirements / Product Design表达产品与体验结果，Technical Design表达当前架构，DECISIONS / ENGINEERING_DECISIONS解释取舍，OpenSpec保存具体变更及其实施验收，AI_NOTES精选协作事件。设计原型和Workflow讲解页不是实际产品证据；Showcase HTML不是题目硬性要求，但项目既有最终展示约定仍有效；现已提供[展示与答辩入口](../presentation/index.html)，保留离线讲解与备查；它是摘要与证据导航，不替代产品、CI或真实Agent证据。

面试阅读顺序：运行README → 业务决策 → 技术方案 → AI_NOTES → 按追问查看Spec、测试与历史。CI已有当前发布版本的通过证据；仍需补充真实购物可观看材料。

## 在线文档与展示

[统一文档与展示站](https://agent-ready-store-docs.vercel.app)已上线，可从[产品 Demo](https://agent-ready-store-docs.vercel.app/demo.html)进入章节讲解及完整正文。当前文档站已部署 `78e3d76`；2026-10-31 历史发布收尾版本 `c8075a1` 的 [CI](https://github.com/linshuohao/agent-ready-store/actions/runs/41188565691) 已通过；线上检查覆盖 109 份正文、16 屏展示、旧入口、刷新返回及四种屏宽。当前发布机制见[部署说明](DEPLOYMENT.md#当前发布与自动更新)，首次部署与各业务阶段记录继续保留其版本边界。

## 云端 Demo

2026-11-01：商城、API、文档站 Production 均运行 `78e3d76`，Neon 第8个迁移成功，main CI通过。Human接受本次Demo先兼容迁移、再自动部署的简化方式及短暂失败/旧页刷新，不要求严格停写排空。备份、实际部署、线上验收与历史首次部署证据统一见[部署说明](DEPLOYMENT.md#本次发布与验证2026-11-01)。

## 分类发现增量（历史过程，2026-10-31）

当时`feat/catalog-discovery`已实现共享分类API/MCP及Web分类下拉框，尚未Push、Merge或部署。Human已批准分类入口限定豁免到期扫描；其他入口维持现有行为。实际命令、审查和Host验收进度集中在[Change Tasks](../../openspec/changes/archive/2026-10-31-catalog-discovery/tasks.md)。真实Codex CLI已执行四类只读场景，但CLI不提供Apps卡片渲染证据；支持Apps的真实Host视觉验收及最终Human验收仍待完成，不据此宣称线上已更新。向量／混合搜索仅保留为[后续评估方向](../../openspec/changes/archive/2026-10-31-catalog-discovery/design.md#future-evolution)。

2026-10-31后续：真实Codex Apps Host已通过同卡分组、空结果、预算保留、售罄按钮禁用、隐藏表单及卡片内重查验收，补齐上段CLI的视觉限制；详情见上述Change Tasks最新验收节。Human已授权验收通过后归档、合并与推送，线上部署状态需另核对，不能仅由本地验收推定。

## 购物车命令隔离（已部署，2026-11-01）

规划 `5fa7c6e`、实施 `6efb4d6`、Spec同步 `6b181c2`、归档 `0f74606` 与合并 `78e3d76` 保留完整历史。Human已接受本地新服务验证，并授权提交、合并与部署。此前本地3000运行旧工作树的问题已通过替换配套服务解决，原本地数据保留；该本地验收与后续云端发布分别记录。

独立加购、共享初始化身份、显式数量生单、SKU整行清理及只读结果查询已上线；正式Spec已同步，Change已归档。真实PostgreSQL/HTTP/MCP、桌面与移动端生产构建及独立Review证据集中在[Change Tasks](../../openspec/changes/archive/2026-11-01-cart-command-state-isolation/tasks.md)。合并后的CI与部署记录见上文。

线上定向验收通过：新MCP契约及v9资源可用；首次并发2+3只建一车；车量5显式买2；只读未知查询不生单；旧载荷拒绝；原键重放保留后来加购。测试订单已取消释放预留。完整发布方式、测试标识与验证范围统一见[部署说明](DEPLOYMENT.md#本次发布与验证2026-11-01)，不复制为第二份操作记录。

**真实 Host 验收待完成：** Human将该项移至部署后，不作为开发归档前置条件。当前会话连接器仍展示旧契约且未出现可操作Apps侧边面板，已请Human刷新连接与工具发现、展开卡片；待验证新quantity/无版本add契约、Apps呈现与重挂载恢复、首次加购身份及只读结果查询，并记录Host版本与结果。线上HTTP/MCP SDK、WebMCP工具发现及SDK Host替身均不替代真实Host交互验收；历史其他版本的Host验收不算本版本通过。
