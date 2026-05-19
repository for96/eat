// app.jsx — main App: navigation, state, tweaks panel
// Stato persistito sul backend via window.api (vedi api.js).
// Niente più localStorage: ricaricare la pagina rilegge tutto dal server.

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function App() {
  // ── tweaks ──
  const [tw, setTweak] = useTweaks(window.PASTO_DEFAULTS);
  useEffectApp(() => {
    document.body.dataset.palette = tw.palette;
    document.body.dataset.density = tw.density;
    document.body.dataset.type = tw.typography;
  }, [tw]);

  // ── stato caricato dal backend ──
  const [history, setHistory] = useStateApp({});
  const [goals, setGoalsState] = useStateApp({ ...window.DEFAULT_GOALS });
  const [ready, setReady] = useStateApp(false);
  const [loadError, setLoadError] = useStateApp(null);

  // Carica catalogo foods, preferiti, obiettivi, e ultimi 35 giorni al boot.
  useEffectApp(() => {
    (async () => {
      try {
        const today = new Date();
        const past = new Date(today); past.setDate(past.getDate() - 35);
        const toKey = window.dateKey(today);
        const fromKey = window.dateKey(past);

        const [foods, favorites, goalsApi, range, todayWater] = await Promise.all([
          window.api.foods.search('', 50),
          window.api.favorites.list(),
          window.api.goals.get(),
          window.api.meals.range(fromKey, toKey),
          window.api.water.get(toKey),
        ]);

        window.FOODS = foods;
        window.FAVORITES = (favorites || []).map(f => ({
          id: f.id,
          name: f.name,
          items: (f.items || []).map(it => {
            const triple = [it.foodId, it.qty];
            if (it.unit) triple.push(it.unit);
            return triple;
          }),
        }));

        setGoalsState({
          kcal: goalsApi.kcal,
          p: goalsApi.protein_g,
          c: goalsApi.carbs_g,
          fat: goalsApi.fat_g,
          fb: goalsApi.fiber_g,
          water_ml: goalsApi.water_ml,
        });

        const grouped = window.groupEntriesByDate(range.entries || []);
        if (!grouped[toKey]) {
          grouped[toKey] = { colazione: [], pranzo: [], cena: [], spuntini: [], water_ml: 0 };
        }
        grouped[toKey].water_ml = todayWater.ml || 0;
        setHistory(grouped);
        setReady(true);
      } catch (e) {
        console.error('Errore caricamento backend:', e);
        setLoadError(e.message || String(e));
      }
    })();
  }, []);

  // setGoals wrappato: aggiorna stato locale e fa PUT al backend (fire-and-forget).
  const setGoals = (next) => {
    const obj = typeof next === 'function' ? next(goals) : next;
    setGoalsState(obj);
    window.api.goals.put({
      kcal: obj.kcal,
      protein_g: obj.p,
      carbs_g: obj.c,
      fat_g: obj.fat,
      fiber_g: obj.fb,
      water_ml: obj.water_ml,
    }).catch(err => console.error('PUT /goals fallito:', err));
  };

  // ── navigation ──
  const [tab, setTab] = useStateApp('today');

  // ── add meal modal ──
  const [addOpen, setAddOpen] = useStateApp(false);
  const [addSlot, setAddSlot] = useStateApp('colazione');

  const openAdd = (slot) => {
    if (!slot) {
      const h = new Date().getHours();
      slot = h < 11 ? 'colazione' : h < 15 ? 'pranzo' : h < 18 ? 'spuntini' : 'cena';
    }
    setAddSlot(slot);
    setAddOpen(true);
  };

  // ── mutations: optimistic UI + chiamata backend, rollback su errore ──
  const todayKey = window.dateKey(new Date());

  const handleAddEntry = async (slot, entry) => {
    // entry locale ha id temporaneo "e_..." — il backend ne assegnerà uno definitivo.
    setHistory(h => {
      const day = h[todayKey] || { colazione: [], pranzo: [], cena: [], spuntini: [], water_ml: 0 };
      return { ...h, [todayKey]: { ...day, [slot]: [...(day[slot] || []), entry] } };
    });
    setAddOpen(false);
    try {
      const created = await window.api.meals.add({
        date: todayKey,
        slot,
        foodId: entry.foodId,
        qty: entry.qty,
        unit: entry.unit,
        source: entry.source || 'manual',
      });
      // Sostituisci id ottimistico con quello reale.
      setHistory(h => {
        const day = h[todayKey]; if (!day) return h;
        return {
          ...h,
          [todayKey]: {
            ...day,
            [slot]: day[slot].map(e => e.id === entry.id ? { ...e, id: created.id, grams: created.grams } : e),
          },
        };
      });
    } catch (e) {
      console.error('POST /meals fallito:', e);
      // rollback
      setHistory(h => {
        const day = h[todayKey]; if (!day) return h;
        return { ...h, [todayKey]: { ...day, [slot]: day[slot].filter(x => x.id !== entry.id) } };
      });
    }
  };

  const handleRemoveEntry = async (slot, id) => {
    let snapshot;
    setHistory(h => {
      const day = h[todayKey]; if (!day) return h;
      snapshot = day[slot].find(e => e.id === id);
      return { ...h, [todayKey]: { ...day, [slot]: day[slot].filter(e => e.id !== id) } };
    });
    try { await window.api.meals.remove(id); }
    catch (e) {
      console.error('DELETE /meals fallito:', e);
      if (snapshot) {
        setHistory(h => {
          const day = h[todayKey] || { colazione: [], pranzo: [], cena: [], spuntini: [], water_ml: 0 };
          return { ...h, [todayKey]: { ...day, [slot]: [...day[slot], snapshot] } };
        });
      }
    }
  };

  const handleWaterDelta = async (delta) => {
    setHistory(h => {
      const day = h[todayKey] || { colazione: [], pranzo: [], cena: [], spuntini: [], water_ml: 0 };
      return { ...h, [todayKey]: { ...day, water_ml: Math.max(0, (day.water_ml || 0) + delta) } };
    });
    try {
      const res = await window.api.water.delta(todayKey, delta);
      setHistory(h => {
        const day = h[todayKey] || { colazione: [], pranzo: [], cena: [], spuntini: [], water_ml: 0 };
        return { ...h, [todayKey]: { ...day, water_ml: res.ml } };
      });
    } catch (e) {
      console.error('POST /water/delta fallito:', e);
    }
  };

  if (loadError) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink)', fontFamily: 'system-ui' }}>
        <h2>Backend non raggiungibile</h2>
        <p style={{ color: 'var(--ink-soft)' }}>{loadError}</p>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Verifica che il server giri su <code>{(window.PASTO_API_BASE || 'http://localhost:3000')}</code> e ricarica.
        </p>
      </div>
    );
  }
  if (!ready) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)', fontFamily: 'system-ui' }}>Caricamento…</div>;
  }

  return (
    <div className="ambient">
      <div className="stage">
        <TopBar
          palette={tw.palette}
          onPalette={v => setTweak('palette', v)}
          onSearch={() => openAdd()}
        />
        <div className="scroller" key={tab}>
          {tab === 'today' && (
            <TodayScreen
              history={history}
              goals={goals}
              onAddRequest={openAdd}
              onRemoveEntry={handleRemoveEntry}
              onWaterDelta={handleWaterDelta}
            />
          )}
          {tab === 'calendar' && <CalendarScreen history={history} goals={goals} />}
          {tab === 'stats' && <StatsScreen history={history} goals={goals} />}
          {tab === 'profile' && <ProfileScreen goals={goals} onGoalsChange={setGoals} />}
        </div>

        <BottomNav tab={tab} onChange={setTab} onAdd={() => openAdd()} />

        <AddMealSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          defaultSlot={addSlot}
          onAdd={handleAddEntry}
        />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette" />
        <PaletteRadio value={tw.palette} onChange={v => setTweak('palette', v)} />

        <TweakSection label="Tipografia" />
        <TweakSelect label="Famiglia"
          value={tw.typography}
          options={[
            { value: 'editoriale', label: 'Editoriale — Newsreader' },
            { value: 'instrument', label: 'Editoriale — Instrument Serif' },
            { value: 'classico',   label: 'Classico — DM Serif Display' },
            { value: 'moderno',    label: 'Moderno — solo sans' },
          ]}
          onChange={v => setTweak('typography', v)} />

        <TweakSection label="Densità" />
        <TweakRadio label="Spaziatura" value={tw.density}
          options={[
            { value: 'compact', label: 'Compatta' },
            { value: 'regular', label: 'Standard' },
            { value: 'cozy',    label: 'Ampia' },
          ]}
          onChange={v => setTweak('density', v)} />

        <TweakSection label="Dati" />
        <TweakButton label="Ricarica dal server" secondary onClick={() => {
          // I dati ora vivono sul backend. Un reload li rilegge da lì.
          location.reload();
        }} />
      </TweaksPanel>
    </div>
  );
}

// ─── Palette swatch picker (curated, with name caption) ───────────────────
function PaletteRadio({ value, onChange }) {
  const palettes = [
    { value: 'crema', label: 'Crema',  colors: ['#F2ECDF','#C25A3A','#1F1B16'] },
    { value: 'notte', label: 'Notte',  colors: ['#211C16','#E0794E','#F5EFE2'] },
    { value: 'bosco', label: 'Bosco',  colors: ['#ECEEE4','#3D6B3E','#1B2418'] },
    { value: 'carta', label: 'Carta',  colors: ['#F7F6F2','#2A4DB8','#0F1115'] },
  ];
  return (
    <div className="pal-grid">
      {palettes.map(p => (
        <button key={p.value} className={`pal-chip ${value === p.value ? 'on' : ''}`}
                onClick={() => onChange(p.value)}>
          <div className="pal-swatch">
            <i style={{ background: p.colors[0] }} />
            <i style={{ background: p.colors[1] }} />
            <i style={{ background: p.colors[2] }} />
          </div>
          <span>{p.label}</span>
        </button>
      ))}
      <style>{`
        .pal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .pal-chip {
          appearance: none; border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.5);
          border-radius: 8px; padding: 6px; cursor: pointer; font: inherit;
          display: flex; align-items: center; gap: 8px; color: inherit;
          transition: border-color 0.12s, background 0.12s;
        }
        .pal-chip.on { border-color: rgba(0,0,0,0.7); background: rgba(255,255,255,0.85); }
        .pal-swatch { display: flex; height: 18px; width: 36px; border-radius: 4px; overflow: hidden;
          box-shadow: 0 0 0 0.5px rgba(0,0,0,0.1); }
        .pal-swatch i { flex: 1; }
        .pal-chip > span { font-size: 11px; font-weight: 500; }
      `}</style>
    </div>
  );
}

// ─── Bottom navigation ────────────────────────────────────────────────────
function BottomNav({ tab, onChange, onAdd }) {
  return (
    <nav className="bnav">
      <NavBtn icon="home"     label="Oggi"        on={tab === 'today'}    onClick={() => onChange('today')} />
      <NavBtn icon="calendar" label="Storico"     on={tab === 'calendar'} onClick={() => onChange('calendar')} />
      <button className="fab" onClick={onAdd} aria-label="Aggiungi pasto">
        <Icon name="plus" size={24} stroke={2} />
      </button>
      <NavBtn icon="stats"    label="Statistiche" on={tab === 'stats'}    onClick={() => onChange('stats')} />
      <NavBtn icon="user"     label="Profilo"     on={tab === 'profile'}  onClick={() => onChange('profile')} />

      <style>{`
        .bnav {
          flex-shrink: 0;
          display: grid; grid-template-columns: 1fr 1fr 64px 1fr 1fr;
          align-items: center;
          padding: 10px 16px 16px;
          background: linear-gradient(180deg, transparent, var(--bg) 30%);
          gap: 4px;
          position: relative;
        }
        .bnav::before {
          content: ""; position: absolute; left: 16px; right: 16px; top: 0;
          height: 1px; background: var(--line-soft);
        }
        .nav-btn {
          appearance: none; border: 0; background: transparent;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 6px 4px; cursor: pointer; color: var(--ink-faint);
          font: inherit; font-size: 10px; font-weight: 500; letter-spacing: 0.02em;
          transition: color 0.15s;
        }
        .nav-btn.on { color: var(--ink); }
        .nav-btn:hover:not(.on) { color: var(--ink-soft); }
        .fab {
          width: 52px; height: 52px; border-radius: 26px;
          background: var(--accent); color: #fff; border: 0; cursor: pointer;
          display: grid; place-items: center;
          margin: 0 auto;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.2) inset,
            0 6px 16px -4px color-mix(in oklab, var(--accent) 60%, transparent),
            0 0 0 4px var(--bg);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .fab:hover { transform: translateY(-2px); }
        .fab:active { transform: scale(0.95); }
      `}</style>
    </nav>
  );
}
function NavBtn({ icon, label, on, onClick }) {
  return (
    <button className={`nav-btn ${on ? 'on' : ''}`} onClick={onClick}>
      <Icon name={icon} size={20} stroke={on ? 2 : 1.6} />
      <span>{label}</span>
    </button>
  );
}

// ─── Top bar (search + theme switch) ──────────────────────────────────────
// Floats over all screens at top-right. The search button opens the Add Meal
// sheet on its "Cerca" tab (default); the switch toggles light/dark palette.
function TopBar({ palette, onPalette, onSearch }) {
  const isDark = palette === 'notte';
  return (
    <div className="topbar">
      <button className="tb-icon" onClick={onSearch} aria-label="Cerca alimento">
        <Icon name="search" size={15} stroke={1.9} />
      </button>
      <button className="tb-theme" onClick={() => onPalette(isDark ? 'crema' : 'notte')}
              aria-label={isDark ? 'Tema chiaro' : 'Tema scuro'} data-dark={isDark ? '1' : '0'}>
        <span className="tb-theme-icon left"><Icon name="sun" size={12} stroke={1.8} /></span>
        <span className="tb-theme-icon right"><Icon name="moon" size={12} stroke={1.8} /></span>
        <span className="tb-theme-thumb"><Icon name={isDark ? 'moon' : 'sun'} size={13} stroke={1.9} /></span>
      </button>
      <style>{`
        .topbar {
          position: absolute; top: 14px; right: 14px; z-index: 30;
          display: flex; align-items: center; gap: 6px;
        }
        .tb-icon, .tb-theme {
          appearance: none; padding: 0; cursor: pointer;
          border: 1px solid var(--line);
          background: color-mix(in oklab, var(--surface) 75%, transparent);
          -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
          border-radius: 999px; height: 28px;
          transition: border-color 0.15s, color 0.15s;
        }
        .tb-icon {
          width: 30px; color: var(--ink-2);
          display: grid; place-items: center;
        }
        .tb-icon:hover { color: var(--ink); border-color: var(--ink-faint); }
        .tb-theme { position: relative; width: 52px; }
        .tb-theme:hover { border-color: var(--ink-faint); }
        .tb-theme-icon {
          position: absolute; top: 0; bottom: 0; width: 26px;
          display: grid; place-items: center; color: var(--ink-faint);
          pointer-events: none; transition: color 0.2s;
        }
        .tb-theme-icon.left { left: 0; }
        .tb-theme-icon.right { right: 0; }
        .tb-theme[data-dark="0"] .tb-theme-icon.left { color: transparent; }
        .tb-theme[data-dark="1"] .tb-theme-icon.right { color: transparent; }
        .tb-theme-thumb {
          position: absolute; top: 2px; left: 2px;
          width: 22px; height: 22px; border-radius: 999px;
          background: var(--ink); color: var(--bg);
          display: grid; place-items: center;
          box-shadow: 0 1px 3px rgba(31,27,22,0.18);
          transition: transform 0.28s cubic-bezier(.4,1.3,.5,1), background 0.2s;
        }
        .tb-theme[data-dark="1"] .tb-theme-thumb { transform: translateX(24px); }
      `}</style>
    </div>
  );
}

// ─── Mount ─────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
