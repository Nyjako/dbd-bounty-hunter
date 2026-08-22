#!/usr/bin/env node
// Verifies src/data/characters.ts and src/data/data_storage.ts stay in sync:
//
//   1. Every portrait imported in characters.ts actually exists on disk.
//   2. Every portrait in characters.ts is referenced somewhere in
//      data_storage.ts (survivor tiers, LEGENDARY, or KILLER_TIERS) —
//      flags portraits nobody uses.
//   3. Every name referenced in data_storage.ts resolves to a portrait in
//      characters.ts — survivor tier entries, LEGENDARY img_name AND
//      corresponding_character, and KILLER_TIERS img_name. Anything that
//      doesn't resolve (even case-insensitively) is a real gap.
//
// Usage: node scripts/check-characters.cjs

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHARACTERS_FILE = path.join(ROOT, "src/data/characters.ts");
const DATA_STORAGE_FILE = path.join(ROOT, "src/data/data_storage.ts");
const DATA_DIR = path.join(ROOT, "src/data");

function readFile(p, label) {
    if (!fs.existsSync(p)) {
        console.error(`✗ Could not find ${label} at ${p}`);
        process.exit(1);
    }
    return fs.readFileSync(p, "utf8");
}

// ---------- parse characters.ts ----------
function parseCharactersFile(src) {
    const imports = new Map(); // varName -> relative import path
    for (const m of src.matchAll(/import\s+(\w+)\s+from\s+"([^"]+)"/g)) {
        imports.set(m[1], m[2]);
    }

    const objMatch = src.match(/export const characters\s*=\s*\{([\s\S]*?)\n\};/);
    if (!objMatch) {
        console.error("✗ Could not find `export const characters = { ... }` in characters.ts");
        process.exit(1);
    }

    const entries = new Map(); // character name -> varName
    for (const m of objMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*(\w+)/g)) {
        entries.set(m[1], m[2]);
    }

    return { imports, entries };
}

// ---------- fuzzy resolver (case-insensitive only — character names in
// this project don't carry the Hex/Scourge/Boon-style prefix drift perks do) ----------
function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildResolver(nameSet) {
    const byNorm = new Map();
    for (const name of nameSet) {
        byNorm.set(normalize(name), name);
    }
    return function resolve(name) {
        if (nameSet.has(name)) return { match: name, how: "exact" };
        const match = byNorm.get(normalize(name));
        return match ? { match, how: "case-insensitive" } : null;
    };
}

function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[a.length][b.length];
}

function suggestClosest(name, candidates) {
    const n = normalize(name);
    let best = null;
    let bestDist = Infinity;
    for (const candidate of candidates) {
        const dist = levenshtein(n, normalize(candidate));
        if (dist < bestDist) {
            bestDist = dist;
            best = candidate;
        }
    }
    return bestDist <= 3 ? { name: best, dist: bestDist } : null;
}

// ---------- parse data_storage.ts ----------
// Sliced by anchor position rather than matched by a closing "};" — some
// exports in this file close with a bare "}" (no semicolon), which would
// otherwise make a regex swallow everything up to the *next* real "};".
function extractExportBlock(src, constName) {
    const startMarker = `export const ${constName}`;
    const startIdx = src.indexOf(startMarker);
    if (startIdx === -1) return null;

    const braceIdx = src.indexOf("{", startIdx);
    if (braceIdx === -1) return null;

    const nextExportIdx = src.indexOf("\nexport const", braceIdx);
    const end = nextExportIdx === -1 ? src.length : nextExportIdx;

    return src.slice(braceIdx + 1, end);
}

function parseCharacterTiers(src) {
    const block = extractExportBlock(src, "CHARACTER_TIERS");
    if (!block) {
        console.error("✗ Could not find `export const CHARACTER_TIERS = { ... }` in data_storage.ts");
        process.exit(1);
    }

    // LEGENDARY is an array of objects, not an array of plain strings —
    // pull it out separately so the plain-string tiers parse cleanly.
    const legendaryMatch = block.match(/LEGENDARY\s*:\s*\[([\s\S]*?)\n\s*\],/);
    const legendary = legendaryMatch
        ? [...legendaryMatch[1].matchAll(/\{([\s\S]*?)\}/g)].map((m) => {
              const obj = m[1];
              const get = (field) => obj.match(new RegExp(`${field}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
              return {
                  img_name: get("img_name"),
                  name: get("name"),
                  corresponding_character: get("corresponding_character"),
              };
          })
        : [];

    const withoutLegendary = legendaryMatch ? block.replace(legendaryMatch[0], "") : block;

    const survivorTiers = {};
    for (const tierMatch of withoutLegendary.matchAll(/(\w+)\s*:\s*\[([\s\S]*?)\]/g)) {
        const tier = tierMatch[1];
        const names = [...tierMatch[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
        if (names.length > 0) survivorTiers[tier] = names;
    }

    return { survivorTiers, legendary };
}

function parseKillerTiers(src) {
    const block = extractExportBlock(src, "KILLER_TIERS");
    if (!block) return {};

    const byTier = {};
    for (const tierMatch of block.matchAll(/(\w+)\s*:\s*\[([\s\S]*?)\]/g)) {
        const tier = tierMatch[1];
        const entries = [...tierMatch[2].matchAll(/img_name\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
        if (entries.length > 0) byTier[tier] = entries;
    }
    return byTier;
}

// ---------- run ----------
const charactersSrc = readFile(CHARACTERS_FILE, "characters.ts");
const dataStorageSrc = readFile(DATA_STORAGE_FILE, "data_storage.ts");

const { imports, entries } = parseCharactersFile(charactersSrc);
const { survivorTiers, legendary } = parseCharacterTiers(dataStorageSrc);
const killerTiers = parseKillerTiers(dataStorageSrc);

let hasError = false;

// 1. every portrait file referenced by characters.ts actually exists
console.log("── Checking portrait files referenced by characters.ts ──");
const missingFiles = [];
for (const [name, varName] of entries) {
    const importPath = imports.get(varName);
    if (!importPath) {
        console.log(`  ✗ "${name}" uses undefined variable ${varName}`);
        hasError = true;
        continue;
    }
    const resolved = path.resolve(DATA_DIR, importPath);
    if (!fs.existsSync(resolved)) {
        missingFiles.push({ name, importPath });
    }
}
if (missingFiles.length === 0) {
    console.log(`  ✓ All ${entries.size} portrait files exist on disk.`);
} else {
    hasError = true;
    for (const { name, importPath } of missingFiles) {
        console.log(`  ✗ "${name}" → missing file: ${importPath}`);
    }
}

// 2 & 3. cross-check data_storage.ts <-> characters.ts
console.log("\n── Checking data_storage.ts names resolve to a portrait ──");
const nameSet = new Set(entries.keys());
const resolve = buildResolver(nameSet);

const usedNames = new Set();
const unresolved = [];
let fuzzyCount = 0;

function checkName(label, name) {
    if (!name) return;
    const result = resolve(name);
    if (!result) {
        unresolved.push({ label, name });
        return;
    }
    usedNames.add(result.match);
    if (result.how !== "exact") {
        fuzzyCount++;
        console.log(`  ~ [${label}] "${name}" → matched "${result.match}" (${result.how})`);
    }
}

let totalChecked = 0;
for (const [tier, names] of Object.entries(survivorTiers)) {
    for (const name of names) {
        checkName(`survivor:${tier}`, name);
        totalChecked++;
    }
}
for (const entry of legendary) {
    checkName("legendary:img_name", entry.img_name);
    checkName("legendary:corresponding_character", entry.corresponding_character);
    totalChecked += 2;
}
for (const [tier, names] of Object.entries(killerTiers)) {
    for (const name of names) {
        checkName(`killer:${tier}`, name);
        totalChecked++;
    }
}

console.log(
    `  ${totalChecked - unresolved.length}/${totalChecked} references resolve to a portrait (${fuzzyCount} needed case-insensitive matching).`,
);
if (unresolved.length > 0) {
    hasError = true;
    console.log(`  ✗ ${unresolved.length} reference(s) have no matching portrait at all:`);
    for (const { label, name } of unresolved) {
        const suggestion = suggestClosest(name, nameSet);
        const hint = suggestion ? ` (did you mean "${suggestion.name}"?)` : "";
        console.log(`      [${label}] "${name}"${hint}`);
    }
}

console.log("\n── Checking for unused portraits in characters.ts ──");
const unused = [...nameSet].filter((n) => !usedNames.has(n));
if (unused.length === 0) {
    console.log("  ✓ Every portrait in characters.ts is referenced by data_storage.ts.");
} else {
    console.log(`  ! ${unused.length} portrait(s) in characters.ts aren't used anywhere in data_storage.ts:`);
    for (const name of unused) {
        console.log(`      "${name}"`);
    }
}

console.log("\n" + (hasError ? "✗ Issues found — see above." : "✓ Everything checks out."));
process.exit(hasError ? 1 : 0);
