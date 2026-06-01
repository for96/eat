# Deploy di Pasto su Vercel

Pasto ora e una PWA local-first con un proxy serverless minimale.

## Architettura deploy

- Frontend React/PWA statico -> Vercel CDN
- Proxy barcode -> Vercel Serverless Function `api/handler.ts`
- Persistenza utente -> `localStorage` del dispositivo
- Database -> non richiesto

## Variabili ambiente

Imposta su Vercel:

| Key | Value |
|---|---|
| `OFF_USER_AGENT` | `Pasto/0.1 (tuamail@example.com)` |
| `CORS_ORIGIN` | `*` oppure l'URL del deploy |

`DATABASE_URL`, Prisma, Neon e seed DB non sono piu necessari per avviare l'app.

## Deploy

1. Importa il repository su Vercel.
2. Lascia root directory `./`.
3. Lascia che Vercel usi `vercel.json`.
4. Aggiungi le environment variables sopra.
5. Deploy.

Il build esegue:

```bash
npm run vercel-build
```

che installa le dipendenze frontend e genera `frontend/dist/`.

## Verifica

Apri:

- `/api/health` -> `{"ok":true}`
- `/` -> PWA Pasto

Per provare il proxy barcode:

```bash
curl -X POST https://TUO-DEPLOY.vercel.app/api/v1/barcode/lookup \
  -H "content-type: application/json" \
  -d "{\"ean\":\"8076809513692\"}"
```

## PWA su telefono

### iPhone

Apri l'URL in Safari, Condividi, Aggiungi a Home.

### Android

Apri l'URL in Chrome, menu, Installa app o Aggiungi a schermata Home.

## Note operative

- Lo scanner camera richiede HTTPS o localhost e permesso camera del browser.
- Se la camera non e disponibile, usa l'inserimento manuale EAN.
- I dati sono locali al dispositivo: cancellare dati sito/browser rimuove storico, preferiti e scansioni.
- Open Food Facts puo restituire dati incompleti; la UI mostra avvisi invece di inventare valutazioni.
