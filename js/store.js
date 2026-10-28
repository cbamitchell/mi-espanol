'use strict';

// All data lives in one JSON object in localStorage.
//
// items:  flashcards and mantras  { id, kind: 'flashcard'|'mantra', groupId, en, es, note, srs, createdAt }
// groups: categories (flashcards) and collections (mantras)  { id, kind, name }
// tables: { id, kind: 'grammar', name, headerRow, headerCol, cells: string[][], blanks: bool[][] }
//         { id, kind: 'verb', name, useVosotros, verbs: [{ id, inf, en, forms: [6 strings] }] }
// pages:  notebook pages  { id, title, date, blocks: [{ id, type: 'note', text } | { id, type: 'table', tableId }] }

const PRONOUNS = ['yo', 'tú', 'él / ella / Ud.', 'nosotros', 'vosotros', 'ellos / ellas / Uds.'];

const Store = {
  KEY: 'spanishStudy.v1',
  data: null,
  _timer: null,

  load() {
    let raw = null, saved = null;
    try {
      raw = localStorage.getItem(this.KEY);
      saved = raw && JSON.parse(raw);
    } catch (e) {
      // Keep the unreadable copy around instead of silently overwriting it.
      if (raw) try { localStorage.setItem(this.KEY + '.unreadable', raw); } catch (e2) { /* storage full */ }
    }
    this.data = saved && saved.version ? this.normalize(saved) : this.seed();
    this.save();
  },

  save() {
    clearTimeout(this._timer);
    this._timer = null;
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.data));
    } catch (e) {
      U.toast('⚠️ Couldn’t save. Export a backup from Settings.', 4000);
    }
  },

  // For typing: batch keystrokes into one write.
  saveSoon() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.save(), 400);
  },

  flush() {
    if (this._timer) this.save();
  },

  defaultSettings() {
    return { dir: { flashcard: 'en2es', mantra: 'en2es' }, voice: 'es-MX', lastBackup: null, notebookPage: 0, tableTab: 'grammar' };
  },

  empty() {
    return { version: 1, items: [], groups: [], tables: [], pages: [], settings: this.defaultSettings() };
  },

  // Fill in anything missing (e.g. from an older backup).
  normalize(d) {
    const base = this.empty();
    const settings = { ...base.settings, ...d.settings };
    settings.dir = { ...base.settings.dir, ...(d.settings && d.settings.dir) };
    return { ...base, ...d, settings };
  },

  // A few examples so the app isn't empty the first time. Delete them whenever you like.
  seed() {
    const d = this.empty();
    const group = (kind, name) => {
      const g = { id: U.uid(), kind, name };
      d.groups.push(g);
      return g.id;
    };
    const item = (kind, groupId, en, es, note = '') =>
      d.items.push({ id: U.uid(), kind, groupId, en, es, note, srs: null, createdAt: Date.now() });

    const adj = group('flashcard', 'Adjectives');
    const verbs = group('flashcard', 'Verbs');
    const prep = group('flashcard', 'Prepositions');
    item('flashcard', adj, 'tired', 'cansado / cansada');
    item('flashcard', adj, 'big', 'grande');
    item('flashcard', verbs, 'to eat', 'comer');
    item('flashcard', verbs, 'to live', 'vivir');
    item('flashcard', prep, 'with', 'con');
    item('flashcard', prep, 'without', 'sin');

    const me = group('mantra', 'Talking about myself');
    const food = group('mantra', 'Ordering food');
    const help = group('mantra', 'Asking for help');
    item('mantra', me, 'My name is ___ and I’m learning Spanish.', 'Me llamo ___ y estoy aprendiendo español.');
    item('mantra', food, 'I would like a coffee with milk, please.', 'Quisiera un café con leche, por favor.');
    item('mantra', food, 'The check, please.', 'La cuenta, por favor.');
    item('mantra', help, 'Can you speak more slowly, please?', '¿Puede hablar más despacio, por favor?');
    item('mantra', help, 'How do you say ___ in Spanish?', '¿Cómo se dice ___ en español?');

    const reflexive = {
      id: U.uid(), kind: 'grammar', name: 'Reflexive Pronouns', headerRow: true, headerCol: true, createdAt: Date.now(),
      cells: [['Subject', 'Reflexive'], ['yo', 'me'], ['tú', 'te'], ['él / ella / Ud.', 'se'],
        ['nosotros', 'nos'], ['vosotros', 'os'], ['ellos / ellas / Uds.', 'se']],
    };
    reflexive.blanks = reflexive.cells.map((row, r) => row.map((_, c) => r > 0 && c > 0));
    const present = {
      id: U.uid(), kind: 'verb', name: 'Present tense — regular', useVosotros: true, createdAt: Date.now(),
      verbs: [
        { id: U.uid(), inf: 'hablar', en: 'to speak', forms: ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan'] },
        { id: U.uid(), inf: 'comer', en: 'to eat', forms: ['como', 'comes', 'come', 'comemos', 'coméis', 'comen'] },
        { id: U.uid(), inf: 'vivir', en: 'to live', forms: ['vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven'] },
      ],
    };
    d.tables.push(reflexive, present);

    d.pages.push({
      id: U.uid(), title: 'Welcome to your notebook', date: U.today(), blocks: [
        { id: U.uid(), type: 'note', text: 'Use one page per class. Type your notes, then add the tables you made so everything from that day lives together.\n\nDrag the ⠿ handle to reorder. Swipe or use the arrows to turn pages.' },
        { id: U.uid(), type: 'table', tableId: reflexive.id },
      ],
    });
    return d;
  },

  // ---------- Lookups ----------
  items(kind) { return this.data.items.filter(i => i.kind === kind); },
  item(id) { return this.data.items.find(i => i.id === id); },
  groups(kind) { return this.data.groups.filter(g => g.kind === kind); },
  group(id) { return this.data.groups.find(g => g.id === id); },
  table(id) { return this.data.tables.find(t => t.id === id); },
  due(kinds) { return this.data.items.filter(i => kinds.includes(i.kind) && SRS.isDue(i)); },

  // ---------- Changes ----------
  addItem(kind, fields) {
    const item = { id: U.uid(), kind, groupId: null, en: '', es: '', note: '', srs: null, createdAt: Date.now(), ...fields };
    this.data.items.push(item);
    this.save();
    return item;
  },

  deleteItem(id) {
    this.data.items = this.data.items.filter(i => i.id !== id);
    this.save();
  },

  addGroup(kind, name) {
    const g = { id: U.uid(), kind, name };
    this.data.groups.push(g);
    this.save();
    return g;
  },

  // Cards in a deleted group are kept, just ungrouped.
  deleteGroup(id) {
    this.data.groups = this.data.groups.filter(g => g.id !== id);
    this.data.items.forEach(i => { if (i.groupId === id) i.groupId = null; });
    this.save();
  },

  addTable(t) {
    this.data.tables.push(t);
    this.save();
    return t;
  },

  deleteTable(id) {
    this.data.tables = this.data.tables.filter(t => t.id !== id);
    this.data.pages.forEach(p => { p.blocks = p.blocks.filter(b => b.tableId !== id); });
    this.save();
  },

  // ---------- Backup ----------
  backupNag() {
    const last = this.data.settings.lastBackup;
    const amount = this.data.items.length + this.data.tables.length;
    if (!last) return amount > 15 ? 'You haven’t made a backup yet. Tap to save one.' : '';
    const days = U.daysBetween(last, U.today());
    return days >= 7 ? `Your last backup was ${days} days ago. Tap to save a fresh one.` : '';
  },

  exportText() {
    return JSON.stringify({ ...this.data, exportedAt: new Date().toISOString() }, null, 2);
  },

  importText(text) {
    const d = JSON.parse(text);
    if (!d || d.version !== 1 || !Array.isArray(d.items)) throw new Error('That file doesn’t look like a backup from this app.');
    this.data = this.normalize(d);
    this.save();
  },
};
