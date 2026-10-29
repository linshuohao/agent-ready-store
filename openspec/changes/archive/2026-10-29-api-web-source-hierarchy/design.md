# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. 当前 API 手写源码主要集中在 `apps/api/src/` 根目录，包含应用入口、商品查询、数据库、HTTP 结果封装、seed 与 MCP；商品 HTTP 路由和 health 路由还在同一个 Controller。Web 路由符合 Next.js `app/` 约定，但商品卡、评论、搜索控件等功能组件与通用 `components/ui/`、`lib/` 文件分组较粗。API 测试也集中在 `apps/api/test/`。

约束来自 Approved Technical Design v0.5 §3.4、§5.2、§8.1，以及 Accepted T-01/T-04：Nest 保持薄模块化单体；Catalog 与 Commerce 按业务功能组织；HTTP/MCP Adapter 与可信业务能力分开；Web 页面、Feature、Commands、API Client、展示组件的依赖方向向下。设计建议按实际使用拆文件，不要求四层都建目录，也不引入完整 DDD、Repository 框架或无消费者的抽象。

## Goals / Non-Goals

**Goals:**

- 让目录能直接表达应用入口、业务功能、协议 Adapter、共享代码和数据库生成/访问代码的归属。
- 对移动后的 import、Nest 模块注册、Prisma 生成位置和 seed 入口给出一致方案。
- 保留 Next.js App Router 所要求的路由文件位置，并使功能组件容易从页面追溯。
- 让新切片在出现实际文件时沿功能边界扩展，不预建空目录。

**Non-Goals:**

- 改变 HTTP/MCP 行为、外部路径/DTO、权限、数据所有权、金额计算、业务模块边界或部署拓扑。
- 把所有代码改造成全局 `controllers/`, `services/`, `repositories/`, `use-cases/` 等层目录；不为每个函数增加类、接口或抽象层。
- 重写 Catalog/MCP/数据库逻辑、引入新依赖、调整 Contracts 包或建立 Web 组件库。
- 本 Change 不包含 S2 Cart/Pricing 功能实现；只确定后续功能代码应如何归组。

## Decisions

### 1. 按功能归组，框架入口留在框架要求的位置

选择「应用入口 + 功能目录 + 少量共享/基础设施目录」，而不是先按技术层划分全项目。Nest 模块边界保持薄，Web 页面仍是 Next 路由入口；具体 Controller、组件和 Adapter 放在所属功能附近。只有存在真实消费者时才增设子目录。

**替代方案：**根目录按 `controllers/`, `services/`, `repositories/`, `components/` 分层。它能按技术角色聚类，但需要跨目录追踪单个功能，并容易鼓励当前架构未要求的通用抽象，故不采用。

### 2. API 目标结构

```text
apps/api/src/
  main.ts
  app.module.ts
  app.controller.ts                 # health 与应用级端点
  catalog/
    catalog.module.ts
    catalog.controller.ts           # 商品 HTTP 路由
    catalog.service.ts
    catalog.ts                      # Catalog 查询/投影
  mcp/
    mcp.adapter.ts                  # 现有 Express Streamable HTTP Adapter
  infrastructure/
    database/
      database.ts
      seed.ts
      generated/prisma/              # Prisma generator 输出
  shared/
    app-error.ts
    result.ts
    http-query.ts                    # 仅在多个 HTTP handler 确实复用时保留
```

CatalogModule 注册并导出 CatalogService；根 AppModule 导入 CatalogModule。HTTP 产品 handler 从 AppController 拆到 CatalogController，health 留在应用级入口。MCP 仍由启动入口挂载到 Express，Adapter 调用同一个 CatalogService；不为单一 Adapter 强行创建 Nest MCP Module。错误类型与通用 Result 脱离 Catalog 文件，放入共享目录；HTTP 查询解码/状态映射按实际引用保留在小型 HTTP helper 中，不把它变成协议框架。

数据库 helper、seed 与 Prisma 生成客户端归入 database 基础设施。需要同步更新 Prisma generator 输出路径、所有生成客户端 import 与 `db:seed` 产物路径；生成代码本身不手工编辑。迁移文件仍留在 Prisma 默认 `apps/api/prisma/migrations/`。

### 3. Web 目标结构

```text
apps/web/src/
  app/                              # Next.js 路由、layout、loading/error、全局样式
    page.tsx
    products/[id]/page.tsx
  features/
    product-discovery/
      components/
        product-card.tsx
        reviews.tsx
        search-form.tsx
  components/
    ui/                             # 跨功能共享的基础 UI
  lib/
    api.ts                          # 公共 server API client
    utils.ts                        # 确有跨功能用途的工具
```

Next.js 特殊路由文件不能为追求统一而移出 `app/`。商品发现组件移入 feature 内；`components/ui/` 只保留被多个功能共享或作为基础 UI 的组件。API Client 与通用工具暂留 `lib/`，若未来出现多个职责不同的 client，再按职责拆分。新 Cart 等功能仅在有实际代码时增设对应 Feature 目录。

### 4. 测试与路径配置随源码迁移

API 单元/集成测试按被测功能或协议入口形成可检索的小组，例如 Catalog、HTTP、MCP、Inventory；不为每个测试文件创建一层目录。测试行为和隔离条件不变。Web 当前没有独立 `src` 测试树，本 Change 不预建；未来测试与所属 Feature 保持邻近或沿仓库现有 E2E 入口管理，届时按工具约束决定。

**替代方案：**测试文件完全留在原路径。这样代码变更少，但测试名与路径不能显示被测模块；迁移仅调整路径与 import，因此同本次源码组织一起完成，并以对应测试运行结果证明行为未变。

## Risks / Trade-offs

- **Nest provider 或 module 可见性在拆分后配置错误** → CatalogModule 显式导出被 main.ts/MCP 使用的 CatalogService，并验证模块启动、HTTP 与 MCP 冒烟路径。
- **Prisma generator 或 seed 脚本仍指向旧路径** → 同步更新 schema 输出、生成客户端 imports 和编译后 seed 命令；运行 generate、API build 与 seed 入口的静态/隔离验证。
- **Next 路由文件误移或 alias 失效** → `app/` 特殊文件保持原位，更新 `@/*` imports 后运行 Web typecheck、lint 与 build。
- **过度细分导致目录噪声** → 目录结构是按需规则，不创建空层；仅对现有文件迁移，不预建 Cart、Checkout 或 WebMCP 占位模块。
- **S2 草案与本 Change 同时推进造成同文件路径冲突** → S2 草案继续留在原分支；实施顺序上先完成并审议本目录 Change，再据其落点更新后续实施分支。不得把两个 OpenSpec Change 合并为一个审查范围。

## Migration Plan

1. 在实施 Change 前核对最终目录清单及受影响文件，不包含 S2 新业务实现。
2. 逐功能移动现有源文件与测试，更新 Nest 模块、导入、Prisma 输出配置及 seed 命令；保持逻辑和对外接口不变。
3. 按受影响范围执行 API/Web typecheck、lint、build，并运行 Catalog、HTTP、MCP、Inventory 相关验证；检查 E2E 路由及 `git diff --find-renames`。
4. 回滚采用反向移动文件并恢复对应 import/configuration；不涉及数据库迁移或线上数据回滚。

## Open Questions

无。具体文件清单应在 Tasks 中逐项映射现有路径，若实施时发现方案会改变行为或已批准边界，则停止该部分并回到本 Change 审议。
