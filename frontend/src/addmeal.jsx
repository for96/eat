// addmeal.jsx — Add meal flow with multiple input methods
const { useState: useStateAM, useEffect: useEffectAM, useRef: useRefAM, useMemo: useMemoAM } = React;

// ─── AddMealSheet ───────────────────────────────────────────────────────
function AddMealSheet({ open, onClose, defaultSlot = 'colazione', onAdd }) {
  const [slot, setSlot] = useStateAM(defaultSlot);
  const [tab, setTab] = useStateAM('search');
  const [selectedFood, setSelectedFood] = useStateAM(null);
  const [qty, setQty] = useStateAM(null);

  useEffectAM(() => {
    if (open) {
      setSlot(defaultSlot);
      setTab('search');
      setSelectedFood(null);
    }
  }, [open, defaultSlot]);

  const handlePick = (foodId, qtyOverride = null) => {
    const food = window.FOODS.find(f => f.id === foodId);
    if (!food) return;
    setSelectedFood(food);
    setQty(qtyOverride || food.serving);
  };

  const confirm = () => {
    if (!selectedFood) return;
    const grams = window.servingToGrams(selectedFood, qty);
    onAdd(slot, {
      id: 'e_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      foodId: selectedFood.id,
      qty,
      unit: selectedFood.unit,
      grams,
    });
    setSelectedFood(null);
  };

  const handleFavorite = (fav) => {
    let added = 0;
    fav.items.forEach(([id, q, u]) => {
      const food = window.FOODS.find(f => f.id === id);
      if (!food) return;
      const grams = window.servingToGrams(food, q);
      onAdd(slot, {
        id: 'e_' + Date.now() + Math.floor(Math.random() * 1e6),
        foodId: id, qty: q, unit: u || food.unit, grams,
      });
      added += 1;
    });
    if (added > 0) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={selectedFood ? 'Quantità' : 'Aggiungi alimento'} maxHeight="92%">
      {selectedFood ? (
        <QuantityPicker
          food={selectedFood}
          qty={qty}
          onQty={setQty}
          slot={slot}
          onSlot={setSlot}
          onCancel={() => setSelectedFood(null)}
          onConfirm={confirm}
        />
      ) : (
        <>
          <SlotPicker slot={slot} onChange={setSlot} />
          <div style={{ height: 12 }} />
          <Tabs value={tab} onChange={setTab} options={[
            { value: 'search', label: 'Cerca', icon: 'search' },
            { value: 'barcode', label: 'Codice', icon: 'barcode' },
            { value: 'photo', label: 'Foto', icon: 'camera', disabled: true },
            { value: 'ai', label: 'AI', icon: 'sparkle', disabled: true },
            { value: 'fav', label: 'Preferiti', icon: 'heart' },
          ]} />
          <div style={{ height: 14 }} />
          {tab === 'search' && <SearchTab onPick={handlePick} />}
          {tab === 'barcode' && <BarcodeTab onPick={handlePick} />}
          {tab === 'photo' && <PhotoTab onPick={handlePick} />}
          {tab === 'ai' && <AITab onPick={handlePick} />}
          {tab === 'fav' && <FavoritesTab onPickFav={handleFavorite} />}
        </>
      )}
    </Sheet>
  );
}

// ─── SlotPicker (Colazione / Pranzo / Cena / Spuntini) ─────────────────
function SlotPicker({ slot, onChange }) {
  const slots = [
    { value: 'colazione', label: 'Colazione' },
    { value: 'pranzo', label: 'Pranzo' },
    { value: 'cena', label: 'Cena' },
    { value: 'spuntini', label: 'Spuntini' },
  ];
  return (
    <>
      <div className="slot-row">
        {slots.map(s => (
          <button key={s.value} className={`slot-chip ${slot === s.value ? 'on' : ''}`}
                  onClick={() => onChange(s.value)}>
            {s.label}
          </button>
        ))}
      </div>
      <style>{`
        .slot-row { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .slot-row::-webkit-scrollbar { display: none; }
        .slot-chip {
          appearance: none; border: 1px solid var(--line); background: var(--surface);
          color: var(--ink-2); padding: 7px 14px; border-radius: 999px;
          font-size: 13px; font-weight: 500; white-space: nowrap; cursor: pointer;
          transition: all 0.15s;
        }
        .slot-chip.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
      `}</style>
    </>
  );
}

// ─── SearchTab ──────────────────────────────────────────────────────────
function SearchTab({ onPick }) {
  const [q, setQ] = useStateAM('');
  const filtered = useMemoAM(() => {
    const query = q.trim().toLowerCase();
    if (!query) return window.FOODS.slice(0, 14);
    return window.FOODS.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.cat.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [q]);

  return (
    <>
      <div className="search-wrap">
        <Icon name="search" size={17} />
        <input
          autoFocus
          className="search-input"
          placeholder="Cerca alimento..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {q && (
          <button className="iconbtn iconbtn-ghost" onClick={() => setQ('')} aria-label="Cancella">
            <Icon name="close" size={15} />
          </button>
        )}
      </div>
      {!q && (
        <div className="eyebrow" style={{ marginTop: 16, marginBottom: 6 }}>Suggeriti</div>
      )}
      {q && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 12, marginBottom: 4 }}>
          {filtered.length} risultati
        </div>
      )}
      <div className="food-list">
        {filtered.map(f => <FoodRow key={f.id} food={f} onPick={() => onPick(f.id)} />)}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
            Nessun risultato per "{q}"
          </div>
        )}
      </div>
      <style>{`
        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          padding: 0 12px; background: var(--surface);
          border: 1px solid var(--line); border-radius: 12px;
          color: var(--ink-soft); height: 42px;
        }
        .search-wrap:focus-within { border-color: var(--ink-2); color: var(--ink); }
        .search-input { flex: 1; border: 0; background: transparent; outline: none;
          font: inherit; color: var(--ink); font-size: 14px; min-width: 0; }
        .food-list { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
      `}</style>
    </>
  );
}

// ─── FoodRow ──────────────────────────────────────────────────────────
function FoodRow({ food, onPick }) {
  return (
    <button className="food-row" onClick={onPick}>
      <FoodGlyph category={food.cat} size={36} />
      <div className="food-info">
        <div className="food-name">{food.name}</div>
        <div className="food-meta">
          <span className="num" style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{food.kcal}</span>
          <span>kcal · 100{food.unit === 'pz' ? 'g' : food.unit}</span>
          <span style={{ color: 'var(--ink-faint)' }}>·</span>
          <span>{food.cat}</span>
        </div>
      </div>
      <Icon name="plus" size={16} />
      <style>{`
        .food-row {
          appearance: none; border: 0; background: transparent;
          display: flex; align-items: center; gap: 12px;
          padding: 10px 6px; border-radius: 10px; cursor: pointer;
          color: var(--ink); text-align: left; width: 100%;
          transition: background 0.12s;
        }
        .food-row:hover { background: var(--surface-2); }
        .food-info { flex: 1; min-width: 0; }
        .food-name { font-size: 14px; font-weight: 500; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .food-meta { font-size: 11.5px; color: var(--ink-soft); display: flex; gap: 5px;
          margin-top: 2px; align-items: baseline; }
        .food-row > svg:last-child { color: var(--ink-faint); flex-shrink: 0; }
        .food-row:hover > svg:last-child { color: var(--ink-2); }
      `}</style>
    </button>
  );
}

// ─── BarcodeTab ──────────────────────────────────────────────────────
// EAN reale: prova "8076809513692" (pasta Barilla). Quando integrerai
// @zxing/browser, sostituisci il prompt() con la lettura dalla webcam.
function BarcodeTab({ onPick }) {
  const [scanning, setScanning] = useStateAM(false);
  const [found, setFound] = useStateAM(null);
  const [quality, setQuality] = useStateAM(null);
  const [manual, setManual] = useStateAM('');
  const [error, setError] = useStateAM(null);
  const lookup = async (ean) => {
    const code = (ean || '').trim();
    if (!/^\d{8,14}$/.test(code)) {
      setError('Inserisci un codice EAN da 8 a 14 cifre');
      return;
    }
    setError(null);
    setScanning(true);
    try {
      const data = await window.api.foods.lookupBarcode(code);
      const food = data.food;
      // Aggiungi a window.FOODS se non già presente, così onPick(id) lo trova
      if (food && !window.FOODS.find(f => f.id === food.id)) {
        window.FOODS = [...window.FOODS, food];
      }
      setFound(food);
      setQuality(data.quality);
      setManual(code);
    } catch (e) {
      console.error(e);
      setError(e.status === 404 ? 'Prodotto non trovato su Open Food Facts' : 'Errore lookup');
    } finally {
      setScanning(false);
    }
  };
  return (
    <div className="scan-wrap">
      <div className={`scanner ${scanning ? 'on' : ''}`}>
        <div className="scan-frame">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />
          {scanning && <div className="laser" />}
          {found && !scanning && (
            <div className="scan-found">
              <FoodGlyph category={found.cat} size={48} />
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>Codice rilevato</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                {manual}
              </div>
            </div>
          )}
          {!scanning && !found && (
            <Icon name="barcode" size={48} stroke={1.4} style={{ color: 'var(--ink-faint)' }} />
          )}
        </div>
      </div>
      {found && !scanning ? (
        <>
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
            <FoodGlyph category={found.cat} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{found.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                <span className="num">{found.kcal}</span> kcal · 100{found.unit === 'pz' ? 'g' : found.unit}
                {found.brand ? ` · ${found.brand}` : ''}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <ProductQualityCard quality={quality} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setFound(null); setQuality(null); }}>
              Riprova
            </button>
            <button className="btn btn-primary" style={{ flex: 1.4 }} onClick={() => onPick(found.id)}>
              Continua
            </button>
          </div>
        </>
      ) : (
        <div className="barcode-manual">
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
          <button className="btn btn-accent" onClick={() => lookup(manual)} disabled={scanning}>
            {scanning ? 'Cerco...' : 'Cerca'}
          </button>
        </div>
      )}
      {error && <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{error}</div>}
      <p className="hint" style={{ marginTop: 12 }}>
        Punta la fotocamera sul codice EAN della confezione. Il prodotto verrà cercato nel database OpenFoodFacts.
      </p>
      <style>{`
        .scan-wrap { padding-top: 4px; }
        .barcode-manual { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 14px; }
        .barcode-manual .search-wrap {
          display: flex; align-items: center; gap: 8px; height: 42px;
          padding: 0 12px; background: var(--surface);
          border: 1px solid var(--line); border-radius: 12px; color: var(--ink-soft);
        }
        .barcode-manual .search-input { flex: 1; border: 0; background: transparent; outline: none;
          font: inherit; color: var(--ink); font-size: 14px; min-width: 0; }
        .scanner { aspect-ratio: 4/3; background: #1a1612;
          border-radius: 16px; position: relative; overflow: hidden;
          display: grid; place-items: center;
          background-image:
            radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.05), transparent 60%),
            linear-gradient(180deg, #221c14, #15110d);
        }
        .scan-frame { position: relative; width: 78%; aspect-ratio: 1.6/1; display: grid; place-items: center;
          color: rgba(255,255,255,0.5); }
        .corner { position: absolute; width: 22px; height: 22px;
          border: 2px solid rgba(255,255,255,0.85); border-radius: 4px; }
        .corner.tl { top: 0; left: 0; border-right: 0; border-bottom: 0; }
        .corner.tr { top: 0; right: 0; border-left: 0; border-bottom: 0; }
        .corner.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; }
        .corner.br { bottom: 0; right: 0; border-left: 0; border-top: 0; }
        .laser { position: absolute; left: 6%; right: 6%; height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          box-shadow: 0 0 12px var(--accent);
          animation: laser-scan 1.4s ease-in-out infinite alternate;
        }
        @keyframes laser-scan {
          from { top: 12%; }
          to { top: 80%; }
        }
        .scan-found { display: flex; flex-direction: column; align-items: center;
          background: rgba(255,255,255,0.96); border-radius: 14px; padding: 16px 20px;
          color: var(--ink); animation: pop 0.3s cubic-bezier(.3,1.4,.5,1); }
        @keyframes pop { from { transform: scale(0.92); opacity: 0; } }
        .hint { font-size: 12px; color: var(--ink-soft); line-height: 1.5; text-align: center;
          font-style: italic; }
      `}</style>
    </div>
  );
}

// ─── PhotoTab ──────────────────────────────────────────────────────────
function PhotoTab({ onPick }) {
  const [step, setStep] = useStateAM('idle'); // idle | analyzing | result | error
  const [guess, setGuess] = useStateAM(null);
  const [errorMsg, setErrorMsg] = useStateAM(null);
  const fileInputRef = useRefAM(null);

  const onFile = async (file) => {
    if (!file) return;
    setStep('analyzing');
    setErrorMsg(null);
    try {
      const reply = await window.api.ai.estimateImage(file);
      const f = window.FOODS.find(x => x.id === reply.matchId);
      if (!f) {
        setErrorMsg('Match non trovato nel database');
        setStep('error');
        return;
      }
      setGuess({ food: f, confidence: reply.confidence ?? 0.8, estG: Math.round(reply.grams || f.serving) });
      setStep('result');
    } catch (e) {
      console.error(e);
      setErrorMsg(e.status === 429 ? 'Limite richieste AI raggiunto, riprova fra un\'ora' : 'Errore analisi');
      setStep('error');
    }
  };

  const capture = () => fileInputRef.current && fileInputRef.current.click();

  return (
    <div>
      <div className={`photo-stage step-${step}`}>
        {step === 'idle' && (
          <div className="photo-empty">
            <Icon name="camera" size={42} stroke={1.4} />
            <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 500 }}>Fotografa il tuo piatto</div>
            <div className="hint" style={{ marginTop: 4 }}>L'AI proverà a riconoscerlo e stimare le porzioni</div>
          </div>
        )}
        {step === 'analyzing' && (
          <div className="photo-analyzing">
            <div className="ai-scan">
              <FoodGlyph category="Primi piatti" size={56} />
              <div className="ai-ring" />
            </div>
            <div style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-2)' }}>Analisi del piatto…</div>
            <div className="analyze-steps">
              <div className="astep done">Identificazione alimenti</div>
              <div className="astep working">Stima della porzione</div>
              <div className="astep">Calcolo macronutrienti</div>
            </div>
          </div>
        )}
        {step === 'result' && guess && (
          <div className="photo-result">
            <div className="hero">
              <FoodGlyph category={guess.food.cat} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{guess.food.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Stima porzione · <span className="num">~{guess.estG}g</span>
                </div>
              </div>
              <Pill color="var(--fat)" soft>
                <Icon name="sparkle" size={11} /> {Math.round(guess.confidence * 100)}%
              </Pill>
            </div>
            <div className="estimated-macros">
              {(() => {
                const m = window.computeMacros(guess.food.id, guess.estG);
                return (
                  <>
                    <EstChip color="var(--kcal)" label="kcal" v={m.kcal} />
                    <EstChip color="var(--protein)" label="proteine" v={`${m.p}g`} />
                    <EstChip color="var(--carbs)" label="carbo" v={`${m.c}g`} />
                    <EstChip color="var(--fat)" label="grassi" v={`${m.fat}g`} />
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => onFile(e.target.files && e.target.files[0])}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {(step === 'idle' || step === 'error') && (
          <>
            <button className="btn btn-outline" style={{ flex: 1, height: 46 }} onClick={capture}>
              <Icon name="camera" size={17} /> Galleria
            </button>
            <button className="btn btn-accent" style={{ flex: 1.4, height: 46 }} onClick={capture}>
              <Icon name="camera" size={17} /> Scatta
            </button>
          </>
        )}
        {step === 'result' && guess && (
          <>
            <button className="btn btn-outline" style={{ flex: 1, height: 46 }} onClick={() => { setStep('idle'); setGuess(null); }}>
              Riprova
            </button>
            <button className="btn btn-primary" style={{ flex: 1.4, height: 46 }} onClick={() => onPick(guess.food.id, guess.estG)}>
              Conferma e modifica
            </button>
          </>
        )}
      </div>
      {step === 'error' && errorMsg && (
        <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>{errorMsg}</div>
      )}
      <style>{`
        .photo-stage { background: var(--surface); border: 1px solid var(--line);
          border-radius: 18px; padding: 28px 18px; min-height: 240px;
          display: grid; place-items: center; }
        .photo-empty { display: flex; flex-direction: column; align-items: center; color: var(--ink-soft); text-align: center; }
        .photo-analyzing { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .ai-scan { position: relative; display: grid; place-items: center; width: 84px; height: 84px; }
        .ai-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid transparent; border-top-color: var(--accent);
          animation: spin 1s linear infinite;
        }
        .analyze-steps { margin-top: 16px; width: 100%; max-width: 240px; display: flex; flex-direction: column; gap: 8px; }
        .astep { font-size: 12.5px; color: var(--ink-faint); display: flex; align-items: center; gap: 8px;
          padding-left: 18px; position: relative; }
        .astep::before { content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--ink-faint); }
        .astep.working { color: var(--ink-2); }
        .astep.working::before { border-color: var(--accent); border-top-color: transparent;
          animation: spin 0.8s linear infinite; }
        .astep.done { color: var(--ink-soft); }
        .astep.done::before { background: var(--fat); border-color: var(--fat); }

        .photo-result { width: 100%; display: flex; flex-direction: column; gap: 14px; }
        .photo-result .hero { display: flex; align-items: center; gap: 12px; }
        .estimated-macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function EstChip({ color, label, v }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--line)',
      borderRadius: 10, padding: '8px 10px', textAlign: 'center',
    }}>
      <div className="display num" style={{ fontSize: 18, color, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 4, letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

// ─── AITab ──────────────────────────────────────────────────────────────
function AITab({ onPick }) {
  const [text, setText] = useStateAM('');
  const [busy, setBusy] = useStateAM(false);
  const [result, setResult] = useStateAM(null);

  const examples = [
    'un piatto di pasta al pomodoro con parmigiano',
    'panino con prosciutto e formaggio',
    'insalata di pollo con avocado',
  ];

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      // Prompt + parsing JSON ora vivono sul backend (vedi src/services/llm.ts).
      const parsed = await window.api.ai.estimateText(text.trim());
      setResult(parsed);
    } catch (e) {
      console.error(e);
      const msg = e.status === 429
        ? 'Limite richieste AI raggiunto, riprova fra un\'ora.'
        : 'Errore nell\'analisi. Riprova.';
      setResult({ error: msg });
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="ai-card">
        <div className="ai-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
            <Icon name="sparkle" size={14} />
            <span className="eyebrow" style={{ color: 'inherit' }}>Stima con AI</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>opzionale</span>
        </div>
        <textarea
          placeholder="Descrivi il tuo pasto…"
          value={text}
          onChange={e => setText(e.target.value)}
          className="ai-input"
          rows={3}
        />
        {!text && (
          <div className="examples">
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>Esempi</div>
            {examples.map((ex, i) => (
              <button key={i} className="example" onClick={() => setText(ex)}>"{ex}"</button>
            ))}
          </div>
        )}
        <button className="btn btn-accent" style={{ width: '100%', marginTop: 10, height: 42 }}
                onClick={submit} disabled={busy || !text.trim()}>
          {busy ? <><span className="dot-pulse" /> Sto analizzando…</> :
                  <><Icon name="sparkle" size={15} /> Stima macronutrienti</>}
        </button>
      </div>

      {result && !result.error && (
        <div className="ai-result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{result.name}</div>
            <Pill color="var(--accent)" soft>
              <Icon name="sparkle" size={11} /> {Math.round((result.confidence || 0.8) * 100)}%
            </Pill>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            Porzione stimata · <span className="num">~{result.grams}g</span>
          </div>
          <div className="estimated-macros2">
            <EstChip color="var(--kcal)" label="kcal" v={Math.round(result.kcal || 0)} />
            <EstChip color="var(--protein)" label="proteine" v={`${Math.round(result.p || 0)}g`} />
            <EstChip color="var(--carbs)" label="carbo" v={`${Math.round(result.c || 0)}g`} />
            <EstChip color="var(--fat)" label="grassi" v={`${Math.round(result.f || 0)}g`} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', height: 42, marginTop: 12 }}
                  onClick={() => {
                    if (result.matchId && window.FOODS.find(f => f.id === result.matchId)) {
                      onPick(result.matchId, result.grams);
                    }
                  }}>
            Aggiungi al pasto
          </button>
        </div>
      )}
      {result && result.error && (
        <div className="ai-result" style={{ color: 'var(--ink-soft)', textAlign: 'center', fontStyle: 'italic' }}>
          {result.error}
        </div>
      )}

      <style>{`
        .ai-card { background: var(--surface); border: 1px solid var(--line);
          border-radius: 16px; padding: 14px; }
        .ai-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ai-input {
          width: 100%; border: 0; background: var(--bg); border-radius: 10px;
          padding: 10px 12px; font: inherit; color: var(--ink); resize: none;
          font-size: 14px; outline: none; line-height: 1.45;
          border: 1px solid var(--line-soft);
        }
        .ai-input:focus { border-color: var(--ink-2); }
        .examples { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
        .example { appearance: none; border: 0; background: transparent; text-align: left;
          font: inherit; font-size: 12px; font-style: italic; color: var(--ink-soft);
          padding: 4px 0; cursor: pointer; }
        .example:hover { color: var(--accent); }

        .ai-result { background: var(--surface); border: 1px solid var(--line);
          border-radius: 16px; padding: 14px; margin-top: 12px; }
        .estimated-macros2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 12px; }

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

// ─── FavoritesTab ───────────────────────────────────────────────────────
function FavoritesTab({ onPickFav }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>I tuoi preferiti</div>
      <div className="fav-list">
        {window.FAVORITES.map(fav => {
          const items = fav.items
            .map(([id, q, u]) => {
              const food = window.FOODS.find(f => f.id === id);
              if (!food) return null;
              const grams = window.servingToGrams(food, q);
              return { food, qty: q, unit: u || food.unit, grams };
            })
            .filter(Boolean);
          const total = window.totalMacros(items.map(i => ({ foodId: i.food.id, grams: i.grams })));
          return (
            <div key={fav.id} className="fav-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fav-name display" style={{ fontSize: 16, fontStyle: 'italic' }}>{fav.name}</div>
                  <div className="fav-items">
                    {items.length ? items.map(i => i.food.name).join(' · ') : 'Alimenti non disponibili'}
                  </div>
                </div>
                <button className="iconbtn iconbtn-accent" style={{ width: 32, height: 32 }}
                        onClick={() => onPickFav(fav)} disabled={items.length === 0} aria-label="Aggiungi">
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <div className="fav-macros">
                <span><span className="num" style={{ fontWeight: 500 }}>{total.kcal}</span> kcal</span>
                <span style={{ color: 'var(--protein)' }}><span className="num" style={{ fontWeight: 500 }}>{Math.round(total.p)}</span>g P</span>
                <span style={{ color: 'var(--carbs)' }}><span className="num" style={{ fontWeight: 500 }}>{Math.round(total.c)}</span>g C</span>
                <span style={{ color: 'var(--fat)' }}><span className="num" style={{ fontWeight: 500 }}>{Math.round(total.fat)}</span>g G</span>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        .fav-list { display: flex; flex-direction: column; gap: 8px; }
        .fav-card { background: var(--surface); border: 1px solid var(--line);
          border-radius: 14px; padding: 14px; }
        body[data-type="moderno"] .fav-name { font-style: normal; font-weight: 600; }
        .fav-items { font-size: 12px; color: var(--ink-soft); margin-top: 4px; line-height: 1.45; }
        .fav-macros { display: flex; gap: 12px; margin-top: 10px;
          font-size: 11.5px; color: var(--ink-soft); }
      `}</style>
    </div>
  );
}

// ─── QuantityPicker ──────────────────────────────────────────────────────
function QuantityPicker({ food, qty, onQty, slot, onSlot, onCancel, onConfirm }) {
  const grams = window.servingToGrams(food, qty || 0);
  const macros = window.computeMacros(food.id, grams);

  const presets = food.unit === 'pz'
    ? [0.5, 1, 1.5, 2, 3]
    : food.unit === 'ml'
      ? [100, 200, 250, 330, 500]
      : [50, 100, 150, 200, 300];

  const step = food.unit === 'pz' ? 0.5 : food.unit === 'ml' ? 10 : 10;

  return (
    <div>
      <div className="qp-head">
        <FoodGlyph category={food.cat} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>{food.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{food.cat}</div>
        </div>
      </div>

      <SlotPicker slot={slot} onChange={onSlot} />

      <div className="qp-input">
        <button className="qp-btn" onClick={() => onQty(Math.max(0, +(qty - step).toFixed(2)))}>
          <Icon name="minus" size={18} />
        </button>
        <div className="qp-display">
          <input
            type="number"
            value={qty}
            onChange={e => onQty(+e.target.value || 0)}
            className="qp-num"
            step={step}
          />
          <span className="qp-unit">{food.unit}</span>
        </div>
        <button className="qp-btn" onClick={() => onQty(+(qty + step).toFixed(2))}>
          <Icon name="plus" size={18} />
        </button>
      </div>

      <div className="qp-presets">
        {presets.map(p => (
          <button key={p}
                  className={`preset ${qty === p ? 'on' : ''}`}
                  onClick={() => onQty(p)}>
            <span className="num">{p}</span>{food.unit}
          </button>
        ))}
      </div>

      <div className="qp-macros">
        <div className="qp-macro">
          <div className="eyebrow">Calorie</div>
          <div className="display num" style={{ fontSize: 32, lineHeight: 1, marginTop: 4 }}>{macros.kcal}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>kcal</div>
        </div>
        <div className="qp-mini">
          <div><span className="dot" style={{ background: 'var(--protein)' }} /> <span className="num">{macros.p}</span>g <span style={{ color: 'var(--ink-soft)' }}>proteine</span></div>
          <div><span className="dot" style={{ background: 'var(--carbs)' }} /> <span className="num">{macros.c}</span>g <span style={{ color: 'var(--ink-soft)' }}>carboidrati</span></div>
          <div><span className="dot" style={{ background: 'var(--fat)' }} /> <span className="num">{macros.fat}</span>g <span style={{ color: 'var(--ink-soft)' }}>grassi</span></div>
          <div><span className="dot" style={{ background: 'var(--fiber)' }} /> <span className="num">{macros.fb}</span>g <span style={{ color: 'var(--ink-soft)' }}>fibre</span></div>
        </div>
      </div>

      <div className="qp-actions">
        <button className="btn btn-outline" style={{ flex: 1, height: 48 }} onClick={onCancel}>
          Indietro
        </button>
        <button className="btn btn-primary" style={{ flex: 1.6, height: 48 }} onClick={onConfirm}>
          Aggiungi a {slot}
        </button>
      </div>

      <style>{`
        .qp-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .qp-input {
          display: grid; grid-template-columns: 44px 1fr 44px; gap: 8px; align-items: stretch;
          margin-top: 16px;
        }
        .qp-btn {
          appearance: none; border: 1px solid var(--line); background: var(--surface);
          border-radius: 12px; height: 56px; cursor: pointer; color: var(--ink-2);
          display: grid; place-items: center;
        }
        .qp-btn:hover { background: var(--surface-2); color: var(--ink); }
        .qp-display {
          display: flex; align-items: baseline; justify-content: center; gap: 4px;
          background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
          padding: 0 12px;
        }
        .qp-num { width: 100%; min-width: 0; text-align: center; border: 0; background: transparent;
          font: inherit; font-family: var(--font-display); font-feature-settings: "tnum";
          font-size: 30px; outline: none; color: var(--ink);
          -moz-appearance: textfield;
        }
        .qp-num::-webkit-inner-spin-button, .qp-num::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        .qp-unit { color: var(--ink-soft); font-size: 14px; }

        .qp-presets { display: flex; gap: 6px; margin-top: 10px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .qp-presets::-webkit-scrollbar { display: none; }
        .preset { appearance: none; border: 1px solid var(--line); background: transparent;
          padding: 6px 12px; border-radius: 999px; font: inherit; font-size: 12px;
          color: var(--ink-soft); cursor: pointer; white-space: nowrap;
        }
        .preset.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }

        .qp-macros { background: var(--surface); border: 1px solid var(--line);
          border-radius: 16px; padding: 16px; margin-top: 18px;
          display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center; }
        .qp-macro { padding-right: 16px; border-right: 1px solid var(--line-soft); }
        .qp-mini { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; }
        .qp-mini > div { display: flex; align-items: center; gap: 6px; }
        .qp-mini .dot { width: 7px; height: 7px; border-radius: 999px; display: inline-block; }

        .qp-actions { display: flex; gap: 8px; margin-top: 18px; }
      `}</style>
    </div>
  );
}

Object.assign(window, { AddMealSheet });
