# Tasks

2026-11-01 Human已批准规划及实施，后授权检查、提交和合并其他优化，购物车调整移交独立会话。购物车交互补丁已完整保存并从本轮移出，范围拆分及最终验证完成。Human已授权提交、Push、PR、Merge和归档，并允许本轮合并触发自动部署；远端结果以PR/平台记录为准。真实Host验收已获Human确认，剩余合并条件见design.md。验证标准统一见design.md的Verification，不重复建立执行计划。

## 1. 基线与配置

- [x] 1.1 在合入main后的代码上记录核心业务/集成/E2E基线及实际跳过原因，确认隔离测试库；保护现有断言，建立design中定义的工具及响应基线对照。
- [x] 1.2 全仓（包含独立site及其锁文件）核查依赖、废弃API、脚本与配置，记录当前/目标版本、官方迁移依据及兼容风险，处理所有发现或明确说明保留理由。
- [x] 1.3 抽取复用ESLint基础、统一适用TS/Node类型和依赖声明，保留Next/浏览器/Node差异；验证冻结锁安装、lint、类型检查和构建。

## 2. MCP与Demo模式

- [x] 2.1 迁移McpServer；每工具独立完整定义文件，主入口逐个register，新增普通工具不修改中央Schema/handler/UI名单。重写内部注册单测，验证独立新增工具、重复名、元数据、处理函数和错误封装。
- [x] 2.2 保留分类工具维护豁免、result-guidance、constraintViolations、新旧协议续调、退役工具拒绝和Apps-only可见性；运行MCP、分类、引导回归。
- [x] 2.3 统一Apps资源版本来源，验证当前和缓存URI、构建HTML及非法资源路径。
- [x] 2.4 实现MCP_AUTH_MODE，默认本地及线上demo；更新环境示例、Compose、CI与部署接入说明。验证公网/Vercel demo无Token接入，保留显式token认证、非法/空模式及Host/Origin拒绝；CI认证负面套件单独使用token。

## 3. 内部维护性

- [x] 3.1 按引用链清理旧结算方法、页面和类型，保留公开退役行为；运行retired-http、类型检查及购物回归。
- [x] 3.2 整理交易服务职责和可读性，保持事务、锁及幂等顺序；执行真实PostgreSQL生命周期、库存竞态和约束详情测试。
- [x] 3.3 保留Provider退役接口清理及反馈展示抽取；先保存并拆出尚未验收的加购/购物车交互补丁及专用测试、CI入口，核对拆分后的差异，再定向验证切车、草稿、乱序与恢复。共享文件按变更内容拆分，不整文件丢弃已批准的维护性整理。
- [x] 3.4 补充未知异常关联日志和脱敏单测，验证外部错误结构、requestId对应与不重复记录。
- [x] 3.5 完成其余工作区过时用法与职责整理，补必要原因注释；按发现逐项验证，不能用扩大业务行为消除测试失败。

## 4. 文档目录与兼容输出

- [x] 4.1 核对delivery并行成果及文档站当前源清单，建立旧URL/锚点到新源路径映射。
- [x] 4.2 收拢源目录并更新现有构建映射、导航及脚本，保留旧输出地址；运行文档构建、链接、锚点、资源及返回导航测试。
- [x] 4.3 更新受影响的Decision/基线认证描述和维护文档，保留历史批准及限定替代关系，不改变references原件或分发边界。

## 5. 集成验收

- [x] 5.1 执行完整适用CI与相关Docker交付验证，复用核心测试原场景和断言；另跑test:categories及docs:build/check/test，检查核心用例清单无缺失/新增跳过，记录命令、环境、结果及缺口。
- [x] 5.2 目标Host的发现、选型续调、Apps资源及Human支付人工验收：Human于2026-11-01在当前对话确认“已经验收通过了”。证据来源为Human确认；Codex未现场执行，不补造Host型号、版本或逐项操作日志。
- [x] 5.3 在3.3拆分后重新核对九项范围、最终提交Diff及有效验证证据，处理审查发现并定向重验，提交Human验收；保留5.2的Human确认记录，不能把历史静态审查或任务勾选当成拆分后最终代码验证。

## Workflow follow-up

- 规划审阅通过且取得实施授权后才开始任务；安全/交易阶段交接执行Git Checkpoint Policy。
- Commit、Push及发布分别按当前授权执行；接受后再同步规格和归档。

## 当前交付状态

Human确认购物车修改作为独立一轮Spec修复，承接Change为 `cart-command-state-isolation`（已在独立工作区创建）。本轮3.3负责变更范围隔离和保留部分的验证，不承担独立加购、版本及升单状态修复；5.3不等待该独立Change完成。独立Change仍按其自身规划审批与验收推进，不因本轮Host验收通过而视为已批准实施。

当前18/18项完成。Human已确认真实Host验收，并授权审查通过后提交、提PR、合并归档及自动部署。购物车独立指令/版本/状态修复由独立Change承接，不在本轮声称完成。

最终范围与证据（2026-11-01）：
- 已保存购物车Provider/AddButton/use-cart-page、三个新增浏览器测试及CI入口原文件与完整tracked.patch，本机交接目录为 `/private/tmp/cart-command-state-isolation-handoff-20261101`；这不是公开部署资产。随后移除相关未验收补丁，Provider仅保留退役接口清理及CartNotices展示抽取，add-button/use-cart-page/CI浏览器配置与HEAD无差异。独立工作区应基于本轮合并后的main重新设计，不盲目套用参考补丁。
- 全新只读merge_review完成最终独立静态审查，包含新增文件，未发现阻止合并的实质缺陷。明确排除独立加购及现有购物车竞态后续修复，不用历史测试声称这些问题已解决。
- 拆分后typecheck、lint、format:check通过；隔离PostgreSQL串行Vitest 214通过、25条件跳过，跳过不算通过。此前同版MCP/API的真实HTTP 23/23证据复用，远端CI另验证。
- API/Apps构建、Web生产Webpack构建通过。浏览器初次因本地构建遗漏API_INTERNAL_URL而连到错误地址，修正构建环境后原核心用例桌面/移动10/10通过，未改断言。主机标准Turbopack历史限制仍保留，标准构建由既有Docker证据及本轮远端CI验证。
- 文档旧URL、分类、协议及Docker历史有效证据复用；归档后文档站build/check通过（533产物及链接/锚点），全部正式Spec严格校验通过。全量校验另发现旧Change vercel-demo-request-expiry遗漏后来新增的分类豁免场景，已核对45797ad中同样存在；不改写其他Change历史，也不把全量校验说成通过。只修改本轮范围，无数据库迁移，无原件修改或新增分发。

以下为历史执行证据，其中未获提交/合并授权、Host待验收、最终17/18及加购补丁已完成等表述只代表当时状态，不覆盖本节。

## Implementation evidence — 2026-11-01

规划提交faeaeca；在docs/maintainability-proposal实施，无Push/Merge/部署。协调负责人root；MCP工作包负责apps/api/src/mcp、相关测试及共享资源常量；文档工作包负责源目录、site映射和文档传播；内部重构工作包负责交易纯映射、Provider展示及日志。root单独负责清单/锁文件、共享配置与集成，数据库测试串行。

- 基线：工具发现fixture来自faeaeca真实SDK捕获，重构结果逐字段一致；文档旧HEAD独立构建与新产物233个稳定路径一致（均533文件，内容哈希资产另计）。首次基线受环境准备影响；后在未修改源码的HEAD归档副本补跑，原始170 passed/25 pending、重构193 passed/25 pending，JSON结果验证success=true。该补跑不冒充修改前已执行。
- Vitest最终整合193 passed、25 skipped（HTTP环境套件另跑）；真实PostgreSQL store_test在独立Docker端口55439。HTTP/MCP六套件23/23通过，补足对应条件套件；剩余跳过不得视作通过。
- 核心购物E2E桌面/移动10/10；分类E2E12/12；文档浏览器109文档、16屏、四宽度、旧入口/返回通过。Apps/WebMCP整轮37 passed/1 mobile超时（勾选状态未保留）；原失败用例不改断言连续定向重跑3次通过，无并行构建的稳定环境整轮复验38/38通过。静态定位为首次load(true)返回清除勾选的既有竞态：use-cart-page.ts、cart-page.tsx及WebMCP入口与faeaeca无diff；尚未做延迟读的确定性重现，不声称已修复，交Human审阅残余风险。
- API/Web/Apps/共享包typecheck、lint通过；冻结锁安装和format:check通过。脚本测试5/5；Vercel入口按审查补显式token与VERCEL环境后定向复验。
- 主机标准Turbopack构建因本地端口EPERM失败，Webpack生产构建通过；Docker内标准生产构建成功，未发布。site安装仍报告esbuild ignored-builds（项目已声明allowBuilds），但实际构建、负面检查及浏览器测试通过，未修改用户全局策略。
- 交叉审查：MCP由非作者检查，交易/日志/UI由MCP工作包检查；修复Compose空值回退demo与Vercel测试环境缺失，删除无意义文本节点。各作者自查不冒充独立审查。

### Dependency review

通过npm官方注册表的outdated、peerDependencies、dependencies核对全工作区与独立site；未把所有新版本都视作必须更新。

| 依赖 | 处理与依据 |
| --- | --- |
| React/ReactDOM | 19.3.0→19.3.1，所有消费方一致；清除commerce-ui重复声明，保留运行依赖 |
| cn / lucide-react | 0.5.0→0.5.1 / 1.62.0→1.65.0，类型与浏览器验证 |
| Nest schematics | 12.0.11→12.0.12工具补丁 |
| Vue | 3.5.22→3.5.44，满足VitePress ^3.5.13，文档全验证通过 |
| TypeScript / Node类型 | Web统一6.0.2 / 24；TS7不采用，typescript-eslint当前要求<6.1.0；Node26类型不匹配项目Node24运行基线 |
| ESLint | 尝试10.14.0后回退9.39.5：Next当前import/react/jsx-a11y插件peer仅支持到9；保留弃用告警，peers check无冲突，不强制override |
| Prisma | 保持7.10.1；registry latest为8.0.0-rc.29，不采用预发布交易基础设施 |
| markdown-it / Mermaid | 保持14.1.0 / 11.12.1；发现15/12大版本，但本轮没有对应缺陷，VitePress仍使用markdown-it14类型线，避免仅为版本号改变解析/图形语义；已验证现有渲染与迁移 |
| 其他已声明依赖 | registry核查未发现需要处理的更新；MCP包版本不变，迁移其推荐高层API |

后续真实Host发现/选型/Apps Human点击仍未执行，5.2保持待验收。业务核心测试断言未削弱；修改仅限新增单测、路径/启动环境适配。


最终审阅状态：Human选择先审阅代码、后做真实Host验收，因此5.2明确后置，不算通过。5.3表示已提交审阅材料，不代表Human已验收。生产Docker构建、镜像不含原件/秘密的检查、回环临时容器health成功；标准主机Turbopack EPERM、site ignored-builds和移动端间歇性超时仍明确保留。相关整轮复验已完成；未合并、未部署，实施Diff尚未提交（本轮明确提交授权仅为规划产物，待代码审阅）。

最终Tasks为17/18：仅5.2真实Host人工验收按Human要求后置。主机Turbopack限制由Docker内标准构建成功提供补充证据，仍如实保留环境差异；未将Webpack替代说成主机标准构建成功。规划以外实现未提交，等待Human代码审阅。

- 单工具组织纠正验证：API typecheck/lint通过；MCP config、registration、protocol-upgrade、guidance-protocol、result-guidance五套件51/51通过。公开工具fixture未修改；虚拟普通工具及携资源工具均只经一次register完成发现/调用，资源自动收集，无中央名称名单。


### 本轮审查与修复（2026-11-01，后续记录替代上方同问题的未决状态）

Human确认保持MCP App独立构建。独立审阅由未参与实现的fresh_review执行，重点检查单工具注册、交易映射、状态所有者和配置；未宣称逐个审计所有图片/锁文件。没有发现需要引入额外框架的理由，保留薄协议兼容层和实际共享配置。

- 修正update-cart-item工具中的误导性addItemInput命名为updateItemInput，无Schema变化。
- 分类认证测试单独运行默认demo时失败：401/403断言收到400；补显式MCP_AUTH_MODE=token，保留原断言，分类+注册8测通过。
- 首次读取竞态补确定性浏览器反例：先展示共享车快照、延迟首次GET，勾选后放行响应；原load(true)清除选择导致失败。挂载改load()，用户显式reload仍采用清选择路径；桌面/移动反例通过，并加入CI。此项为既有交互契约缺陷修复，不改变购买/库存/计价规则。
- root定向复验：MCP五套件51测、API类型/lint；共享UI类型/lint；日志/计价/约束/配置四套件21测通过。旧核心断言未弱化。最终导航集合26/26通过（原24项+新反例两端2项）。fresh_review独立静态定向复核通过：保留版本/草稿/迟到检查，cartId key保证切车重建，不携带旧车选择。
- 独立审查指出order-view读取WEB_ORIGIN，准确定位是无数据库写入的视图映射，不严格称为数学纯函数；保留原配置读取行为，不为术语纯度扩大重构。

- MCP错误归属按Human反馈修正：各工具handler自行捕获业务AppError并选择原恢复提示；ToolError仅携带原code/status/details及提示。外层只保留公共校验、未知异常、维护与协议封装，不建立业务错误分派表。独立定向复核发现两个创建订单入口遗漏CART_VERSION_CONFLICT，已补齐并由fresh_review静态复核关闭。MCP六套件66/66、API typecheck/lint及相关Prettier检查通过；新增12项工具错误测试及3项真实HTTP协议边界测试，验证详情保留、维护失败隔离和未知异常单次安全日志。原discovery fixture与核心断言未修改；无提交、合并或部署，真实Host仍按5.2后置。

- 线上Demo授权修订：Human明确本地及线上正常演示均默认demo，替代此前仅本地限制。配置移除回环/Vercel禁用条件，保留Host/Origin格式与访问校验；文档默认无凭证连接，token适用场景及Bearer接入单列。CI常规构建和交付默认demo，原认证负面集成步骤独立使用token，并新增无Token初始化冒烟。配置/注册26项、托管编译入口1项、整合MCP六套67项通过；API类型/lint/build和Apps重建通过。root用隔离本地API执行CI同一冒烟脚本成功，未声称已运行远端CI。文档build/check通过（533产物及链接/锚点）；OpenSpec严格校验通过。未修改线上环境、提交、合并或部署，5.2真实Host验收仍后置。

- 最终审查：全新只读final_review核对HEAD faeaeca至当前工作树（含新增文件），未发现新的实质缺陷；保留单工具定义/局部业务错误及必要SDK兼容层，不新增框架。root修正Design/Tasks过期的“仅规划/未实施”状态。root重跑隔离PostgreSQL下全仓Vitest：211通过、25条件跳过；随后启动当前编译API补跑六套真实HTTP/MCP：23/23通过（不将剩余条件跳过算通过），format:check通过。复用本轮此前有效的demo无凭证冒烟、Vercel入口、文档构建及浏览器证据；此次无新UI代码改动。独立审查为静态证据，reviewer尝试纯测试挂起后中止，不计通过。真实Host验收仍待Human代码审阅后进行，未提交/合并/部署。

- 加购反馈修复：Human反馈一次加购使所有按钮短暂置灰。确定性延迟响应浏览器测试复现：其他按钮预期opacity=1、实际0.5；原因是未分层的commerce-button禁用样式覆盖Tailwind局部覆盖。AddButton用局部内联透明度保留原视觉意图，仅当前按钮呈处理中；共享购物车锁及缺货禁用保持。新增CI浏览器回归，桌面/移动加购反馈与首次读取两场景共4/4通过，commerce-ui类型/lint通过。仅样式优先级调整，不改加购数量、请求或并发策略；未提交/合并/部署。

- 加购隔离纠正（替代上条仅透明度修补）：Human指出其他按钮仍闪动及状态隔离不足。移除透明度/全局aria-disabled补丁，新增稳定加购命令Context；商品按钮不订阅全局busy/view/message，局部adding只在同步忙检查通过后设置。原active锁仍统一保护加购、编辑、恢复及生单。全局反馈继续原实现；不引入SKU锁、队列或状态库。成功/未知结果测试检查其他按钮无DOM属性变化、悬停色和指针稳定、忙时其他点击无第二请求；连同原导航与首次读取场景桌面/移动30/30通过，类型/lint/格式通过。final_review独立静态复核无实质问题；DOM断言不等于证明组件绝不重渲染。无提交/合并/部署。
