<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vitepress';
const props = defineProps({ active: String });
const emit = defineEmits(['select']);
const route = useRoute();
const opened = ref(false);
watch(
  () => route.path,
  () => {
    opened.value = false;
  },
);
const chapters = [
  { id: 'demo', title: '产品 Demo', href: '/demo.html' },
  {
    id: 'requirements',
    title: '需求与演进',
    href: '/presentation.html?slide=authorization',
    slide: 'authorization',
  },
  {
    id: 'technology',
    title: '技术方案',
    href: '/presentation.html?slide=architecture',
    slide: 'architecture',
  },
  {
    id: 'engineering',
    title: 'AI 工作流',
    href: '/presentation.html?slide=workflow',
    slide: 'workflow',
  },
];
function navigate(event, chapter) {
  if (
    chapter.slide &&
    props.active !== 'demo' &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    event.preventDefault();
    emit('select', chapter.slide);
    opened.value = false;
  }
}
</script>
<template>
  <aside class="showcase-navigation" :data-open="opened">
    <button
      class="showcase-menu-toggle"
      type="button"
      :aria-expanded="opened"
      aria-controls="showcase-menu"
      @click="opened = !opened"
    >
      展示目录 · {{ chapters.find((c) => c.id === active)?.title }}
      <span aria-hidden="true">⌄</span>
    </button>
    <nav id="showcase-menu" aria-label="项目展示目录">
      <template v-for="chapter in chapters" :key="chapter.id">
        <a
          :href="chapter.href"
          :class="{ 'vp-raw': active !== 'demo' && chapter.slide }"
          @click="navigate($event, chapter)"
          :aria-current="active === chapter.id ? 'page' : undefined"
          >{{ chapter.title }}<span aria-hidden="true"> →</span></a
        >
        <div v-if="active === chapter.id" @click="opened = false"><slot /></div>
      </template>
    </nav>
  </aside>
</template>
