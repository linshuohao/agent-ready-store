## Why

非MCP审查发现HTTP响应重复封装、共享Link丢弃Next能力、页面工具手写schema与共享约束不同步、退役客户端残留。Human于2026-11-03要求“把这些都改一下吧，然后改完之后再检查一遍”，批准按已解释范围实施；本Change记录同一轮整理的非MCP补充。

## What Changes

- 使用Nest正常返回、HTTP专用interceptor/filter统一envelope、状态和no-store；保留既有HTTP契约。
- Web Link委托Next Link，嵌入端保留导航适配，显式prefetch=false继续有效。
- 页面工具JSON Schema统一从共享Zod输入生成，保留执行时校验。
- 删除无生产消费者的旧结账请求模块及其旧实现测试；保留旧入口拒绝测试。
- 实验验证Nest start --watch对共享JS依赖和资源更新是否等价；等价才替换，若产生回归则保留现有受测方案并记录证据。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无正式业务行为变化。复用product-discovery、webmcp-shopping与mcp-app-shopping的共享数据/跨端交互要求；只修正发现schema与现行输入约束一致。使用skip_specs=true，不新建人为规格。

## Impact

影响HTTP Controllers及HTTP适配、共享runtime与Web适配、页面工具、退役客户端及开发启动验证。无新依赖、数据迁移、领域交易/权限/维护顺序变化。沿当前refactor/mcp-sdk-registration分支保留上一轮修改，同一审查单元的补充由独立Change记录；不自动提交、Push、Merge、发布。
