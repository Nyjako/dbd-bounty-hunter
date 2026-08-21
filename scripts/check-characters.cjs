const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHARACTERS_FILE = path.join(ROOT, "src/data/characters.ts");
const STORAGE_FILE = path.join(ROOT, "src/data/data_storage.ts");

const charactersSource = fs.readFileSync(CHARACTERS_FILE, "utf8");
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
 * Check every portrait imported by characters.ts.
 */
const imports = [
    ...charactersSource.matchAll(
        /import\s+\w+\s+from\s+["']([^"']+)["'];?/g
    ),
];

for (const match of imports) {
    const importPath = match[1];
    const absolutePath = path.resolve(
        path.dirname(CHARACTERS_FILE),
        importPath
    );

    if (!fs.existsSync(absolutePath)) {
        error(`Missing character portrait: ${importPath}`);
    }
}

if (errors === 0) {
    ok(`All ${imports.length} character portraits exist.`);
}

/*
 * Extract:
 *
 * export const characters = {
 *     "The Unknown": img0,
 *     ...
 * };
 */
const charactersMatch = charactersSource.match(
    /export\s+const\s+characters\s*=\s*\{([\s\S]*?)\n\};/
);

if (!charactersMatch) {
    error("Could not find `export const characters` in characters.ts.");
    process.exit(1);
}

const characterNames = [
    ...charactersMatch[1].matchAll(/^\s*"([^"]+)"\s*:/gm),
].map((match) => match[1]);

/*
 * Check duplicate character names.
 */
const duplicateCharacters = characterNames.filter(
    (name, index) => characterNames.indexOf(name) !== index
);

for (const name of [...new Set(duplicateCharacters)]) {
    error(`Duplicate character in characters.ts: "${name}"`);
}

const validCharacters = new Set(characterNames);

/*
 * Extract CHARACTER_TIERS.
 */
const tiersMatch = storageSource.match(
    /export\s+const\s+CHARACTER_TIERS\s*=\s*\{([\s\S]*?)\n\};/
);

if (!tiersMatch) {
    error(
        "Could not find `export const CHARACTER_TIERS` in data_storage.ts."
    );
    process.exit(1);
}

/*
 * The LEGENDARY tier contains skin names which are NOT characters.ts
 * entries. We only validate:
 *
 * - S/A/B/C/D/E tier character names
 * - corresponding_character inside LEGENDARY
 */

/*
 * Extract S/A/B/C/D/E sections.
 */
const normalTiersMatch = tiersMatch[1].match(
    /(?:S|A|B|C|D|E)\s*:\s*\[([\s\S]*?)\](?=\s*,?\s*(?:S|A|B|C|D|E|$))/
);

/*
 * Simpler approach: remove the LEGENDARY section first.
 */
const normalTiersSource = tiersMatch[1].replace(
    /LEGENDARY\s*:\s*\[[\s\S]*?\]\s*,?/,
    ""
);

const storageCharacterNames = [
    ...normalTiersSource.matchAll(/"([^"]+)"/g),
].map((match) => match[1]);

/*
 * Validate normal tier names.
 */
for (const name of [...new Set(storageCharacterNames)]) {
    if (!validCharacters.has(name)) {
        error(`Invalid character in data_storage.ts: "${name}"`);
    }
}

/*
 * Validate corresponding_character in LEGENDARY entries.
 */
const legendaryMatch = tiersMatch[1].match(
    /LEGENDARY\s*:\s*\[([\s\S]*?)\](?=\s*,?\s*(?:S|A|B|C|D|E|$))/
);

if (legendaryMatch) {
    const correspondingCharacters = [
        ...legendaryMatch[1].matchAll(
            /corresponding_character\s*:\s*"([^"]+)"/g
        ),
    ].map((match) => match[1]);

    for (const name of [...new Set(correspondingCharacters)]) {
        if (!validCharacters.has(name)) {
            error(
                `Invalid corresponding_character in data_storage.ts: "${name}"`
            );
        }
    }
}

/*
 * Make sure every character is used in one of the normal tiers.
 *
 * Legendary skins don't count as character usage.
 */
const usedCharacters = new Set(storageCharacterNames);

for (const name of characterNames) {
    if (!usedCharacters.has(name)) {
        error(`Character is not used in data_storage.ts: "${name}"`);
    }
}

if (errors === 0) {
    ok(
        `All ${characterNames.length} characters are valid and used in data_storage.ts.`
    );
}

console.log();

if (errors > 0) {
    console.error(`Found ${errors} problem(s).`);
    process.exit(1);
}

console.log("Character validation passed.");
