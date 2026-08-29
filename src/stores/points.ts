import { atom } from "nanostores";
import { PERKS_TIERS, KILLER_LADDER, CHARACTER_TIERS } from "../data/data_storage";
import { obfuscate, deobfuscate } from "../lib/obfuscate";
import { appendToChain, verifyRun, GENESIS_HASH, type ReplayResult, type VerifyResult } from "../lib/event-log";

const MAIN_BOUNTY = CHARACTER_TIERS.MAIN_BOUNTY;

interface InventoryItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category?: "perk" | "add-on" | "killer";
    perkTier?: keyof typeof PERKS_TIERS;
}

export interface EquippedPerk {
    name: string;
    tier: string;
}

export type GameMode = "sheriff" | "blacklist";
export type PerkMode = "normal" | "progression";

const STORAGE_KEY = "game-storage";

// Old saves went through zero, one, or two prior formats: plain JSON,
// then JS-obfuscated, now WASM-obfuscated. Try deobfuscating (which
// itself tries WASM then legacy JS) and fall back to plain JSON so
// nothing written by an earlier version of this site fails to load.
function readStoredState(): Partial<AppStorage> {
    if (typeof window === "undefined" || !window.localStorage) {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const deobfuscated = deobfuscate(raw);
        if (deobfuscated) {
            try {
                return JSON.parse(deobfuscated);
            } catch {
                // fall through
            }
        }

        return JSON.parse(raw);
    } catch {
        return {};
    }
}

const savedState = readStoredState();

const initialInventory: InventoryItem[] = [
    {
        id: "f-tier-perk",
        name: "F Tier Perk",
        description: "The first steps of a killer finding their path.",
        price: 10,
        category: "perk",
        perkTier: "F",
    },
    {
        id: "d-tier-perk",
        name: "D Tier Perk",
        description: "Basic techniques learned on the trail.",
        price: 25,
        category: "perk",
        perkTier: "D",
    },
    {
        id: "c-tier-perk",
        name: "C Tier Perk",
        description: "Reliable skills earned through countless hunts.",
        price: 50,
        category: "perk",
        perkTier: "C",
    },
    {
        id: "a-tier-perk",
        name: "A Tier Perk",
        description: "Powerful techniques feared across the Deadlands.",
        price: 75,
        category: "perk",
        perkTier: "A",
    },
    {
        id: "s-tier-perk",
        name: "S Tier Perk",
        description:
            "Abilities spoken of in whispers. Only the deadliest hunters reach this level.",
        price: 100,
        category: "perk",
        perkTier: "S",
    },
    {
        id: "killer-upgrade",
        name: "Killer Upgrade",
        description: "Become a more deadly presence across the Deadlands.",
        price: 25,
        category: "killer",
    },
    {
        id: "killer-upgrade-free",
        name: "Free Killer Upgrade (2 wins in a row)",
        description:
            "Two successful hunts prove your mastery. Earn a free upgrade and continue building your killer's legend.",
        price: 0,
        category: "killer",
    },
    {
        id: "add-on",
        name: "Add-on upgrade",
        description:
            "Reinforce your tools of the hunt with improved modifications and forbidden craftsmanship. Pick a slot to push its rarity one tier higher.",
        price: 25,
        category: "add-on",
    },
];

export const ADDON_TIERS = ["None", "Brown", "Green", "Blue", "Purple", "Iridescent"] as const;
export const ADDON_TIER_COLORS: Record<(typeof ADDON_TIERS)[number], string> = {
    None: "#7a7f85",
    Brown: "#a9713f",
    Green: "#3fae52",
    Blue: "#3f8cd6",
    Purple: "#a256d6",
    Iridescent: "#d6336c",
};

export const PERK_TIER_ORDER: (keyof typeof PERKS_TIERS)[] = ["F", "D", "C", "A", "S"];
export const PERK_TIER_UNLOCK_COUNT = 4;

const PERK_SLOT_COUNT = 4;
const ADDON_SLOT_COUNT = 2;

export interface AppStorage {
    points: number;
    inventory: InventoryItem[];
    wantedCards: Record<string, number>;
    killerName: string;
    reachedMaxKiller: boolean;
    perkSlots: (EquippedPerk | null)[];
    addonSlots: number[];
    pendingPerk: EquippedPerk | null;
    gameMode: GameMode | null;
    singleKillerMode: boolean;
    perkMode: PerkMode;
    perkTierPurchaseCounts: Record<string, number>;
    mainBountyClaimed: boolean;
    // Whether the player has dismissed the one-time notice explaining
    // that this save has a legacy baseline (see logBaseline above).
    // Persisted so it survives export/import along with everything else.
    legacyNoticeSeen: boolean;
    eventLog: string[];
    logHash: string;
    // Captured once, the moment a save is first seen with an empty
    // event log — whether that's a brand new save (baseline is a
    // no-op zero) or one that predates event logging entirely
    // (baseline captures whatever it already had). Never recomputed
    // after that, so verification always compares against a fair
    // starting point instead of assuming everyone started at zero.
    logBaseline: ReplayResult;
}

function normalizePerkSlots(raw: unknown): (EquippedPerk | null)[] {
    if (!Array.isArray(raw)) {
        return Array(PERK_SLOT_COUNT).fill(null);
    }

    const slots = raw.slice(0, PERK_SLOT_COUNT).map((entry) => {
        if (entry && typeof entry === "object" && "name" in entry) {
            return entry as EquippedPerk;
        }
        if (typeof entry === "string") {
            return { name: entry, tier: "?" };
        }
        return null;
    });

    while (slots.length < PERK_SLOT_COUNT) slots.push(null);

    return slots;
}

function normalizeAddonSlots(raw: unknown): number[] {
    if (!Array.isArray(raw)) {
        return Array(ADDON_SLOT_COUNT).fill(0);
    }

    const slots = raw
        .slice(0, ADDON_SLOT_COUNT)
        .map((v) => Math.max(0, Math.min(ADDON_TIERS.length - 1, Number(v) || 0)));

    while (slots.length < ADDON_SLOT_COUNT) slots.push(0);

    return slots;
}

function normalizeKillerName(raw: unknown, legacyIndex: unknown): string {
    if (typeof raw === "string" && KILLER_LADDER.some((k) => k.img_name === raw)) {
        return raw;
    }

    const idx = Number(legacyIndex);
    if (Number.isFinite(idx) && idx >= 0 && idx < KILLER_LADDER.length) {
        return KILLER_LADDER[idx].img_name;
    }

    return KILLER_LADDER[0].img_name;
}

function normalizePerkTierPurchaseCounts(raw: unknown): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const tier of PERK_TIER_ORDER) counts[tier] = 0;

    if (raw && typeof raw === "object") {
        for (const tier of PERK_TIER_ORDER) {
            const value = (raw as Record<string, unknown>)[tier];
            if (typeof value === "number" && Number.isFinite(value)) {
                counts[tier] = Math.max(0, value);
            }
        }
    }

    return counts;
}

function normalizeEventLog(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry): entry is string => typeof entry === "string");
}

function normalizeLogBaseline(
    saved: Partial<AppStorage>,
    eventLog: string[],
): { baseline: ReplayResult; freshlyCaptured: boolean } {
    if (
        saved.logBaseline &&
        typeof saved.logBaseline === "object" &&
        typeof (saved.logBaseline as ReplayResult).points === "number"
    ) {
        const baseline = saved.logBaseline as ReplayResult;
        return { baseline: { points: baseline.points, wantedCards: baseline.wantedCards ?? {} }, freshlyCaptured: false };
    }

    if (eventLog.length > 0) {
        return { baseline: { points: 0, wantedCards: {} }, freshlyCaptured: false };
    }

    return {
        baseline: {
            points: saved.points ?? 0,
            wantedCards: saved.wantedCards ?? {},
        },
        freshlyCaptured: true,
    };
}

function buildInitialState(saved: Partial<AppStorage> & { killerIndex?: number }): AppStorage {
    let eventLog = normalizeEventLog(saved.eventLog);
    let logHash = typeof saved.logHash === "string" ? saved.logHash : GENESIS_HASH;

    const { baseline, freshlyCaptured } = normalizeLogBaseline(saved, eventLog);
    const baselineNonTrivial = baseline.points > 0 || Object.keys(baseline.wantedCards).length > 0;

    // A save with real progress but no prior log gets one explicit,
    // visible marker recording that fact, rather than silently folding
    // it in — see TRUST_LEGACY_BASELINE in lib/event-log.ts.
    if (freshlyCaptured && baselineNonTrivial) {
        const marked = appendToChain(eventLog, logHash, `L:${baseline.points}:${Object.keys(baseline.wantedCards).length}`);
        eventLog = marked.eventLog;
        logHash = marked.logHash;
    }

    return {
        points: saved.points ?? 0,
        inventory: initialInventory,
        wantedCards: saved.wantedCards ?? {},
        killerName: normalizeKillerName(saved.killerName, saved.killerIndex),
        reachedMaxKiller: saved.reachedMaxKiller === true,
        perkSlots: normalizePerkSlots(saved.perkSlots),
        addonSlots: normalizeAddonSlots(saved.addonSlots),
        pendingPerk: saved.pendingPerk ?? null,
        gameMode: saved.gameMode === "sheriff" || saved.gameMode === "blacklist" ? saved.gameMode : null,
        singleKillerMode: saved.singleKillerMode === true,
        perkMode: saved.perkMode === "progression" ? "progression" : "normal",
        perkTierPurchaseCounts: normalizePerkTierPurchaseCounts(saved.perkTierPurchaseCounts),
        mainBountyClaimed: saved.mainBountyClaimed === true,
        legacyNoticeSeen: saved.legacyNoticeSeen === true,
        eventLog,
        logHash,
        logBaseline: baseline,
    };
}

export const appStorage = atom<AppStorage>(buildInitialState(savedState));

// ---------- event log ----------
function withLogEntry(state: AppStorage, code: string, payload: string): Pick<AppStorage, "eventLog" | "logHash"> {
    return appendToChain(state.eventLog, state.logHash, `${code}:${payload}`);
}

export function getLogVerification(): VerifyResult {
    const state = appStorage.get();
    return verifyRun(state.eventLog, state.logHash, state.logBaseline, state.points, state.wantedCards);
}

export function hasLegacyNoticeBeenSeen(): boolean {
    return appStorage.get().legacyNoticeSeen;
}

export function markLegacyNoticeSeen() {
    const newState = { ...appStorage.get(), legacyNoticeSeen: true };
    appStorage.set(newState);
    saveState(newState);
}

export function setPoints(value: number) {
    const newState = { ...appStorage.get(), points: value };
    appStorage.set(newState);
    saveState(newState);
}

export function addPoints(amount: number) {
    setPoints(appStorage.get().points + amount);
}

export function getPoints() {
    return appStorage.get().points;
}

export function getInventory() {
    return appStorage.get().inventory;
}

export function updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const currentState = appStorage.get();
    const newState = {
        ...currentState,
        inventory: currentState.inventory.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    };
    appStorage.set(newState);
    saveState(newState);
}

export function removeInventoryItem(id: string) {
    const currentState = appStorage.get();
    const newState = {
        ...currentState,
        inventory: currentState.inventory.filter((item) => item.id !== id),
    };
    appStorage.set(newState);
    saveState(newState);
}

export function canAffordItem(itemId: string): boolean {
    const currentState = appStorage.get();
    const item = currentState.inventory.find((item) => item.id === itemId);
    return item ? currentState.points >= item.price : false;
}

export function canAffordAddonUpgrade(): boolean {
    return canAffordItem("add-on");
}

// ---------- run setup ----------
export function getGameMode() {
    return appStorage.get().gameMode;
}

export function isSingleKillerMode() {
    return appStorage.get().singleKillerMode;
}

export function getPerkMode() {
    return appStorage.get().perkMode;
}

export function startRun(options: {
    singleKillerMode: boolean;
    perkMode: PerkMode;
    gameMode: GameMode;
    killerName?: string;
}) {
    const currentState = appStorage.get();
    const killerName =
        options.killerName && KILLER_LADDER.some((k) => k.img_name === options.killerName)
            ? options.killerName
            : currentState.killerName;

    const logPatch = withLogEntry(
        currentState,
        "M",
        `${options.gameMode}:${options.singleKillerMode ? "single" : "free"}:${options.perkMode}:${killerName}`,
    );

    const newState: AppStorage = {
        ...currentState,
        singleKillerMode: options.singleKillerMode,
        perkMode: options.perkMode,
        gameMode: options.gameMode,
        killerName,
        ...logPatch,
    };
    appStorage.set(newState);
    saveState(newState);
}

// ---------- killer ladder ----------
export function getCurrentKiller() {
    return KILLER_LADDER.find((k) => k.img_name === appStorage.get().killerName) ?? KILLER_LADDER[0];
}

export function getKillerLadderPosition(name: string = appStorage.get().killerName): number {
    const idx = KILLER_LADDER.findIndex((k) => k.img_name === name);
    return idx === -1 ? 0 : idx;
}

export function isMaxKiller(name: string = appStorage.get().killerName): boolean {
    return getKillerLadderPosition(name) >= KILLER_LADDER.length - 1;
}

function pickRandomKillerName(excludeName: string): string {
    if (KILLER_LADDER.length <= 1) return excludeName;

    let next = excludeName;
    while (next === excludeName) {
        next = KILLER_LADDER[Math.floor(Math.random() * KILLER_LADDER.length)].img_name;
    }
    return next;
}

export function getPerkSlots() {
    return appStorage.get().perkSlots;
}

export function getAddonSlots() {
    return appStorage.get().addonSlots;
}

export function getPendingPerk() {
    return appStorage.get().pendingPerk;
}

// ---------- perk progression ----------
export function getPerkTierPurchaseCounts() {
    return appStorage.get().perkTierPurchaseCounts;
}

export function isPerkTierUnlocked(tier: string, state: AppStorage = appStorage.get()): boolean {
    if (state.perkMode === "normal") return true;

    const index = PERK_TIER_ORDER.indexOf(tier as (typeof PERK_TIER_ORDER)[number]);
    if (index <= 0) return true;

    const previousTier = PERK_TIER_ORDER[index - 1];
    return (state.perkTierPurchaseCounts[previousTier] ?? 0) >= PERK_TIER_UNLOCK_COUNT;
}

function rollPerkForTier(tier: keyof typeof PERKS_TIERS, currentSlots: (EquippedPerk | null)[]): string | null {
    const pool = PERKS_TIERS[tier] ?? [];
    const equippedNames = new Set(currentSlots.filter(Boolean).map((s) => s!.name));
    const available = pool.filter((name) => !equippedNames.has(name));

    if (available.length === 0) return null;

    return available[Math.floor(Math.random() * available.length)];
}

export function purchaseItem(itemId: string): boolean {
    const currentState = appStorage.get();
    const item = currentState.inventory.find((item) => item.id === itemId);

    if (!item || item.category === "add-on") return false;
    if (!canAffordItem(itemId)) return false;

    let patch: Partial<AppStorage> = {
        points: currentState.points - item.price,
    };

    if (item.category === "killer") {
        if (currentState.singleKillerMode) return false;

        if (currentState.reachedMaxKiller) {
            const newKiller = pickRandomKillerName(currentState.killerName);
            patch.killerName = newKiller;
            Object.assign(patch, withLogEntry(currentState, "R", `${newKiller}:${item.price}`));
        } else {
            const position = getKillerLadderPosition(currentState.killerName);
            const nextPosition = Math.min(position + 1, KILLER_LADDER.length - 1);
            const newKiller = KILLER_LADDER[nextPosition].img_name;
            patch.killerName = newKiller;
            if (nextPosition >= KILLER_LADDER.length - 1) {
                patch.reachedMaxKiller = true;
            }
            Object.assign(patch, withLogEntry(currentState, "Y", `${newKiller}:${item.price}`));
        }
    } else if (item.category === "perk") {
        if (!item.perkTier) return false;
        if (currentState.pendingPerk) return false;
        if (!isPerkTierUnlocked(item.perkTier, currentState)) return false;

        const rolled = rollPerkForTier(item.perkTier, currentState.perkSlots);
        if (!rolled) return false;

        patch.pendingPerk = { name: rolled, tier: item.perkTier };
        patch.perkTierPurchaseCounts = {
            ...currentState.perkTierPurchaseCounts,
            [item.perkTier]: (currentState.perkTierPurchaseCounts[item.perkTier] ?? 0) + 1,
        };
        Object.assign(patch, withLogEntry(currentState, "P", `${item.perkTier}:${rolled}:${item.price}`));
    }

    const newState = { ...currentState, ...patch };
    appStorage.set(newState);
    saveState(newState);

    return true;
}

export function equipPendingPerk(slotIndex: number): boolean {
    const currentState = appStorage.get();
    const pending = currentState.pendingPerk;

    if (!pending) return false;
    if (slotIndex < 0 || slotIndex >= currentState.perkSlots.length) return false;

    const perkSlots = [...currentState.perkSlots];
    perkSlots[slotIndex] = pending;

    const logPatch = withLogEntry(currentState, "E", `${slotIndex}:${pending.name}:${pending.tier}`);

    const newState: AppStorage = { ...currentState, perkSlots, pendingPerk: null, ...logPatch };
    appStorage.set(newState);
    saveState(newState);

    return true;
}

export function purchaseAddonUpgrade(slotIndex: number): boolean {
    const currentState = appStorage.get();
    const item = currentState.inventory.find((i) => i.category === "add-on");

    if (!item) return false;
    if (slotIndex < 0 || slotIndex >= currentState.addonSlots.length) return false;
    if (currentState.addonSlots[slotIndex] >= ADDON_TIERS.length - 1) return false;
    if (currentState.points < item.price) return false;

    const addonSlots = [...currentState.addonSlots];
    addonSlots[slotIndex] += 1;

    const logPatch = withLogEntry(
        currentState,
        "A",
        `${slotIndex}:${ADDON_TIERS[addonSlots[slotIndex]]}:${item.price}`,
    );

    const newState: AppStorage = {
        ...currentState,
        points: currentState.points - item.price,
        addonSlots,
        ...logPatch,
    };
    appStorage.set(newState);
    saveState(newState);

    return true;
}

// ---------- main bounty ----------
export function toggleMainBounty(): { claimed: boolean } {
    const currentState = appStorage.get();
    const claimed = !currentState.mainBountyClaimed;
    const name = MAIN_BOUNTY.survivor;

    const previousKills = currentState.wantedCards[name] ?? 0;
    const newKills = Math.max(0, previousKills + (claimed ? 1 : -1));

    const logPatch = withLogEntry(currentState, "B", `${claimed ? "claim" : "undo"}:${name}:${MAIN_BOUNTY.worth}`);

    const newState: AppStorage = {
        ...currentState,
        mainBountyClaimed: claimed,
        points: currentState.points + (claimed ? 1 : -1) * MAIN_BOUNTY.worth,
        wantedCards: { ...currentState.wantedCards, [name]: newKills },
        ...logPatch,
    };
    appStorage.set(newState);
    saveState(newState);

    return { claimed };
}

export function isMainBountyClaimed() {
    return appStorage.get().mainBountyClaimed;
}

export function resetProgress() {
    const freshState = buildInitialState({});
    appStorage.set(freshState);

    if (typeof window !== "undefined" && window.localStorage) {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // storage unavailable
        }
    }
}

export function exportSave(): string {
    const { inventory, ...persisted } = appStorage.get();
    return obfuscate(JSON.stringify(persisted));
}

export function importSave(text: string): { success: boolean; error?: string } {
    let jsonText = deobfuscate(text.trim());

    if (!jsonText) {
        jsonText = text;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return { success: false, error: "That file isn't a save this site produced." };
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { success: false, error: "That file doesn't look like a save." };
    }

    let freshState = buildInitialState(parsed as Partial<AppStorage>);
    const logPatch = withLogEntry(freshState, "I", "import");
    freshState = { ...freshState, ...logPatch };

    appStorage.set(freshState);
    saveState(freshState);

    return { success: true };
}

function saveState(state: AppStorage) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        const { inventory, ...persisted } = state;
        window.localStorage.setItem(STORAGE_KEY, obfuscate(JSON.stringify(persisted)));
    } catch {
        // storage unavailable
    }
}

export function getWantedCardKills(name: string): number {
    const raw = appStorage.get().wantedCards[name];
    if (typeof raw === "boolean") return raw ? 1 : 0;
    return raw ?? 0;
}

// God mode only: adjusts a kill count directly, with no log entry and no
// points change. Real gameplay goes through registerKill() instead.
export function setWantedCardKills(name: string, value: number) {
    const currentState = appStorage.get();
    const clamped = Math.max(0, value);

    const newState = {
        ...currentState,
        wantedCards: { ...currentState.wantedCards, [name]: clamped },
    };
    appStorage.set(newState);
    saveState(newState);
}

// The one path real gameplay uses to log a kill or an undo: points,
// wantedCards, and the log entry all move together, so there's no way
// to update one without the others.
export function registerKill(name: string, delta: 1 | -1, rewardPerKill: number) {
    const currentState = appStorage.get();
    const previous = currentState.wantedCards[name] ?? 0;
    const newCount = Math.max(0, previous + delta);
    const actualDelta = newCount - previous;

    if (actualDelta === 0) return;

    const logPatch = withLogEntry(currentState, actualDelta > 0 ? "K" : "U", `${name}:${rewardPerKill}`);

    const newState: AppStorage = {
        ...currentState,
        points: currentState.points + actualDelta * rewardPerKill,
        wantedCards: { ...currentState.wantedCards, [name]: newCount },
        ...logPatch,
    };
    appStorage.set(newState);
    saveState(newState);
}

// ---------- god mode ----------
// Direct state overrides for local testing. None of these write to the
// event log — that's intentional (see verifyRun in event-log.ts): a
// change made here shows up later as a mismatch between the log's
// replayed state and the save's actual state, without needing a
// separate "god mode was used" marker.
export function godSetPoints(value: number) {
    setPoints(Math.max(0, Math.floor(value)));
}

export function godSetKiller(name: string) {
    if (!KILLER_LADDER.some((k) => k.img_name === name)) return;
    const newState = { ...appStorage.get(), killerName: name };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetReachedMaxKiller(value: boolean) {
    const newState = { ...appStorage.get(), reachedMaxKiller: value };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetPerkSlot(slotIndex: number, perk: EquippedPerk | null) {
    const currentState = appStorage.get();
    if (slotIndex < 0 || slotIndex >= currentState.perkSlots.length) return;

    const perkSlots = [...currentState.perkSlots];
    perkSlots[slotIndex] = perk;

    const newState = { ...currentState, perkSlots };
    appStorage.set(newState);
    saveState(newState);
}

export function godClearPendingPerk() {
    const newState = { ...appStorage.get(), pendingPerk: null };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetAddonSlot(slotIndex: number, tierIndex: number) {
    const currentState = appStorage.get();
    if (slotIndex < 0 || slotIndex >= currentState.addonSlots.length) return;

    const clamped = Math.max(0, Math.min(ADDON_TIERS.length - 1, tierIndex));
    const addonSlots = [...currentState.addonSlots];
    addonSlots[slotIndex] = clamped;

    const newState = { ...currentState, addonSlots };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetGameMode(mode: GameMode) {
    const newState = { ...appStorage.get(), gameMode: mode };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetSingleKillerMode(value: boolean) {
    const newState = { ...appStorage.get(), singleKillerMode: value };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetPerkMode(mode: PerkMode) {
    const newState = { ...appStorage.get(), perkMode: mode };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetMainBountyClaimed(value: boolean) {
    const newState = { ...appStorage.get(), mainBountyClaimed: value };
    appStorage.set(newState);
    saveState(newState);
}
