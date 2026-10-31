# 文档与展示站

VitePress 1.6.4；独立包与锁文件，不影响商城构建。[线上入口](https://agent-ready-store-docs.vercel.app)，本地预览仍可使用。

在本目录执行 `pnpm --ignore-workspace install --frozen-lockfile --allow-build esbuild` 安装依赖。仓库根执行 `pnpm docs:build`、`pnpm docs:preview --port 4178`，访问 http://localhost:4178 。`pnpm docs:check` 检查静态产物链接与锚点；`node site/scripts/check.mjs --negative` 验证检查器可拒绝损坏链接。

链路：首页 → 产品 Demo（可切网页/按约束直接生单，选择步骤）→ 阅读库存取舍 → 交易核心 → 验证证据 → 返回原演示步骤。返回位置写入 URL，刷新保留；文档直接进入时不显示虚构的返回位置。

`content-manifest.mjs` 为唯一纳入清单；`scripts/prepare.mjs` 从仓库 Markdown 生成阅读页面。未纳入链接显示范围说明，源码链接固定到构建 revision。现有源文件不迁移、不改正文。`.generated` 和 `dist` 为可重建产物，不提交。

Demo 内容与两张真实截图由独立展示目录选定版本接入本站（2026-10-31），未修改来源 worktree；此处是后续最小 Demo 的维护位置。需求与演进、技术方案、AI 工作流已接入 /presentation.html。

当前限制：只验证根路径部署；已接入 109 份正文，包括 13 份现行 Spec 与 79 份历史记录；本地保留 delivery、presentation 及工作流 HTML 的已知章节跳转。代码高亮暂为可读代码块，未接入逐语言着色；Mermaid 懒加载渲染且本地打包，较大图表依赖会产生构建体积提示。公开产物仅包含清单内文档，不分发原件或凭证。

视觉保持商城浅色风格，不提供主题切换。`/library.html` 为文档目录，来源与状态随每篇正文展示。

## 正式规范与历史归档

- `/specs.html`：13 份现行规范，可追溯对应归档差异。
- `/history.html`：6 份产品/技术快照与 73 份已归档 Change 正文；每页明确历史身份并链接现行规范。
- `legacy-routes.mjs`：旧 delivery / presentation / workflow HTML 按已知章节映射；保留 from 返回上下文和 Demo 的 route/step。文档源路径对应的 .html 别名保留标题 hash。旧文件与其他 worktree 不改写，兼容仅在此站 HTTP 路径生效。
- 归档中的 `<id>` 等占位文本按文本显示；原件不改写。历史 Requirements §3.3 的旧标题保留兼容锚点。

外部 AI 对话补件原件未纳入；不分发 references 或凭证。归档的旧批准、任务勾选或测试记录不代表现行验收。

核心阅读链路初验：99 份正文、42 张图示，静态目标/锚点、已知旧章节跳转、文档别名/锚点、跨目录保留来源、刷新返回及窄屏通过。

## 展示模式

- 需求与演进：`/presentation.html?slide=authorization`（3 屏）。
- 技术方案：`/presentation.html?slide=architecture`（5 屏）。
- AI 工作流：`/presentation.html?slide=workflow`（8 屏）。

支持章节、上下屏及左右方向键导航，图示与详细说明直接展示。读完关联文档返回原屏和滚动位置；页面刷新与浏览器后退保留屏标识。文档页可反向打开相关展示屏。展示内容选自原 presentation 工作区的 slides.js / requirements.js 当前版本（2026-10-31）；本站以 presentation-data.json 维护展示摘要与图示，Markdown 正文仍从仓库生成。源码、规则与 CI 外链需要网络及适用仓库权限。

阅读布局：桌面左侧主题树、中央正文、右侧页内目录与展示返回入口；目录与历史页使用相同布局。窄屏通过文档导航菜单和固定的可展开页内目录阅读。

本轮体验自查补充：Demo 末步继续 Agent / 需求章节，跨章按钮说明目标，最终完整文档入口保留返回位置；读者不必回首页重启讲解。右侧页内目录在宽度 ≥768px 常驻且不折叠，手机保留紧凑菜单。

AI 工作流补充参考用户提供的 ai_native_engineering_manual.html、ai_native_implementation_playbook.html、ai-native-workflow.html（2026-10-31）。提炼授权、上下文与 Spec 演进、任务切片和行为 Review，重绘方法图并映射项目现有证据；原 HTML、脚本、Runtime 示例及假设 Trace 未复制为项目事实或执行指令。通用建议不替代项目当前治理规则，也不新增平行计划。

## 可复现检查

`pnpm docs:build` 自动构建并检查产物链接；`pnpm docs:check` 运行源链接测试及断链、禁发文件、符号链接反例。安装仓库根开发依赖后执行 `pnpm exec playwright install chromium`，再运行 `pnpm docs:test`：启动临时预览并检查所有正文图示、完整展示链路、旧入口、刷新/返回和四种窗口宽度。使用系统 Chrome 可设置 `DOCS_BROWSER_CHANNEL=chrome`。

构建需要正常 Git checkout 和完整文件历史，用于将历史材料中已删除的源码链接定位到最后存在的版本。展示摘要中保留的源码外链固定在原选定版本 3275e19，不声称为最新源码；生成的当前文档源码链接则使用构建 revision。未发布，不验证非根部署前缀；该项随部署方案另行处理。

## Vercel 发布

2026-10-31 经 Human 授权上线。项目 `agent-ready-store-docs` 与商城、API 独立，连接同仓库 main，Node.js 24.x，根目录为仓库根，输出 `site/dist`，关闭 Preview 部署。配置保存在 Vercel 项目设置。

安装命令：`npm install --global pnpm@12.11.2 && cd site && pnpm install --frozen-lockfile`。

构建命令：

```sh
git fetch --depth=2147483647 https://github.com/linshuohao/agent-ready-store.git "$VERCEL_GIT_COMMIT_SHA" && git checkout --detach FETCH_HEAD && pnpm docs:build && pnpm docs:check
```

历史文档会引用已删除源码，因此云端需补齐当前部署提交的历史；默认浅检出不足。GitHub Actions 负责业务测试与镜像验证，Vercel Git 集成独立自动发布；目前没有等待 Actions 成功才发布的门禁。文档构建自身必须通过链接、锚点与禁止文件检查。
