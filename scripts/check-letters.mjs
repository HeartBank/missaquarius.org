#!/usr/bin/env node
//
// The presence guard for the Letters to Miss Aquarius.
//
//   node scripts/check-letters.mjs          verify every letters/*.html
//
// WHY THIS EXISTS. The letters are the founder's own hand — the one public genre
// where his voice is load-bearing — so they have no review lane and no
// draft/published status; the corpus checkers' status rule would misdescribe
// them. What they DO carry is a set of properties every letter must have for
// the estate's provenance and discovery legs to see it, and on 2026-09-05 all
// five letters had all of them. A guard here therefore protects the SIXTH
// letter: a new file dropped into letters/ with a property missing is invisible
// to every instrument that reads what was produced (verify-proofs reads
// proofs; a never-stamped letter has none to read). Added at the founder's word
// (2026-09-05: "add the letters checker per your recommendation").
//
// THE EIGHT PROPERTIES, per letter:
//   1. the scaffolding banner, OR the founder-revised marker — exactly one (below)
//   2. <link rel="canonical"> pointing at this file's own URL
//   3. JSON-LD with "datePublished" and a "url" matching the canonical
//   4. the CC0 dedication link (creativecommons.org/publicdomain/zero/1.0/)
//   5. an OpenTimestamps proof sibling (<file>.ots)
//   6. an entry in sitemap.xml
//   7. a link from letters/index.html
//   8. a line in snapshot-urls.txt (the Internet Archive leg)
//
// ⭐ THE BANNER IS A STATE, NOT A FIXTURE. Each letter's banner says "this banner
// comes down when the letter does" — it marks connective prose that is still
// scaffold awaiting the founder's revision in his own voice. So the rule cannot
// be "banner present": that would block the exact transition the discipline
// exists for. Nor can it be nothing: a letter with no banner is then
// indistinguishable from one whose banner was dropped by accident. The property
// form is EXCLUSIVE-OR — a letter carries the scaffold banner, or it carries
//     <meta name="founder-revised" content="YYYY-MM-DD" />
// in its <head>, never both and never neither. Taking the banner down and adding
// the marker is one edit, made by the founder, in the same commit.
//
// House rules: node built-ins only, assertions that name the fix, non-zero exit.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ORIGIN = "https://missaquarius.org";
const LETTERS = join(ROOT, "letters");

const die = (msg) => {
    console.error(`check-letters: ${msg}`);
    process.exit(1);
};

if (!existsSync(LETTERS)) die("no letters/ directory — is this running from the repo root?");
const letters = readdirSync(LETTERS)
    .filter((f) => f.endsWith(".html") && f !== "index.html")
    .sort();
if (letters.length === 0) die("no letters found under letters/");

const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
const index = readFileSync(join(LETTERS, "index.html"), "utf8");
const snapshot = existsSync(join(ROOT, "snapshot-urls.txt")) ? readFileSync(join(ROOT, "snapshot-urls.txt"), "utf8") : "";

const problems = [];
const states = { scaffold: 0, revised: 0 };

for (const file of letters) {
    const rel = `letters/${file}`;
    const url = `${ORIGIN}/${rel}`;
    const html = readFileSync(join(LETTERS, file), "utf8");
    const head = html.slice(0, html.indexOf("</head>") === -1 ? html.length : html.indexOf("</head>"));
    const fail = (what, fix) => problems.push(`${rel}: ${what}\n      fix: ${fix}`);

    // 1. Scaffold banner XOR founder-revised marker.
    const banner = /<(div|aside|section)\b[^>]*class="[^"]*\bscaffold-banner\b[^"]*"/.test(html);
    const revised = head.match(/<meta\s+name="founder-revised"\s+content="(\d{4}-\d{2}-\d{2})"\s*\/?>/);
    if (banner && revised) {
        fail(`carries BOTH the scaffold banner and founder-revised=${revised[1]}.`,
            "a letter is scaffold or it is his — remove the banner (the letter is revised) or the meta (it is not).");
    } else if (!banner && !revised) {
        fail("carries neither the scaffold banner nor the founder-revised marker.",
            'while the connective prose is scaffold, keep <div class="scaffold-banner">; when the founder has\n' +
            '           revised it in his own voice, take the banner down AND add\n' +
            '           <meta name="founder-revised" content="YYYY-MM-DD" /> to <head>, in the same commit.');
    } else {
        states[banner ? "scaffold" : "revised"]++;
    }

    // 2. Canonical, pointing at itself.
    const canon = head.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
    if (!canon) fail("has no <link rel=\"canonical\">.", `add <link rel="canonical" href="${url}" /> to <head>.`);
    else if (canon[1] !== url) fail(`canonical points at ${canon[1]}, not at itself.`, `set href="${url}".`);

    // 3. JSON-LD: a datePublished and a url that matches.
    const ld = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ld) fail("has no JSON-LD block.", 'add the <script type="application/ld+json"> Article block the other letters carry.');
    else {
        let data = null;
        try { data = JSON.parse(ld[1]); } catch (e) { fail(`JSON-LD does not parse (${e.message}).`, "fix the JSON."); }
        if (data) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(data.datePublished || "")) fail("JSON-LD has no datePublished (YYYY-MM-DD).", 'add "datePublished".');
            if (data.url !== url) fail(`JSON-LD url is ${data.url ?? "missing"}, not ${url}.`, `set "url": "${url}".`);
        }
    }

    // 4. The CC0 dedication.
    if (!/creativecommons\.org\/publicdomain\/zero\/1\.0\//.test(html))
        fail("carries no CC0 dedication link.", "add the CC0 1.0 Universal statement with its creativecommons.org link, as the other letters do.");

    // 5. The proof sibling — the property no proof-reading instrument can check.
    if (!existsSync(join(LETTERS, `${file}.ots`)))
        fail("has no OpenTimestamps proof (letters/<file>.ots).", "run the estate's stamp-new.sh (it stamps only files with no proof), then commit the .ots.");

    // 6–8. The three listings.
    if (!sitemap.includes(`<loc>${url}</loc>`)) fail("is not in sitemap.xml.", `add <url><loc>${url}</loc>…</url>.`);
    if (!new RegExp(`href="(\\./)?${file.replace(/\./g, "\\.")}"`).test(index)) fail("is not linked from letters/index.html.", `add the entry.`);
    if (!snapshot.split("\n").includes(url)) fail("is not in snapshot-urls.txt.", `add the line ${url} (the Internet Archive leg reads it).`);
}

if (problems.length) {
    console.error("check-letters: FAILED\n");
    for (const p of problems) console.error(`  - ${p}\n`);
    process.exit(1);
}
console.log(`check-letters: ${letters.length} letters — ${states.scaffold} scaffold-bannered · ${states.revised} founder-revised; canonical, JSON-LD, CC0, .ots, sitemap, index and snapshot present on all`);
