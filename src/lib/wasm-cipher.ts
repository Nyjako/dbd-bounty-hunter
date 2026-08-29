// Loads the compiled cipher (native/cipher.c) synchronously — the bytes
// are embedded as base64 at build time rather than fetched, specifically
// so this can run at module-init time without turning the rest of the
// store's load path async.
import { CIPHER_WASM_B64 } from "./wasm-bytes";

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

let instance: WebAssembly.Instance | null = null;

interface CipherExports {
    get_buffer: () => number;
    buffer_capacity: () => number;
    cipher: (len: number) => void;
    hash_a: (len: number) => number;
    hash_b: (len: number) => number;
    memory: WebAssembly.Memory;
}

function getExports(): CipherExports | null {
    if (instance) return instance.exports as unknown as CipherExports;
    if (typeof WebAssembly === "undefined") return null;

    try {
        const bytes = base64ToBytes(CIPHER_WASM_B64);
        const module = new WebAssembly.Module(bytes);
        instance = new WebAssembly.Instance(module, {});
        return instance.exports as unknown as CipherExports;
    } catch {
        return null;
    }
}

// Runs the WASM cipher over `text` (UTF-8 encoded) and returns the
// result as base64. Symmetric — the same function encrypts and decrypts.
function runCipher(text: string): string | null {
    const exports = getExports();
    if (!exports) return null;

    const inputBytes = new TextEncoder().encode(text);
    if (inputBytes.length > exports.buffer_capacity()) return null;

    const ptr = exports.get_buffer();
    new Uint8Array(exports.memory.buffer, ptr, inputBytes.length).set(inputBytes);
    exports.cipher(inputBytes.length);

    const output = new Uint8Array(exports.memory.buffer, ptr, inputBytes.length).slice();
    return bytesToBase64(output);
}

function runDecipher(base64: string): string | null {
    const exports = getExports();
    if (!exports) return null;

    let inputBytes: Uint8Array;
    try {
        inputBytes = base64ToBytes(base64);
    } catch {
        return null;
    }
    if (inputBytes.length > exports.buffer_capacity()) return null;

    const ptr = exports.get_buffer();
    new Uint8Array(exports.memory.buffer, ptr, inputBytes.length).set(inputBytes);
    exports.cipher(inputBytes.length);

    const output = new Uint8Array(exports.memory.buffer, ptr, inputBytes.length).slice();
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(output);
    } catch {
        return null;
    }
}

export function wasmEncrypt(text: string): string | null {
    return runCipher(text);
}

export function wasmDecrypt(encoded: string): string | null {
    return runDecipher(encoded);
}

// Two FNV-1a passes (native/cipher.c, via GOBLIN's fnv1a.h) over the
// same text, concatenated into one wider hex string for the event-log
// chain hash. Returns null if WASM isn't available, so callers can fall
// back to a pure-JS hash.
export function wasmChainHash(text: string): string | null {
    const exports = getExports();
    if (!exports) return null;

    const inputBytes = new TextEncoder().encode(text);
    if (inputBytes.length >= exports.buffer_capacity() - 1) return null;

    const ptr = exports.get_buffer();
    const mem = exports.memory.buffer;

    new Uint8Array(mem, ptr, inputBytes.length).set(inputBytes);
    const a = exports.hash_a(inputBytes.length) >>> 0;

    // hash_a null-terminates the buffer in place; rewrite it before hash_b.
    new Uint8Array(mem, ptr, inputBytes.length).set(inputBytes);
    const b = exports.hash_b(inputBytes.length) >>> 0;

    return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
