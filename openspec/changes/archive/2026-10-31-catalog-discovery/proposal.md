# Proposal

## Why

当前分类筛选要求调用方知道精确分类名称，Human 需要手输、Agent 只能从商品分页中猜测目录范围。共享真实分类选项，让模糊意图能够先探索再查询，同时改善网页筛选体验。

## What Changes

- 从现有只读目录提供有界、稳定分页的分类发现；仅返回真实分类及可直接用于搜索的值。
- HTTP 与 MCP 共用分类查询，新增无 UI 的 `list_product_categories` 工具；明确需求仍可直接搜索，不强制前置调用。
- 普通 Web 分类输入框改为下拉框，提供“全部分类”，保留 URL 恢复、分页重置及明确错误；Apps 继续不显示搜索表单。
- 将语义／混合搜索登记为后续评估方向：以真实查询的召回、误推荐、延迟及成本决定是否实施，不预选向量数据库。
- 本期不实现动态分面计数、品牌联动、分类树、语义检索或服务端 LLM，不改变排序、精确筛选、交易及权限契约。

授权：2026-10-31 Human 已确认以上规划方向及独立 worktree；Human随后审阅通过，授权复核通过后提交并实施；已另行确认仅分类入口豁免到期清理。Push、Merge及发布未授权。

## Capabilities

### New Capabilities

无；复用商品发现领域。

### Modified Capabilities

- `inventory-reservation`：仅新增分类HTTP/MCP入口豁免请求到期清理，其他入口保持已批准行为。
- `product-discovery`：增加共享分类发现、MCP 探索入口及 Web 分类选择行为。

## Impact

涉及 `packages/contracts`、API Catalog/HTTP/MCP 适配、Web 数据加载及共享 SearchForm。无新增依赖、数据库迁移或原件修改。现有搜索请求与响应兼容，品牌暂保留现有输入方式。具体接口、错误和后续演进见 [Design](design.md)，验收见 [Spec](specs/product-discovery/spec.md)。

依据：现行 product-discovery Spec、DECISIONS D-15/D-19/D-20、Requirements §3.2、Product Design §2 与 Technical Design 的共享业务边界。当前全局基线仍有 Draft 范围，不据此声称本提案已批准。
