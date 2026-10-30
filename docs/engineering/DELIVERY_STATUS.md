# 技术方案与交付状态

日期：2026-10-31（Asia/Shanghai）。正式增量与逐项证据以 [checkout-lifecycle-redesign Tasks](../../openspec/changes/checkout-lifecycle-redesign/tasks.md) 为准；完整方案见 [Technical Design](TECHNICAL_DESIGN.md)。本页汇总差距，不建立平行计划，不替代Human批准。

| 范围 | 当前结果与边界 |
| --- | --- |
| 交易模型与共享核心 | 持久车、整行转单、固定金额、预留、原单模拟支付/取消/到期、多单额度与统计已实现。真实PostgreSQL事务、并发、幂等、回滚和释放验证见Tasks第1～4组 |
| 普通Web | 车页选行、统一orderId支付页、未知恢复、迟到结果、本人跨车确认及单订单分享已实现，桌面/移动真实测试API验证完成 |
| 基础MCP / WebMCP | 新工具/schema/来源及同单接续已实现；基础MCP回网页，WebMCP页面内生单导航。协议与浏览器注册替身验证不能替代真实Host/Human |
| MCP Apps | 11资源、UI-only Bridge、内嵌摘要/支付、卡片及原请求恢复、多单和显式分享已实现。官方SDK替身含iframe重挂载；稳定恢复仍依赖Host保留sessionStorage和工具调用ID |
| 迁移入口 | 默认只读、限定隔离store_test、旧交易清理与受控库存重置、失败回滚、重连阻塞、新结构拒绝重清均有真实验证。独立tmpfs容器完成Prisma旧ledger→清理→新迁移全路径，容器已删除 |
| 实际环境 | 仅只读盘点并本地备份；本机store仍为旧结构，1车0单0Review。没有清理、迁移或启动新业务服务，8.2待具体执行授权 |
| 构建与回归 | 本机全应用build、typecheck、lint通过；Docker生产镜像构建和隔离内容检查通过；默认74项、另行真实环境53项及脚本14项通过，浏览器各组证据详见Tasks第8组，不将skip或旧归档证据当新流程通过 |
| 审查与验收 | 各实现组独立Code Review发现均已核实修复并定向复核。真实三入口Host/Human验收、最终残余风险接受及正式Spec同步仍未完成 |

本轮Human已授权同一Change持续实施及普通提交；未授权实际环境切换、Push、Merge或发布。T-08～T-11及本Change批准差异约束实现；不将代码、测试或审查通过写成整体产品基线Approved。

## 待Human参与

- 确认实际切换目标及清理范围：停止写入、重核备份/数量、执行与恢复。新流程产生数据后只能停写并前向修复，不能重清新单或恢复旧写服务。
- 分别在真实基础MCP Host、WebMCP浏览器和Apps Host记录版本/应用revision，完成完整目标→同单摘要→Human亲自支付→查同单、多单、未知恢复及显式分享。自动化点击不是Human验收。
- 接受或裁决Demo身份/分享边界、Host存储/链接能力等剩余限制；按9.3先审12项正式Spec合并预览，再授权同步与后续收尾。不提前归档。

历史批准与旧流程复核保留于 [技术方案历史](archive/TECHNICAL_DESIGN_HISTORY.md) 和 [OpenSpec归档](../../openspec/changes/archive/)，不作为新流程当前使用说明。
