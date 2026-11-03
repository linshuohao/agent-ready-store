## Why

当前 McpServer 注册后仍覆盖 resources/list、resources/read 和 tools/call，形成两套注册/执行职责。Human 于 2026-11-03 要求全部处理，不为旧 URI 兼容继续增加复杂度。

## What Changes

- 使用 SDK registerResource/registerTool 的完整执行路径，删除三个底层请求覆盖及重复能力声明。
- **BREAKING** 仅提供当前版本 UI URI，删除历史版本映射；旧 Host 必须刷新发现，不将旧 URI 重定向到新 HTML。
- **BREAKING** 非法工具参数使用 SDK 标准工具错误；未知及退役工具统一使用 SDK 未注册工具协议错误，不再维持旧业务 envelope 和 CHECKOUT_FLOW_REPLACED 特判。
- SDK 负责工具边界 schema 校验，handler 接收类型化数据；保留业务层交易、安全、续调及不可信 Host 输入校验。
- 维护钩子只在已注册且通过输入校验的工具回调执行；保留分类、结果核实等现有豁免。
- 更新受影响测试、接入说明和正式规格差异，不新增兼容框架或依赖。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `mcp-app-shopping`：只支持当前资源 URI，更新缓存失效及结果兼容边界。
- `agent-shopping`：明确 SDK 协议/输入错误与业务失败的分工、退役工具拒绝及维护执行边界。

## Impact

影响 apps/api/src/mcp、packages/contracts 的资源常量、MCP 测试和接入文档；核对 Apps Bridge 对 SDK 错误的处理。无数据库迁移，无交易语义或支付权限变更，不移除已注册的业务工具，不取消当前 SDK 对新旧 MCP 协议的支持。旧 URI 缓存将失效；Host 刷新后使用当前发现结果。

2026-11-03 Human 回复“同意”，批准本方案实施，包含旧 URI 移除和 SDK 错误格式变化。提交、Push、Merge、部署均未授权。
