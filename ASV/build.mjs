// ASV Static Verse Site Generator — Living Word Bibles
// Output: ./dist/asv/<book>/<chapter>/<verse>/index.html + sitemap.xml + robots.txt

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----- Config -----
const BRAND = "Living Word Bibles";
const TITLE = "The Holy Bible: American Standard Version";
const LOGO_URL = "https://static1.squarespace.com/static/68d6b7d6d21f02432fd7397b/t/690209b3567af44aabfbdaca/1761741235124/LivingWordBibles01.png";

// For now, keep using the known-good JSON. After you create your LWB repo,
// switch this to your own jsDelivr path using @main (not @master).
const ASV_DATA_URL =
  "https://cdn.jsdelivr.net/gh/jadenzaleski/bible-translations@86d528c69b5bbcca9ce0dc0b17b037c1128c6651/ASV/ASV_bible.json";

// When live on the subdomain:
const SITE_ORIGIN = "https://asv.the-holy-bible.livingwordbibles.com";
const BASE_PATH = "/asv";

const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

const outDir = path.join(__dirname, "dist");

// ----- Helpers -----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const htmlEscape = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const slugifyBook = (b) => b.replace(/\s+/g, "-");
const urlFor = (book, chapter, verse) => `${BASE_PATH}/${slugifyBook(book)}/${chapter}/${verse}/`;

function normalizeBook(v) {
  if (typeof v === "number") return BOOKS[Math.max(1, Math.min(66, v)) - 1];
  const s = String(v).trim();
  const map = { "Gen":"Genesis","Ge":"Genesis","Gn":"Genesis","Song of Songs":"Song of Solomon","Canticles":"Song of Solomon","Ps":"Psalms","Prov":"Proverbs" };
  return map[s] || s;
}

function detectFields(sample) {
  const opts = {
    bk: ["book","book_name","name","title","b","book_id","bookid"],
    ch: ["chapter","chapter_num","c","chap","chap_num","number"],
    vs: ["verse","verse_num","v","num","id"],
    tx: ["text","content","verse_text","t","body"]
  };
  const pick = (arr) => arr.find((k) => k in sample) || null;
  const bk = pick(opts.bk), ch = pick(opts.ch), vs = pick(opts.vs), tx = pick(opts.tx);
  if (!bk || !ch || !vs || !tx) return null;
  return { bk, ch, vs, tx };
}

function flattenBibleJSON(input) {
  if (Array.isArray(input)) {
    const f = detectFields(input[0]); 
    if (f) return input.map(r => ({ book: normalizeBook(r[f.bk]), chapter: +r[f.ch], verse: +r[f.vs], text: String(r[f.tx]).trim() }));
  }
  if (input && Array.isArray(input.books)) {
    const out = [];
    input.books.forEach((b, bi) => {
      const bname = normalizeBook(b.name || b.title || BOOKS[bi] || "");
      (b.chapters || b.Chapters || []).forEach((c, ci) => {
        const cnum = +(c.chapter || c.number || ci + 1);
        (c.verses || c.Verses || []).forEach((v, vi) => {
          if (typeof v === "string") out.push({ book: bname, chapter: cnum, verse: vi + 1, text: v });
          else if (v) out.push({ book: bname, chapter: cnum, verse: +(v.verse || v.number || vi + 1), text: String(v.text || v.content || v.verse_text || "").trim() });
        });
      });
    });
    return out;
  }
  if (input && typeof input === "object") {
    const out = [];
    for (const bk of Object.keys(input)) {
      const bname = normalizeBook(bk);
      const chs = input[bk];
      if (!chs || typeof chs !== "object") continue;
      for (const ch of Object.keys(chs)) {
        const cnum = +ch;
        const vobj = chs[ch];
        if (typeof vobj !== "object") continue;
        for (const vs of Object.keys(vobj)) out.push({ book: bname, chapter: cnum, verse: +vs, text: String(vobj[vs]).trim() });
      }
    }
    if (out.length) return out;
  }
  throw new Error("Unsupported JSON shape");
}

async function fetchJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      if (i === 2) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

function templatePage({ book, chapter, verse, text }) {
  const ref = `${book} ${chapter}:${verse}`;
  const canonical = `${SITE_ORIGIN}${urlFor(book, chapter, verse)}`;
  const title = `${ref} — ${TITLE}`;
  const share = canonical;
  const verseEsc = htmlEscape(text);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <link rel="canonical" href="${canonical}"/>
  <meta name="description" content="${ref} — ${verseEsc}">
  <meta property="og:title" content="${title}"><meta property="og:description" content="${verseEsc}">
  <meta property="og:type" content="article"><meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${BRAND}"><meta name="twitter:card" content="summary_large_image">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap');
    :root{ --border:#e6e6e6; --ink:#111; --muted:#737373; }
    body{ font-family:'EB Garamond',serif; color:var(--ink); margin:0; }
    .wrap{ max-width:880px; margin:32px auto; padding:16px; }
    header{ display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; }
    header img{ height:96px; border-radius:12px; }
    h1{ font-size:28px; margin:8px 0 0; }
    .verse{ font-size:22px; line-height:1.65; margin-top:12px; padding:16px; border:1px solid var(--border); border-radius:14px; }
    .vnum{ font-size:.7em; vertical-align:super; margin-right:6px; color:var(--muted); }
    nav{ display:flex; gap:8px; margin-top:12px; }
    a.btn{ border:1px solid var(--border); border-radius:10px; padding:8px 12px; text-decoration:none; color:inherit; }
    .bar{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    .chip{ background:#f5f5f5; border:1px solid var(--border); border-radius:999px; padding:8px 12px; font-size:13px; text-decoration:none; color:inherit; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <img src="${LOGO_URL}" alt="${BRAND}">
      <div>${BRAND}</div>
      <h1>${TITLE}</h1>
      <div>${ref}</div>
    </header>
    <div class="verse"><span class="vnum">${verse}</span>${verseEsc}</div>
    <div class="bar">
      <a class="chip" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share)}" target="_blank" rel="noopener">Facebook</a>
      <a class="chip" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(share)}&text=${encodeURIComponent(ref)}" target="_blank" rel="noopener">X</a>
      <a class="chip" href="mailto:?subject=${encodeURIComponent(ref)}&body=${encodeURIComponent(verseEsc + "\n" + share)}">Email</a>
      <a class="chip" href="${canonical}">Permalink</a>
    </div>
    <nav>
      <a class="btn" href="${urlFor(book, chapter, Math.max(1, verse - 1))}">⟨ Prev</a>
      <a class="btn" href="${urlFor(book, chapter, verse + 1)}">Next ⟩</a>
    </nav>
  </div>
</body>
</html>`;
}

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function writeFileSafe(p, data) { await ensureDir(path.dirname(p)); await fs.writeFile(p, data); }

async function build() {
  console.log("Fetching ASV data…");
  const raw = await fetchJson(ASV_DATA_URL);
  const rows = flattenBibleJSON(raw);

  console.log("Verses:", rows.length);
  // Index by book/chapter for iteration
  const byBC = new Map();
  const maxChapter = new Map();
  const maxVerse = new Map();
  const key = (b,c) => b + "|" + c;

  for (const { book, chapter, verse, text } of rows) {
    if (!BOOKS.includes(book)) continue;
    const k = key(book, chapter);
    if (!byBC.has(k)) byBC.set(k, []);
    byBC.get(k).push({ v: verse, t: text });
    maxChapter.set(book, Math.max(maxChapter.get(book) || 0, chapter));
    maxVerse.set(k, Math.max(maxVerse.get(k) || 0, verse));
  }
  for (const [k, arr] of byBC.entries()) arr.sort((a, b) => a.v - b.v);

  console.log("Writing pages…");
  for (const book of BOOKS) {
    const mC = maxChapter.get(book) || 0;
    for (let c = 1; c <= mC; c++) {
      const list = byBC.get(key(book, c)) || [];
      for (const { v, t } of list) {
        const html = templatePage({ book, chapter: c, verse: v, text: t });
        const file = path.join(outDir, BASE_PATH, slugifyBook(book), String(c), String(v), "index.html");
        await writeFileSafe(file, html);
      }
    }
  }

  console.log("Writing sitemap…");
  const urls = [];
  for (const book of BOOKS) {
    const mC = maxChapter.get(book) || 0;
    for (let c = 1; c <= mC; c++) {
      const mV = maxVerse.get(key(book, c)) || 0;
      for (let v = 1; v <= mV; v++) urls.push(`${SITE_ORIGIN}${urlFor(book, c, v)}`);
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>\n`;
  await writeFileSafe(path.join(outDir, "sitemap.xml"), sitemap);

  console.log("Writing robots.txt…");
  const robots = `User-agent: *
Allow: /
Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
  await writeFileSafe(path.join(outDir, "robots.txt"), robots);

  console.log("Root splash → Genesis 1:1");
  const root = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${BASE_PATH}/Genesis/1/1/"><title>${TITLE}</title>`;
  await writeFileSafe(path.join(outDir, "index.html"), root);

  console.log("Done →", outDir);
}

build().catch((e) => { console.error(e); process.exit(1); });
