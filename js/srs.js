'use strict';

// Spaced repetition: a simplified SM-2. Ratings are 0 Nope, 1 Hard, 2 Good, 3 Easy.
// Each card keeps { interval (days), ease, reps, lapses, due, last }. New cards have srs = null and are due right away.

const SRS = {
  RATINGS: [
    { label: 'Nope', sub: 'Forgot it' },
    { label: 'Hard', sub: 'Struggled' },
    { label: 'Good', sub: 'Remembered' },
    { label: 'Easy', sub: 'Knew it' },
  ],

  isDue(item, today = U.today()) {
    return !item.srs || item.srs.due <= today;
  },

  next(srs, rating) {
    const s = srs ? { ...srs } : { interval: 0, ease: 2.5, reps: 0, lapses: 0 };
    let days;
    if (rating === 0) {
      s.reps = 0;
      s.lapses += 1;
      s.ease = Math.max(1.3, s.ease - 0.2);
      days = 0;
    } else if (rating === 1) {
      s.ease = Math.max(1.3, s.ease - 0.15);
      days = s.reps === 0 ? 1 : Math.max(s.interval + 1, Math.round(s.interval * 1.2));
      s.reps += 1;
    } else if (rating === 2) {
      days = s.reps === 0 ? 2 : Math.max(s.interval + 1, Math.round(s.interval * s.ease));
      s.reps += 1;
    } else {
      s.ease += 0.15;
      days = s.reps === 0 ? 4 : Math.max(s.interval + 2, Math.round(s.interval * s.ease * 1.3));
      s.reps += 1;
    }
    s.interval = days;
    s.due = U.addDays(U.today(), days);
    s.last = U.today();
    return s;
  },

  // Shown under each rating button: when you'd see the card again.
  hint(srs, rating) {
    const days = this.next(srs, rating).interval;
    return days === 0 ? 'again' : U.intervalLabel(days);
  },

  status(item) {
    if (!item.srs) return { cls: 'new', text: 'New' };
    if (this.isDue(item)) return { cls: 'due', text: 'Due' };
    return { cls: '', text: 'in ' + U.intervalLabel(U.daysBetween(U.today(), item.srs.due)) };
  },
};
