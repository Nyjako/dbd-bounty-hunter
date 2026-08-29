// Turns a string into unreadable gibberish and back, for save/export
// storage. The WASM cipher (native/cipher.c) is primary; the JS cipher
// below is kept only so saves obfuscated by the previous, JS-only
// version of this site still load. Neither is real security — see
// native/cipher.c for why that's structurally impossible client-side.
import { wasmEncrypt, wasmDecrypt } from "./wasm-cipher";

const LEGACY_KEY_SEED = 0x9e3779b9;

function legacyMulberry32(seed: number) {
    let s = seed;
    return function () {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function legacyObfuscate(text: string): string {
    const bytes = new TextEncoder().encode(text);
    const rand = legacyMulberry32(LEGACY_KEY_SEED);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ Math.floor(rand() * 256);
    return bytesToBase64(out);
}

function legacyDeobfuscate(encoded: string): string | null {
    try {
        const bytes = base64ToBytes(encoded);
        const rand = legacyMulberry32(LEGACY_KEY_SEED);
        const out = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ Math.floor(rand() * 256);
        return new TextDecoder("utf-8", { fatal: true }).decode(out);
    } catch {
        return null;
    }
}

export function obfuscate(text: string): string {
    return wasmEncrypt(text) ?? legacyObfuscate(text);
}

export function deobfuscate(encoded: string): string | null {
    const wasmResult = wasmDecrypt(encoded);
    if (wasmResult !== null) return wasmResult;
    return legacyDeobfuscate(encoded);
}
