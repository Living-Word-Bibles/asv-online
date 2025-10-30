// ASV Static Verse Site Generator — Living Word Bibles
// Output: ./dist/asv/<Book>/<Chapter>/<Verse>/index.html + sitemap.xml + robots.txt + 404.html + healthz.txt

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Config ----------
const BRAND = "Living Word Bibles";
const TITLE = "The Holy Bible: American Standard Version";
const LOGO_URL = "https://static1.squarespace.com/static/68d6b7d6d21f02432fd7397b/t/690209b3567af44aabfbdaca/1761741235124/LivingWordBibles01.png";
const IG_URL = "https://www.instagram.com/living.word.bibles/";

// Prefer local JSON; if absent, fall back to mirrors
const LOCAL_JSON = path.join(__dirname, "ASV", "ASV_bible.json");
const REMOTE_JSONS = [
  "https://cdn.jsdelivr.net/gh/Living-Word-Bibles/asv-online@main/ASV/ASV_bible.json",
  "https://cdn.jsdelivr.net/gh/jadenzaleski/bible-translations@86d528c69b5bbcca9ce0dc0b17b037c1128c6651/ASV/ASV_bible.json",
  "https://raw.githubusercontent.com/jadenzaleski/bible-translations/86d528c69b5bbcca9ce0dc0b17b037c1128c6651/ASV/ASV_bible.json",
  "https://cdn.statically.io/gh/jadenzaleski/bible-translations/86d528c69b5bbcca9ce0dc0b17b037c1128c6651/ASV/ASV_bible.json"
];

// Custom domain (no www)
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://asv.livingwordbibles.com";
const BASE_PATH = "/asv";

const BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah",
  "Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah",
  "Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum",
  "Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts",
  "Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews",
  "James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

// ---------- Helpers ----------
const outDir = path.join(__dirname, "dist");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHTML = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
const slugifyBook = (b) => b.replace(/\s+/g, "-");
const urlFor = (book, chapter, verse) => `${BASE_PATH}/${slugifyBook(book)}/${chapter}/${verse}/`;

function normalizeBook(v) {
  if (typeof v === "number") return BOOKS[Math.max(1, Math.min(66, v)) - 1];
  const s = String(v).trim();
  const map = {
    "gen":"Genesis","ge":"Genesis","gn":"Genesis",
    "ex":"Exodus","exod":"Exodus",
    "lev":"Leviticus","leviticus":"Leviticus",
    "num":"Numbers","nu":"Numbers","nm":"Numbers",
    "deut":"Deuteronomy","dt":"Deuteronomy",
    "jos":"Joshua","josh":"Joshua",
    "jdg":"Judges","judg":"Judges",
    "ru":"Ruth","rut":"Ruth",
    "1sa":"1 Samuel","1 sam":"1 Samuel","1sam":"1 Samuel",
    "2sa":"2 Samuel","2 sam":"2 Samuel","2sam":"2 Samuel",
    "1ki":"1 Kings","1kgs":"1 Kings","1 kgs":"1 Kings",
    "2ki":"2 Kings","2kgs":"2 Kings","2 kgs":"2 Kings",
    "1ch":"1 Chronicles","1 chr":"1 Chronicles","1chr":"1 Chronicles",
    "2ch":"2 Chronicles","2 chr":"2 Chronicles","2chr":"2 Chronicles",
    "ezr":"Ezra","neh":"Nehemiah","est":"Esther",
    "job":"Job","ps":"Psalms","psa":"Psalms","psalm":"Psalms","psalms":"Psalms",
    "prov":"Proverbs","prv":"Proverbs","pro":"Proverbs",
    "eccl":"Ecclesiastes","ecc":"Ecclesiastes","qohelet":"Ecclesiastes",
    "song":"Song of Solomon","song of songs":"Song of Solomon","canticles":"Song of Solomon","ss":"Song of Solomon",
    "isa":"Isaiah","jer":"Jeremiah","lam":"Lamentations","eze":"Ezekiel","ezek":"Ezekiel",
    "dan":"Daniel","hos":"Hosea","joe":"Joel","amo":"Amos","oba":"Obadiah","jon":"Jonah",
    "mic":"Micah","nah":"Nahum","hab":"Habakkuk","zep":"Zephaniah","hag":"Haggai","zec":"Zechariah","zech":"Zechariah","mal":"Malachi",
    "mat":"Matthew","matt":"Matthew","mk":"Mark","mrk":"Mark","lk":"Luke","luk":"Luke","jn":"John","jhn":"John",
    "act":"Acts","rom":"Romans",
    "1co":"1 Corinthians","1 cor":"1 Corinthians","1cor":"1 Corinthians",
    "2co":"2 Corinthians","2 cor":"2 Corinthians","2cor":"2 Corinthians",
    "gal":"Galatians","eph":"Ephesians","php":"Philippians","phil":"Philippians",
    "col":"Colossians","1th":"1 Thessalonians","1 thes":"1 Thessalonians","1thess":"1 Thessalonians",
    "2th":"2 Thessalonians","2 thes":"2 Thessalonians","2thess":"2 Thessalonians",
    "1ti":"1 Timothy","1 tim":"1 Timothy","1tim":"1 Timothy",
    "2ti":"2 Timothy","2 tim":"2 Timothy","2tim":"2 Timothy",
    "tit":"Titus","phm":"Philemon","philem":"Philemon",
    "heb":"Hebrews","jas":"James","jam":"James","james":"James",
    "1pe":"1 Peter","1 pet":"1 Peter","1pet":"1 Peter",
    "2pe":"2 Peter","2 pet":"2 Peter","2pet":"2 Peter",
    "1jn":"1 John","1 joh":"1 John","1john":"1 John",
    "2jn":"2 John","2 joh":"2 John","2john":"2 John",
    "3jn":"3 John","3 joh":"3 John","3john":"3 John",
    "jud":"Jude","rev":"Revelation","re":"Revelation","apoc":"Revelation"
  };
  const k = s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  return map[k] || s;
}

function detectFields(sample) {
  const opts = {
    bk:["book","book_name","name","title","b","book_id","bookid"],
    ch:["chapter","chapter_num","c","chap","chap_num","number"],
    vs:["verse","verse_num","v","num","id"],
    tx:["text","content","verse_text","t","body"]
  };
  const pick = (arr)=> arr.find(k => k in sample) || null;
  const bk=pick(opts.bk), ch=pick(opts.ch), vs=pick(opts.vs), tx=pick(opts.tx);
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
          if (typeof v === "string") out.push({ book:bname, chapter:cnum, verse:vi+1, text:v });
          else if (v) out.push({ book:bname, chapter:cnum, verse:+(v.verse || v.number || vi+1), text:String(v.text || v.content || v.verse_text || "").trim() });
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
        for (const vs of Object.keys(vobj)) out.push({ book:bname, chapter:cnum, verse:+vs, text:String(vobj[vs]).trim() });
      }
    }
    if (out.length) return out;
  }
  throw new Error("Unsupported JSON shape");
}

async function ensureDir(p){ await fs.mkdir(p,{recursive:true}); }
async function writeFileSafe(p,d){ await ensureDir(path.dirname(p)); await fs.writeFile(p,d); }

async function readLocalJSONOrNull() {
  try { return JSON.parse(await fs.readFile(LOCAL_JSON, "utf8")); }
  catch { return null; }
}

function withTimeout(promiseFactory, ms, label="fetch") {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return promiseFactory(ctrl.signal)
    .finally(() => clearTimeout(t))
    .catch((e) => {
      if (e.name === "AbortError") throw new Error(`${label} timed out after ${ms}ms`);
      throw e;
    });
}

async function fetchJsonAny(urls) {
  let lastErr;
  for (const u of urls) {
    try {
      const res = await withTimeout(sig => fetch(u, { cache:"no-store", signal:sig }), 20000, `fetch ${u}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} @ ${u}`);
      return await res.json();
    } catch (e) { lastErr = e; await sleep(400); }
  }
  throw lastErr || new Error("All ASV sources failed");
}

// ---------- Page template ----------
function svg(icon){
  // minimal, inline SVG icons
  const base = {
    fb:  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.8V12h2.6V9.8c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>',
    ig:  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.8-3.3a1 1 0 1 1-1.4 1.4 1 1 0 0 1 1.4-1.4z"/></svg>',
    x:   '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 3h4.6l5 6.8L18.8 3H21l-7 9.2L21 21h-4.6l-5-6.8L5.2 21H3l7-9.2z"/></svg>',
    in:  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 8h2v13H3zM9 8h2v2h.1A2.2 2.2 0 0 1 13 8c2.3 0 3 1.5 3 3.6V21h-2v-7c0-1.2 0-2.7-1.7-2.7S10 12.7 10 14v7H8V8z"/></svg>',
    mail:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5z"/></svg>',
    copy:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 7h9a2 2 0 0 1 2 2v9h-2V9H8z"/><path d="M5 5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>'
  };
  return base[icon] || "";
}

function templatePage({ book, chapter, verse, text }) {
  const ref = `${book} ${chapter}:${verse}`;
  const canonical = `${SITE_ORIGIN}${urlFor(book, chapter, verse)}`;
  const title = `${ref} — ${TITLE}`;
  const verseEsc = escapeHTML(text);

  // Build HTML
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
    :root{ --border:#e6e6e6; --ink:#111; --muted:#737373; --bg:#fff; --chip:#f5f5f5; --brand:#111; }
    *{ box-sizing:border-box }
    body{ font-family:'EB Garamond',serif; color:var(--ink); background:var(--bg); margin:0; }
    .wrap{ max-width:920px; margin:24px auto; padding:16px; }
    header{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .brand{ display:flex; align-items:center; gap:12px; }
    .brand img{ height:80px; border-radius:12px; }
    .title{ text-align:center; width:100%; margin-top:8px; }
    h1{ font-size:28px; margin:8px 0 0 }
    .sub{ color:var(--muted); font-size:14px; }
    .pill{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--border); border-radius:999px; text-decoration:none; color:inherit; }
    .toolbar{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; justify-content:center; }
    .searchbar{ display:flex; gap:8px; justify-content:center; margin-top:12px; }
    .searchbar input{ padding:10px 12px; border:1px solid var(--border); border-radius:12px; min-width:260px; font-size:16px; }
    .searchbar button{ padding:10px 14px; border:1px solid var(--border); border-radius:12px; background:#fafafa; cursor:pointer; }
    .verse{ font-size:22px; line-height:1.65; margin-top:16px; padding:16px; border:1px solid var(--border); border-radius:14px; }
    .vnum{ font-size:.7em; vertical-align:super; margin-right:6px; color:var(--muted); }
    nav.nav{ display:flex; gap:8px; margin-top:14px; justify-content:center; flex-wrap:wrap; }
    a.btn{ border:1px solid var(--border); border-radius:10px; padding:8px 12px; text-decoration:none; color:inherit; }
    .share{ display:flex; gap:8px; margin-top:14px; justify-content:center; flex-wrap:wrap; }
    .chip{ background:var(--chip); border:1px solid var(--border); border-radius:999px; padding:8px 12px; font-size:14px; text-decoration:none; color:inherit; display:inline-flex; align-items:center; gap:6px; }
    footer{ margin:40px 0 16px; text-align:center; color:var(--muted); font-size:14px; }
    footer a{ color:inherit; }
    .copied{ font-size:12px; color:var(--muted); margin-top:4px; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <img src="${LOGO_URL}" alt="${BRAND}">
        <a class="pill" href="https://www.the-holy-bible.online" rel="noopener">The Holy Bible</a>
      </div>
      <div class="title">
        <h1>${TITLE}</h1>
        <div class="sub">${ref}</div>
      </div>
    </header>

    <div class="searchbar">
      <input id="refInput" list="bookList" placeholder="Search reference (e.g., John 3:16)" aria-label="Search reference"/>
      <datalist id="bookList">
        ${BOOKS.map(b => `<option value="${b}">`).join("")}
      </datalist>
      <button id="refGo" type="button">Go</button>
    </div>

    <div class="verse"><span class="vnum">${verse}</span>${verseEsc}</div>

    <div class="share">
      <a class="chip" id="shareFB" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">${svg("fb")}<span>Facebook</span></a>
      <a class="chip" id="shareIG" href="${IG_URL}" target="_blank" rel="noopener">${svg("ig")}<span>Instagram</span></a>
      <a class="chip" id="shareX"  href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(ref)}" target="_blank" rel="noopener">${svg("x")}<span>X</span></a>
      <a class="chip" id="shareIN" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">${svg("in")}<span>LinkedIn</span></a>
      <a class="chip" id="shareMail" href="mailto:?subject=${encodeURIComponent(ref)}&body=${encodeURIComponent(verseEsc + "\\n" + canonical)}">${svg("mail")}<span>Email</span></a>
      <button class="chip" id="copyBtn" type="button">${svg("copy")}<span>Copy</span></button>
    </div>
    <div id="copyState" class="copied" hidden>Copied!</div>

    <nav class="nav">
      <a class="btn" href="${urlFor(book, chapter, Math.max(1, verse - 1))}">⟨ Prev</a>
      <a class="btn" href="${urlFor(book, chapter, verse + 1)}">Next ⟩</a>
    </nav>

    <footer>
      Copyright © 2025 | Living Word Bibles | <a href="https://www.livingwordbibles.com" rel="noopener">www.livingwordbibles.com</a>
    </footer>
  </div>

<script>
  (function(){
    const BOOKS = ${JSON.stringify(BOOKS)};
    const BASE_PATH = ${JSON.stringify(BASE_PATH)};
    const slugifyBook = (b) => b.replace(/\\s+/g, "-");
    function norm(s){ return s.toLowerCase().replace(/\\./g,"").replace(/\\s+/g," ").trim(); }
    function normalizeBook(v){
      const map = ${JSON.stringify(Object.fromEntries(
        // reuse the mapping in JS (lowercased keys only)
        Object.entries({
          "gen":"Genesis","ge":"Genesis","gn":"Genesis","ex":"Exodus","exod":"Exodus","lev":"Leviticus","leviticus":"Leviticus","num":"Numbers","nu":"Numbers","nm":"Numbers","deut":"Deuteronomy","dt":"Deuteronomy","jos":"Joshua","josh":"Joshua","jdg":"Judges","judg":"Judges","ru":"Ruth","rut":"Ruth","1sa":"1 Samuel","1 sam":"1 Samuel","1sam":"1 Samuel","2sa":"2 Samuel","2 sam":"2 Samuel","2sam":"2 Samuel","1ki":"1 Kings","1kgs":"1 Kings","1 kgs":"1 Kings","2ki":"2 Kings","2kgs":"2 Kings","2 kgs":"2 Kings","1ch":"1 Chronicles","1 chr":"1 Chronicles","1chr":"1 Chronicles","2ch":"2 Chronicles","2 chr":"2 Chronicles","2chr":"2 Chronicles","ezr":"Ezra","neh":"Nehemiah","est":"Esther","job":"Job","ps":"Psalms","psa":"Psalms","psalm":"Psalms","psalms":"Psalms","prov":"Proverbs","prv":"Proverbs","pro":"Proverbs","eccl":"Ecclesiastes","ecc":"Ecclesiastes","qohelet":"Ecclesiastes","song":"Song of Solomon","song of songs":"Song of Solomon","canticles":"Song of Solomon","ss":"Song of Solomon","isa":"Isaiah","jer":"Jeremiah","lam":"Lamentations","eze":"Ezekiel","ezek":"Ezekiel","dan":"Daniel","hos":"Hosea","joe":"Joel","amo":"Amos","oba":"Obadiah","jon":"Jonah","mic":"Micah","nah":"Nahum","hab":"Habakkuk","zep":"Zephaniah","hag":"Haggai","zec":"Zechariah","zech":"Zechariah","mal":"Malachi","mat":"Matthew","matt":"Matthew","mk":"Mark","mrk":"Mark","lk":"Luke","luk":"Luke","jn":"John","jhn":"John","act":"Acts","rom":"Romans","1co":"1 Corinthians","1 cor":"1 Corinthians","1cor":"1 Corinthians","2co":"2 Corinthians","2 cor":"2 Corinthians","2cor":"2 Corinthians","gal":"Galatians","eph":"Ephesians","php":"Philippians","phil":"Philippians","col":"Colossians","1th":"1 Thessalonians","1 thes":"1 Thessalonians","1thess":"1 Thessalonians","2th":"2 Thessalonians","2 thes":"2 Thessalonians","2thess":"2 Thessalonians","1ti":"1 Timothy","1 tim":"1 Timothy","1tim":"1 Timothy","2ti":"2 Timothy","2 tim":"2 Timothy","2tim":"2 Timothy","tit":"Titus","phm":"Philemon","philem":"Philemon","heb":"Hebrews","jas":"James","jam":"James","james":"James","1pe":"1 Peter","1 pet":"1 Peter","1pet":"1 Peter","2pe":"2 Peter","2 pet":"2 Peter","2pet":"2 Peter","1jn":"1 John","1 joh":"1 John","1john":"1 John","2jn":"2 John","2 joh":"2 John","2john":"2 John","3jn":"3 John","3 joh":"3 John","3john":"3 John","jud":"Jude","rev":"Revelation","re":"Revelation","apoc":"Revelation"
        }).map(([k,v]) => [k.toLowerCase(), v])
      ))};
      const s = norm(v);
      if (map[s]) return map[s];
      // Try exact book name
      const exact = BOOKS.find(b => norm(b) === s);
      if (exact) return exact;
      // Try prefix
      const pref = BOOKS.find(b => norm(b).startsWith(s));
      return pref || v;
    }

    function parseRef(s){
      const t = norm(s);
      if (!t) return null;
      // Split "Book chap:verse" or "Book chap"
      const m = t.match(/^(.*?)[\\s]+(\\d+)(?::(\\d+))?$/);
      if (!m) return null;
      const book = normalizeBook(m[1]);
      const chapter = parseInt(m[2],10);
      const verse = m[3]? parseInt(m[3],10) : 1;
      if (!BOOKS.includes(book) || !chapter || chapter<1 || verse<1) return null;
      return { book, chapter, verse };
    }

    document.getElementById('refGo').addEventListener('click', () => {
      const raw = document.getElementById('refInput').value;
      const ref = parseRef(raw);
      if (!ref) { alert('Enter a reference like "John 3:16".'); return; }
      const href = BASE_PATH + '/' + slugifyBook(ref.book) + '/' + ref.chapter + '/' + ref.verse + '/';
      window.location.href = href;
    });
    document.getElementById('refInput').addEventListener('keydown',(e)=>{
      if (e.key === 'Enter') document.getElementById('refGo').click();
    });

    // Copy button
    const copyBtn = document.getElementById('copyBtn');
    const copied = document.getElementById('copyState');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(${JSON.stringify(canonical)});
        copied.hidden = false;
        setTimeout(()=> copied.hidden = true, 1600);
      } catch(e) {
        copied.textContent = 'Copy failed';
        copied.hidden = false;
        setTimeout(()=> copied.hidden = true, 1600);
      }
    });

    // Optional: use Web Share API on mobile
    const shareX = document.getElementById('shareX');
    if (navigator.share) {
      shareX.addEventListener('click', (ev) => {
        ev.preventDefault();
        navigator.share({ title: ${JSON.stringify(TITLE)}, text: ${JSON.stringify(ref)}, url: ${JSON.stringify(canonical)} }).catch(()=>{});
      }, { once:true });
    }
  })();
</script>

</body>
</html>`;
}

// ---------- Build ----------
function indexRows(rows) {
  const byBC = new Map(), maxChapter = new Map(), maxVerse = new Map();
  const key = (b,c)=> b+"|"+c;
  for (const { book, chapter, verse, text } of rows) {
    if (!BOOKS.includes(book)) continue;
    const k = key(book, chapter);
    if (!byBC.has(k)) byBC.set(k, []);
    byBC.get(k).push({ v:verse, t:text });
    maxChapter.set(book, Math.max(maxChapter.get(book)||0, chapter));
    maxVerse.set(k, Math.max(maxVerse.get(k)||0, verse));
  }
  for (const [k, arr] of byBC.entries()) arr.sort((a,b)=> a.v - b.v);
  return { byBC, maxChapter, maxVerse };
}

async function build() {
  console.log("Node:", process.versions.node);
  if (!globalThis.fetch) throw new Error("Need Node 18+ for fetch");

  console.log("Loading ASV JSON…");
  const local = await readLocalJSONOrNull();
  const raw = local ?? await fetchJsonAny(REMOTE_JSONS);

  console.log("Flattening…");
  const rows = flattenBibleJSON(raw);
  if (!rows?.length) throw new Error("ASV data parsed but contains 0 verses");
  console.log("Verses:", rows.length);

  const { byBC, maxChapter, maxVerse } = indexRows(rows);

  console.log("Writing verse pages…");
  for (const book of BOOKS) {
    const mC = maxChapter.get(book) || 0;
    if (!mC) continue;
    for (let c = 1; c <= mC; c++) {
      const list = byBC.get(book + "|" + c) || [];
      for (const { v, t } of list) {
        const html = templatePage({ book, chapter:c, verse:v, text:t });
        const file = path.join(outDir, BASE_PATH, slugifyBook(book), String(c), String(v), "index.html");
        await writeFileSafe(file, html);
      }
    }
  }

  console.log("sitemap.xml…");
  const urls = [];
  for (const book of BOOKS) {
    const mC = maxChapter.get(book) || 0;
    for (let c = 1; c <= mC; c++) {
      const mV = maxVerse.get(book + "|" + c) || 0;
      for (let v = 1; v <= mV; v++) urls.push(`${SITE_ORIGIN}${urlFor(book, c, v)}`);
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>\n`;
  await writeFileSafe(path.join(outDir, "sitemap.xml"), sitemap);

  console.log("robots.txt…");
  await writeFileSafe(path.join(outDir, "robots.txt"),
`User-agent: *
Allow: /
Sitemap: ${SITE_ORIGIN}/sitemap.xml
`);

  console.log("Root splash → Genesis 1:1");
  await writeFileSafe(path.join(outDir, "index.html"),
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${BASE_PATH}/Genesis/1/1/"><title>${TITLE}</title>`);

  console.log("404.html → redirect to Genesis 1:1");
  await writeFileSafe(path.join(outDir, "404.html"),
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${BASE_PATH}/Genesis/1/1/"><title>${TITLE}</title>`);

  console.log("healthz.txt");
  await writeFileSafe(path.join(outDir, "healthz.txt"), "ok\n");

  console.log("Done →", outDir);
}

build().catch((e)=>{ console.error("BUILD FAILED:", e?.stack || e); process.exit(1); });
