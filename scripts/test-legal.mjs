#!/usr/bin/env node
// The controls for scripts/gen-legal.mjs --check: each rule is broken on purpose in a copy of this site, and the test fails
// unless the check names the break. A check that has only ever passed is an untested claim.
//
//   node scripts/test-legal.mjs
//
// House rules: node built-ins only, assertions that name the fix, non-zero exit.
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { check, missingFromPage, RULED } from "./gen-legal.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0, passed = 0;
const ok = (name, cond, detail) => { if (cond) { passed++; console.log(`ok   ${name}`); } else { failed++; console.error(`FAIL ${name}${detail ? `\n     ${detail}` : ""}`); } };

// A copy of the site to break (never the tree itself).
function copy() {
    const d = mkdtempSync(join(tmpdir(), "legal-test-"));
    cpSync(ROOT, d, { recursive: true, filter: (src) => !/\/\.git(\/|$)/.test(src) && !src.includes("/staging") });
    return d;
}
// Change exactly one byte: the last byte of the first match (for Khmer that is one code point turned into its neighbor).
function oneByte(file, needle) {
    const buf = readFileSync(file), at = buf.indexOf(Buffer.from(needle));
    if (at < 0) throw new Error(`test-legal: "${needle}" is not in ${file}; pick a phrase that is`);
    const i = at + Buffer.byteLength(needle) - 1;
    buf[i] = buf[i] + 1;
    writeFileSync(file, buf);
}
const has = (problems, re) => problems.some((p) => re.test(p));

// 0. The tree as committed passes.
const real = check(ROOT);
ok("the committed tree passes", real.length === 0, real.join("\n     "));

// 1. One byte of the English markdown (a letter): the pages go stale, a line is missing, the Khmer pin no longer matches.
{
    const d = copy(); oneByte(join(d, "legal/privacy.md"), "sets no cookies");
    const p = check(d);
    ok("one byte in legal/privacy.md: the page is stale", has(p, /^privacy\/index\.html is STALE/), p.join(" | "));
    ok("one byte in legal/privacy.md: the changed line is not on the page", has(p, /^privacy\/index\.html: a line of the markdown is not on the page: .*cookie/), p.join(" | "));
    ok("one byte in legal/privacy.md: the Khmer is flagged stale", has(p, /privacy\.km\.md is STALE/), p.join(" | "));
    rmSync(d, { recursive: true });
}
// 2. One byte of the English page's text (a hand edit).
{
    const d = copy(); oneByte(join(d, "privacy/index.html"), "sets no cookies");
    const p = check(d);
    ok("one byte in privacy/index.html: stale", has(p, /^privacy\/index\.html is STALE/), p.join(" | "));
    ok("one byte in privacy/index.html: the line is missing", has(p, /^privacy\/index\.html: a line of the markdown is not on the page/), p.join(" | "));
    rmSync(d, { recursive: true });
}
// 3. One byte of the Khmer page's text.
{
    const d = copy(); oneByte(join(d, "km/privacy/index.html"), "កូដផ្ទាល់របស់គេហទំព័រនេះមិនកំណត់ខូគី");
    const p = check(d);
    ok("one byte in km/privacy/index.html: stale", has(p, /^km\/privacy\/index\.html is STALE/), p.join(" | "));
    ok("one byte in km/privacy/index.html: the line is missing", has(p, /^km\/privacy\/index\.html: a line of the markdown is not on the page/), p.join(" | "));
    rmSync(d, { recursive: true });
}
// 4. The line check on its own, apart from the staleness check: a dropped paragraph and a changed letter are seen; a change of
//    spacing alone is not (the comparison is on the words, as legal.333.eco's is).
{
    const md = readFileSync(join(ROOT, "legal/privacy.md"), "utf8"), html = readFileSync(join(ROOT, "privacy/index.html"), "utf8");
    ok("line check: the real page has every line", missingFromPage(md, html).length === 0);
    ok("line check: a dropped paragraph is seen", missingFromPage(md, html.replace(/<p>This site's own code sets no cookies\.<\/p>/, "")).length === 1);
    ok("line check: one changed letter is seen", missingFromPage(md, html.replace("own code sets", "own code setz")).length === 1);
    ok("line check: spacing alone is not a change", missingFromPage(md, html.replace("own code sets", "own  code\n sets")).length === 0);
    const km = readFileSync(join(ROOT, "legal/privacy.km.md"), "utf8"), kmHtml = readFileSync(join(ROOT, "km/privacy/index.html"), "utf8");
    ok("line check: the real Khmer page has every line", missingFromPage(km, kmHtml).length === 0);
}
// 5. A footer without the link.
{
    const d = copy(), f = join(d, "index.html");
    writeFileSync(f, readFileSync(f, "utf8").replace('<br /><a href="/privacy/">Privacy policy</a>', ""));
    const p = check(d);
    ok("a footer without the link is named", has(p, /^index\.html: its footer does not link to \/privacy\//), p.join(" | "));
    rmSync(d, { recursive: true });
}
// 6. The words a legal text here never uses, and the shape legal.333.eco requires.
for (const [name, from, to, re] of [
    ["Miss Aquarius as a party", "It is run by the organization that will be named in the final version.", "It is run by Miss Aquarius.", /names Miss Aquarius/],
    ['"the estate"', "This policy covers", "This policy for the estate covers", /says "the estate"/],
    ['"sign in"', "no log-in", "no sign-in", /says "sign in"/],
    ["the date line", "Draft of 26 November 2026.", "Drafted 26 November 2026.", /line 3 must read/],
    ["an old Changes sentence", RULED.changes, "A change to this policy is a new version with its own date line.", /must open with the ruled promise/],
    ["the withdrawn Changes sentence", RULED.changes, "A change is a new version with its own date, published at legal.333.eco, where every version stays.", /must open with the ruled promise/],
]) {
    const d = copy(), f = join(d, "legal/privacy.md");
    writeFileSync(f, readFileSync(f, "utf8").replace(from, to));
    const p = check(d);
    ok(`the check refuses ${name}`, has(p, re), p.join(" | "));
    rmSync(d, { recursive: true });
}

// 7. The shared clauses in the frame (rule 7): the old banner, and a page without the AI line, in each language.
for (const [file, lang, oldBanner] of [
    ["privacy/index.html", "en", "This is a draft. No lawyer has reviewed it, and it may change before it is final."],
    ["km/privacy/index.html", "km", "នេះជាសេចក្តីព្រាង។ មិនទាន់មានមេធាវីណាពិនិត្យវានៅឡើយទេ ហើយវាអាចផ្លាស់ប្តូរ មុនពេលវាជាកំណែចុងក្រោយ។"],
]) {
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = (name) => new RegExp(`^${esc(file)}: the frame does not carry the ${name}`);
    {
        const d = copy(), f = join(d, file);
        writeFileSync(f, readFileSync(f, "utf8").replace(RULED[lang].banner, oldBanner));
        const p = check(d);
        ok(`${file}: the old banner in place of the ruled one is named`, has(p, re("ruled draft banner")), p.join(" | "));
        rmSync(d, { recursive: true });
    }
    {
        const d = copy(), f = join(d, file);
        writeFileSync(f, readFileSync(f, "utf8").replace(RULED[lang].ai, ""));
        const p = check(d);
        ok(`${file}: a page without the AI line is named`, has(p, re("AI line")), p.join(" | "));
        rmSync(d, { recursive: true });
    }
}

// 8. The vendored clauses (rule 8): one word edited in legal/clauses.json fails its lock; the Khmer Changes promise is held too.
{
    const d = copy(), f = join(d, "legal/clauses.json");
    writeFileSync(f, readFileSync(f, "utf8").replace("not yet reviewed by a lawyer. It may change before the final version.\"", "not yet reviewed by an attorney. It may change before the final version.\""));
    const p = check(d);
    ok("one word edited in legal/clauses.json is named", has(p, /^legal\/clauses\.json: clauses\.json does not match its lock/), p.join(" | "));
    rmSync(d, { recursive: true });
}
{
    const d = copy(), f = join(d, "legal/privacy.km.md");
    writeFileSync(f, readFileSync(f, "utf8").replace(RULED.changesKm, RULED.changesKm.replace("រក្សាទុក", "ទុក")));
    const p = check(d);
    ok("a Khmer Changes promise that differs from the ruled one is named", has(p, /^legal\/privacy\.km\.md: its "## .+" section must open with the ruled promise/), p.join(" | "));
    rmSync(d, { recursive: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
