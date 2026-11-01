// A compact, hash-chained history of every meaningful action this run —
// short, dense entries in a fixed order, similar in spirit to chess
// notation. Two independent checks, both replayable without needing any
// secret to stay hidden:
//
//  1. Chain integrity: each entry's hash folds in every entry before it,
//     so editing or deleting a line anywhere breaks every hash after it.
//  2. State replay: kills, undos, purchases, perk/add-on/killer changes,
//     and the Main Bounty all carry enough detail inline that replaying
//     the whole log should land on exactly the save's current points,
//     kill counts, perk slots, add-on slots, and killer. Any edit made
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

export interface PerkSlotState {
    name: string;
    tier: string;
}

// Points and kill counts replay as additive deltas (K/U/B/P/A/Y/R each
// carry their own +/- amount). Perk slots, add-on slots, and the current
// killer don't — they're "set to X" operations (E/A/Y/R/M), so they
// replay as sparse overrides: only the indices/fields actually touched by
// the log are present here, and verifyRun applies them on top of the
// save's baseline snapshot.
export interface ReplayResult {
    points: number;
    wantedCards: Record<string, number>;
    perkSlotChanges: Record<number, PerkSlotState | null>;
    addonSlotChanges: Record<number, number>;
    killerNameChange: string | null;
}

// A full snapshot of the state the log's replay builds on top of —
// captured once, the moment a save is first seen with an empty event log
// (see logBaseline in stores/points.ts).
export interface GameStateSnapshot {
    points: number;
    wantedCards: Record<string, number>;
    perkSlots: (PerkSlotState | null)[];
    addonSlots: number[];
    killerName: string;
}

const ADDON_TIER_NAMES = ["None", "Brown", "Green", "Blue", "Purple", "Iridescent"];

// Replays the log's effect on points, kill counts, perk/add-on slots, and
// the current killer, starting from a no-op baseline.
export function replayEventLog(eventLog: string[]): ReplayResult {
    let points = 0;
    const wantedCards: Record<string, number> = {};
    const perkSlotChanges: Record<number, PerkSlotState | null> = {};
    const addonSlotChanges: Record<number, number> = {};
    let killerNameChange: string | null = null;

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
            case "E": {
                const [, slotIndexStr, name, tier] = parts;
                const slotIndex = Number(slotIndexStr);
                if (Number.isInteger(slotIndex)) perkSlotChanges[slotIndex] = { name, tier };
                break;
            }
            case "A": {
                const [, slotIndexStr, tierName, costStr] = parts;
                const cost = Number(costStr) || 0;
                points -= cost;

                const slotIndex = Number(slotIndexStr);
                const tierIndex = ADDON_TIER_NAMES.indexOf(tierName);
                if (Number.isInteger(slotIndex) && tierIndex >= 0) addonSlotChanges[slotIndex] = tierIndex;
                break;
            }
            case "Y":
            case "R": {
                const [, newKillerName, costStr] = parts;
                points -= Number(costStr) || 0;
                killerNameChange = newKillerName;
                break;
            }
            case "M": {
                // Trailing field has always been the killer name, through
                // every format this line has been written in.
                const killerFromMode = parts[parts.length - 1];
                if (killerFromMode) killerNameChange = killerFromMode;
                break;
            }
            default:
                break; // I, L don't move state on their own
        }
    }

    return { points, wantedCards, perkSlotChanges, addonSlotChanges, killerNameChange };
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
    baseline: GameStateSnapshot,
    actual: GameStateSnapshot,
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
        Object.keys(expectedWantedCards).length === Object.keys(actual.wantedCards).length &&
        Object.entries(expectedWantedCards).every(([name, count]) => (actual.wantedCards[name] ?? 0) === count);

    const expectedPerkSlots = [...baseline.perkSlots];
    for (const [indexStr, value] of Object.entries(replayed.perkSlotChanges)) {
        expectedPerkSlots[Number(indexStr)] = value;
    }
    const perkSlotsMatch =
        expectedPerkSlots.length === actual.perkSlots.length &&
        expectedPerkSlots.every((expected, i) => {
            const got = actual.perkSlots[i];
            if (!expected || !got) return expected === got || (!expected && !got);
            return expected.name === got.name && expected.tier === got.tier;
        });

    const expectedAddonSlots = [...baseline.addonSlots];
    for (const [indexStr, value] of Object.entries(replayed.addonSlotChanges)) {
        expectedAddonSlots[Number(indexStr)] = value;
    }
    const addonSlotsMatch =
        expectedAddonSlots.length === actual.addonSlots.length &&
        expectedAddonSlots.every((expected, i) => expected === actual.addonSlots[i]);

    const expectedKillerName = replayed.killerNameChange ?? baseline.killerName;
    const killerMatches = expectedKillerName === actual.killerName;

    const arithmeticMatches =
        expectedPoints === actual.points &&
        wantedCardsMatch &&
        perkSlotsMatch &&
        addonSlotsMatch &&
        killerMatches;

    return {
        chainValid,
        stateMatches: TRUST_LEGACY_BASELINE ? arithmeticMatches : arithmeticMatches && !hasLegacyBaseline,
        eventCount: eventLog.length,
        hasLegacyBaseline,
    };
}
