# Proposal

## Why

整车互斥使商品A加购时商品B的点击被拒绝；仅拆Context或局部loading不能修复命令层拒绝。加购表达增量意图，不应依赖读取整车版本；生单以明确购买清单为准，不能因车数量或无关商品变化而阻断；车编辑与购买意图需要分离。

## What Changes

- **BREAKING**：add不读取、不提交expectedCartVersion；每次接受的加购独立请求、独立幂等键，无客户端FIFO、排队、自动重试或合并，不因其他商品忙碌拒绝点击。
- **BREAKING**：createOrder/quote使用selectedItems中的productId和quantity，不提交车版本、不断言车行存在或数量匹配；生单后原子清除当前车中所购SKU的完整记录。推荐仅set/remove保留整车版本；快照版本独立保留，不引入行版本。
- **BREAKING / Proposed**：无cartId时使用共享且持久的初始化身份，服务端首次有效add原子建车并加量；后续并发add使用同身份但各自操作键，不能共用初始化载荷去重。
- 按请求保存未知结果，按按钮/行/购买尝试隔离状态；购买清单不随车版本失效，允许未保存到车的有效购买数量生单；生单只清理属于原尝试的局部状态，服务端SKU清理与客户端响应安装分开。
- 本页主动移除立即取消本地购买选择，删除失败也不恢复勾选；已发购买尝试独立保留。
- 新增按原请求键只读核实结果，不生单/改车/触发到期释放；继续原操作是独立明确动作。
- **BREAKING**：新建统一走共享身份add，旧initialItems新建及空车创建停止接收新写；停写排空后旧未知仅查询既有事实，不再执行旧载荷。
- 用户已确认按显式数量生单、不依赖车数量的设计方向；其余细化写入本Change供审阅；不修改正式主Spec或业务代码，不将建议标为已批准。

## Capabilities

### New Capabilities

无；复用现有能力边界。

### Modified Capabilities

- `shopping-cart`：命令版本范围、并发初始化、逐请求恢复与页面状态隔离。
- `order-placement`：显式数量生单、原子SKU清理、无版本幂等与不同键独立多单。
- `webmcp-shopping`：按命令区分版本参数，复用共享操作边界。
- `agent-shopping`：无上下文并发add、独立购买数量与旧整行限制退出。
- `cart-pricing`：报价按显式购买量，不依赖车成员关系及数量。
- `mcp-app-shopping`：共享独立购买清单、按钮状态及局部恢复。
- `inventory-reservation`：仅新增请求结果查询豁免请求触发到期释放，确保端到端只读。

## Impact

影响contracts的购物车操作输入、CartService、HTTP/MCP/WebMCP schema、commerce-ui Commands/Provider/车页与Web/Apps适配、请求持久化及相关测试。推荐新增Cart初始化身份唯一映射，具体迁移在最终main对齐后设计；不增加服务、队列、行版本或新依赖。

原规划基线为`45797ad`；本轮已对齐最终main `db3f0e4`（PR #8），当前独立分支`feat/cart-command-state-isolation`。相关正式约束：D-23/D-24、T-08～T-11及T-11完整复用限定替代；REQUIREMENTS CART-08、PRODUCT_DESIGN草稿/并发、TECHNICAL_DESIGN状态归属章节只按其实际批准范围引用，不宣称全局整体Approved。

关联`maintainability-modernization`已合入main并归档。已核对最终已提交Diff：MCP每工具独立定义、demo/token模式、Provider退役接口与反馈抽取须保留，未验收购物车交互补丁不在main。本轮从main创建当前分支，未复制、写入或合并原工作树。

本轮Human已授权审查、修复并在通过后实施；Human已授权本次规划Checkpoint提交，Push、Merge及部署未获授权，实施前规划Checkpoint仍按项目规则处理。Design记录已确认方向及仍待整体审阅的细化，原R3整车变化强制重选已撤回。完成文档不代表Planning Approval、实施或Git授权。
