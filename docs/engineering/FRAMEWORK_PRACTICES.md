# 框架实践：开发前选择与同次审查

本文件是项目框架适配规则的唯一正文，由 ai-native-workflow 在开发前按范围加载、ai-native-review 在已有审查中复用。不新增流程、审批、检查报告或第二次全量审查；纯文档/无关任务不加载。

## 按改动范围选择资料

|范围|开发前所需资料与检查|
|---|---|
|`apps/web` 的页面、路由、数据读取或运行边界|读取该目录 AGENTS；优先查 `apps/web/node_modules/next/dist/docs/` 对应章节，与安装版本匹配。检查 Server/Client 边界、导航、数据并行和缓存语义。|
|共享 UI、Web、Apps 的 React 组件/Hooks|可用时加载 `vercel:react-best-practices`（或同源 `vercel-react-best-practices`）中与当前修改相关的规则；检查 Hook 调用、Effect 依赖/清理、竞态、重复订阅与无效渲染。共享 UI 不因被 Web 使用而引入 Next 专用依赖。|
|Nest Controller、Module、Service、HTTP/MCP 边界|查当前安装版本的类型/实现及官方对应文档；先明确 Guard/Pipe/Interceptor/Filter/Middleware/Service 各自职责，再实现。|
|替换现有接口、Schema、组件或适配器|先搜索既有高层能力和消费者；同步检查导出、调用链、旧测试、专用样式和文档。保留有明确用途的历史恢复/拒绝行为。|

只加载当前问题需要的章节。已读取且仍适用的资料不重复加载；Skill不可用时查同源官方规则，不把“已安装”写成“已应用”。文档与安装版本不符时以版本匹配证据确认；外部建议不得覆盖项目已批准契约。

## 项目适配边界

- **复用优先**：已有框架/SDK/项目封装能完成职责时优先复用。必要的底层边界应说明高层入口缺少什么能力，不机械禁止所有底层API，也不为套模式新增框架。
- **Nest职责**：准入放Guard，HTTP参数转换/校验放Pipe，响应包装/异常映射放Interceptor/Filter，Controller负责协调。Service保留跨HTTP/MCP的业务校验、事务、幂等和归属约束。解析中间件异常及请求维护顺序不能机械搬到Controller生命周期内。迁移须保持错误优先级、状态/envelope、no-store及退役410。
- **依赖与生命周期**：优先现有DI、provider作用域与生命周期；共享连接、初始化就绪及清理行为必须保留。不能因为社区示例而引入repository/events或替换Prisma/Zod。共享领域错误不为HTTP方便改成传输专用异常。
- **Next边界**：服务器取数与内部配置保留在Server侧，必要时使用server-only；浏览器状态/交互放Client侧。普通Web导航用Next Link，嵌入导航由运行环境适配。独立读取可以并行，禁止在SSR模块级共享用户可变状态。
- **缓存与写入**：库存、金额、订单新鲜度和交易链接预取遵循现行契约；不得为性能规则引入静默缓存、自动重试写入或后台完成用户操作。Server Actions、SWR等仅在实际问题需要时选择，不替换多端共用服务来追求形式统一。
- **React生命周期**：依赖数组描述真实依赖，不靠漏依赖、全局disable或无意义微任务隐藏问题。取消信号必须传到实际请求；无法取消时保留过期响应隔离。Effect需要对称清理；不要因依赖补齐产生重复写入或无限请求。
- **退役清理**：只删确认无消费者的实现。旧路径明确拒绝、未知写结果只读核实、数据库迁移历史仍有用途，不能与无用兼容代码一起删除。

## 在现有执行与审查中使用

开发前在当前对话或已有Change中简述适用资料、可复用能力和影响设计的例外；局部改动不新增正式计划。实现后，Reviewer在同一次审查中核对上表与适用边界，给出具体触发/影响，不把“没用某个库”直接当作缺陷。

可自动检查的规则进入现有lint/typecheck/测试。共享UI的Hooks规则由 `packages/commerce-ui/eslint.config.mjs` 执行，Web沿用Next ESLint；根 `pnpm lint` 和现有CI统一调用。Lint不能证明Guard配置正确、请求已取消、交易无竞态；这些按风险用现有边界/集成测试验证。证据留当前对话、Change或PR，不新增Skill使用流水账。

## 资料来源与维护

- [Next本地Agent规则入口](../../apps/web/AGENTS.md)；[Next Skills迁移说明](https://github.com/vercel-labs/next-skills)。优先随安装版本的文档，不另装已退役的next-best-practices。
- [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)：按需参考请求瀑布、边界、Effect和渲染规则，不自动采用其缓存/库选型建议。
- [Nest Guards](https://docs.nestjs.com/guards)、[Pipes](https://docs.nestjs.com/pipes)、[生命周期](https://docs.nestjs.com/faq/request-lifecycle)。[社区Nest Skill](https://github.com/Kadajett/agent-nestjs-skills)仅作候选参考，本项目未安装，不替代官方依据及项目约束。

框架升级或真实缺陷暴露规则缺口时更新适用条目；不复制上游整套规则、不修改第三方Skills、不默认追随最新版本。
