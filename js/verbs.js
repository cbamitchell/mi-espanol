'use strict';

// Verb tables: one table per tense, one row per verb, one box per person (yo, tú, …).
// Routed through Views.tableEdit / Views.tablePractice in tables.js.

const ES_INPUT = 'lang="es" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"';

function verbEdit(t) {
  const draw = () => {
    const ps = Tables.persons(t);
    U.render(`${U.header('Edit verb table', '#/tables', `<a class="btn btn-small btn-primary" href="#/table/${t.id}/practice">▶ Practice</a>`)}
      <label class="field"><span>Table name (tense)</span><input data-in="name" value="${U.esc(t.name)}"></label>
      <label class="check-row"><input type="checkbox" data-in="vos" ${t.useVosotros ? 'checked' : ''}> Include vosotros</label>
      ${t.verbs.map((v, vi) => `<section class="card verb-card">
        <div class="verb-head">
          <label class="form-field"><span>Verb</span><input data-in="inf" data-v="${vi}" value="${U.esc(v.inf)}" placeholder="hablar" ${ES_INPUT}></label>
          <label class="form-field"><span>Meaning</span><input data-in="en" data-v="${vi}" value="${U.esc(v.en)}" placeholder="to speak"></label>
          <button class="mini-btn" data-act="del" data-v="${vi}" aria-label="Delete verb">🗑</button>
        </div>
        <div class="forms">${ps.map(i => `<label class="form-field"><span>${PRONOUNS[i]}</span>
          <input data-in="form" data-v="${vi}" data-f="${i}" value="${U.esc(v.forms[i])}" ${ES_INPUT}></label>`).join('')}</div>
      </section>`).join('') || '<p class="empty">No verbs yet. Add your first one.</p>'}
      <button class="btn btn-block" data-act="add">＋ Add verb</button>
      <details class="card options" style="margin-top:12px"><summary>Options</summary>
        <button class="btn btn-small btn-danger" data-act="delete">Delete this table</button>
      </details>
      ${U.accentBar()}`);
  };

  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'add') {
      t.verbs.push({ id: U.uid(), inf: '', en: '', forms: ['', '', '', '', '', ''] });
      Store.save();
      draw();
      [...$app.querySelectorAll('[data-in="inf"]')].pop().focus();
    }
    if (b.dataset.act === 'del') {
      const v = t.verbs[+b.dataset.v];
      if (!confirm(`Delete ${v.inf || 'this verb'}?`)) return;
      t.verbs.splice(+b.dataset.v, 1);
      Store.save();
      draw();
    }
    if (b.dataset.act === 'delete') {
      if (!confirm(`Delete “${t.name}”? This can’t be undone.`)) return;
      Store.deleteTable(t.id);
      location.hash = '#/tables';
    }
  };

  $app.oninput = e => {
    const el = e.target;
    const v = t.verbs[+el.dataset.v];
    switch (el.dataset.in) {
      case 'name': t.name = el.value; break;
      case 'inf': v.inf = el.value; break;
      case 'en': v.en = el.value; break;
      case 'form': v.forms[+el.dataset.f] = el.value; break;
      default: return;
    }
    Store.saveSoon();
  };

  $app.onchange = e => {
    if (e.target.dataset.in !== 'vos') return;
    t.useVosotros = e.target.checked;
    Store.save();
    draw();
  };

  draw();
}

function verbPractice(t) {
  const verbs = t.verbs.filter(v => v.inf.trim());
  let mode = 'table';

  const draw = () => {
    U.render(`${U.header(t.name || 'Verb practice', '#/tables', `<a class="btn btn-small" href="#/table/${t.id}/edit">✏️ Edit</a>`)}
      <div class="seg">
        <button class="${mode === 'table' ? 'on' : ''}" data-act="mode" data-m="table">Whole table</button>
        <button class="${mode === 'one' ? 'on' : ''}" data-act="mode" data-m="one">One verb at a time</button>
      </div>
      <div id="practice"></div>
      ${U.accentBar()}`);
    const box = document.getElementById('practice');
    if (!verbs.length) {
      box.innerHTML = `<p class="empty">Add some verbs first.<br><a href="#/table/${t.id}/edit">Edit this table</a></p>`;
    } else if (mode === 'table') {
      practiceGrid(box, Tables.verbGrid({ ...t, verbs }), ['all', 'random']);
    } else {
      oneVerbAtATime(box, t, verbs);
    }
  };

  $app.onclick = e => {
    const b = e.target.closest('[data-act="mode"]');
    if (!b) return;
    mode = b.dataset.m;
    draw();
  };

  draw();
}

// Shuffled verbs, one card each: type every form, check, next.
function oneVerbAtATime(box, t, verbs) {
  const queue = U.shuffle(verbs);
  let i = 0, checked = false, score = 0, possible = 0;
  let answers = {};
  const personsFor = v => Tables.persons(t).filter(p => (v.forms[p] || '').trim());

  const draw = () => {
    if (i >= queue.length) {
      box.innerHTML = `<div class="done">
        <span class="big">🎉</span>
        <h2>${score} / ${possible} correct</h2>
        <p class="muted">${queue.length} ${queue.length === 1 ? 'verb' : 'verbs'} practiced</p>
        <button class="btn btn-primary" data-pa="restart">Go again</button>
      </div>`;
      return;
    }
    const v = queue[i];
    const ps = personsFor(v);
    let right = 0;
    const fields = ps.map(p => {
      const res = checked ? U.check(answers[p], v.forms[p]) : '';
      if (res === 'right') right++;
      return `<label class="form-field ${res ? 'res-' + res : ''}"><span>${PRONOUNS[p]}</span>
        <input data-p="${p}" value="${U.esc(answers[p])}" ${ES_INPUT} enterkeyhint="next" ${checked ? 'readonly' : ''}>
        ${res && res !== 'right' ? `<span class="correct">${res === 'accent' ? 'Check accents: ' : ''}${U.esc(v.forms[p])}</span>` : ''}
      </label>`;
    }).join('');

    box.innerHTML = `<p class="muted small center">Verb ${i + 1} of ${queue.length}</p>
      <section class="card verb-quiz">
        <div class="center">
          <div class="prompt" lang="es">${U.esc(v.inf)}</div>
          ${v.en ? `<div class="muted">${U.esc(v.en)}</div>` : ''}
          <button class="btn btn-small" data-pa="speak" style="margin-top:8px">🔊 Hear it</button>
        </div>
        ${checked ? `<div class="score ${right === ps.length ? 'perfect' : ''}"><b>${right} / ${ps.length}</b> correct</div>` : ''}
        <div class="forms">${fields}</div>
      </section>
      ${checked
        ? '<button class="btn btn-primary btn-big" data-pa="next">Next verb →</button>'
        : '<button class="btn btn-primary btn-big" data-pa="check">✓ Check</button>'}`;
  };

  const check = () => {
    const v = queue[i];
    personsFor(v).forEach(p => {
      possible++;
      if (U.check(answers[p], v.forms[p]) === 'right') score++;
    });
    checked = true;
    draw();
  };

  box.oninput = e => {
    if (e.target.dataset.p) answers[e.target.dataset.p] = e.target.value;
  };

  box.onkeydown = e => {
    if (e.key !== 'Enter' || !e.target.dataset.p || checked) return;
    e.preventDefault();
    const inputs = [...box.querySelectorAll('input[data-p]')];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus();
    else {
      e.target.blur();
      check();
    }
  };

  box.onclick = e => {
    const act = e.target.closest('[data-pa]')?.dataset.pa;
    if (act === 'speak') U.speak(queue[i].inf);
    if (act === 'check') check();
    if (act === 'next') {
      i++;
      checked = false;
      answers = {};
      draw();
      box.querySelector('input')?.focus();
    }
    if (act === 'restart') oneVerbAtATime(box, t, verbs);
  };

  draw();
}
