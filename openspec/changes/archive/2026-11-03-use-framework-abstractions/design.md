# Design

## Context

见proposal及上一轮审查。当前安装Nest12、Next16、Zod4，应用仍有重复HTTP响应处理、手写Link和部分手写JSON Schema。复用现有共享服务、CommerceRuntime环境适配和Zod，不引入库。Human已在看到具体建议后授权实施及复查。

## Goals / Non-Goals

恢复框架职责并删除无消费者旧代码，保持现有业务行为。范围不包括SQL锁、交易状态机、权限检查、过期维护顺序、原生dialog及HTTP旧入口拒绝。上一轮MCP变更独立记录且不撤销。

## Decisions

- HTTP使用controller范围的Nest interceptor包装成功结果、exception filter映射AppError/未知失败；共享result继续负责requestId及脱敏。Controller返回业务数据，Post显式HttpCode(200)，旧路径410和所有响应no-store保持。Filter通过HttpAdapterHost处理最终错误响应，平台细节集中在边界，不做全局MCP包装。
- CommerceRuntime增加可选Link组件，Web提供next/link，嵌入默认锚点仅承担自身导航；保留显式prefetch=false和修饰键/外链语义。不把Next依赖引入共享包。
- 页面搜索、评论及空输入的声明从Zod输入生成，与当前其他工具一致；跨字段refinement继续由运行时校验，不宣称JSON Schema可替代所有校验。
- 已查明旧checkout commands与purchase-commands无生产消费者，删除这两个模块和旧客户端实现测试；复扫确认旧cart commands同样无生产消费者，一并移除其re-export、包导出、未用回调类型和旧测试；旧HTTP/页面入口拒绝验证保留。
- watch先用隔离fixture比较API源码和共享JS变化触发行为；只有等价且无需增加另一套监听机制才使用Nest watch。当前根启动协调仍保留。

## Risks / Trade-offs

- Nest默认Post201或异常默认响应改变契约 → 新旧Controller真实Nest HTTP测试比较200、业务状态、503脱敏和no-store，再跑现有HTTP集成。
- Next Link与嵌入导航不同 → 共享Link适配测试及Web/嵌入现有浏览器回归；不放开交易链接预取。
- watch丢失共享依赖更新或清空Apps产物 → 隔离实验后决定，回归则不强换。
- 本轮不改领域不变量或数据结构，单负责人串行实现并定向验证；不为可逆重构制造预先提交门槛。提交/合并仍需授权。

规划自查已对照已批准方向和实际源码，内部实现无需新增业务裁决；正式规格保持不变。实施完成后按requesting-code-review请求独立只读复查。

## Watch experiment outcome

隔离fixture确认Nest watch会清空dist下Apps资源，且共享JS仅实现变化不会重启；现有Node watch会重启。保留当前组合，避免为采用高层入口反而增加资产复制和第二套依赖监听。详见tasks验证证据。

## Follow-up scope and implementation

2026-11-03 Human追加授权清理及逐项优化，优先Next/Nest最佳实践。职责拆分：cleanup仅contracts和无消费者PurchaseSummary；ui仅Bridge/PageTools；root仅HTTP Guard/Pipe与协调、清单和集成。三者无重叠写入，契约保留清单为共享边界，任一现行消费者出现则保留其依赖。

HTTP以小型Guard集中准入，路由声明query是否允许/退役豁免等必要差异；购物车先请求形状再Origin，商品搜索先Origin再query的原拒绝优先级保留。Zod Pipe仅承接当前Controller已有参数校验/转换，Service校验不能因HTTP Pipe删除。不要新增身份保证；Origin不是Human身份。原生dialog保留为候选，只有具体收益/回归验证支持才替换。历史只读恢复、退役410及数据库锁/维护时序均不改。

Next扫描补充：内部publicApi模块增加server-only边界，默认Server页面取数/客户端交互边界与并行fetch保留；清单及不改理由统一见tasks。本轮独立复查无findings，域内权限逻辑不变，只迁移HTTP准入职责。
