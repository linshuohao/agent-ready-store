# Tasks

状态：规划Approved、S2实施已授权（2026-10-29，Human；来源见Proposal），全部任务尚未实施。范围见 [Proposal](proposal.md)，实现与验证依据见 [Design](design.md) 和两份 [Cart](specs/shopping-cart/spec.md) / [Pricing](specs/cart-pricing/spec.md) 规格。

实施交接条件：规划复核已完成，Human已明确批准整份S2规划并发起实施，L-01等决定已记录并传播。按最新版Git Checkpoint Policy，本Change涉及金额、幂等和权限不变量，进入实施及需要交接的高风险任务组前形成适用Checkpoint并运行Guard；不以任务数量机械增加提交。Git授权仍独立核对，任务完成以真实实现和验证为准。

## 1. 精确报价与共享契约

- [x] 1.1 在 contracts 定义严格 Cart 输入、CartView/Quote、Money/问题及错误结构；明确资源上限、版本和报价指纹语义，不放入 Token 输出或优惠实现。
- [x] 1.2 在 API Cart 模块实现唯一服务端 Pricing，核对并锁定精确十进制依赖；改造 `apps/api/src/catalog/` 价格入口保留十进制来源，同时保持 S1 公开字段、异常数据和排序分页契约。
- [x] 1.3 验证 Requirements §6 样例、990/1000边界、一次满减、AI优惠、HALF_UP半分、金额对账/溢出、空车和受阻估价，以及语义指纹的正反例；补受影响Catalog回归。

## 2. Cart 持久化、幂等与版本

- [ ] 2.1 添加最小Cart schema/迁移，使用持久createdAt推导创建起24h截止，不存重复expiresAt；读取/编辑/创建重放均拒绝now>=截止时刻，PUT取锁后使用服务端实时钟重验。保留Inventory数据，创建原始意图和当前items分离，不存派生报价；首次分享字段及期限切换留S4。
- [ ] 2.2 在 `apps/api/src/cart/` 实现 CreateCart/GetCart/ReplaceCartItems，复用 Catalog 导出能力与既有 infrastructure/database；先识别和恢复已有创建请求，仅新请求执行当前库存校验，以唯一键事务仲裁首次查找未命中的并发；整车原子保存/条件版本递增，编辑后重放不覆盖新内容，读取保留失效问题项，不预留/扣库存。
- [ ] 2.3 在专用真实PostgreSQL以独立连接/barrier验证创建同键并发/异内容、同版本双写、失败候选行回滚、持久重启恢复；覆盖“成功丢响应→库存下降/售罄/商品失效→重启重试”及首次未命中后另一请求提交的时序；另覆盖PUT恢复GET读旧版本后，原请求/同版本同条目重试/第三方写入各自先提交的顺序，断言同版本最多一次写入成功、最终版本/内容、原访问能力和Inventory零净变化。

## 3. 车级权限与 HTTP

- [ ] 3.1 按批准设计实现浏览器创建证明、Token认证加密、稳定环境密钥、每车Cookie与到期访问规则；缺密钥拒绝，响应/日志不泄漏秘密，不凭公共ID恢复。
- [ ] 3.2 在 Cart 模块添加创建/读取/整车替换HTTP adapter，由 AppModule 组合，固定普通HUMAN来源、严格Origin/JSON/输入白名单/body上限、no-store及可操作错误；复用 `src/shared/` Result/AppError 并验证对现有只读接口兼容。
- [ ] 3.3 验证错车、猜ID、异证明同键、伪造origin/price、跨站写；覆盖创建起24h截止前/等号/之后、等待写锁期间到期、编辑/创建重放/Cookie重设不续期；经真实Next同源代理验证Cookie与权限，包含A/B并行车和响应丢失/有效原材料重试/密钥错误。S4首次分享切换仅作为兼容约束，不伪造本切片运行证据。

## 4. Web 加购和独立购物车

- [ ] 4.1 在 `apps/web/src/features/cart/` 增加页面协调Hook/轻量Provider、无React依赖commands和加购反馈，接入product-discovery列表/详情；首次创建同步禁用全部加购入口，成功设置currentCartId后再接受操作，结果未明持原材料恢复；已有车的写操作共享进行中状态，不引入操作队列或全局状态框架。
- [ ] 4.2 由 App Router 组合 `/cart/[cartId]` 与Cart功能组件，实现权威快照、局部编辑草稿、数量修改/移除、报价/问题行、空车与失效状态；版本冲突/保存失败保留草稿。按方案A保留原PUT车/版本/完整条目，GET旧版本仍保持结果未明并暂停新意图；提供显式原请求重试、冲突后重读和当前条目相同/不同两种反馈，不增加编辑记录表或最终购买动作。
- [ ] 4.3 验证首次A/B快速点击只有一次创建、成功后B加入原车、创建丢响应时入口受控/原材料恢复、已有车连续写操作不重叠；覆盖PUT丢响应后GET旧版本不解锁、用户重试材料不变、冲突重读、第三方改写不自动覆盖、再次超时/读取失败保持未知以及离页不自动重放；补刷新/导航、API失败、快速编辑/切车/迟到响应、A/B标签隔离和材料丢失提示，完成桌面/移动、键盘/焦点/错误关联/反馈检查，记录真实读屏证据或明确限制。

## 5. Slice 验证与交付

- [ ] 5.1 对实际增量执行相关typecheck/lint/build、金额/真实DB/HTTP及Web E2E；复核S1受影响查询与MCP投影，无变化的Host证据可有依据复用，失败先修复重验。
- [ ] 5.2 按 ai-native-review 对权限、金额、持久幂等/冲突、恢复与状态归属进行适用审查；核实Finding并定向修复/重验，明确自查或独立Review及证据范围。
- [ ] 5.3 更新README/环境示例及必要运行说明，在本Tasks记录实际命令、构建/commit对象、结果和残余限制；向Human交付Web Cart闭环验收，不把领域AGENT合成测试当真实Agent建车。

## Workflow follow-up

- 按最新版Git Checkpoint Policy依据金额、权限、幂等风险与交接需要安排Checkpoint，复用同一逻辑增量的验证/审查；不要求每Task或每任务组独立提交，不为Guard新造提交。本Change适用的高风险阶段/任务组交接在条件满足后运行Guard，Git授权仍单独核对。
- Human验收及相应归档授权后同步两份正式规格并归档，保留旧S1历史；本轮不执行。
- S3确认/订单与S4 Agent建车/编辑/交接/有效创建事实等待对应授权；当前Cart数据与Pricing为复用基础，不提前铺开后续Tasks。

## Planning Evidence

- 2026-10-29：在main `e632e0c`基础的新规划分支完成只读源码调查和Draft编写；仅新增本Change文件，无业务实现、迁移、依赖安装或新增运行测试。文档结构检查与规划自查结果在最终交付时报告，不预填通过。
- 后续按Human指令rebase到main `03c51eb`，并按已确认的Review改进意见修订幂等恢复顺序、页面级加购协调、对应Spec/验证任务及源码分层/风险驱动Checkpoint表述。两项设计Finding已补齐方案和反例，运行行为仍待实施验证；当时Human Review Queue保留待裁决；随后Human明确“批准这些建议”，三项已接受，当前状态以Design的Human Review Queue为准。

- S2任务组1实施证据：decimal.js 10.6.0、lossless-json 4.3.3已锁定；新增测试首先因缺失契约/计价实现失败，实施后契约/金额/Catalog共28项通过。contracts/API typecheck、lint及API build通过；完整Vitest为28 passed / 6 skipped（DB/API环境未配置），不作集成通过。无商品原件修改。
