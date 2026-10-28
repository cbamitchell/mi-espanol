'use strict';

Views.home = () => {
  const due = Store.due(['flashcard', 'mantra']).length;
  const count = kind => Store.items(kind).length;
  const tables = Store.data.tables.length;
  const pages = Store.data.pages.length;
  const nag = Store.backupNag();
  const hour = new Date().getHours();
  const hello = hour < 12 ? '¡Buenos días!' : hour < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const tile = (href, emoji, title, sub) =>
    `<a class="tile" href="${href}"><span class="tile-emoji">${emoji}</span><span class="tile-title">${title}</span><span class="tile-sub">${sub}</span></a>`;

  U.render(`
    <header class="home-head">
      <div><p class="muted">${hello}</p><h1>Mi español</h1></div>
      <a class="icon-btn" href="#/settings" aria-label="Settings and backup">⚙️</a>
    </header>
    ${nag ? `<a class="banner" href="#/settings">💾 ${nag}</a>` : ''}
    <a class="tile tile-review" href="#/review">
      <span class="tile-emoji">☀️</span>
      <span class="tile-title">Today’s Review</span>
      <span class="tile-sub">${due ? `${plural(due, 'card', 'cards')} waiting for you` : 'All caught up. Nice!'}</span>
    </a>
    <div class="tiles">
      ${tile('#/flashcards', '🃏', 'Flashcards', plural(count('flashcard'), 'card', 'cards'))}
      ${tile('#/mantras', '💬', 'Mantras', plural(count('mantra'), 'phrase', 'phrases'))}
      ${tile('#/tables', '📋', 'Tables', plural(tables, 'table', 'tables'))}
      ${tile('#/notebook', '📓', 'Notebook', plural(pages, 'page', 'pages'))}
    </div>`);
};
