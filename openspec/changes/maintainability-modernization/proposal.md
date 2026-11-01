# Proposal

## Why

当前 MCP 将认证、资源、工具声明与 switch 分派集中维护，部分旧结算代码、工具链配置差异及分散的展示目录增加了阅读和演进成本。本轮在保持购物业务与已有展示地址的前提下，全仓检查升级与重构，并提供本地及线上均默认免认证的 Demo 体验。

## What Changes

1. Demo 默认免除 MCP Token 验证，开放全部现有工具及 Apps 资源；显式配置 token 才启用认证，保留 Host/Origin、输入校验及 Human 支付边界，线上演示也使用demo。
2. 全仓核查废弃 API、依赖及构建用法，迁移 MCP 至 McpServer；升级范围不预先限于补丁版本，但任何业务变化必须另行裁决。
3. 统一逐工具注册，工具描述、Schema、注解和处理函数就近定义；注册机制与业务分组无关，不新增动态插件系统。
4. 将 design、delivery、presentation 的源文件收拢到 docs，通过构建/部署映射维持旧 URL、子资源路径和锚点。
5. 随职责整理改善命名、段落、长表达式及关键原因注释。
6. 清查旧结算调用链，删除无消费者的内部代码，保留需要明确拒绝的旧公开入口和已有兼容资源。
7. 统一 TypeScript、Node 类型、ESLint 等公共配置与依赖声明；框架和运行环境保留差异。
8. 未知异常以 requestId 关联服务端日志，保持外部错误契约并避免泄露秘密。
9. 按真实职责整理交易服务及共享购物车状态，不改变事务、幂等、锁顺序或状态所有权。本轮仅保留视图映射、退役接口清理及反馈展示等行为等价整理；加购独立指令、版本范围、状态隔离及升单清理由独立购物车 Change `cart-command-state-isolation` 承接，不在此批准或实现。

## Capabilities

### New Capabilities

无。注册、配置复用、目录整理及测试组织为内部实现变化，不创建独立业务能力。

### Modified Capabilities

- `agent-shopping`：明确显式token认证与Demo 免认证例外，保留模型/Human 操作边界。
- `mcp-app-shopping`：Demo 无 Token 可读取合法 Apps 资源，token模式仍拒绝无认证读取。
- `shopping-cart`：Demo 定位要求引用上述入口认证例外，其他可信字段约束不变。
- `product-discovery`：查询入口认证描述同步MCP Demo模式，其余查询语义不变。

## Impact

涉及 apps/api、apps/web、apps/mcp-app、packages/contracts、packages/commerce-ui、工作区及独立site的依赖、锁文件与配置、scripts、CI/构建部署入口及相关文档。无数据库结构迁移、数据清理、新服务、真实支付、UI 视觉改版或公开工具业务契约变更；唯一新增可观察行为是默认Demo免认证。

本提案依据 2026-11-01 Human确认的九项范围与后续修订；Human已批准规划及实施，并随后授权先检查、提交和合并其他部分，将购物车调整移至独立工作区与会话。范围拆分、对应验证及独立审查已完成；Human现已授权提交、Push、PR、Merge和归档，并允许本轮合并触发自动部署。真实Host验收已由Human于2026-11-01确认通过，见tasks.md的5.2。历史delivery并行成果以Task 4.1的核对证据为准，不再作为未解决前置项。

核心业务/集成/E2E场景及断言完整复用，内部方法单测按新职责重写；验证矩阵及实际执行证据见design.md、tasks.md。历史自动化通过记录不代表拆分后最终提交已验证；Human真实Host验收确认与最终代码检查分别记录。
