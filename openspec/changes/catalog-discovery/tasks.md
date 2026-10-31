# Tasks

Human已批准规划、提交与实施；以下追踪实际进度。向量搜索不属于本清单。

## 1. 共享分类与协议入口

- [x] 1.1 在contracts和Catalog/CatalogService实现分类输入、Page输出与无库存依赖投影；在catalog测试覆盖去重、原值空格、空分类、售罄分类、稳定分页、参数上限和版本变化，验证不泄露内部字段且不读取库存。
- [x] 1.2 添加HTTP分类路由及只读无UI的MCP工具；更新工具全集/schema断言与MCP_CONNECT说明，运行HTTP/MCP对照、非法身份/Host/Origin、故障与分页测试，确认旧搜索输出和卡片绑定不变；请求模式下验证分类HTTP/MCP不调用到期清理且数据库故障时可用，其他入口仍清理并传播失败。

## 2. 页面分类选择

- [x] 2.1 Web加载分类第一页并传入共享CatalogPage/SearchForm，替换分类输入框为有标签的select；验证“全部”、精确value（包括边缘空格）、URL恢复、前后退、保留品牌/预算和筛选重置分页；Apps仍无表单且不额外请求分类。
- [x] 2.2 实现分类加载更多、未列出URL值、错误重试与迟到响应隔离；用组件或浏览器测试覆盖首次失败、续页失败、版本变化、恢复成功及已选条件不丢失，并更新Product Design受影响行为说明，保留全局批准状态。

## 3. 集成验收与契约传播

- [x] 3.1 执行受影响包typecheck、lint及定向Catalog/HTTP/MCP/UI测试；真实浏览器验证桌面/移动与键盘选择，记录命令和实际结果，不以跳过用例充作通过。
- [ ] 3.2 真实Codex Host验证“不了解分类先发现再搜索”“明确需求直接搜索”“模糊用途需详情核验/澄清”“无合适商品”案例；保留预算，发现工具不产生卡片、不写交易，最终浏览只展示一次搜索卡片；记录实际调用与限制，不宣称服务端能强制模型策略。
- [x] 3.3 对照批准范围更新Requirements CAT条目、Technical Design/API说明及适用交付状态，引用同一Change；完成聚焦代码审查并修复发现的问题，交Human验收，确认文档未将向量搜索写成已实现能力。

## Planning evidence

2026-10-31：基于当前源码、现行Spec与D-15/D-19/D-20做聚焦设计自查（非独立Review）。确认使用现有Catalog和Page，新增API不与商品ID路由冲突；补充原值trim风险、URL未加载值、分类故障独立性、分页版本和Apps无UI边界。接口名称、分页默认值等具体设计仍待Human Review。仅有文档产物，不执行商品/交易测试，不声称业务验证通过。

2026-10-31 后续规划复核：Human已审阅方案，授权复核通过后提交并进入实现。发现一个待裁决的契约冲突：`vercel-demo-request-expiry` 已批准增量要求所有REST业务请求与认证后的MCP工具调用先执行到期清理；实际 `main.ts` 与 `mcp.adapter.ts` 也如此。因此本方案“不依赖库存数据库、无交易副作用”不能仅靠CatalogService只读方法实现。建议限定豁免新增分类HTTP/MCP入口，或保留清理并修订新方案承诺，已交Human裁决；依赖该结论的规划提交与实施尚未进行。

其余聚焦自查：确认复用Page/Result、HTTP查询解析、现有Web代理和Runtime Transport；原生select必须保留原value；Apps不加载分类；动态分面和向量搜索仍后置。依赖通过现有锁文件离线安装，未新增依赖。OpenSpec严格校验及Git空白检查通过，不等于业务测试或独立审查。裁决落实后须复验规划、提交并执行阶段转换Guard。

## Workflow follow-up

- Human批准具体方案后进入apply；提交、Push、Merge分别按授权执行。
- Human验收后同步正式Spec并归档本Change；更新D-15方案引用以保持链接可用。

2026-10-31 裁决与复核：Human接受仅分类入口豁免。冲突已关闭，补充inventory-reservation增量（承接vercel-demo-request-expiry已批准行为，保留其原场景；归档时先同步该前置增量）。聚焦设计自查通过，非独立审查。规划经严格校验后提交；进入实施前执行Guard。

## Implementation evidence

2026-10-31：规划提交`484cb83`后，planning Guard通过才进入实现。共享分类与限定豁免已实现；未安装新依赖或修改原件，未写业务数据库。

- `pnpm typecheck`、`pnpm lint`通过（全部工作区包）。
- 定向Vitest：Catalog基础/分组/分类、HTTP/MCP分类、请求清理、MCP协议、共享UI和contracts共14文件67项通过，无跳过。目录投影先观测到缺失方法失败，再实现通过；协议测试覆盖真实Nest HTTP/SDK与故障替身，不将其称为真实数据库测试。
- 浏览器使用隔离目录夹具（含55个合成分类和空格分类），不读取真实运行库存；键盘选择采用原生select的字符匹配路径，桌面/移动均已通过。
- 独立只读review_catalog审查发现P2：全空白URL category在提交其他条件时被trim判断清除。已修复并补桌面/移动回归；定向独立复核确认关闭，无其他阻塞发现。
- 真实Codex CLI Host临时连接本机隔离MCP，完成四场景：分类发现后搜索；明确Bluetooth耳机直接搜索；模糊通勤用途查询与详情核验、不声称有ANC；1 TWD火星宇航服返回空且不放宽预算。实际调用list_product_categories 2次、query_products 3次、get_product 2次、search_products 4次（每场景一次）；没有购物车/订单调用。测试库存来自夹具，不是生产库存。临时Host进程与服务已停止，未修改用户MCP配置。
- 3.2保留未勾选：CLI只能证明真实工具调用及输出，不能证明支持Apps的真实Host已渲染一张最终卡片。协议测试已确认分类工具无UI元数据、search_products保留UI关联；真实Apps视觉部分仍待验收，不用模拟或CLI替代。

本轮交付实现供Human验收，最终接受、正式Spec同步/归档和Push/Merge/发布尚未执行。

最终本地验证：`pnpm test:categories`完整入口通过（contracts/API构建及桌面/移动12项Chrome测试，页面无运行错误）；最终`pnpm typecheck`和`pnpm lint`均通过。仅3.2的真实Apps卡片视觉验收未完成，Change维持6/7，不能归档或宣称全量验收通过。
