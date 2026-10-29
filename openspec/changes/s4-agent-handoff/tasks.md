# Tasks

状态：Approved / S4 实施已授权（2026-10-30，Asia/Shanghai）；0/13 任务完成。Human 在修改后规划审核通过后明确回复“批准这次规划开始实施”，已批准完整 Change 并授权实施；完成规划 Checkpoint/Guard 后执行。

## 1. 期限模型与兼容迁移

- [ ] 1.1 新增可空 handoffIssuedAt 向前迁移、统一期限函数并替换所有 authorize/view/Review/最终准入调用点；以定向单元和真实 DB 测试验证旧车原期限、首次分享后完整24h、截止等号拒绝及原确认不自动延长，保留既有 Order/Inventory。
- [ ] 1.2 实现同车锁内首次分享/重复分享，复用现有有界锁预算；真实 PostgreSQL 屏障测试验证并发只一个时刻、首次分享等待跨创建截止拒绝、编辑跨当前统一截止拒绝及已分享车跨原创建截止仍可编辑、分享与成单/编辑/Review的串行结果，重复调用/重启不续期；补 README 期限和迁移说明并核对命令，不 seed/删卷。

## 2. Agent 创建恢复与七工具

- [ ] 2.1 扩展严格共享 DTO 和受控 Token 解密，复用共同创建步骤并隔离浏览器与可信 principal scope；contracts/真实 DB 测试验证非空有效 AGENT 创建、同请求并发/丢响应/重启恢复同车同 Token、异内容冲突、编辑/售罄/完成后重放、密文异常明确失败，库存不变。
- [ ] 2.2 将同一 CartService 接入 MCP 四个新增工具，提供完整报价/原结果/链接与可读摘要；MCP 协议测试验证精确七工具、schema/annotations、服务认证和车 Token 分离、错车/到期拒绝、跨入口同版本冲突、来源不可伪造、无 submit/review 工具，保留三个查询工具回归。
- [ ] 2.3 更新 README 的 Agent 配置/四工具使用与凭证恢复说明；核对示例与 DTO 一致，使用合成占位而非真实秘密，明确共享服务 principal 不等于独立 Host/顾客。

## 3. 兑换与 Human 接手

- [ ] 3.1 新增同源 JSON 兑换端点和每车 Cookie 设置复用；HTTP 集成测试验证已分享/有效能力、未分享拒绝、完成车读取、错误/重复/冲突 Cookie、Origin/JSON/query/超大输入拒绝、no-store与错误脱敏，兑换不增 epoch、不购买或续期。
- [ ] 3.2 在 Checkout 前实现 fragment 清除与兑换门，按 cartId/请求代次隔离并选择原车，再挂载现有流程；浏览器用例验证首次无 Cookie 接手、重复打开、多车/迟到响应、已存在未知购买标记、兑换响应丢失/刷新重开、非法 fragment 不回退使用旧权限，秘密不进 URL query/storage/RSC。
- [ ] 3.3 完成 AGENT 来源/优惠、原车编辑、独立失效/技术失败/完成反馈；桌面/移动 E2E 验证接手编辑后重审阅与明确购买、版本/同额语义变化再确认、失败不自动新建、成功原快照，检查键盘/焦点/状态公告；README 补原链接重开和 Cookie 恢复限制。
- [ ] 3.4 区分 CONFIRMATION_EXPIRED/409 与 Cart 的 CREDENTIAL_EXPIRED/410，修订共享错误契约及Checkout计时/提交反馈；HTTP/真实DB验证确认到期拒绝不扣库存（包含库存锁等待跨确认截止），浏览器验证计时到期与服务端拒绝两条路径均可显式重新Review并等待新点击。补Cart仍有效且Cookie已刷新到统一截止的反例、Cart也到期/原订单/重新Review技术故障分支，确认unknown/成功不被计时器或旧响应覆盖；README说明两种到期和重开原链接的区别。

## 4. 有效创建指标

- [ ] 4.1 核对所有 AGENT 写入路径与现存数据的有效创建不变量，实现受控本地只读汇总和 README 用法；隔离 DB 测试有效新建+1，普通/空/非法/回滚/重试+0，删空/售罄/分享/到期/成交/重启不撤销，输出不泄密且不新增公开工具/API。

## 5. 跨入口证据与交付

- [ ] 5.1 在前述各组验证通过后跑受影响集成与必要静态/构建检查，覆盖完整 MCP→兑换→Review→Order 链路；整理 revision、实际命令/结果、skip与未验证项，对失败先定位修复再重验，不机械重跑无关全量。
- [ ] 5.2 取得真实 Codex 七工具调用与交接证据，由 Human 在浏览器接手/编辑/确认；核对同车 ID、AGENT 优惠、唯一订单、库存变化及有效创建数，提供脱敏对话/截图或录影，不以模拟 MCP 客户端替代真实 Host。
- [ ] 5.3 按 ai-native-review 路由一次独立代码审查并定向处理 Findings、重验和必要复核；将证据及真实 Human 验收结论写回本 Change，README 只导航真实状态，未完成验收不勾选。

## Planning evidence

- 2026-10-30：已核对 main `42596bf`、S3 归档/合并及规划前干净工作区；本轮仅新增当前 Change，不修改业务代码、正式主 Spec、Accepted Decision 或 Approved Baseline。
- OpenSpec schema 为原生 spec-driven；`openspec validate s4-agent-handoff --strict --json` 通过（1 change，0 issues），8份规划文件本地目标链接及行尾空白检查通过。首次校验发现 MODIFIED 场景标题未保留，已还原标题并重验；相对链接深度错误已修正。不将结构校验称为业务验证通过，本轮无代码测试。
- 规划审查：按 ai-native-review 的 Design Review 路径及 brainstorming builder-check 要求，由全新只读 subagent `s4_builder_check` 核对本 Change 和适用契约，实际结论为“nothing important left”；这是规划审查，不是代码审查或 Human 批准。展示采用提案/设计和短摘要，当前范围无需额外可视化资产。
- 后续Human请求独立规划审查：`s4_planning_review` 发现两项P2（等锁仍按原创建截止拒绝；旧确认到期误作车过期）。Human明确授权修复后，已定向修订Proposal、两份Spec、Design和Tasks，补统一截止反例、确认到期错误区分及重新审阅/新点击/未知保护验收；同一审查代理定向复核结论为“两项Finding均可关闭，未发现修订引入相关实质冲突”。此记录补充并纠正前次builder-check的覆盖缺口，仍非实施验证或Human批准；本轮严格校验与8份文件链接/空白检查通过，未改业务代码。
- Human Approval：已取得，来源为修改后审核通过后的直接指令“批准这次规划开始实施”（2026-10-30，Asia/Shanghai）。Commit/Push/Merge：尚未取得本轮授权、未执行。涉及权限、金额和订单，进入 Implementation 前按 Git Checkpoint Policy 完成规划 Checkpoint/Guard；所有实施任务仍未开始，不伪造 pass。

## Workflow follow-up

- 取得完整规划的 Human Approval 和新的实施授权后，在已有提交授权下形成规划 Checkpoint；否则备妥 Diff 请求本轮提交授权，再按精确成果路径运行 Guard，满足后才转实施。
- 实施、Verification、Code Review、Delivery、Human Acceptance 后，经授权同步四份 delta 并原生归档；保留批准历史、实际证据和未解决限制。
- Commit/Push/Merge/发布各核对对应授权；归档不自动启动 S5/S6。
