# 工具集成与验证

核验日期：2026-10-28（Asia/Shanghai）。仅记录实际观察，不把预装工具写成“本轮新安装”。

## 运行环境与安装事实

| 项目 | 实际状态 |
| --- | --- |
| Git | `2.54.0 (Apple Git-157)`；使用现有 Git 用户身份，未改用户配置 |
| Node / npm | `node --version` 为 `v24.22.1`，`npm --version` 为 `12.2.0`；仅为工程工具运行环境，不代表选定业务技术栈 |
| Codex CLI | `0.164.0-alpha.11.1`；本轮主要协作环境为桌面会话 |
| OpenSpec | 已有 npm 全局包 `@fission-ai/openspec@1.15.0`，位于 Node 24.22.1 环境；本轮复用，未新安装/升级 |
| PATH 差异 | 裸 `openspec --version` 为 `1.5.0`；`~/.vite-plus/bin/openspec` 链至 Node 24.18.0 的旧安装，不等于 `npm ls -g` 所见版本 |
| Superpowers | 本桌面会话已发现官方插件 `superpowers`，manifest 版本 `7.0.1`；本轮复用，不重复安装、不复制全套到项目、不修改第三方文件 |

本轮选用的 OpenSpec 可执行路径为：

```sh
OPENSPEC_BIN=/Users/samuel/.vite-plus/js_runtime/node/24.22.1/bin/openspec
"$OPENSPEC_BIN" --version
# 1.15.0
```

本机运行后续 OpenSpec 命令须用这个路径，或只对本次命令前置该 bin 目录到 PATH。换机器时重新定位、确认版本；不要把这个机器路径当作跨机器约定。未修改 shell 配置或全局 PATH。当前官方安装页首推独立二进制安装；本轮因为已有可用版本，无须安装。若以后安装/升级，按官方当时文档执行并 Review 生成差异。

## OpenSpec 原生集成

先检查两个版本的 `--version` 和 `init --help`，再用 1.15.0 在仓库根目录实际执行：

```sh
OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1 "$OPENSPEC_BIN" init \
  --tools codex --profile core --language Chinese --no-animation
```

第一次因项目 `.agents` 受沙箱保护，退出 1；`openspec/` 和中文 config 已生成，Codex 集成未完成。CLI 同时检测到全局 `~/.codex/prompts/opsx-*.md`，会在项目 Skills 生成后尝试清理旧 prompts。为遵守不修改现有全局内容的边界，第二次在获得项目目录写入权限的同时，加 macOS 沙箱禁止写 `~/.codex` 和 `~/.config`：

```sh
OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1 /usr/bin/sandbox-exec \
  -p '(version 1)(allow default)(deny file-write* (subpath "/Users/samuel/.codex") (subpath "/Users/samuel/.config"))' \
  "$OPENSPEC_BIN" init --tools codex --profile core --no-animation
```

第二次退出 0，显示 `Setup complete for Codex`，生成 **6 skills**，Codex 使用 Skills，因此未生成 slash command 文件。CLI 仍打印 5 条旧全局 prompts 删除被拒的警告；它们被刻意保留，不是清理成功。前后 SHA-256 校验全部一致。本轮没有改动这些全局 prompts。

```text
openspec/
├── config.yaml
├── specs/.gitkeep
└── changes/archive/.gitkeep
.agents/skills/
├── .openspec-target                 # codex
├── openspec-explore/SKILL.md
├── openspec-propose/SKILL.md
├── openspec-update-change/SKILL.md
├── openspec-apply-change/SKILL.md
├── openspec-sync-specs/SKILL.md
└── openspec-archive-change/SKILL.md
```

保留原生目录与 `spec-driven` schema，不创建业务 Change。config 只补简短上下文入口；生成的第三方 Skills 未作定制。空目录通过原生 `.gitkeep` 纳入 Git。

## 发现与验证结果

| 检查 | 实际结果与范围 |
| --- | --- |
| CLI 版本 | 所选路径返回 `1.15.0` |
| Codex 原生发现 | 启动本地 `codex app-server`，完成 initialize 后调用 `skills/list`，参数为项目 cwd 与 `forceReload: true`；返回上述 6 个 Skills，均为 `scope: repo`、`enabled: true`，`errors: []` |
| Skill 内容检查 | 读取 `openspec-explore/SKILL.md`，frontmatter `generatedBy: 1.15.0`，并核对初始化检查及只读探索约束；未执行业务 Explore 或生成流程 |
| 根目录与空产物 | `list --json` 返回本项目 root、`changes: []`；`list --specs --json` 返回 `specs: []` |
| 配置健康 | `doctor --json` 返回 `root.healthy: true`、空 status |
| Schema | `schemas --json` 返回 `spec-driven`，原生链为 proposal → specs → design → tasks |
| 规格校验 | `validate --all --strict` 输出 `No items found to validate.`；没有业务规格，不能将其表述为业务验收通过 |
| Superpowers 发现 | 当前桌面会话技能目录含 using-superpowers、TDD、systematic-debugging、requesting-code-review、verification-before-completion 等；本地 `.codex-plugin/plugin.json` 与技能文件可读 |
| Superpowers 使用 | 实际加载 using-superpowers；verification-before-completion 用于核对新证据；requesting-code-review 驱动独立只读 AI 审阅，未发现阻止提交的问题；receiving-code-review 用于核对反馈。详见 AI_NOTES P0-04 |

Codex 原生发现检查不启动模型、不创建聊天或业务任务。首次 app-server 启动受全局 SQLite 运行时沙箱访问限制而失败；允许正常运行时访问后只读查询成功。结果证明项目 Skills 可被 Codex 发现，不代表桌面当前会话选择器已经热刷新；若未显示，重新打开项目/会话。Superpowers 的本次发现证据来自桌面会话，未声称其他 Codex 主机/CLI 环境都已安装。

Superpowers 官方 README 当前为 Codex App 推荐官方插件市场：侧栏 Plugins → Superpowers → `+`；Codex CLI 可从 `/plugins` 搜索安装。当前已安装，无需界面操作；新环境才按官方入口安装并确认授权，不使用旧教程 clone/symlink 覆盖全局 Skills。

## 职责边界与冲突适配

| 能力 | 项目协作规则 |
| --- | --- |
| 正式规格、设计、任务、Change/Archive | 唯一权威为 OpenSpec；不另建 `docs/superpowers/specs`、`docs/superpowers/plans` 或平行任务清单 |
| Superpowers Brainstorming | 可补充讨论方法；复用已确认上下文与 OpenSpec Explore，结论写入规定的全局基线/Decision 或当前 Change，不再生成第二份正式 Spec |
| Planning / Execution | 直接使用 OpenSpec Design/Tasks；执行技能可分解当前任务的临时操作步骤，需保留的任务回写同一 Tasks，不复制为另一份 Plan |
| TDD / Debugging | 按任务风险应用；代码行为更改优先有失败测试再实现，调试先查根因；本轮纯文档与工具初始化没有业务代码测试 |
| Review / Verification | 核对 Spec 与证据，修正后重验；独立 AI Review 有记录时才声称执行过，必要 Human Review 仍保留 |
| Worktree / Finish branch | 按项目授权的分支方式执行；本轮明确使用当前仓库 `docs/governance`，不额外创建 worktree，不触发 Push、PR 或合并 |

技能默认的 Brainstorming → 独立设计文档 → Planning → 独立任务计划，及完成分支时的合并选项，可能与项目规则重叠。以 Human 明确授权、项目规则和 OpenSpec 产物为依据适配，保留质量检查意图；无需为已确认事项重复提问。若某技能硬性要求与当前授权确实无法兼容，说明具体冲突并停止受影响部分，不修改第三方 Skill。已确认需求有变化仍须按 Workflow 审核，不能以“已授权”扩大范围。

原生 schema 的必需 Design 仍须生成；“按需 Design”指深度，不在本轮另造 schema。core 未安装 `openspec-verify-change` 等可选技能，不把它们写成现有入口；通过已安装 Skills、原生 CLI 和质量检查完成流程。

## 后续自定义 Skill

在出现真实重复任务后，由当前切片驱动创建至少一个项目自定义 Skill（预定位置 `.agents/skills/<project-skill>/SKILL.md`），小范围实际使用，再按失败/反馈迭代。先加载当时可用的 Skill 创建规范。AI_NOTES 按版本记录真实调用与变化，不把第三方技能计作自定义产物；本轮自定义 Skill 创建数和使用数均为 0。

## 官方来源

- [OpenSpec 安装](https://openspec.dev/docs/installation)、[初始化](https://openspec.dev/docs/setup)、[CLI](https://openspec.dev/docs/cli)、[Skills](https://openspec.dev/docs/skills)
- [Superpowers 官方 Codex 安装说明](https://github.com/obra/superpowers#codex-app)
- [OpenAI Skills 文档](https://developers.openai.com/codex/skills)

以上页面本轮实际查阅；根站 `openspec.dev/` 一度返回 503，后续官方文档子页可访问。所用参数还经过本机 1.15.0 帮助输出核对。工具升级后需重查文档、版本与发现结果。
