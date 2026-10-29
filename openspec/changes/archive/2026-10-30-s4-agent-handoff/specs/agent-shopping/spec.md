# Spec Delta

## Purpose

使外部 Agent 通过经过服务身份认证的 MCP 入口完成商品查询、可信建车、读取、编辑及分享，取得与 Web 一致的报价和受保护结果；将访问能力与最终购买确认分开，并在重试或服务重启后保留同一购物意图。

## ADDED Requirements

### Requirement: 七工具与共享语义

系统 SHALL 提供 search_products、get_product、list_product_reviews、create_cart、get_cart、update_cart、create_handoff 七个工具，沿用查询规格及共享购物车和计价规则。每个结果包含结构化内容与可读文本；业务错误可区分校验、权限、过期、冲突、受阻和技术故障。系统 MUST 不注册确认、提交订单或模拟点击工具。

#### Scenario: 工具发现及输入校验
- **WHEN** 真实 Host 列出工具并调用查询和购物工具，或携带未声明的来源、价格、确认字段
- **THEN** 仅发现七工具，合法输入按共享规则执行，越权或非法字段拒绝；读工具声明只读，写工具准确声明副作用，注解不替代服务端校验

#### Scenario: 认证及公开数据边界
- **WHEN** 无有效服务认证、Host/Origin 不允许，或商品评论含伪造操作指令
- **THEN** 非法请求被拒绝，评论仅作数据；公开投影不含内部经营字段、服务凭证或堆栈

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
