// data.js — utility puramente client + macro/data helpers.
// I dati (foods, favorites, storico) NON sono più hardcoded: arrivano dal
// backend al boot (vedi api.js + main.jsx).
// Inizializzazione difensiva: array vuoti per evitare crash di render
// prima che la fetch iniziale completi.

window.FOODS = [];
window.FAVORITES = [];

// Default goals — usato come fallback se il backend non risponde al primo load.
window.DEFAULT_GOALS = {
  kcal: 2200,
  p: 130,
  c: 250,
  fat: 75,
  fb: 30,
  water_ml: 2500,
};

window.DEFAULT_PROFILE = {
  firstName: 'Marco',
  lastName: '',
  weightKg: 78,
  heightCm: 178,
  targetWeightKg: 76,
  weightGoal: 'maintain',
  activityLevel: 'moderate',
  activityMinutesWeek: 180,
  avatarDataUrl: null,
  updatedAt: null,
};

// ─── Calcoli ──────────────────────────────────────────────────────────────
// Quick computation: given foodId + grams, return macros for that portion.
// Resta lato client per il rendering live (anelli, barre): il backend ne
// snapshotta una copia su MealEntry, ma per la UI rendiamo dal Food corrente.
window.computeMacros = function (foodId, grams) {
  const f = window.FOODS.find(x => x.id === foodId);
  if (!f) return { kcal: 0, p: 0, c: 0, fat: 0, fb: 0, sg: 0, sf: 0 };
  const k = grams / 100;
  return {
    kcal: Math.round(f.kcal * k),
    p:    +(f.p * k).toFixed(1),
    c:    +(f.c * k).toFixed(1),
    fat:  +(f.f * k).toFixed(1),
    fb:   +(f.fb * k).toFixed(1),
    sg:   +(f.sg * k).toFixed(1),
    sf:   +(f.sf * k).toFixed(1),
  };
};

// Convert serving (e.g. "1 pz") to grams
window.servingToGrams = function (food, qty) {
  if (food.unit === 'pz') return (food.per_unit_g || 100) * qty;
  if (food.unit === 'ml') return qty; // 1ml ≈ 1g
  return qty;
};

// ─── Date helpers ─────────────────────────────────────────────────────────
function _dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
window.dateKey = _dateKey;

// ─── Totali ───────────────────────────────────────────────────────────────
window.totalMacros = function (entries) {
  const total = { kcal: 0, p: 0, c: 0, fat: 0, fb: 0, sg: 0, sf: 0 };
  for (const e of entries) {
    const m = window.computeMacros(e.foodId, e.grams);
    total.kcal += m.kcal;
    total.p += m.p;
    total.c += m.c;
    total.fat += m.fat;
    total.fb += m.fb;
    total.sg += m.sg;
    total.sf += m.sf;
  }
  total.p = +total.p.toFixed(1);
  total.c = +total.c.toFixed(1);
  total.fat = +total.fat.toFixed(1);
  total.fb = +total.fb.toFixed(1);
  total.sg = +total.sg.toFixed(1);
  total.sf = +total.sf.toFixed(1);
  return total;
};

window.totalDay = function (day) {
  if (!day) return { kcal: 0, p: 0, c: 0, fat: 0, fb: 0, sg: 0, sf: 0 };
  return window.totalMacros([
    ...(day.colazione || []),
    ...(day.pranzo || []),
    ...(day.cena || []),
    ...(day.spuntini || []),
  ]);
};

// ─── i18n strings ─────────────────────────────────────────────────────────
window.IT_MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
window.IT_MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
window.IT_DAYS = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
window.IT_DAYS_SHORT = ['D','L','M','M','G','V','S'];

window.formatDate = function (d, opts = {}) {
  const day = d.getDate();
  const month = window.IT_MONTHS[d.getMonth()];
  if (opts.short) return `${day} ${window.IT_MONTHS_SHORT[d.getMonth()]}`;
  if (opts.weekday) return `${window.IT_DAYS[d.getDay()]} ${day} ${month}`;
  return `${day} ${month}`;
};

window.greeting = function () {
  const h = new Date().getHours();
  if (h < 11) return 'Buongiorno';
  if (h < 17) return 'Buon pomeriggio';
  if (h < 22) return 'Buonasera';
  return 'Buonanotte';
};

// ─── Stub di compatibilità ────────────────────────────────────────────────
// Alcuni vecchi punti del codice potrebbero ancora chiamare generateHistory
// o todayPartial. Li mantengo come no-op che ritornano un oggetto vuoto,
// così non rompiamo nulla durante la migrazione.
window.generateHistory = function () { return {}; };
window.todayPartial = function (h) { return h; };
