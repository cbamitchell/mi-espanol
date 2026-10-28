'use strict';

// Hash router: #/flashcards, #/table/<id>/edit, … Each view renders into #app and sets its own handlers.

const Router = {
  routes: [
    [/^$/, () => Views.home()],
    [/^flashcards$/, () => Views.deck('flashcard')],
    [/^mantras$/, () => Views.deck('mantra')],
    [/^review$/, () => Views.review()],
    [/^study$/, () => Views.study()],
    [/^tables$/, () => Views.tables()],
    [/^table\/([\w-]+)\/edit$/, m => Views.tableEdit(m[1])],
    [/^table\/([\w-]+)\/practice$/, m => Views.tablePractice(m[1])],
    [/^notebook$/, () => Views.notebook()],
    [/^settings$/, () => Views.settings()],
  ],

  go() {
    Store.flush();
    for (const k of ['onclick', 'oninput', 'onchange', 'onpointerdown', 'ontouchstart', 'ontouchend']) $app[k] = null;
    document.onkeydown = null;
    document.body.classList.remove('has-accent-bar');
    document.querySelectorAll('.overlay').forEach(o => o.remove());

    const path = location.hash.replace(/^#\/?/, '');
    for (const [re, view] of this.routes) {
      const m = path.match(re);
      if (m) {
        view(m);
        window.scrollTo(0, 0);
        return;
      }
    }
    location.hash = '#/';
  },
};

// Remember the screens visited so ‹ Back returns to where you came from (e.g. notebook → table → back to notebook).
const trail = [location.hash || '#/'];
window.addEventListener('hashchange', () => {
  const h = location.hash || '#/';
  if (trail.length > 1 && trail[trail.length - 2] === h) trail.pop();
  else trail.push(h);
  Router.go();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-back]');
  if (!b) return;
  if (trail.length > 1) history.back();
  else location.hash = b.dataset.back;
});

// Accent keys type into whichever box has focus. Acting on touchstart/mousedown keeps the keyboard open.
function typeAccent(e) {
  const key = e.target.closest('.accent-key');
  if (!key) return;
  e.preventDefault();
  const el = document.activeElement;
  if (!el || !el.matches('input:not([type=checkbox]):not([type=file]), textarea') || el.readOnly) {
    U.toast('Tap a box first, then the accent');
    return;
  }
  const { selectionStart: a, selectionEnd: b, value } = el;
  el.value = value.slice(0, a) + key.dataset.key + value.slice(b);
  el.setSelectionRange(a + 1, a + 1);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
document.addEventListener('touchstart', typeAccent, { passive: false });
document.addEventListener('mousedown', typeAccent);

// Keep the accent bar above the iPhone keyboard.
if (window.visualViewport) {
  const lift = () => {
    const bar = document.querySelector('.accent-bar');
    if (!bar) return;
    const hidden = window.innerHeight - visualViewport.height - visualViewport.offsetTop;
    bar.style.transform = hidden > 0 ? `translateY(${-hidden}px)` : '';
  };
  visualViewport.addEventListener('resize', lift);
  visualViewport.addEventListener('scroll', lift);
}

// Save any pending typing when the app is closed or backgrounded.
window.addEventListener('pagehide', () => Store.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden) Store.flush(); });

Store.load();
// Ask the browser not to clear our data when space runs low (not every browser honors this).
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
Router.go();
