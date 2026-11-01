# Tasks

Human已授权审查、修复后实施，并要求接口契约、前端、后端独立分工及多Agent执行。当前已对齐main `db3f0e4`，分支`feat/cart-command-state-isolation`。业务实现及本地验证完成，Human已确认本地验证通过并授权实施Checkpoint提交；Git规划Checkpoint提交已获本轮授权，不Push/Merge/部署。当前Change是唯一任务来源，不建立平行计划。

## 1. 实施前检查（协调Agent + Review Agent）

- [x] 1.1 Review Agent独立核对设计及最终main，对finding定向修复复核；验收包括逐项选择代次、同清单报价乱序、只读核实和初始化/旧请求退出完整性，真实记录审查与Human授权范围，不冒充实现验收。
- [x] 1.2 核对最终main的工具注册、Provider职责、旧pending格式及停写排空要求；验证保留Demo/token、每工具独立定义及已合入维护性改动，未携带原工作树补丁。
- [x] 1.3 获得规划Checkpoint提交授权并运行高风险转换Guard；验证本Change全部成果受Checkpoint覆盖，批准及审查真实，缺失则不进入业务实施。

## 2. 接口契约（协调Agent唯一写入，前后端共同依赖）

- [x] 2.1 在packages/contracts固定cartId/initializationId互斥定位、add无版本、set/remove保留版本；新建只允许共享身份add，旧initialItems/空车新建退出。契约测试验证合法分支、非法字段/数量/重复ID、既有cartId不存在不建替代车；交付输入类型及迁移说明。
- [x] 2.2 固定quote/createOrder的selectedItems.productId/quantity、约束、通道和输出；删除生单expectedCartVersion/expectedQuantity，sourceCartVersion仅观察值。契约测试覆盖边界、非法客户端价格/来源、约束归属及固定订单输出。
- [x] 2.3 固定get_request_result及HTTP等价接口的操作类型、原定位身份、请求键、found/not_found结果和技术错误；核实order/cart/旧initialize返回目标关联，无in_progress/failed伪状态、无查询转写。提供前后端共用示例与失败反例，明确新原请求继续/旧请求只读分界。
- [x] 2.4 根据已确认语义更新本Change及D-23/D-24、T-08/T-10限定替代、Requirements/Product/Technical Design相关正文；验证一处正文、保留历史、覆盖版本/整行清理/只读查询豁免/初始化退出。冻结本轮接口契约版本后通知两执行Agent，契约变动仍由协调Agent统一写入。

## 3. 后端（Backend Agent；依赖2，完成后与前端集成）

- [x] 3.1 在CartService和Prisma实现独立add与初始化身份唯一映射，按既有短事务和操作键去重；真实DB测试首次A/B并发一车、同SKU累加、无效首请求不留空车、异载荷冲突、归因只记一次、旧新建入口拒绝。同步后端实现说明及必要迁移，不改contracts。
- [x] 3.2 计价用例改为显式购买量，报价与生单复用；测试车量5/1/无行均可报价买2、零价/异常库存/预算/规格拒绝、价格门槛和优惠不变，保留库存不足报价反馈。
- [x] 3.3 实现无版本生单及原子SKU整行清理；真实PostgreSQL验证订单/预留/清理故障回滚、无匹配行也成功且版本只递增一次、同键恢复不再清后加商品、不同键独立单、最后库存与配额竞争。
- [x] 3.4 增补确定事务顺序：同SKU add先提交会被清理，生单先提交则后加保留；B加购不阻止买A；set/remove两个顺序不复活/误删新行。检查实际订单数量和库存账实，不以Mock替代。
- [x] 3.5 实现只读请求结果用例及HTTP/MCP独立工具（含Apps可调用性），复用已有Order/CartOperation/Cart；真实DB验证found/not_found、原请求迟到提交、错误不吞、未知身份不建车。隔离后台任务后比对查询前后业务表无变化，含到期未释放订单；定点skipMaintenance及HTTP豁免、当前demo/token和Host/Origin规则有效。
- [x] 3.6 实现旧写拒绝与历史只读核实，准备停写排空/回退操作说明；测试旧成功可查、无记录不执行旧载荷、不得静默转换新语义，记录实际发布排空仍需部署授权。交付API/MCP发现与响应回归证据，包括每工具独立定义、结果引导和单最终卡片规则。

## 4. 前端（Frontend Agent；依赖2，可与3并行）

- [x] 4.1 Commands按请求持久保存并分离查询/继续，取消整车pending/active拒绝；单测两unknown并存、重载不发写、存储失败发送前停止、单条完成不清其他请求、迟到not_found不覆盖成功；同步局部恢复文案。
- [x] 4.2 runtime统一初始化身份，临界区重读currentCartId/initializationId且不包含网络，响应不得覆盖已切换车；双标签/Host适配测试Human与工具首次add独立发送且一车，旧初始化未核实时不建替代车；缺能力明确反馈，不用非原子存储冒充保证。
- [x] 4.3 Provider与商品按钮按自身请求隔离loading/error；确定性浏览器测试A慢B立即请求、不同入口同SKU独立、无FIFO/合并/自动重试、其他按钮无全局busy拒绝，保留导航意图隔离。
- [x] 4.4 车页分离车快照、set草稿与购买清单；每项selectionRevision标记选择归属、purchaseRevision关联整体报价。测试A生单在途新选B后清A留B，以及A取消后同量重选不被旧成功清掉；低版本/跨车结果和同清单旧报价不得覆盖新事实。
- [x] 4.5 实现本页主动移除同步取消未提交选择，失败/未知/重加不勾回；外部移除仍在摘要展示。测试已发尝试不被取消、迟到set不勾回、恢复已保存数量明确同步输入及购买量、失焦set失败不覆盖订单成功；沿Design示意显示本次购买量与车保存反馈。
- [x] 4.6 生单冻结当前有效购买量，无需等待车set；选中非法量阻止、未选非法草稿不阻止。成功先保存orderId再结束原pending，客户端不再按SKU删车行；测试后加同SKU/新草稿保留、存储失败保留依据、离页不抢导航。
- [x] 4.7 WebMCP及Apps Bridge适配固定接口：查询只走get_request_result，继续原购买独立明确并展示冻结清单，未知查询不生单/改车；旧本地格式迁为只读历史核实，不执行旧载荷或静默换键。适配/组件测试覆盖工具主动移除及各通道来源，更新前端交互说明。

## 5. 集成、复核与验收（协调Agent + Review Agent）

- [ ] 5.1 前后端真实连接验证HTTP/MCP/WebMCP/共享Web/Apps：新工具发现、初始化、显式量报价/生单、只读查询及继续、旧格式退出；串行使用共享测试DB与端口，真实Host证据与替身分列，缺口不冒充通过。
- [x] 5.2 执行受影响contracts/API真实DB/共享UI及E2E（cart-feedback、cart-lifecycle、order-lifecycle），按实际改动跑typecheck/lint/build；保留计价、预留、支付/取消/到期不回车回归，失败由所属Agent修复后定向重验。
- [x] 5.3 Review Agent全新只读上下文审查最终契约、源码Diff及真实证据；协调Agent分类finding并派回唯一负责人修复，定向复核通过后交付Human验收，不用各包测试通过代替集成完成。
- [x] 5.4 Human接受本轮本地验证结果（2026-11-01明确“OK，验证通过了。授权提交。”；不声称人工逐项执行自动化场景或已完成真实Host验收）。关键场景证据：首次一车、按钮独立、车量5/1/无行购买2、同SKU两个清理顺序、不同键两单、主动移除不再购买、查询不写、原键不重复清车、在途选B/重选A归属；记录残余风险、未验证Host和实际发布排空条件。

## Workflow follow-up

- Git提交/Push/Merge/部署按对应授权执行；Human验收后同步正式Spec并归档，不直接改main。每个工作包不自行提交/改契约/重置共享测试库，根锁文件与CI由协调Agent唯一处理。

## Planning evidence

已基于main db3f0e4核对正式Spec及maintainability-modernization最终Diff；前期45797ad是历史规划基线。独立planning_review检查全部7份Delta，没有发现最新main约束被覆盖，提出逐项选择代次不明确的问题；协调Agent已按选择项代次修复并补两种定向场景，另补同清单报价查询序号。planning_review定向复核通过，原P2已关闭，未发现新增阻塞实施的规划问题；这是规划审查，不代表代码或Host验收。OpenSpec严格校验与文档检查通过。本轮Human已要求接口/前端/后端独立分工，并明确多Agent模式。规划Checkpoint 5fa7c6e已提交且Guard通过；随后按授权实施。接口契约单测先失败后通过（6文件28测试），前后端并行完成，独立代码Review已完成；真实Host尚未验证。

## Implementation and review evidence

- 接口：contracts 6文件28测试通过；先验证新契约5条失败，再实现通过。Apps资源v9及已知v8 URI兼容指向当前bundle，CI镜像路径已同步。
- 后端Agent：隔离PostgreSQL 18.4数据库store_test，cart/MCP/request-expiry整合19文件165测试通过（HTTP/MCP真实SDK与token模式，含维护豁免）；随后增强确定锁等待及首次操作落盘故障回滚，command-isolation定向15测试通过。没有把新增用例后的总数声称为一次全量运行。API typecheck/lint/build通过。
- 协调Agent：全仓typecheck/lint通过；前端与共享UI最终单测11文件58测试通过；API无集成环境单测113通过、77明确跳过，不能以该次跳过替代上述数据库/协议证据。受限环境的临时HTTP端口测试曾超时，允许本机监听后通过。
- 独立code_review已完成冻结源码、Spec、测试源码与Diff审查；恢复选择/草稿归属、原版本、工具定位、报价错误、焦点布局竞态及清理文案finding均已修复并定向复核，无剩余必修finding。Review未自行运行业务测试，不冒充独立运行证据。真实Host及远程部署排空仍未验证；后续本地服务切换与Human确认见下，不Push/Merge/远程部署。

- 前端Agent：Apps SDK浏览器Host替身13/13通过；WebMCP与订单/反馈非CI回归整跑及失败修复后的定向复验通过，没有把不同轮次合计伪称为同次全绿。
- 协调Agent生产验收：API/Apps构建完成；Web Turbopack最初因沙箱临时端口失败，清除失败构建的可生成缓存后在允许本机端口环境成功构建。使用干净隔离store_e2e_test与API3005/Web3006运行`playwright.ci.config.ts`，桌面/mobile共30测试全部通过（20.2秒），涵盖双标签首次一车、独立按钮、购买量与草稿、选择/编辑代次、恢复只读、乱序报价、支付/取消与完整购物闭环。最终typecheck/lint通过；MCP发现JSON仅格式调整。
- 5.1部分已完成：HTTP/MCP为真实API/数据库连接；Web/WebMCP为真实浏览器与API；Apps为SDK Host替身加后端APPS工具集成，尚无外部真实Host运行证据，故保留未完成，不冒称真实Host验收。5.4已获Human本地验收确认；远程部署排空未执行。
- 交付状态：当前分支feat/cart-command-state-isolation；已授权规划提交5fa7c6e。Human已验收本地结果并授权提交本轮实施Diff；本提交作为实施Checkpoint，提交后运行Guard。未Push/Merge/远程部署，真实Host缺口未完成，未同步归档正式Spec。按Git Checkpoint Policy，实施高风险交接Guard需提交覆盖当前成果后方可通过。

提交授权前，实施阶段Guard曾实际运行，结果BLOCKED：规划Checkpoint不覆盖实施文件，当前实施Diff尚未提交。此阻塞仅针对实施Checkpoint/后续交接，不代表测试或Review失败；现已获得对应提交授权，将形成Checkpoint并重跑Guard。

### Local acceptance service correction

Human报告旧地址仍全局禁用；运行证据显示3000来自Projects旧工作树（按钮依赖全局busy），3002来自mcp-intent-guidance工作树，并非本Change。Human随后明确授权以新服务替换旧服务。已备份本地store数据库、停止旧3000/3002进程并确认端口释放，仅应用initialization identity增量迁移，再从当前分支启动配套API3002/Web3000；原购物数据保留。localhost:3000浏览器探针拦截写请求后验证A在途只禁A，B仍可点击且立即独立发请求，无探针业务写入。临时3005/3006预览已停止。此为已授权本地服务切换，不代表远程部署或真实Host验收；原有未提交Diff状态不变。
