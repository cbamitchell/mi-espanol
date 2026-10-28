'use strict';

// Study notebook: pages you flip through, each holding notes and tables you can drag into order.

function newPage() {
  return {
    id: U.uid(),
    title: `Class · ${U.prettyDate(U.today())}`,
    date: U.today(),
    blocks: [{ id: U.uid(), type: 'note', text: '' }],
  };
}

Views.notebook = () => {
  const d = Store.data;
  if (!d.pages.length) {
    d.pages.push(newPage());
    Store.save();
  }
  let turn = ''; // page-turn animation class for the next draw

  const index = () => {
    d.settings.notebookPage = Math.min(Math.max(0, d.settings.notebookPage), d.pages.length - 1);
    return d.settings.notebookPage;
  };
  const page = () => d.pages[index()];

  const blockHTML = b => {
    let label, body;
    if (b.type === 'note') {
      label = '📝 Note';
      body = `<textarea class="note-area" data-in="note" data-b="${b.id}" rows="3" placeholder="Type your notes…">${U.esc(b.text)}</textarea>`;
    } else {
      const t = Store.table(b.tableId);
      label = t ? `📋 ${U.esc(t.name || 'Untitled')}` : '📋 (table was deleted)';
      body = t ? `${Tables.viewHTML(t)}
        <div class="btn-row">
          <a class="btn btn-small btn-primary" href="#/table/${t.id}/practice">▶ Practice</a>
          <a class="btn btn-small" href="#/table/${t.id}/edit">✏️ Edit</a>
        </div>` : '';
    }
    return `<div class="block" data-b="${b.id}">
      <div class="block-bar">
        <span class="drag-handle" aria-label="Drag to reorder">⠿</span>
        <span class="grow">${label}</span>
        <button class="mini-btn" data-act="up" data-b="${b.id}" aria-label="Move up">↑</button>
        <button class="mini-btn" data-act="down" data-b="${b.id}" aria-label="Move down">↓</button>
        <button class="mini-btn" data-act="remove" data-b="${b.id}" aria-label="Remove from page">✕</button>
      </div>
      ${body}
    </div>`;
  };

  const draw = () => {
    const i = index();
    const n = d.pages.length;
    const p = page();
    U.render(`${U.header('Study notebook', '#/', '<button class="icon-btn" data-act="new-page" aria-label="New page">＋</button>')}
      <div class="nb"><article class="page ${turn}">
        <input class="page-title" data-in="title" value="${U.esc(p.title)}" placeholder="Page title">
        <div class="page-date">${U.prettyDate(p.date)}</div>
        <div class="blocks">${p.blocks.map(blockHTML).join('')}</div>
        <div class="btn-row add-row">
          <button class="btn btn-small" data-act="add-note">＋ Note</button>
          <button class="btn btn-small" data-act="add-table">＋ Table</button>
        </div>
      </article></div>
      <nav class="pager">
        <button class="btn" data-act="prev" ${i === 0 ? 'disabled' : ''} aria-label="Previous page">‹</button>
        <button class="linkish" data-act="toc">Page ${i + 1} of ${n} ▾</button>
        ${i === n - 1
          ? '<button class="btn" data-act="new-page" aria-label="New page">＋</button>'
          : '<button class="btn" data-act="next" aria-label="Next page">›</button>'}
      </nav>
      <details class="card options"><summary>Page options</summary>
        <div class="btn-row">
          <button class="btn btn-small" data-act="move-earlier" ${i === 0 ? 'disabled' : ''}>Move page earlier</button>
          <button class="btn btn-small" data-act="move-later" ${i === n - 1 ? 'disabled' : ''}>Move page later</button>
          <button class="btn btn-small btn-danger" data-act="delete-page">Delete page</button>
        </div>
      </details>`);
    turn = '';
    $app.querySelectorAll('.note-area').forEach(U.autogrow);
  };

  const goTo = (to, anim) => {
    d.settings.notebookPage = to;
    Store.save();
    turn = anim;
    draw();
    window.scrollTo(0, 0);
  };

  const swapPages = (a, b) => {
    [d.pages[a], d.pages[b]] = [d.pages[b], d.pages[a]];
    d.settings.notebookPage = b;
    Store.save();
    draw();
  };

  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const p = page();
    const i = index();
    const bi = p.blocks.findIndex(x => x.id === b.dataset.b);
    switch (b.dataset.act) {
      case 'prev': goTo(i - 1, 'turn-prev'); break;
      case 'next': goTo(i + 1, 'turn-next'); break;
      case 'new-page':
        d.pages.push(newPage());
        goTo(d.pages.length - 1, 'turn-next');
        break;
      case 'toc':
        pageList(to => goTo(to, to < i ? 'turn-prev' : 'turn-next'));
        break;
      case 'add-note':
        p.blocks.push({ id: U.uid(), type: 'note', text: '' });
        Store.save();
        draw();
        [...$app.querySelectorAll('.note-area')].pop().focus();
        break;
      case 'add-table':
        pickTable(t => {
          p.blocks.push({ id: U.uid(), type: 'table', tableId: t.id });
          Store.save();
          draw();
        });
        break;
      case 'up':
      case 'down': {
        const to = b.dataset.act === 'up' ? bi - 1 : bi + 1;
        if (to < 0 || to >= p.blocks.length) return;
        [p.blocks[bi], p.blocks[to]] = [p.blocks[to], p.blocks[bi]];
        Store.save();
        draw();
        break;
      }
      case 'remove': {
        const blk = p.blocks[bi];
        if (blk.type === 'note' && blk.text.trim() && !confirm('Delete this note?')) return;
        p.blocks.splice(bi, 1); // removing a table here only takes it off the page
        Store.save();
        draw();
        break;
      }
      case 'move-earlier': swapPages(i, i - 1); break;
      case 'move-later': swapPages(i, i + 1); break;
      case 'delete-page':
        if (!confirm(`Delete the page “${p.title}”? Tables on it are kept.`)) return;
        d.pages.splice(i, 1);
        if (!d.pages.length) d.pages.push(newPage());
        goTo(Math.max(0, i - 1), 'turn-prev');
        break;
    }
  };

  $app.oninput = e => {
    const el = e.target;
    if (el.dataset.in === 'title') {
      page().title = el.value;
    } else if (el.dataset.in === 'note') {
      page().blocks.find(x => x.id === el.dataset.b).text = el.value;
      U.autogrow(el);
    } else {
      return;
    }
    Store.saveSoon();
  };

  // Drag the ⠿ handle to reorder blocks. Pointer events work for mouse and touch (iPhone included).
  $app.onpointerdown = e => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    e.preventDefault();
    const blockEl = handle.closest('.block');
    const list = blockEl.parentElement;
    blockEl.classList.add('dragging');

    const move = ev => {
      const y = ev.clientY;
      if (y < 80) window.scrollBy(0, -12);
      else if (y > window.innerHeight - 80) window.scrollBy(0, 12);
      const others = [...list.children].filter(el => el !== blockEl);
      const before = others.find(el => {
        const r = el.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      if (before) {
        if (blockEl.nextElementSibling !== before) list.insertBefore(blockEl, before);
      } else if (list.lastElementChild !== blockEl) {
        list.appendChild(blockEl);
      }
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      blockEl.classList.remove('dragging');
      const order = [...list.children].map(el => el.dataset.b);
      page().blocks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      Store.save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  // Swipe left/right on the page to turn it (ignored while typing, scrolling a table or dragging).
  let startX = null, startY = 0;
  $app.ontouchstart = e => {
    if (e.target.closest('input, textarea, .grid-wrap, .drag-handle') || !e.target.closest('.page')) {
      startX = null;
      return;
    }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };
  $app.ontouchend = e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy)) return;
    const i = index();
    if (dx < 0 && i < d.pages.length - 1) goTo(i + 1, 'turn-next');
    if (dx > 0 && i > 0) goTo(i - 1, 'turn-prev');
  };

  draw();
};

// Table of contents: jump to any page.
function pageList(onPick) {
  const { el, close } = U.sheet(`<h2>Pages</h2>
    <ul class="list">${Store.data.pages.map((p, i) => `<li><button class="item-row" data-x="${i}">
      <span class="item-en">${i + 1}. ${U.esc(p.title || 'Untitled')}</span>
      <span class="item-es">${U.prettyDate(p.date)}</span>
    </button></li>`).join('')}</ul>
    <div class="btn-row" style="margin-top:14px"><button class="btn" data-close>Close</button></div>`);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    close();
    onPick(Number(b.dataset.x));
  });
}

// Choose an existing table to put on the page, or make a new one.
function pickTable(onPick) {
  const tables = Store.data.tables;
  const section = (kind, title) => {
    const list = tables.filter(t => t.kind === kind);
    return list.length ? `<h3 class="muted small" style="margin:12px 0 6px">${title}</h3>
      <ul class="list">${list.map(t => `<li><button class="item-row" data-x="${t.id}">
        <span class="item-en">${U.esc(t.name || 'Untitled')}</span><span class="item-es">${Tables.meta(t)}</span>
      </button></li>`).join('')}</ul>` : '';
  };
  const { el, close } = U.sheet(`<h2>Add a table to this page</h2>
    ${section('grammar', 'Grammar tables')}
    ${section('verb', 'Verb tables')}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn" data-close>Cancel</button>
      <button class="btn btn-primary" data-x="new">＋ Make a new table</button>
    </div>`);
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    close();
    if (b.dataset.x === 'new') {
      const name = await U.ask('New table', '', 'e.g. Object Pronouns');
      if (!name) return;
      const t = Store.addTable(Tables.newGrammar(name));
      onPick(t);
      location.hash = `#/table/${t.id}/edit`;
    } else {
      onPick(Store.table(b.dataset.x));
    }
  });
}
