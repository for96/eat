// build.mjs — pipeline frontend.
//
// Strategia (stessa di Symplex):
// 1. Concatena tutti i file src/ nell'ordine corretto (vedi SRC_ORDER).
// 2. Bundle JSX via esbuild → bundle.js (React resta esterno, ZXing viene incluso).
// 3. Copia index.html → dist/ + asset statici (manifest, sw.js, icone).
// 4. Genera icone PNG da SVG (con sharp) se mancano.
//
// Flags:
//   --prod   minify + cache-bust
//   --serve  dev server (esbuild) su :5173 con livereload

import esbuild from "esbuild";
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const PUBLIC = path.join(ROOT, "public");
const DIST = path.join(ROOT, "dist");

const PROD = process.argv.includes("--prod");
const SERVE = process.argv.includes("--serve");

// Ordine di caricamento — replica quello del vecchio index.html del prototype.
// tweaks-panel definisce useTweaks/TweaksPanel; data/api le utility; icons l'<Icon>;
// primitives usa Icon; addmeal/screens usano tutto; main monta l'App.
const SRC_ORDER = [
  "tweaks-panel.jsx",
  "seed-data.js",
  "data.js",
  "api.js",
  "icons.jsx",
  "primitives.jsx",
  "addmeal.jsx",
  "screens.jsx",
  "main.jsx",
];

async function concatSources() {
  const parts = await Promise.all(
    SRC_ORDER.map(async (name) => {
      const content = await readFile(path.join(SRC, name), "utf-8");
      return `// ───── ${name} ─────\n${content}`;
    }),
  );
  return [
    'import * as ZXingBrowser from "@zxing/browser";',
    "window.ZXingBrowser = ZXingBrowser;",
    ...parts,
  ].join("\n\n");
}

async function bundle() {
  const source = await concatSources();
  const result = await esbuild.build({
    stdin: {
      contents: source,
      resolveDir: ROOT,
      loader: "jsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    target: "es2020",
    minify: PROD,
    sourcemap: !PROD,
    legalComments: "none",
  });
  const js = result.outputFiles.find((file) => !file.path.endsWith(".map"));
  const map = result.outputFiles.find((file) => file.path.endsWith(".js.map"));
  return {
    code: js?.text ?? "",
    map: map?.text,
  };
}

async function ensureIcons() {
  const targets = [
    { file: "icon-192.png", size: 192 },
    { file: "icon-512.png", size: 512 },
    { file: "apple-touch-icon.png", size: 180 },
  ];
  const missing = targets.filter((t) => !existsSync(path.join(PUBLIC, t.file)));
  if (missing.length === 0) return;

  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.warn(
      "  ! sharp non installato: salto la generazione icone. Esegui `npm install` in frontend/ poi rilancia.",
    );
    return;
  }

  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="112" fill="#F2ECDF"/>
      <text x="256" y="362" text-anchor="middle"
            font-family="Newsreader, Georgia, 'Times New Roman', serif"
            font-size="360" font-style="italic" font-weight="400" fill="#C25A3A">P</text>
    </svg>
  `);
  for (const t of missing) {
    await sharp(svg).resize(t.size, t.size).png().toFile(path.join(PUBLIC, t.file));
    console.log(`  generated public/${t.file}`);
  }
}

async function copyPublicFiles() {
  if (!existsSync(PUBLIC)) return;
  const items = await readdir(PUBLIC);
  for (const item of items) {
    const src = path.join(PUBLIC, item);
    const dst = path.join(DIST, item);
    const s = await stat(src);
    if (s.isFile()) await copyFile(src, dst);
  }
}

async function copyIndexHtml(bundleHash) {
  let html = await readFile(path.join(ROOT, "index.html"), "utf-8");
  // Cache-bust: aggiungi un hash al nome del bundle in prod.
  if (PROD && bundleHash) {
    html = html.replace("/bundle.js", `/bundle.${bundleHash}.js`);
  }
  await writeFile(path.join(DIST, "index.html"), html);
}

async function build() {
  console.log(PROD ? "🏗  Building (prod)…" : "🛠  Building (dev)…");
  await mkdir(DIST, { recursive: true });
  await ensureIcons();

  const result = await bundle();

  let hash = "";
  if (PROD) {
    // Hash semplice basato sul contenuto, primi 8 char.
    const { createHash } = await import("node:crypto");
    hash = createHash("sha1").update(result.code).digest("hex").slice(0, 8);
  }
  const bundleName = PROD ? `bundle.${hash}.js` : "bundle.js";

  await writeFile(path.join(DIST, bundleName), result.code);
  if (result.map) await writeFile(path.join(DIST, `${bundleName}.map`), result.map);

  await copyPublicFiles();
  await copyIndexHtml(hash);

  console.log(`✓ dist/${bundleName}  (${(result.code.length / 1024).toFixed(1)} KB)`);
}

async function serve() {
  // esbuild non ha proxy built-in: per dev locale assumiamo il backend su :3000.
  // api.js auto-rileva la porta e punta a localhost:3000 se la frontend gira su altra porta.
  await build();
  const ctx = await esbuild.context({
    stdin: { contents: "", loader: "js" }, // placeholder, useremo solo il watch
  });
  // Rebuild ogni 1s se i file cambiano (fallback semplice, niente HMR).
  const { watch } = await import("node:fs");
  const watchers = [];
  let timer;
  for (const name of SRC_ORDER) {
    watchers.push(
      watch(path.join(SRC, name), () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            const r = await bundle();
            await writeFile(path.join(DIST, "bundle.js"), r.code);
            console.log("↻ rebuilt", new Date().toLocaleTimeString());
          } catch (e) {
            console.error("✗ build error:", e.message);
          }
        }, 100);
      }),
    );
  }
  // index.html watcher
  watchers.push(
    watch(path.join(ROOT, "index.html"), async () => {
      try {
        await copyIndexHtml("");
        console.log("↻ index.html copied");
      } catch {}
    }),
  );

  // Static server via esbuild
  const server = await ctx.serve({ servedir: DIST, port: 5173, host: "127.0.0.1" });
  console.log(`\n🚀 dev server: http://${server.host}:${server.port}`);
  console.log("   (backend atteso su http://localhost:3000)\n");
}

if (SERVE) {
  await serve();
} else {
  await build();
}
