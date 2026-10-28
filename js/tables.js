'use strict';

// Grammar tables: any grid you like. You type the answers, then pick which cells become blanks.
// Verb tables live in verbs.js but reuse the practice grid below.

const Tables = {
  newGrammar(name) {
    return {
      id: U.uid(), kind: 'grammar', name, headerRow: true, headerCol: true, createdAt: Date.now(),
      cells: [['', ''], ['', ''], ['', '']],
      blanks: [[false, false], [false, false], [false, false]],
    };
  },

  newVerb(name) {
    return { id: U.uid(), kind: 'verb', name, useVosotros: true, createdAt: Date.now(), verbs: [] };
  },

  isHeader(g, r, c) {
    return (g.headerRow && r === 0) || (g.headerCol && c === 0);
  },

  // Non-label cells that have an answer typed in: [[row, col], ...]
  answerCells(g) {
    const out = [];
    g.cells.forEach((row, r) => row.forEach((v, c) => {
      if (!this.isHeader(g, r, c) && v.trim()) out.push([r, c]);
    }));
    return out;
  },

  blankCount(t) {
    return this.answerCells(t).filter(([r, c]) => t.blanks[r][c]).length;
  },

  // Indexes into PRONOUNS this verb table uses.
  persons(vt) {
    return PRONOUNS.map((_, i) => i).filter(i => vt.useVosotros || i !== 4);
  },

  // A verb table as a plain grid: verbs down the side, persons across the top.
  verbGrid(vt) {
    const ps = this.persons(vt);
    return {
      headerRow: true, headerCol: true, blanks: null,
      cells: [
        ['Verb', ...ps.map(i => PRONOUNS[i])],
        ...vt.verbs.map(v => [v.inf + (v.en ? `\n(${v.en})` : ''), ...ps.map(i => v.forms[i] || '')]),
      ],
    };
  },

  meta(t) {
    if (t.kind === 'verb') return `${t.verbs.length} ${t.verbs.length === 1 ? 'verb' : 'verbs'}`;
    return `${t.cells.length} × ${t.cells[0].length} · ${this.blankCount(t)} blanks`;
  },

  // Read-only grid with the answers showing (used in the notebook).
  viewHTML(t) {
    const g = t.kind === 'verb' ? this.verbGrid(t) : t;
    return `<div class="grid-wrap"><table class="grid">${g.cells.map((row, r) => `<tr>${row.map((v, c) =>
      `<td class="${this.isHeader(g, r, c) ? 'th' : ''}"><div class="cell-text">${U.esc(v)}</div></td>`).join('')}</tr>`).join('')}</table></div>`;
  },
};

// Re-render without losing the sideways scroll position of a wide table.
function keepGridScroll(root, renderFn) {
  const x = root.querySelector('.grid-wrap')?.scrollLeft || 0;
  renderFn();
  const wrap = root.querySelector('.grid-wrap');
  if (wrap) wrap.scrollLeft = x;
}

// ---------- List ----------
Views.tables = () => {
  const draw = () => {
    const tab = Store.data.settings.tableTab;
    const list = Store.data.tables.filter(t => t.kind === tab);
    U.render(`${U.header('Tables', '#/', '<button class="icon-btn" data-act="new" aria-label="New table">＋</button>')}
      <div class="seg">
        <button class="${tab === 'grammar' ? 'on' : ''}" data-act="tab" data-tab="grammar">Grammar tables</button>
        <button class="${tab === 'verb' ? 'on' : ''}" data-act="tab" data-tab="verb">Verb tables</button>
      </div>
      <p class="muted small">${tab === 'grammar'
        ? 'Build any table, type the answers, then pick which cells become blanks.'
        : 'One table per tense. Add verbs and their conjugations, then practice filling in the blanks.'}</p>
      <ul class="list">${list.map(t => `<li class="card table-card">
          <div class="grow"><h3>${U.esc(t.name || 'Untitled')}</h3><div class="muted small">${Tables.meta(t)}</div></div>
          <a class="btn btn-small" href="#/table/${t.id}/edit">✏️ Edit</a>
          <a class="btn btn-small btn-primary" href="#/table/${t.id}/practice">▶ Practice</a>
        </li>`).join('') || `<li class="empty"><span class="big">📋</span>No ${tab === 'verb' ? 'verb ' : ''}tables yet.<br>Tap ＋ to make one.</li>`}
      </ul>`);
  };

  $app.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'tab') {
      Store.data.settings.tableTab = b.dataset.tab;
      Store.save();
      draw();
    }
    if (b.dataset.act === 'new') {
      const verb = Store.data.settings.tableTab === 'verb';
      const name = await U.ask(verb ? 'New verb table' : 'New table', '', verb ? 'e.g. Preterite — irregular' : 'e.g. Object Pronouns');
      if (!name) return;
      const t = Store.addTable(verb ? Tables.newVerb(name) : Tables.newGrammar(name));
      location.hash = `#/table/${t.id}/edit`;
    }
  };

  draw();
};

// ---------- Grammar table editor ----------
Views.tableEdit = id => {
  const t = Store.table(id);
  if (!t) {
    location.hash = '#/tables';
    return;
  }
  if (t.kind === 'verb') return verbEdit(t);

  let mode = 'edit';   // 'edit' = type answers, 'blanks' = tap cells to blank them
  let sel = null;      // [row, col] of the last tapped cell; new rows/columns go after it

  const selLabel = () => sel
    ? `Selected: row ${sel[0] + 1}, column ${sel[1] + 1}. New rows and columns go after it.`
    : 'Tip: tap a cell first to choose where rows and columns go.';

  const draw = () => keepGridScroll($app, () => {
    const rows = t.cells.map((row, r) => `<tr>${row.map((v, c) => {
      const head = Tables.isHeader(t, r, c);
      if (mode === 'blanks') {
        return head
          ? `<td class="th"><div class="cell-text">${U.esc(v) || '&nbsp;'}</div></td>`
          : `<td class="pick ${t.blanks[r][c] ? 'is-blank' : ''}" data-act="pick" data-r="${r}" data-c="${c}"><div class="cell-text">${U.esc(v) || '&nbsp;'}</div></td>`;
      }
      return `<td class="${head ? 'th' : ''}"><input data-in="cell" data-r="${r}" data-c="${c}" value="${U.esc(v)}"
        ${head ? 'placeholder="label"' : 'lang="es" autocapitalize="off" autocorrect="off" spellcheck="false"'}></td>`;
    }).join('')}</tr>`).join('');

    U.render(`${U.header('Edit table', '#/tables', `<a class="btn btn-small btn-primary" href="#/table/${t.id}/practice">▶ Practice</a>`)}
      <label class="field"><span>Table name</span><input data-in="name" value="${U.esc(t.name)}"></label>
      <div class="seg">
        <button class="${mode === 'edit' ? 'on' : ''}" data-act="mode" data-mode="edit">✏️ Type answers</button>
        <button class="${mode === 'blanks' ? 'on' : ''}" data-act="mode" data-mode="blanks">⬜ Pick blanks</button>
      </div>
      <p class="muted small">${mode === 'edit'
        ? 'Grey cells are labels. Type the correct answers in the white cells.'
        : `Tap the cells you want to fill in during practice. <b id="blank-count">${Tables.blankCount(t)}</b> picked.`}</p>
      <div class="grid-wrap"><table class="grid">${rows}</table></div>
      ${mode === 'edit' ? `
        <div class="toolbar">
          <button class="btn btn-small" data-act="add-row">＋ Row</button>
          <button class="btn btn-small" data-act="add-col">＋ Column</button>
          <button class="btn btn-small" data-act="del-row">− Row</button>
          <button class="btn btn-small" data-act="del-col">− Column</button>
        </div>
        <p class="muted small" id="sel-label">${selLabel()}</p>` : `
        <div class="toolbar">
          <button class="btn btn-small" data-act="blank-all">Blank every answer</button>
          <button class="btn btn-small" data-act="blank-random">🎲 Random half</button>
          <button class="btn btn-small" data-act="blank-none">Clear blanks</button>
        </div>`}
      <details class="card options"><summary>Options</summary>
        <label class="check-row"><input type="checkbox" data-in="headerRow" ${t.headerRow ? 'checked' : ''}> First row is labels</label>
        <label class="check-row"><input type="checkbox" data-in="headerCol" ${t.headerCol ? 'checked' : ''}> First column is labels</label>
        <button class="btn btn-small btn-danger" data-act="delete">Delete this table</button>
      </details>
      ${U.accentBar()}`);
  });

  const width = () => t.cells[0].length;
  const hasText = cells => cells.some(v => v.trim());

  const ops = {
    'add-row'() {
      const at = sel ? sel[0] + 1 : t.cells.length;
      t.cells.splice(at, 0, Array(width()).fill(''));
      t.blanks.splice(at, 0, Array(width()).fill(false));
      sel = [at, sel ? sel[1] : 0];
    },
    'add-col'() {
      const at = sel ? sel[1] + 1 : width();
      t.cells.forEach(row => row.splice(at, 0, ''));
      t.blanks.forEach(row => row.splice(at, 0, false));
      sel = [sel ? sel[0] : 0, at];
    },
    'del-row'() {
      if (t.cells.length <= 1) return U.toast('A table needs at least one row');
      const at = sel ? sel[0] : t.cells.length - 1;
      if (hasText(t.cells[at]) && !confirm(`Delete row ${at + 1}?`)) return;
      t.cells.splice(at, 1);
      t.blanks.splice(at, 1);
      sel = null;
    },
    'del-col'() {
      if (width() <= 1) return U.toast('A table needs at least one column');
      const at = sel ? sel[1] : width() - 1;
      if (hasText(t.cells.map(row => row[at])) && !confirm(`Delete column ${at + 1}?`)) return;
      t.cells.forEach(row => row.splice(at, 1));
      t.blanks.forEach(row => row.splice(at, 1));
      sel = null;
    },
    'blank-all'() { setBlanks(Tables.answerCells(t)); },
    'blank-random'() { const cells = Tables.answerCells(t); setBlanks(U.shuffle(cells).slice(0, Math.ceil(cells.length / 2))); },
    'blank-none'() { setBlanks([]); },
  };

  const setBlanks = cells => {
    t.blanks = t.cells.map(row => row.map(() => false));
    cells.forEach(([r, c]) => { t.blanks[r][c] = true; });
  };

  $app.onclick = e => {
    if (e.target.matches('[data-in="cell"]')) {
      sel = [+e.target.dataset.r, +e.target.dataset.c];
      document.getElementById('sel-label').textContent = selLabel();
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'mode') {
      mode = b.dataset.mode;
      draw();
    } else if (act === 'pick') {
      // Toggle in place so a wide table doesn't jump around.
      const r = +b.dataset.r, c = +b.dataset.c;
      t.blanks[r][c] = !t.blanks[r][c];
      b.classList.toggle('is-blank', t.blanks[r][c]);
      document.getElementById('blank-count').textContent = Tables.blankCount(t);
      Store.save();
    } else if (act === 'delete') {
      if (!confirm(`Delete “${t.name}”? This can’t be undone.`)) return;
      Store.deleteTable(t.id);
      location.hash = '#/tables';
    } else if (ops[act]) {
      ops[act]();
      Store.save();
      draw();
      if (sel) $app.querySelector(`[data-r="${sel[0]}"][data-c="${sel[1]}"]`)?.focus();
    }
  };

  $app.oninput = e => {
    const el = e.target;
    if (el.dataset.in === 'cell') t.cells[+el.dataset.r][+el.dataset.c] = el.value;
    else if (el.dataset.in === 'name') t.name = el.value;
    else return;
    Store.saveSoon();
  };

  $app.onchange = e => {
    const k = e.target.dataset.in;
    if (k !== 'headerRow' && k !== 'headerCol') return;
    t[k] = e.target.checked;
    Store.save();
    draw();
  };

  draw();
};

// ---------- Practice ----------
Views.tablePractice = id => {
  const t = Store.table(id);
  if (!t) {
    location.hash = '#/tables';
    return;
  }
  if (t.kind === 'verb') return verbPractice(t);

  U.render(`${U.header(t.name || 'Practice', '#/tables', `<a class="btn btn-small" href="#/table/${t.id}/edit">✏️ Edit</a>`)}
    <div id="practice"></div>
    ${U.accentBar()}`);
  const box = document.getElementById('practice');
  if (!Tables.answerCells(t).length) {
    box.innerHTML = `<p class="empty">This table doesn’t have any answers yet.<br><a href="#/table/${t.id}/edit">Add some</a></p>`;
    return;
  }
  practiceGrid(box, t, Tables.blankCount(t) ? ['mine', 'random', 'all'] : ['all', 'random']);
};

const PICK_LABELS = { mine: 'My blanks', random: '🎲 Random', all: 'All' };

// Fill-in-the-blank quiz on any grid, rendered into `box`.
// `choices` lists which blank modes to offer: 'mine' (cells picked in the editor), 'random' (half), 'all'.
function practiceGrid(box, g, choices) {
  let pick = choices[0];
  let blanks, answers, checked;

  const reset = () => {
    const cells = Tables.answerCells(g);
    let chosen = pick === 'all' ? cells
      : pick === 'random' ? U.shuffle(cells).slice(0, Math.ceil(cells.length / 2))
      : cells.filter(([r, c]) => g.blanks && g.blanks[r][c]);
    if (!chosen.length) chosen = cells;
    blanks = new Set(chosen.map(([r, c]) => `${r},${c}`));
    answers = {};
    checked = false;
  };

  const label = (r, c) => [g.headerCol ? g.cells[r][0] : '', g.headerRow ? g.cells[0][c] : '']
    .filter(Boolean).join(', ').replace(/\n/g, ' ');

  const draw = () => keepGridScroll(box, () => {
    let right = 0, almost = 0;
    const rows = g.cells.map((row, r) => `<tr>${row.map((v, c) => {
      const key = `${r},${c}`;
      if (!blanks.has(key)) {
        return `<td class="${Tables.isHeader(g, r, c) ? 'th' : ''}"><div class="cell-text">${U.esc(v)}</div></td>`;
      }
      const res = checked ? U.check(answers[key], v) : '';
      if (res === 'right') right++;
      if (res === 'accent') almost++;
      return `<td class="blank-cell ${res ? 'res-' + res : ''}">
        <input data-k="${key}" value="${U.esc(answers[key])}" aria-label="${U.esc(label(r, c))}"
          lang="es" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="next">
        ${res && res !== 'right' ? `<span class="correct">${res === 'accent' ? 'Check accents: ' : ''}${U.esc(v)}</span>` : ''}
      </td>`;
    }).join('')}</tr>`).join('');
    const total = blanks.size;
    const perfect = checked && right === total;

    box.innerHTML = `
      ${choices.length > 1 ? `<div class="seg">${choices.map(p =>
        `<button class="${p === pick ? 'on' : ''}" data-pa="pick" data-p="${p}">${PICK_LABELS[p]}</button>`).join('')}</div>` : ''}
      ${checked ? `<div class="score ${perfect ? 'perfect' : ''}"><b>${right} / ${total}</b> correct${almost ? ` · ${almost} almost (accents)` : ''}${perfect ? ' · ¡Perfecto! 🎉' : ''}</div>` : ''}
      <div class="grid-wrap"><table class="grid">${rows}</table></div>
      <div class="btn-row">
        ${checked && !perfect ? '<button class="btn btn-primary" data-pa="fix">Fix my mistakes</button>' : '<button class="btn btn-primary" data-pa="check">✓ Check answers</button>'}
        <button class="btn" data-pa="again">↺ Start over</button>
      </div>`;
  });

  const check = () => {
    checked = true;
    draw();
  };

  box.oninput = e => {
    const k = e.target.dataset.k;
    if (!k) return;
    answers[k] = e.target.value;
    if (checked) e.target.closest('td').className = 'blank-cell';
  };

  // Enter jumps to the next blank; on the last one it checks.
  box.onkeydown = e => {
    if (e.key !== 'Enter' || !e.target.dataset.k) return;
    e.preventDefault();
    const inputs = [...box.querySelectorAll('input[data-k]')];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus();
    else {
      e.target.blur();
      check();
    }
  };

  box.onclick = e => {
    const b = e.target.closest('[data-pa]');
    if (!b) return;
    if (b.dataset.pa === 'pick') {
      pick = b.dataset.p;
      reset();
    }
    if (b.dataset.pa === 'again') reset();
    if (b.dataset.pa === 'check') checked = true;
    if (b.dataset.pa === 'fix') {
      // Keep what was right, clear the rest, and jump to the first gap.
      for (const key of blanks) {
        const [r, c] = key.split(',').map(Number);
        if (U.check(answers[key], g.cells[r][c]) !== 'right') delete answers[key];
      }
      checked = false;
      draw();
      [...box.querySelectorAll('input[data-k]')].find(i => !i.value)?.focus();
      return;
    }
    draw();
  };

  reset();
  draw();
}
