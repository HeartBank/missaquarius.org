#!/usr/bin/env node
// The Khmer review's screenshots for this site (/khmer-review capture): the site's own files served on :4351 (a plain
// static site, no build), every screen of scripts/khmer-states.json in Khmer, written beside the review page on
// demo.missaquarius.org. Then /khmer-review's `sheet` again, so the page lists the pictures, and push the demo repo.
import { execFileSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(ROOT, "../../.claude/skills/khmer-review/capture.mjs");
const OUT = join(ROOT, "../demo.missaquarius.org/khmer/missaquarius.org/shots");
execFileSync(process.execPath, [join(ROOT, "scripts/khmer-strings.mjs")], { cwd: ROOT, stdio: "inherit" });
const server = spawn("python3", ["-m", "http.server", "4351", "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
try {
  execFileSync(process.execPath, [SKILL, "--strings", join(ROOT, "staging/khmer-strings.json"), "--states", join(ROOT, "scripts/khmer-states.json"), "--out", OUT], { stdio: "inherit" });
} finally { server.kill(); }
