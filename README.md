# Pasto

Diario nutrizionale: pasti, acqua, macros, obiettivi. Webapp deploy-abile su Vercel come PWA installabile su iOS/Android.

Monorepo:
- `frontend/` — UI React (no framework, bundlata via esbuild). Stessa shell del prototype originale.
- `src/` — Backend Fastify + Prisma (servito come Vercel Serverless Function via `api/[...path].ts`).
- `prisma/` — schema (Postgres) + seed (38 alimenti + utente default + 4 preferiti).

## Quick start (locale)

Serve un PostgreSQL — più semplice è usare **Neon** anche per dev (è gratis, è già online). Vedi `DEPLOY.md` per il setup di Neon.

```bash
# 1. Dipendenze (root + frontend)
npm install
cd frontend && npm install && cd ..

# 2. Schema + seed
cp .env.example .env
# Edita .env: metti la tua DATABASE_URL di Neon
npm run db:push
npm run seed

# 3. Backend (porta 3000)
npm run dev

# 4. In un secondo terminale: frontend (porta 5173)
cd frontend && npm run dev
```

Apri http://localhost:5173 — la webapp si attacca al backend su :3000 (rilevato automaticamente da `api.js`).

## Deploy su Vercel

Vedi **[DEPLOY.md](DEPLOY.md)**.

## Comandi principali

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia backend Fastify in watch su :3000 |
| `npm run test` | Esegue smoke test (vitest, in-memory via fastify.inject) |
| `npm run db:push` | Sincronizza schema Prisma sul DB collegato in DATABASE_URL |
| `npm run seed` | Popola foods/favorites/utente default |
| `npm run build` | Compila TypeScript backend → `dist/` (non serve per Vercel) |
| `npm --prefix frontend run dev` | Dev server frontend (esbuild watch + static server :5173) |
| `npm --prefix frontend run build` | Builda il frontend in `frontend/dist/` |

## Architettura — perché così

- **Single-user mode**: niente auth. Tutti i request risolvono al `DEFAULT_USER_ID`. Lo schema però ha le FK su `User` per essere già pronto a multi-utente: basta aggiungere `email`/`passwordHash` su `User` e un middleware che setta l'id dalla JWT (vedi `src/currentUser.ts`).
- **Macros snapshottati**: ogni `MealEntry` salva il valore calcolato delle macro al momento dell'inserimento. Se aggiorni un Food, lo storico non cambia (immutabilità storica).
- **Fuzzy search senza pg_trgm**: usiamo una colonna `nameNorm` (lowercase + niente diacritici) + LIKE multi-token. Con 38 seed + custom è sufficiente. Per scalare, aggiungere indice trigram in una migrazione futura.
- **AI provider intercambiabile**: `src/services/llm.ts` espone `LLMProvider` con uno `stub` di default (keyword match). Per passare a Anthropic basta una env `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` — l'implementazione vera è lo scheletro già pronto in `src/services/llm.ts`.
- **OpenFoodFacts**: barcode scanner manda EAN al backend, che fa cache lookup → fetch OFF → upsert in DB. Si vedono come `source='openfoodfacts'`.

## Frontend — modifiche al prototype originale

I file in `frontend/src/` sono quelli del prototype Claude originale (tweaks-panel, icons, primitives, screens, addmeal, main, data), più un nuovo `api.js` che fa da client REST verso il backend (sostituisce il `localStorage` di prima).

Build via esbuild che concatena i file (l'ordine è in `build.mjs`) e compila JSX → `bundle.js`. React 18 viene caricato esterno via CDN (cache CDN > shippare React nel bundle).

PWA via:
- `public/manifest.webmanifest` (Apple touch icon, theme color)
- `public/sw.js` (cache-first per lo shell, network-only per `/api/*`)
- Su iOS: Safari → Condividi → Aggiungi a Home.

## Roadmap

- [ ] Auth multi-utente (email + password, JWT) — schema già predisposto
- [ ] Camera barcode (`@zxing/browser`) — frontend mock con `prompt()` da rimpiazzare in `addmeal.jsx:BarcodeTab`
- [ ] Provider Anthropic vero (sostituire stub in `src/services/llm.ts`)
- [ ] Soft delete + sync delle cancellazioni offline
- [ ] i18n (per ora solo italiano)
