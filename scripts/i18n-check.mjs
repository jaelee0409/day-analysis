/**
 * Deterministic half of translation.
 *
 * A missing key or a dropped {placeholder} does not crash — it silently shows
 * an English fragment, or a raw brace, to a Korean reader. That is exactly the
 * kind of failure nobody notices until someone else does.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const findings = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const source = readFileSync(join(ROOT, "lib/i18n.ts"), "utf8");

// Entries look like:  "some.key": { en: "...", ko: "..." },
const STRING = String.raw`"(?:[^"\\]|\\.)*"`;
const entryRe = new RegExp(
  // Multi-line entries carry a trailing comma before the brace.
  String.raw`"([\w.]+)":\s*\{\s*en:\s*(${STRING})\s*,\s*ko:\s*(${STRING})\s*,?\s*\}`,
  "g",
);

const entries = new Map();
for (const m of source.matchAll(entryRe)) {
  entries.set(m[1], { en: JSON.parse(m[2]), ko: JSON.parse(m[3]) });
}

if (entries.size === 0) findings.push("could not parse any dictionary entries");

// 1. Both languages present and non-empty.
for (const [key, value] of entries) {
  if (!value.en.trim()) findings.push(`${key}: english is empty`);
  if (!value.ko.trim()) findings.push(`${key}: korean is empty`);
}

// 2. Placeholders must match, or a number goes missing in one language.
const holes = (text) => new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
for (const [key, value] of entries) {
  const en = holes(value.en);
  const ko = holes(value.ko);
  for (const name of en) if (!ko.has(name)) findings.push(`${key}: korean is missing {${name}}`);
  for (const name of ko) if (!en.has(name)) findings.push(`${key}: english is missing {${name}}`);
}

// 3. Every category needs a label and a phrase in both languages.
const categories = readFileSync(join(ROOT, "lib/categories.ts"), "utf8");
for (const m of categories.matchAll(/\{\s*id:\s*"(\w+)"/g)) {
  for (const suffix of ["label", "phrase"]) {
    const key = `category.${m[1]}.${suffix}`;
    if (!entries.has(key)) findings.push(`${key}: missing from the dictionary`);
  }
}

// 4. Every literal key the app asks for must exist.
const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components")), ...walk(join(ROOT, "lib"))];
for (const file of files) {
  const path = relative(ROOT, file).replace(/\\/g, "/");
  if (path === "lib/i18n.ts") continue;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\bt\(\s*"([\w.]+)"/g)) {
    if (!entries.has(m[1])) findings.push(`${path}: t("${m[1]}") is not in the dictionary`);
  }
  for (const m of text.matchAll(/key:\s*"(insight\.[\w.]+)"/g)) {
    if (!entries.has(m[1])) findings.push(`${path}: observation key "${m[1]}" is not in the dictionary`);
  }
}

if (findings.length === 0) {
  console.log(`i18n:check — ${entries.size} keys, both languages complete`);
  process.exit(0);
}

console.error(`i18n:check — ${findings.length} finding${findings.length === 1 ? "" : "s"}\n`);
for (const f of findings) console.error(`  ${f}`);
process.exit(1);
