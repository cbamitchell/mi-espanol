'use strict';

Views.review = () => {
  const dueOf = kind => Store.items(kind).filter(i => SRS.isDue(i));
  const fc = dueOf('flashcard');
  const mt = dueOf('mantra');
  const total = fc.length + mt.length;
  const fresh = [...fc, ...mt].filter(i => !i.srs).length;
  const nextDue = Store.data.items.filter(i => i.srs && !SRS.isDue(i)).map(i => i.srs.due).sort()[0];

  U.render(`${U.header('Today’s Review', '#/')}
    ${total ? `
      <section class="card review-hero">
        <div class="big-num">${total}</div>
        <div>${total === 1 ? 'card' : 'cards'} due today${fresh ? ` · ${fresh} new` : ''}</div>
        <button class="btn btn-primary btn-big" data-act="all">Review everything</button>
      </section>
      <div class="btn-row">
        <button class="btn" data-act="fc" ${fc.length ? '' : 'disabled'}>🃏 Flashcards (${fc.length})</button>
        <button class="btn" data-act="mt" ${mt.length ? '' : 'disabled'}>💬 Mantras (${mt.length})</button>
      </div>
      <p class="muted small center">Each card shows the side you picked in its own section (EN → ES, ES → EN or Mix).</p>`
    : `
      <div class="empty">
        <span class="big">🎉</span>
        <h2>All caught up!</h2>
        <p>${nextDue ? `Next review: ${U.prettyDate(nextDue)}` : 'Add some flashcards or mantras to get started.'}</p>
      </div>
      <p class="muted center small">Want more practice anyway?</p>
      <div class="btn-row">
        <button class="btn" data-act="shuffle-fc">🔀 Shuffle flashcards</button>
        <button class="btn" data-act="shuffle-mt">🔀 Shuffle mantras</button>
      </div>`}`);

  const review = (items, title) =>
    Study.start({ ids: U.shuffle(items).map(i => i.id), mode: 'srs', dir: 'auto', title });
  const shuffle = (kind, title) =>
    Study.start({ ids: U.shuffle(Store.items(kind)).map(i => i.id), mode: 'practice', dir: 'auto', title });

  $app.onclick = e => {
    switch (e.target.closest('[data-act]')?.dataset.act) {
      case 'all': review([...fc, ...mt], 'Today’s Review'); break;
      case 'fc': review(fc, 'Flashcards due'); break;
      case 'mt': review(mt, 'Mantras due'); break;
      case 'shuffle-fc': shuffle('flashcard', 'All flashcards · shuffle'); break;
      case 'shuffle-mt': shuffle('mantra', 'All mantras · shuffle'); break;
    }
  };
};
