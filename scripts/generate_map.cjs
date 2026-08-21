const fs = require("fs");
const path = require("path");

const img_dir = "default-icons-v10.0.1";

const outputDir = "src/data";

const force = process.argv.includes("--force");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function convertCamelToNormal(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

function sanitizeVariableName(name) {
    return name
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^(\d)/, "_$1");
}

function walkDirectory(dir, callback) {
    if (!fs.existsSync(dir)) {
        console.warn(`Missing directory: ${dir}`);
        return;
    }

    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory()) {
            walkDirectory(fullPath, callback);
        } else if (file.endsWith(".png")) {
            callback(fullPath, file);
        }
    }
}

function saveTs(fileName, content) {
    ensureDir(outputDir);

    const outputPath = path.join(outputDir, fileName);

    if (fs.existsSync(outputPath) && !force) {
        console.log(`Skipping ${outputPath} (already exists)`);
        return;
    }

    fs.writeFileSync(outputPath, content);

    console.log(`Generated ${outputPath}`);
}

function generateMap(mapName, entries) {
    let output = "";

    for (const entry of entries) {
        output += `import ${entry.variable} from "${entry.importPath}";\n`;
    }

    output += "\n";

    output += `export const ${mapName} = {\n`;

    for (const entry of entries) {
        output += `    "${entry.name}": ${entry.variable},\n`;
    }

    output += "};\n";

    return output;
}

function generateCharacterMap() {
    const sourceDir = path.join(img_dir, "CharPortraits");

    const entries = [];
    let index = 0;

    walkDirectory(sourceDir, (fullPath, file) => {
        const match = file.match(/^(?:[KS]\d+|T_UI_[KS]\d+)_(.*?)_Portrait\.png$/);

        if (!match) {
            return;
        }

        const charName = convertCamelToNormal(match[1]);

        // Check if this character name already exists in the entries array
        const existingEntry = entries.find((entry) => entry.name === charName);
        if (existingEntry) {
            return; // Skip this entry if a duplicate is found
        }

        const relativePath = path
            .relative("src", fullPath)
            .replaceAll("\\", "/");

        entries.push({
            name: charName,
            variable: `img${index++}`,
            importPath: `../${relativePath}`,
        });
    });

    const content = generateMap("characters", entries);

    saveTs("characters.ts", content);
}

function generatePerksMap() {
    const sourceDir = path.join(img_dir, "Perks");

    const entries = [];
    let index = 0;

    walkDirectory(sourceDir, (fullPath, file) => {
        const match = file.match(/^.*icons?Perks_([^_]+)\.png$/);

        if (!match) {
            return;
        }

        const perkName = convertCamelToNormal(match[1]);

        const relativePath = path
            .relative("src", fullPath)
            .replaceAll("\\", "/");

        entries.push({
            name: perkName,
            variable: `img${index++}`,
            importPath: `../${relativePath}`,
        });
    });

    const content = generateMap("perks", entries);

    saveTs("perks.ts", content);
}

generateCharacterMap();
generatePerksMap();
