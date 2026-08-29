#!/usr/bin/env node
// Regenerates src/lib/wasm-bytes.ts from native/cipher.wasm (built by
// `make wasm`, or the wasm target inside `make all`/`make re`).
//
// Embedding the compiled bytes as a base64 string, instead of fetching
// the .wasm file at runtime, keeps loading it synchronous — see
// lib/wasm-cipher.ts for why that matters for this project.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WASM_PATH = path.join(ROOT, "native/cipher.wasm");
const OUT_PATH = path.join(ROOT, "src/lib/wasm-bytes.ts");

if (!fs.existsSync(WASM_PATH)) {
    console.error(`✗ ${WASM_PATH} not found — run the wasm compile step first.`);
    process.exit(1);
}

const bytes = fs.readFileSync(WASM_PATH);
const b64 = bytes.toString("base64");

const content = `// Compiled from native/cipher.c by \`make wasm\` (scripts/embed_wasm.cjs).
// Do not edit by hand -- regenerate instead of patching this file.
export const CIPHER_WASM_B64 =
    "${b64}";
`;

fs.writeFileSync(OUT_PATH, content);
console.log(`✓ Wrote ${OUT_PATH} (${b64.length} base64 chars from a ${bytes.length}-byte module)`);
