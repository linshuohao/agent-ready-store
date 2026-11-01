<script setup>
import DefaultTheme from 'vitepress/theme';
import ReadingNavigation from './ReadingNavigation.vue';
import { useRoute } from 'vitepress';
import { onMounted, watch, nextTick } from 'vue';
import { syncOrigin, validOrigin } from './context';
const route = useRoute();
let generation = 0;
async function update() {
  const own = ++generation;
  await nextTick();
  syncOrigin();
  for (const a of document.querySelectorAll('a[href]')) preserve({ target: a });
  const blocks = [...document.querySelectorAll('.mermaid-source')];
  if (!blocks.length) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
  });
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    try {
      const { svg } = await mermaid.render(
        'diagram-' + own + '-' + i,
        block.textContent,
      );
      if (own !== generation) return;
      const figure = document.createElement('figure');
      figure.className = 'rendered-diagram';
      figure.innerHTML = svg;
      block.replaceWith(figure);
    } catch (e) {
      block.classList.add('diagram-error');
      block.prepend('图示渲染失败：' + String(e) + '\n');
    }
  }
}
function preserve(e) {
  const a = e.target.closest('a');
  if (!a || !a.href) return;
  const u = new URL(a.href);
  const from = new URL(location.href).searchParams.get('from');
  if (
    u.origin === location.origin &&
    (u.pathname.startsWith('/read/') ||
      ['/library.html', '/history.html', '/specs.html'].includes(u.pathname)) &&
    validOrigin(from)
  ) {
    u.searchParams.set('from', from);
    a.href = u.href;
  }
}
onMounted(() => {
  update();
  document.addEventListener('click', preserve, true);
});
watch(() => route.path, update);
</script>
<template>
  <DefaultTheme.Layout
    ><template #aside-top><ReadingNavigation /></template
    ><template #doc-top><ReadingNavigation mobile /></template
  ></DefaultTheme.Layout>
</template>
