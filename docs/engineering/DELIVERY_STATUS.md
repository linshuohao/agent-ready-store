# 技术方案与交付状态

日期：2026-10-31（Asia/Shanghai）。正式增量与逐项证据以 [checkout-lifecycle-redesign Tasks](../../openspec/changes/checkout-lifecycle-redesign/tasks.md) 为准；完整方案见 [Technical Design](TECHNICAL_DESIGN.md)。本页汇总差距，不建立平行计划，不替代Human批准。

| 范围 | 当前结果与边界 |
| --- | --- |
| 交易模型与共享核心 | 持久车、整行转单、固定金额、预留、原单模拟支付/取消/到期、多单额度与统计已实现。真实PostgreSQL事务、并发、幂等、回滚和释放验证见Tasks第1～4组 |
| 普通Web | 车页选行、统一orderId支付页、未知恢复、迟到结果、本人跨车确认及单订单分享已实现，桌面/移动真实测试API验证完成 |
| 基础MCP / WebMCP | 新工具/schema/来源及同单接续已实现；基础MCP回网页，WebMCP页面内生单导航。协议与浏览器注册替身验证不能替代真实Host/Human |
| Web / Apps完整应用复用 | 两端共用commerce-ui完整页面、控件、CSS/资源和Hooks/Commands；Apps旧购物Controller/View/CSS已删除，仅保留Bridge/工具结果、导航及存储适配。架构见[Technical Design §5](TECHNICAL_DESIGN.md#frontend-architecture) |
| MCP Apps | 11份v4资源、UI-only Bridge及完整共享应用已在本机提供；旧卡片/原请求迁移、重挂载、同路由重试与外部结果草稿保护有SDK替身证据。稳定恢复仍依赖Host保留sessionStorage和工具调用ID |
| 迁移入口 | 默认只读、限定隔离store_test、旧交易清理与受控库存重置、失败回滚、重连阻塞、新结构拒绝重清均有真实验证。独立tmpfs容器完成Prisma旧ledger→清理→新迁移全路径，容器已删除 |
| 实际环境 | Human已明确授权并完成本机store切换：清空旧1车，第七迁移完成，四交易表0、库存30SKU、预留0；新实施版本已在3000/3002运行 |
| 构建与回归 | 完整共享增量：69单测通过、53环境依赖跳过，最终桌面/移动浏览器50/50、真实MCP只读资源探测2/2；受影响类型/lint及API/Apps构建通过，Web使用webpack生产构建。默认Turbopack受本机端口权限阻断。此前Docker/真实DB验证仅适用于原对应版本，详见Tasks §8/§10，不冒称本轮重跑 |
| 审查与验收 | 原各实现组审查记录保留；完整共享增量独立Review发现5项，已核实修复并以定向回归验证，未冒称第二轮独立批准。真实三入口生单→Human支付→查同单已完成；9.1仍缺真实Host异常恢复及部分Apps接续/分享目标证据，最终残余风险接受及正式Spec同步仍未完成 |

Human已授权同一Change持续实施、普通提交及本机store清理切换；未授权Push、Merge或公网发布。T-08～T-11及本Change批准差异约束实现；不将代码、测试或审查通过写成整体产品基线Approved。

当前Change31/33，剩余9.1/9.3；Human已明确授权在实施分支提交完整共享增量及文档整合。实际提交与Git checkpoint结果以Git及交付对话为准，不将提交视为最终验收或归档。

## 待Human参与

- 本机切换已完成。新流程产生数据后只能停写并前向修复，不能重清新单或恢复main旧写服务；当前运行来自实施worktree，分支尚未合并。
- 三入口Human支付主流程已通过，详见当前Change Tasks；补真实Host异常恢复及Apps接续/分享目标证据。视觉效果由Human自行查看验收，自动化替身不抵扣真实Host缺口。
- 接受或裁决Demo身份/分享边界、Host存储/链接能力等剩余限制；按9.3先审12项正式Spec合并预览，再授权同步与后续收尾。不提前归档。

历史批准与旧流程复核保留于 [技术方案历史](archive/TECHNICAL_DESIGN_HISTORY.md) 和 [OpenSpec归档](../../openspec/changes/archive/)，不作为新流程当前使用说明。
