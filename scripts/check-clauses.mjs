#!/usr/bin/env node
// The guard for the vendored legal clauses: the one ruled wording of each shared clause in a legal text or a legal page
// (the not-a-chartered-bank opening, the draft banner, the AI line, the Changes promise, the passkey sentence).
// Published by legal.333.eco at https://legal.333.eco/clauses.json and /clauses.lock.json; vendored into each service that
// carries a clause, with this file. ⛔ Never edit this file or the two JSON files in a service: change the clause at
// legal.333.eco, then vendor again (its scripts/vendor-clauses.mjs). This file is byte-identical in every service.
//
// INTEGRITY IS NOT CURRENCY, so there are two questions, asked separately:
//   node scripts/check-clauses.mjs [--dir legal]
//       do my clauses match MY lock? Offline, every build and every test run. Exit 1 on a hand edit.
//   node scripts/check-clauses.mjs --currency [--dir legal] [--url <lock url>]
//       is my lock the PUBLISHED one? Needs the network, so it runs on a schedule, never in a build.
//       Exit 1 when the version (or the bytes) differ from the published lock. When the published lock cannot be read
//       (offline, a timeout, an HTTP error, a body that is not a lock), it WARNS and exits 0: currency was NOT checked,
//       and it never says "current".
//
// The files, in <dir> (default legal/, beside this file's scripts/):
//   clauses.json        the wordings, each with its id; `version` = <date>-<first 6 hex of the sha256 of the canonical JSON
//                       without its version>
//   clauses.lock.json   { version, sha256 }: the sha256 of clauses.json's bytes
// A service's tests read the wordings from clauses.json (never a literal copied into the test).
//
// Node built-ins only.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PUBLISHED_LOCK = "https://legal.333.eco/clauses.lock.json";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// The canonical form the version's 6 hex are taken over: keys sorted at every depth, no whitespace. One definition;
// legal.333.eco's scripts/clauses-json.mjs imports it from here.
export function canonical(v) {
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
}
export const contentHash = (json) => { const { version, ...rest } = json; return sha256(canonical(rest)); };
export const VERSION = /^\d{4}-\d{2}-\d{2}-([0-9a-f]{6})$/;

// Integrity: the problems with a clauses.json + lock pair (empty when they agree).
export function integrity(jsonBytes, lockBytes) {
    const out = [];
    let json, lock;
    try { json = JSON.parse(jsonBytes.toString("utf8")); } catch (e) { return [`clauses.json is not JSON (${e.message})`]; }
    try { lock = JSON.parse(lockBytes.toString("utf8")); } catch (e) { return [`clauses.lock.json is not JSON (${e.message})`]; }
    const actual = sha256(jsonBytes);
    if (actual !== lock.sha256) out.push(`clauses.json does not match its lock: expected sha256 ${String(lock.sha256).slice(0, 16)}…, actual ${actual.slice(0, 16)}…. It was edited here.`);
    if (json.version !== lock.version) out.push(`clauses.json says version ${json.version}, its lock says ${lock.version}.`);
    const m = VERSION.exec(String(json.version ?? ""));
    if (!m) out.push(`clauses.json's version "${json.version}" is not <YYYY-MM-DD>-<6 hex>.`);
    else if (contentHash(json).slice(0, 6) !== m[1]) out.push(`clauses.json's wordings are not the ones its version ${json.version} names (their hash begins ${contentHash(json).slice(0, 6)}). It was edited here, and its lock with it.`);
    return out;
}

// What the published lock says, or why it could not be read. Only a well-formed lock is "read".
export async function readPublished(url, { timeoutMs = 15000 } = {}) {
    let r;
    try { r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }); }
    catch (e) { return { read: false, why: `could not reach it (${e.cause?.code ?? e.name ?? e.message})` }; }
    if (!r.ok) return { read: false, why: `HTTP ${r.status}` };
    let lock;
    try { lock = JSON.parse(await r.text()); } catch { return { read: false, why: "its body is not JSON" }; }
    if (!lock || typeof lock.version !== "string" || !VERSION.test(lock.version) || !/^[0-9a-f]{64}$/.test(String(lock.sha256)))
        return { read: false, why: "its body is not a clauses lock" };
    return { read: true, lock };
}

async function main(args) {
    const argOf = (flag) => { const i = args.indexOf(flag); return i === -1 ? null : args[i + 1]; };
    const here = dirname(fileURLToPath(import.meta.url));
    const dir = argOf("--dir") ?? "legal";
    const base = resolve(here, "..", dir);
    const say = (s) => console.log(`check-clauses: ${s}`);
    const fail = (s) => { console.error(`check-clauses: FAILED\n  ${s.split("\n").join("\n  ")}`); process.exit(1); };
    const files = { json: join(base, "clauses.json"), lock: join(base, "clauses.lock.json") };
    for (const f of Object.values(files)) if (!existsSync(f)) fail(`${f} is missing. Vendor the clauses from legal.333.eco:\n  node scripts/vendor-clauses.mjs <this repo> --dir ${dir}`);
    const jsonBytes = readFileSync(files.json), lockBytes = readFileSync(files.lock);
    const problems = integrity(jsonBytes, lockBytes);
    if (problems.length) fail(`${problems.join("\n")}\n⛔ Never edit ${dir}/clauses.json: change the clause at legal.333.eco, then vendor again.`);
    const mine = JSON.parse(lockBytes.toString("utf8"));
    if (!args.includes("--currency")) { say(`${dir}/clauses.json matches its lock (version ${mine.version})`); return; }

    const url = argOf("--url") ?? PUBLISHED_LOCK;
    const pub = await readPublished(url);
    if (!pub.read) {
        console.log(`check-clauses: WARN: the published lock at ${url} could not be read: ${pub.why}.\n  Currency was NOT checked: this is not a pass. This repo holds version ${mine.version}.`);
        return;
    }
    if (pub.lock.version !== mine.version)
        fail(`this repo's clauses are version ${mine.version}; the published version is ${pub.lock.version}.\nTake the published clauses, review the diff, and commit it (from legal.333.eco: node scripts/vendor-clauses.mjs <this repo> --dir ${dir}).\nThis is a scheduled check, not a build gate.`);
    if (pub.lock.sha256 !== mine.sha256)
        fail(`version ${mine.version} matches, but the bytes do not (published sha256 ${pub.lock.sha256.slice(0, 16)}…, this repo ${mine.sha256.slice(0, 16)}…). Vendor again.`);
    say(`current: version ${mine.version} is the published one (${url})`);
}

// run as a command (the real path: a temp dir or a checkout under a symlink names the file twice)
if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main(process.argv.slice(2));
