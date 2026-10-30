# Proposal

## Why

本地开发被完整生产构建和 Docker 开发卷绑住，初始化与启动入口重复编译且 Apps 更新不连续。Human 于 2026-10-30 明确要求本机开发、Docker 主要服务交付，并授权修复命令及构建流水线。

## What Changes

- 本机 dev 自动准备必要编译与监听，seed 不依赖 Web 生产构建。
- **BREAKING** 移除 Docker 开发模式、dev:deps/dev:docker 与 production overlay；默认 Compose 使用生产镜像。
- 收敛镜像构建、显式迁移和启动命令，CI 验证镜像而不发布。
- 同步当前使用文档和 T-06 补充，历史归档保留。

## Capabilities

### New Capabilities

无；纯工程工具和交付流程变更，skip_specs: true。

### Modified Capabilities

无；不改变商店 API、购买权限或数据契约。

## Impact

package scripts、开发进程管理、Apps 打包、Docker/Compose、CI、README。无新增依赖，不操作现有业务库、不提交/推送/发布镜像。
