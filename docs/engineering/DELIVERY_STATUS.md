# 题目交付与当前证据

核对日期：2026-10-31（Asia/Shanghai）；CI修复`9395b0c`已通过[PR #1](https://github.com/linshuohao/agent-ready-store/pull/1)以Merge Commit `be49fdf`合入main。本页集中维护交付结果与缺口；业务契约见[正式Spec](../../openspec/specs/)，方案见[Technical Design](TECHNICAL_DESIGN.md)。不将文件存在、局部测试通过、Human接受和可直接查看的交付证据混为一谈。

## 题目要求与证据

| 要求 | 当前结果及证据 | 剩余缺口／限制 |
| --- | --- | --- |
| 可运行网页与Agent结构化接口 | Web、MCP、WebMCP及MCP Apps已实现；[README](../../README.md)提供本机及Docker启动；[结算Tasks](../../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md)记录交易与入口验证 | CI已覆盖生产服务冒烟与真实浏览器购物；浏览器测试不替代真实Agent对话或Host验收 |
| 每条调整／存疑需求的决策与PM回复 | [DECISIONS](../../DECISIONS.md)当前摘要覆盖D-01～D-24，保留假设、取舍、沟通草案及历史 | 回复未向PM实际发送；Demo边界与生产能力分开 |
| Agent context与实现前spec/plan/tasks | [AGENTS](../../AGENTS.md)、项目Skills及[OpenSpec归档](../../openspec/changes/archive/)；例如搜索规划`09e014f`先于实现`9fda258` | 不把事后整理当作事前规划，不重写归档时间线 |
| 至少一个自写Skill、使用次数及版本 | Workflow v0.1～v0.6、Review v0.1～v0.4；可复核的限定应用次数与统计口径见[TOOLING](TOOLING.md#自写skill使用与版本口径) | 有记录的使用下限不等于全部业务调用次数；无可靠总量不编造 |
| GitHub Actions实际测试 | 修复提交`9395b0c`的[run 41167829578](https://github.com/linshuohao/agent-ready-store/actions/runs/41167829578)中Verify与Delivery image均通过；数据库/单元146项通过，HTTP/MCP另跑22项通过，桌面/移动购物10项通过；报告与日志已归档 | 单元测试步骤的24项环境依赖跳过不计通过，HTTP/MCP在独立步骤验证；本记录对应该提交，后续main结果以Actions为准 |
| 唯一计价实现，Web与Agent共用 | [priceSelection](../../apps/api/src/cart/pricing.ts)由共享CartService调用，HTTP/MCP进入同一服务；[计价测试](../../apps/api/test/cart/pricing.test.ts)保留门槛、叠加、舍入验证 | CI计价与交易测试已通过；历史真实Host记录仍按其版本与环境解释 |
| 真实AI Agent购物对话或录影 | 结算Tasks的真实验收段记录基础MCP、WebMCP、Apps三笔订单、Human支付与只读确认；不是仅有Mock | 本轮仓库检索未定位可直接观看的完整对话导出或录影。需补可访问材料入口，不能把订单摘要等同题目要求的完整购物记录 |
| GitHub repo与完整commit历史 | [仓库](https://github.com/linshuohao/agent-ready-store)已配置为origin；本地历史保留规划、实现、修复和merge commit，未因本次整理squash | 面试方访问权限另需确认；本轮不修改远程或发布原件 |
| AI_NOTES 3～5个关键时刻 | [AI_NOTES](../../AI_NOTES.md)精选4例，聚焦风险分级自治、上下文权威与Spec传播、Skill职责收敛、独立行为审查与真实竞态验证 | 外部摘要不是完整原始对话；没有量化效率收益证据 |
| 现场演示及增量开发 | README提供开发/测试入口，既有切片可追溯协作路径 | 尚无本轮现场加小功能的演练证据；不能仅凭文档声称已准备充分 |

## 当前产品结果

- 持续Cart、整行转单、固定金额、15分钟预留、同单支付/取消/到期、多单额度与统计已实现。真实PostgreSQL事务、并发、幂等、回滚和释放记录见结算Tasks。
- Web与Apps共用commerce-ui完整购物应用；MCP无Apps时由网页承接Human支付，WebMCP导航原单，Apps内嵌支付。型号选择不是购买或支付批准。
- 多目标搜索最多5组、默认每组4项；简繁规范化及受控中英文别名，保留预算、品牌与规格约束。支持能力不足时对话兜底，不承诺任意翻译。
- SDK v2与新协议增量已实现；当前搜索/结算两份v8资源精确保留v4～v7最终资源别名。协议、Host与浏览器验证分别举证。

## 验收与版本边界

[搜索Tasks](../../openspec/changes/archive/2026-10-31-grouped-multilingual-search/tasks.md)记录61项技术边界与10项桌面/移动浏览器检查通过且无跳过；只读搜索/选型前后五表摘要不变。Human明确确认人工部分通过，结算和搜索两个Change已同步Spec、归档，并通过`bf955af`合入main。本轮未重跑这些测试，不把记录当作当前CI全部通过。

未采集的Host逐项版本、原生表单拒绝/取消/断连轨迹不补造。真实验收记录、官方SDK替身、浏览器夹具、构建和CI各自说明覆盖范围，不能互相替代。默认Turbopack曾受环境端口权限阻断、后续其他环境成功等历史结果按各Tasks保留，不推导所有构建路径一直通过。

Demo的ID接续和分享页不提供生产级身份/访问隔离；Host存储、工具调用ID及能力影响恢复与呈现。真实支付、账户隐私、生产发布及十万商品性能承诺不在当前范围。人工接受不自动将全局Draft改为整体Approved。`local-dev-delivery-build`仍保持原Change状态，不随文档整理归档。

## 文档与证据职责

Requirements / Product Design表达产品与体验结果，Technical Design表达当前架构，DECISIONS / ENGINEERING_DECISIONS解释取舍，OpenSpec保存具体变更及其实施验收，AI_NOTES精选协作事件。设计原型和Workflow讲解页不是实际产品证据；Showcase HTML不是题目硬性要求，但项目既有最终展示约定仍有效；当前尚无presentation/index.html，Workflow讲解页不能替代它，本轮不新增展示页面。

面试阅读顺序：运行README → 业务决策 → 技术方案 → AI_NOTES → 按追问查看Spec、测试与历史。CI已有当前修复版本的通过证据；仍需补充真实购物可观看材料。
