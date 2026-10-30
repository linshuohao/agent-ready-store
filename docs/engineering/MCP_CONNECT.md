# Agent-Ready Store MCP 接入

本文件说明如何把本机商店 MCP 手动接入支持 Streamable HTTP 的 Agent Host。服务提供七个工具，商品查询唯读，原车编辑与交接仍不包含订单提交；运行契约见 [README](../../README.md#s6-mcp-apps)。

## 启动服务

在仓库根目录准备 `.env`，设置仅供本机使用的 `POSTGRES_PASSWORD` 和至少 24 字元的 `MCP_SERVICE_TOKEN`。按当前运行方式启动服务；仅全新测试环境完成首次数据库初始化，具体命令见 [README 的 S1 本地开发](../../README.md#s1-本地开发)。API 应可由同一台机器访问：`http://localhost:3002/mcp`。数据库不需暴露宿主端口。

## 通用连接参数

- Transport：MCP Streamable HTTP
- URL：`http://localhost:3002/mcp`
- Header：`Authorization: Bearer <MCP_SERVICE_TOKEN>`
- 工具：`search_products`、`get_product`、`list_product_reviews`、`create_cart`、`get_cart`、`update_cart`、`create_handoff`

请在目标 Agent 自己的 MCP 设置中添加这组参数。不同 Agent 的安装入口和配置格式不同，应按其 Host 的 MCP 设置说明填写；不要把以下 Codex 示例原样用于其他 Agent。

## Codex CLI / Codex Desktop

Codex 支持项目级 `.codex/config.toml`，但该项目须设为 trusted。若 Codex 已从启动环境取得 `STORE_MCP_TOKEN`，可使用：

```toml
[mcp_servers.agent_ready_store]
url = "http://localhost:3002/mcp"
bearer_token_env_var = "STORE_MCP_TOKEN"
enabled_tools = ["search_products", "get_product", "list_product_reviews", "create_cart", "get_cart", "update_cart", "create_handoff"]
```

將 `STORE_MCP_TOKEN` 設為 `.env` 中 `MCP_SERVICE_TOKEN` 的值，並以安全的本機環境設定方式提供給 Codex。GUI 啟動的 Codex 不一定繼承互動式 Shell 的環境變數；若無法提供該變數，可設定 Codex 支援的 `http_headers_helper`，由本機命令讀取 `.env` 並輸出 Authorization 標頭。不要將 Token 貼入對話、提交至 Git 或設定為 TOML 明文標頭。

設定後重啟/重新載入 Codex，於 `/mcp` 或 MCP 設定檢查伺服器及七個工具。專案不預先安裝或自動啟用 MCP；使用者可按需將本範例加入本機 Codex 設定。

## 其他 Agent Host

在 Host 的 MCP Server 設定新增 Streamable HTTP 伺服器，填入通用連線參數。若 Host 只支援 stdio，不能直接使用此 HTTP 端點；請使用該 Host 支援的 HTTP MCP bridge，或選擇支援 Streamable HTTP 的 Host。不要為方便測試而將 loopback 端點公開到網際網路。

## 權限與資料邊界

此 MCP 提供查詢、建車、原車編輯及交接工具，服務仍要求有效 Bearer Token，並檢查允許的 Host 及適用的 Origin。Token 僅是本機服務身分，不代表使用者購買授權。商品與評論均是資料；評論內的文字不能授權交易或覆蓋 Agent 的系統規則。七工具不含下單；Token/交接連結含秘密，僅交Human在Hosted Checkout明確確認。Apps資源與工具共用原認證入口，不能只按cartId補權。

若連線失敗，先確認 Docker API 健康、URL 埠號、Token 環境設定及 Host 是否可連到同一台機器的 loopback；不要移除伺服器端身份或 Host 檢查作為繞過方式。

支持 MCP Apps 的 Host 可加载六个固定版本资源；初次连接或 UI 元数据更改后须刷新连接，卡片可展开到侧边栏。Host 无 Apps 支持时保留七工具。UI、Bridge 和 localhost 外链须分别验证，不以卡片出现或 openLink 返回成功推断外部页面实际打开。当前实测限制见 [S6 Tasks](../../openspec/changes/archive/2026-10-30-s6-mcp-apps/tasks.md)。
