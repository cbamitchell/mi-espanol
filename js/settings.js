'use strict';

const VOICES = [['es-MX', 'Mexico'], ['es-US', 'United States'], ['es-419', 'Latin America'], ['es-ES', 'Spain']];

Views.settings = () => {
  const d = Store.data;
  const s = d.settings;
  const n = kind => Store.items(kind).length;

  U.render(`${U.header('Settings & backup', '#/')}
    <section class="card">
      <h2>💾 Backup</h2>
      <p class="muted small">Everything is saved in this browser, on this device only. Export a backup now and then. It’s also how you move your stuff to another phone or computer.</p>
      <p class="small"><b>${s.lastBackup ? `Last backup: ${U.prettyDate(s.lastBackup)}` : 'No backup yet.'}</b></p>
      <div class="btn-row">
        <button class="btn btn-primary" data-act="export">⬇️ Export backup</button>
        <label class="btn">⬆️ Import backup<input class="visually-hidden" type="file" accept="application/json,.json" data-in="import"></label>
      </div>
      <p class="muted small">Importing replaces everything currently in the app.</p>
    </section>

    <section class="card">
      <h2>🔊 Voice</h2>
      <label class="field"><span>Spanish accent for “Hear it”</span>
        <select data-in="voice">${VOICES.map(([v, label]) => `<option value="${v}" ${s.voice === v ? 'selected' : ''}>${label}</option>`).join('')}</select>
      </label>
      <button class="btn btn-small" data-act="test-voice">▶ Test voice</button>
    </section>

    <section class="card">
      <h2>📱 Use it like an app</h2>
      <p class="small">On iPhone, open this page in Safari, tap the Share button, then <b>Add to Home Screen</b>. It opens full-screen like an app, and Safari is much less likely to clear your saved data.</p>
    </section>

    <section class="card">
      <h2>Your stuff</h2>
      <p class="small">${n('flashcard')} flashcards · ${n('mantra')} mantras · ${d.tables.length} tables · ${d.pages.length} notebook pages</p>
      <button class="btn btn-small btn-danger" data-act="wipe">Erase everything</button>
    </section>`);

  $app.onclick = e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'export') exportBackup();
    if (act === 'test-voice') U.speak('Hola, ¿cómo estás? Estoy aprendiendo español.');
    if (act === 'wipe') {
      if (!confirm('Erase ALL flashcards, mantras, tables and notebook pages?')) return;
      if (!confirm('Really? This can’t be undone unless you have a backup file.')) return;
      Store.data = Store.empty();
      Store.save();
      location.hash = '#/';
    }
  };

  $app.onchange = async e => {
    const el = e.target;
    if (el.dataset.in === 'voice') {
      s.voice = el.value;
      Store.save();
    }
    if (el.dataset.in === 'import' && el.files[0]) {
      try {
        const text = await el.files[0].text();
        const when = JSON.parse(text).exportedAt;
        const label = when ? new Date(when).toLocaleString() : 'this file';
        if (confirm(`Replace everything in the app with the backup from ${label}?`)) {
          Store.importText(text);
          U.toast('Backup restored ✓');
          Views.settings();
        }
      } catch (err) {
        U.toast(err instanceof SyntaxError ? 'That file isn’t a valid backup.' : err.message, 4000);
      }
      el.value = '';
    }
  };
};

// On iPhone the share sheet lets you "Save to Files", AirDrop or email the backup; elsewhere it downloads.
async function exportBackup() {
  const name = `spanish-backup-${U.today()}.json`;
  const file = new File([Store.exportText()], name, { type: 'application/json' });
  try {
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Spanish study backup' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    Store.data.settings.lastBackup = U.today();
    Store.save();
    U.toast('Backup saved ✓');
    if (location.hash === '#/settings') Views.settings();
  } catch (err) {
    if (err.name !== 'AbortError') U.toast('Export failed: ' + err.message, 4000);
  }
}
