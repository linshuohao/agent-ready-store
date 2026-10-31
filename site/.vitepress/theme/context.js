import { ref } from 'vue';
import { slides } from './presentation-nav';
export const origin = ref('');
export function validOrigin(value) {
  if (/^(web|quick)-[0-3]$/.test(value || '')) return true;
  const m = /^show-([a-z]+)-(\d{1,6})$/.exec(value || '');
  return !!m && Number(m[2]) <= 100000 && slides.some((s) => s.id === m[1]);
}
export function syncOrigin() {
  const candidate = new URL(location.href).searchParams.get('from');
  origin.value = validOrigin(candidate) ? candidate : '';
}
export function contextual(url) {
  if (!origin.value) return url;
  const u = new URL(url, 'https://local');
  u.searchParams.set('from', origin.value);
  return u.pathname + u.search + u.hash;
}
export function returnUrl() {
  const m = /^show-([a-z]+)-(\d+)$/.exec(origin.value);
  if (m) return `/presentation.html?slide=${m[1]}&at=${m[2]}`;
  if (!origin.value) return '';
  const [route, step] = origin.value.split('-');
  return `/demo.html?route=${route}&step=${step}`;
}
