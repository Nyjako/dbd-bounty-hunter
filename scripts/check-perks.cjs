const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PERKS_FILE = path.join(ROOT, "src/data/perks.ts");
const STORAGE_FILE = path.join(ROOT, "src/data/data_storage.ts");

const perksSource = fs.readFileSync(PERKS_FILE, "utf8");
const storageSource = fs.readFileSync(STORAGE_FILE, "utf8");

let errors = 0;

function error(message) {
    console.error(`❌ ${message}`);
    errors++;
}

function ok(message) {
    console.log(`✅ ${message}`);
}

/*
 * Check every icon imported by perks.ts.
 *
 * Example:
 * import img0 from "../../default-icons-v10.0.1/Perks/...png";
 */
const imports = [
    ...perksSource.matchAll(
        /import\s+\w+\s+from\s+["']([^"']+)["'];?/g
    ),
];

for (const match of imports) {
    const importPath = match[1];
    const absolutePath = path.resolve(path.dirname(PERKS_FILE), importPath);

    if (!fs.existsSync(absolutePath)) {
        error(`Missing perk icon: ${importPath}`);
    }
}

if (errors === 0) {
    ok(`All ${imports.length} perk icons exist.`);
}

/*
 * Extract:
 *
 * export const perks = {
 *     "Unbound": img0,
 *     ...
 * };
 */
const perksMatch = perksSource.match(
    /export\s+const\s+perks\s*=\s*\{([\s\S]*?)\n\};/
);

if (!perksMatch) {
    error("Could not find `export const perks` in perks.ts.");
    process.exit(1);
}

const perkNames = [
    ...perksMatch[1].matchAll(/^\s*"([^"]+)"\s*:/gm),
].map((match) => match[1]);

/*
 * Check duplicate perk names.
 */
const duplicatePerks = perkNames.filter(
    (name, index) => perkNames.indexOf(name) !== index
);

for (const name of [...new Set(duplicatePerks)]) {
    error(`Duplicate perk in perks.ts: "${name}"`);
}

/*
 * Extract all strings from PERKS_TIERS.
 */
const storageMatch = storageSource.match(
    /export\s+const\s+PERKS_TIERS\s*=\s*\{([\s\S]*?)\n\};/
);

if (!storageMatch) {
    error("Could not find `export const PERKS_TIERS` in data_storage.ts.");
    process.exit(1);
}

const storagePerkNames = [
    ...storageMatch[1].matchAll(/"([^"]+)"/g),
].map((match) => match[1]);

/*
 * Names in data_storage.ts that don't exist in perks.ts.
 */
const validPerks = new Set(perkNames);

for (const name of [...new Set(storagePerkNames)]) {
    if (!validPerks.has(name)) {
        error(`Invalid perk in data_storage.ts: "${name}"`);
    }
}

/*
 * Perks defined in perks.ts but not used by data_storage.ts.
 */
const usedPerks = new Set(storagePerkNames);

for (const name of perkNames) {
    if (!usedPerks.has(name)) {
        error(`Perk is not used in data_storage.ts: "${name}"`);
    }
}

if (errors === 0) {
    ok(
        `All ${perkNames.length} perks are valid and used in data_storage.ts.`
    );
}

console.log();

if (errors > 0) {
    console.error(`Found ${errors} problem(s).`);
    process.exit(1);
}

console.log("Perk validation passed.");
