# Tasks

2026-11-03 Human 已确认本方案和 SDK 标准错误语义；任务仅在实际完成并验证后勾选。

## 1. 当前资源注册

- [x] 1.1 先建立当前资源可读、旧版本/未知URI拒绝及路径越界拒绝的真实SDK回归，再迁移至registerResource，删除历史URI常量、映射和底层list/read覆盖；验证列表恰为当前两份资源、HTML/CSP和工具关联不变。
- [x] 1.2 更新MCP接入说明中的缓存刷新与旧卡片失效处理，核对当前构建产物、版本导出及所有非归档引用，验证contracts/API/Apps相关构建和资源集成，无条件跳过不得计为通过。

## 2. 高层工具执行与输入责任

- [x] 2.1 建立未知/退役工具协议错误、非法参数工具错误且不触发维护/handler的失败回归；删除tools/call覆盖、执行Map和退役名单，使用registerTool回调，验证重复注册拒绝、有效调用维护及既有只读豁免。
- [x] 2.2 将工具schema输出与handler通过简单泛型关联，删除MCP入口重复parse及无消费者helper，保留领域和续调校验；用类型检查与默认值/transform、非法输入、选择篡改测试验证，不用any或强制断言跳过边界。
- [x] 2.3 保留业务结果封装、input_required及SDK结果投影，核对Bridge对协议/工具错误的明确失败反馈并作必要最小修复；验证业务错误码/约束详情/recovery和未知异常脱敏，新旧协议测试通过，更新错误语义接入说明。

## 3. 集成审阅与交付

- [x] 3.1 完成受影响MCP、工具及Bridge回归、类型检查、lint和格式检查；确认三个底层请求覆盖均移除，工具发现无非预期变化，记录实际命令、失败修复和重验结果，完成一次适用代码审查。
- [ ] 3.2 在真实Host刷新发现并核对搜索卡片、订单卡片及错误反馈，分别记录Host版本和现场证据；不可执行时保持此项未完成并明确验收缺口，不用SDK替身替代。

## Workflow follow-up

- 完成可审查Diff和验证后按当前授权申请提交；无提交、Push、Merge或发布的隐含授权。
- Human验收后同步并归档本Change，保留历史归档正文。

## Verification evidence

2026-11-03：Human 在方案交付后回复“同意”，已实施当前 Change；未提交、Push、Merge 或发布。

- 失败基线：registration 的未注册工具回归收到旧 CHECKOUT_FLOW_REPLACED envelope；临时真实 HTML 夹具验证历史 v4 URI 仍返回当前资源，两项均观察到预期失败，再实施修复。
- `pnpm exec vitest run apps/api/test/mcp/registration.test.ts apps/api/test/mcp/protocol-upgrade.test.ts apps/api/test/mcp/tool-errors.test.ts apps/mcp-app/test`：5文件70项通过，无跳过；覆盖默认值/transform、非法参数和未注册工具拒绝、维护豁免、业务错误/脱敏、旧URI拒绝、Bridge失败及新旧协议续调。
- `pnpm exec vitest run apps/api/test/mcp/config.test.ts apps/api/test/mcp/guidance-protocol.test.ts apps/api/test/mcp/result-guidance.test.ts packages/contracts/test`：9文件53项通过，无跳过。
- 按CI的token模式在当前工作区启动临时loopback API3003，使用本机store_test；串行执行 lifecycle-mcp、apps-resource、mcp、cart/retired-http 四个文件：13项通过，无跳过。核对API进程cwd为当前工作区，测试后停止；没有启动或复用旧Web/API服务，没有操作业务store库。
- 首轮真实集成7项失败：store_test缺少现有20261101000000_cart_initialization_identity迁移，Cart.initializationId列不存在。只读确认后仅向store_test应用这条现有迁移，重跑上述4文件全部通过；非业务代码回归，无新增迁移或业务库变更。集成套件按既有方式重置测试库交易夹具。
- contracts、API、Apps构建通过；三个工作区的typecheck及lint通过。当前两份实际HTML经真实MCP读取与CSP/鉴权/越界断言验证。受影响文件Prettier检查、git diff --check、OpenSpec strict validate通过。
- Superpowers requesting-code-review 路由的独立只读 reviewer `/root/review_mcp_registration` 核对完整Diff、规格及本地SDK后返回无可行动findings；其自行执行git diff --check，运行测试证据复用本轮，不伪称复跑。
- 生产MCP中三个setRequestHandler及重复registerCapabilities均已移除；旧URI映射/常量及MCP parseToolInput helper已删除。共享服务及不可信Host边界仍校验。
- 3.2仍未完成：尚无真实Host刷新发现、搜索/订单卡片及错误反馈的现场证据。本轮不自行发布或修改Host连接；SDK测试与真实Host验收分别记录。

- 后续非MCP HTTP回归发现catalog/grouped-http仍断言旧参数错误envelope；已同步为SDK isError/content且无structuredContent，两个协议模式在实际API回归中通过。生产契约未变。
