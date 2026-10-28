'use strict';

// Flashcards and Mantras share one screen; only the wording differs.

const DECKS = {
  flashcard: {
    title: 'Flashcards', group: 'category', groups: 'Categories', noun: 'card',
    en: 'English (front)', es: 'Spanish (back)', enPh: 'e.g. tired', esPh: 'e.g. cansado / cansada',
  },
  mantra: {
    title: 'Mantras', group: 'collection', groups: 'Collections', noun: 'phrase',
    en: 'English phrase', es: 'Spanish phrase', enPh: 'e.g. I work as a nurse.', esPh: 'e.g. Trabajo de enfermera.',
  },
};

const DIRS = [['en2es', 'EN → ES'], ['es2en', 'ES → EN'], ['mix', 'Mix']];

// Remembered while the page is open: selected group and search text per deck.
const deckView = { flashcard: { group: 'all', q: '' }, mantra: { group: 'all', q: '' } };

Views.deck = kind => {
  const cfg = DECKS[kind];
  const st = deckView[kind];

  const inGroup = () => Store.items(kind).filter(i =>
    st.group === 'all' ? true : st.group === 'none' ? !i.groupId : i.groupId === st.group);

  const groupTitle = () =>
    st.group === 'all' ? cfg.title : st.group === 'none' ? `No ${cfg.group}` : Store.group(st.group).name;

  const listHTML = () => {
    const q = U.noAccents(U.plain(st.q));
    const items = inGroup().filter(i => !q || U.noAccents(U.plain(`${i.en} ${i.es}`)).includes(q));
    if (!items.length) {
      return `<li class="empty">${q ? 'No matches.' : `<span class="big">✨</span>No ${cfg.noun}s here yet.<br>Tap ＋ to add one.`}</li>`;
    }
    return items.map(i => {
      const s = SRS.status(i);
      return `<li><button class="item-row" data-act="edit" data-id="${i.id}">
        <span class="item-en">${U.esc(i.en)}</span>
        <span class="item-es" lang="es">${U.esc(i.es)}</span>
        <span class="badge ${s.cls}">${s.text}</span>
      </button></li>`;
    }).join('');
  };

  const draw = () => {
    if (!['all', 'none'].includes(st.group) && !Store.group(st.group)) st.group = 'all';
    const all = Store.items(kind);
    const pool = inGroup();
    const due = pool.filter(i => SRS.isDue(i)).length;
    const dir = Store.data.settings.dir[kind];
    const count = id => all.filter(i => (i.groupId || null) === id).length;
    const chip = (id, name, n) =>
      `<button class="chip ${st.group === id ? 'active' : ''}" data-act="group" data-id="${id}">${U.esc(name)}<span class="count">${n}</span></button>`;

    U.render(`
      ${U.header(cfg.title, '#/', `<button class="icon-btn" data-act="add" aria-label="Add ${cfg.noun}">＋</button>`)}
      <div class="chips">
        ${chip('all', 'All', all.length)}
        ${Store.groups(kind).map(g => chip(g.id, g.name, count(g.id))).join('')}
        ${count(null) ? chip('none', `No ${cfg.group}`, count(null)) : ''}
        <button class="chip chip-dashed" data-act="groups">✎ ${cfg.groups}</button>
      </div>
      <section class="card">
        <div class="seg" role="group" aria-label="Which side to show first">
          ${DIRS.map(([v, label]) => `<button class="${dir === v ? 'on' : ''}" data-act="dir" data-dir="${v}">${label}</button>`).join('')}
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" data-act="study-due" ${due ? '' : 'disabled'}>Study due (${due})</button>
          <button class="btn" data-act="study-all" ${pool.length ? '' : 'disabled'}>🔀 Shuffle all (${pool.length})</button>
        </div>
      </section>
      <input class="search" type="search" placeholder="Search ${cfg.noun}s…" value="${U.esc(st.q)}" data-in="search" autocomplete="off">
      <ul class="list" id="deck-list">${listHTML()}</ul>`);
  };

  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const dir = Store.data.settings.dir[kind];
    switch (b.dataset.act) {
      case 'group':
        st.group = b.dataset.id;
        draw();
        break;
      case 'dir':
        Store.data.settings.dir[kind] = b.dataset.dir;
        Store.save();
        draw();
        break;
      case 'add':
        editItem(kind, null, draw, ['all', 'none'].includes(st.group) ? null : st.group);
        break;
      case 'edit':
        editItem(kind, b.dataset.id, draw);
        break;
      case 'groups':
        manageGroups(kind, draw);
        break;
      case 'study-due':
        Study.start({ ids: U.shuffle(inGroup().filter(i => SRS.isDue(i))).map(i => i.id), mode: 'srs', dir, title: groupTitle() });
        break;
      case 'study-all':
        Study.start({ ids: U.shuffle(inGroup()).map(i => i.id), mode: 'practice', dir, title: `${groupTitle()} · shuffle` });
        break;
    }
  };

  $app.oninput = e => {
    if (e.target.dataset.in !== 'search') return;
    st.q = e.target.value;
    document.getElementById('deck-list').innerHTML = listHTML();
  };

  draw();
};

// Add / edit sheet for one card or phrase. Also used from inside a study session.
function editItem(kind, id, onDone, defaultGroup = null) {
  const cfg = DECKS[kind];
  const item = id ? Store.item(id) : null;
  const groupId = item ? item.groupId : defaultGroup;
  const s = item && item.srs;
  const esCaps = kind === 'mantra' ? 'sentences' : 'off';

  const { el, close } = U.sheet(`
    <h2>${item ? `Edit ${cfg.noun}` : `New ${cfg.noun}`}</h2>
    <form>
      <label class="field"><span>${cfg.en}</span>
        <textarea name="en" rows="2" placeholder="${U.esc(cfg.enPh)}">${U.esc(item?.en)}</textarea></label>
      <label class="field"><span>${cfg.es}</span>
        <textarea name="es" rows="2" lang="es" autocapitalize="${esCaps}" autocorrect="off" spellcheck="false" placeholder="${U.esc(cfg.esPh)}">${U.esc(item?.es)}</textarea></label>
      <label class="field"><span>${U.cap(cfg.group)}</span>
        <select name="groupId">
          <option value="">— none —</option>
          ${Store.groups(kind).map(g => `<option value="${g.id}" ${g.id === groupId ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('')}
        </select></label>
      <label class="field"><span>Note or hint (optional)</span>
        <input name="note" value="${U.esc(item?.note)}" placeholder="e.g. irregular in the yo form"></label>
      ${item ? `<p class="muted small">${s ? `Next review ${U.prettyDate(s.due)} · reviewed ${s.reps}× · forgot ${s.lapses}×` : 'Not studied yet.'}</p>` : ''}
      <div class="btn-row">
        <button type="button" class="btn" data-close>Cancel</button>
        ${item ? '' : '<button class="btn" value="more">Save & add another</button>'}
        <button class="btn btn-primary" value="close">Save</button>
      </div>
      ${item ? `<div class="btn-row" style="margin-top:10px">
        <button type="button" class="btn btn-small" data-x="reset">Reset progress</button>
        <button type="button" class="btn btn-small btn-danger" data-x="delete">Delete</button>
      </div>` : ''}
    </form>`);

  const form = el.querySelector('form');
  const f = form.elements;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fields = { en: f.en.value.trim(), es: f.es.value.trim(), groupId: f.groupId.value || null, note: f.note.value.trim() };
    if (!fields.en || !fields.es) return U.toast('Fill in both sides');
    if (item) {
      Object.assign(item, fields);
      Store.save();
    } else {
      Store.addItem(kind, fields);
    }
    onDone();
    if (e.submitter && e.submitter.value === 'more') {
      f.en.value = f.es.value = f.note.value = '';
      f.en.focus();
      U.toast('Saved ✓');
    } else {
      close();
    }
  });

  el.addEventListener('click', e => {
    const x = e.target.closest('[data-x]')?.dataset.x;
    if (x === 'delete' && confirm(`Delete this ${cfg.noun}?`)) {
      Store.deleteItem(item.id);
      close();
      onDone();
    }
    if (x === 'reset' && confirm('Reset progress? It will show up as new again.')) {
      item.srs = null;
      Store.save();
      close();
      onDone();
    }
  });

  if (!item) f.en.focus();
}

// Add / rename / delete categories or collections.
function manageGroups(kind, onDone) {
  const cfg = DECKS[kind];
  const { el } = U.sheet('', onDone);

  const draw = () => {
    const groups = Store.groups(kind);
    el.innerHTML = `<h2>${cfg.groups}</h2>
      <ul class="list">${groups.map(g => `<li class="manage-row">
          <span>${U.esc(g.name)}</span>
          <button class="btn btn-small" data-x="rename" data-id="${g.id}">Rename</button>
          <button class="btn btn-small btn-danger" data-x="delete" data-id="${g.id}">Delete</button>
        </li>`).join('') || `<li class="muted">No ${cfg.groups.toLowerCase()} yet.</li>`}</ul>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn" data-x="add">＋ New ${cfg.group}</button>
        <button class="btn btn-primary" data-close>Done</button>
      </div>`;
  };

  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const g = Store.group(b.dataset.id);
    if (b.dataset.x === 'add') {
      const name = await U.ask(`New ${cfg.group}`, '', kind === 'mantra' ? 'e.g. At the doctor' : 'e.g. Food words');
      if (name) Store.addGroup(kind, name);
    }
    if (b.dataset.x === 'rename') {
      const name = await U.ask(`Rename ${cfg.group}`, g.name);
      if (name) {
        g.name = name;
        Store.save();
      }
    }
    if (b.dataset.x === 'delete') {
      const n = Store.items(kind).filter(i => i.groupId === g.id).length;
      const kept = n ? ` Its ${n} ${cfg.noun}${n === 1 ? '' : 's'} will be kept, just without a ${cfg.group}.` : '';
      if (confirm(`Delete “${g.name}”?${kept}`)) Store.deleteGroup(g.id);
    }
    draw();
  });

  draw();
}
