// api.js - local-first adapter. Il backend resta solo un proxy leggero
// per Open Food Facts e future API key.

(function () {
  const CURRENT_VERSION = 3;
  const STORAGE_KEY = 'pasto.local.v3';
  const LEGACY_STORAGE_KEYS = ['pasto.local.v2'];
  const MAX_SCANS = 60;
  const isLocalDev =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    location.port !== '3000';
  const explicit = typeof window !== 'undefined' ? window.PASTO_API_BASE : undefined;
  const BASE = (explicit ?? (isLocalDev ? 'http://localhost:3000' : '')) + '/api/v1';

  const seed = window.PASTO_SEED || { foods: [], favorites: [], default_goals: window.DEFAULT_GOALS };

  function normalizeProfile(profile = {}) {
    profile = profile && typeof profile === 'object' ? profile : {};
    const base = window.DEFAULT_PROFILE || {};
    return {
      ...base,
      ...profile,
      firstName: cleanString(profile.firstName ?? base.firstName),
      lastName: cleanString(profile.lastName ?? base.lastName),
      weightKg: clampNumber(profile.weightKg ?? base.weightKg, 30, 250, base.weightKg),
      heightCm: clampNumber(profile.heightCm ?? base.heightCm, 120, 230, base.heightCm),
      targetWeightKg: clampNumber(profile.targetWeightKg ?? base.targetWeightKg, 30, 250, base.targetWeightKg),
      weightGoal: ['lose', 'maintain', 'gain'].includes(profile.weightGoal) ? profile.weightGoal : base.weightGoal,
      activityLevel: ['sedentary', 'light', 'moderate', 'high'].includes(profile.activityLevel) ? profile.activityLevel : base.activityLevel,
      activityMinutesWeek: clampNumber(profile.activityMinutesWeek ?? base.activityMinutesWeek, 0, 2000, base.activityMinutesWeek),
      avatarDataUrl: typeof profile.avatarDataUrl === 'string' ? profile.avatarDataUrl : null,
      updatedAt: profile.updatedAt || null,
    };
  }

  function cleanString(value) {
    return typeof value === 'string' ? value.trim().slice(0, 80) : '';
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeFood(f) {
    return {
      id: f.id,
      source: f.source || 'seed',
      external_id: f.external_id || f.externalId || null,
      name: f.name,
      cat: f.cat || f.category || 'Generico',
      category: f.category || f.cat || 'Generico',
      kcal: +(f.kcal ?? f.kcal_100 ?? 0),
      p: +(f.p ?? f.protein_100 ?? 0),
      c: +(f.c ?? f.carbs_100 ?? 0),
      f: +(f.f ?? f.fat_100 ?? 0),
      fb: +(f.fb ?? f.fiber_100 ?? 0),
      sg: +(f.sg ?? f.sugars_100 ?? 0),
      sf: +(f.sf ?? f.sat_fat_100 ?? 0),
      unit: f.unit || 'g',
      serving: +(f.serving ?? f.default_serving ?? 100),
      per_unit_g: f.per_unit_g ?? null,
      brand: f.brand ?? null,
      image_url: f.image_url ?? f.imageUrl ?? null,
    };
  }

  function normalizeFavorite(fav) {
    return {
      id: fav.id,
      name: fav.name,
      items: (fav.items || []).map((item) => {
        if (Array.isArray(item)) {
          return { foodId: item[0], qty: item[1], unit: item[2] || null };
        }
        return {
          foodId: item.foodId,
          qty: item.qty,
          unit: item.unit || null,
        };
      }),
      createdAt: fav.createdAt || new Date().toISOString(),
    };
  }

  function initialState() {
    return {
      version: CURRENT_VERSION,
      profile: normalizeProfile(window.DEFAULT_PROFILE),
      goals: { ...(seed.default_goals || window.DEFAULT_GOALS) },
      foods: (seed.foods || []).map(normalizeFood),
      favorites: (seed.favorites || []).map(normalizeFavorite),
      history: {},
      scans: [],
    };
  }

  function readState() {
    let stored = null;
    const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    try {
      for (const key of keys) {
        stored = JSON.parse(localStorage.getItem(key) || 'null');
        if (stored) break;
      }
    } catch {}

    const base = initialState();
    if (!stored || (stored.version !== 2 && stored.version !== CURRENT_VERSION)) return base;

    const foodMap = new Map(base.foods.map((f) => [f.id, f]));
    for (const food of stored.foods || []) {
      foodMap.set(food.id, normalizeFood(food));
    }
    return {
      ...base,
      ...stored,
      version: CURRENT_VERSION,
      profile: normalizeProfile(stored.profile || base.profile),
      favorites: (stored.favorites || base.favorites).map(normalizeFavorite),
      foods: [...foodMap.values()],
      history: stored.history || {},
      scans: stored.scans || [],
    };
  }

  let state = readState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Persistenza locale non disponibile:', e);
    }
  }

  function syncGlobals() {
    window.FOODS = state.foods.map(normalizeFood);
    window.FAVORITES = state.favorites.map((fav) => ({
      id: fav.id,
      name: fav.name,
      items: fav.items.map((it) => {
        const row = [it.foodId, it.qty];
        if (it.unit) row.push(it.unit);
        return row;
      }),
    }));
  }

  function snapshot() {
    return {
      foods: state.foods.map(normalizeFood),
      favorites: state.favorites.map(normalizeFavorite),
      goals: { ...state.goals },
      profile: normalizeProfile(state.profile),
      history: { ...state.history },
      scans: [...state.scans],
    };
  }

  function ensureDay(date) {
    if (!state.history[date]) {
      state.history[date] = {
        colazione: [],
        pranzo: [],
        cena: [],
        spuntini: [],
        water_ml: 0,
      };
    }
    return state.history[date];
  }

  function flattenEntries(from, to) {
    const entries = [];
    for (const [date, day] of Object.entries(state.history)) {
      if (from && date < from) continue;
      if (to && date > to) continue;
      for (const slot of ['colazione', 'pranzo', 'cena', 'spuntini']) {
        for (const entry of day[slot] || []) {
          entries.push({ ...entry, date, slot });
        }
      }
    }
    return entries.sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id));
  }

  function entrySnapshot(food, qty, unit, source) {
    const grams = window.servingToGrams(food, qty);
    const macros = window.computeMacros(food.id, grams);
    return {
      id: 'e_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      foodId: food.id,
      qty,
      unit: unit || food.unit,
      grams,
      kcal: macros.kcal,
      p: macros.p,
      c: macros.c,
      fat: macros.fat,
      fb: macros.fb,
      sg: macros.sg,
      sf: macros.sf,
      source,
    };
  }

  async function req(method, path, body) {
    const opts = {
      method,
      headers: { Accept: 'application/json' },
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`API ${method} ${path} -> ${res.status}: ${text || res.statusText}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function lookupBarcode(ean) {
    const data = await req('POST', '/barcode/lookup', { ean });
    const food = normalizeFood(data.food);
    state.foods = [...state.foods.filter((f) => f.id !== food.id), food];
    state.scans = [
      {
        id: 'scan_' + Date.now(),
        ean,
        foodId: food.id,
        foodName: food.name,
        brand: food.brand,
        image_url: food.image_url,
        quality: data.quality,
        scannedAt: new Date().toISOString(),
      },
      ...state.scans,
    ].slice(0, MAX_SCANS);
    save();
    syncGlobals();
    return { food, quality: data.quality };
  }

  function resetLocalData() {
    state = initialState();
    save();
    syncGlobals();
    return state;
  }

  syncGlobals();

  window.api = {
    base: BASE,
    req,
    normalizeFood,
    boot: async () => {
      syncGlobals();
      return snapshot();
    },
    bootSnapshot: () => {
      syncGlobals();
      return snapshot();
    },
    local: {
      state: () => state,
      reset: resetLocalData,
      scans: () => state.scans,
      profile: () => normalizeProfile(state.profile),
    },
    profile: {
      get: async () => normalizeProfile(state.profile),
      put: async (patch) => {
        state.profile = normalizeProfile({
          ...state.profile,
          ...patch,
          updatedAt: new Date().toISOString(),
        });
        save();
        return normalizeProfile(state.profile);
      },
    },
    me: async () => {
      const profile = normalizeProfile(state.profile);
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Profilo locale';
      return { user: { id: 'local-user', name, profile } };
    },
    goals: {
      get: async () => ({
        kcal: state.goals.kcal,
        protein_g: state.goals.p,
        carbs_g: state.goals.c,
        fat_g: state.goals.fat,
        fiber_g: state.goals.fb,
        water_ml: state.goals.water_ml,
      }),
      put: async (partial) => {
        state.goals = {
          ...state.goals,
          ...(partial.kcal !== undefined && { kcal: partial.kcal }),
          ...(partial.protein_g !== undefined && { p: partial.protein_g }),
          ...(partial.carbs_g !== undefined && { c: partial.carbs_g }),
          ...(partial.fat_g !== undefined && { fat: partial.fat_g }),
          ...(partial.fiber_g !== undefined && { fb: partial.fiber_g }),
          ...(partial.water_ml !== undefined && { water_ml: partial.water_ml }),
        };
        save();
        return window.api.goals.get();
      },
    },
    foods: {
      search: async (q = '', limit = 30) => {
        const query = q.trim().toLowerCase();
        const foods = query
          ? state.foods.filter((f) =>
              f.name.toLowerCase().includes(query) ||
              f.cat.toLowerCase().includes(query) ||
              (f.brand || '').toLowerCase().includes(query)
            )
          : state.foods;
        return foods.slice(0, limit).map(normalizeFood);
      },
      get: async (id) => normalizeFood(state.foods.find((f) => f.id === id)),
      barcode: async (ean) => {
        const { food } = await lookupBarcode(ean);
        return food;
      },
      lookupBarcode,
      create: async (body) => {
        const food = normalizeFood({
          ...body,
          id: 'user-' + Date.now(),
          source: 'user',
          kcal: body.kcal_100,
          p: body.protein_100,
          c: body.carbs_100,
          f: body.fat_100,
          fb: body.fiber_100 || 0,
          sg: body.sugars_100 || 0,
          sf: body.sat_fat_100 || 0,
          cat: body.category,
          serving: body.default_serving,
        });
        state.foods = [...state.foods, food];
        save();
        syncGlobals();
        return food;
      },
    },
    meals: {
      forDate: async (date) => ({ date, slots: ensureDay(date), water_ml: ensureDay(date).water_ml }),
      range: async (from, to) => ({ entries: flattenEntries(from, to) }),
      add: async ({ date, slot, foodId, qty, unit, source = 'manual' }) => {
        const food = state.foods.find((f) => f.id === foodId);
        if (!food) throw new Error(`Food ${foodId} non trovato`);
        const day = ensureDay(date);
        const entry = entrySnapshot(food, qty, unit, source);
        day[slot] = [...(day[slot] || []), entry];
        save();
        return entry;
      },
      patch: async (id, patch) => {
        for (const day of Object.values(state.history)) {
          for (const slot of ['colazione', 'pranzo', 'cena', 'spuntini']) {
            const idx = (day[slot] || []).findIndex((entry) => entry.id === id);
            if (idx < 0) continue;
            const current = day[slot][idx];
            const food = state.foods.find((f) => f.id === current.foodId);
            const nextSlot = patch.slot || slot;
            const next = entrySnapshot(food, patch.qty ?? current.qty, patch.unit || current.unit, current.source);
            next.id = id;
            day[slot].splice(idx, 1);
            day[nextSlot] = [...(day[nextSlot] || []), next];
            save();
            return next;
          }
        }
        throw new Error('Pasto non trovato');
      },
      remove: async (id) => {
        for (const day of Object.values(state.history)) {
          for (const slot of ['colazione', 'pranzo', 'cena', 'spuntini']) {
            day[slot] = (day[slot] || []).filter((entry) => entry.id !== id);
          }
        }
        save();
        return null;
      },
    },
    water: {
      get: async (date) => ({ date, ml: ensureDay(date).water_ml || 0 }),
      put: async (date, ml) => {
        ensureDay(date).water_ml = Math.max(0, ml);
        save();
        return { date, ml: ensureDay(date).water_ml };
      },
      delta: async (date, delta) => {
        const day = ensureDay(date);
        day.water_ml = Math.max(0, (day.water_ml || 0) + delta);
        save();
        return { date, ml: day.water_ml };
      },
    },
    favorites: {
      list: async () => state.favorites,
      create: async (name, items) => {
        const favorite = normalizeFavorite({
          id: 'fav_' + Date.now(),
          name,
          items,
          createdAt: new Date().toISOString(),
        });
        state.favorites = [...state.favorites, favorite];
        save();
        syncGlobals();
        return favorite;
      },
      remove: async (id) => {
        state.favorites = state.favorites.filter((fav) => fav.id !== id);
        save();
        syncGlobals();
        return null;
      },
      apply: async (id, date, slot) => {
        const fav = state.favorites.find((f) => f.id === id);
        if (!fav) throw new Error('Preferito non trovato');
        const entries = [];
        for (const item of fav.items) {
          entries.push(await window.api.meals.add({
            date,
            slot,
            foodId: item.foodId,
            qty: item.qty,
            unit: item.unit,
            source: 'favorite',
          }));
        }
        return { entries };
      },
    },
    ai: {
      estimateText: async () => {
        throw Object.assign(new Error('AI non disponibile'), { status: 503 });
      },
      estimateImage: async () => {
        throw Object.assign(new Error('Foto AI non disponibile'), { status: 503 });
      },
    },
    stats: {
      summary: async (days = 7) => ({ days, local: true }),
    },
  };

  window.groupEntriesByDate = function (entries) {
    const h = {};
    for (const e of entries) {
      if (!h[e.date]) {
        h[e.date] = {
          colazione: [],
          pranzo: [],
          cena: [],
          spuntini: [],
          water_ml: 0,
        };
      }
      h[e.date][e.slot].push({
        id: e.id,
        foodId: e.foodId,
        qty: e.qty,
        unit: e.unit,
        grams: e.grams,
        source: e.source,
      });
    }
    return h;
  };
})();
