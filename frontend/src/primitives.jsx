// primitives.jsx — small reusable UI bits

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Ring ──────────────────────────────────────────────────────────────────
// Multi-track ring used on the today hero
function Ring({ size = 220, stroke = 12, tracks, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
           style={{ transform: 'rotate(-90deg)' }}>
        {tracks.map((t, i) => {
          const radius = r - i * (stroke + 2);
          const circ = 2 * Math.PI * radius;
          const offset = circ * (1 - Math.min(1, t.value));
          return (
            <g key={i}>
              <circle cx={size/2} cy={size/2} r={radius}
                      stroke={t.bg || 'var(--line-soft)'} strokeWidth={stroke}
                      fill="none" strokeLinecap="round" />
              <circle cx={size/2} cy={size/2} r={radius}
                      stroke={t.color} strokeWidth={stroke}
                      fill="none" strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.3,.7,.4,1)' }} />
            </g>
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        textAlign: 'center',
      }}>{children}</div>
    </div>
  );
}

// ─── MacroBar ──────────────────────────────────────────────────────────────
function MacroBar({ label, value, goal, color, unit = 'g' }) {
  const pct = Math.min(1, value / Math.max(1, goal));
  const over = value > goal;
  return (
    <div className="macro-bar">
      <div className="macro-row">
        <span className="macro-label">{label}</span>
        <span className="macro-vals num">
          <span style={{ color: 'var(--ink)' }}>{Math.round(value)}</span>
          <span style={{ color: 'var(--ink-faint)' }}>/{goal}{unit}</span>
        </span>
      </div>
      <div className="macro-track">
        <div className="macro-fill" style={{
          width: `${pct * 100}%`,
          background: color,
          boxShadow: over ? `0 0 0 1px ${color} inset` : 'none',
        }} />
      </div>
      <style>{`
        .macro-bar { display: flex; flex-direction: column; gap: 5px; }
        .macro-row { display: flex; justify-content: space-between; align-items: baseline; }
        .macro-label { font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
        .macro-vals { font-size: 12.5px; font-feature-settings: "tnum"; }
        .macro-track { height: 6px; background: var(--line-soft); border-radius: 999px; overflow: hidden; }
        .macro-fill { height: 100%; border-radius: 999px; transition: width 0.5s cubic-bezier(.3,.7,.4,1); }
      `}</style>
    </div>
  );
}

// ─── Water tracker — glass row ────────────────────────────────────────────
function WaterTracker({ ml, goal, onAdd, onRemove }) {
  const glassMl = 250;
  const total = Math.ceil(goal / glassMl);
  const filled = Math.round(ml / glassMl);
  const glasses = Array.from({ length: total }, (_, i) => i < filled);
  return (
    <div className="water">
      <div className="water-head">
        <div>
          <div className="eyebrow">Acqua</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span className="display" style={{ fontSize: 28, lineHeight: 1, color: 'var(--water)' }}>
              {(ml/1000).toFixed(1)}
            </span>
            <span className="num" style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
              / {(goal/1000).toFixed(1)} L
            </span>
          </div>
        </div>
        <div className="water-ctrl">
          <button className="iconbtn" onClick={onRemove} aria-label="Rimuovi bicchiere"><Icon name="minus" size={16} /></button>
          <button className="iconbtn" onClick={onAdd} aria-label="Aggiungi bicchiere"><Icon name="plus" size={16} /></button>
        </div>
      </div>
      <div className="water-row">
        {glasses.map((on, i) => (
          <svg key={i} width="20" height="26" viewBox="0 0 20 26" aria-hidden="true">
            <path d="M3 3h14l-1.4 20.5a1.6 1.6 0 0 1-1.6 1.5H6a1.6 1.6 0 0 1-1.6-1.5z"
                  fill={on ? 'var(--water)' : 'transparent'}
                  fillOpacity={on ? 0.9 : 0}
                  stroke="var(--water)" strokeWidth="1.3" strokeOpacity={on ? 1 : 0.45} />
          </svg>
        ))}
      </div>
      <style>{`
        .water { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; }
        .water-head { display: flex; justify-content: space-between; align-items: flex-end; }
        .water-ctrl { display: flex; gap: 6px; }
        .water-row { display: flex; gap: 5px; margin-top: 14px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}

// ─── IconButton ──────────────────────────────────────────────────────────
function IconButton({ icon, onClick, label, size = 32, variant = 'ghost' }) {
  return (
    <button className={`iconbtn iconbtn-${variant}`} onClick={onClick} aria-label={label}
            style={{ width: size, height: size }}>
      <Icon name={icon} size={Math.round(size * 0.55)} />
    </button>
  );
}

// ─── FoodGlyph — colored avatar for a food category ───────────────────────
function FoodGlyph({ category, size = 36 }) {
  // muted palette based on category
  const tint = {
    'Primi piatti':     ['#E9D9C7', '#7A5A3E'],
    'Cereali':          ['#E9DEC4', '#75643D'],
    'Carni':            ['#E8C9B8', '#8C3F1F'],
    'Pesci':            ['#CFDCDF', '#3E5C7A'],
    'Uova & latticini': ['#F0E3C6', '#7A6A40'],
    'Pane & cereali':   ['#E4D5B5', '#6E5A33'],
    'Verdure':          ['#D6E1C5', '#5A7148'],
    'Legumi':           ['#D8CFA5', '#705F2C'],
    'Frutta':           ['#E8C9CA', '#894048'],
    'Frutta secca':     ['#DBC9A8', '#7A5A2A'],
    'Bevande':          ['#D2BFAB', '#5A3E29'],
    'Dolci':            ['#E7C0B0', '#8B4A33'],
    'Condimenti':       ['#E4DABB', '#7A6638'],
  }[category] || ['#E2D7C0', '#7A6F62'];
  const glyph = (FOOD_GLYPH[category] || 'leaf');
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: tint[0], color: tint[1],
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <Icon name={glyph} size={Math.round(size * 0.5)} stroke={1.7} />
    </div>
  );
}

// ─── Sheet — bottom sheet ────────────────────────────────────────────────
function Sheet({ open, onClose, title, children, maxHeight = '85%' }) {
  const [mounted, setMounted] = useState(open);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVis(true));
    } else {
      setVis(false);
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!mounted) return null;
  return (
    <div className={`sheet-wrap ${vis ? 'on' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" style={{ maxHeight }}>
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-head">
            <div className="sheet-title display">{title}</div>
            <button className="iconbtn iconbtn-ghost" onClick={onClose} aria-label="Chiudi">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
      <style>{`
        .sheet-wrap { position: absolute; inset: 0; z-index: 50; pointer-events: none; }
        .sheet-wrap.on { pointer-events: auto; }
        .sheet-backdrop {
          position: absolute; inset: 0;
          background: rgba(31,27,22,0.35);
          opacity: 0; transition: opacity 0.24s ease;
          backdrop-filter: blur(2px);
        }
        .sheet-wrap.on .sheet-backdrop { opacity: 1; }
        .sheet {
          position: absolute; left: 0; right: 0; bottom: 0;
          background: var(--bg);
          border-top-left-radius: 28px;
          border-top-right-radius: 28px;
          border-top: 1px solid var(--line);
          transform: translateY(100%);
          transition: transform 0.28s cubic-bezier(.3,.7,.4,1);
          display: flex; flex-direction: column;
          box-shadow: 0 -10px 30px rgba(31,27,22,.15);
        }
        .sheet-wrap.on .sheet { transform: translateY(0); }
        .sheet-grab { width: 36px; height: 4px; border-radius: 4px; background: var(--ink-faint);
          margin: 10px auto 0; opacity: 0.5; flex-shrink: 0; }
        .sheet-head { display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px 8px; flex-shrink: 0; }
        .sheet-title { font-size: 22px; font-weight: 400; font-style: italic; color: var(--ink); }
        body[data-type="moderno"] .sheet-title { font-style: normal; font-weight: 600; letter-spacing: -.01em; }
        .sheet-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 0 20px 24px;
          scrollbar-width: none; }
        .sheet-body::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────
function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs">
      {options.map(o => (
        <button key={o.value}
                className={`tab ${value === o.value ? 'on' : ''} ${o.disabled ? 'disabled' : ''}`}
                disabled={!!o.disabled}
                title={o.disabled ? 'Non disponibile' : undefined}
                onClick={() => !o.disabled && onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={15} stroke={1.7} />}
          <span>{o.label}</span>
        </button>
      ))}
      <style>{`
        .tabs { display: flex; gap: 4px; background: var(--surface-2); border-radius: 12px; padding: 4px;
          border: 1px solid var(--line); }
        .tab { flex: 1; border: 0; background: transparent; color: var(--ink-soft);
          padding: 8px 6px; border-radius: 8px; font-size: 12px; font-weight: 500;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          cursor: pointer; transition: all 0.15s; min-width: 0;
        }
        .tab.on { background: var(--bg); color: var(--ink); box-shadow: 0 1px 2px rgba(31,27,22,.06); }
        .tab:not(.on):hover { color: var(--ink-2); }
        .tab.disabled { opacity: 0.42; cursor: not-allowed; }
        .tab.disabled:hover { color: var(--ink-soft); }
        .tab span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>
    </div>
  );
}

// ─── Pill ────────────────────────────────────────────────────────────────
function Pill({ children, color, soft }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
      color: soft ? (color || 'var(--ink-soft)') : '#fff',
      background: soft ? `color-mix(in oklab, ${color || 'var(--ink-soft)'} 14%, transparent)` : (color || 'var(--ink)'),
      letterSpacing: '0.01em',
    }}>{children}</span>
  );
}

// ─── Stat — small label + big number ─────────────────────────────────────
function Stat({ label, value, unit, color }) {
  return (
    <div className="stat">
      <div className="eyebrow">{label}</div>
      <div className="stat-val">
        <span className="display num" style={{ fontSize: 28, color: color || 'var(--ink)', lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{unit}</span>}
      </div>
      <style>{`
        .stat { display: flex; flex-direction: column; gap: 4px; }
        .stat-val { display: flex; align-items: baseline; gap: 4px; }
      `}</style>
    </div>
  );
}

// ─── Global helpers exported ─────────────────────────────────────────────
Object.assign(window, {
  Ring, MacroBar, WaterTracker, IconButton, FoodGlyph,
  Sheet, Tabs, Pill, Stat,
});

// ─── Shared button styles ──────────────────────────────────────────────
// Injected once on first script run.
if (!document.getElementById('pasto-base-css')) {
  const style = document.createElement('style');
  style.id = 'pasto-base-css';
  style.textContent = `
    .iconbtn {
      appearance: none; border: 0; background: transparent;
      border-radius: 999px; cursor: pointer; color: var(--ink-2);
      display: inline-grid; place-items: center;
      transition: background 0.12s, color 0.12s, transform 0.1s;
    }
    .iconbtn:hover { background: var(--surface-2); color: var(--ink); }
    .iconbtn:active { transform: scale(0.94); }
    .iconbtn-solid { background: var(--ink); color: var(--bg); }
    .iconbtn-solid:hover { background: var(--ink); color: var(--bg); opacity: 0.92; }
    .iconbtn-accent { background: var(--accent); color: #fff; }
    .iconbtn-accent:hover { background: var(--accent); color: #fff; opacity: 0.92; }
    .iconbtn-outline { border: 1px solid var(--line); background: var(--surface); }
    .iconbtn-outline:hover { border-color: var(--ink-faint); background: var(--surface); }

    .btn {
      appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 500;
      padding: 10px 16px; border-radius: 12px; display: inline-flex; gap: 6px;
      align-items: center; justify-content: center;
      transition: all 0.15s ease;
    }
    .btn-primary { background: var(--ink); color: var(--bg); }
    .btn-primary:hover { opacity: 0.92; }
    .btn-accent { background: var(--accent); color: #fff; }
    .btn-accent:hover { opacity: 0.92; }
    .btn-ghost { background: transparent; color: var(--ink-2); }
    .btn-ghost:hover { background: var(--surface-2); color: var(--ink); }
    .btn-outline { background: var(--surface); border: 1px solid var(--line); color: var(--ink); }
    .btn-outline:hover { border-color: var(--ink-faint); }

    .card {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius); padding: 16px;
    }
  `;
  document.head.appendChild(style);
}
