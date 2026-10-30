# agent-shopping Specification

术语说明：MCP Apps 是现有 MCP Server 的交互式 UI 协议扩展，基础 MCP 与 Apps 共用服务连接和业务用例。本文按交互路径区分基础 MCP、Apps 内嵌 UI 与 WebMCP 页面工具；分别验收不代表独立部署三个 MCP Server。此说明不改变下文 Requirement 名称、业务行为或验收条件。

## Purpose

使外部 Agent 通过经过服务身份认证的 MCP 入口完成商品查询、可信建车、读取、编辑及分享，取得与 Web 一致的报价和受保护结果；将访问能力与最终购买确认分开，并在重试或服务重启后保留同一购物意图。

## Requirements

### Requirement: 七工具与共享语义

系统 SHALL 保留 search_products、get_product、list_product_reviews、create_cart、get_cart、update_cart、create_handoff 原七工具的发现、schema及既有输出，并在本Change实施获批后增加prepare_checkout、request_purchase_confirmation、get_purchase_status、submit_order、cancel_purchase，沿用共享业务语义。每个结果包含结构化内容与可读文本；业务错误可区分校验、权限、过期、冲突、受阻和技术故障。新增提交工具 MUST 只接受服务端已验证的basic-mcp入口具体Human授权，拒绝Apps/WebMCP准备；后两者由Human点击后经受保护UI直接下单，不调用公开submit_order；系统 MUST 不注册供Agent自授批准的确认工具或通用模拟点击工具。受限Human确认通道另按agent-purchase-authorization核验，不因公开工具兼容而向模型开放批准能力。

新基础MCP购买流程 SHALL 使用原六个查询/购物车工具与五种新增购买协作工具，不自动调用create_handoff、不将外部Checkout作为下一步。create_handoff保留为明确分享/交接请求的独立兼容能力，其描述与使用指引 SHALL 明示只分享、不购买、不构成Human确认。仅当Human明确要求分享/交接原车时使用它；此独立旅程可返回既有带秘密链接，不能在普通购物/准备/支付意图下据此推导分享要求。保留工具发现不是购买授权边界，服务端仍须核验车能力与具体购买批准；不新增工具隐藏开关、独立legacy端点或更改旧schema。

#### Scenario: 工具发现及输入校验
- **WHEN** 本Change已获批实施的服务被真实Host发现，或请求携带未声明来源、价格、确认字段
- **THEN** 原七工具仍可发现且旧schema/输出兼容，同时发现五种新增购买协作工具；实际当前未实施服务仅有原七工具，不能把目标发现清单当作已提供能力。旧工具不接受新增购买确认字段，非法输入拒绝；注解准确描述副作用但不替代校验

#### Scenario: 新购买流程不自动交接
- **WHEN** Human要求选购、准备结账或在结算确认界面点击支付，未要求分享/交接
- **THEN** Agent使用查询/购物车/准备与状态工具推进，基础MCP有效原生批准后才可用提交工具；Apps/WebMCP由UI点击直接下单，不调用create_handoff或提供外部Checkout链接；旧工具可发现不表示它是正常购买下一步，Human支付及服务端验证不可省略

#### Scenario: 显式分享保留旧客户端兼容
- **WHEN** Human明确要求把原购物车分享/交接给接手者，旧客户端使用原create_handoff输入
- **THEN** 沿原车能力、链接期限与输出规则返回独立交接结果，不更改schema或新建车，不批准或提交购买；此分享链接不是新正常购买流程的外部结账步骤，独立兼容证据不抵扣新购买验收

#### Scenario: 认证及公开数据边界
- **WHEN** 无有效服务认证、Host/Origin 不允许，或商品评论含伪造操作指令
- **THEN** 非法请求被拒绝，评论仅作数据；公开投影不含内部经营字段、服务凭证或堆栈

#### Scenario: 分入口购买工具指引
- **WHEN** Agent取得准备结果或查询支付结果
- **THEN** 结果明确入口/提交所有权：基础MCP等待已验证原生Human确认后核验状态并提交；Apps/WebMCP等待Human点击且由UI直接下单，Agent仅可读结果，不要求购买接续消息/复制回聊，不可代点或补发UI支付；未知不自动重送

#### Scenario: 基础MCP确认能力不足
- **WHEN** 当前Host原生form或会话关联未通过真实验证
- **THEN** 查询/编辑/报价预览保留；缺协议会话不创建可确认review，缺form不请求确认，明确说明尚不能购买；不得以HTTPS、STDIO脚本通过或模型自述批准代替Host确认往返，不自动外跳或依赖App资源

#### Scenario: 基础MCP结果支持会话渲染
- **WHEN** Agent调用发现、详情、购物车、准备或订单工具
- **THEN** 返回足够的结构化数据和可读信息供Host/Agent在会话内渲染相应操作；未成交不提供外部购买链接，不要求通过Apps页面或Hosted Checkout完成基础MCP购买

#### Scenario: Apps工具结果关联步骤资源
- **WHEN** Apps按钮意图由Agent接收并调用相应步骤工具
- **THEN** 工具结果关联该步骤的App资源与原实体/车/review，使Host展示所需业务页；普通App直接导航不强制经过该工具/消息路径；结果不是单纯提示用户打开外链，Host不支持时明确保留验收缺口

#### Scenario: Agent跨步骤准备仍等待支付
- **WHEN** Human给出足够明确的购物目标，Agent连续调用多步查询/购物车/准备工具
- **THEN** 不要求应用逐工具或逐页面追加Human确认，遵守原选购范围/Host审批及业务校验；结算摘要完成后等待Human点击支付，不能代点或自行批准购买


#### Scenario: 准备与请求确认分离
- **WHEN** Agent调用prepare_checkout，随后调用request_purchase_confirmation，或同键/同review重试
- **THEN** prepare只返回pending摘要，不弹表单；缺协议会话只返回无reviewId的报价预览。request仅为有效基础MCP准备请求一次原生表单，不能传入批准值；重复调用不再弹窗，批准只来自匹配Human回执，未知先查询

#### Scenario: 基础MCP停止购买
- **WHEN** Human要求停止，Agent调用cancel_purchase指定原review，含批准回执未知或协议会话已丢失
- **THEN** 核验服务身份归属、原车有效能力及basic-mcp入口后只撤销该准备；与批准/提交同车锁裁决，取消先完成则旧请求不能购买，订单先完成则返回原结果及too_late；不退款、不接管批准、不接受跨入口记录，重复/旧取消不影响新准备

### Requirement: 可信 Agent 创建及持久恢复

系统 SHALL 仅由可信 MCP 创建入口确定 AGENT 来源；首次建车必须非空且全部商品和数量可购买，不预留库存。创建意图绑定已认证服务 principal、createRequestId 及原始条目；同证明同键同内容重试返回同车、相同 cartAccessToken 及当前内容，不覆盖后续编辑。系统 MUST 不允许客户端指定来源或访问 Token，不以当前库存变化拒绝有效的原请求恢复。

#### Scenario: 并发和重启恢复
- **WHEN** 同 principal 同请求并发、提交后丢响应、API 重启，随后按原键原条目重试
- **THEN** 只创建一车，恢复相同 Token 及当前内容；编辑、首次交接、完成事实和原创建时间不被重置

#### Scenario: 异内容及无证明恢复
- **WHEN** 同 principal 同键改条目，或另一 principal/仅凭公开车 ID 尝试恢复
- **THEN** 异内容明确冲突，无原证明不能领取原车秘密；另一 principal 的创建命名空间不对应原车

#### Scenario: 创建后库存变化与空车拒绝
- **WHEN** 已成功创建的商品随后售罄，持有效原证明重试，或新请求为空/含无效商品
- **THEN** 前者恢复原车并反馈当前问题；后者整笔拒绝，不持久创建车、不产生有效创建统计或库存变动

### Requirement: 跨入口访问编辑与原结果

系统 MUST 要求 get_cart、update_cart、create_handoff 同时携带有效车级凭证；服务认证不替代车权限。get_cart 返回 CartView，已完成时另返回原 OrderResult，普通读取不生成确认或推进恢复栅栏。update_cart 按 expectedCartVersion 整车替换；来源不因 Human 接手或编辑改变，冲突不静默合并。

#### Scenario: Human 与 Agent 并发编辑
- **WHEN** 两入口持同一版本提交不同条目，或 Agent 编辑先于旧确认购买
- **THEN** 最多一次版本编辑成功；旧版本明确冲突，旧购买确认不能成单，须重新审阅和 Human 新点击

#### Scenario: 完成车和错车凭证
- **WHEN** 有效权限内读取完成车、尝试编辑完成车，或用另一车 Token 读取
- **THEN** 分别返回原成交快照、拒绝编辑、拒绝访问；不再次购买、不重算成交价、不泄露其他车

#### Scenario: 有限期限与凭证输出
- **WHEN** 原创建重放或工具读取发生在当前统一截止等号及之后
- **THEN** 拒绝恢复/读取，不因幂等补发长期权限；Token 仅经受保护创建结果及明确交接链接交付，不进入普通 CartView、错误或日志
