#!/usr/bin/env node
// Verifies src/data/perks.ts and src/data/data_storage.ts stay in sync:
//
//   1. Every icon imported in perks.ts actually exists on disk.
//   2. Every perk in perks.ts is referenced somewhere in PERKS_TIERS
//      (data_storage.ts) — flags icons nobody uses.
//   3. Every perk name listed in PERKS_TIERS resolves to an icon in
//      perks.ts — either directly, or via the same fuzzy matching
//      src/lib/perk-icons.ts uses at runtime (case, "Hex "/"Scourge Hook "/
//      "Boon " prefixes, spacing, and a short alias list for known
//      typos/renames). Anything that still doesn't resolve is a real gap.
//
// Usage: node scripts/check-perks.cjs

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PERKS_FILE = path.join(ROOT, "src/data/perks.ts");
const DATA_STORAGE_FILE = path.join(ROOT, "src/data/data_storage.ts");
const DATA_DIR = path.join(ROOT, "src/data");

function readFile(p, label) {
    if (!fs.existsSync(p)) {
        console.error(`✗ Could not find ${label} at ${p}`);
        process.exit(1);
    }
    return fs.readFileSync(p, "utf8");
}

// ---------- parse perks.ts ----------
function parsePerksFile(src) {
    const imports = new Map(); // varName -> relative import path
    for (const m of src.matchAll(/import\s+(\w+)\s+from\s+"([^"]+)"/g)) {
        imports.set(m[1], m[2]);
    }

    const objMatch = src.match(/export const perks\s*=\s*\{([\s\S]*?)\n\};/);
    if (!objMatch) {
        console.error("✗ Could not find `export const perks = { ... }` in perks.ts");
        process.exit(1);
    }

    const entries = new Map(); // perk name -> varName
    for (const m of objMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*(\w+)/g)) {
        entries.set(m[1], m[2]);
    }

    return { imports, entries };
}

// ---------- fuzzy resolver (mirrors src/lib/perk-icons.ts) ----------
function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PREFIXES = ["hex", "scourgehook", "booncircleof", "boon"];

function stripPrefix(norm) {
    for (const prefix of PREFIXES) {
        if (norm.startsWith(prefix)) return norm.slice(prefix.length);
    }
    return norm;
}

const ALIASES = {
    awakenedawareness: "awakenedawarenesss",
    franklinsdemise: "franklinsloss",
    batteriesinclude: "batteriesincluded",
    bloodfavour: "bloodfavor",
    overcharge: "generatorovercharge",
};

function buildResolver(perkNames) {
    const byNorm = new Map();
    const byStrippedNorm = new Map();

    for (const name of perkNames) {
        const n = normalize(name);
        byNorm.set(n, name);
        byStrippedNorm.set(stripPrefix(n), name);
    }

    function lookup(norm) {
        return byNorm.get(norm) ?? byStrippedNorm.get(norm) ?? byStrippedNorm.get(stripPrefix(norm));
    }

    return function resolve(name) {
        if (perkNames.has(name)) return { match: name, how: "exact" };

        const n = normalize(name);
        const direct = lookup(n);
        if (direct) return { match: direct, how: "fuzzy" };

        const aliasTarget = ALIASES[n];
        if (aliasTarget) {
            const aliased = lookup(aliasTarget);
            if (aliased) return { match: aliased, how: "alias" };
        }

        return null;
    };
}

// ---------- parse data_storage.ts PERKS_TIERS ----------
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

function parsePerksTiers(src) {
    const block = extractExportBlock(src, "PERKS_TIERS");
    if (!block) {
        console.error("✗ Could not find `export const PERKS_TIERS = { ... }` in data_storage.ts");
        process.exit(1);
    }

    const byTier = {};
    for (const tierMatch of block.matchAll(/(\w+)\s*:\s*\[([\s\S]*?)\]/g)) {
        const tier = tierMatch[1];
        const names = [...tierMatch[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
        byTier[tier] = names;
    }
    return byTier;
}

// ---------- "did you mean" for genuinely unresolved names ----------
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
    // Only suggest genuinely close spellings, not just "shortest name wins".
    return bestDist <= 3 ? { name: best, dist: bestDist } : null;
}

// ---------- run ----------
const perksSrc = readFile(PERKS_FILE, "perks.ts");
const dataStorageSrc = readFile(DATA_STORAGE_FILE, "data_storage.ts");

const { imports, entries } = parsePerksFile(perksSrc);
const perksTiers = parsePerksTiers(dataStorageSrc);

let hasError = false;

// 1. every icon file referenced by perks.ts actually exists
console.log("── Checking icon files referenced by perks.ts ──");
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
    console.log(`  ✓ All ${entries.size} icon files exist on disk.`);
} else {
    hasError = true;
    for (const { name, importPath } of missingFiles) {
        console.log(`  ✗ "${name}" → missing file: ${importPath}`);
    }
}

// 2 & 3. cross-check PERKS_TIERS <-> perks.ts
console.log("\n── Checking PERKS_TIERS names resolve to an icon ──");
const perkNameSet = new Set(entries.keys());
const resolve = buildResolver(perkNameSet);

const usedPerkNames = new Set();
const unresolved = [];
let fuzzyCount = 0;

for (const [tier, names] of Object.entries(perksTiers)) {
    for (const name of names) {
        const result = resolve(name);
        if (!result) {
            unresolved.push({ tier, name });
            continue;
        }
        usedPerkNames.add(result.match);
        if (result.how !== "exact") {
            fuzzyCount++;
            console.log(`  ~ [${tier}] "${name}" → matched "${result.match}" (${result.how})`);
        }
    }
}

const totalListed = Object.values(perksTiers).reduce((n, arr) => n + arr.length, 0);
console.log(
    `  ${totalListed - unresolved.length}/${totalListed} PERKS_TIERS names resolve to an icon (${fuzzyCount} needed fuzzy/alias matching).`,
);
if (unresolved.length > 0) {
    hasError = true;
    console.log(`  ✗ ${unresolved.length} name(s) have no matching icon at all:`);
    for (const { tier, name } of unresolved) {
        const suggestion = suggestClosest(name, perkNameSet);
        const hint = suggestion ? ` (did you mean "${suggestion.name}"?)` : "";
        console.log(`      [${tier}] "${name}"${hint}`);
    }
}

console.log("\n── Checking for unused icons in perks.ts ──");
const unused = [...perkNameSet].filter((n) => !usedPerkNames.has(n));
if (unused.length === 0) {
    console.log("  ✓ Every icon in perks.ts is referenced by PERKS_TIERS.");
} else {
    console.log(`  ! ${unused.length} icon(s) in perks.ts aren't used by any PERKS_TIERS entry:`);
    for (const name of unused) {
        console.log(`      "${name}"`);
    }
}

console.log("\n" + (hasError ? "✗ Issues found — see above." : "✓ Everything checks out."));
process.exit(hasError ? 1 : 0);
