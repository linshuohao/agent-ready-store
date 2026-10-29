# Tasks

状态：Approved / S4 实施已授权（2026-10-30，Asia/Shanghai）；12/13 任务完成；5.2 的 Human 真实链路证据尚未补齐，Human 已在获知此限制后明确验收通过并授权归档。Human 在修改后规划审核通过后明确回复“批准这次规划开始实施”，已批准完整 Change 并授权实施；完成规划 Checkpoint/Guard 后执行。

## 1. 期限模型与兼容迁移

- [x] 1.1 新增可空 handoffIssuedAt 向前迁移、统一期限函数并替换所有 authorize/view/Review/最终准入调用点；以定向单元和真实 DB 测试验证旧车原期限、首次分享后完整24h、截止等号拒绝及原确认不自动延长，保留既有 Order/Inventory。
- [x] 1.2 实现同车锁内首次分享/重复分享，复用现有有界锁预算；真实 PostgreSQL 屏障测试验证并发只一个时刻、首次分享等待跨创建截止拒绝、编辑跨当前统一截止拒绝及已分享车跨原创建截止仍可编辑、分享与成单/编辑/Review的串行结果，重复调用/重启不续期；补 README 期限和迁移说明并核对命令，不 seed/删卷。

## 2. Agent 创建恢复与七工具

- [x] 2.1 扩展严格共享 DTO 和受控 Token 解密，复用共同创建步骤并隔离浏览器与可信 principal scope；contracts/真实 DB 测试验证非空有效 AGENT 创建、同请求并发/丢响应/重启恢复同车同 Token、异内容冲突、编辑/售罄/完成后重放、密文异常明确失败，库存不变。
- [x] 2.2 将同一 CartService 接入 MCP 四个新增工具，提供完整报价/原结果/链接与可读摘要；MCP 协议测试验证精确七工具、schema/annotations、服务认证和车 Token 分离、错车/到期拒绝、跨入口同版本冲突、来源不可伪造、无 submit/review 工具，保留三个查询工具回归。
- [x] 2.3 更新 README 的 Agent 配置/四工具使用与凭证恢复说明；核对示例与 DTO 一致，使用合成占位而非真实秘密，明确共享服务 principal 不等于独立 Host/顾客。

## 3. 兑换与 Human 接手

- [x] 3.1 新增同源 JSON 兑换端点和每车 Cookie 设置复用；HTTP 集成测试验证已分享/有效能力、未分享拒绝、完成车读取、错误/重复/冲突 Cookie、Origin/JSON/query/超大输入拒绝、no-store与错误脱敏，兑换不增 epoch、不购买或续期。
- [x] 3.2 在 Checkout 前实现 fragment 清除与兑换门，按 cartId/请求代次隔离并选择原车，再挂载现有流程；浏览器用例验证首次无 Cookie 接手、重复打开、多车/迟到响应、已存在未知购买标记、兑换响应丢失/刷新重开、非法 fragment 不回退使用旧权限，秘密不进 URL query/storage/RSC。
- [x] 3.3 完成 AGENT 来源/优惠、原车编辑、独立失效/技术失败/完成反馈；桌面/移动 E2E 验证接手编辑后重审阅与明确购买、版本/同额语义变化再确认、失败不自动新建、成功原快照，检查键盘/焦点/状态公告；README 补原链接重开和 Cookie 恢复限制。
- [x] 3.4 区分 CONFIRMATION_EXPIRED/409 与 Cart 的 CREDENTIAL_EXPIRED/410，修订共享错误契约及Checkout计时/提交反馈；HTTP/真实DB验证确认到期拒绝不扣库存（包含库存锁等待跨确认截止），浏览器验证计时到期与服务端拒绝两条路径均可显式重新Review并等待新点击。补Cart仍有效且Cookie已刷新到统一截止的反例、Cart也到期/原订单/重新Review技术故障分支，确认unknown/成功不被计时器或旧响应覆盖；README说明两种到期和重开原链接的区别。

## 4. 有效创建指标

- [x] 4.1 核对所有 AGENT 写入路径与现存数据的有效创建不变量，实现受控本地只读汇总和 README 用法；隔离 DB 测试有效新建+1，普通/空/非法/回滚/重试+0，删空/售罄/分享/到期/成交/重启不撤销，输出不泄密且不新增公开工具/API。

## 5. 跨入口证据与交付

- [x] 5.1 在前述各组验证通过后跑受影响集成与必要静态/构建检查，覆盖完整 MCP→兑换→Review→Order 链路；整理 revision、实际命令/结果、skip与未验证项，对失败先定位修复再重验，不机械重跑无关全量。
- [ ] 5.2 取得真实 Codex 七工具调用与交接证据，由 Human 在浏览器接手/编辑/确认；核对同车 ID、AGENT 优惠、唯一订单、库存变化及有效创建数，提供脱敏对话/截图或录影，不以模拟 MCP 客户端替代真实 Host。
- [x] 5.3 按 ai-native-review 路由一次独立代码审查并定向处理 Findings、重验和必要复核；将证据及真实 Human 验收结论写回本 Change，README 只导航真实状态，未完成验收不勾选。

## Planning evidence

- 2026-10-30：已核对 main `42596bf`、S3 归档/合并及规划前干净工作区；本轮仅新增当前 Change，不修改业务代码、正式主 Spec、Accepted Decision 或 Approved Baseline。
- OpenSpec schema 为原生 spec-driven；`openspec validate s4-agent-handoff --strict --json` 通过（1 change，0 issues），8份规划文件本地目标链接及行尾空白检查通过。首次校验发现 MODIFIED 场景标题未保留，已还原标题并重验；相对链接深度错误已修正。不将结构校验称为业务验证通过，本轮无代码测试。
- 规划审查：按 ai-native-review 的 Design Review 路径及 brainstorming builder-check 要求，由全新只读 subagent `s4_builder_check` 核对本 Change 和适用契约，实际结论为“nothing important left”；这是规划审查，不是代码审查或 Human 批准。展示采用提案/设计和短摘要，当前范围无需额外可视化资产。
- 后续Human请求独立规划审查：`s4_planning_review` 发现两项P2（等锁仍按原创建截止拒绝；旧确认到期误作车过期）。Human明确授权修复后，已定向修订Proposal、两份Spec、Design和Tasks，补统一截止反例、确认到期错误区分及重新审阅/新点击/未知保护验收；同一审查代理定向复核结论为“两项Finding均可关闭，未发现修订引入相关实质冲突”。此记录补充并纠正前次builder-check的覆盖缺口，仍非实施验证或Human批准；本轮严格校验与8份文件链接/空白检查通过，未改业务代码。
- Human Approval：已取得，来源为修改后审核通过后的直接指令“批准这次规划开始实施”（2026-10-30，Asia/Shanghai）。Git：Human后续明确“提交，然后实施”，已提交规划 `d69b8c0` 并按8个具体文件路径运行planning Guard通过。当前实现Diff尚未提交；后续提交/Push/Merge仍核对对应授权，Human最终验收与归档未完成。

## Workflow follow-up

- 取得完整规划的 Human Approval 和新的实施授权后，在已有提交授权下形成规划 Checkpoint；否则备妥 Diff 请求本轮提交授权，再按精确成果路径运行 Guard，满足后才转实施。
- 实施、Verification、Code Review、Delivery、Human Acceptance 后，经授权同步四份 delta 并原生归档；保留批准历史、实际证据和未解决限制。
- Commit/Push/Merge/发布各核对对应授权；归档不自动启动 S5/S6。

## Implementation evidence — 2026-10-30

- 当前对象：规划提交 `d69b8c0` 后的S4实现Diff（含未跟踪迁移、metrics脚本、HandoffEntry及测试），无新业务依赖。新增Cart可空handoffIssuedAt迁移已在专用store_test及本地演示store应用，保留既有Cart/Order/Inventory，无seed/删卷；references未改。
- TDD：期限/单密文恢复/确认到期3项新预期先失败后通过；MCP→HTTP新集成先因工具缺失失败后通过；浏览器交接先失败，接手门上线后单独复现确认到期误显示终止，再修复通过。真实DB测试覆盖同请求并发与重启恢复、空车拒绝、库存变化原请求重放、同车首次分享、创建/分享两期限、完成车原订单、真实Cart/Inventory锁屏障及分享/成单双执行顺序。
- 最终DB/单元：`docker compose exec -e TEST_DATABASE_URL=postgresql://store_test:test_only@db-test:5432/store_test api pnpm test --no-file-parallelism` → 68 passed / 9 skipped；9项HTTP/MCP因未配置端点而跳过，另在本地3002通过API_BASE_URL/S2_API_BASE_URL/S3_API_BASE_URL真实运行 → 9 passed，不将skip计通过。S4 DB套件含9项实际通过。
- 浏览器：本地开发Web/API完整Chrome桌面/移动72 passed；独立审查修复后受影响的checkout/handoff/handoff-boundaries桌面/移动20 passed，含query-only拒绝、同文档hashchange、A迟到兑换不覆盖B、内存重试、原Cookie接手、明确购买及确认计时/服务端到期恢复。首轮全套发生在query修复前，其余未影响范围复用该证据，不谎称最终版本全套78项重跑。Playwright的NO_COLOR/FORCE_COLOR环境提示不影响断言；新交接测试关闭含秘密的trace/screenshot/video。
- 静态与构建：pnpm typecheck、lint（0 warning）、format:check、git diff --check、OpenSpec strict均通过；最终query修复后Docker production API/Web镜像构建通过（未发布、未替换现有运行服务）。最终配置秘密精确扫描0匹配，README补当前入口/期限/恢复/统计/迁移说明。
- 运行问题已定位并恢复：开发API在Nest重建清除dist/main.js时watch失去入口，重启现有API后健康及集成重验通过；隔离DB精确到期夹具因timestamptz(3)向上舍入出现偶发未来不到1ms，夹具改为date_trunc毫秒再减24h后全套通过，未放宽业务边界。
- 独立代码审查：`s4_code_review`只读核对完整Diff与未跟踪文件，发现1项P2：无fragment时忽略非法query。已用真实浏览器先复现失败，再将query拒绝提前到普通入口放行前，桌面/移动回归通过；以原审查范围加定向TDD自查关闭Finding，未声称另一次独立复审。未发现其他有证据的阻塞Finding。按react-best-practices聚焦检查新增Client门的effect清理、秘密不进RSC/持久缓存、乱序与hashchange，Lint无warning。
- 本地只读metrics入口实际运行成功；当次观测为19个有效AGENT车（含本轮自动/真实Host测试产生车），不代表独立顾客或业务目标达成；计数随后仍可能随测试新建增加。未来清理仍须保留有效创建事实，本轮无自动删除。

### Real Codex Host evidence（与模拟测试分开）

临时Codex CLI Host通过本机服务认证调用，未改全局MCP配置；先前read-only/never策略拒绝update_cart，不能算七工具全通过。随后以官方自动审批审查模式重跑，七次工具调用均completed、无error，未调用HTTP下单或模拟Human确认。原始事件与结果含能力秘密，仅留 `/private/tmp/s4-codex-host/events-approved.jsonl`、`result-approved.txt`（本机临时证据，不入Git、不公开分享）。下表为实际脱敏摘要：

| 实际调用 | 结果 |
| --- | --- |
| search_products / get_product / list_product_reviews | 均成功；评论作数据，不执行P005伪指令 |
| create_cart | AGENT车 `172e4b49-5543-47dc-81c2-ca835caa7ca5`，P003数量1 |
| get_cart | 同车读取成功 |
| update_cart | 按预期版本将P003数量改为2，成功 |
| create_handoff | 同车链接及完整报价，TWD 1216.00；完整URL与Token脱敏 |

Human必须在原交接链接中核对/编辑并明确确认，随后核对同车Order/Inventory。当前真实Host车尚未购买，5.2保持未勾选；自动浏览器另有完整购买证据，但不替代Human真实链路与最终验收。5.3的独立代码审查及修复已完成，Human最终验收结论尚未取得，任务保持未勾选。不自动同步主Spec、归档或启动S5/S6。


## Human Acceptance 与收尾授权 — 2026-10-30

- 来源：本聊天 Human 在收到新一轮独立 Review 结论及真实接手证据仍待完成的说明后，明确回复“验收通过，提交并归档，合并推送”。据此记录 S4 Human Acceptance，通过本轮提交、归档、合并和推送授权；不扩展至 S5/S6。
- 本轮独立只读审查：全新上下文 `s4_implementation_review` 核对 `d69b8c0` 后完整实施 Diff 及全部未跟踪文件，未发现有充分证据且可行动的 P1/P2 Finding；未修改源码，未重新运行真实 DB/HTTP/E2E。
- 本轮实测：聚焦 credentials/confirmation/MCP/contracts 共14 passed、2 skipped；OpenSpec strict 0 issues，git diff --check通过。既有真实 DB/HTTP/浏览器证据沿上文，未将复用记录说成新运行。
- 保留限制：5.2 真实 Codex 七工具已有证据，但 Human 实际接手/编辑/确认及同车订单/库存的新增可核对证据仍未提供，故不勾选、不凭验收话语编造操作事实。按 Human 在已披露限制后的明确授权归档，保留该证据缺口。无自动清理及长期过期结果查询边界不变。
