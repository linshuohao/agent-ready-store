<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vitepress';
import data from './demo-data.json';
const mode = ref('web'),
  step = ref(0);
const route = useRoute();
const track = computed(() => data[mode.value]);
const item = computed(() => track.value.steps[step.value]);
const evidence = computed(
  () => `/read/decisions.html?from=${mode.value}-${step.value}#current-d-05`,
);
function read() {
  const q = new URL(location.href).searchParams;
  mode.value = q.get('route') === 'quick' ? 'quick' : 'web';
  const n = Number(q.get('step'));
  step.value =
    Number.isInteger(n) && n >= 0 && n < data[mode.value].steps.length ? n : 0;
}
function move(m, n) {
  mode.value = m;
  step.value = n;
  history.pushState(null, '', `/demo.html?route=${m}&step=${n}`);
}
onMounted(() => {
  read();
  window.addEventListener('popstate', read);
});
onUnmounted(() => window.removeEventListener('popstate', read));
</script>
<template>
  <div class="demo-page">
    <nav class="presentation-chapters" aria-label="展示章节">
      <a href="/demo.html" aria-current="true">01 产品 Demo</a
      ><a href="/presentation.html?slide=authorization">02 需求与演进</a
      ><a href="/presentation.html?slide=architecture">03 技术方案</a
      ><a href="/presentation.html?slide=workflow">04 AI 工作流</a>
    </nav>
    <p class="kicker">演示模式 / 产品</p>
    <div class="mode-switch">
      <button
        v-for="(r, key) in data"
        :key="key"
        :aria-pressed="mode === key"
        @click="move(key, 0)"
      >
        {{ key === 'web' ? '网页购物' : 'Agent 按约束直接生单' }}
      </button>
    </div>
    <h1>{{ track.title }}</h1>
    <p class="home-lead">{{ track.intro }}</p>
    <nav class="step-nav">
      <button
        v-for="(s, i) in track.steps"
        :key="s.name"
        :aria-current="step === i ? 'step' : undefined"
        @click="move(mode, i)"
      >
        {{ i + 1 }}. {{ s.name }}
      </button>
    </nav>
    <div class="demo-body">
      <div>
        <figure v-if="item.image">
          <a :href="'/assets/' + item.image" target="_blank"
            ><img :src="'/assets/' + item.image" :alt="item.alt"
          /></a>
          <figcaption>真实线上页面 · 2026-10-31 只读采集</figcaption>
        </figure>
        <div v-else-if="item.prompt" class="prompt">
          <p>示例指令 · 非真实对话记录</p>
          <blockquote>{{ item.prompt }}</blockquote>
          <hr />
          <p>预期工具路径</p>
          <code>{{ item.tools }}</code>
        </div>
        <div v-else class="order-sketch">
          <p>流程示意 · 非实际订单</p>
          <h2>
            {{ item.screen === 'cart' ? '核对本次选中商品' : '核对固定订单' }}
          </h2>
          <dl>
            <div>
              <dt>商品</dt>
              <dd>
                {{
                  mode === 'quick'
                    ? '按用户约束选出的完整目标'
                    : 'P001 · 耳机 × 1'
                }}
              </dd>
            </div>
            <div>
              <dt>金额</dt>
              <dd>商品金额 − 优惠 + 运费</dd>
            </div>
            <div>
              <dt>库存</dt>
              <dd>
                {{
                  item.screen === 'cart' ? '加购不预留' : '生单后预留 15 分钟'
                }}
              </dd>
            </div>
            <div>
              <dt>最终支付</dt>
              <dd>Human 核对后操作</dd>
            </div>
          </dl>
        </div>
      </div>
      <section>
        <p class="kicker">STEP {{ step + 1 }} / {{ track.steps.length }}</p>
        <h2>{{ item.name }}</h2>
        <dl class="explain">
          <div>
            <dt>操作</dt>
            <dd>{{ item.action }}</dd>
          </div>
          <div>
            <dt>可见结果</dt>
            <dd>{{ item.result }}</dd>
          </div>
          <div>
            <dt>说明</dt>
            <dd>{{ item.why }}</dd>
          </div>
        </dl>
        <a v-if="item.url" :href="item.url" target="_blank" rel="noopener"
          >{{ item.link }} ↗</a
        >
        <div class="step-actions">
          <button :disabled="step === 0" @click="move(mode, step - 1)">
            上一步</button
          ><button
            v-if="step < track.steps.length - 1"
            @click="move(mode, step + 1)"
          >
            下一步</button
          ><button v-else-if="mode === 'web'" @click="move('quick', 0)">
            继续：Agent 购物 →</button
          ><a v-else href="/presentation.html?slide=authorization"
            >继续：需求与演进 →</a
          >
        </div>
      </section>
    </div>
    <div class="reading-bridge">
      <strong>为什么购物车不占库存，订单却预留 15 分钟？</strong>
      <p>
        从这里进入产品取舍，再阅读交易设计和验证证据。读完可返回当前路线与步骤。
      </p>
      <a :href="evidence">阅读库存取舍 →</a>
    </div>
    <div class="home-actions">
      <a class="primary" href="/presentation.html?slide=authorization"
        >继续：需求与演进 →</a
      >
    </div>
    <p class="scope-note">
      此页是操作导览，不会自动调用购物工具或支付。实际交易在商城或 Agent Host
      中进行；图示和示例不是执行证据。
    </p>
  </div>
</template>
