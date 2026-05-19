// api.js — client REST per il backend Pasto.
// Versione single-user: nessun token, ogni richiesta va dritta agli endpoint.
// Quando aggiungerai login, basterà aggiungere gestione token qui dentro.

(function () {
  // Base URL del backend:
  // - In produzione (Vercel) frontend e backend stanno sullo stesso dominio → relativo "/api/v1".
  // - In dev locale frontend gira su un'altra porta (es. 5173) e il backend su 3000:
  //   si setta window.PASTO_API_BASE = 'http://localhost:3000' nell'index.html dev,
  //   oppure si lascia che venga auto-rilevato qui sotto.
  const isLocalDev =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    location.port !== '3000';
  const explicit = typeof window !== 'undefined' ? window.PASTO_API_BASE : undefined;
  const BASE = (explicit ?? (isLocalDev ? 'http://localhost:3000' : '')) + '/api/v1';

  async function req(method, path, body) {
    const opts = {
      method,
      headers: { Accept: 'application/json' },
    };
    if (body !== undefined && !(body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      opts.body = body;
    }
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`API ${method} ${path} → ${res.status}: ${text || res.statusText}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  // Converte un food del backend (snake_case) nella shape window.FOODS (camelCase corto)
  // usata dal frontend esistente.
  function adaptFood(f) {
    return {
      id: f.id,
      name: f.name,
      cat: f.cat || f.category,
      kcal: f.kcal ?? f.kcal_100,
      p: f.p ?? f.protein_100,
      c: f.c ?? f.carbs_100,
      f: f.f ?? f.fat_100,
      fb: f.fb ?? f.fiber_100 ?? 0,
      sg: f.sg ?? f.sugars_100 ?? 0,
      sf: f.sf ?? f.sat_fat_100 ?? 0,
      unit: f.unit,
      serving: f.serving ?? f.default_serving,
      per_unit_g: f.per_unit_g,
      brand: f.brand,
      image_url: f.image_url,
      source: f.source,
    };
  }

  function adaptEntry(e) {
    return {
      id: e.id,
      foodId: e.foodId,
      qty: e.qty,
      unit: e.unit,
      grams: e.grams,
      // NB: lo storico nel frontend usa computeMacros dal Food corrente;
      // qui i macros snapshottati sono comunque disponibili come riferimento.
      _snapshot: { kcal: e.kcal, p: e.p, c: e.c, fat: e.fat, fb: e.fb, sg: e.sg, sf: e.sf },
      source: e.source,
    };
  }

  window.api = {
    base: BASE,
    req,
    adaptFood,
    adaptEntry,

    me: () => req('GET', '/me'),

    goals: {
      get: () => req('GET', '/goals'),
      put: (partial) => req('PUT', '/goals', partial),
    },

    foods: {
      search: (q = '', limit = 30) =>
        req('GET', `/foods/search?q=${encodeURIComponent(q)}&limit=${limit}`).then(
          (r) => (r.foods || []).map(adaptFood)
        ),
      get: (id) => req('GET', `/foods/${encodeURIComponent(id)}`).then((r) => adaptFood(r.food)),
      barcode: (ean) =>
        req('POST', '/foods/barcode', { ean }).then((r) => adaptFood(r.food)),
      create: (body) => req('POST', '/foods', body).then((r) => adaptFood(r.food)),
    },

    meals: {
      forDate: (date) => req('GET', `/meals/${date}`),
      range: (from, to) => req('GET', `/meals?from=${from}&to=${to}`),
      add: ({ date, slot, foodId, qty, unit, source = 'manual' }) =>
        req('POST', '/meals', {
          date,
          slot,
          food_id: foodId,
          qty,
          unit,
          source,
        }).then((r) => r.entry),
      patch: (id, patch) =>
        req('PATCH', `/meals/${id}`, patch).then((r) => r.entry),
      remove: (id) => req('DELETE', `/meals/${id}`),
    },

    water: {
      get: (date) => req('GET', `/water/${date}`),
      put: (date, ml) => req('PUT', `/water/${date}`, { ml }),
      delta: (date, delta) => req('POST', `/water/${date}/delta`, { delta }),
    },

    favorites: {
      list: () => req('GET', '/favorites').then((r) => r.favorites),
      create: (name, items) => req('POST', '/favorites', { name, items }),
      remove: (id) => req('DELETE', `/favorites/${id}`),
      apply: (id, date, slot) =>
        req('POST', `/favorites/${id}/apply`, { date, slot }),
    },

    ai: {
      estimateText: (description) =>
        req('POST', '/ai/estimate-text', { description }),
      estimateImage: (file) => {
        const fd = new FormData();
        fd.append('image', file);
        return req('POST', '/ai/estimate-image', fd);
      },
    },

    stats: {
      summary: (days = 7) => req('GET', `/stats/summary?days=${days}`),
    },
  };

  // Helper: trasforma un array di entries flat in struttura history[date][slot] = [entry]
  // come il frontend si aspetta.
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
      });
    }
    return h;
  };
})();
