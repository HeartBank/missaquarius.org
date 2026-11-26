#!/usr/bin/env node
// The privacy policy: ONE source, legal/privacy.md, rendered into /privacy/ (and its Khmer twin, legal/privacy.km.md, into
// /km/privacy/). legal.333.eco publishes every version of legal/privacy.md, timestamped, and refuses one whose words this site
// does not serve. Founder 2026-11-24: "no page names Miss Aquarius as a party"; her sites get a privacy page naming whoever
// actually runs them. Founder 2026-11-25: fix the list.
// The Khmer is ours, marked as a draft, by the founder's 2026-11-24 ruling for this site ("translate all English texts to khmer").
//
//   node scripts/gen-legal.mjs           write privacy/index.html and km/privacy/index.html from legal/
//   node scripts/gen-legal.mjs --check   exit 1 on any problem below (CI runs it on every push; scripts/test-legal.mjs breaks each
//                                        rule on purpose and fails if the check does not see it)
//
// What --check holds, as properties of the tree rather than a reviewer's memory:
//   1. legal/privacy.md has the shape legal.333.eco's release accepts: "# Title", a blank line, "Draft of D Month YYYY."
//   2. both pages are exactly what this script renders (a hand edit or a stale render cannot ship)
//   3. every line of each markdown file is on its page, compared the way legal.333.eco compares a served page
//   4. the Khmer names the sha256 of the English it translates: an English edit leaves the Khmer visibly STALE, never silently
//   5. every page with a footer links to the policy in its own language (the five Letters excepted: timestamped, never edited)
//   6. the text never names Miss Aquarius as a party, never says "the estate", never "sign in"
//   7. the shared clauses, word for word (founder 2026-11-26, "approve all"; legal.333.eco §clause-rulings): each page's frame
//      carries the ruled draft banner and, beside it, the AI line, in the page's language; the English text's Changes section
//      opens with the ruled promise
//
// The style, the head's icons and the footer are read from the site's own front page in the same language, so the policy page
// looks like the site and follows it: change the front page, run this, and the policy page comes along.
// House rules: node built-ins only, assertions that name the fix, non-zero exit.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mail = (s) => s.replace(/\b[A-Za-z0-9._-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\b/g, (a) => `<a href="mailto:${a}">${a}</a>`);
const inline = (s) => mail(esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>"));
const isComment = (l) => /^<!--.*-->$/.test(l.trim());

// The markdown subset of the estate's other legal generators (developers.333.eco, storage.333.eco): headings, paragraphs,
// lists, **bold**, `code`; an email address becomes a mailto: link. A whole-line HTML comment is skipped (the Khmer's pin).
export function md(text) {
    const out = [], lines = text.split("\n");
    for (let i = 0; i < lines.length;) {
        const l = lines[i];
        if (!l.trim() || isComment(l)) { i++; continue; }
        if (l.startsWith("# ")) { out.push(`<h1>${inline(l.slice(2))}</h1>`); i++; continue; }
        if (l.startsWith("## ")) { out.push(`<h2>${inline(l.slice(3))}</h2>`); i++; continue; }
        if (l.startsWith("- ")) { const li = []; while (lines[i]?.startsWith("- ")) li.push(`<li>${inline(lines[i++].slice(2))}</li>`); out.push(`<ul>\n${li.join("\n")}\n</ul>`); continue; }
        const p = []; while (lines[i]?.trim() && !/^(#|- )/.test(lines[i]) && !isComment(lines[i])) p.push(lines[i++]);
        out.push(`<p>${inline(p.join(" "))}</p>`);
    }
    return out.join("\n");
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
export function shapeProblems(text) {
    const lines = text.split("\n"), p = [];
    if (!/^# .+$/.test(lines[0] ?? "")) p.push('legal/privacy.md: line 1 must be "# <Title>"');
    if ((lines[1] ?? "x") !== "") p.push("legal/privacy.md: line 2 must be blank");
    if (!new RegExp(`^(Draft|Version) of \\d{1,2} (${MONTHS}) \\d{4}\\.$`).test(lines[2] ?? "")) p.push('legal/privacy.md: line 3 must read "Draft of D Month YYYY."');
    return p;
}

// legal.333.eco's comparison (its scripts/lib.mjs pageText + missingFromServed), ported so this repo stands alone: each list item
// and each paragraph of the markdown, as plain text, must be found in the page's text; spacing and the marks _ * ` # are dropped
// on both sides, as there.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const norm = (s) => s.replace(/\s+/g, " ").trim();
export function pageText(html) {
    return norm(html
        .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, " ")
        .replace(/<\/?(p|div|h[1-6]|li|ul|ol|br|section|article|header|footer|main|nav|blockquote)\b[^>]*>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
        .replace(/&([a-z]+);/gi, (e, n) => ENT[n.toLowerCase()] ?? e));
}
const plain = (s) => norm(s.replace(/^#+\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1"));
export function missingFromPage(mdText, html) {
    const pieces = [];
    for (const block of mdText.split(/\n\s*\n/)) {
        let para = [];
        const flush = () => { if (para.length) pieces.push(para.join(" ")); para = []; };
        for (const l of block.split("\n").filter((x) => x.trim() && !isComment(x))) {
            if (/^\s*([-*]|\d+\.)\s/.test(l)) { flush(); pieces.push(l.replace(/^\s*([-*]|\d+\.)\s+/, "")); }
            else if (/^#/.test(l)) { flush(); pieces.push(l); }
            else para.push(l);
        }
        flush();
    }
    const key = (t) => t.replace(/[\s_*`#]+/g, "");
    const pageKey = key(pageText(html));
    return pieces.map((x) => plain(x.trim())).filter((l) => l.length > 0).filter((l) => !pageKey.includes(key(l)));
}

// The shared clauses' ruled wordings (rule 7). The banner and the AI line are the frame's, never the text's (so never in a
// published version, and never a party: rule 6 reads only the text); the Changes promise is the English text's own.
export const RULED = {
    en: {
        banner: "A draft, not yet reviewed by a lawyer. It may change before the final version.",
        ai: "Drafted with Miss Aquarius℠, an AI",
    },
    km: {
        banner: "សេចក្តីព្រាង ដែលមិនទាន់ត្រូវបានពិនិត្យដោយមេធាវីនៅឡើយទេ។ វាអាចផ្លាស់ប្តូរមុនកំណែចុងក្រោយ។",
        ai: "រៀបចំជាមួយ Miss Aquarius℠ ដែលជា AI",
    },
    // Reworded the same day (founder 2026-11-26, "Reword it everywhere"): "a new version" is barred as a novelty claim.
    changes: "Each change is published as its own version with its own date, at legal.333.eco, where every version stays.",
};
export function clauseProblems(file, html, lang) {
    const out = [], text = pageText(html), r = RULED[lang];
    if (!text.includes(r.banner)) out.push(`${file}: the frame does not carry the ruled draft banner: "${r.banner}"`);
    if (!text.includes(r.ai)) out.push(`${file}: the frame does not carry the AI line: "${r.ai}"`);
    else if (text.indexOf(r.ai) < text.indexOf(r.banner)) out.push(`${file}: the AI line is not beside the banner (it comes before it)`);
    return out;
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const PIN = /^<!-- Khmer: OUR DRAFT of legal\/privacy\.md sha256 ([0-9a-f]{64}), awaiting a native reader \(\/khmer-review\)\. -->$/;

// The words around the text, outside it. The Khmer is ours and marked (the page's draft line and the footer's). The banner and
// the AI line are the shared clauses' ruled wordings (2026-11-26), the Khmer included; rule 7 holds them to RULED.
const FRAME = {
    en: {
        lang: "en", path: "/privacy/", home: "/", title: (h) => `Privacy policy · ${h}`,
        desc: (h) => `What ${h} keeps about a visit, and who else handles it.`,
        banner: "A draft, not yet reviewed by a lawyer. It may change before the final version.",
        ai: "Drafted with Miss Aquarius℠, an AI",
        note: "",
        versions: "Every version of this document, timestamped:",
        versionsAfter: "",
    },
    km: {
        lang: "km", path: "/km/privacy/", home: "/km/", title: (h) => `គោលការណ៍ឯកជនភាព · ${h}`,
        desc: (h) => `អ្វីដែល ${h} រក្សាទុកអំពីការចូលមើល និងអ្នកផ្សេងទៀតដែលដោះស្រាយវា។`,
        banner: "សេចក្តីព្រាង ដែលមិនទាន់ត្រូវបានពិនិត្យដោយមេធាវីនៅឡើយទេ។ វាអាចផ្លាស់ប្តូរមុនកំណែចុងក្រោយ។",
        ai: "រៀបចំជាមួយ Miss Aquarius℠ ដែលជា AI",
        note: `<p class="draft draft-note" lang="km">[ ភាសាខ្មែរនេះជាសេចក្តីព្រាងរបស់យើង រង់ចាំការពិនិត្យពីអ្នកភាសាខ្មែរ។ អត្ថបទភាសាអង់គ្លេសនៅ <a href="/privacy/" hreflang="en" lang="en">/privacy/</a> គឺជាអត្ថបទដែល legal.333.eco រក្សាទុកគ្រប់កំណែ។ ]</p>`,
        versions: "គ្រប់កំណែនៃឯកសារនេះ ដែលមានត្រាពេលវេលា៖",
        versionsAfter: " (ជាភាសាអង់គ្លេស)",
    },
};

const EXTRA_CSS = `
            /* the privacy page (scripts/gen-legal.mjs): the draft band, the way home, the line about every version */
            .back { font-family: var(--sans); font-size: 0.85rem; margin: 0 0 2rem; }
            .draft-band {
                background: rgba(184, 134, 11, 0.06);
                border: 1px dashed var(--gold);
                border-radius: 4px;
                padding: 0.8rem 1rem;
                margin: 0 0 2rem;
                font-family: var(--sans);
                font-size: 0.9rem;
                color: var(--ink-soft);
            }
            .legal h1 { font-size: 2rem; margin-bottom: 0.6rem; }
            .legal code { font-size: 0.9em; }
            .fine { font-family: var(--sans); font-size: 0.85rem; color: var(--muted); margin-top: 2.5rem; }
            .draft { font-family: var(--sans); font-size: 0.75rem; color: var(--muted); }
            .draft-note { margin: -1rem 0 2rem; }
        `;

function grab(html, re, what, file) {
    const m = re.exec(html);
    if (!m) throw new Error(`gen-legal: ${file} has no ${what} to copy (the policy page reads its style, icons and footer from there)`);
    return m[0];
}

export function render(root) {
    const host = readFileSync(join(root, "CNAME"), "utf8").trim();
    const en = readFileSync(join(root, "legal", "privacy.md"), "utf8");
    const km = readFileSync(join(root, "legal", "privacy.km.md"), "utf8");
    const out = {};
    for (const [lang, text] of [["en", en], ["km", km]]) {
        const f = FRAME[lang], homeFile = lang === "en" ? "index.html" : "km/index.html";
        const home = readFileSync(join(root, homeFile), "utf8");
        const style = grab(home, /<style>[\s\S]*?<\/style>/, "<style> block", homeFile).replace(/<\/style>$/, `${EXTRA_CSS}</style>`);
        const icons = grab(home, /<link rel="manifest"[\s\S]*?rel="icon"[\s\S]*?\/>/, "manifest-to-icon head block", homeFile);
        const footer = grab(home, /<footer>[\s\S]*?<\/footer>/, "<footer>", homeFile)
            .replace(/<nav class="seg"[\s\S]*?<\/nav>/, (nav) => nav.replace(/href="\/"/, 'href="/privacy/"').replace(/href="\/km\/"/, 'href="/km/privacy/"'));
        const url = `https://${host}${f.path}`;
        const page = `<!doctype html>
<html lang="${f.lang}">
    <head>
        <!-- GENERATED by scripts/gen-legal.mjs from legal/${lang === "en" ? "privacy.md" : "privacy.km.md"} — never edit; change the markdown and run node scripts/gen-legal.mjs.${lang === "km" ? " Khmer: OUR DRAFT, awaiting a native reader." : ""} -->
        <meta charset="utf-8" />
        <script>try{var t=localStorage.getItem("ma-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>${esc(f.title(host))}</title>
        <meta name="description" content="${esc(f.desc(host))}" />
        <link rel="canonical" href="${url}" />
        ${icons}
        ${style}
        <script src="/analytics.js" defer></script>
        <link rel="alternate" hreflang="en" href="https://${host}/privacy/" />
        <link rel="alternate" hreflang="km" href="https://${host}/km/privacy/" />
        <link rel="alternate" hreflang="x-default" href="https://${host}/privacy/" />
        <script src="/site.js" defer></script>
    </head>
    <body>
        <main>
            <p class="back"><a href="${f.home}">${esc(host)}</a></p>
            <p class="draft-band" role="note">${f.banner}<br />${f.ai}</p>
            ${f.note}
            <div class="legal">
${md(text)}
            </div>
            <p class="fine">${f.versions} <a href="https://legal.333.eco/${host}/privacy/" rel="noopener">legal.333.eco</a>${f.versionsAfter}</p>
            ${footer}
        </main>
    </body>
</html>
`;
        out[lang === "en" ? "privacy/index.html" : "km/privacy/index.html"] = page;
    }
    return out;
}

// Every page that carries a footer, from the tree itself; the five Letters are timestamped corpus and never edited.
export function footerPages(root) {
    const found = [];
    const walk = (d) => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
            if (e.name.startsWith(".") || ["node_modules", "staging", "timestamps", "scripts"].includes(e.name)) continue;
            const p = join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith(".html")) found.push(relative(root, p));
        }
    };
    walk(root);
    return found.filter((f) => !/^letters\/(?!index\.html$)[^/]+\.html$/.test(f)).sort();
}

export function check(root) {
    const problems = [];
    let en = "", km = "";
    try { en = readFileSync(join(root, "legal", "privacy.md"), "utf8"); km = readFileSync(join(root, "legal", "privacy.km.md"), "utf8"); }
    catch (e) { return [`legal/privacy.md and legal/privacy.km.md must both exist (${e.code ?? e.message})`]; }
    problems.push(...shapeProblems(en));
    const pin = PIN.exec(km.split("\n")[0] ?? "");
    if (!pin) problems.push("legal/privacy.km.md: line 1 must be the pin comment naming the sha256 of the legal/privacy.md it translates");
    else if (pin[1] !== sha256(en)) problems.push(`legal/privacy.km.md is STALE: it translates sha256 ${pin[1].slice(0, 12)}…, but legal/privacy.md is now ${sha256(en).slice(0, 12)}… — update the Khmer, then the pin`);
    let pages = {};
    try { pages = render(root); } catch (e) { problems.push(e.message); }
    for (const [file, want] of Object.entries(pages)) {
        const have = existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : null;
        if (have === null) { problems.push(`${file} is missing — run node scripts/gen-legal.mjs`); continue; }
        if (have !== want) problems.push(`${file} is STALE or was edited by hand — change legal/*.md and run node scripts/gen-legal.mjs`);
        const missing = missingFromPage(file.startsWith("km/") ? km : en, have);
        for (const l of missing) problems.push(`${file}: a line of the markdown is not on the page: ${l.slice(0, 90)}`);
        if (!have.includes(`https://legal.333.eco/${readFileSync(join(root, "CNAME"), "utf8").trim()}/privacy/`)) problems.push(`${file}: no link to its page at legal.333.eco`);
        problems.push(...clauseProblems(file, have, file.startsWith("km/") ? "km" : "en"));
    }
    for (const f of footerPages(root)) {
        const html = readFileSync(join(root, f), "utf8");
        const foot = /<footer>[\s\S]*?<\/footer>/.exec(html)?.[0];
        if (!foot) continue;
        const href = f.startsWith("km/") ? "/km/privacy/" : "/privacy/";
        if (!foot.includes(`href="${href}"`)) problems.push(`${f}: its footer does not link to ${href}`);
    }
    if (!en.includes(`\n## Changes\n\n${RULED.changes}\n`)) problems.push(`legal/privacy.md: its "## Changes" section must open with the ruled promise: "${RULED.changes}"`);
    for (const [name, text] of [["legal/privacy.md", en], ["legal/privacy.km.md", km]]) {
        if (/Miss Aquarius/i.test(text)) problems.push(`${name}: names Miss Aquarius — no page names her as a party (founder 2026-11-24); name the operator, or "the organization that will be named in the final version"`);
        if (/\bthe estate\b/i.test(text)) problems.push(`${name}: says "the estate" — never in a legal text; name the entity`);
        if (/\bsign(ed|ing)?[ -]?in\b/i.test(text)) problems.push(`${name}: says "sign in" — write "log in"`);
    }
    return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const root = join(HERE, "..");
    if (process.argv.includes("--check")) {
        const p = check(root);
        if (p.length) { for (const x of p) console.error(`legal: ${x}`); process.exit(1); }
        console.log(`legal: current (privacy/index.html + km/privacy/index.html; ${footerPages(root).length} footers link to it)`);
    } else {
        for (const [file, page] of Object.entries(render(root))) {
            mkdirSync(dirname(join(root, file)), { recursive: true });
            writeFileSync(join(root, file), page);
            console.log(`legal: wrote ${file}`);
        }
    }
}
