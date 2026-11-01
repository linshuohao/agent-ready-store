const $ = (id) => document.getElementById(id);
const remembered = { main: 'overview', backup: 'search' };
let current;
function navigate(id) {
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  render();
}
function changeGroup(group) {
  navigate(remembered[group]);
}
function step(delta) {
  const list = slides.filter((s) => s.group === current.group);
  const target = list[list.indexOf(current) + delta];
  if (target) navigate(target.id);
}
function render() {
  current = slides.find((s) => '#' + s.id === location.hash) || slides[0];
  remembered[current.group] = current.id;
  const list = slides.filter((s) => s.group === current.group);
  const index = list.indexOf(current);
  const name = current.group === 'main' ? '主讲' : '备查';
  $('main-mode').setAttribute('aria-pressed', String(current.group === 'main'));
  $('backup-mode').setAttribute(
    'aria-pressed',
    String(current.group === 'backup'),
  );
  $('chapters').innerHTML = list
    .map(
      (s, i) =>
        `<a href="#${s.id}" ${s.id === current.id ? 'aria-current="page"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${s.nav}</a>`,
    )
    .join('');
  $('location').textContent = name + ' / ' + String(index + 1).padStart(2, '0');
  $('screen').innerHTML =
    `<div class="eyebrow"><span>${current.topic}</span><span>${current.group === 'main' ? 'PROJECT PRESENTATION' : 'REFERENCE'}</span></div><h1 id="slide-title">${current.title}</h1><p class="lead">${current.lead}</p><section class="visual" aria-label="核心图示">${current.visual}${current.caption ? `<p class="caption">${current.caption}</p>` : ''}${current.actions ? `<div class="actions">${current.actions.map((a) => `<a class="${a[2] ? 'primary' : ''}" href="${a[1]}" target="_blank" rel="noopener">${a[0]} ↗</a>`).join('')}</div>` : ''}${current.pending ? `<p class="pending">${current.pending}</p>` : ''}</section><section class="explanation" aria-label="设计与实现说明">${current.sections.map(([title, text]) => `<article><h2>${title}</h2><p>${text}</p></article>`).join('')}</section><section class="sources" aria-label="证据入口"><h2>证据与实现</h2><div class="evidence-links">${current.evidence.map((e) => `<a href="${e.path}" target="_blank" rel="noopener">${e.label} ↗</a>`).join('')}</div></section>`;
  $('progress').textContent =
    `${name} ${String(index + 1).padStart(2, '0')} / ${list.length} · ${current.nav}`;
  $('previous').disabled = index === 0;
  $('next').disabled = index === list.length - 1;
  document.title = current.nav + ' · Agent-Ready Store';
  window.scrollTo(0, 0);
}
$('main-mode').onclick = () => changeGroup('main');
$('backup-mode').onclick = () => changeGroup('backup');
$('previous').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else
      $('notice').textContent =
        '当前浏览器不支持页面全屏，请使用浏览器的全屏菜单。';
  } catch {
    $('notice').textContent = '浏览器未允许全屏，请使用浏览器的全屏菜单。';
  }
};
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').textContent = document.fullscreenElement
    ? '退出全屏'
    : '全屏';
});
document.addEventListener('keydown', (e) => {
  if (
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    e.shiftKey ||
    e.target.closest('input,textarea,select,[contenteditable="true"]')
  )
    return;
  const actions = {
    ArrowRight: () => step(1),
    ArrowLeft: () => step(-1),
    m: () => changeGroup('main'),
    b: () => changeGroup('backup'),
  };
  if (actions[e.key]) {
    e.preventDefault();
    actions[e.key]();
  }
});
window.addEventListener('hashchange', render);
render();
