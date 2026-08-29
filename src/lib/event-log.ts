// A compact, hash-chained history of every meaningful action this run —
// short, dense entries in a fixed order, similar in spirit to chess
// notation. Two independent checks, both replayable without needing any
// secret to stay hidden:
//
//  1. Chain integrity: each entry's hash folds in every entry before it,
//     so editing or deleting a line anywhere breaks every hash after it.
//  2. State replay: kills, undos, purchases, and the Main Bounty all carry
//     their point delta inline, so replaying the whole log should land
//     on exactly the save's current points and kill counts. Any edit made
//     directly to the state (god mode included) without a matching log
//     entry shows up as a mismatch here, without needing a separate
//     "god mode was used" flag.
//
// This detects tampering with the log or a state/log mismatch. It cannot
// prove someone didn't also rewrite the log to match a forged state —
// nothing running entirely in the browser can rule that out.

import { wasmChainHash } from "./wasm-cipher";

// Pure-JS fallback, used only when WASM isn't available. Same shape as
// the WASM version (native/cipher.c, GOBLIN's fnv1a.h) for consistency,
// but not the same algorithm underneath — a save's hash is only ever
// compared against hashes computed the same way it was written, so
// that's fine.
function fnv1a(text: string, seed: number): number {
    let hash = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

function jsChainHash(text: string): string {
    const a = fnv1a(text, 0x811c9dc5);
    const b = fnv1a(text, 0x9e3779b9);
    return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

export function chainHash(previousHash: string, line: string): string {
    const combined = previousHash + "|" + line;
    return wasmChainHash(combined) ?? jsChainHash(combined);
}

export const GENESIS_HASH = "00000000".repeat(2);

export function appendToChain(
    eventLog: string[],
    logHash: string,
    line: string,
): { eventLog: string[]; logHash: string } {
    return {
        eventLog: [...eventLog, line],
        logHash: chainHash(logHash, line),
    };
}

export function verifyChain(eventLog: string[], expectedHash: string): boolean {
    let hash = GENESIS_HASH;
    for (const line of eventLog) hash = chainHash(hash, line);
    return hash === expectedHash;
}

export interface ReplayResult {
    points: number;
    wantedCards: Record<string, number>;
}

// Replays the log's effect on points and kill counts, starting from
// zero. Callers add this on top of a save's logBaseline (captured once,
// at the point the log started tracking that save) to get the full
// expected state.
export function replayEventLog(eventLog: string[]): ReplayResult {
    let points = 0;
    const wantedCards: Record<string, number> = {};

    for (const line of eventLog) {
        const parts = line.split(":");
        const code = parts[0];

        switch (code) {
            case "K": {
                const [, name, delta] = parts;
                wantedCards[name] = (wantedCards[name] ?? 0) + 1;
                points += Number(delta) || 0;
                break;
            }
            case "U": {
                const [, name, delta] = parts;
                wantedCards[name] = Math.max(0, (wantedCards[name] ?? 0) - 1);
                points -= Number(delta) || 0;
                break;
            }
            case "B": {
                const [, action, name, amount] = parts;
                const sign = action === "claim" ? 1 : -1;
                wantedCards[name] = Math.max(0, (wantedCards[name] ?? 0) + sign);
                points += sign * (Number(amount) || 0);
                break;
            }
            case "P": {
                const cost = Number(parts[parts.length - 1]) || 0;
                points -= cost;
                break;
            }
            case "A": {
                const cost = Number(parts[parts.length - 1]) || 0;
                points -= cost;
                break;
            }
            case "Y":
            case "R": {
                const cost = Number(parts[parts.length - 1]) || 0;
                points -= cost;
                break;
            }
            default:
                break; // E, M, I, L don't move points or kill counts
        }
    }

    return { points, wantedCards };
}

export interface VerifyResult {
    chainValid: boolean;
    stateMatches: boolean;
    eventCount: number;
    hasLegacyBaseline: boolean;
}

// Saves that predate event logging get their existing progress trusted
// as a fair starting point (see logBaseline in stores/points.ts) rather
// than being flagged for having "come from nowhere." That trust is a
// policy choice, not a technical guarantee — flip this to false (after
// a future roster change, per the marker's own warning) to stop
// extending it: any run whose log contains an "L" legacy-baseline
// marker will then show up as not matching, same as genuine tampering.
export const TRUST_LEGACY_BASELINE = true;

export function verifyRun(
    eventLog: string[],
    logHash: string,
    baseline: ReplayResult,
    actualPoints: number,
    actualWantedCards: Record<string, number>,
): VerifyResult {
    const chainValid = verifyChain(eventLog, logHash);
    const hasLegacyBaseline = eventLog.some((line) => line.startsWith("L:"));
    const replayed = replayEventLog(eventLog);

    const expectedPoints = baseline.points + replayed.points;

    const expectedWantedCards: Record<string, number> = { ...baseline.wantedCards };
    for (const [name, delta] of Object.entries(replayed.wantedCards)) {
        expectedWantedCards[name] = (expectedWantedCards[name] ?? 0) + delta;
    }

    const wantedCardsMatch =
        Object.keys(expectedWantedCards).length === Object.keys(actualWantedCards).length &&
        Object.entries(expectedWantedCards).every(([name, count]) => (actualWantedCards[name] ?? 0) === count);

    const arithmeticMatches = expectedPoints === actualPoints && wantedCardsMatch;

    return {
        chainValid,
        stateMatches: TRUST_LEGACY_BASELINE ? arithmeticMatches : arithmeticMatches && !hasLegacyBaseline,
        eventCount: eventLog.length,
        hasLegacyBaseline,
    };
}
