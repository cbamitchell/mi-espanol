'use strict';

// A study session over flashcards and/or mantras.
// mode 'srs'      → ratings reschedule cards (Study due / Today's Review)
// mode 'practice' → shuffle through everything; the schedule is left alone
// dir 'en2es' | 'es2en' | 'mix' | 'auto' (auto = each card uses its own section's setting)

const Study = {
  s: null,

  start({ ids, mode, dir, title }) {
    if (!ids.length) return U.toast('Nothing to study here yet');
    this.s = {
      queue: ids.slice(), total: ids.length, done: 0, tally: [0, 0, 0, 0],
      mode, dir, title, back: location.hash || '#/', flipped: false, side: null,
    };
    if (location.hash === '#/study') Router.go();
    else location.hash = '#/study';
  },
};

Views.study = () => {
  const s = Study.s;
  if (!s) {
    location.hash = '#/';
    return;
  }

  const sideFor = item => {
    let d = s.dir === 'auto' ? Store.data.settings.dir[item.kind] : s.dir;
    if (d === 'mix') d = Math.random() < 0.5 ? 'en2es' : 'es2en';
    return d;
  };

  const drawDone = () => {
    U.render(`${U.header(s.title, s.back)}
      <div class="done">
        <span class="big">🎉</span>
        <h2>Session complete!</h2>
        <p class="muted">${s.total} ${s.total === 1 ? 'card' : 'cards'} studied</p>
        <div class="tally">${SRS.RATINGS.map((r, n) => `<div class="rate-${n}"><b>${s.tally[n]}</b>${r.label}</div>`).join('')}</div>
        <div class="btn-row">
          <button class="btn btn-primary" data-back="${s.back}">Done</button>
          <a class="btn" href="#/">Home</a>
        </div>
      </div>`);
  };

  const draw = () => {
    while (s.queue.length && !Store.item(s.queue[0])) s.queue.shift(); // deleted mid-session
    if (!s.queue.length) return drawDone();

    const item = Store.item(s.queue[0]);
    s.side = s.side || sideFor(item);
    const toEs = s.side === 'en2es';
    const front = toEs ? item.en : item.es;
    const back = toEs ? item.es : item.en;
    const spanishShowing = !toEs || s.flipped;

    U.render(`
      ${U.header(s.title, s.back, `<span class="pill">${s.done}/${s.total}</span>`)}
      <div class="progress"><div style="width:${Math.round((s.done / s.total) * 100)}%"></div></div>
      <button class="study-card" data-act="flip">
        <div class="side-label">${toEs ? 'English' : 'Español'}</div>
        <div class="prompt" ${toEs ? '' : 'lang="es"'}>${U.esc(front)}</div>
        ${s.flipped ? `<div class="divider"></div>
          <div class="side-label">${toEs ? 'Español' : 'English'}</div>
          <div class="answer" ${toEs ? 'lang="es"' : ''}>${U.esc(back)}</div>
          ${item.note ? `<div class="note">${U.esc(item.note)}</div>` : ''}`
        : '<div class="tap-hint">Say it out loud, then tap to check</div>'}
      </button>
      ${s.flipped
        ? `<div class="ratings">${SRS.RATINGS.map((r, n) => `<button class="rate rate-${n}" data-act="rate" data-r="${n}">
            ${r.label}<small>${s.mode === 'srs' ? SRS.hint(item.srs, n) : r.sub}</small></button>`).join('')}</div>`
        : '<button class="btn btn-primary btn-big" data-act="flip">Show answer</button>'}
      <div class="study-tools">
        ${spanishShowing ? '<button class="btn btn-small" data-act="speak">🔊 Hear it</button>' : ''}
        <button class="btn btn-small" data-act="edit">✏️ Edit</button>
      </div>
      ${s.mode === 'practice' ? '<p class="muted center small">Shuffle mode: your ratings won’t change the review schedule.</p>' : ''}`);
  };

  const flip = () => {
    if (!s.queue.length || s.flipped) return;
    s.flipped = true;
    draw();
  };

  const rate = n => {
    if (!s.queue.length) return;
    const id = s.queue.shift();
    const item = Store.item(id);
    if (s.mode === 'srs') {
      item.srs = SRS.next(item.srs, n);
      Store.save();
    }
    s.tally[n]++;
    if (n === 0) s.queue.splice(Math.min(3, s.queue.length), 0, id); // see it again in a few cards
    else s.done++;
    s.flipped = false;
    s.side = null;
    draw();
  };

  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const item = Store.item(s.queue[0]);
    switch (b.dataset.act) {
      case 'flip': flip(); break;
      case 'rate': rate(Number(b.dataset.r)); break;
      case 'speak': U.speak(item.es); break;
      case 'edit': editItem(item.kind, item.id, draw); break;
    }
  };

  // Laptop shortcuts: space/enter flips, 1–4 rates.
  document.onkeydown = e => {
    if (document.querySelector('.overlay')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flip();
    } else if (s.flipped && ['1', '2', '3', '4'].includes(e.key)) {
      rate(Number(e.key) - 1);
    }
  };

  draw();
};
