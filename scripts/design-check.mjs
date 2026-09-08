/**
 * Deterministic half of design.md.
 *
 * These checks catch the mechanical failures only — the ones where a rule can
 * be decided by reading the source. Everything requiring taste stays in
 * design.md as prose. No dependencies; run with `npm run design:check`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "lib"];

/** Files allowed to hold raw colour literals, because they define the palette. */
const PALETTE_FILES = ["app/globals.css", "lib/categories.ts"];

const findings = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir))).map((f) => ({
  path: relative(ROOT, f).replace(/\\/g, "/"),
  text: readFileSync(f, "utf8"),
}));

function report(file, line, rule, detail) {
  findings.push({ file, line, rule, detail });
}

function eachLine(file, handler) {
  file.text.split("\n").forEach((text, index) => handler(text, index + 1));
}

for (const file of files) {
  const isPalette = PALETTE_FILES.includes(file.path);
  const isTimeline = file.path.includes("components/timeline/");
  // globals.css defines the tokens and the .ask class, so it states the rules
  // rather than breaking them.
  const isStylesheet = file.path.endsWith(".css");

  eachLine(file, (line, number) => {
    const code = line.trim();
    if (code.startsWith("*") || code.startsWith("//") || code.startsWith("/*")) return;

    // The signal red belongs to the current-time line. Delete actions are the
    // one documented exception.
    if (/\b(bg|text|border|fill|stroke)-signal\b/.test(line)) {
      const allowed = isTimeline || /danger/i.test(file.text.slice(0, 4000));
      if (!allowed) {
        report(file.path, number, "red-creep", "signal is reserved for the current-time line");
      }
    }

    // The serif face is for the question the app asks, nothing else.
    if (!isStylesheet && /\bfont-serif\b/.test(line)) {
      report(file.path, number, "serif-drift", "use the .ask class for the page question");
    }

    // Tracked-out uppercase labels are the template tell design.md names.
    if (/\buppercase\b/.test(line) || /\btracking-widest\b/.test(line)) {
      report(file.path, number, "all-caps-eyebrow", "panels take a sentence-case title");
    }

    // Decoration pretending to be structure.
    if (/bg-gradient-to-|bg-linear-to-/.test(line)) {
      report(file.path, number, "decorative-gradient", "no gradient washes");
    }
    if (/["'>][^"'<>]*\s·\s[^"'<>]*·/.test(line)) {
      report(file.path, number, "middot-meta", "do not join meta strings with middle dots");
    }
    if (/["'][^"']*\s→["']/.test(line)) {
      report(file.path, number, "arrow-suffix", "do not append arrows to link or button text");
    }

    // Colour literals outside the palette files.
    const hexes = line.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexes && !isPalette) {
      for (const hex of hexes) {
        if (/^#(0b0b0b|111|111111|000|000000)$/i.test(hex)) {
          report(file.path, number, "tinted-near-black", `${hex} — use the ink token`);
        }
      }
    }

    // Emoji are not icons. CategoryIcon is.
    if (/\p{Extended_Pictographic}/u.test(line)) {
      report(file.path, number, "emoji-icon", "use CategoryIcon, not emoji");
    }

    // The page scrolls vertically and nothing inside it does. Horizontal
    // scrolling (the nav, the day strip) is a different thing and is allowed.
    if (/overflow-y-(auto|scroll)/.test(line)) {
      report(file.path, number, "nested-scroll", "the page scrolls, not a panel inside it");
    }
  });
}

// The lead panel only leads if it is alone.
for (const file of files.filter((f) => f.path.endsWith(".tsx"))) {
  const leads = (file.text.match(/tone="lead"/g) ?? []).length;
  if (leads > 1) {
    report(file.path, 0, "two-lead-panels", `${leads} filled panels; a page gets one`);
  }
}

// The serif is allowed exactly once per page, via .ask on the question.
for (const file of files.filter((f) => /^app\/.*page\.tsx$/.test(f.path))) {
  const asks = (file.text.match(/className="ask/g) ?? []).length;
  if (asks > 1) {
    report(file.path, 0, "serif-drift", `${asks} serif lines on one page; keep one question`);
  }
}

if (findings.length === 0) {
  console.log("design:check — no findings");
  process.exit(0);
}

console.error(`design:check — ${findings.length} finding${findings.length === 1 ? "" : "s"}\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule}] ${f.detail}`);
}
console.error("\nSee design.md for the rule behind each.");
process.exit(1);
