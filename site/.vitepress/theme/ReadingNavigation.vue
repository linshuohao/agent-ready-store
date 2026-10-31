<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import { returnUrl, contextual } from './context';
import { slides } from './presentation-nav';
const props = defineProps({ mobile: Boolean });
const route = useRoute();
const headings = ref([]),
  active = ref(''),
  opened = ref(false);
let nodes = [];
const back = computed(returnUrl);
const related = computed(() =>
  slides.filter((s) => s.documents.includes(route.path)),
);
function track() {
  let found = nodes[0]?.id || '';
  for (const n of nodes) {
    if (n.getBoundingClientRect().top <= 150) found = n.id;
    else break;
  }
  active.value = found;
}
async function collect() {
  await nextTick();
  nodes = [
    ...document.querySelectorAll(
      '.source-document h2[id],.source-document h3[id],.library-section h2[id]',
    ),
  ];
  headings.value = nodes.map((n) => ({
    id: n.id,
    title: n.textContent,
    sub: n.tagName === 'H3',
  }));
  opened.value = false;
  track();
}
onMounted(() => {
  collect();
  window.addEventListener('scroll', track, { passive: true });
});
onUnmounted(() => window.removeEventListener('scroll', track));
watch(() => route.path, collect);
</script>
<template>
  <aside
    :class="mobile ? 'reading-mobile-tools' : 'reading-rail'"
    aria-label="本页阅读导航"
  >
    <a v-if="back" :href="back" class="return-demo">← 返回原演示位置</a>
    <details v-if="mobile" :open="opened" @toggle="opened = $event.target.open">
      <summary>
        本页目录 <span>{{ headings.find((h) => h.id === active)?.title }}</span>
      </summary>
      <nav aria-label="本页目录">
        <a
          v-for="h in headings"
          :href="'#' + h.id"
          :class="{ sub: h.sub, active: h.id === active }"
          :aria-current="h.id === active ? 'location' : undefined"
          @click="opened = false"
          >{{ h.title }}</a
        >
      </nav>
    </details>
    <template v-else
      ><p class="rail-label">本页目录</p>
      <nav class="reading-toc" aria-label="本页目录">
        <a
          v-for="h in headings"
          :href="'#' + h.id"
          :class="{ sub: h.sub, active: h.id === active }"
          :aria-current="h.id === active ? 'location' : undefined"
          >{{ h.title }}</a
        >
      </nav>
      <div class="rail-shortcuts">
        <a :href="contextual('/library.html')">完整文档</a
        ><a :href="contextual('/specs.html')">现行规范</a
        ><a :href="contextual('/history.html')">历史记录</a>
      </div>
      <div v-if="related.length" class="rail-related">
        <p class="rail-label">相关展示</p>
        <a v-for="s in related" :href="'/presentation.html?slide=' + s.id"
          >{{ s.title }} →</a
        >
      </div></template
    >
  </aside>
</template>
