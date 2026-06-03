// screens.jsx — Today, Calendar/History, Stats, Profile screens
const { useState: useStateSc, useMemo: useMemoSc, useEffect: useEffectSc, useRef: useRefSc } = React;

// ════════════════════════════════════════════════════════════════════════
// TODAY SCREEN
// ════════════════════════════════════════════════════════════════════════
function TodayScreen({ history, goals, onAddRequest, onRemoveEntry, onWaterDelta }) {
  const today = new Date();
  const key = window.dateKey(today);
  const day = history[key] || { colazione: [], pranzo: [], cena: [], spuntini: [], water_ml: 0 };
  const total = window.totalDay(day);
  const remaining = Math.max(0, goals.kcal - total.kcal);
  const kcalPct = total.kcal / goals.kcal;

  return (
    <div className="today">
      <header className="today-head">
        <div>
          <div className="eyebrow">{window.greeting()}</div>
          <h1 className="today-title display">
            {window.formatDate(today, { weekday: true })}
          </h1>
        </div>
      </header>

      {/* Hero — kcal ring + macros */}
      <section className="hero-card">
        <div className="hero-grid">
          <Ring size={148} stroke={10}
                tracks={[
                  { value: kcalPct, color: 'var(--kcal)', bg: 'var(--line-soft)' },
                ]}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>Calorie</div>
              <div className="display num" style={{ fontSize: 36, lineHeight: 1, fontWeight: 400 }}>
                {total.kcal.toLocaleString('it-IT')}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>
                <span className="num">{goals.kcal.toLocaleString('it-IT')}</span> obiettivo
              </div>
            </div>
          </Ring>

          <div className="hero-side">
            <div className="hero-remain">
              <div className="eyebrow">Rimanenti</div>
              <div className="display num" style={{ fontSize: 34, lineHeight: 1, color: 'var(--accent)' }}>
                {remaining.toLocaleString('it-IT')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>kcal</div>
            </div>
            <div className="hero-pace">
              <span className={`pace-dot ${kcalPct < 0.85 ? 'on' : 'off'}`} />
              <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
                {kcalPct < 0.4 ? 'Devi mangiare' :
                 kcalPct < 0.85 ? 'In linea con l\'obiettivo' :
                 kcalPct < 1.05 ? 'Quasi al limite' :
                 'Hai superato l\'obiettivo'}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-macros">
          <MacroBar label="Proteine"    value={total.p}   goal={goals.p}   color="var(--protein)" />
          <MacroBar label="Carboidrati" value={total.c}   goal={goals.c}   color="var(--carbs)" />
          <MacroBar label="Grassi"      value={total.fat} goal={goals.fat} color="var(--fat)" />
          <MacroBar label="Fibre"       value={total.fb}  goal={goals.fb}  color="var(--fiber)" />
        </div>
      </section>

      <WaterTracker
        ml={day.water_ml}
        goal={goals.water_ml}
        onAdd={() => onWaterDelta(+250)}
        onRemove={() => onWaterDelta(-250)}
      />

      <section className="meals">
        <div className="section-head">
          <h2 className="display section-title">I pasti di oggi</h2>
        </div>
        <MealCard slot="colazione" icon="sun"   entries={day.colazione} onAdd={() => onAddRequest('colazione')} onRemove={onRemoveEntry} />
        <MealCard slot="pranzo"    icon="fork"  entries={day.pranzo}    onAdd={() => onAddRequest('pranzo')}    onRemove={onRemoveEntry} />
        <MealCard slot="cena"      icon="moon"  entries={day.cena}      onAdd={() => onAddRequest('cena')}      onRemove={onRemoveEntry} />
        <MealCard slot="spuntini"  icon="leaf"  entries={day.spuntini}  onAdd={() => onAddRequest('spuntini')}  onRemove={onRemoveEntry} compact />
      </section>

      <div style={{ height: 24 }} />

      <style>{`
        .today { padding: 12px 18px 16px; }
        .today-head { display: flex; justify-content: space-between; align-items: flex-end;
          padding: 6px 100px 18px 0; }
        .today-title { font-size: 26px; font-style: italic; font-weight: 400; line-height: 1.1;
          margin: 4px 0 0; text-transform: lowercase; color: var(--ink); letter-spacing: -0.01em; }
        body[data-type="moderno"] .today-title { font-style: normal; font-weight: 600; text-transform: none; letter-spacing: -.02em; }

        .hero-card {
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--radius-xl); padding: 18px 18px 20px;
          margin-bottom: 12px;
          position: relative; overflow: hidden;
        }
        .hero-card::before {
          content: ""; position: absolute; top: -40px; right: -40px;
          width: 180px; height: 180px; border-radius: 50%;
          background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
          opacity: 0.5; pointer-events: none;
        }
        .hero-grid { display: grid; grid-template-columns: 148px 1fr; gap: 16px; align-items: center;
          position: relative; }
        .hero-side { display: flex; flex-direction: column; gap: 16px; }
        .hero-remain .eyebrow { font-size: 10px; }
        .hero-pace { display: flex; align-items: center; gap: 6px; }
        .pace-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--fat); flex-shrink: 0; }
        .pace-dot.off { background: var(--accent); }
        .hero-macros {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px;
          margin-top: 18px; padding-top: 16px;
          border-top: 1px solid var(--line-soft);
          position: relative;
        }

        .section-head { display: flex; justify-content: space-between; align-items: baseline; margin: 22px 2px 12px; }
        .section-title { font-size: 18px; font-style: italic; font-weight: 400; margin: 0; }
        body[data-type="moderno"] .section-title { font-style: normal; font-weight: 600; letter-spacing: -.01em; }
        .meals { display: flex; flex-direction: column; gap: 10px; }
      `}</style>
    </div>
  );
}

// ─── MealCard ──────────────────────────────────────────────────────────
const SLOT_LABEL = {
  colazione: 'Colazione',
  pranzo: 'Pranzo',
  cena: 'Cena',
  spuntini: 'Spuntini',
};
const SLOT_TIME = {
  colazione: '07:00 – 10:00',
  pranzo: '12:30 – 14:00',
  cena: '19:30 – 21:30',
  spuntini: 'durante la giornata',
};

function MealCard({ slot, icon, entries, onAdd, onRemove, compact = false }) {
  const total = window.totalMacros(entries);
  const empty = entries.length === 0;
  const [open, setOpen] = useStateSc(!compact);

  return (
    <div className={`meal-card ${empty ? 'empty' : ''}`}>
      <div className="meal-head" onClick={() => !empty && setOpen(!open)}>
        <div className="meal-head-l">
          <div className="meal-icon">
            <Icon name={icon} size={17} stroke={1.6} />
          </div>
          <div>
            <div className="meal-name">{SLOT_LABEL[slot]}</div>
            <div className="meal-sub">
              {empty
                ? <span style={{ fontStyle: 'italic' }}>{SLOT_TIME[slot]}</span>
                : <>
                    <span className="num" style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{total.kcal}</span>
                    <span style={{ color: 'var(--ink-soft)' }}> kcal · {entries.length} alimenti</span>
                  </>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!empty && (
            <button className="iconbtn iconbtn-outline" style={{ width: 34, height: 34, color: 'var(--accent)' }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const name = window.prompt("Nome del preferito:", `Il mio ${SLOT_LABEL[slot].toLowerCase()}`);
                      if (name && name.trim()) {
                        const items = entries.map(it => ({ foodId: it.foodId, qty: it.qty, unit: it.unit }));
                        await window.api.favorites.create(name.trim(), items);
                        alert("Preferito salvato con successo!");
                      }
                    }}
                    aria-label="Salva come preferito">
              <Icon name="heart" size={15} />
            </button>
          )}
          <button className="iconbtn iconbtn-outline" style={{ width: 34, height: 34 }}
                  onClick={e => { e.stopPropagation(); onAdd(); }}
                  aria-label={`Aggiungi a ${SLOT_LABEL[slot]}`}>
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
      {!empty && open && (
        <div className="meal-items">
          {entries.map(e => {
            const food = window.FOODS.find(f => f.id === e.foodId);
            if (!food) return null;
            const m = window.computeMacros(food.id, e.grams);
            return (
              <div key={e.id} className="meal-item">
                <FoodGlyph category={food.cat} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="meal-item-name">{food.name}</div>
                  <div className="meal-item-sub">
                    <span className="num">{e.qty}</span>{e.unit}
                    <span style={{ color: 'var(--ink-faint)' }}> · </span>
                    <span className="num" style={{ color: 'var(--ink-2)' }}>{m.kcal}</span>
                    <span style={{ color: 'var(--ink-soft)' }}> kcal</span>
                  </div>
                </div>
                <button className="iconbtn iconbtn-ghost" style={{ width: 26, height: 26, opacity: 0.6 }}
                        onClick={() => onRemove(slot, e.id)} aria-label="Rimuovi">
                  <Icon name="close" size={13} />
                </button>
              </div>
            );
          })}
          {entries.length > 0 && (
            <div className="meal-totals">
              <span><Icon name="flame" size={11} style={{ verticalAlign: '-1px' }} /> <span className="num">{total.kcal}</span> kcal</span>
              <span><span className="dot" style={{ background: 'var(--protein)' }} /> <span className="num">{Math.round(total.p)}</span>g</span>
              <span><span className="dot" style={{ background: 'var(--carbs)' }} /> <span className="num">{Math.round(total.c)}</span>g</span>
              <span><span className="dot" style={{ background: 'var(--fat)' }} /> <span className="num">{Math.round(total.fat)}</span>g</span>
            </div>
          )}
        </div>
      )}
      <style>{`
        .meal-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
        .meal-card.empty { background: transparent; border-style: dashed; border-color: var(--line-soft); }
        .meal-head { display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; cursor: pointer; }
        .meal-card.empty .meal-head { cursor: default; }
        .meal-head-l { display: flex; align-items: center; gap: 12px; }
        .meal-icon { width: 32px; height: 32px; border-radius: 10px; background: var(--surface-2);
          color: var(--ink-2); display: grid; place-items: center; }
        .meal-card.empty .meal-icon { background: transparent; border: 1px solid var(--line-soft); }
        .meal-name { font-size: 14.5px; font-weight: 500; color: var(--ink); }
        .meal-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }

        .meal-items { padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 2px; }
        .meal-item { display: flex; align-items: center; gap: 12px; padding: 8px 4px;
          border-top: 1px solid var(--line-soft); }
        .meal-item:first-child { border-top: 0; }
        .meal-item-name { font-size: 13.5px; color: var(--ink); overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; }
        .meal-item-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }
        .meal-totals { display: flex; gap: 14px; padding: 10px 4px 2px;
          border-top: 1px dashed var(--line-soft); margin-top: 6px;
          font-size: 11.5px; color: var(--ink-soft); align-items: center; }
        .meal-totals .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block;
          margin-right: 3px; vertical-align: 1px; }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CALENDAR / HISTORY SCREEN
// ════════════════════════════════════════════════════════════════════════
function CalendarScreen({ history, goals, onPickDay }) {
  const [cursor, setCursor] = useStateSc(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });
  const [selected, setSelected] = useStateSc(window.dateKey(new Date()));

  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const firstDay = (cursor.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ empty: true, key: 'e' + i });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = window.dateKey(date);
    const day = history[key];
    const total = day ? window.totalDay(day) : null;
    cells.push({ key, date, total, isToday: date.getTime() === today.getTime(),
      isFuture: date.getTime() > today.getTime() });
  }

  const goPrev = () => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); };
  const goNext = () => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); };

  const monthAvg = useMemoSc(() => {
    const days = cells.filter(c => !c.empty && c.total && c.total.kcal > 0).map(c => c.total);
    if (days.length === 0) return null;
    const avg = days.reduce((a, x) => ({
      kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, fat: a.fat + x.fat,
    }), { kcal: 0, p: 0, c: 0, fat: 0 });
    return {
      kcal: Math.round(avg.kcal / days.length),
      p: Math.round(avg.p / days.length),
      c: Math.round(avg.c / days.length),
      fat: Math.round(avg.fat / days.length),
      logged: days.length,
      total: cells.filter(c => !c.empty && !c.isFuture).length,
    };
  }, [cells]);

  const selDate = selected ? cells.find(c => c.key === selected) : null;
  const selDay = selDate && history[selDate.key];

  return (
    <div className="cal">
      <header className="cal-head">
        <div className="cal-head-l">
          <div className="eyebrow">Storico</div>
          <div className="cal-nav-row">
            <button className="cal-nav-btn" onClick={goPrev} aria-label="Mese precedente">
              <Icon name="chevron-left" size={18} />
            </button>
            <h1 className="cal-title display">{window.IT_MONTHS[month]} <span className="num" style={{ color: 'var(--ink-soft)' }}>{year}</span></h1>
            <button className="cal-nav-btn" onClick={goNext} aria-label="Mese successivo">
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </div>
      </header>

      {monthAvg && (
        <div className="cal-stats">
          <Stat label="Media kcal" value={monthAvg.kcal.toLocaleString('it-IT')} unit="al giorno" />
          <div className="cal-stat-divider" />
          <Stat label="Giorni tracciati" value={`${monthAvg.logged}`} unit={`/${monthAvg.total}`} />
        </div>
      )}

      <div className="dow">
        {['L','M','M','G','V','S','D'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid">
        {cells.map(c => {
          if (c.empty) return <div key={c.key} />;
          const pct = c.total ? Math.min(1.1, c.total.kcal / goals.kcal) : 0;
          const has = pct > 0;
          const isSel = c.key === selected;
          return (
            <button key={c.key}
                    className={`cell ${c.isToday ? 'today' : ''} ${isSel ? 'sel' : ''} ${c.isFuture ? 'future' : ''}`}
                    onClick={() => setSelected(c.key)}
                    disabled={c.isFuture}>
              <span className="cell-num num">{c.date.getDate()}</span>
              {has && (
                <svg className="cell-ring" width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--line-soft)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" strokeWidth="2.5"
                          strokeDasharray={2 * Math.PI * 14}
                          strokeDashoffset={2 * Math.PI * 14 * (1 - pct)}
                          transform="rotate(-90 18 18)" strokeLinecap="round" />
                </svg>
              )}
              {c.isToday && !has && <span className="today-dot" />}
            </button>
          );
        })}
      </div>

      {selDay && (
        <div className="day-detail">
          <div className="day-detail-head">
            <div>
              <div className="eyebrow">{window.IT_DAYS[selDate.date.getDay()]}</div>
              <div className="display" style={{ fontSize: 22, fontStyle: 'italic', marginTop: 2 }}>
                {window.formatDate(selDate.date)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="display num" style={{ fontSize: 28, lineHeight: 1 }}>
                {selDay && window.totalDay(selDay).kcal.toLocaleString('it-IT')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>kcal totali</div>
            </div>
          </div>

          {(() => {
            const tot = window.totalDay(selDay);
            if (tot.kcal === 0) {
              return <div className="day-empty">Nessun pasto registrato</div>;
            }
            return (
              <>
                <div className="day-macros">
                  <DayMacro label="P" v={Math.round(tot.p)} color="var(--protein)" />
                  <DayMacro label="C" v={Math.round(tot.c)} color="var(--carbs)" />
                  <DayMacro label="G" v={Math.round(tot.fat)} color="var(--fat)" />
                  <DayMacro label="F" v={Math.round(tot.fb)} color="var(--fiber)" />
                </div>
                <div className="day-slots">
                  {['colazione','pranzo','cena','spuntini'].map(s => {
                    const items = selDay[s] || [];
                    if (items.length === 0) return null;
                    const m = window.totalMacros(items);
                    return (
                      <div key={s} className="day-slot">
                        <span className="day-slot-name">{SLOT_LABEL[s]}</span>
                        <span className="day-slot-items">
                          {items.map(i => {
                            const f = window.FOODS.find(x => x.id === i.foodId);
                            return f ? f.name : null;
                          }).filter(Boolean).join(' · ')}
                        </span>
                        <span className="num day-slot-kcal">{m.kcal}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div style={{ height: 24 }} />

      <style>{`
        .cal { padding: 12px 18px 16px; }
        .cal-head { padding: 6px 0 16px; padding-right: 100px; }
        .cal-head-l { display: flex; flex-direction: column; gap: 8px; }
        .cal-nav-row { display: flex; align-items: center; gap: 8px; }
        .cal-nav-btn {
          appearance: none; border: 0; background: transparent;
          width: 28px; height: 28px; border-radius: 999px;
          display: grid; place-items: center; cursor: pointer;
          color: var(--ink-soft);
          transition: background 0.12s, color 0.12s;
        }
        .cal-nav-btn:hover { background: var(--surface-2); color: var(--ink); }
        .cal-title { font-size: 24px; font-weight: 400; font-style: italic; margin: 0;
          text-transform: lowercase; letter-spacing: -0.01em; }
        body[data-type="moderno"] .cal-title { font-style: normal; font-weight: 600; text-transform: none; }
        .cal-nav { display: flex; gap: 6px; }
        .cal-stats { display: flex; align-items: center; gap: 14px; padding: 12px 0 18px; }
        .cal-stat-divider { width: 1px; height: 32px; background: var(--line); }

        .dow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
          font-size: 10px; letter-spacing: 0.1em; color: var(--ink-soft);
          text-align: center; padding-bottom: 6px; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cell {
          appearance: none; border: 0; background: transparent; aspect-ratio: 1;
          display: grid; place-items: center; position: relative; cursor: pointer;
          border-radius: 10px; color: var(--ink-2); font: inherit;
          transition: background 0.12s;
        }
        .cell:hover { background: var(--surface-2); }
        .cell.future { color: var(--ink-faint); cursor: not-allowed; }
        .cell.future:hover { background: transparent; }
        .cell.today { color: var(--accent); font-weight: 600; }
        .cell.sel { background: var(--ink); color: var(--bg); }
        .cell.sel.today { color: var(--bg); }
        .cell.sel .cell-ring circle:last-child { stroke: var(--bg); }
        .cell.sel .cell-ring circle:first-child { stroke: rgba(255,255,255,0.18); }
        .cell-num { font-size: 13px; position: relative; z-index: 1; }
        .cell-ring { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%,-50%); }
        .today-dot { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }

        .day-detail { margin-top: 20px; background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--radius); padding: 18px; }
        .day-detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .day-empty { text-align: center; padding: 20px 0; color: var(--ink-soft); font-style: italic; font-size: 13px; }
        .day-macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
        .day-slots { display: flex; flex-direction: column; gap: 0;
          margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
        .day-slot { display: grid; grid-template-columns: 80px 1fr auto; align-items: center;
          gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); font-size: 12.5px; }
        .day-slot:last-child { border-bottom: 0; }
        .day-slot-name { color: var(--ink-2); font-weight: 500; }
        .day-slot-items { color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; }
        .day-slot-kcal { color: var(--ink); font-weight: 500; }
      `}</style>
    </div>
  );
}

function DayMacro({ label, v, color }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--line-soft)',
      borderRadius: 12, padding: '10px 0', textAlign: 'center',
    }}>
      <div className="display num" style={{ fontSize: 18, color, lineHeight: 1 }}>{v}<span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>g</span></div>
      <div style={{ fontSize: 9.5, color: 'var(--ink-soft)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STATS SCREEN
// ════════════════════════════════════════════════════════════════════════
function StatsScreen({ history, goals }) {
  const [range, setRange] = useStateSc(7);

  const days = useMemoSc(() => {
    const out = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = window.dateKey(d);
      const day = history[key];
      out.push({ date: d, key, total: window.totalDay(day) });
    }
    return out;
  }, [history, range]);

  const avg = useMemoSc(() => {
    const real = days.filter(d => d.total.kcal > 0);
    if (real.length === 0) return { kcal: 0, p: 0, c: 0, fat: 0 };
    return {
      kcal: Math.round(real.reduce((a, x) => a + x.total.kcal, 0) / real.length),
      p:    Math.round(real.reduce((a, x) => a + x.total.p, 0) / real.length),
      c:    Math.round(real.reduce((a, x) => a + x.total.c, 0) / real.length),
      fat:  Math.round(real.reduce((a, x) => a + x.total.fat, 0) / real.length),
    };
  }, [days]);

  const maxKcal = Math.max(goals.kcal * 1.15, ...days.map(d => d.total.kcal));

  return (
    <div className="stats">
      <header className="stats-head">
        <div>
          <div className="eyebrow">Andamento</div>
          <h1 className="stats-title display">Statistiche</h1>
        </div>
      </header>

      <div className="range-tabs">
        {[7, 14, 30].map(r => (
          <button key={r} className={`range-tab ${range === r ? 'on' : ''}`}
                  onClick={() => setRange(r)}>
            {r} giorni
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="eyebrow">Media calorie</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="display num" style={{ fontSize: 36, lineHeight: 1 }}>
                {avg.kcal.toLocaleString('it-IT')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                / <span className="num">{goals.kcal.toLocaleString('it-IT')}</span>
              </span>
            </div>
          </div>
          <Pill color={avg.kcal > goals.kcal ? 'var(--accent)' : 'var(--fat)'} soft>
            <Icon name="arrow-up" size={11} style={{
              transform: avg.kcal > goals.kcal ? 'none' : 'rotate(180deg)' }} />
            {Math.abs(Math.round((avg.kcal - goals.kcal) / goals.kcal * 100))}%
          </Pill>
        </div>

        <div className="chart">
          {days.map((d, i) => {
            const h = d.total.kcal / maxKcal;
            const goalH = goals.kcal / maxKcal;
            return (
              <div key={d.key} className="bar-col">
                <div className="bar-wrap">
                  <div className="goal-line" style={{ bottom: `${goalH * 100}%` }} />
                  <div className="bar"
                       style={{
                         height: `${h * 100}%`,
                         background: d.total.kcal === 0 ? 'transparent' :
                           d.total.kcal > goals.kcal * 1.05 ? 'var(--accent)' :
                           d.total.kcal < goals.kcal * 0.6 ? 'var(--ink-faint)' :
                           'var(--ink)',
                         border: d.total.kcal === 0 ? '1px dashed var(--line)' : 'none',
                       }} />
                </div>
                <div className="bar-lbl">
                  {range <= 7 ? window.IT_DAYS_SHORT[d.date.getDay()] :
                   i % Math.ceil(range / 7) === 0 ? d.date.getDate() : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="macros-card">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Distribuzione media macro</div>
        {(() => {
          const total = avg.p * 4 + avg.c * 4 + avg.fat * 9;
          const pPct = total ? (avg.p * 4 / total) * 100 : 0;
          const cPct = total ? (avg.c * 4 / total) * 100 : 0;
          const fPct = total ? (avg.fat * 9 / total) * 100 : 0;
          return (
            <>
              <div className="macro-stack">
                <div style={{ width: `${pPct}%`, background: 'var(--protein)' }} />
                <div style={{ width: `${cPct}%`, background: 'var(--carbs)' }} />
                <div style={{ width: `${fPct}%`, background: 'var(--fat)' }} />
              </div>
              <div className="macro-legend">
                <LegendItem color="var(--protein)" label="Proteine" pct={pPct} g={avg.p} />
                <LegendItem color="var(--carbs)" label="Carboidrati" pct={cPct} g={avg.c} />
                <LegendItem color="var(--fat)" label="Grassi" pct={fPct} g={avg.fat} />
              </div>
            </>
          );
        })()}
      </div>

      <div style={{ height: 24 }} />

      <style>{`
        .stats { padding: 12px 18px 16px; }
        .stats-head { padding: 6px 100px 16px 0; }
        .stats-title { font-size: 24px; font-weight: 400; font-style: italic; margin: 4px 0 0;
          text-transform: lowercase; letter-spacing: -0.01em; }
        body[data-type="moderno"] .stats-title { font-style: normal; font-weight: 600; text-transform: none; }

        .range-tabs { display: flex; gap: 6px; }
        .range-tab { appearance: none; border: 1px solid var(--line); background: var(--surface);
          color: var(--ink-soft); padding: 7px 14px; border-radius: 999px; font: inherit;
          font-size: 12.5px; cursor: pointer; }
        .range-tab.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }

        .chart { display: flex; gap: 4px; margin-top: 18px; height: 140px;
          align-items: flex-end; padding: 0 2px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; height: 100%; }
        .bar-wrap { flex: 1; width: 100%; position: relative; display: flex; align-items: flex-end;
          justify-content: center; min-height: 0; }
        .bar { width: 70%; max-width: 14px; border-radius: 3px;
          transition: height 0.5s cubic-bezier(.3,.7,.4,1); min-height: 1px; }
        .goal-line { position: absolute; left: 0; right: 0; height: 1px;
          background: var(--accent); opacity: 0.4; }
        .bar-lbl { font-size: 10px; color: var(--ink-soft); font-variant-numeric: tabular-nums;
          height: 12px; }

        .macros-card { background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--radius); padding: 18px; margin-top: 12px; }
        .macro-stack { display: flex; height: 12px; border-radius: 6px; overflow: hidden;
          background: var(--surface-2); }
        .macro-stack > div { transition: width 0.5s; }
        .macro-legend { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
      `}</style>
    </div>
  );
}

function LegendItem({ color, label, pct, g }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />
        <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, color: 'var(--ink-soft)' }}>
        <span><span className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>{Math.round(pct)}</span>%</span>
        <span><span className="num" style={{ color: 'var(--ink-2)' }}>{g}</span>g</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SCANNER SCREEN
// ════════════════════════════════════════════════════════════════════════
function ScannerScreen({ onFoodReady, onAddProduct }) {
  const [manual, setManual] = useStateSc('');
  const [status, setStatus] = useStateSc('idle'); // idle | camera | lookup | result | error
  const [message, setMessage] = useStateSc('');
  const [result, setResult] = useStateSc(null);
  const [slot, setSlot] = useStateSc('pranzo');
  const [added, setAdded] = useStateSc(false);
  const videoRef = useRefSc(null);
  const controlsRef = useRefSc(null);
  const readerRef = useRefSc(null);
  const lastCodeRef = useRefSc('');

  useEffectSc(() => () => stopCamera(), []);

  const lookup = async (ean) => {
    const code = (ean || '').trim();
    if (!/^\d{8,14}$/.test(code)) {
      setStatus('error');
      setMessage('Inserisci un codice EAN da 8 a 14 cifre');
      return;
    }
    if (status === 'lookup' && lastCodeRef.current === code) return;
    lastCodeRef.current = code;
    setStatus('lookup');
    setMessage('');
    setAdded(false);
    try {
      const data = await window.api.foods.lookupBarcode(code);
      setResult(data);
      setManual(code);
      setStatus('result');
      onFoodReady && onFoodReady(data.food);
      stopCamera();
    } catch (e) {
      setStatus('error');
      setMessage(e.status === 404 ? 'Prodotto non trovato su Open Food Facts' : 'Lookup non riuscito');
    }
  };

  const startCamera = async () => {
    setMessage('');
    setStatus('camera');
    const Reader = await loadZXingReader();
    if (!Reader || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setMessage('Scanner camera non disponibile qui. Puoi inserire il codice manualmente.');
      return;
    }
    try {
      readerRef.current = new Reader();
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (scanResult) => {
          const text = scanResult && (scanResult.getText ? scanResult.getText() : scanResult.text);
          if (text && /^\d{8,14}$/.test(String(text))) lookup(String(text));
        },
      );
    } catch (e) {
      setStatus('error');
      setMessage('Permesso camera negato o non disponibile. Usa inserimento manuale.');
    }
  };

  function stopCamera() {
    if (controlsRef.current?.stop) controlsRef.current.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject) {
      for (const track of videoRef.current.srcObject.getTracks()) track.stop();
      videoRef.current.srcObject = null;
    }
    if (readerRef.current?.reset) readerRef.current.reset();
  }

  const addProduct = () => {
    if (!result?.food || !onAddProduct) return;
    onAddProduct(slot, result.food);
    setAdded(true);
  };

  return (
    <div className="scanner-page">
      <header className="scanner-head">
        <div>
          <div className="eyebrow">Scanner</div>
          <h1 className="scanner-title display">Qualità prodotto</h1>
        </div>
      </header>

      <section className={`scanner-stage ${status}`}>
        <video ref={videoRef} className="scanner-video" muted playsInline />
        {(status !== 'camera' && status !== 'lookup') && (
          <div className="scanner-placeholder">
            <Icon name="barcode" size={52} stroke={1.35} />
            <div className="scanner-placeholder-title">Scansiona un codice EAN</div>
            <div className="scanner-placeholder-sub">La qualità viene calcolata da Open Food Facts</div>
          </div>
        )}
        {status === 'camera' && <div className="scanner-line" />}
        {status === 'lookup' && (
          <div className="scanner-loading">
            <span className="dot-pulse" />
            Cerco il prodotto...
          </div>
        )}
      </section>

      <div className="scanner-actions">
        <button className="btn btn-accent" onClick={startCamera} disabled={status === 'camera' || status === 'lookup'}>
          <Icon name="camera" size={17} /> Camera
        </button>
        <button className="btn btn-outline" onClick={stopCamera}>
          <Icon name="close" size={17} /> Stop
        </button>
      </div>

      <div className="scan-manual">
        <div className="search-wrap">
          <Icon name="barcode" size={17} />
          <input
            className="search-input"
            inputMode="numeric"
            placeholder="EAN manuale"
            value={manual}
            onChange={e => setManual(e.target.value.replace(/\D/g, '').slice(0, 14))}
            onKeyDown={e => { if (e.key === 'Enter') lookup(manual); }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => lookup(manual)} disabled={status === 'lookup'}>
          Cerca
        </button>
      </div>

      {message && <div className="scan-message">{message}</div>}

      {result && (
        <div className="scanner-result">
          <ProductSummary food={result.food} />
          <ProductQualityCard quality={result.quality} />
          <div className="scanner-add">
            <SlotPicker slot={slot} onChange={setSlot} />
            <button className="btn btn-primary" style={{ width: '100%', height: 46, marginTop: 12 }}
                    onClick={addProduct}>
              <Icon name={added ? 'check' : 'plus'} size={17} />
              {added ? 'Aggiunto' : `Aggiungi 100g a ${SLOT_LABEL[slot].toLowerCase()}`}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .scanner-page { padding: 12px 18px 16px; }
        .scanner-head { padding: 6px 100px 16px 0; }
        .scanner-title { font-size: 26px; font-style: italic; font-weight: 400; line-height: 1.1;
          margin: 4px 0 0; text-transform: lowercase; color: var(--ink); letter-spacing: -0.01em; }
        body[data-type="moderno"] .scanner-title { font-style: normal; font-weight: 600; text-transform: none; letter-spacing: -.02em; }

        .scanner-stage { aspect-ratio: 4/3; background: #1a1612; border-radius: 18px; overflow: hidden;
          position: relative; display: grid; place-items: center; color: rgba(255,255,255,0.76);
          border: 1px solid var(--line); }
        .scanner-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .scanner-placeholder { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 20px; }
        .scanner-placeholder-title { font-size: 14px; font-weight: 500; margin-top: 10px; }
        .scanner-placeholder-sub { font-size: 12px; color: rgba(255,255,255,0.62); margin-top: 3px; }
        .scanner-line { position: absolute; z-index: 2; left: 12%; right: 12%; top: 50%; height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          box-shadow: 0 0 14px var(--accent); animation: scan-sweep 1.5s ease-in-out infinite alternate; }
        .scanner-loading { position: relative; z-index: 3; background: rgba(255,255,255,0.94); color: var(--ink);
          border-radius: 999px; padding: 9px 14px; display: inline-flex; align-items: center; gap: 16px;
          font-size: 12.5px; }
        @keyframes scan-sweep { from { top: 18%; } to { top: 82%; } }

        .scanner-actions { display: grid; grid-template-columns: 1.4fr 1fr; gap: 8px; margin-top: 12px; }
        .scan-manual { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; margin-top: 10px; }
        .scan-manual .search-wrap {
          display: flex; align-items: center; gap: 8px; height: 42px;
          padding: 0 12px; background: var(--surface);
          border: 1px solid var(--line); border-radius: 12px; color: var(--ink-soft);
        }
        .scan-manual .search-input { flex: 1; border: 0; background: transparent; outline: none;
          font: inherit; color: var(--ink); font-size: 14px; min-width: 0; }
        .scan-message { color: var(--accent); text-align: center; font-size: 12px; margin-top: 10px; }
        .scanner-result { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
        .scanner-add { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; }
        .dot-pulse { width: 6px; height: 6px; border-radius: 50%; background: currentColor;
          box-shadow: 10px 0 0 currentColor, -10px 0 0 currentColor;
          animation: dot-pulse 1.2s infinite; opacity: 0.6; }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

let zxingLoadPromise = null;
function getZXingReader() {
  const zxing = window.ZXingBrowser || window.ZXing;
  return zxing && zxing.BrowserMultiFormatReader;
}

function loadZXingReader() {
  const current = getZXingReader();
  if (current) return Promise.resolve(current);
  if (!zxingLoadPromise) {
    zxingLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/zxing-browser.min.js';
      script.async = true;
      script.onload = () => {
        const reader = getZXingReader();
        if (reader) resolve(reader);
        else {
          zxingLoadPromise = null;
          script.remove();
          reject(new Error('ZXing non disponibile'));
        }
      };
      script.onerror = () => {
        zxingLoadPromise = null;
        script.remove();
        reject(new Error('ZXing non disponibile'));
      };
      document.head.appendChild(script);
    });
  }
  return zxingLoadPromise.catch(() => null);
}

function ProductSummary({ food }) {
  return (
    <div className="product-summary">
      {food.image_url ? (
        <img src={food.image_url} alt="" className="product-img" />
      ) : (
        <FoodGlyph category={food.cat} size={54} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="product-name">{food.name}</div>
        <div className="product-meta">
          {food.brand ? `${food.brand} · ` : ''}
          <span className="num">{food.kcal}</span> kcal / 100g
        </div>
      </div>
      <style>{`
        .product-summary { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
          padding: 14px; display: flex; align-items: center; gap: 12px; }
        .product-img { width: 54px; height: 54px; border-radius: 14px; object-fit: cover; background: var(--surface-2);
          border: 1px solid var(--line-soft); flex-shrink: 0; }
        .product-name { font-size: 15px; font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .product-meta { font-size: 11.5px; color: var(--ink-soft); margin-top: 2px; }
      `}</style>
    </div>
  );
}

function ProductQualityCard({ quality }) {
  if (!quality) return null;
  const grade = {
    excellent: ['Eccellente', 'var(--fat)'],
    good: ['Buono', 'var(--fiber)'],
    fair: ['Medio', 'var(--carbs)'],
    poor: ['Scarso', 'var(--accent)'],
    unknown: ['Dati parziali', 'var(--ink-soft)'],
  }[quality.grade] || ['Dati parziali', 'var(--ink-soft)'];

  return (
    <div className="quality-card">
      <div className="quality-top">
        <Ring size={96} stroke={8} tracks={[{ value: quality.score / 100, color: grade[1], bg: 'var(--line-soft)' }]}>
          <div style={{ textAlign: 'center' }}>
            <div className="display num" style={{ fontSize: 28, lineHeight: 1, color: grade[1] }}>{quality.score}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 2 }}>/100</div>
          </div>
        </Ring>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">Qualità</div>
          <div className="display quality-grade" style={{ color: grade[1] }}>{grade[0]}</div>
          <div className="quality-tags">
            <Pill color={grade[1]} soft>Nutri {quality.nutriScore ? quality.nutriScore.toUpperCase() : 'n/d'}</Pill>
            <Pill color="var(--ink-soft)" soft>NOVA {quality.novaGroup || 'n/d'}</Pill>
            <Pill color="var(--water)" soft>Eco {quality.ecoScore ? quality.ecoScore.toUpperCase() : 'n/d'}</Pill>
          </div>
        </div>
      </div>

      <QualityList title="Punti positivi" items={quality.positives} tone="good" empty="Nessun punto positivo evidente" />
      <QualityList title="Da controllare" items={quality.negatives} tone="bad" empty="Nessun punto critico evidente" />
      <QualityList title="Dati mancanti" items={quality.warnings} tone="warn" empty="Dati principali disponibili" />

      <style>{`
        .quality-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
          padding: 16px; }
        .quality-top { display: flex; gap: 16px; align-items: center; padding-bottom: 14px;
          border-bottom: 1px solid var(--line-soft); margin-bottom: 12px; }
        .quality-grade { font-size: 26px; font-style: italic; line-height: 1.05; margin-top: 4px; }
        body[data-type="moderno"] .quality-grade { font-style: normal; font-weight: 600; }
        .quality-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
      `}</style>
    </div>
  );
}

function QualityList({ title, items, tone, empty }) {
  const color = tone === 'good' ? 'var(--fat)' : tone === 'bad' ? 'var(--accent)' : 'var(--ink-soft)';
  const list = items && items.length ? items : [empty];
  return (
    <div className="quality-list">
      <div className="eyebrow" style={{ color }}>{title}</div>
      <div className="quality-list-items">
        {list.map((item, i) => (
          <div key={i} className={`quality-item ${items && items.length ? '' : 'empty'}`}>
            <span style={{ background: color }} />
            {item}
          </div>
        ))}
      </div>
      <style>{`
        .quality-list { margin-top: 10px; }
        .quality-list-items { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
        .quality-item { display: flex; gap: 8px; align-items: baseline; font-size: 12.5px; color: var(--ink-2); }
        .quality-item.empty { color: var(--ink-soft); font-style: italic; }
        .quality-item > span { width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PROFILE / SETTINGS
// ════════════════════════════════════════════════════════════════════════
function ProfileScreen({ goals, onGoalsChange, profile = window.DEFAULT_PROFILE, onProfileChange, history = {}, scans = [] }) {
  const [section, setSection] = useStateSc('goals');
  const safeProfile = { ...(window.DEFAULT_PROFILE || {}), ...(profile || {}) };
  const setG = (key, v) => {
    const next = { ...goals, [key]: v };
    onGoalsChange(
      window.balanceGoalsToKcal ? window.balanceGoalsToKcal(next, safeProfile, key) : next,
      key,
    );
  };
  const setCaloriesGoal = (kcal) => onGoalsChange(
    window.recommendedGoalsForProfile
      ? window.recommendedGoalsForProfile(safeProfile, kcal, { keepWaterMl: goals.water_ml })
      : scaleGoalsToCalories(goals, kcal),
    'kcal',
  );

  // BMI calculation
  const energy = window.profileEnergyEstimate
    ? window.profileEnergyEstimate(safeProfile)
    : null;
  const heightM = safeProfile.heightCm / 100;
  const bmi = energy?.bmi ?? (heightM > 0 ? safeProfile.weightKg / (heightM * heightM) : 0);
  let bmiStatus = 'Normopeso';
  let bmiColor = 'var(--fat)'; // green
  if (bmi < 18.5) {
    bmiStatus = 'Sottopeso';
    bmiColor = 'var(--carbs)'; // yellow
  } else if (bmi >= 25 && bmi < 30) {
    bmiStatus = 'Sovrappeso';
    bmiColor = 'var(--carbs)'; // yellow
  } else if (bmi >= 30) {
    bmiStatus = 'Obesità';
    bmiColor = 'var(--accent)'; // red
  }

  const bmr = energy?.bmr ?? 0;
  const tdee = energy?.tdee ?? 0;
  const recommendedKcal = energy?.recommendedKcal ?? goals.kcal;

  // macro split %
  const splitTotal = Math.max(1, goals.p * 4 + goals.c * 4 + goals.fat * 9);
  const pPct = Math.round((goals.p * 4 / splitTotal) * 100);
  const cPct = Math.round((goals.c * 4 / splitTotal) * 100);
  const fPct = Math.round((goals.fat * 9 / splitTotal) * 100);
  const macroRanges = window.macroGoalRanges
    ? window.macroGoalRanges(goals, safeProfile)
    : {
        kcal: { min: 1200, max: 3500, step: 50 },
        p: { min: 0, max: 250, step: 5 },
        c: { min: 0, max: 500, step: 5 },
        fat: { min: 0, max: 200, step: 5 },
        fb: { min: 0, max: 60, step: 5 },
        water_ml: { min: 1000, max: 4000, step: 250 },
      };
  const title = {
    profile: 'Dati personali',
    goals: 'Obiettivi giornalieri',
    history: 'Storico',
    scans: 'Scansioni',
  }[section];

  return (
    <div className="prof">
      <header className="prof-head">
        <div>
          <div className="eyebrow">Profilo</div>
          <h1 className="prof-title display">{title}</h1>
        </div>
      </header>

      <div className="profile-summary">
        <ProfileAvatar profile={safeProfile} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profileDisplayName(safeProfile)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{profileSummaryLine(safeProfile)}</div>
        </div>
        <button className="profile-edit-btn" onClick={() => setSection('profile')} aria-label="Modifica profilo">
          <Icon name="edit" size={16} />
        </button>
      </div>

      <div className="profile-tabs">
        <button className={section === 'goals' ? 'on' : ''} onClick={() => setSection('goals')}>Obiettivi</button>
        <button className={section === 'history' ? 'on' : ''} onClick={() => setSection('history')}>Storico</button>
        <button className={section === 'scans' ? 'on' : ''} onClick={() => setSection('scans')}>Scansioni</button>
      </div>

      {section === 'profile' && (
        <ProfileDetailsForm profile={safeProfile} onProfileChange={onProfileChange} />
      )}

      {section === 'goals' && (
        <>
          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="eyebrow">Calorie</div>
              <span className="display num" style={{ fontSize: 22 }}>{goals.kcal}<span style={{ fontSize: 11, color: 'var(--ink-soft)' }}> kcal</span></span>
            </div>
            <SliderRow value={goals.kcal} min={macroRanges.kcal.min} max={macroRanges.kcal.max} step={macroRanges.kcal.step} onChange={setCaloriesGoal} />
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Parametri Calcolati</div>
            <div className="calculated-grid">
              <div className="calc-item">
                <span className="calc-label">BMI</span>
                <span className="calc-value display num">{bmi.toFixed(1)}</span>
                <span className="calc-sub" style={{ color: bmiColor }}>{bmiStatus}</span>
              </div>
              <div className="calc-item">
                <span className="calc-label">Fabbisogno (TDEE)</span>
                <span className="calc-value display num">{Math.round(tdee)}<span style={{ fontSize: 10, color: 'var(--ink-soft)' }}> kcal</span></span>
                <span className="calc-sub">Metabolismo attivo</span>
              </div>
              <div className="calc-item">
                <span className="calc-label">Consigliato</span>
                <span className="calc-value display num" style={{ color: 'var(--accent)' }}>{Math.round(recommendedKcal)}<span style={{ fontSize: 10, color: 'var(--ink-soft)' }}> kcal</span></span>
                <span className="calc-sub">Per {weightGoalLabel(safeProfile.weightGoal).toLowerCase()}</span>
              </div>
            </div>
            <div className="calc-profile-meta" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Sesso: <strong>{safeProfile.sex === 'female' ? 'Donna' : 'Uomo'}</strong></span>
              <span>Età: <strong>{safeProfile.age} anni</strong></span>
              <span>BMR: <strong>{Math.round(bmr)} kcal</strong></span>
            </div>
            <style>{`
              .calculated-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
              .calc-item { display: flex; flex-direction: column; gap: 2px; background: var(--surface-2); border-radius: var(--radius-sm); padding: 8px 4px; }
              .calc-label { font-size: 10.5px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
              .calc-value { font-size: 19px; font-weight: 600; color: var(--ink); }
              .calc-sub { font-size: 10.5px; color: var(--ink-soft); font-weight: 500; }
            `}</style>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Macronutrienti</div>
            <div className="macro-stack" style={{ height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex', background: 'var(--surface-2)' }}>
              <div style={{ width: `${pPct}%`, background: 'var(--protein)' }} />
              <div style={{ width: `${cPct}%`, background: 'var(--carbs)' }} />
              <div style={{ width: `${fPct}%`, background: 'var(--fat)' }} />
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MacroGoalRow label="Proteine" color="var(--protein)" value={goals.p} pct={pPct} min={macroRanges.p.min} max={macroRanges.p.max} step={macroRanges.p.step} onChange={v => setG('p', v)} />
              <MacroGoalRow label="Carboidrati" color="var(--carbs)" value={goals.c} pct={cPct} min={macroRanges.c.min} max={macroRanges.c.max} step={macroRanges.c.step} onChange={v => setG('c', v)} />
              <MacroGoalRow label="Grassi" color="var(--fat)" value={goals.fat} pct={fPct} min={macroRanges.fat.min} max={macroRanges.fat.max} step={macroRanges.fat.step} onChange={v => setG('fat', v)} />
              <MacroGoalRow label="Fibre" color="var(--fiber)" value={goals.fb} min={macroRanges.fb.min} max={macroRanges.fb.max} step={macroRanges.fb.step} onChange={v => setG('fb', v)} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="eyebrow">Acqua</div>
              <span className="display num" style={{ fontSize: 22 }}>{(goals.water_ml/1000).toFixed(1)}<span style={{ fontSize: 11, color: 'var(--ink-soft)' }}> L</span></span>
            </div>
            <SliderRow value={goals.water_ml} min={macroRanges.water_ml.min} max={macroRanges.water_ml.max} step={macroRanges.water_ml.step} onChange={v => setG('water_ml', v)} color="var(--water)" />
          </div>
        </>
      )}

      {section === 'history' && (
        <div className="profile-embedded">
          <CalendarScreen history={history} goals={goals} />
        </div>
      )}

      {section === 'scans' && <ScansProfileView scans={scans} />}

      <div style={{ height: 80 }} />

      <style>{`
        .prof { padding: 12px 18px 16px; }
        .prof-head { padding: 6px 100px 16px 0; }
        .prof-title { font-size: 24px; font-weight: 400; font-style: italic; margin: 4px 0 0;
          text-transform: lowercase; letter-spacing: -0.01em; }
        body[data-type="moderno"] .prof-title { font-style: normal; font-weight: 600; text-transform: none; }
        .profile-summary { width: 100%; color: inherit; text-align: left;
          display: flex; align-items: center; gap: 14px;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--radius); padding: 14px; }
        .profile-edit-btn { appearance: none; border: 1px solid var(--line); background: var(--surface-2);
          width: 34px; height: 34px; border-radius: 999px; color: var(--ink-soft); cursor: pointer;
          display: grid; place-items: center; flex-shrink: 0; transition: color .15s, border-color .15s, background .15s; }
        .profile-edit-btn:hover { color: var(--ink); border-color: var(--ink-faint); background: var(--bg); }
        .prof-avatar { border-radius: 999px; overflow: hidden;
          background: var(--accent); color: #fff;
          display: grid; place-items: center;
          font-family: var(--font-display); font-size: 22px; font-style: italic; flex-shrink: 0; }
        .prof-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .profile-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
          background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px;
          padding: 4px; margin-top: 12px; }
        .profile-tabs button { appearance: none; border: 0; background: transparent; color: var(--ink-soft);
          border-radius: 8px; padding: 8px 6px; font: inherit; font-size: 12px; font-weight: 500; cursor: pointer; }
        .profile-tabs button.on { background: var(--bg); color: var(--ink); box-shadow: 0 1px 2px rgba(31,27,22,.06); }
        .profile-embedded { margin: 4px -18px 0; }
      `}</style>
    </div>
  );
}

function ProfileDetailsForm({ profile, onProfileChange }) {
  const [draft, setDraft] = useStateSc(profile);
  const [busy, setBusy] = useStateSc(false);
  const [status, setStatus] = useStateSc(null);
  const fileRef = useRefSc(null);

  useEffectSc(() => {
    setDraft(profile);
  }, [profile.updatedAt]);

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const saved = await onProfileChange(cleanProfileDraft(draft));
      if (saved) setDraft(saved);
      setStatus({ tone: 'good', text: 'Profilo salvato' });
    } catch (e) {
      console.error(e);
      setStatus({ tone: 'bad', text: 'Salvataggio non riuscito' });
    } finally {
      setBusy(false);
    }
  };

  const chooseAvatar = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setStatus({ tone: 'bad', text: 'Formato immagine non valido' });
      return;
    }
    if (file.size > PROFILE_IMAGE_SOURCE_MAX_BYTES) {
      setStatus({ tone: 'bad', text: 'Immagine troppo grande' });
      return;
    }
    setBusy(true);
    try {
      const avatar = await compressProfileImage(file);
      update('avatarDataUrl', avatar.dataUrl);
      setStatus({ tone: 'good', text: `Foto compressa a ${Math.round(avatar.bytes / 1024)} KB` });
    } catch (e) {
      console.error(e);
      setStatus({ tone: 'bad', text: 'Compressione immagine non riuscita' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="profile-form" onSubmit={save}>
      <div className="profile-photo-card card">
        <ProfileAvatar profile={draft} size={68} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">Foto profilo</div>
          <div className="profile-photo-meta">256 x 256 px · max 220 KB</div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={chooseAvatar} />
        <button type="button" className="iconbtn iconbtn-outline" onClick={() => fileRef.current?.click()} aria-label="Carica foto profilo">
          <Icon name="camera" size={16} />
        </button>
        {draft.avatarDataUrl && (
          <button type="button" className="iconbtn iconbtn-ghost" onClick={() => update('avatarDataUrl', null)} aria-label="Rimuovi foto profilo">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="profile-form-grid">
          <ProfileField label="Nome" value={draft.firstName || ''} onChange={(v) => update('firstName', v)} />
          <ProfileField label="Cognome" value={draft.lastName || ''} onChange={(v) => update('lastName', v)} />
          <ProfileField label="Peso" type="number" unit="kg" value={draft.weightKg} min={30} max={250} step={0.1} onChange={(v) => update('weightKg', v)} />
          <ProfileField label="Altezza" type="number" unit="cm" value={draft.heightCm} min={120} max={230} step={1} onChange={(v) => update('heightCm', v)} />
          <ProfileField label="Obiettivo peso" type="number" unit="kg" value={draft.targetWeightKg} min={30} max={250} step={0.1} onChange={(v) => update('targetWeightKg', v)} />
          <ProfileField label="Attivita" type="number" unit="min/sett" value={draft.activityMinutesWeek} min={0} max={2000} step={15} onChange={(v) => update('activityMinutesWeek', v)} />
          <ProfileField label="Età" type="number" unit="anni" value={draft.age} min={1} max={120} step={1} onChange={(v) => update('age', v)} />
          <ProfileSelect
            label="Sesso"
            value={draft.sex}
            onChange={(v) => update('sex', v)}
            options={[
              ['male', 'Uomo'],
              ['female', 'Donna'],
            ]}
          />
        </div>
        <div className="profile-form-grid two" style={{ marginTop: 10 }}>
          <ProfileSelect
            label="Obiettivo"
            value={draft.weightGoal}
            onChange={(v) => update('weightGoal', v)}
            options={[
              ['lose', 'Dimagrimento'],
              ['maintain', 'Mantenimento'],
              ['gain', 'Aumento peso'],
            ]}
          />
          <ProfileSelect
            label="Livello attivita"
            value={draft.activityLevel}
            onChange={(v) => update('activityLevel', v)}
            options={[
              ['sedentary', 'Sedentaria'],
              ['light', 'Leggera'],
              ['moderate', 'Moderata'],
              ['high', 'Intensa'],
            ]}
          />
        </div>
      </div>

      {status && <div className={`profile-status ${status.tone}`}>{status.text}</div>}

      <button className="btn btn-primary" style={{ width: '100%', height: 46, marginTop: 12 }} disabled={busy} type="submit">
        <Icon name="check" size={17} />
        {busy ? 'Salvataggio...' : 'Salva profilo'}
      </button>

      <style>{`
        .profile-form { margin-top: 14px; }
        .profile-photo-card { display: flex; align-items: center; gap: 12px; }
        .profile-photo-meta { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
        .profile-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .profile-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .profile-field span { font-size: 11px; color: var(--ink-soft); font-weight: 500; }
        .profile-input-wrap { display: flex; align-items: center; gap: 6px;
          height: 40px; border: 1px solid var(--line); border-radius: 12px;
          background: var(--bg); padding: 0 10px; }
        .profile-input-wrap:focus-within { border-color: var(--ink-2); }
        .profile-field input, .profile-field select {
          width: 100%; min-width: 0; border: 0; outline: 0; background: transparent;
          color: var(--ink); font: inherit; font-size: 13.5px;
        }
        .profile-field select { appearance: none; cursor: pointer; }
        .profile-unit { color: var(--ink-soft); font-size: 11px; white-space: nowrap; }
        .profile-status { text-align: center; font-size: 12px; margin-top: 10px; color: var(--ink-soft); }
        .profile-status.good { color: var(--fat); }
        .profile-status.bad { color: var(--accent); }
      `}</style>
    </form>
  );
}

function ProfileField({ label, value, onChange, type = 'text', unit, min, max, step }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <div className="profile-input-wrap">
        <input
          type={type}
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : e.target.valueAsNumber) : e.target.value)}
        />
        {unit && <em className="profile-unit">{unit}</em>}
      </div>
    </label>
  );
}

function ProfileSelect({ label, value, onChange, options }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <div className="profile-input-wrap">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Icon name="chevron-down" size={14} style={{ color: 'var(--ink-faint)' }} />
      </div>
    </label>
  );
}

function ProfileAvatar({ profile, size }) {
  const style = { width: size, height: size };
  return (
    <div className="prof-avatar" style={style}>
      {profile.avatarDataUrl ? <img src={profile.avatarDataUrl} alt="" /> : profileInitials(profile)}
    </div>
  );
}

const PROFILE_IMAGE_PX = 256;
const PROFILE_IMAGE_MAX_BYTES = 220 * 1024;
const PROFILE_IMAGE_SOURCE_MAX_BYTES = 8 * 1024 * 1024;

function cleanProfileDraft(draft) {
  return {
    ...draft,
    firstName: String(draft.firstName || '').trim().slice(0, 80),
    lastName: String(draft.lastName || '').trim().slice(0, 80),
    weightKg: toProfileNumber(draft.weightKg, 30, 250, window.DEFAULT_PROFILE.weightKg),
    heightCm: toProfileNumber(draft.heightCm, 120, 230, window.DEFAULT_PROFILE.heightCm),
    targetWeightKg: toProfileNumber(draft.targetWeightKg, 30, 250, window.DEFAULT_PROFILE.targetWeightKg),
    age: Math.round(toProfileNumber(draft.age, 1, 120, window.DEFAULT_PROFILE.age)),
    sex: ['male', 'female'].includes(draft.sex) ? draft.sex : window.DEFAULT_PROFILE.sex,
    activityMinutesWeek: Math.round(toProfileNumber(draft.activityMinutesWeek, 0, 2000, window.DEFAULT_PROFILE.activityMinutesWeek)),
  };
}

function profileDisplayName(profile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Profilo locale';
}

function profileInitials(profile) {
  const parts = [profile.firstName, profile.lastName].filter(Boolean);
  const initials = parts.map((p) => p.trim()[0]).join('').slice(0, 2);
  return initials || 'P';
}

function profileSummaryLine(profile) {
  return `${weightGoalLabel(profile.weightGoal)} · ${activityLabel(profile.activityLevel)} · ${Math.round(profile.activityMinutesWeek || 0)} min/sett`;
}

function weightGoalLabel(value) {
  return { lose: 'Dimagrimento', maintain: 'Mantenimento', gain: 'Aumento peso' }[value] || 'Mantenimento';
}

function activityLabel(value) {
  return { sedentary: 'Attivita sedentaria', light: 'Attivita leggera', moderate: 'Attivita moderata', high: 'Attivita intensa' }[value] || 'Attivita moderata';
}

function toProfileNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function compressProfileImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_IMAGE_PX;
  canvas.height = PROFILE_IMAGE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');
  ctx.fillStyle = '#F2ECDF';
  ctx.fillRect(0, 0, PROFILE_IMAGE_PX, PROFILE_IMAGE_PX);
  const scale = Math.max(PROFILE_IMAGE_PX / img.width, PROFILE_IMAGE_PX / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (PROFILE_IMAGE_PX - w) / 2;
  const y = (PROFILE_IMAGE_PX - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  let quality = 0.78;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (dataUrlBytes(out) > PROFILE_IMAGE_MAX_BYTES && quality > 0.42) {
    quality -= 0.08;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  const bytes = dataUrlBytes(out);
  if (bytes > PROFILE_IMAGE_MAX_BYTES) throw new Error('Avatar oltre il limite localStorage');
  return { dataUrl: out, bytes };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dataUrlBytes(dataUrl) {
  return new Blob([dataUrl]).size;
}

function ScansProfileView({ scans }) {
  if (!scans || scans.length === 0) {
    return (
      <div className="scan-empty card" style={{ marginTop: 14, textAlign: 'center', color: 'var(--ink-soft)' }}>
        <Icon name="barcode" size={30} stroke={1.4} />
        <div style={{ fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>Nessuna scansione ancora salvata</div>
      </div>
    );
  }
  return (
    <div className="profile-scans">
      {scans.map(scan => (
        <div key={scan.id} className="scan-row-profile">
          {scan.image_url ? (
            <img src={scan.image_url} alt="" />
          ) : (
            <FoodGlyph category="Generico" size={42} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="scan-row-name">{scan.foodName}</div>
            <div className="scan-row-meta">
              {scan.brand ? `${scan.brand} · ` : ''}
              {new Date(scan.scannedAt).toLocaleDateString('it-IT')}
            </div>
          </div>
          <Pill color={qualityColor(scan.quality?.grade)} soft>
            <span className="num">{scan.quality?.score ?? '--'}</span>
          </Pill>
        </div>
      ))}
      <style>{`
        .profile-scans { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .scan-row-profile { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm);
          padding: 10px 12px; display: flex; align-items: center; gap: 12px; }
        .scan-row-profile img { width: 42px; height: 42px; border-radius: 12px; object-fit: cover; border: 1px solid var(--line-soft); }
        .scan-row-name { font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .scan-row-meta { font-size: 11.5px; color: var(--ink-soft); margin-top: 2px; }
      `}</style>
    </div>
  );
}

function qualityColor(grade) {
  return {
    excellent: 'var(--fat)',
    good: 'var(--fiber)',
    fair: 'var(--carbs)',
    poor: 'var(--accent)',
    unknown: 'var(--ink-soft)',
  }[grade] || 'var(--ink-soft)';
}

function SliderRow({ value, min, max, step, onChange, color }) {
  return (
    <div style={{ marginTop: 10 }}>
      <input type="range" min={min} max={max} step={step} value={value}
             onInput={e => onChange(+e.currentTarget.value)}
             className="slider" style={color ? { '--accent': color } : {}} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
        <span className="num">{min}</span>
        <span className="num">{max}</span>
      </div>
      <style>{`
        .slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
          background: var(--line); border-radius: 999px; outline: none; }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--accent); cursor: pointer;
          box-shadow: 0 0 0 4px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.15);
        }
        .slider::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--accent); cursor: pointer; border: 0;
        }
      `}</style>
    </div>
  );
}

function scaleGoalsToCalories(goals, kcal) {
  const split = macroEnergySplit(goals);
  return {
    ...goals,
    kcal,
    p: roundGoalGrams((kcal * split.p) / 4),
    c: roundGoalGrams((kcal * split.c) / 4),
    fat: roundGoalGrams((kcal * split.fat) / 9),
  };
}

function macroEnergySplit(goals) {
  const protein = Math.max(0, Number(goals.p) || 0) * 4;
  const carbs = Math.max(0, Number(goals.c) || 0) * 4;
  const fat = Math.max(0, Number(goals.fat) || 0) * 9;
  const total = protein + carbs + fat;
  if (total <= 0) {
    return { p: 0.22, c: 0.48, fat: 0.30 };
  }
  return {
    p: protein / total,
    c: carbs / total,
    fat: fat / total,
  };
}

function roundGoalGrams(value) {
  return Math.max(0, Math.round(value / 5) * 5);
}

function MacroGoalRow({ label, color, value, pct, min = 0, max, step = 5, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5 }}>
          {pct != null && <span style={{ color: 'var(--ink-soft)' }}><span className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>{pct}</span>%</span>}
          <span><span className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>{value}</span><span style={{ color: 'var(--ink-soft)' }}>g</span></span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onInput={e => onChange(+e.currentTarget.value)}
             className="slider" style={{ '--accent': color }} />
    </div>
  );
}

Object.assign(window, {
  TodayScreen,
  CalendarScreen,
  StatsScreen,
  ScannerScreen,
  ProfileScreen,
  MealCard,
  ProductQualityCard,
});
