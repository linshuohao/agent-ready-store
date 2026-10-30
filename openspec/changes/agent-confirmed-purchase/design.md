# Design

状态：Human Approved Planning / 已授权提交并按当前规划验证、实施（2026-10-30）。Human本轮明确“提交代码，并根据当前的规划实施”，随后明确接受Design §4.3的可信Host/浏览器UI隔离边界及§6的短期可转交只读订单权限。此授权替代此前仅修订Spec/暂不实施的执行限制；不代表真实Host证据、购买验收或全部任务已完成，不包含Push/Merge、配置切换或发布。基础MCP真实Host确认及各入口实施前验证条件仍适用。

**分入口实施授权（2026-10-30）：** Human明确“授权这个实施顺序”：先实施Apps/WebMCP及共享交易核心，基础MCP保留真实Host阻塞，未验证路径拒绝购买；不以此缩减三入口最终交付，不修改MCP配置或自动Push/Merge。该授权替代此前分入口需另行批准的待决状态。UI材料真实Host模型隔离、组件接收与Bridge回传已有本Change Tasks证据；正式权限负例、事务及并发随实现验证。

## Context

依据[最新D-01](../../../DECISIONS.md#d01-direct-payment-20261030)及Proposal。既有CartService.review/submit已提供浏览器绑定确认、checkoutEpoch、报价重验与订单/库存事务；复用其能力，不复制业务核心。Apps卡片展示/直接切页/Bridge只读调用和准备消息接续已有部分Host证据；真实购买尚无实现。基础MCP form能力声明与后续工具会话关联尚未接通，相关实验保留于§4.1/§4.2。

## Goals / Non-Goals

**Goals:** Agent便利准备，Human最终点击，后端按具体确认重验并至多成一单。Apps/WebMCP在支付请求中直接完成购买并原地显示结果；基础MCP保留原生确认后Agent提交的独立路径。共享交易规则，不强求三入口具有同一执行者或确认载体。

**Non-Goals:** 不新增真实金流、第二次确认或额外继续操作；不在Apps/WebMCP支付后引入Agent唤醒、消息投递或模型轮询的成单依赖。基础MCP不退回外部Checkout/Apps；不自动换传输或改Host配置、不承诺任意Host兼容。不声称匿名通道可独立识别自然人或防御恶意已授权Host。普通Web/Handoff历史批准及验收保留。

## Decisions

### 1. 三入口交互及提交所有权

| 入口 | 准备与确认 | 谁提交及展示结果 | 限制 |
| --- | --- | --- | --- |
| 基础MCP | Agent准备完整摘要，Host原生form收集Human具体确认 | 服务端核验原生回执后，Agent查询并提交；结果留会话 | 仅经真实验证的Host可购买；当前会话关联受阻 |
| WebMCP | Agent用当前页工具完成准备，Human在网页点击支付 | 网页受保护支付请求直接调用后端，网页原地显示订单/状态 | 工具覆盖准备、确认等待/承接和状态；模型不能批准或调用UI支付写入 |
| MCP Apps | Agent跨步准备或Human直接导航，Human在结算App点击支付 | App经受保护Bridge直接调用后端，当前App/结果视图显示订单/状态 | 消息/Agent后续回复不参与支付成功判定；仍需Host的UI/Bridge支持 |

Apps/WebMCP支付后不进入“已授权，等待Agent提交”的正常稳定状态。基础MCP仍有持久approved→Agent提交阶段；其兼容阻塞单独记录，不再当作后两者必须解决的Agent接续条件。本轮按当前完整规划推进；若因基础MCP阻塞改为分入口先行实施，仍须明确范围授权，不自动缩减为Apps/WebMCP交付。三入口最终交付不能互相抵扣，基础MCP的真实Host门槛保持。

### 2. 便利准备、直接支付与页面恢复

Agent按Human充分明确的需求/数量/预算执行查询、比较、建车/编辑与准备，可直接呈现最终摘要，不强制逐页面/工具确认。Apps内普通浏览/页内编辑可直接导航与Bridge读取；只有确需Agent处理的准备动作才发送无秘密意图。消息只含非秘密实体标识和准备意图，不能凭ID补权；消息拒绝/未知不重发、不声称撤回。所有异步路径校验实体/review/页面代次及busy、草稿/刷新状态，旧卡片结果不覆盖新车。

Apps/WebMCP一次Human支付点击触发一个受保护的“确认并下单”请求：校验原车能力、入口/scope、确认材料用途、review/version/hash/epoch/截止与完整最终摘要，在同车锁和共享订单事务内登记具体确认并执行提交。两者必须作为一次受保护购买操作被裁决，不能让已批准UI准备等待模型另发submit。实现细节可复用原submit事务或提取内部核心，但不得经公开Agent工具绕转。批准校验失败、报价变化或事务故障不能显示成功；失败不能留下可由Agent消费的UI批准。

点击后UI显示处理中，并在实际completed后更新当前App/网页；无需Agent活跃、发送消息或再点继续。可选Agent解读只读取结果，不承担下单或恢复。网络丢响应/卸载/重启后，以原能力只读恢复同review/原订单；未知不自动重送支付，不以一次“无订单”视为失败。明确重试仍使用同review/原操作身份并幂等，不另建车；不以刷新/重新挂载隐式重试。

### 3. 准备记录与WebMCP会话生命周期

新增最小PurchaseReview：reviewId、cartId、prepareRequestId、channel（basic-mcp/webmcp/apps）、actorScope、cartVersion、purchaseHash、checkoutEpoch、完整PurchaseSummary、expiresAt、approvalState(pending/approved/cancelled)、approvedAt。入口由对应Adapter校验后固定绑定；模型可以请求目标展示模式，但不能把该请求当作可信身份或购买授权，具体分派见§4.3。基础MCP可持久approved等待提交；Apps/WebMCP确认及订单写入同一共享购买事务裁决，approved不作为对模型开放的待提交能力。

(scope,prepareRequestId)唯一；同键同原材料重试返回原记录及当前状态，不续期、不复活旧准备；同键换车/材料明确冲突。新准备在Cart锁下推进epoch，先判断是否已成交。空/受阻/到期车不发可购买准备；准备不扣库存、不改来源、不预留、不自动签Handoff。截止沿既有Cart访问截止，无新5分钟期限；后续独立Handoff不延长已签准备。

WebMCP准备前无审阅副作用地建立checkout_session HttpOnly Cookie并完成往返，已有Cookie不轮换；不调用普通review初始化。scope跨同源导航/刷新/同会话标签及工具重新注册保持，服务重启凭Cookie及DB事实验证，不以页面代次当身份。非秘密reviewId只定位准备，确认页挂载只读恢复，不自动prepare/review/支付。Cookie缺失、并发覆盖错scope明确拒绝，不静默迁移或自动重发。

丢失Cookie后不接管旧准备，即使仍有车能力；只能在有效原车能力下显式新准备并重新确认，按Cart锁/epoch隔断旧提交；丢Cookie不代表旧请求失败。页面工具注销并在新页重新发现，每await核对当前车及代次；工具只作用当前有效车，不接收任意Token/session/价格。Cookie不用于基础MCP/Apps；后两者单独收敛可信scope。

### 4. 确认边界与基础MCP限制

三入口都须服务端核验确认用途、review、原车、入口、scope、版本、购买语义、epoch及截止；Cart访问能力、服务Token、模型文字、userApproved布尔值、工具visibility或普通消息不能代替确认。Agent不得代点支付。现有匿名保证依赖授权Host/浏览器不伪造Human动作，不把通道材料称为自然人证明。

- **Apps/WebMCP：** 使用各自受保护UI支付Adapter，仅Human点击才调用确认并下单；模型侧准备/状态接口不返回批准材料，公开submit_order拒绝UI入口准备。WebMCP复用浏览器会话、同源/CSRF和用途隔离材料；Apps候选以可信Host的模型/UI隔离及UI专用材料保护Bridge写入。visibility只是发现提示，不是鉴权；材料签发、实际交付/隔离和重放负例仍需设计验证。支付入口不能只接一个布尔值，也不能让模型改报basic-mcp重用UI准备。取消独立校验原review归属与epoch，不调用支付。
- **基础MCP：** T-07方向保持：Host原生form展示服务端完整摘要并收集最终Human确认，原生accept及必要明确确认值由服务端匹配原请求/原review后才批准，Agent随后查询/提交；模型不获得批准工具。拒绝/取消/缺能力或未取得有效回执均不新增批准；回执结果未知先只读核实，断连不等同撤销已写入批准。
- **Host不足时：** 仍可在原有权限下查询、编辑及取得结算报价预览；缺协议会话不创建可确认review，缺form能力不发确认请求，新购买禁止，明确显示“当前Host确认能力/会话关联未验证，尚未完成购买”；不凭普通聊天“同意”放行，不自动新车/外跳/改用Apps/复制回聊。其他入口成功不使基础MCP验收通过。
- **传输与证据：** HTTPS能影响安全传输/安全上下文，但不是会话关联或原生UI支持的保证，目前没有证据证明换HTTPS可修复。STDIO只通过脚本协议检查，不能写成桌面Host已可购买或静默取代HTTP远程接入；任何正式配置切换需明确范围。保留当前不支持/未知状态，不承诺百分之百兼容。

#### 4.1 本轮验证结果及需Human确定的基础MCP确认架构

以下保留先前实验与批准发生事实；本轮最新授权仅修订Spec、不实施代码。本次隔离实验仅在ignored编译产物为get_product增加无秘密_meta标记；原始SDK客户端读取到标记，而当前Host提供给Agent的结果只有content/structuredContent/isError、不含_meta。实验后按备份哈希恢复编译产物，实际原始查询确认标记已移除，未改业务源码/订单/库存。

此结果支持Host对模型与组件的数据分离，与[OpenAI工具结果说明](https://developers.openai.com/plugins/reference#tool-results)一致；尚未实测标记在卡片端的交付，更不构成Human点击证明。原始服务客户端可读取_meta，因此候选Apps确认材料必须明确以可信Host负责模型/UI隔离为前提，绑定准备/车/内容/epoch/期限并经专用校验；不能宣称抵抗持原车能力及连接凭证的恶意Host。现有Approved匿名Web边界本已接受同Token持有者可模拟确认，见Technical Design §8；本轮不擅自把这一残余信任扩大或解释为已批准新确认方案。

基础MCP已批准改造所针对的现状：当前adapter每个HTTP POST新建Server、使用stateless transport及enableJsonResponse=true，初始化时的clientCapabilities不能被后续工具Server实例复用，也未保留原生Human确认请求/响应上下文。普通工具结果只有数据，不能由服务端独立渲染可信购买按钮。Apps元数据隔离不能用来冒充“无Apps”的基础MCP最终确认。

**已获Human方向批准的方案（T-07，2026-10-30）：** 基础MCP采用Host原生form elicitation承载完整结算摘要与Human明确支付确认，不使用外部页面或Apps；为此改造现有MCP传输以保存能力协商和确认请求/响应关联（会话/SSE等具体最小实现须经隔离验证）。[官方App Server文档](https://learn.chatgpt.com/docs/app-server#mcp-server-elicitation-requests)有该交互协议，但不证明当前实际连接已支持，不能只凭文档勾选真实Host验收。引入原生确认不授予模型批准工具，拒绝/取消/断连不批准；会话只持协议上下文，Cart期限和数据库授权/订单事实不由它延长或替代。

Human已在本聊天回复“同意”，接受上述原生表单及必要会话/传输支持方向，见[T-07](../../../docs/engineering/ENGINEERING_DECISIONS.md#t-07--基础mcp原生确认与协议会话)；不能为满足有条件实施而自行将Apps卡片当成基础MCP、退回外部Checkout或只信模型的“已确认”。按该方向先做无购买副作用的原生确认探针，核对当前Host能否显示完整摘要并送回接受/拒绝/取消及上下文，再收敛schema/会话恢复、完成Review/checkpoint后进入正式业务实施。不再重复请求本方向批准；实际Host尚未通过时仍不得宣称集中验证全部通过。

实际Host补证（2026-10-30）：重连时Codex客户端0.166.0-alpha.5.1已声明form/url elicitation；但本聊天随后的tools/call与resources/read均未携带Mcp-Session-Id（协议头2025-06-18），未关联到新初始化的Server，原生确认探针因此明确拒绝发起。脚本客户端的会话/SSE、accept/decline/cancel、缺能力及并发响应隔离通过，不能代替实际Host表单验收。当前无法区分旧连接复用与Host会话转发问题；保留T-07批准、不重复要求Human重连，不改用外部页面/Apps或按服务Token猜测确认会话。临时编译探针已按备份哈希恢复，未改业务源码/数据库。真实Host确认仍为基础MCP购买能力的阻塞，不再作为Apps/WebMCP支付后下单的Agent接续依赖。

#### 4.2 重试与替代传输候选（非方案批准）

Human随后要求再连/再试，失败则调查其他方案。本轮重新安装无购买HTTP探针并实际调用，仍观察到tools/call缺少Mcp-Session-Id、FORM_NOT_NEGOTIATED。尝试官方Codex app-server proxy控制入口，默认control socket不存在；只读进程检查显示当前桌面app-server使用stdio/default，未发现可连接控制监听。因此没有成功执行Host重载，不把“工具重试”写成“已重连”，也不结束/重启整个桌面进程或修改全局MCP配置。原编译adapter已按备份哈希恢复，正常读取复验见Tasks。

候选本地STDIO确认Adapter：Host启动一个随连接存续的薄MCP进程，能力协商、工具调用及原生form回执使用同一连接，避开HTTP session头；商品/购物车/授权及交易仍复用现有API/DB，不复制订单服务、不把内存协议上下文当批准事实、不开放模型自批接口。仍需原生Human确认，不能以模型消息或request_user_input的自然语言回答替代服务端回执。该候选不需要额外依赖；官方Codex文档列出STDIO及HTTP两种传输，但不据此认定实际桌面UI通过。

本轮以现有SDK1.32.2在/private/tmp隔离STDIO server/client：固定零金额测试摘要、无业务服务依赖，accept/decline/cancel正确关联回执，缺form能力不发确认；全部通过。明确为脚本协议验证，不是实际Host支付确认。生产化候选须转发现有工具与共享用例，不能用只含探针工具的临时进程替换商店连接；不得静默把原HTTP远程能力改为仅本地STDIO，正式切换/增设连接前明确配置影响及授权。

当前比较：保留HTTP并取得真正新的线程级连接可继续验证已批准T-07，但本轮没有自动重载入口；STDIO是可验证的本地替代传输方向，尚缺桌面接入/原生UI证据；统一改用Apps虽有已验证的内嵌交互基础，却违反基础MCP不依赖Apps的当前要求，除非Human明确修改该要求，否则不采用。外部Checkout、复制回聊、服务Token/模型布尔值自授批准均不作为替代方案。

#### 4.3 确认材料与入口分派候选（待机制验证与技术批准）

本节补全可验证的候选链路，不将本轮文档修订授权视为新增权限机制获批。仅有同一MCP连接及工具名，服务端不能推断调用来自模型还是卡片；不以Host声明Apps能力、visibility或模型自报channel作为鉴权。

| 入口 | 准备、scope与确认链路 | 恢复及拒绝边界 |
| --- | --- | --- |
| 基础MCP | prepare_checkout选择basic-mcp目标后，Adapter固定该用途，要求已协商的协议会话；actorScope绑定服务身份和该会话随机标识，关联原工具请求与review。prepare_checkout只返回pending摘要；独立request_purchase_confirmation在同scope请求原生form，服务端仅接受关联回执；批准持久化后才允许同scope的submit_order。缺少协议会话时只返回无reviewId的报价预览，详见§4.4。 | 状态/订单仍须原车权限；新会话不能接管旧批准。协议会话丢失后可读取原订单，未成交若要继续购买，只能显式新准备并重新确认，Cart锁/epoch使旧回执及提交失效；若要停止，则可走§4.4只撤销例外，不接管旧批准。不按同服务Token猜测旧会话；重启不清除DB批准事实但不能凭该事实补回协议权限。 |
| Apps | prepare_checkout允许选择apps展示目标，只创建pending及服务端随机actorScope，不发原生确认。Adapter将绑定review/cart/version/hash/epoch/scope/截止、用途为apps-pay的签名材料仅放在工具结果UI专用_meta；公开content/structuredContent仅含摘要、reviewId及状态。可信Host负责把_meta交给组件而不交模型；Human点击后组件从内存取材料经专用Bridge支付处理器调用共享事务。 | 模型即便选择apps也拿不到支付材料；选择basic-mcp则必须另走真实原生确认，不能转换已有review。重挂载由Host重新投递原结果，或在有效原车能力与原prepareRequestId下恢复同review的UI材料，不能推进epoch/续期；状态工具不签发支付材料。无法交付原scope材料时只读或提示显式新准备，不按公开ID补权。 |
| WebMCP | 页面专用准备Adapter固定webmcp用途并由已往返验证的checkout_session派生scope；工具只返回摘要/reviewId。确认页以原车Cookie+同scope通过同源受保护接口读取用途为webmcp-pay的材料，保留于支付控制器内存，Human点击才调用UI支付接口。 | 材料不进入页面工具输出、DOM属性、URL或持久缓存；恢复读取不产生批准、不推进epoch。错Cookie/用途/入口拒绝；普通Web确认材料不能用于此接口。此保证沿可信浏览器边界，不宣称能阻止获授权的电脑操作代理或恶意同源脚本模拟点击。 |

Apps的随机actorScope只在首次准备时生成并持久化；为使首次响应丢失也可幂等恢复，准备入口另以已认证服务身份、固定apps用途及prepareRequestId定位原记录，并核验原车能力及原请求材料。同键换车/材料拒绝，命中后取回原scope，不先生成新scope再查询。这个查找命名空间沿现有单服务身份共享边界，不能声称隔离不同Host/顾客；签名材料仍仅经可信Host的UI专用结果交付。WebMCP及基础MCP已有scope内的(scope,prepareRequestId)唯一性保持。

prepare_checkout的目标选择仅为路由参数；不允许客户端提供actorScope、已批准状态或任意channel覆写持久记录。Apps支付处理器可使用app-only发现提示，但必须验证签名材料及原车能力，不能仅信工具名或visibility。UI取消使用独立cancel用途材料（或同scope受保护取消接口），支付材料不能作为跨用途凭证；重复取消不推进新epoch。材料重签只能保留原review、scope和截止，失效/取消/成交的准备不再获得可支付材料。

不新增自然人身份系统，也不声称能抵抗持服务凭证的恶意Host：原始MCP客户端可读_meta，Web同源运行环境可模拟请求。必须由Human接受该明确的可信Host/浏览器边界后才实施。禁止Agent代点属于使用边界，签名证明服务端签发的具体用途与内容，不证明操作者是自然人。

**进入实施前的最小证据：** Apps同时观察模型侧无材料、真实组件收到材料、Bridge向独立处理器正确传递；对缺材料、伪造目标/用途、跨车/scope/epoch、取消后重放分别拒绝；重挂载恢复不创建新准备。WebMCP核对工具输出与页面UI材料分离、Cookie往返、跨页/丢Cookie及CSRF负例。基础MCP须实际原生表单完整摘要和接受/拒绝/取消往返；当前仅脚本通过仍为阻塞。可用无购买副作用探针验证交付/隔离，但真实订单/库存验收留实施后；本轮不运行探针或修改配置。

#### 4.4 基础MCP调用边界、一次确认请求与撤销（规划修订，待验证）

原七工具保持兼容，新增工具目标为prepare_checkout、request_purchase_confirmation、get_purchase_status、submit_order、cancel_purchase。多一次工具往返用于区分准备和请求确认，不增加Human购买点击；请求确认不是批准工具，取消只减权限。以下限定basic-mcp，Apps/WebMCP仍由既有规划的受保护UI直接支付/取消。

1. **准备：** prepare_checkout只生成pending摘要并返回reviewId，不弹表单、不批准、不成单。有已协商协议会话时绑定其scope；缺form能力可保留pending并明确confirmationAvailable=false。缺协议会话时只读取当前车与报价，返回confirmationAvailable=false和原因，不签发reviewId、不创建PurchaseReview、不推进epoch、不回退为服务Token共享的批准scope。能力恢复后必须显式新准备，不能升级旧报价预览。准备同键重试只返回原记录及当前状态，不重签期限、不触发确认。
2. **请求确认：** request_purchase_confirmation接收原车能力及reviewId，不接收userApproved、确认回执或自报scope。仅在已实测支持的Host、同协议scope及有效pending review下请求一次原生表单；完整摘要来自服务端，Human一次明确确认足够。用短事务锁定原车并记录该review唯一确认尝试（服务端attemptId、原scope及请求关联）；事务结束后才发送表单，不持数据库锁等待Human。没有原生确认能力时拒绝且不登记已发送尝试。
3. **回执与返回：** Host回执关联attemptId/协议请求/原review；接受且明确确认时，在Cart锁下重验review、scope、epoch、截止及购买内容后持久化approved。拒绝/取消则将该review取消并栅栏迟到回执；不产生批准。工具返回实际pending/approved/cancelled/stale/expired/blocked/completed及确认尝试状态；只有有效approved可由Agent调用submit_order，状态查询始终只读。
4. **重试与断连：** 每个review最多登记一次确认尝试；并发/重复request_purchase_confirmation只读返回现有状态，不重新弹表单。已登记但尚未发送即崩溃、发送超时、回执丢失均保守视为尝试未知，不能凭pending重发。原尝试回执若随后到达，仍按当前栅栏裁决；要再次显示表单须Human明确要求重新确认，显式新准备产生新review并隔断旧尝试，不自动新prepare。基础MCP提交丢响应仍按原未知恢复规则，不自动重送。
5. **撤销入口：** Human要求停止时，Agent可调用cancel_purchase(cartId, cartAccessToken, reviewId)。服务端要求有效服务认证、有效原车能力，且记录属于该服务身份/车及basic-mcp入口；拒绝UI review、他车/他服务记录及任意scope/epoch覆写。该工具不要求已批准、不要求再弹确认，也不提供退款。它是只撤销的权限例外：协议会话丢失后仍允许同服务身份与原车能力撤销指定旧review，但不能据此读取UI秘密、批准、提交或接管原scope。此例外沿单服务身份共享信任边界，须随候选权限方案验证/批准。
6. **撤销裁决：** 同车锁下先判断已成交；已成交返回原订单及too_late，不声称取消订单。未成交且目标review仍为当前pending/approved时，持久化cancelled并仅一次推进epoch，旧确认回执与提交均失效；旧review或重复取消仅返回其失效/取消状态，不推进新epoch，不撤销新准备。返回cancelled或确认目标已失效后，才可说明“该次准备不会再购买”，不能泛化到其他新准备。取消响应丢失先查询；明确重试同review可安全幂等，不新建车/准备。车权限已到期则拒绝，不能谎称取消成功；锁后截止仍禁止新成单。

最小持久补充为review的服务身份归属及唯一确认尝试/状态；不建立通用工作流或消息队列。请求状态unknown不等于approvalState，二者分别返回；重启后保留尝试事实，不能重新弹窗。撤销完成前不要承诺阻止已在途提交，最终由同车锁先后决定。验证覆盖准备零表单、请求并发只一表单、登记后崩溃、延迟回执、已批准取消、会话丢失取消、取消与批准/提交/新准备竞争及取消响应丢失恢复。

### 5. 共享交易、执行隔离与未知恢复

两类提交都复用CartService交易核心：基础MCP的Agent提交要求有效basic-mcp批准；Apps/WebMCP要求各自UI具体确认材料、匹配入口/scope，并在受保护支付操作内直接成单。公开submit_order不得消费Apps/WebMCP准备，即便模型观察到approved；UI支付也不能搬用普通Web或基础MCP材料。

Cart及排序库存锁后再次检查截止、version/hash/epoch、商品有效性、数量和金额，复用原子Order/库存扣减及同车唯一订单；同车普通Web、UI支付和Agent竞争最多一单。商品、数量、单价、优惠、运费或总额任一变化（即使同总额）都须新摘要及新确认，仅足量库存变化例外保持。事务故障整笔回滚，不复制计价/submit逻辑。

状态区分pending、基础MCP的approved、stale/expired/cancelled/blocked、completed；客户端还须明确表达请求结果未知，不能从一次无Order读取推断旧写入失败。重复支付点击、迟到消息、基本MCP重复接续及其他入口调用都不触发第二次首次购买；completed返回受保护原订单。UI恢复不交给Agent补发submit；Agent可读状态，但不代替Human支付重试。

取消既有review、新准备及提交在Cart锁下裁决。取消先成功则旧支付/批准/提交均失效；成单先成功则返回原订单，不承诺撤销/退款。旧或重复取消不推进新epoch、不撤销新准备；超时/卸载不等于已取消，声明不会再购买须有服务端栅栏裁决。取消不需要第二次购买确认，不是补权入口。

### 6. 成功后的外部订单详情

三入口先在原载体显示受保护OrderResult，实际completed后才可提供固定可信origin的只读详情链接，不自动打开。pending、基础MCP approved、未知或失败均不提供外部Checkout/占位订单链接。不暴露可编辑车Token或服务Token，不凭公开ID补权，不新增公开/永久访问。

只读链接候选（待权限Review/批准）：仅在有效车权限下取得已成交Order后签发独立order-read能力，绑定orderId、固定audience及该车当前既有访问截止；不能编辑车、准备、支付或签发Handoff，重复签发不续期。链接固定商城origin及订单路径，秘密仅在fragment；浏览器先清除fragment，再同源POST兑换仅限该订单的HttpOnly读取Cookie。复用现有签名/期限与fragment兑换模式，不复用可编辑车Token，不新建公开/永久结果访问。

该候选是可转交的短期只读bearer能力，跨浏览器持链接者均可在截止前读取指定订单，不能宣称只限原自然人。到期/缺权限统一显示无法访问，不凭orderId补权；页面无车编辑/支付入口，不加载会泄露链接的第三方资源。接口先验证能力，再读取指定订单；无订单不签发占位链接。实际首次访问/重复兑换不续期，到期后长期恢复仍属P-04，未在本Change解决。

需验证跨订单/用途/签名篡改、到期、跨浏览器有效读取、URL清理及日志无秘密；可转交读取权限须Human明确接受后才能实施。若未批准则不提供候选链接，不能把外链验收记通过或静默取消目标。当前HTTP外链失败仍保留，可信origin及可导航环境另验；本轮不部署HTTPS、不改系统信任。

## Risks / Trade-offs

- [执行者分流] → 保留Human决定与共享交易不变量；以服务端入口绑定隔离UI直接支付和基础MCP Agent提交，避免模型搬用批准。
- [真实Host限制] → 基础MCP受§4兼容条件约束；Apps仍依赖UI/Bridge，只移除支付后的消息/Agent依赖，不承诺全Host可用。
- [未知与并发] → 只读恢复、同车锁/唯一订单、旧取消栅栏及明确幂等重试；不以busy/页面关闭代替事务裁决。
- [兼容] → 保留原七工具schema/输出；create_handoff只在Human明确分享/交接时使用；无legacy端点或隐藏开关。新购买无外部Checkout，不影响独立旧交接旅程。
- [权限未闭合] → UI材料实际隔离及成功后链接访问尚须验证，不以方向批准替代完成。

## Migration Plan

本轮实施授权已取得；相应范围机制验证、Review及checkpoint齐备后执行：PurchaseReview不回填/seed批准，不改既有订单库存事实；专用PG验证普通Web/Handoff及三入口并发。回退关闭新增准备/UI支付/Agent提交，保留订单/去重事实并栅栏撤销未完成授权；不恢复旧批准、不反向回滚已成交库存。验收按入口记录，基础MCP未通过时保持缺口，不能将本Change整体标记完成。按授权办理checkpoint/Guard、同步/归档，历史S5/S6证据保留。

### 规格同步与旧Change收尾

当前正式specs尚无webmcp-shopping/mcp-app-shopping，因此本Change新增两份完整ADDED目标规格，保留旧能力的未改要求，唯一负责它们的正式同步；旧S5/S6 Spec继续记录原批准范围，不再作为这两项的最终同步输入。

| 原要求/产物 | 本Change替代或保留范围 |
| --- | --- |
| S6「可选 Apps 资源与基础 MCP 兼容」 | 保留原七工具及静态资源隔离；替代“无新增购买工具”为新增分入口准备/购买能力。 |
| S6「Bridge 权限与秘密边界」 | 保留车权限、内存与秘密边界；补入受保护UI支付/取消，仍不直连网站API。 |
| S6「外部 Checkout 与 Human 确认」 | 由「内嵌支付与独立分享」替代正常购买；显式分享保持，外链失败不改写为通过。 |
| S6「独立真实 Host 与人工验收」 | 最终验收改为真实内嵌支付；旧外链未通过保留为历史缺口及显式分享的相关限制。 |
| S5「页面工具与独立验收」 | 补准备/等待/状态工具与UI直接下单，Agent模式只读恢复原review。 |
| S5其余WebMCP要求、S6展示/编辑要求 | 完整承接；新增WebMCP准备会话要求，其余未改场景不丢失。 |
| S5 shopping-cart delta | 仍由S5拥有，不能随两份能力替代而跳过；与本Change hosted-checkout/授权约束联合核对。 |

收尾顺序（仅后续获验收/同步/归档授权后执行）：先核对并同步S5的shopping-cart差异，再由本Change同步上述两份完整能力及其余三份delta；检查正式Spec不存在旧正常外部Checkout、“无新增购买工具”等反向约束。S5/S6旧重叠delta不得随后自动重放。若执行前发现两项能力已被其他工作同步，先根据实际基线把本Change改为准确MODIFIED/REMOVED差异并重新校验，不能盲目ADDED或覆盖他人更新。

归档S5/S6之前须分别记录Human对保留功能的验收及对被替代待办的处置：可记录“由本Change替代”，不可勾作原外链成功。确认其非重叠差异已同步、重叠部分已由新规格覆盖，再按当时CLI支持的跳过规格同步方式归档旧Change；本Change同样在完整同步及Human验收后归档。当前不执行同步/归档、不关闭任何未验收任务。最终正式specs为唯一当前契约，归档保存真实历史，不保留两套生效正文。
