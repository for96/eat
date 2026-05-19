// icons.jsx — small SVG icon set. All inherit color via currentColor.

const Icon = ({ name, size = 20, stroke = 1.6, ...rest }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    ...rest,
  };
  switch (name) {
    case 'home':
      return <svg {...props}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>;
    case 'calendar':
      return <svg {...props}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>;
    case 'stats':
      return <svg {...props}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>;
    case 'user':
      return <svg {...props}><circle cx="12" cy="8.5" r="3.8" /><path d="M5 20.5c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>;
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case 'minus':
      return <svg {...props}><path d="M5 12h14" /></svg>;
    case 'close':
      return <svg {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
    case 'barcode':
      return <svg {...props}><path d="M4 6v12M7 6v12M10 6v12M13 6v12M16 6v12M19 6v12" /><path d="M2 4h4M18 4h4M2 20h4M18 20h4" strokeWidth={stroke * 0.8}/></svg>;
    case 'camera':
      return <svg {...props}><path d="M4 8.5h3l1.5-2h7l1.5 2h3V19H4z" /><circle cx="12" cy="13.5" r="3.5" /></svg>;
    case 'sparkle':
      return <svg {...props}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2" /></svg>;
    case 'heart':
      return <svg {...props}><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 3.3c0 5.6-7.5 10.2-7.5 10.2z" /></svg>;
    case 'heart-fill':
      return <svg {...props} fill="currentColor" stroke="none"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 3.3c0 5.6-7.5 10.2-7.5 10.2z" /></svg>;
    case 'chevron-left':
      return <svg {...props}><path d="m14 6-6 6 6 6" /></svg>;
    case 'chevron-right':
      return <svg {...props}><path d="m10 6 6 6-6 6" /></svg>;
    case 'chevron-down':
      return <svg {...props}><path d="m6 9 6 6 6-6" /></svg>;
    case 'water':
      return <svg {...props}><path d="M12 3.5c3 4 6 7.4 6 11a6 6 0 0 1-12 0c0-3.6 3-7 6-11z" /></svg>;
    case 'check':
      return <svg {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
    case 'flame':
      return <svg {...props}><path d="M12 3c.7 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .4-1.8 1-2.4M6 12.5c0 4 2.7 7.5 6 7.5s6-3.5 6-7.5c0-3.5-2-5-3.5-6.5" /></svg>;
    case 'edit':
      return <svg {...props}><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="m13.5 6.5 4 4" /></svg>;
    case 'trash':
      return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>;
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" /></svg>;
    case 'sun':
      return <svg {...props}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></svg>;
    case 'moon':
      return <svg {...props}><path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z" /></svg>;
    case 'fork':
      return <svg {...props}><path d="M7 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 13v8M16 3c-1.5 0-2.5 1.5-2.5 3v5h5V6c0-1.5-1-3-2.5-3zM16 11v10" /></svg>;
    case 'coffee':
      return <svg {...props}><path d="M5 9h12v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" /><path d="M17 11h2a2.5 2.5 0 0 1 0 5h-2M8 4v2M12 4v2M16 4v2" /></svg>;
    case 'leaf':
      return <svg {...props}><path d="M4 20c0-10 6-16 16-16 0 10-6 16-16 16z" /><path d="M4 20 14 10" /></svg>;
    case 'arrow-up':
      return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="4" /></svg>;
  }
};

// food category → icon name + tint
const FOOD_GLYPH = {
  'Primi piatti':     'fork',
  'Cereali':          'leaf',
  'Carni':            'fork',
  'Pesci':            'fork',
  'Uova & latticini': 'leaf',
  'Pane & cereali':   'leaf',
  'Verdure':          'leaf',
  'Legumi':           'leaf',
  'Frutta':           'leaf',
  'Frutta secca':     'leaf',
  'Bevande':          'coffee',
  'Dolci':            'heart',
  'Condimenti':       'leaf',
};

Object.assign(window, { Icon, FOOD_GLYPH });
