# Product Design — 设计资产入口

Product Design Baseline v0.2 已获 Human 正式批准（2026-10-29）；结构、关键交互与视觉方向生效，完整运行验收仍保留，Agent 授权代提交继续后置。当前设计说明、15 项 UX 决策、展示限制与验收证据统一见 [Product Design](../docs/product/PRODUCT_DESIGN.md)，本目录保存可打开的设计资产及来源。

## 打开与审阅

用浏览器直接打开 [单一 Design Preview](index.html)，无需安装依赖或启动商城服务。全部 CSS、脚本和商品展示样本位于本目录，没有远程资源或 API 请求。

1. 顶部选择“代表性視覺稿 / 五頁結構線框”，再选择核心页面；视觉模式下购物车与订单结果仍展示原线框，其他三页显示视觉稿。
2. 切换“顾客自行选购”或“Agent 交接”，或点击“開啟 Agent 交接範例”，直接进入同一个 Checkout。
3. 从“頁面狀態”检查异常；用预览宽度按钮检查 1180 / 768 / 390 与自适应布局。预览宽度受到浏览器实际可用空间限制。
4. Checkout →「編輯購物車」→ 将 P001 数量改为 2 →「更新數量」→「前往確認訂單」，检查原购物车标记、Agent 来源和更新报价。
5. 确认按钮只导航至预设结果样本，不下单、不扣库存、不付款。

五页共用 [pages.html](wireframes/pages.html) 及样式/展示脚本，统一入口导航到相应页面；不是为五页建立五个应用。直接打开 pages.html 也可使用页面链接，推荐从统一入口检查状态与说明。

从仓库根也可运行 `python3 -m http.server 8766 --bind 127.0.0.1 --directory .`，打开 `/design/index.html`；仅供本机预览。静态展示检查为 `node design/check-preview.cjs`，其覆盖和限制见 [Product Design §11](../docs/product/PRODUCT_DESIGN.md#preview-boundaries)。

## 已确认输入与原件保存

| 材料 | 用途 / 状态 |
| --- | --- |
| [附件 Markdown 原件](references/UX_DECISIONS.md) | 本次 Human + ChatGPT 已确认的 15 项 UX 决策输入；完整保留候选、理由与双语撤回历史 |
| [附件 HTML 原件](references/UX_DECISIONS.html) | 视觉层级、页面结构和用户流程参考，原样保留内嵌 CSS、图示及全部文字；不是正式视觉稿 |
| [合并后的 UX 决策](../docs/product/PRODUCT_DESIGN.md#ux-decisions) | 保留原决策 ID、候选、确认与撤回历史，正文已并入 Product Design §10 |
| [Requirements v0.2](../docs/product/REQUIREMENTS.md) | Approved Product Requirements Baseline；批准依据与 Pending 以正文为准 |
| [产品决策 D-01～D-22](../DECISIONS.md) | 业务语义、金额、交接生命周期、权限与最终确认边界 |
| [Product Design 标准](../docs/workflow/PRODUCT_ENGINEERING.md#product-design-内容与验收标准) | 复用现有设计产物及验收规则 |
| [原始 Mock](../references/products.json) | 只读数据来源；展示内容不是生产事实 |

两个附件与 Downloads 来源逐字节一致，严格 UTF-8 解码成功：

| 原件 | 字节数 | SHA-256 |
| --- | --- | --- |
| UX_DECISIONS.md | 10,124 | `41b451a1f598fb9444cb9664ff340f2fb722ec4f4143dd9850b40d4dd590591d` |
| UX_DECISIONS.html | 20,256 | `8186dc2e7c204294a4f48a4998e2ba25b4e276c2577a33dbbacff4bdeb19045e` |

附件 Markdown 与仓库 UX 决策记录内容不同；附件是不可改写的交接原件，决策追溯正文现合并于 Product Design §10。两者有效选择未发现实质冲突。设计交接附件补充了历史候选与早期双语曾确认的记录，不据此恢复双语要求，也不改写旧文件未取得这些历史信息时的说明。

附件中的“尚未入库”“下一步生成 Product Design / 三张视觉稿”等保留为生成当时的历史文字，不能覆盖当前任务范围。HTML 内的英文标题、简体决策正文和示例商品 A/B 属参考档案内容，不用作商城 UI 文案；新线框使用繁体中文与原始 Mock 商品。
