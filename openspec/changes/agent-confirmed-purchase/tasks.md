# Tasks

状态：Human Approved Planning / 已授权提交并按当前规划验证、实施（2026-10-30）。Human本轮明确“提交代码，并根据当前的规划实施”，随后明确接受Design §4.3的可信Host/浏览器UI隔离边界及§6的短期可转交只读订单权限。此授权替代此前仅修订Spec/暂不实施的执行限制；不代表真实Host证据、购买验收或全部任务已完成，不包含Push/Merge、配置切换或发布。基础MCP真实Host确认及各入口实施前验证条件仍适用。

**分入口实施授权（2026-10-30）：** Human明确“授权这个实施顺序”：先实施Apps/WebMCP及共享交易核心，基础MCP保留真实Host阻塞，未验证路径拒绝购买；不以此缩减三入口最终交付，不修改MCP配置或自动Push/Merge。该授权替代此前分入口需另行批准的待决状态。UI材料真实Host模型隔离、组件接收与Bridge回传已有本Change Tasks证据；正式权限负例、事务及并发随实现验证。

## 1. 分入口交互及确认契约

- [ ] 1.1 按Design §1/§4逐入口验证所需能力：Apps直接导航/Bridge支付承载、WebMCP准备与确认等待/状态工具和页面生命周期、基础MCP原生form完整摘要及回执关联；复用有效只读/导航证据，记录Host/SDK/协议版本和真实观察。基础MCP当前缺口单列，不以其消息/确认接续作为Apps/WebMCP支付依赖；不声称HTTPS/STDIO脚本保证Host可用，不静默外跳或改配置。
- [ ] 1.2 按Design §4.3验证候选分派与权限链路，并取得必要技术批准：目标模式仅路由不授权、Adapter固定用途、Apps随机scope及UI专用材料交付/恢复、基础MCP协议会话丢失不得接管批准；验证Web工具结果与UI材料隔离。收敛三入口受保护确认契约：绑定channel/用途/review/原车/version/hash/epoch/scope/截止、UI材料签发与实际隔离、取消/重放负例及可信Host边界；Apps/WebMCP为UI确认并下单，公开submit拒绝其准备，基础MCP有效原生回执批准后才可Agent提交。不得以visibility/布尔值/模型消息作为鉴权；机制及必要权限变化按范围Review/批准。
- [ ] 1.3 按Design §4.4明确prepare/request_purchase_confirmation/status/submit/cancel_purchase及UI支付/取消contracts、App资源/实体关联、忙碌/草稿/迟到保护及执行所有权；准备消息可选且支付不发送接续消息。按Design §6审查独立order-read能力及fragment兑换候选，明确Human是否接受短期可转交读取权限；验证可信origin/原车截止/跨浏览器/到期体验与跨用途拒绝，保持原七工具发现/schema/输出及create_handoff显式分享兼容。机制验证闭合并按授权checkpoint/Guard后进入相应实施；权限边界批准已取得，未验证内容不勾选。

## 2. 共享准备与受保护UI支付

- [ ] 2.1 PurchaseReview迁移与准备：持久绑定可信channel/scope及完整摘要，专用PG验证同键幂等/换材料冲突、重启/旧键不复活、epoch/期限、空/受阻/完成/到期；准备不扣库存/不改来源/不自动Handoff，不seed或回填批准，明确迁移/回退。
- [ ] 2.2 按获批机制实现Apps/WebMCP确认并下单Adapter与基础MCP原生确认Adapter：UI单次支付请求校验后直接共享事务成单，不留下供Agent消费的UI批准；基础MCP持久批准后才可Agent提交；实现每review唯一确认尝试，短事务登记后释放锁再等Human，重复请求不再弹表单；缺会话只读预览，缺form不发起确认。验证未点/仅消息不批准、材料跨入口/会话/车/用途/旧epoch/篡改/过期拒绝、秘密隔离、取消及断连未知；模型不能代点或搬用UI准备。
- [ ] 2.3 WebMCP准备前无审阅副作用初始化checkout_session并验证Cookie往返，跨导航/刷新/同会话标签/重启保持scope；验证缺Cookie/并发错scope拒绝、工具注销/重新发现、确认页只读恢复不推进epoch、不自动支付、会话丢失不可接管及显式新准备栅栏。Cookie不用于基础MCP/Apps，普通Web/Handoff确认兼容。

## 3. 共享交易与恢复

- [ ] 3.1 复用CartService事务核心承接UI直接支付与基础MCP Agent提交，真实PG验证具体确认/入口隔离、锁后截止、内容变化（含同总额）、足量库存例外、受阻及故障整笔回滚；普通Web/UI/Agent同车最多一单及一次库存扣减，不复制计价/submit，不靠前端互斥保证交易。
- [ ] 3.2 状态与恢复栅栏：实现basic-mcp cancel_purchase只撤销入口、记录归属及会话丢失的只撤销例外；覆盖确认登记后崩溃、回执丢失、已批准取消及取消响应丢失，结果未明不承诺停止；真实并发验证支付/批准/取消/新准备/提交裁决、响应丢失、一次无订单不证明失败、重启/迟到不复活及旧/重复取消不推进新epoch；UI只读恢复，不自动支付、不由Agent补发submit/另建车；明确重试同review且幂等，卸载/超时不冒称撤销。

## 4. 三入口完整旅程

- [ ] 4.1 基础MCP：原七工具+五新增发现、旧schema/输出、查询/编辑→prepare仅pending→独立request_purchase_confirmation→真实Host原生Human确认→Agent核验/提交→会话内原结果；缺能力/会话关联时明确不能购买，不接受模型自述或自动退Apps/外链。正常购买不调用handoff，显式分享保留旧输出/期限；认证、输入与权限负例实际验证。当前Host限制未解除不得勾选。
- [ ] 4.2 WebMCP：充分意图→当前页工具完成必要多步准备→Human网页支付→受保护UI直接下单→原地订单/状态；覆盖确认等待/状态工具、Agent轮次结束/消息不可用仍可支付、未点击零成单、丢响应/刷新只读恢复、无Agent补发/额外继续、当前车/scope/旧句柄/草稿互斥、来源优惠及普通Web兼容。
- [ ] 4.3 Apps：业务资源关联、内嵌直接导航与Agent跨步准备→完整摘要→Human实际支付→Bridge受保护UI直接下单→当前App/结果视图原订单；验证Agent结束/消息不可用不影响支付、支付不发送接续消息、未点击不成单、公开submit拒绝UI准备、重复/拒绝/未知/卸载/多卡片及每await实体/review/代次保护。

## 5. 验证与交付

- [ ] 5.1 执行受影响typecheck/lint/格式、生产构建及旧查询/编辑/普通Web/Handoff兼容回归；真实PG/并发不能用mock替代，按风险复用有效证据，明确skip/环境限制。
- [ ] 5.2 分别真实验收基础MCP原生确认后Agent提交、WebMCP/Apps Human支付后UI直接成单，记录Host/浏览器/SDK/应用版本与实际Human确认及订单/库存；后两者验证Agent不活跃/消息不可用仍完成及原地未知恢复。覆盖伪造、未点、变化、并发/重复/丢响应、断连/卸载/过期、成功后链接权限；不以脚本或另一入口代验基础MCP，不宣称百分之百兼容。
- [ ] 5.3 最终Diff独立Code Review、修复/重验/定向复核，按实际入口交付能力/限制并交Human验收；基础MCP缺口未关闭不标整体完成。Human接受后依授权checkpoint/Guard，严格按Design「规格同步与旧Change收尾」先同步S5非重叠shopping-cart，再同步本Change五份目标规格，核对无旧反向约束；旧S5/S6不重放重叠delta，经Human处置被替代待办后才跳过重复同步归档。历史失败保留，不自动Push/Merge。

## Planning evidence

以下均为按发生顺序保留的历史证据；其中“三入口支付后都等待Agent提交/统一接续”的规划已由本轮UI直接下单决定替代。历史中的授权范围、待决或未实施结论按当时语境读取，当前要求与执行范围以上方Tasks和最新Spec/Design为准。

以下记录保留历史发生事实；其中统一外部Web确认、人工回聊或只覆盖Apps结账按钮的拟议方案已由本轮Human三入口澄清替代，不作为当前设计批准依据。


2026-10-30：Human确认三入口两步购买，并说明Host有电脑操作能力、希望选择更简洁实现。规划据现有CartService.review/submit、CheckoutConfirmation、WebMCP页面生命周期和Apps内存/忙碌机制编写，选择单一商城授权面为待批设计；现有记录只证明签发与会话绑定，不能证明自然人点击。当前仅运行文档/Spec验证，未安装依赖、变更业务代码/DB或执行购买。

全新只读 /root/agent_purchase_plan_review 完成独立Planning Review，发现两项P2：同准备重复读取被误规定使批准失效，以及旧/重复取消可推进新准备epoch。已在hosted-checkout delta、授权delta、Design §5及Tasks3.2定向修订；Reviewer复核确认两项关闭、无新增安全阻塞。按复核建议另澄清取消针对既有review、浏览器取消由Cookie/session鉴权，而独立new prepare不需旧reviewId/epoch。Reviewer仅静态审查，未运行实现测试；选择的确认界面和可信Host残余边界仍待Human批准。OpenSpec strict、格式/本地链接/Diff校验通过，不代表实施、真实Host消息或购买验收通过。

2026-10-30本聊天追加Planning Review发现两项P2：商城批准后缺少唤起已结束当前轮Agent的步骤；WebMCP页面会话未明确跨导航/刷新生命周期。Human要求按建议修订规划、先不实施。现同步Proposal、Design §1.1/§2.1、三份delta及Tasks：首版明确人工返回原对话、先查服务端状态再提交；WebMCP scope复用服务端浏览器Cookie并与页面工具生命周期分离，补齐初始化、跨页恢复、丢会话拒绝/显式新准备及真实三入口往返验收。本轮为定向文档修订与自查，不冒称新增独立复核或运行证据；整体设计/可信Host边界仍待Human批准，所有实施任务保持未勾选。

2026-10-30后续Human纠偏：“不要去复制文本，回到对话再继续，这样操作体验不是那么好。”本轮据此替代上段人工回聊的拟议正常流程，同步六份规划产物为商城明确批准后Agent自动接续、核验/提交/展示结果，无额外继续操作；WebMCP会话绑定与交易不变量保持。自动接续采用当前任务等待还是Host事件恢复尚无真实证据，作为Design §1.1和优先Tasks1.3的明确阻塞，不把文件齐全/协议可选能力当作设计已闭合。候选与探针均未执行，未授权安装/业务实施/新的权限机制，后续先收敛可行方案再作定向Review与Human整体批准。

2026-10-30最新Human明确：基础MCP在会话内由Agent展示全部数据/流程操作，仅下单成功后有外部订单详情链接；WebMCP为所有步骤提供工具；Apps每一步是App页面，点击导航发送提示词，Agent继续调用工具唤起下一App，不直接跳转。已同步本Change六份规划及相关需求记录，统一交易语义、分开确认载体；三入口批准证明、Host真实渲染/接续/资源唤起及订单链接权限仍待设计证据。仅静态文档修订，未执行探针/代码/购买，不新增独立Review记录。

2026-10-30最新Human进一步澄清Apps可以直接跳页，Agent购物应体现便利性，三入口均不应机械逐步要求同样操作；最终必须由Human在结算页点击支付才能购买。本轮以此替代前段“所有跨步必须提示→Agent→下一App、不直接跳页”的限制，允许直接导航与Agent跨步准备并存，支付点击是不可绕过的最终授权，沿现有模拟结账不增加真实金流或额外确认。同步需求、设计、Specs/Tasks及引用；仅改文档，未执行代码/Host探针或购买。

2026-10-30本轮按Human授权先修正工具发现Finding：原七工具保留发现/schema/输出，新增三工具为待实施目标；create_handoff仅在Human明确分享/交接时走独立旧旅程，新正常购买不自动调用，不新增legacy端点或隐藏配置。同步agent-shopping delta、Proposal/Design/Tasks；本轮仅静态修订和无购买副作用Host探针，不实施业务代码。真实探针结果将在下方记录，未因规划修订勾选实施任务。

### 本轮最小Host证据 — 2026-10-30

范围：当前桌面聊天Host的真实MCP/Apps侧栏及同Host内置浏览器；Host构建版本本轮未采集，使用现有ext-apps 1.1.2 / SDK 1.32.2，不安装/重启服务、不迁移、不建车/编辑/交接或购买。探针仅替换ignored dist的只读资源，源码未改；普通商品原件不发布。以下是实际观察，不是全部1.1或Human购买验收通过。

| 验证 | 观察与边界 |
| --- | --- |
| 现有MCP发现/读取 | 当前聊天原七工具可用；本机SDK只读tools/list核对同七工具，服务只声明tools/resources。真实get_product(P001)及search_products(Aero,limit=1)成功；新增三购买工具未实施，不称已发现。原查询结果在展开侧栏显示名称/价格/规格。 |
| Apps握手/直接切页 | 临时无秘密UI探针connected=true；实际通过侧栏自动化点击由页面A切到B，navigationCount=1。仅证明同一App内视图可直接切换，不代表跨资源唤起或真实购买页面已实现。 |
| Apps Bridge读取 | 实际点击后callServerTool(get_product,P001)返回read=ok:P001，无购物车/订单写入。 |
| Apps标准消息与Agent接续 | Host声明message能力；实际点击一次App.sendMessage发送固定HOST_PROBE_20261030_A只读意图，返回message=request-returned、未报isError。上一轮结束后，Host通过untrusted_input(kind=message,source=mcp_app)投递了相同标识，触发本轮Agent接续；按原Human探针授权调用get_product(P001)，ok=true，requestId=73675e92-7ea6-412b-81f5-db8d9917b074。由此补证本次消息实际送达→Agent接续→只读工具成功，不再仅以接口返回推断。只观察到本次在轮次结束后送达，不推断活动轮即时中断/时延保证；不同业务资源的下一App映射及支付提交仍未验证。未重复发送或采用fallback。 |
| WebMCP真实页面 | 内置浏览器打开现有目录，fetchTools发现四工具；调用当次发现的search_products更新URL/页面并返回P001。点击详情后Host撤销旧页面工具，重新fetchTools发现详情五工具，再调用get_product成功。未调用add/update/retry等写工具；未验证新确认/submit，因为尚未实现。 |
| Human支付证明 | 未测试，三个入口均尚无本Change的实现/可信证明契约；不能用本次自动化点击普通按钮代替Human真实支付或证明其授权。 |

恢复核对：get-product-v1.html与search-products-v1.html均从备份逐字恢复、SHA-256一致；再次实际resources/read确认两资源isProbe=false/isOriginal=true。原有未提交源码修改保留。临时脚本、备份和[诊断截图](/private/tmp/agent-purchase-host-probe-20261030/host-probe.png)仅在/private/tmp，不纳入交付/提交；截图不含车/服务凭证。当前已加载的探针只读视图不代表服务仍在返回临时资源。

结论：已修正工具发现/兼容Finding并取得真实基础可行性证据；后续回调补证本次标准Apps消息实际送达→Agent接续→只读工具成功，替代上一轮交付时“尚未观察到接续”的暂时结论。1.1仍只部分完成，全部实施任务保持未勾选；剩余为三入口Human支付证明、不同业务App资源/结果映射、实际支付提交接续与订单链接权限。普通探针消息及自动化按钮不是Human购买授权；不把一次消息成功扩为所有Host/轮次或购买闭环已通过。Human要求快速自主验证，不再要求其反复操作卡片。

### 集中验证补证与实际阻塞 — 2026-10-30

最新Human要求一次性验证、无问题则实施，普通实现细节自主完成。已完成非秘密工具结果隔离实验：原始本机SDK get_product响应rawTransportHasUiMarker=true/rawTransportHasMeta=true；同一真实Host提供给Agent的结果keys=[content,structuredContent,isError]、hasNonsecretUiProbe=false/hasMeta=false。只证明当前Host会从模型结果中剔除_meta，不证明组件已收到或Human已点击；原始持连接凭证客户端可读_meta，不将其宣称为抵抗恶意Host的通道。

临时ignored编译adapter逐字恢复且SHA-256一致；实际MCP复验rawTransportHasUiMarker=false/rawTransportHasMeta=false、查询成功，两个UI资源仍为正式版本。未改业务源码/数据库，不安装或创建订单；不将普通探针标记当成确认秘密/实际授权。

集中阻塞：基础MCP要求会话内Human支付且不能依赖Apps/外部Web，当前每POST新Server/无状态JSON响应架构尚无原生确认回路。Design §4.1已准备具体建议：Host原生form elicitation + 最小会话/确认响应关联改造；官方协议存在不是当前Host实际验证通过。此项涉及确认载体/会话架构，需Human确定后才执行相应真实Host无购买探针和依赖实施。没有把“无问题则实施”的条件虚写成已满足，也未做业务代码或提交/Guard阶段转换；其余已取得的只读/导航/消息证据不重复验证。


2026-10-30方向批准后：Human回复“同意”，接受T-07原生表单及必要MCP会话/传输支持。临时ignored adapter原型保留初始化Server、随机协议sessionId及SSE，并以SDK handler extra.requestId关联原工具请求；脚本化客户端分别验证accept/decline/cancel、未声明form时不发送确认、删除session后旧ID返回404，双会话并发accept/decline响应不串线。首版错误使用request.id，导致独立SSE通道竞态/超时，定位后修正为extra.requestId并完整重验通过；这些只是协议测试，不是实际Host/Human确认通过。实际Host只读探针返回FORM_NOT_NEGOTIATED、hasInitializedClient=false：说明当前旧连接未重新初始化，不能推断Host不支持form；已集中请求一次Host连接重连，其余操作由Agent完成。未建车、写批准、扣库存或成单，任务1.1仍不完整。

实际Host重连补证：Human回复“已重连”后，真实初始化日志显示client=codex-mcp-client / title=Codex / version=0.166.0-alpha.5.1，capabilities.elicitation包含form={}与url={}。但本聊天实际get_product只读探针仍返回FORM_NOT_NEGOTIATED、hasInitializedClient=false；后续脱敏路由观察显示POST tools/call及resources/read未携带Mcp-Session-Id，MCP-Protocol-Version=2025-06-18、User-Agent与上述客户端版本一致。只能断定当前聊天工具请求没有关联到新初始化会话，无法区分旧连接复用或Host会话头转发问题，不能直接归因为Host不支持form。没有实际弹出/接受Human原生确认，也未把脚本测试或能力声明当成真实UI通过。为避免反复打断Human，不再请求重复重连；依赖真实Host确认的1.1及后续业务实施保持阻塞，T-07方向批准有效，无需重批。

探针收尾：ignored dist adapter已从/private/tmp/agent-native-form-probe-20261030/adapter-original.js逐字恢复，SHA-256与原备份一致；临时会话/哨兵商品处理及诊断日志均移除。源码未实施探针、原有源码Diff保留；没有建车、批准、扣库存或订单写入。临时脚本仅留/private/tmp，不纳入交付；无新增提交。

最新重试与候选结论：本轮实际HTTP探针仍缺协议session关联；官方proxy控制socket不存在，桌面进程使用stdio/default，没有成功Host重连，不虚写重连通过。调查本地STDIO薄Adapter替代方向并完成隔离脚本accept/decline/cancel/缺能力测试，全部通过；未改连接配置、未接入真实Host UI、未替代原七工具、未实施业务代码。候选比较和约束集中于Design §4.2，不将其作为新的Accepted决策或实施完成。临时HTTP编译探针已按原备份哈希恢复；本轮没有新增提交。

2026-10-30最新Human明确：“MCP Apps和WebMCP就改为点击支付后直接下单，不再依赖Agent接续”，要求修订Spec、写清基础MCP确认方案/限制且暂不实施代码。本轮据此统一Proposal、Design、三份delta与Tasks：UI直接确认并下单、原地结果与未知只读恢复；基础MCP保留T-07、Host未通过时禁止新购买，HTTPS无自动修复保证，STDIO仅脚本证据。准备消息仍可选，支付后不再需要消息/Agent提交；公开submit不能消费UI准备。需求/决策同步限定覆盖该调整，历史批准/探针原样保留，未执行新的Host探针/安装/源码/DB/购买，所有任务未勾选。

本轮静态验证：agent-confirmed-purchase及受指针修订影响的S5/S6均通过openspec strict；修改文档格式、git diff --check及11份相关文档的176条本地文件链接检查通过。执行者为本聊天Agent聚焦一致性自查，不冒称新增独立Review或购买验收；14项实施任务仍未勾选。两份原有源码/测试Diff保持既有CSP变更，非本轮新增；未形成阶段实施转换/Guard或新增提交，当前仅交付可审阅文档Diff。


2026-10-30 Planning Review修订：Human要求按Review建议修复。本轮新增完整mcp-app-shopping/webmcp-shopping目标规格，承接未同步的S5/S6能力并保留未改场景；Design集中列明Requirement替代、唯一同步所有权及旧Change收尾顺序，禁止旧delta重新覆盖新支付流程。补充入口路由不等于权限、各scope/材料签发与恢复的候选链路，以及独立order-read权限候选；均未升级为Accepted技术决定。真实Host确认、UI材料交付/隔离、可转交结果权限接受仍未关闭，不把文档修复勾作实施或验收。本轮无代码/配置/DB/购买操作、无提交，定向校验结果留当前对话。


2026-10-30 第二轮Planning Review修订：按Human“按review建议修复”授权，将基础MCP prepare限定为零表单pending（无协议会话仅报价预览），独立request_purchase_confirmation负责每review一次原生确认请求；补充cancel_purchase只撤销入口、会话丢失的限定撤销权限及批准/提交/新准备竞争规则。当前工具目标由原七+三新增改为原七+五新增，历史三工具目标记录保留当时范围。Proposal/Design/两份受影响Spec及Tasks同步，未修改业务代码或配置、未执行购买，所有实施任务未勾选。候选机制及Host证据仍待验证/批准，本次文档修订不代表新增技术方案已验收。


### 实施授权与前置验证 — 2026-10-30

Human本轮明确提交并按当前规划实施，随后明确接受Design §4.3可信Host/浏览器隔离边界及§6短期可转交只读订单权限；正式授权来源已写入D-01与本Change状态。既有CSP修改及S6历史证据提交为97702f2，规划与批准提交为8134791；随后新建codex/agent-confirmed-purchase，隔离后续购买审查单元，无Push/Merge。

Task 1.1/1.2前置验证取得部分新增证据：基础MCP复用无购买原生form探针，本聊天真实get_product仍返回FORM_NOT_NEGOTIATED、hasInitializedClient=false，未出现原生确认、未写批准。Apps采用无车/无购买权限随机标记，经工具结果_meta交付；模型结果keys仅content/structuredContent/isError，hasMeta=false且无标记。Human展开侧栏后，真实组件connected=true、received=true；Agent点击明确的“验证只读回传”按钮，Bridge调用独立探针分支后显示accepted。证明当前Host的模型结果隔离、组件接收及Bridge回传链路；不证明自然人点击、正式签名/跨scope/epoch/取消重放拒绝或购买事务已实现。无消息发送、建车、交接、购买、库存写入或配置切换。

两个实验的ignored编译Adapter及get-product资源均逐字恢复，并分别核对原备份SHA-256；临时脚本仅在/private/tmp/purchase-implementation-preflight，不纳入产品。基础MCP真实Host门槛仍未通过，未把Task 1或其他实现任务勾选。Guard曾以pending验证/Review拒绝阶段转换；首次目录级path另被判为无精确提交路径，后续改用具体文件参数核对，不将参数问题当作业务阻塞。未取得新的独立Review，不冒称已进入完成验证的购买实现。

恢复后本机MCP资源/认证及原查询回归4/4通过；API typecheck/lint、三个Change strict及git diff --check通过。18份变更Markdown的204条本地文件链接通过（检查器剥离URL query后核对，不把wireframe查询参数误作文件名）。权限批准已闭合，仍须先解决基础MCP真实Host确认或由Human明确调整分入口实施顺序。
