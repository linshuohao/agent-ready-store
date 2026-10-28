# 工具与关键验证

仅在定位工具或核对关键验证事实时读取；不保留安装流水、临时路径、逐轮检查报告。以下为 2026-10-28 的实际记录，不代表业务技术栈选型。

## 工具入口

- OpenSpec 1.15.0：本机裸 `openspec` 已可用；换环境先用 `command -v openspec`、`openspec --version` 确认，不依赖个人绝对路径。保留原生 spec-driven 与 6 个 core Skills，未重复初始化。
- Codex CLI 0.164.0-alpha.11.1；项目 Skills 位于 `.agents/skills/`。显式 `$skill-name` 或由宿主读取实际 SKILL.md 并应用，不把它当 shell 命令或伪造自动委托。发现不等于实际应用。
- Superpowers 7.0.1：复用现有插件的 TDD、调试、审阅和完成验证；与项目授权冲突的额外计划、重复审批或自动推送不适用，不修改第三方文件。
- core 未安装 openspec-verify-change，CLI 无通用 `openspec verify`；status/validate 检查产物或结构，行为正确性还需真实测试与契约审阅。Codex Review 的实际参数先查 `codex review --help`。

## Skill 关键变更与验证摘要

下表只统计专门的集成验证，不是日常调用总量；加载、格式校验、发现和实际应用分别判断，不为凑版本或次数制造事件。

| 版本 / 关键变更 | 真实验证 | 覆盖边界 |
| --- | --- | --- |
| Workflow v0.1：建立任务路由 | 2 次独立只读应用：文档预检 → Direct，复杂需求 → Explore；格式、原生发现通过 | 仅路由预检；不等于业务实现 |
| Workflow v0.2 + Review v0.1：单向横向审查 | 3 个独立上下文各实际应用两个 Skill：真实 Design、模拟 Behavioral、真实 Delivery；低风险子活动仅做 L0/L1；格式与原生发现通过 | Design 未批准规则；模拟并发反例真实运行，但不是商城缺陷；Delivery 核对七个文件哈希后复用证据 |
| Workflow v0.3：文档引用与记录策略收敛 | 本轮仅做格式、引用、迁移完整性和 HTML 静态检查；未重复运行模型路由案例 | Review 方法未变；旧版本验证不冒称新版本完整验证，浏览器渲染预览受本地文件协议策略限制未完成 |
| Workflow v0.4：任务切换与 Git 收尾提醒 | 本轮实际核对 Git 状态与任务范围，确认治理文档补充可在原分支继续；Skill 格式、相关本地链接与 Diff 空白检查通过 | 仅当前任务预检与静态验证；未运行独立的无关任务切换案例，未执行提交或分支切换 |
| Workflow v0.5 + Review v0.2：产品、设计与交付集成 | 修改前 1 个独立上下文应用旧版两个 Skill，发现 UI/UX、总体技术方案、最终交付缺少明确输出/检查；修改后 1 个全新上下文显式读取并应用新版两个 Skill，完成 A–G 七项只读模拟路由；另 1 个独立上下文应用 Review 做真实治理 Design/Delivery 审查，发现重要交互传播遗漏相关 OpenSpec，修订后复核关闭。两个 Skill 的 quick_validate、相关本地链接/锚点、Git 空白检查通过 | A 新需求、B UI/UX、C 技术选型、D 总体方案、E 功能切片、F 局部 Bug、G 最终交付均为模拟请求；未产生业务设计/代码、真实购物 Agent 或 CI 结果。属于代表性应用验证，不是自动触发成功率或业务验收 |

历史两次原生发现均返回相应项目 Skills 为 repo/enabled、errors=[]。本轮通过 Codex app-server 的 `initialize → skills/list`（项目 cwd、forceReload=true）再次发现 Workflow/Review，返回更新后的 description、repo/enabled、errors=[]；首次受沙箱禁止状态目录初始化阻断，获准访问本地 Codex 状态后同一查询成功，未创建线程或调用模型。显式读取并应用可用；自动触发、桌面选择器刷新、CLI 模型审阅、真实业务和完整 Apply/Archive 尚未验证。

本轮 `openspec --version` 为 1.15.0，`list --json` 返回本仓库 root、changes=[]，`schemas --json` 仍为原生 spec-driven（proposal/specs/design/tasks）；`validate --all --json` 返回 0 items，不算业务验收。两个只读原件哈希与下方基线一致；DECISIONS、AI_NOTES、Handoff 模板及既有讲解 HTML 均未改动。未重新初始化工具或修改第三方 Skills。

原件 SHA-256 基线：

```text
5db27433fe19761c6a9def418913498adbb8d316c061ff532e387a1975f6be0a  references/home-quiz.md
c0c09b271f528fab8925eab041982c056dd94f3e38183976102139050c020889  references/products.json
```

后续只有首次有效使用、行为性版本变更、重要失败/纠偏才补简短记录；普通验证放当前任务/PR，重大决策归 ENGINEERING_DECISIONS，关键人工协作归 AI_NOTES。
