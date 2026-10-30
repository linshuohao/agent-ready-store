# 订单生命周期方案：交付状态

日期：2026-10-30（Asia/Shanghai）。本文件仅维护设计状态、里程碑边界与证据索引，不建立第二套Spec或执行任务；正式变更及任务唯一来源为[OpenSpec Change](../../openspec/changes/checkout-lifecycle-redesign/proposal.md)。

## 当前范围与授权

- 已完成多轮方案收敛；[技术决策T-08～T-11](ENGINEERING_DECISIONS.md#order-lifecycle-decisions)记录已采用选择。
- [技术设计](TECHNICAL_DESIGN.md)为架构整合稿，本轮范围为文档整理与图示视觉审核，Human已明确授权提交并合并；不宣称整体基线重新获批或独立Review通过。
- 未启动业务开发、数据库清理、依赖安装到项目、发布或部署；本轮Git授权仅限提交并合并，不包含推送。
- 旧批准与当时的阶段记录完整保留在[历史基线](TECHNICAL_DESIGN_HISTORY.md)。本轮限定替代旧交易、凭证与导航方案，Next.js/NestJS/PostgreSQL等既有基础选型继续复用。

## 里程碑边界

| 阶段 | 当前状态 | 唯一正式产物/进入条件 |
| --- | --- | --- |
| 方案设计 | 内容已收敛，进行文档与实际图示审核 | Technical Design、Engineering Decisions、当前Change Proposal/Design；不等于实施完成 |
| 规格化 | 尚未完成 | 同一Change补齐Delta Specs/Tasks，并传播产品基线的限定差异；不在此拆任务 |
| 开发与验证 | 未启动 | Human明确启动后依正式Tasks实施，验证事务/幂等/恢复及各端真实流程 |
| 切换与交付 | 未启动 | 真实验证与对应授权后再执行旧流程清理和切换，不因文档定稿自动执行 |

## 证据与仍需验证的事实

- 本轮仅有文档自查；不将历史v0.1 Builder Check视作现行方案独立审查。
- 正常负载下到期5秒内释放库存是设计目标，尚未运行验证；Host呈现、导航和UI支付需分别实测。
- PostgreSQL并发、重试、回滚、迟到响应、清理脚本与库存初始化须在实施阶段提供证据。
- 本轮图示实际渲染与视觉检查结果见下方记录；图示通过不证明业务运行正确。

## 2026-10-30 图示与可读性复核

- 实际渲染：Mermaid 11.12.0 + 本地无头Chrome，复用已有Playwright；渲染脚本下载到临时目录，未修改项目依赖，文档未上传外部渲染服务。
- 五张图均渲染成功，逐张查看PNG；业务图从过宽布局改为纵向，修正时序注释换行，前端图按Web/WebMCP与Apps分组，后端图分开Agent工具与Human UI通道。
- 完整文档在1280px及768px窗口检查。窄窗口图示保留可读宽度并横向滚动；主文档阅读重点依次为体验、业务模型、各端流程、状态、前端架构，后端机制放在其后。
- 本地预览：已生成独立HTML、SVG和截图，位于当前会话可视化目录`design-review/`；源图仍唯一维护在Technical Design的Mermaid代码块，预览不是第二份设计来源。
- 结论：本轮静态及视觉自查未发现阻止方案收敛的问题；图文角色、状态和复用边界一致。不是独立审查，不是原生Markdown渲染器兼容性或业务运行验证，不自动将文档标记Approved。
- 历史批准正文完整拆至TECHNICAL_DESIGN_HISTORY.md；主设计不再承载历史正文、里程碑或交付进度。
