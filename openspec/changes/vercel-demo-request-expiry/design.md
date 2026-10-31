## Context
默认到期执行器每秒扫描。Vercel Functions 可缩容，不保证后台计时器运行；Human 已接受短期 Demo 的延迟物化取舍。依据 inventory-reservation、REQUIREMENTS 的库存章节及 TECHNICAL_DESIGN 订单模型，保留十五分钟锁后数据库时间准入与一次释放。

## Goals / Non-Goals
目标：免费部署现有 Next.js/NestJS/Neon；请求清理覆盖 REST 与认证后的 MCP 工具调用。非目标：新任务队列、Webhook、常驻进程、真实支付或身份系统。

## Decisions
- `ORDER_EXPIRY_MODE=request` 关闭启动及定时扫描；默认 `worker` 保持本地体验，未知值启动失败。
- REST 业务请求及已认证 MCP 工具调用在处理前等待一批最多100单的既有 expireOrders；健康检查不扫库。实例内并发共享正在执行的批次，多实例依赖既有事务及行锁。
- 批次有界，积压跨后续请求继续扫描；无流量不承诺物化时限。失败显式记录并返回失败，不把未释放量算作可售。
- 前后端使用独立 Vercel 项目，复用 NestJS 业务代码、Neon pooled 运行连接与 direct 迁移连接；资源打包在服务端函数内，不公开原始文件。
- 不用容器 Beta 和 Daemons；Docker 仍支持本地及其他容器环境。

## Risks / Trade-offs
每次请求增加到期查询开销，积压可能需多次请求清完；优先保持实现简单与保守库存。冷启动、数据库池、MCP 静态资源需上线验证。达到免费额度时接受暂停，不自动升级。

## Migration Plan
无需数据库迁移。新配置失败可撤回至既有 Docker；Neon 已有数据不重置、不重复 seed。上线验证只创建可追踪 Demo 数据并取消未支付测试订单。
