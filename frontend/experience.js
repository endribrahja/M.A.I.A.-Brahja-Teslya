import {esc} from './api.js';

const preference = matchMedia('(prefers-color-scheme: dark)');
const themes = ['auto', 'light', 'dark'];
export function applyTheme(selected = localStorage.getItem('maia-theme') || 'auto') {
  document.documentElement.dataset.theme = selected === 'auto' ? (preference.matches ? 'dark' : 'light') : selected;
  document.documentElement.dataset.themeChoice = selected;
  const button = document.querySelector('[data-action=theme]');
  if (button) button.title = 'Tema ' + ({auto:'automatico', light:'chiaro', dark:'scuro'}[selected]);
}
export function cycleTheme() {
  const next = themes[(themes.indexOf(document.documentElement.dataset.themeChoice) + 1) % themes.length];
  localStorage.setItem('maia-theme', next);
  applyTheme(next);
}
preference.addEventListener('change', () => applyTheme());
applyTheme();

export function openCommands(dialog, pages, navigate) {
  if (dialog.open) return;
  dialog.innerHTML = '<h2 id="dialog-title">Cerca una pagina</h2><input id="command-query" type="search" aria-label="Filtra le pagine"><div class="command-list"></div>';
  const input = dialog.querySelector('input');
  const list = dialog.querySelector('.command-list');
  function filter() {
    list.replaceChildren();
    for (const [id, label] of Object.entries(pages)) {
      if (!label.toLowerCase().includes(input.value.toLowerCase().trim())) continue;
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'secondary';
      option.textContent = label;
      option.onclick = () => { dialog.close(); navigate(id); };
      list.append(option);
    }
    if (!list.childElementCount) list.textContent = 'Nessuna pagina trovata.';
  }
  input.addEventListener('input', filter);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') list.querySelector('button')?.click();
    if (event.key === 'ArrowDown') list.querySelector('button')?.focus();
  });
  filter();
  dialog.showModal();
  input.focus();
}

export function sparkline(days) {
  const recent = days.slice(-14);
  const maximum = Math.max(.01, ...recent.map(row => row.value ?? 0));
  const segments = [];
  let segment = [];
  recent.forEach((row, index) => {
    if (row.value == null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else segment.push([recent.length===1?66:4+index*124/(recent.length-1),27-24*row.value/maximum]);
  });
  if (segment.length) segments.push(segment);
  return '<svg class="sparkline" viewBox="0 0 132 30" preserveAspectRatio="none" aria-hidden="true">' +
    segments.map(points => points.length===1
      ? '<circle cx="'+points[0][0]+'" cy="'+points[0][1]+'" r="2" fill="currentColor"/>'
      : '<polyline fill="none" stroke="currentColor" stroke-width="1.5" points="'+points.join(' ')+'"/>').join('') + '</svg>';
}
