# Proposal

## Why

README、交付导览、Presentation 与 Markdown 设计资料已经存在，但阅读跨越原文件、独立 HTML 和 GitHub，缺少连续导航。需要一个以现有仓库正文为源的静态文档与交付站，让面试官从产品体验进入设计依据、历史与验证证据，再回到展示。

Human 已确认统一站点与双模式，并明确采用 VitePress、授权首个本地阅读链路实施。范围为首页、产品 Demo、库存取舍、交易核心与验证证据；不发布、不分享原始材料，后续 Human 已授权对齐商城样式、取消主题切换并逐步迁入文档；本批清单见 site/content-manifest.mjs，仍不发布。

## What Changes

- 增加统一首页、四章展示入口、按主题组织的 Markdown 阅读器与证据导航。
- 构建时按显式内容清单读取现有正文，渲染 Markdown、表格、代码及 Mermaid；转换站内链接并验证目标与锚点。
- 提供章节目录、文内目录、面包屑、来源及历史标识，支持直达、刷新、后退与返回原展示位置。
- 整合现有 delivery / presentation 的入口职责，保留迁移前链接；不维护第二份完整设计正文。
- 输出仅含批准清单内容的静态文件，先本地验证，不自动发布。原始 references、凭证及未批准协作材料不进入产物。

## Capabilities

### New Capabilities

- `documentation-delivery-hub`：交付入口、连续阅读、展示接续、受控文档发布与静态构建检查。

### Modified Capabilities

无商城业务规格变化。

## Impact

拟新增 `site/` 作为文档构建配置、导航清单与主题的目录；现有 Markdown 路径不迁移。后续可能修改根 package scripts、锁文件及 README / delivery / presentation 的链接与适配代码。推荐 VitePress 静态构建，具体见 Design；新依赖与技术选择待 Human 确认。

现有原工作区的 delivery 未提交修改，以及独立展示 worktree 的 Demo / 需求演进改动，均不被本规划分支覆盖或默认为已合并成果。实施前明确采用版本，再接入该内容。
