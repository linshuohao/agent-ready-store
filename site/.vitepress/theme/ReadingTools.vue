<script setup>
import { contextual } from './context';
defineProps(['source', 'role', 'current', 'historical']);
</script>
<template>
  <div class="reading-tools">
    <a href="/">项目导览</a><span> / 文档阅读</span>
    <p>
      {{ role }} · 来源：<code>{{ source }}</code>
    </p>
    <p v-if="historical" class="history-notice">
      历史记录：保留当时方案与状态，不代表当前行为。<a
        :href="
          contextual(current ? '/read/' + current + '.html' : '/specs.html')
        "
        >阅读现行规范 →</a
      >
    </p>
  </div>
</template>
