# Design

## Context

动机与授权范围见 proposal.md。依据现行 agent-shopping、mcp-app-shopping 及历史 maintainability-modernization 的逐工具注册约束；后者原有“保留错误封装、旧 URI”要求由本 Change 显式修订，不修改归档历史。全局基线不作为额外未核实批准来源。

已核对本地 @modelcontextprotocol/server 2.4.0：registerResource 提供资源发现、URI 解析及不存在错误；registerTool 提供输入校验、启停判断、输出校验和协议结果投影。当前资源数组及 tools/call Map 分派绕过上述高层路径。自动输入校验失败发生在业务 callback 前，默认错误不包含本项目 envelope；未知工具是协议错误。

## Goals / Non-Goals

目标：注册与执行使用同一 SDK 所有者，应用仅保留业务回调、公共结果封装和维护钩子。处理本轮发现的全部三个请求覆盖及相关重复校验，不新增一套中间件系统。

非目标：删除现有业务能力、HTTP 退役路由、历史交易结果核实、有效单目标搜索、旧 MCP 协议支持；不改数据库、支付权限及共享 UI 状态机。底层能力读取、官方 HTTP adapter 和 Host Bridge 属于必要边界，不因含 server 属性而机械删除。

## Decisions

1. 资源 descriptor 仅保存当前 URI、固定文件名与元数据；注册回调读取固定文件并返回 CSP。删除 cachedUris、mcpCachedAppVersions 及导出，SDK 负责 list/read；不引入 ResourceTemplate、版本映射或重定向。保留工具关联和当前构建版本单一来源。替代方案“高层注册历史别名”仍积累兼容成本，不采用。
2. 工具通过 registerTool 直接运行类型化回调；删除 tools/call 覆盖、执行 Map、retiredTools 和 dispatchInstalled。沿 SDK 注册保证重复名失败；应用仅封装 beforeCall、result/mcpResult 和 input_required 原样返回。不存在/非法参数在回调前拒绝，解决维护先于拒绝的问题。SDK 自行负责投影，不另手工模拟。
3. 用简单泛型将 inputSchema 的输出类型传至 handler，避免 unknown 与逐工具重复 parse。对仅承接 MCP 已校验数据的辅助函数相应类型化；共享业务服务仍验证其公共输入及交易约束。续调签名、选择成员、当前库存等语义校验保留。不得使用 any 或类型断言假装完成验证，也不引入动态插件框架。
4. SDK 参数/未知工具错误采用标准语义；有效输入后的业务失败保留 envelope、environment、recovery、constraintViolations。Apps Bridge 必须明确识别协议异常或 isError，不把缺少业务 envelope 当成功；只在确有缺口时做最小错误适配，不复刻 SDK 错误对象。该公开变化已于 2026-11-03 获 Human 确认。
5. 保留现有新旧协议和 input_required 路径；资源元数据继续兼容当前 Host 声明格式。移除旧 URI 不等于删除工具 _meta 中已有的 UI 字段，后者不产生手写协议分派。

## Risks / Trade-offs

- 旧卡片 URI 失效 → 接入文档明确刷新发现并重新打开当前资源；恢复订单使用原 ID，不重放生单。
- 错误结构变化 → 区分非法输入、未知工具与业务失败的契约测试，并核对 Bridge 失败反馈；不要求 SDK 错误文案逐字稳定。
- 删除手动解析可能漏掉 transform/default → 验证回调收到 schema 输出值，保留领域反例和续调篡改测试。
- SDK 行为和真实 Host 缓存存在差异 → 真实 SDK 协议测试与 Host 验收分开记录，缺证不冒称通过。

## Migration Plan

方案确认后先建立有意义的失败回归，再实施资源与工具整理、类型迁移及文档同步。运行 registration、protocol-upgrade、资源读写测试、相关工具/Bridge 测试及 API/contracts/Apps 类型检查与 lint；资源集成使用明确环境，不能以 skip 作为通过。涉及交易服务的变动不在本方案内；若发现必须改变交易逻辑则另行说明。

代码审查确认生产 MCP 无三个底层请求覆盖，当前工具发现除预期资源能力差异保持一致，当前 HTML 与构建可用。真实 Host 检查刷新发现、搜索卡片、订单卡片及错误反馈；如不可执行则明确留下验收缺口。发布另需授权，无数据迁移，必要时通过正常后续提交回退整个增量。

规划聚焦自查：已检查旧 URI 场景及批量结果兼容条款，两处均纳入 delta；未将旧协议或历史交易恢复误删。尚未实施或取得运行验证，不宣称独立代码审查。2026-11-03 Human 已确认本方案及错误格式变化。
