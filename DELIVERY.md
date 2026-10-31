# Agent-Ready Store：交付与体验导览

这是一份面向面试官与仓库读者的项目导览。你可以从这里了解产品、运行 Demo，并沿证据入口检查产品判断、前端架构与 AI 协作过程，无需先阅读完整设计文档。

[打开 HTML 阅读版](delivery/index.html)：本地浏览器直接打开，无需启动服务；保留仓库目录即可访问证据文件。

## 项目在做什么

Agent-Ready Store 是一个同时服务人类与 AI Agent 的商店。用户可以自行浏览、加购与购买，也可以让 Agent 搜索商品、比较规格、管理购物车，在明确购买意图后准备待支付订单。用户核对订单明细后，亲自完成最终模拟支付。

项目重点处理三个问题：

- **授权如何明确？** 咨询只查询，加购只改车，明确购买才生单；评论或模型自述不能成为支付授权。
- **不同入口如何保持一致？** Web 与 Agent 共用商品、计价、库存和订单能力；Web 与 MCP Apps 进一步共用完整购物应用。
- **交易发生异常时如何继续？** 生单固定金额并预留库存15分钟；支付、取消、到期及网络未知均围绕原订单处理。

当前是可本地体验的 Demo，使用模拟支付，不包含账户、真实金流、退款和物流。按 ID 接续购物车与订单不构成生产级身份和访问隔离。

## 从哪里开始

| 你想做什么 | 建议入口 |
| --- | --- |
| 快速了解产品与关键取舍 | 阅读本文，再看[产品决策](DECISIONS.md) |
| 实际运行与体验 | 按 [README 本机开发](README.md#本机开发)配置，再走下方 Demo |
| 在 Agent 中购物 | 查看 [MCP 接入指南](docs/engineering/MCP_CONNECT.md) |
| 查看图解展示 | 本地打开 [HTML 展示](presentation/index.html)，[打开方式](presentation/README.md)；GitHub 文件页不会直接运行 HTML |
| 检查架构和源码 | 从下方“设计解答”进入对应设计、实现与测试 |
| 核对题目交付、CI 和缺口 | 查看[交付状态与证据](docs/engineering/DELIVERY_STATUS.md) |

HTML 展示用于现场按章节讲解与跳转；交付导览用于独立阅读，优先提供使用步骤、Demo 路线与设计解答。两者均不包含私人讲解提示。

## 如何运行

需要 Node.js 24（`>=24.11 <25`）、pnpm 12.11.2，以及 PostgreSQL；本仓库提供 Docker Compose 数据库入口。还需要商品数据文件 `references/products.json`，或通过 `CATALOG_PATH` 指向可用数据。原始材料受分享范围限制；如果检出的仓库未包含数据，请向交付者确认获取方式，不能假设文件一定随仓库提供。

首次运行按 [README 的安装、环境变量和空数据库初始化步骤](README.md#本机开发)操作；Docker 整套运行方式见 [README 构建与运行](README.md#构建与运行)。README 是启动命令的维护入口，本文不另维护一套环境配置。

环境初始化完成后，日常启动：

```sh
pnpm db:up
pnpm dev
```

打开[本地商店](http://localhost:3000)。已有数据库不要重复清空或 seed。停止应用使用 Ctrl+C；`pnpm db:down` 停止开发数据库并保留数据卷。

Agent 客户端连接地址默认是 `http://localhost:3002/mcp`，使用本机配置的 `MCP_SERVICE_TOKEN` 认证。客户端必须能访问服务所在机器；远程 Host 的 `localhost` 不代表你的电脑。具体连接与兼容前提见 [MCP 接入指南](docs/engineering/MCP_CONNECT.md)。

## 可以体验哪些 Demo

以下是可自行操作的体验路线，不是预录视频，也不代表本次文档更新重新执行了全部验收。

### 1. 网页购物：从选购到支付

1. 打开商品列表，搜索并查看一件当前可购买商品的详情、规格与评论。
2. 加入购物车，修改数量，保存后勾选要购买的商品，核对选中金额。
3. 生成待支付订单，查看固定的商品、数量、优惠、运费、总额与付款期限。
4. 亲自点击模拟支付，查看原订单的支付结果；返回继续购物。

**值得观察：** 购物车可以持续使用；已创建订单具有独立明细，后续改车不会重写原订单。商品实际库存决定当时能否购买。

### 2. Agent 购物：明确意图与 Human 接手

在已连接的客户端中分步表达意图。下面是示例提示，不是既有真实对话：

> 请查找当前有库存的耳机，比较几个候选的价格和规格，先不要加购或下单。

选定实际返回的商品后：

> 请把刚才选定的这款商品加入购物车，数量1，先不要生成订单。

核对目标后：

> 我要购买这件商品，数量1。请生成待支付订单，并展示完整金额和支付入口。

核对订单摘要并亲自支付，再请 Agent 查询这张订单的状态。

| 体验方式 | 支付如何承接 | 使用前提 |
| --- | --- | --- |
| 基础 MCP | Agent 返回网页订单入口，用户打开后支付 | 支持 MCP Streamable HTTP 的客户端与可达服务 |
| MCP Apps | 在对话内嵌的共享购物界面核对并支付 | Host 支持相应 Apps 能力 |
| WebMCP | 页面工具生单后导航到订单页，由用户支付 | 支持相应能力的浏览器 Agent |

**值得观察：** 咨询、加购和购买分别对应不同写入范围；支付未向模型开放；Apps 通过仅供 UI 使用的 `apps_pay_order` Bridge 工具承接 Human 点击。MCP Apps 是 MCP 的 UI 增强，不是另一套交易系统。

### 3. 取消订单：观察短期承诺如何结束

另建一张待支付订单，记录订单号，在付款前取消，然后再次查看原单。应看到关闭结果，不能继续支付。取消释放该单预留，但不会自动把商品放回购物车，也不会取消其他订单。

到期释放、支付与关闭竞争、丢响应后的未知恢复，可进一步查看[交易核心](docs/engineering/CHECKOUT_CORE.md)和[数据库生命周期测试](apps/api/test/cart/lifecycle-db.test.ts)。不需要为了阅读 Demo 等待15分钟，也不要把关闭浏览器当作取消成功。

### Demo 与录影的证据状态

[结算验收记录](openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md)包含基础 MCP、WebMCP 与 Apps 的真实购物验收摘要。**可直接观看的完整对话导出或录影仍待补充**；摘要、浏览器测试和真实录影各有不同用途。当前导览提供本地运行入口，不提供已部署的在线商城链接。

## 设计解答：为什么这样做

### 为什么让 Agent 生单，却保留 Human 支付？

用户让 AI 搜索或加购时可能仍在比较，不能据此推定购买同意。明确购买后允许 Agent 准备订单，减少中间步骤；最后由用户核对固定内容并支付。这个选择保留一次确认成本，但使购买对象和最终操作明确。是否改善转化与误购，需要真实业务数据验证。

依据：[产品决策 D-01、D-02](DECISIONS.md)、[购买授权 Spec](openspec/specs/agent-purchase-authorization/spec.md)。Demo 的 UI 边界不能替代生产身份与访问控制。

### 为什么建车不锁库，生单后只预留15分钟？

购物车可以用于比较和暂存，长时间占库会影响其他顾客；用户已经准备付款时则需要短期确定性。因此生单固定明细并预留，支付消费预留，取消或到期释放。原单可继续查看，但重新购买需要按当前条件生成新单。15分钟是本次采用的默认值，不是经运营数据证明的最优时长。

依据：[产品决策 D-04～D-06](DECISIONS.md)、[库存预留 Spec](openspec/specs/inventory-reservation/spec.md)。

### 前端复用具体复用了什么？

Web 与 Apps 共用 `packages/commerce-ui` 中的页面、Hooks、Commands、组件与样式。Web 注入 Next 导航、HTTP 与浏览器存储；Apps 注入 Host Bridge、内嵌导航与对应存储。环境适配不再实现另一套购物状态机。

各实例仍有独立的查询副本、输入草稿和未决请求；共享代码不意味着自动共享会话。服务端负责金额与库存事实，前端负责交互协调。

依据：[前端设计](docs/engineering/FRONTEND_DESIGN.md)、[共享应用入口](packages/commerce-ui/src/application.tsx)、[环境接口](packages/commerce-ui/src/runtime.tsx)。

### 如何避免多入口计价不一致，以及重复操作？

HTTP 与 MCP 进入共享业务用例，计价集中在服务端。客户端不自行推算最终交易金额。交易使用原请求键与订单标识处理幂等和恢复；响应丢失时保留未知状态并查询事实，不能直接判断失败后换单重买。本地倒计时也不能替代数据库中的关闭事实。

依据：[统一计价实现](apps/api/src/cart/pricing.ts)、[交易核心](docs/engineering/CHECKOUT_CORE.md)、[生命周期数据库测试](apps/api/test/cart/lifecycle-db.test.ts)。

### 为什么实现多个 Agent 体验？是否增加了复杂度？

基础 MCP 提供结构化购物能力；WebMCP 面向已有网页上下文；Apps 将完整购物 UI 放入对话。这些体验复用业务和前端基础，但仍增加了协议适配、Host 兼容和分入口验收成本。它们属于项目的能力扩展，不能把入口数量本身当作质量证明。

依据：[接入与兼容边界](docs/engineering/MCP_CONNECT.md)、[工程决策](docs/engineering/ENGINEERING_DECISIONS.md)。

### AI 参与了什么，人负责什么？

项目通过 AGENTS 与自写 Workflow Skill 约束上下文、范围和决策边界，OpenSpec 保存具体变更的 Spec、Design 与 Tasks。Human 负责关键业务和架构取舍、权限边界及验收；AI 在授权范围内实施、验证与修复。局部可逆修改可以轻量执行，不为每次修改建立完整规划流程。

[AI_NOTES](AI_NOTES.md)精选四个真实协作时刻，包括上下文权威、Skill 职责收敛，以及审查发现数据库切换竞态后通过真实反例修复的过程。[工具记录](docs/engineering/TOOLING.md)给出 Skill 版本、限定使用次数和验证口径；不将记录下限冒充总调用量，也没有量化效率提升的结论。

## 如何核验交付质量

建议从[交付状态与证据](docs/engineering/DELIVERY_STATUS.md)开始，它集中维护题目要求、对应结果、实际 CI 版本、验收记录与剩余缺口。

| 核验对象 | 直接入口 | 阅读时关注 |
| --- | --- | --- |
| 产品与取舍 | [DECISIONS](DECISIONS.md) | 当前决定、代价与历史替代关系；PM回复是草案 |
| 架构与实现 | [总体技术设计](docs/engineering/TECHNICAL_DESIGN.md) | 从前后端详细设计进入对应源码 |
| 正式行为 | [OpenSpec specs](openspec/specs/)与[归档变更](openspec/changes/archive/) | 行为契约、规划与实施证据 |
| 测试与 CI | [运行测试说明](README.md#测试与检查)、[CI 配置](.github/workflows/ci.yml) | 隔离数据库、环境依赖及跳过用例；历史通过只对应记录版本 |
| AI 协作 | [AI_NOTES](AI_NOTES.md)、[Workflow Skill](.agents/skills/ai-native-workflow/SKILL.md) | 真实纠偏、决策责任与验证范围 |
| Git 历史 | [GitHub 仓库](https://github.com/linshuohao/agent-ready-store) | 规划、实现、修复及合并记录；需具备仓库权限 |

单元、数据库、浏览器与真实 Host 验收分别覆盖不同层次。本文是交付导览，不宣称当前检出版本已重新通过所有检查。真实支付、账户隐私、生产部署与十万商品性能不在当前承诺内；可观看 Agent 材料和现场增量开发演练的缺口以交付状态为准。
