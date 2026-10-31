/* 面向共享屏幕的项目说明；正式契约与验证依据见各屏证据入口。 */
const slides = [
  {
    id: 'overview',
    group: 'main',
    nav: '项目全景',
    topic: 'THE PREMISE',
    title: '同一套购物能力，<br>服务 Human 与 Agent。',
    lead: '从选购到订单，让不同入口遵循相同的业务规则；让用户清楚知道，最后确认了什么。',
    visual:
      '<div class="stack"><div class="layer "><strong>Human / Agent</strong><span>网页直接购物 · MCP 工具 · WebMCP 页面工具</span></div><div class="layer "><strong>MCP Apps</strong><span>MCP 的内嵌 UI 增强；与 Web 复用完整购物应用</span></div><div class="layer dark"><strong>Commerce Core</strong><span>商品查询 / 购物车 / 统一计价 / 订单与库存</span></div></div>',
    caption:
      '当前范围：模拟支付、无账户 Demo。ID 接续不构成生产级身份与访问隔离。',
    evidence: [
      {
        label: '运行与功能入口',
        path: '../README.md',
      },
      {
        label: '购买授权 · 正式 Spec',
        path: '../openspec/specs/agent-purchase-authorization/spec.md',
      },
    ],
    sections: [
      [
        '产品问题',
        '用户让 AI 搜索、比较或加购时，可能还没有决定购买。产品需要保留代办的便利，也要避免把选购行为误判为成交授权。',
      ],
      [
        '设计选择与代价',
        '将“准备订单”与“最终支付”分开：明确购买后允许 Agent 生单，用户核对明细后支付。相比完全自动成交多一次操作，但避免把搜索或加购误当成交授权；相比每步都确认，仍保留代办便利。各入口共用业务能力，代价是必须维护一致的契约与适配层。',
      ],
      [
        '交付范围',
        '已实现持续购物车、分组搜索、订单预留与释放、多入口购物。当前使用模拟支付，不包含账户、真实金流、退款或物流。',
      ],
    ],
  },
  {
    id: 'demo',
    group: 'main',
    nav: '真实购物闭环',
    topic: 'LIVE PRODUCT',
    title: 'Agent 准备订单。<br>Human 核对后支付。',
    lead: '沿同一张订单完成购买，支付结果可以由用户和 Agent 再次查询。',
    visual:
      '<div class="flow"><div class="node "><div class="step">01</div><strong>表达意图</strong><small>搜索与比较；明确商品、数量和预算</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">02</div><strong>准备订单</strong><small>明确购买后生单，固定金额并预留库存</small></div><span class="arrow" aria-hidden="true">→</span><div class="node dark"><div class="step">03</div><strong>Human 支付</strong><small>核对明细，亲自点击模拟支付</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">04</div><strong>查询原单</strong><small>同一 orderId，读取最终事实</small></div></div>',
    caption: '购物链路：选购 → 待支付订单 → Human 支付 → 原单结果。',
    actions: [['打开本地商店', 'http://localhost:3000', true]],
    pending:
      '运行前提：本地 Web / API 与数据库可用。证据范围：已有真实 Host 验收摘要，尚无完整对话或录影的直接入口。',
    evidence: [
      {
        label: 'MCP 接入与 Host 前提',
        path: '../docs/engineering/MCP_CONNECT.md',
      },
      {
        label: '结算实施与验收记录',
        path: '../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md',
      },
    ],
    sections: [
      [
        '问题：对话与交易如何接续',
        '用户可能先咨询，再加购，最后才决定购买。若每次意图变化都另建购物上下文，商品与订单就难以追踪。因此持续保留购物车，咨询只查询、加购只改车，明确购买后才把选中商品转成独立待支付订单。',
      ],
      [
        '选择：原订单承载支付',
        '生单时固定商品、数量、优惠、运费与总额；用户支付更新同一 orderId，Agent 查询的也是原单。固定摘要牺牲了订单内直接改量的灵活性，换来付款内容的确定性；继续购物不会改动已经生成的订单。',
      ],
      [
        '入口差异',
        '基础 MCP 返回网页订单入口；WebMCP 导航到网页订单；支持 MCP Apps 的 Host 展示内嵌订单。Agent 对话结束后，用户仍可通过界面支付原单。',
      ],
    ],
  },
  {
    id: 'authorization',
    group: 'main',
    nav: '购买授权边界',
    topic: 'PRODUCT JUDGMENT / 01',
    title: '四种意图，四条明确边界。',
    lead: '减少操作步骤的前提，是准确理解用户已经授权了什么。',
    visual:
      '<table class="matrix"><thead><tr><th scope="col">用户意图</th><th scope="col">允许发生的动作</th><th scope="col">不推定的权限</th></tr></thead><tbody><tr><td>咨询</td><td>查询商品、规格与评论</td><td>不写购物事实</td></tr><tr><td>加购</td><td>修改购物车</td><td>不自动生单</td></tr><tr><td>明确购买</td><td>生成待支付订单，预留库存</td><td>不自动支付</td></tr><tr><td>Human 点击支付</td><td>支付已核对的原订单</td><td>不授权其他订单</td></tr></tbody></table>',
    caption:
      '评论、型号选择、模型自述都不能替代购买与支付授权。支付未向模型开放；Apps 支付工具仅供 UI Bridge 使用。',
    evidence: [
      {
        label: '产品取舍 · DECISIONS',
        path: '../DECISIONS.md',
      },
      {
        label: '购买授权 · 正式 Spec',
        path: '../openspec/specs/agent-purchase-authorization/spec.md',
      },
    ],
    sections: [
      [
        '选择依据',
        '客服误购投诉与减少操作步骤之间存在冲突。加购不等于购买；明确购买后允许 Agent 完成生单，减少逐步确认，把最终支付保留给用户。',
      ],
      [
        '实现边界',
        '系统不向模型开放支付工具；apps_pay_order 标记为仅供 App UI 使用，也不接受模型通过 userApproved 一类自述参数绕过支付交互。评论和工具返回中的文字不获得用户授权。 Web 通过网页 UI 发起支付，Apps 通过 Human 点击后的 Bridge 直接支付原单，不需要等待模型再次回复。',
      ],
      [
        '代价与限制',
        '保留一次最终操作，增加少量摩擦，换取对具体订单内容的确认。Demo 的点击路径不证明自然人身份，生产环境仍需身份与访问保护。',
      ],
    ],
  },
  {
    id: 'reservation',
    group: 'main',
    nav: '价格与库存承诺',
    topic: 'PRODUCT JUDGMENT / 02',
    title: '购物车是意向。<br>订单是有期限的承诺。',
    lead: '建车不占库；生成待支付订单时固定明细、预留库存。支付消费预留，取消或到期释放。',
    visual:
      '<div class="flow"><div class="node "><div class="step">01</div><strong>购物车</strong><small>金额是当前预估；选中商品准备生单</small></div><span class="arrow" aria-hidden="true">→</span><div class="node dark"><div class="step">02</div><strong>待支付订单</strong><small>固定商品、数量、优惠与总额</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">03</div><strong>支付 / 关闭</strong><small>支付消费预留；取消或到期释放</small></div></div><div class="callout"><b>15 min</b><p>付款窗口的当前默认值。<br>原单到期仍可查看，重新购买按当前条件生成新单。</p></div>',
    caption:
      '取消不会自动回车；窗口内原单不因实时价格变化重算。15 分钟并非由转化数据证明的最优值。',
    evidence: [
      {
        label: '产品取舍 · DECISIONS',
        path: '../DECISIONS.md',
      },
      {
        label: '交易核心 · 状态与恢复',
        path: '../docs/engineering/CHECKOUT_CORE.md',
      },
    ],
    sections: [
      [
        '库存周转与付款确定性',
        '建车可能只是暂存或比较，立即锁库 24 小时会让未决定购买的人长期占用库存。生单时短期预留，既保护付款窗口，也减少闲置占用。',
      ],
      [
        '固定订单内容',
        '生单后商品、数量与金额固定，窗口内不因涨价、降价或优惠变化重算。订单不能原地改量；取消后重新购买使用当前条件。',
      ],
      [
        '实现：短事务维护预留',
        '预留通过库存字段记录，不持有覆盖 15 分钟付款期的数据库锁。生单在同一事务固定订单、增加预留并移出选中车行；支付同时扣减实际库存与预留，关闭只释放预留。后台释放延迟时占用仍保留，可能暂时少卖，但不能提前假设库存已释放。',
      ],
    ],
  },
  {
    id: 'architecture',
    group: 'main',
    nav: '业务规则统一',
    topic: 'ARCHITECTURE / 01',
    title: '入口负责适配，<br>业务规则集中维护。',
    lead: 'HTTP 与 MCP 进入共享业务用例。金额、库存与订单终态由服务端统一裁决。',
    visual:
      '<div class="stack"><div class="layer "><strong>交互入口</strong><span>Web / WebMCP · MCP 工具与 Apps 内嵌体验</span></div><div class="layer "><strong>协议适配</strong><span>HTTP Controller / MCP Adapter</span></div><div class="layer dark"><strong>共享用例</strong><span>商品发现 · CartService · 订单生命周期 · priceSelection</span></div><div class="layer "><strong>持久化</strong><span>Prisma / PostgreSQL · 事务、幂等记录与预留事实</span></div></div>',
    caption: '这张图表达职责分层，不表示每个入口都经过相同的传输协议。',
    evidence: [
      {
        label: '总体技术设计',
        path: '../docs/engineering/TECHNICAL_DESIGN.md',
      },
      {
        label: '后端详细设计',
        path: '../docs/engineering/BACKEND_DESIGN.md',
      },
      {
        label: '统一计价实现',
        path: '../apps/api/src/cart/pricing.ts',
      },
    ],
    sections: [
      [
        '问题与选择：优惠不能按入口分叉',
        '如果网页与 Agent 分别计算优惠，同一件商品就可能出现两种应付金额。因此 HTTP 与 MCP 仅适配协议，共同进入购物服务，统一调用 priceSelection。代价是共享服务的契约变更需要同时检查各入口，不能让某个适配器私自修改业务语义。',
      ],
      [
        '前后端职责',
        '前端负责草稿、反馈、导航和请求恢复；后端核对输入、购买条件与交易约束，数据库事务保存订单、库存和幂等事实。客户端展示金额不构成交易承诺。',
      ],
      [
        '实现：订单与库存一起提交',
        '以生单为例：恢复原请求后，校验车版本与选中集合，按统一顺序锁定库存，再把订单明细、库存预留、车行移除和车版本递增放入同一短事务。中途失败整体回滚，避免“订单成功但库存未占用”或“商品从车里消失但没有订单”。',
      ],
    ],
  },
  {
    id: 'frontend',
    group: 'main',
    nav: '完整前端复用',
    topic: 'FRONTEND / 01',
    title: '共享的是购物应用，<br>不只是几张商品卡。',
    lead: 'Web 与 Apps 共用页面、交互协调、控件和样式；环境差异通过实例级接口注入。',
    visual:
      '<div class="stack"><div class="layer "><strong>薄入口</strong><span>Web：Next 路由与公开首屏 / Apps：Host 初始化与工具结果</span></div><div class="layer dark"><strong>CommerceApplication</strong><span>共享页面 → Hooks 与协调层 → 无 React 的 Commands</span></div><div class="layer "><strong>环境接口</strong><span>Transport · 导航 · 存储 · 分享 · 外部结果接续</span></div><div class="layer "><strong>运行适配</strong><span>Web：HTTP / localStorage　　Apps：Bridge / sessionStorage</span></div></div>',
    caption:
      '源码复用 ≠ 共享会话。每个 Web / Apps 实例独立维护查询副本、草稿、未决请求与位置。',
    evidence: [
      {
        label: '前端详细设计',
        path: '../docs/engineering/FRONTEND_DESIGN.md',
      },
      {
        label: '共享应用入口',
        path: '../packages/commerce-ui/src/application.tsx',
      },
      {
        label: '运行环境接口',
        path: '../packages/commerce-ui/src/runtime.tsx',
      },
    ],
    sections: [
      [
        '问题与取舍：只共享控件仍会重复业务',
        '两端若只共用商品卡，草稿保护、未知恢复和支付交互仍各写一遍，容易逐渐分叉。因此 CommerceApplication 共享页面、Hooks、Commands 与样式。代价是必须提炼环境接口并验证两端行为，共享层不能直接使用 Next 或 Host 专有能力。',
      ],
      [
        '环境适配层',
        'Web 注入 Next 导航、HTTP 和 localStorage；Apps 注入 Host Bridge、内嵌导航与 sessionStorage。共享业务组件不直接依赖 Next Router 或 Host SDK。',
      ],
      [
        '首屏与实例边界',
        'Web 的公开商品首屏由服务端提供，再交共享页面接管交互。每个 Web 或 Apps 实例独立持有查询副本与草稿；共享源码不意味着自动共享身份、会话或状态。',
      ],
    ],
  },
  {
    id: 'state',
    group: 'main',
    nav: '草稿与服务端事实',
    topic: 'FRONTEND / 02',
    title: '输入框里的 3，<br>不等于已保存的 3。',
    lead: '草稿、购物车快照、选中报价和订单事实，各有自己的生命周期。',
    visual:
      '<div class="flow"><div class="node "><div class="step">01</div><strong>输入草稿</strong><small>用户改量；仍是局部状态</small></div><span class="arrow" aria-hidden="true">→</span><div class="node dark"><div class="step">02</div><strong>保存与快照</strong><small>接受目标匹配的服务端车结果</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">03</div><strong>选中报价</strong><small>关联车版本与选择集合</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">04</div><strong>生成订单</strong><small>服务端核对并固定最终明细</small></div></div>',
    caption:
      '旧报价不能作为新选择的预估；外部 Agent 更新也不能直接抹掉用户草稿。',
    evidence: [
      {
        label: '前端详细设计',
        path: '../docs/engineering/FRONTEND_DESIGN.md',
      },
      {
        label: '购物车页面协调',
        path: '../packages/commerce-ui/src/features/cart/use-cart-page.ts',
      },
      {
        label: '购物车 Provider',
        path: '../packages/commerce-ui/src/features/cart/provider.tsx',
      },
    ],
    sections: [
      [
        '问题：用户输入与外部更新会竞争',
        '用户把数量从 1 改成 3 时，输入仍可能尚未保存；与此同时 Agent 也可能更新购物车。若草稿直接覆盖服务端快照，界面就会把未保存数据当事实。系统因此分开局部草稿、已接受的车快照与选中报价，保存成功后才更新权威视图。',
      ],
      [
        '异步结果接收',
        '购物车结果需匹配目标，选中报价关联车版本和选择集合。选择或车版本变化后，旧报价不能作为当前预估；外部更新遇到未保存草稿时保留用户处理空间。',
      ],
      [
        '实现取舍',
        '使用 React state/ref/context 与请求协调，未引入 TanStack Query。跨页 Provider 只承接必要的车上下文，各订单保持独立请求状态，避免一个全局 busy 阻塞继续购物。 这减少了额外状态库依赖，但结果接收与冲突协调需要由页面层明确实现；冲突时显式核对或刷新，比无条件乐观覆盖多一步操作。',
      ],
    ],
  },
  {
    id: 'recovery',
    group: 'main',
    nav: '未知结果恢复',
    topic: 'CORRECTNESS',
    title: '响应丢了，<br>不代表操作失败。',
    lead: '恢复原操作，查询原订单；客户端不能用网络超时推断交易终态。',
    visual:
      '<div class="flow"><div class="node "><div class="step">01</div><strong>发起支付</strong><small>原 orderId 与原请求键</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">02</div><strong>服务端提交？</strong><small>响应丢失，客户端无法确定</small></div><span class="arrow" aria-hidden="true">→</span><div class="node dark"><div class="step">03</div><strong>保留未知</strong><small>不另建单，不换键重买</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">04</div><strong>查询与恢复</strong><small>读取原单事实，明确重试原操作</small></div></div>',
    caption: '倒计时到零只能限制新支付并查询事实，不能自行宣布关闭事务已完成。',
    evidence: [
      {
        label: '交易核心 · 状态与恢复',
        path: '../docs/engineering/CHECKOUT_CORE.md',
      },
      {
        label: '订单页面协调',
        path: '../packages/commerce-ui/src/features/checkout/use-order-page.ts',
      },
      {
        label: '真实数据库生命周期测试',
        path: '../apps/api/test/cart/lifecycle-db.test.ts',
      },
    ],
    sections: [
      [
        '未知与失败不同',
        '请求超时可能发生在服务端提交之后。界面保留原请求信息和未知状态，不能直接宣告失败、另建订单或让用户重新购买。',
      ],
      [
        '恢复路径',
        '写操作前保存请求键。生单未知按原车和创建请求键恢复；支付或取消未知按原 orderId 查询事实。重试沿用原操作，不换键、不延长付款期限。 保留未知会增加一次查询或显式重试，但比把超时当失败后创建新操作更能避免重复交易。',
      ],
      [
        '期限与并发',
        '客户端倒计时只控制展示与新动作，订单终态由服务端裁决。截止前已准入的支付可能稍后提交成功，迟到的成功结果不能被本地超时覆盖。',
      ],
    ],
  },
  {
    id: 'workflow',
    group: 'main',
    nav: 'AI 的执行上下文',
    topic: 'AI COLLABORATION / 01',
    title: '可靠上下文，<br>需要明确谁说了算。',
    lead: '有效契约说明应该怎样，实现说明现在怎样，历史讨论保留推导；三者不能混为一谈。',
    visual:
      '<div class="stack"><div class="layer "><strong>Human 判断</strong><span>关键取舍、契约变化、验收与残余风险</span></div><div class="layer "><strong>AGENTS + Workflow</strong><span>协作入口 · 最小上下文 · 路径与授权边界</span></div><div class="layer dark"><strong>当前 OpenSpec</strong><span>唯一正式的变更级 Spec / Design / Tasks</span></div><div class="layer "><strong>实施与反馈</strong><span>实现 → 验证 → 适用审查 → 修复与重验</span></div></div>',
    caption: '简单局部任务可走轻量路径；不因使用多个工具而维护多套正式计划。',
    evidence: [
      {
        label: 'AI_NOTES · 四个真实关键时刻',
        path: '../AI_NOTES.md',
      },
      {
        label: '项目 Workflow Skill',
        path: '../.agents/skills/ai-native-workflow/SKILL.md',
      },
      {
        label: '自写 Skill 使用与版本口径',
        path: '../docs/engineering/TOOLING.md',
      },
      {
        label: '已有 Workflow 讲解页',
        path: '../docs/presentation/ai-native-workflow.html',
      },
    ],
    sections: [
      [
        '问题：资料多不等于预期明确',
        '长期任务中，旧方案、当前代码和已确认规格可能同时存在。如果 AI 只相信最新文件或现有测试，就可能沿错误预期继续实现。项目将决策与正式规格作为行为依据，代码作为事实证据，历史讨论作为推导材料；冲突明确交由 Human 裁决。',
      ],
      [
        '工作流组织',
        'AGENTS 提供短入口，Workflow 按任务选择上下文与执行路径，OpenSpec 承载唯一正式的变更级 Spec、Design 和 Tasks。简单维护不机械生成完整规划。 这一选择减少重复计划与全量上下文的负担，代价是重要变更必须同步受影响的权威材料，不能靠某一份长文档自动保持一致。',
      ],
      [
        '真实调整',
        '治理审查发现重要交互变化未完整传播到 OpenSpec，随后修订同一增量并复核。自写 Skill 收敛为项目路由与边界适配；使用次数按可复核记录统计，不推导未知总量或效率收益。',
      ],
    ],
  },
  {
    id: 'review',
    group: 'main',
    nav: '反例驱动的审查',
    topic: 'AI COLLABORATION / 02',
    title: '“加了检查”之后，<br>反例仍然可能失败。',
    lead: '数据库切换脚本的真实竞态：第一次检查通过，并不保证提交前仍然安全。',
    visual:
      '<div class="flow"><div class="node "><div class="step">01</div><strong>独立反例</strong><small>另一连接在初查后重连并等待锁</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">02</div><strong>第一次修复</strong><small>补复查，但事务统计快照仍旧</small></div><span class="arrow" aria-hidden="true">→</span><div class="node dark"><div class="step">03</div><strong>定位原因</strong><small>刷新统计快照，再检查阻塞</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">04</div><strong>定向重验</strong><small>并发拒绝、触发器回滚与范围保护</small></div></div>',
    caption:
      '历史工程案例：订单生命周期切换脚本；验证对象与结果见归档 Tasks 和数据库测试。',
    evidence: [
      {
        label: 'AI_NOTES · 四个真实关键时刻',
        path: '../AI_NOTES.md',
      },
      {
        label: '数据库切换并发测试',
        path: '../scripts/checkout-cutover-db.test.mjs',
      },
      {
        label: '切换实现',
        path: '../scripts/checkout-cutover.mjs',
      },
      {
        label: '结算实施与验收记录',
        path: '../openspec/changes/archive/2026-10-31-checkout-lifecycle-redesign/tasks.md',
      },
    ],
    sections: [
      [
        '发现问题',
        '数据库切换脚本初查通过后，另一连接仍可能重连并等待锁。独立审查用真实 PostgreSQL 并发反例证明：初次检查通过不代表清理提交前仍安全。',
      ],
      [
        '修复与再定位',
        '补上提交前复查后，同一反例仍然失败。原因是同一事务内的统计快照保留旧信息；加入 pg_stat_clear_snapshot 后，复查才能观察新的阻塞并拒绝执行。',
      ],
      [
        '验证结论',
        '使用同一并发反例重验，再检查触发器失败整体回滚、新结构拒绝再次清理、范围外数据保持。证据证明这些具体行为，不证明外部写入方永远不会重连。 选择真实数据库并发测试增加了环境与串行执行成本，但 Mock 无法验证数据库统计快照和锁等待时序。',
      ],
    ],
  },
  {
    id: 'search',
    group: 'backup',
    nav: '搜索与不可信数据',
    topic: 'REFERENCE / A',
    title: '有界搜索，明确数据边界。',
    lead: '分组返回候选，保留用户约束；商品评论提供信息，不提供操作授权。',
    visual:
      '<table class="matrix"><thead><tr><th scope="col">主题</th><th scope="col">当前能力</th><th scope="col">边界</th></tr></thead><tbody><tr><td>多目标搜索</td><td>最多 5 组，默认每组 4 项</td><td>有界返回，不承诺十万商品性能</td></tr><tr><td>文字匹配</td><td>简繁规范化、受控中英文别名</td><td>不承诺任意翻译与语义理解</td></tr><tr><td>商品评论</td><td>可查询、可分页阅读</td><td>评论内容不是系统指令</td></tr><tr><td>异常商品数据</td><td>按实际可购买条件反馈</td><td>不把零价、缺货自动理解为禁售</td></tr></tbody></table>',
    evidence: [
      {
        label: '产品取舍 · DECISIONS',
        path: '../DECISIONS.md',
      },
      {
        label: '商品发现 Spec',
        path: '../openspec/specs/product-discovery/spec.md',
      },
      {
        label: '搜索与数据设计',
        path: '../docs/engineering/BACKEND_DESIGN.md',
      },
    ],
    sections: [
      [
        '问题：多个目标不能挤进一份结果',
        '用户同时寻找不同品类时，单一排序可能让一个目标占满结果；无界返回又增加上下文与读取成本。因此按目标分别返回有限候选，最多 5 组、默认每组 4 项，保留预算、品牌和规格约束。',
      ],
      [
        '选择与实现：受控匹配',
        '服务端进行简繁规范化与受控中英文别名匹配，各目标分别返回结果。相比通用语义检索，规则可检查且实现成本较低，代价是不能覆盖任意翻译或自然语言表达。当前未建设大型搜索平台，也没有十万商品性能证据。',
      ],
      [
        '不可信内容的处理',
        '评论采用分页读取，保留参考信息，但其中要求改变数量或直接购买的文字不获得指令权限。该边界与支付工具不可由 Agent 调用共同限制操作范围；它不等于证明模型绝不会受评论内容诱导。',
      ],
    ],
  },
  {
    id: 'evidence',
    group: 'backup',
    nav: '验证证据与限制',
    topic: 'REFERENCE / B',
    title: '每项证据，都有覆盖边界。',
    lead: '测试、真实 Host 与 Human 验收分别证明不同事实；不把一种证据替代另一种。',
    visual:
      '<table class="matrix"><thead><tr><th scope="col">证据</th><th scope="col">证明什么</th><th scope="col">不能替代什么</th></tr></thead><tbody><tr><td>单元 / 契约测试</td><td>计价与边界规则</td><td>真实事务与 Host 行为</td></tr><tr><td>PostgreSQL 集成</td><td>事务、并发、幂等与回滚</td><td>实际浏览器体验</td></tr><tr><td>浏览器测试</td><td>交互与购物流程</td><td>真实 Agent 对话</td></tr><tr><td>Host / Human 验收</td><td>实际入口与人工支付承接</td><td>完整可观看的对话导出</td></tr></tbody></table>',
    caption:
      '历史 CI：9395b0c / run 41167829578。该记录不表示当前分支已重新通过同一套 CI。',
    pending:
      '产品边界：模拟支付、无账户；生产身份隔离、真实支付和上线运行保障不在当前交付范围。',
    evidence: [
      {
        label: '交付状态与证据口径',
        path: '../docs/engineering/DELIVERY_STATUS.md',
      },
      {
        label: 'CI 配置',
        path: '../.github/workflows/ci.yml',
      },
      {
        label: '历史 CI run ↗（需网络与仓库权限）',
        path: 'https://github.com/linshuohao/agent-ready-store/actions/runs/41167829578',
      },
      {
        label: 'GitHub 仓库与历史 ↗（需访问权限）',
        path: 'https://github.com/linshuohao/agent-ready-store',
      },
    ],
    sections: [
      [
        '问题与选择：一种测试无法覆盖全链路',
        'Mock 可以检查响应形状，却不能证明数据库锁与回滚；浏览器夹具可以验证交互，却不能证明真实 Host 承接。因此按风险分层验证，关键交易使用真实 PostgreSQL，协议、界面与 Host 分别举证。代价是需要隔离环境及多套入口验证。',
      ],
      [
        '已有执行结果',
        '修复提交 9395b0c 的 CI run 41167829578 中，Verify 与 Delivery image 通过；数据库／单元 146 项、独立 HTTP／MCP 22 项、桌面／移动购物 10 项通过。单元步骤另有 24 项环境依赖跳过，不计通过；这些数字只对应该提交。',
      ],
      [
        '证据可追溯性',
        'CI 配置说明检查如何运行，具体 run 保存执行结果；归档 Tasks 记录真实 MCP、WebMCP 与 Apps 的订单及 Human 支付验收。现有 Host 材料是验收摘要，没有完整对话或录影的直接入口，因此不能作为完整购物记录观看。',
      ],
    ],
  },
  {
    id: 'scope',
    group: 'backup',
    nav: '多入口的价值与成本',
    topic: 'REFERENCE / C',
    title: '复用降低重复实现，<br>适配与验收仍有成本。',
    lead: '基础 MCP 提供对话式购物；WebMCP 与 Apps 分别扩展网页上下文和对话内的交互体验。',
    visual:
      '<table class="matrix"><thead><tr><th scope="col">入口</th><th scope="col">体验价值</th><th scope="col">特有成本</th></tr></thead><tbody><tr><td>基础 MCP</td><td>对话中搜索、改车与生单，网页接手支付</td><td>工具契约、连接与文本降级</td></tr><tr><td>WebMCP</td><td>在当前网页上下文中协作</td><td>浏览器能力、页面生命周期</td></tr><tr><td>MCP Apps</td><td>在对话中直接呈现共享购物 UI</td><td>Host Bridge、存储与兼容验收</td></tr></tbody></table>',
    evidence: [
      {
        label: 'Agent 接入与兼容说明',
        path: '../docs/engineering/MCP_CONNECT.md',
      },
      {
        label: '技术选择与演进',
        path: '../docs/engineering/ENGINEERING_DECISIONS.md',
      },
      {
        label: '前端详细设计',
        path: '../docs/engineering/FRONTEND_DESIGN.md',
      },
    ],
    sections: [
      [
        '问题：宿主能力并不一致',
        '基础 MCP 可以搜索、改车和生单，但 Human 需要网页完成支付；支持 Apps 的 Host 可以内嵌购物界面；WebMCP 则服务于已经打开的网页。不同宿主决定了接手位置，无法假设所有用户都拥有同一种交互能力。',
      ],
      [
        '选择与代价',
        '基础工具能力保留，Apps 作为 UI 增强，不另建一套交易规则；WebMCP 调用 Web 实例中的共享 Commands。这样可复用已有业务与前端，但仍承担 Host Bridge、浏览器能力、存储恢复和兼容验收的额外成本。',
      ],
      [
        '实现与降级',
        '不支持 Apps 的 Host 继续接收 MCP 文本与结构化结果，并由网页承接 Human 支付；支持 Apps 时通过 Bridge 挂载共享购物应用。降级保留业务入口，但内嵌体验会减少，真实可用性必须分别验证。',
      ],
    ],
  },
  {
    id: 'live',
    group: 'backup',
    nav: '现场工程实践',
    topic: 'REFERENCE / D',
    title: '把临时需求，<br>变成可验证的增量。',
    lead: '变更按影响范围选择执行路径，验收依据来自可观察行为与实际检查结果。',
    visual:
      '<div class="flow"><div class="node "><div class="step">01</div><strong>理解</strong><small>复述目标、范围与验收</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">02</div><strong>判断</strong><small>局部修改或正式契约变化</small></div><span class="arrow" aria-hidden="true">→</span><div class="node dark"><div class="step">03</div><strong>实施</strong><small>沿既有 Workflow 推进</small></div><span class="arrow" aria-hidden="true">→</span><div class="node "><div class="step">04</div><strong>交付</strong><small>效果、相关验证与 Diff</small></div></div>',
    caption: '当前执行方式：按变更影响选择轻量实现或正式规格路径。',
    actions: [['打开本地商店', 'http://localhost:3000', true]],
    evidence: [
      {
        label: '本地开发与测试入口',
        path: '../README.md',
      },
      {
        label: '协作与 Git 约定',
        path: '../AGENTS.md',
      },
      {
        label: 'Workflow Skill',
        path: '../.agents/skills/ai-native-workflow/SKILL.md',
      },
    ],
    sections: [
      [
        '问题：统一重流程会拖慢小改动',
        '按钮文案调整与支付权限变化的风险不同。前者可直接实现并核对页面；后者影响交易契约，必须明确预期、设计和验收。按改动行数或固定步骤分配流程，都可能造成过度处理或漏掉关键风险。',
      ],
      [
        '执行规则与取舍',
        'Workflow 按业务语义、可逆性和验证条件选择路径。局部可逆修改采用聚焦实现与自查；重要行为变化由 OpenSpec 维护规格、设计和任务。代价是需要先判断影响，不能把“很小的需求”自动视为低风险。',
      ],
      [
        '验证与结果',
        '展示样式检查布局与导航；交易改动检查金额、库存、幂等及并发约束，必要时运行真实数据库测试。验证失败回到定位、修复和重验；最终结果包含实际效果、Diff 与未验证边界，代码生成不代表验收完成。',
      ],
    ],
  },
];
