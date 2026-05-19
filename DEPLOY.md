# Deploy di Pasto su Vercel

Guida step-by-step per pubblicare Pasto su internet, accessibile anche dal telefono.

**Architettura finale**:
- Frontend (React + PWA) → Vercel CDN
- Backend (Fastify) → Vercel Serverless Functions sotto `/api/*`
- Database → PostgreSQL su **Neon** (free tier 0.5 GB, no carta di credito)

Tutto sotto lo stesso dominio `pasto-xxx.vercel.app` (niente CORS issues).

---

## Prerequisiti

- Account **GitHub** (https://github.com/signup) — gratis
- Account **Vercel** (https://vercel.com/signup) — gratis, login con GitHub
- Account **Neon** (https://console.neon.tech/signup) — gratis, login con GitHub
- Node 20+ locale (già ce l'hai, se hai fatto girare il backend)

Tempo stimato: **15–25 minuti** la prima volta.

---

## 1. Crea il database su Neon

1. Vai su https://console.neon.tech/
2. Login con GitHub → **Create a new project**
3. Nome progetto: `pasto`
4. Region: scegli quella più vicina (`Europe (Frankfurt)` se sei in Italia)
5. Postgres version: lascia default (16)
6. Clicca **Create project**
7. Nella pagina che si apre, copia la **Connection string** che parte con `postgresql://...?sslmode=require`. Questa è il tuo `DATABASE_URL`.
   - Suggerimento: usa la versione **"Pooled connection"** (con `-pooler` nell'host) per Vercel serverless — gestisce meglio le connessioni a freddo.

Tienila pronta in una nota — la userai in 2 posti (locale e Vercel).

---

## 2. Prepara lo schema sul DB remoto (da locale)

Dal terminale, dentro `Desktop/pasto`:

```bash
# 1. Crea .env con la stringa Neon.
#    ⚠ NON usare `echo > .env` su Windows PowerShell: aggiunge virgolette
#    spurie e/o BOM UTF-16 che rompono Prisma. Apri invece il file con
#    Blocco Note (`notepad .env`) o VS Code e incolla questa SINGOLA riga:
#
#    DATABASE_URL="postgresql://...la-tua-stringa-neon..."
#
#    (oppure copia .env.example in .env e modificalo:  `copy .env.example .env`)

# 2. Genera il Prisma client + applica lo schema sul DB Neon
npm install
npm run db:push
# → output: "Your database is now in sync with your Prisma schema. Done in 3s"

# 3. Popola le 38 alimenti seed + utente default + 4 preferiti
npm run seed
# → output: "Seed completato — users=1, foods=38, favorites=4, goals=1"
```

A questo punto Neon ha lo schema + i dati seed. Si vede nella dashboard di Neon → Tables.

---

## 3. Pubblica il codice su GitHub

```bash
cd C:\Users\oltim\Desktop\pasto

git init
git add .
git commit -m "initial commit"
```

Poi su GitHub:
1. https://github.com/new
2. Repository name: `pasto`
3. Pubblico o privato — entrambi funzionano con Vercel free
4. **NON** spuntare README/`.gitignore`/license (già nostri)
5. Clicca **Create repository**

GitHub ti mostra i comandi `git remote add origin ...` — copiali ed eseguili:

```bash
git remote add origin https://github.com/TUO-USER/pasto.git
git branch -M main
git push -u origin main
```

---

## 4. Connetti Vercel al repo

1. Vai su https://vercel.com/new
2. **Import Git Repository** → seleziona il repo `pasto` (se non lo vedi, clicca "Adjust GitHub App Permissions" per dargli accesso)
3. Nella schermata di setup:
   - **Project Name**: `pasto` (o quello che vuoi — diventa il sottodominio)
   - **Framework Preset**: lascia "Other"
   - **Root Directory**: lascia `./` (la root del repo)
   - **Build Command**: lascia vuoto (usa quello in `vercel.json`)
   - **Output Directory**: lascia vuoto (idem)
4. Espandi **Environment Variables** e aggiungi:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://...` (la stessa stringa Neon usata sopra) |
| `CORS_ORIGIN` | `*` (oppure l'URL finale `https://pasto-xxx.vercel.app` quando lo saprai) |
| `LLM_PROVIDER` | `stub` |
| `OFF_USER_AGENT` | `Pasto/0.1 (tuamail@example.com)` (metti la tua mail per cortesia con OpenFoodFacts) |
| `DEFAULT_USER_ID` | `default-user` |

5. Clicca **Deploy**

Vercel:
- Clona il repo
- Esegue `npm install` (root + frontend)
- Esegue `vercel-build`: genera Prisma client, sincronizza schema (`db push`), builda il frontend
- Pubblica le serverless functions (`/api/*`) e i file statici di `frontend/dist`

Dopo ~2 minuti vedi "Your project is ready 🎉" con l'URL `https://pasto-xxx.vercel.app`.

---

## 5. Verifica

Apri nel browser:

- `https://pasto-xxx.vercel.app/health` → `{"ok":true}` (potrebbe metterci 1–2s la prima volta = cold start)
- `https://pasto-xxx.vercel.app/api/v1/me` → `{"user":{...}}`
- `https://pasto-xxx.vercel.app/` → la webapp di Pasto

Aggiungi un pasto, ricarica → ancora lì → ✓ persistenza funziona.

Se vedi "Backend non raggiungibile":
- Apri DevTools → Network → guarda la richiesta a `/api/v1/...`. Se è 500, vai su Vercel Dashboard → Functions → Logs e leggi l'errore (di solito DATABASE_URL sbagliato).

---

## 6. Installa la PWA sul telefono

### iPhone (Safari)
1. Apri `https://pasto-xxx.vercel.app/` in **Safari** (non Chrome — su iOS solo Safari installa PWA)
2. Tocca il pulsante condividi (quadrato con freccia)
3. Scorri e tocca **"Aggiungi a Home"**
4. Conferma → icona "Pasto" sulla home, apre a tutto schermo

### Android (Chrome)
1. Apri l'URL in Chrome
2. Menu (⋮) → **"Installa app"** o **"Aggiungi a schermata Home"**
3. Conferma

---

## Aggiornamenti successivi

Ogni `git push` su `main` → Vercel re-deploy automatico (~1 minuto).

Se modifichi lo schema Prisma:
- Vercel esegue `prisma db push` durante il build. Se la modifica è additiva (nuova colonna nullable, nuova tabella) → applicato automaticamente.
- Se la modifica è destruttiva (drop colonna, cambio tipo) → il build fallisce. Risolvi in locale con `npm run db:push -- --accept-data-loss` puntando a Neon, poi rideploya.

Per aggiornare la PWA sul telefono dopo un deploy nuovo: di solito basta riaprire l'app. Se non vede gli update, chiudila completamente e riaprila (in iOS: swipe up dall'app preview).

---

## Troubleshooting

**"Function exceeded timeout"** sui primi request:
- Cold start del serverless + connessione a Neon = a volte 5–10s. Sul piano Hobby c'è limite 10s. Se persiste:
  - Verifica che `DATABASE_URL` sia il **pooled** URL di Neon (host con `-pooler`)
  - Aggiungi `?pgbouncer=true&connect_timeout=10` alla connection string

**"Internal Server Error" generico**:
- Dashboard Vercel → tab **Logs** → guarda lo stack trace
- Se manca `DATABASE_URL`: setta env var e ridepoya
- Se è "Engine query type mismatch": riesegui `npm run db:push` in locale

**Foto/barcode non funziona**:
- I body multipart sono delicati su serverless. Se l'upload immagine fallisce, prova prima con `prompt()` per barcode (già il fallback). La camera vera richiede HTTPS (Vercel ce l'ha di default ✓).

**Voglio passare da Vercel Postgres a Neon (o viceversa)**:
- Sono entrambi Postgres standard → basta cambiare `DATABASE_URL` su Vercel + rigirare `npm run db:push` + `npm run seed`.

---

## Cosa fa il deploy in pratica (per capire cosa sta succedendo)

- `vercel.json` dice a Vercel: builda con `npm run vercel-build`, servi `frontend/dist/` come statico, `api/*.ts` come funzioni
- `api/[...path].ts` cattura ogni `/api/*` request e la passa a Fastify (singola istanza, cacheata tra chiamate)
- Fastify usa Prisma per parlare con Neon
- Frontend chiama `/api/v1/...` (relativo, stesso dominio → niente CORS)
- Service Worker (`sw.js`) cache-a HTML+JS+icone → primo avvio offline funziona
