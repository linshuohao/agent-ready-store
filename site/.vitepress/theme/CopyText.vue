<script setup>
import { ref } from 'vue';
const props = defineProps({
  text: { type: String, required: true },
  label: { type: String, required: true },
  rows: { type: Number, default: 1 },
});
const field = ref(null);
const status = ref('');
async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    status.value = '已复制';
  } catch {
    field.value.focus();
    field.value.select();
    status.value = '浏览器未允许复制，内容已选中，请手动复制。';
  }
}
</script>
<template>
  <div class="copy-text">
    <textarea
      ref="field"
      readonly
      :value="text"
      :rows="rows"
      :aria-label="label + '内容'"
    ></textarea>
    <button type="button" @click="copy">{{ label }}</button>
    <p role="status">{{ status }}</p>
  </div>
</template>
