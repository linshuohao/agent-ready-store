---
layout: page
---
<div class="hub-home">
<p class="kicker">AGENT / STORE · 项目导览</p>
<h1>一个商店，两种购物方式。<br>从真实体验，读到设计依据。</h1>
<p class="home-lead">用户可以自己选购，也可以给出购买意图与约束，让 Agent 寻找合适商品并准备订单。最后由用户核对固定明细，亲自完成模拟支付。</p>
<div class="home-actions"><a class="primary" href="/demo.html">开始产品 Demo →</a><a href="https://agent-ready-store.vercel.app" target="_blank" rel="noopener">打开在线商店 ↗</a></div>
<nav class="presentation-chapters" aria-label="展示章节"><a href="/demo.html">01 产品 Demo</a><a href="/presentation.html?slide=authorization">02 需求与演进</a><a href="/presentation.html?slide=architecture">03 技术方案</a><a href="/presentation.html?slide=workflow">04 AI 工作流</a></nav>
<section class="agent-connect"><h2>连接 Agent，开始购物</h2><p>在支持 MCP Streamable HTTP 的客户端配置以下地址，通过 Authorization: Bearer &lt;MCP_SERVICE_TOKEN&gt; 认证。访问令牌请向项目维护者获取，不要写入聊天或公开页面。</p>

<CopyText text="https://agent-ready-store-api.vercel.app/mcp" label="复制 MCP 地址" />

<p><a href="/read/agent-connect.html">查看完整接入与兼容说明 →</a></p></section>
<nav class="delivery-views" aria-label="交付导览"><a href="/read/delivery-guide.html">使用与 Demo 路线</a><a href="/library.html">交付物与文档</a><a href="/read/delivery-guide.html#设计解答为什么这样做">设计解答</a><a href="/read/delivery-status.html">验证与边界</a></nav>
<div class="home-library"><a href="/library.html">浏览全部文档 <span>当前方案 / 正式规范 / 历史记录 →</span></a></div>
<section class="home-route"><h2>沿一笔订单，理解项目。</h2><ol><li><a href="/demo.html">产品 Demo</a><p>网页购物、先比较再购买与按约束直接生单，逐步查看操作和结果。</p></li><li><a href="/read/decisions.html#current-d-05">需求与库存取舍</a><p>为什么建车不占库，生单才预留 15 分钟？</p></li><li><a href="/read/checkout.html">交易核心设计</a><p>订单、金额、库存与失败恢复怎样保持一致？</p></li><li><a href="/read/verification.html">验证依据</a><p>回到历史实施与验收记录，核查实际覆盖范围。</p></li></ol></section>
<p class="scope-note">现已接入产品与需求、技术设计、AI 工程、交付证据、正式规范与历史归档。文档正文直接来自仓库，历史记录保留原时点状态；本地构建不代表业务重新验收，也不公开原始题目或凭证。</p>
</div>
