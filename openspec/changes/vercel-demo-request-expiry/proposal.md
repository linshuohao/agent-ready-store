## Why
短期 Demo 必须免费且无需绑卡。Human 于 2026-10-31 明确同意使用 Vercel 前端、NestJS Functions 后端和现有 Neon，以及请求触发到期清理，不新增常驻 Worker。

## What Changes
- 云端配置启用请求触发的有界到期清理；本地/Docker 默认定时扫描不变。
- 接受云端无人访问时不主动释放，不承诺截止后5秒物化；支付截止和库存事务不变。
- 配置 NestJS Functions 的构建、商品数据和 MCP Apps 资源，移除未部署成功的 Render 配置。

## Capabilities
### New Capabilities
无。
### Modified Capabilities
- `inventory-reservation`: 为免费 Demo 增加请求触发释放模式。

## Impact
API 启动、到期执行器、REST/MCP 入口、部署配置与说明。数据库结构、金额、订单生命周期和对外接口保持不变。已有用户授权覆盖实施、提交、推送和免费部署；不含付费升级或本 PR 合并。
