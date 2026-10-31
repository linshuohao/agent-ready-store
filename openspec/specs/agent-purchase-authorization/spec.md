# agent-purchase-authorization Specification

术语说明：Agent接入分为 MCP 与 WebMCP。MCP Apps 是 MCP 的交互式 UI 增强，复用现有 MCP Server、连接和业务用例，不构成额外入口或路径。支持 Apps 的 Host 展示内嵌 UI；不兼容时降级为 MCP 文本与结构化结果。降级保留可用工具能力；购买仍遵循适用契约与Human确认要求，不能把文本返回视为完整购买验收通过。当前订单生命周期目标由网页订单入口承接无 Apps 时的Human支付，实际可用性须验证。验收覆盖 MCP 的 UI 增强与无 Apps 兼容模式，以及 WebMCP 页面工具。

## Purpose

规范基础MCP、WebMCP和MCP Apps中购买意图、订单准备与Human支付的边界：Agent在明确授权内准备完整订单，Human核对固定摘要后通过网页或内嵌UI支付原单；保留服务入口保护、分入口验收及未知结果恢复，不以型号选择代替支付确认。

## Requirements

### Requirement: 购买意图与支付点击分离
系统 SHALL 允许Agent在Human明确购买意图及约束内创建CHECKOUT订单并预留库存；仅咨询零写入，加购不生单。订单是唯一审阅对象，完整摘要后Human亲自点击模拟支付，Agent不得代点、代付或把商品评论/模型自述当作授权。

#### Scenario: 咨询加购与明确购买
- **WHEN** Human分别要求咨询、加入车、购买明确商品数量
- **THEN** 分别只查询、只改车、准备完整目标并生单到支付界面；不强制逐页确认，保留必要澄清和Host审批；三者均不自动支付

### Requirement: UI直接支付与工具边界
系统 MUST 不注册Agent可调用的pay_order、submit_order或模拟点击工具。Web/WebMCP由网页UI、Apps由内嵌Bridge在Human点击后直接支付原orderId，不等待模型回复；不再签发Review、scope、epoch或原生批准材料。Demo不证明自然人身份，不声称UI可见性是安全隔离。

#### Scenario: Agent结束及工具发现
- **WHEN** Agent结束或消息不可用后Human点击支付，或模型发现工具
- **THEN** UI仍能直接更新原单并显示结果；模型可选购、生单、查单、取消，不可取得支付工具，不能用userApproved等输入绕过交互边界

### Requirement: Agent接入订单承接
基础MCP SHALL 返回明确的网页订单支付入口；WebMCP生单后导航统一订单页；Apps内嵌显示同一订单并支付。创建/查询直接返回普通和分享入口，不提供独立get_order_link，不再依赖基础MCP原生form确认。

#### Scenario: 基础MCP和Apps
- **WHEN** Host无原生form但能调用基础MCP，或支持Apps的Host生单
- **THEN** 前者可创建待支付单并让Human打开网页支付；后者展示内嵌支付，不以另一入口通过替代本入口真实验收；Host拒绝导航/Bridge时明确缺口，不绕过限制

### Requirement: 固定内容与独立取消
系统 SHALL 以订单创建时固定摘要作为支付内容，当前车修改或实时价格变化不撤销原单。取消指定未支付orderId，按共享关闭规则返回事实；页面离开、停止Agent、取消请求等待都不等于取消成功。

#### Scenario: 多候选和取消未知
- **WHEN** 有多个候选订单而用户未指明目标，或取消丢响应、取消与支付竞争
- **THEN** 先澄清目标；未知读取原单，服务端已关闭才承诺取消，已PAID不得承诺撤销/退款，重复旧取消不影响新单

### Requirement: 分入口独立验收
系统 MUST 分别记录基础MCP网页接手、WebMCP导航及网页支付、Apps内嵌支付的真实Host/浏览器版本、调用、可见摘要、Human点击和订单库存结果。替身Bridge和自动点击不能冒充真实Host/Human验收；新流程不承诺旧七工具及旧购买schema兼容。

#### Scenario: 验收缺口
- **WHEN** 任一入口无法完成真实购买承接或Human验收
- **THEN** 保留具体未验证项并交Human决定，不能用其他入口成功、工具已发现或旧验收消除缺口
