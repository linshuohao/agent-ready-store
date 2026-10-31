<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import data from './presentation-data.json';
import WorkflowOverview from './WorkflowOverview.vue';
const index = ref(0),
  slide = computed(() => data.slides[index.value]);
const nextSlide = computed(() => data.slides[index.value + 1]);
const nextLabel = computed(() =>
  !nextSlide.value
    ? ''
    : nextSlide.value.group !== slide.value.group
      ? '进入下一章：' +
        data.chapters.find((c) => c.id === nextSlide.value.group).name
      : '下一屏：' + nextSlide.value.nav,
);
const chapter = computed(() =>
  data.chapters.find((c) => c.id === slide.value.group),
);
function url(id) {
  return '/presentation.html?slide=' + id;
}
async function read() {
  const q = new URL(location.href).searchParams;
  const i = data.slides.findIndex((s) => s.id === q.get('slide'));
  index.value = i < 0 ? 0 : i;
  await nextTick();
  const y = Number(q.get('at'));
  window.scrollTo(0, Number.isFinite(y) && y >= 0 && y <= 100000 ? y : 0);
}
async function choose(id) {
  const i = data.slides.findIndex((s) => s.id === id);
  if (i < 0) return;
  index.value = i;
  history.pushState(null, '', url(id));
  await nextTick();
  window.scrollTo(0, 0);
}
function evidence(url) {
  const u = new URL(url, 'https://local');
  if (u.origin !== 'https://local') return url;
  u.searchParams.set('from', 'show-' + slide.value.id + '-0');
  return u.pathname + u.search + u.hash;
}
function remember(e) {
  const a = e.target.closest('a');
  if (
    !a ||
    !/^\/(read\/|library\.html|specs\.html|history\.html)/.test(
      a.getAttribute('href') || '',
    )
  )
    return;
  const u = new URL(a.href);
  u.searchParams.set(
    'from',
    'show-' + slide.value.id + '-' + Math.round(window.scrollY),
  );
  a.href = u.pathname + u.search + u.hash;
}
function keys(e) {
  if (
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    e.shiftKey ||
    e.target.closest('input,textarea,button,a,select')
  )
    return;
  if (e.key === 'ArrowRight' && index.value < data.slides.length - 1) {
    e.preventDefault();
    choose(data.slides[index.value + 1].id);
  }
  if (e.key === 'ArrowLeft' && index.value > 0) {
    e.preventDefault();
    choose(data.slides[index.value - 1].id);
  }
}
onMounted(() => {
  read();
  window.addEventListener('popstate', read);
  window.addEventListener('keydown', keys);
});
onUnmounted(() => {
  window.removeEventListener('popstate', read);
  window.removeEventListener('keydown', keys);
});
</script>
<template>
  <div
    class="presentation-page"
    @pointerdown="remember"
    @focusin="remember"
    @click.capture="remember"
  >
    <nav class="presentation-chapters" aria-label="展示章节">
      <a href="/demo.html">01 产品 Demo</a
      ><a
        v-for="(c, i) in data.chapters"
        :href="url(c.ids[0])"
        @click.prevent="choose(c.ids[0])"
        :aria-current="c.id === chapter.id ? 'true' : undefined"
        >0{{ i + 2 }} {{ c.name }}</a
      >
    </nav>
    <nav class="presentation-screens" aria-label="本章各屏">
      <a
        v-for="id in chapter.ids"
        :href="url(id)"
        @click.prevent="choose(id)"
        :aria-current="slide.id === id ? 'step' : undefined"
        >{{ data.slides.find((s) => s.id === id).nav }}</a
      >
    </nav>
    <main class="presentation-body" :key="slide.id">
      <header class="presentation-heading">
        <p class="kicker">
          {{ chapter.name }} · {{ index + 1 }} / {{ data.slides.length }}
        </p>
        <p v-if="slide.bridge" class="presentation-bridge">
          {{ slide.bridge }}
        </p>
        <h1 v-html="slide.title"></h1>
        <p class="home-lead">{{ slide.intro || slide.lead }}</p>
      </header>
      <ol v-if="slide.timeline" class="req-timeline">
        <li v-for="[date, title, body] in slide.timeline">
          <span>{{ date }}</span>
          <div>
            <h2>{{ title }}</h2>
            <p>{{ body }}</p>
          </div>
        </li>
      </ol>
      <ol v-if="slide.trail" class="req-trail">
        <li v-for="[title, body] in slide.trail">
          <strong>{{ title }}</strong
          ><span>{{ body }}</span>
        </li>
      </ol>
      <div
        v-if="slide.rows"
        class="req-table-wrap"
        tabindex="0"
        aria-label="需求与方案对照"
      >
        <table class="req-table">
          <thead>
            <tr>
              <th v-for="c in slide.columns" scope="col">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in slide.rows">
              <td v-for="cell in row">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <WorkflowOverview v-if="slide.id === 'workflow'" />
      <div
        v-else-if="slide.visual"
        class="presentation-visual"
        v-html="slide.visual"
      ></div>
      <p v-if="slide.caption" class="presentation-caption">
        {{ slide.caption }}
      </p>
      <section v-if="slide.narrative" class="presentation-narrative">
        <h2>{{ slide.narrativeTitle }}</h2>
        <p>{{ slide.narrative }}</p>
      </section>
      <dl v-if="slide.sections" class="presentation-explanation">
        <div v-for="[title, body] in slide.sections">
          <dt>{{ title }}</dt>
          <dd>{{ body }}</dd>
        </div>
      </dl>
      <p v-if="slide.next" class="presentation-bridge">{{ slide.next }}</p>
      <p v-if="slide.pending" class="scope-note">{{ slide.pending }}</p>
      <section class="presentation-evidence">
        <h2>设计与验证依据</h2>
        <div>
          <a
            v-for="e in slide.evidence"
            :href="evidence(e.url)"
            :target="e.url.startsWith('https:') ? '_blank' : undefined"
            rel="noopener"
            >{{ e.label }} {{ e.url.startsWith('https:') ? '↗' : '→' }}</a
          >
        </div>
        <p>
          文档可继续深入阅读，并返回本屏原位置。历史记录保留当时状态；源码与外部证据可能需要仓库访问权限。
        </p>
      </section>
    </main>
    <footer class="presentation-controls">
      <a v-if="index === 0" href="/demo.html">← 产品 Demo</a
      ><button v-else @click="choose(data.slides[index - 1].id)">
        ← 上一屏</button
      ><span>{{ slide.nav }}</span
      ><button
        v-if="index < data.slides.length - 1"
        @click="choose(data.slides[index + 1].id)"
      >
        {{ nextLabel }} →</button
      ><a v-else :href="evidence('/library.html')">完整文档 →</a>
    </footer>
  </div>
</template>
