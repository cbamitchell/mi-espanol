'use strict';

// Shared helpers. Every file is a plain global script so the app works even when opened straight from disk.

const Views = {};
const $app = document.getElementById('app');

const U = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  },

  cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  // Dates are local "YYYY-MM-DD" strings so "due today" follows your clock, not UTC.
  today(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return U.today(d);
  },

  daysBetween(a, b) {
    return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  },

  prettyDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  },

  intervalLabel(days) {
    if (days < 1) return 'today';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  },

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // ---------- Answer checking ----------
  plain(s) {
    return String(s ?? '').toLowerCase().replace(/[¿¡?!.,;:"“”()]/g, '').replace(/\s+/g, ' ').trim();
  },

  noAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  },

  // 'right' | 'accent' (only accents/ñ differ) | 'wrong' | 'empty'
  check(given, answer) {
    const g = U.plain(given), a = U.plain(answer);
    if (!g) return 'empty';
    if (g === a) return 'right';
    if (U.noAccents(g) === U.noAccents(a)) return 'accent';
    return 'wrong';
  },

  // ---------- UI bits ----------
  render(html) {
    $app.innerHTML = html;
  },

  // The back button goes to the previous screen, or `fallback` if the app was opened on this screen.
  header(title, fallback = '#/', right = '') {
    return `<header class="topbar">
      ${fallback ? `<button class="icon-btn" data-back="${fallback}" aria-label="Back">‹</button>` : '<span></span>'}
      <h1>${U.esc(title)}</h1>
      <div class="topbar-right">${right}</div>
    </header>`;
  },

  toast(msg, ms = 2200) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  },

  // Bottom sheet. Tapping the backdrop closes it unless it holds a form (so typing isn't lost by accident).
  sheet(html, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    let open = true;
    const close = () => {
      if (!open) return;
      open = false;
      overlay.remove();
      if (onClose) onClose();
    };
    overlay.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) close();
      else if (e.target === overlay && !overlay.querySelector('form')) close();
    });
    document.body.appendChild(overlay);
    return { el: overlay.querySelector('.sheet'), close };
  },

  // Promise-based text prompt. Resolves to the trimmed text, or null if cancelled.
  ask(title, value = '', placeholder = '') {
    return new Promise(resolve => {
      let answered = false;
      const { el, close } = U.sheet(`<h2>${U.esc(title)}</h2>
        <form>
          <input name="v" value="${U.esc(value)}" placeholder="${U.esc(placeholder)}" autocomplete="off">
          <div class="btn-row" style="margin-top:14px">
            <button type="button" class="btn" data-close>Cancel</button>
            <button class="btn btn-primary">Save</button>
          </div>
        </form>`, () => { if (!answered) resolve(null); });
      const form = el.querySelector('form');
      form.addEventListener('submit', e => {
        e.preventDefault();
        answered = true;
        resolve(form.elements.v.value.trim() || null);
        close();
      });
      form.elements.v.focus();
    });
  },

  autogrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  },

  // Fixed row of á é í ó ú ñ ü ¿ ¡ keys (handy on a laptop; iPhone also has long-press accents).
  accentBar() {
    document.body.classList.add('has-accent-bar');
    const keys = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'];
    return `<div class="accent-bar" aria-label="Accent keys">${keys.map(k =>
      `<button type="button" class="accent-key" data-key="${k}" tabindex="-1">${k}</button>`).join('')}</div>`;
  },

  // Built-in browser text-to-speech (free, offline on iPhone).
  speak(text) {
    if (!('speechSynthesis' in window)) return U.toast('Speech isn’t available in this browser');
    speechSynthesis.cancel();
    const lang = Store.data.settings.voice;
    const u = new SpeechSynthesisUtterance(String(text).replace(/_+/g, ' … '));
    u.lang = lang;
    u.rate = 0.9;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.replace('_', '-') === lang) || voices.find(v => v.lang.startsWith('es'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  },
};
