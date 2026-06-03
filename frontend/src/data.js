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
  age: 30,
  sex: 'male',
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
window.EAT_GOAL_LIMITS = {
  kcalMin: 1200,
  kcalMax: 4500,
  proteinPctMin: 0.10,
  proteinPctMax: 0.45,
  carbsPctMin: 0.10,
  carbsPctMax: 0.72,
  fatPctMin: 0.12,
  fatPctMax: 0.55,
};

window.profileEnergyEstimate = function (profile = window.DEFAULT_PROFILE) {
  const p = normalizeGoalProfile(profile);
  const bmr = p.sex === 'female'
    ? (10 * p.weightKg) + (6.25 * p.heightCm) - (5 * p.age) - 161
    : (10 * p.weightKg) + (6.25 * p.heightCm) - (5 * p.age) + 5;
  const activityFactor = {
    sedentary: 1.20,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
  }[p.activityLevel] || 1.20;
  const expectedMinutes = {
    sedentary: 0,
    light: 150,
    moderate: 300,
    high: 450,
  }[p.activityLevel] || 0;
  const minuteDelta = clampGoalNumber(p.activityMinutesWeek - expectedMinutes, -240, 480);
  const exerciseKcalMinute = p.weightKg * 0.0175 * 5.5;
  const tdee = Math.max(1000, (bmr * activityFactor) + ((minuteDelta * exerciseKcalMinute) / 7));
  const targetDeltaKg = p.targetWeightKg - p.weightKg;
  const goalDelta = p.weightGoal === 'lose'
    ? (targetDeltaKg < -8 ? -550 : targetDeltaKg < -2 ? -450 : -300)
    : p.weightGoal === 'gain'
      ? (targetDeltaKg > 8 ? 450 : targetDeltaKg > 2 ? 350 : 250)
      : 0;
  const recommendedKcal = clampGoalNumber(
    roundToStep(tdee + goalDelta, 50),
    window.EAT_GOAL_LIMITS.kcalMin,
    window.EAT_GOAL_LIMITS.kcalMax,
  );
  return {
    bmi: p.heightCm > 0 ? p.weightKg / ((p.heightCm / 100) ** 2) : 0,
    bmr,
    tdee,
    recommendedKcal,
  };
};

window.recommendedGoalsForProfile = function (profile = window.DEFAULT_PROFILE, kcalOverride, options = {}) {
  const p = normalizeGoalProfile(profile);
  const estimate = window.profileEnergyEstimate(p);
  const kcal = clampGoalNumber(
    roundToStep(kcalOverride ?? estimate.recommendedKcal, 50),
    window.EAT_GOAL_LIMITS.kcalMin,
    window.EAT_GOAL_LIMITS.kcalMax,
  );
  const weightRef = p.weightGoal === 'lose'
    ? Math.max(45, Math.min(p.weightKg, p.targetWeightKg || p.weightKg))
    : p.weightKg;
  const activityProteinBump = p.activityLevel === 'high' ? 0.15 : p.activityLevel === 'moderate' ? 0.08 : 0;
  const proteinPerKg = ({
    lose: 1.85,
    maintain: 1.55,
    gain: 1.70,
  }[p.weightGoal] || 1.55) + activityProteinBump;
  const ranges = window.macroGoalRanges({ kcal }, p);
  const protein = roundToStep(clampGoalNumber(weightRef * proteinPerKg, ranges.p.min, ranges.p.max), 5);
  const fatPct = p.weightGoal === 'gain' ? 0.26 : p.weightGoal === 'lose' ? 0.30 : 0.28;
  let fat = roundToStep(clampGoalNumber((kcal * fatPct) / 9, ranges.fat.min, ranges.fat.max), 5);
  let carbs = roundToStep((kcal - (protein * 4) - (fat * 9)) / 4, 5);

  if (carbs < ranges.c.min || carbs > ranges.c.max) {
    carbs = roundToStep(clampGoalNumber(carbs, ranges.c.min, ranges.c.max), 5);
    fat = roundToStep(clampGoalNumber((kcal - (protein * 4) - (carbs * 4)) / 9, ranges.fat.min, ranges.fat.max), 5);
  }

  carbs = roundToStep(clampGoalNumber((kcal - (protein * 4) - (fat * 9)) / 4, ranges.c.min, ranges.c.max), 5);

  return {
    kcal,
    p: protein,
    c: carbs,
    fat,
    fb: roundToStep(clampGoalNumber((kcal / 1000) * 14, 20, 45), 5),
    water_ml: options.keepWaterMl ?? roundToStep(clampGoalNumber((p.weightKg * 32) + ((p.activityMinutesWeek / 7) * 10), 1500, 4500), 250),
  };
};

window.macroGoalRanges = function (goals = window.DEFAULT_GOALS, profile = window.DEFAULT_PROFILE) {
  const p = normalizeGoalProfile(profile);
  const kcal = clampGoalNumber(
    Number(goals.kcal) || window.DEFAULT_GOALS.kcal,
    window.EAT_GOAL_LIMITS.kcalMin,
    window.EAT_GOAL_LIMITS.kcalMax,
  );
  const limits = window.EAT_GOAL_LIMITS;
  const proteinMin = Math.max(35, p.weightKg * 0.7, (kcal * limits.proteinPctMin) / 4);
  const proteinMax = Math.min(320, (kcal * limits.proteinPctMax) / 4, Math.max(120, p.weightKg * 2.8));
  const carbsMin = Math.max(45, (kcal * limits.carbsPctMin) / 4);
  const carbsMax = Math.min(760, (kcal * limits.carbsPctMax) / 4);
  const fatMin = Math.max(25, (kcal * limits.fatPctMin) / 9);
  const fatMax = Math.min(250, (kcal * limits.fatPctMax) / 9);
  return {
    kcal: { min: limits.kcalMin, max: limits.kcalMax, step: 50 },
    p: goalRange(proteinMin, proteinMax, 5),
    c: goalRange(carbsMin, carbsMax, 5),
    fat: goalRange(fatMin, fatMax, 5),
    fb: { min: 15, max: 60, step: 5 },
    water_ml: { min: 1000, max: 5000, step: 250 },
  };
};

window.balanceGoalsToKcal = function (goals = window.DEFAULT_GOALS, profile = window.DEFAULT_PROFILE, changedKey = null) {
  const kcal = clampGoalNumber(
    roundToStep(Number(goals.kcal) || window.DEFAULT_GOALS.kcal, 50),
    window.EAT_GOAL_LIMITS.kcalMin,
    window.EAT_GOAL_LIMITS.kcalMax,
  );
  const recommended = window.recommendedGoalsForProfile(profile, kcal, { keepWaterMl: goals.water_ml });
  const ranges = window.macroGoalRanges({ kcal }, profile);

  if (changedKey === 'kcal') {
    return {
      ...goals,
      ...recommended,
      water_ml: clampGoalValue(goals.water_ml ?? recommended.water_ml, ranges.water_ml),
    };
  }

  let protein = clampGoalValue(goals.p ?? recommended.p, ranges.p);
  let carbs = clampGoalValue(goals.c ?? recommended.c, ranges.c);
  let fat = clampGoalValue(goals.fat ?? recommended.fat, ranges.fat);

  if (changedKey === 'p') {
    protein = clampGoalValue(goals.p, ranges.p);
    fat = clampGoalValue(fat, ranges.fat);
    carbs = clampGoalValue((kcal - (protein * 4) - (fat * 9)) / 4, ranges.c);
    fat = clampGoalValue((kcal - (protein * 4) - (carbs * 4)) / 9, ranges.fat);
  } else if (changedKey === 'c') {
    carbs = clampGoalValue(goals.c, ranges.c);
    protein = clampGoalValue(protein, ranges.p);
    fat = clampGoalValue((kcal - (protein * 4) - (carbs * 4)) / 9, ranges.fat);
    protein = clampGoalValue((kcal - (carbs * 4) - (fat * 9)) / 4, ranges.p);
  } else if (changedKey === 'fat') {
    fat = clampGoalValue(goals.fat, ranges.fat);
    protein = clampGoalValue(protein, ranges.p);
    carbs = clampGoalValue((kcal - (protein * 4) - (fat * 9)) / 4, ranges.c);
    protein = clampGoalValue((kcal - (carbs * 4) - (fat * 9)) / 4, ranges.p);
  }

  return {
    ...goals,
    kcal,
    p: protein,
    c: carbs,
    fat,
    fb: clampGoalValue(goals.fb ?? recommended.fb, ranges.fb),
    water_ml: clampGoalValue(goals.water_ml ?? recommended.water_ml, ranges.water_ml),
  };
};

function normalizeGoalProfile(profile = {}) {
  const base = window.DEFAULT_PROFILE || {};
  const p = { ...base, ...(profile || {}) };
  return {
    weightKg: clampGoalNumber(p.weightKg, 30, 250, base.weightKg || 78),
    heightCm: clampGoalNumber(p.heightCm, 120, 230, base.heightCm || 178),
    targetWeightKg: clampGoalNumber(p.targetWeightKg, 30, 250, base.targetWeightKg || 76),
    age: clampGoalNumber(p.age, 1, 120, base.age || 30),
    sex: ['male', 'female'].includes(p.sex) ? p.sex : (base.sex || 'male'),
    weightGoal: ['lose', 'maintain', 'gain'].includes(p.weightGoal) ? p.weightGoal : (base.weightGoal || 'maintain'),
    activityLevel: ['sedentary', 'light', 'moderate', 'high'].includes(p.activityLevel) ? p.activityLevel : (base.activityLevel || 'moderate'),
    activityMinutesWeek: clampGoalNumber(p.activityMinutesWeek, 0, 2000, base.activityMinutesWeek || 180),
  };
}

function clampGoalNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function roundToStep(value, step) {
  return Math.round(Number(value || 0) / step) * step;
}

function goalRange(min, max, step) {
  const outMin = roundToStep(min, step);
  const outMax = Math.max(outMin + step, roundToStep(max, step));
  return { min: outMin, max: outMax, step };
}

function clampGoalValue(value, range) {
  return roundToStep(clampGoalNumber(value, range.min, range.max, range.min), range.step);
}

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
