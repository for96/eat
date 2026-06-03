# eat

Diario nutrizionale installabile come PWA. La nuova architettura e local-first: pasti, acqua, obiettivi, preferiti, scansioni e prodotti salvati vivono nel browser; il backend e solo un proxy leggero verso Open Food Facts.

## Monorepo

- `frontend/` - UI React senza framework, bundlata via esbuild. Mantiene grafica, layout, palette e componenti del prototype originale.
- `src/` - proxy HTTP minimale Node/TypeScript per healthcheck e lookup barcode Open Food Facts.
- `api/handler.ts` - entry Vercel serverless che riusa lo stesso router del proxy locale.
- `prisma/foods-seed.json` - catalogo seed riusato anche dal frontend local-first.

## Quick start locale

Non serve database.

```bash
npm install
cd frontend && npm install && cd ..

# terminale 1: proxy Open Food Facts su :3000
npm run dev

# terminale 2: PWA su :5173
npm --prefix frontend run dev
```

Apri http://localhost:5173. La PWA parte subito dai dati locali; il proxy viene chiamato solo da `POST /api/v1/barcode/lookup`.

## Comandi principali

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il proxy locale su `127.0.0.1:3000` |
| `npm run test` | Esegue test su proxy, mapping OFF e scoring qualita |
| `npm run build` | Compila TypeScript del proxy |
| `npm --prefix frontend run dev` | Build dev + static server frontend su `127.0.0.1:5173` |
| `npm --prefix frontend run build` | Build produzione della PWA in `frontend/dist/` |

## Architettura

- **Local-first**: `frontend/src/api.js` conserva lo stesso contratto usato dall'app, ma salva i dati in `localStorage` versionato. L'avvio non dipende piu da rete, DB o cold start serverless.
- **Catalogo seed immediato**: `frontend/src/seed-data.js` e generato da `prisma/foods-seed.json` e caricato prima degli helper dati.
- **Proxy barcode**: `src/services/openfoodfacts.ts` chiama Open Food Facts con `OFF_USER_AGENT`, timeout breve e cache in memoria.
- **Qualita prodotto**: il proxy restituisce alimento normalizzato e score trasparente basato su Nutri-Score, NOVA, Eco-score, nutrienti critici, additivi e dati mancanti. Non replica Yuka e non inventa dati assenti.
- **AI scollegata**: Foto e AI restano visibili ma disabilitate nei flussi attivi. Le API key potranno essere riattaccate in futuro lato proxy.
- **Scanner primario**: la bottom nav mette `Scanner` al posto di `Storico`; Storico e scansioni recenti vivono in `Profilo`.

## Deploy

Vedi [DEPLOY.md](DEPLOY.md). In produzione servono solo Vercel e `OFF_USER_AGENT`; non serve `DATABASE_URL`.
