import { atom } from "nanostores";
import {
    CHARACTER_TIERS,
    getPerkPool,
    isPtbPerk,
    buildKillerLadder,
    KILLER_TIERLIST_KEYS,
    DEFAULT_KILLER_TIERLIST,
    type KillerTierlistKey,
    type KillerLadderEntry,
    type PerkTierKey,
} from "../data/data_storage";
import { obfuscate, deobfuscate } from "../lib/obfuscate";
import { appendToChain, verifyRun, GENESIS_HASH, type GameStateSnapshot, type VerifyResult } from "../lib/event-log";

const MAIN_BOUNTY = CHARACTER_TIERS.MAIN_BOUNTY;

interface InventoryItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category?: "perk" | "add-on" | "killer";
    perkTier?: PerkTierKey;
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

export const PERK_TIER_ORDER: PerkTierKey[] = ["F", "D", "C", "A", "S"];
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
    // A PTB perk stays the real, stored value of its slot forever (until a
    // new purchase replaces it) — this is the stand-in shown instead while
    // PTB is off, rolled once and reused so it doesn't change on every
    // toggle or reload. Index-aligned with perkSlots; null where unused.
    // See getDisplayPerkSlots.
    perkSlotPtbSubstitutes: (string | null)[];
    addonSlots: number[];
    pendingPerk: EquippedPerk | null;
    gameMode: GameMode | null;
    singleKillerMode: boolean;
    perkMode: PerkMode;
    killerTierlist: KillerTierlistKey;
    // Whether PTB (public test build) content — killers/perks/survivors staged
    // in PTB_INJECT — shows up and can be selected. A per-player choice, not a
    // site-wide flag: toggling it never mutates killerName/wantedCards, only
    // what's currently offered/rendered (see getCurrentKiller).
    ptbActive: boolean;
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
    // no-op zero/empty snapshot) or one that predates event logging
    // entirely (baseline captures whatever it already had). Never
    // recomputed after that, so verification always compares against
    // a fair starting point instead of assuming everyone started at
    // zero with no perks, no add-ons, and the default killer.
    logBaseline: GameStateSnapshot;
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

function normalizePerkSlotPtbSubstitutes(raw: unknown): (string | null)[] {
    const slots = Array.isArray(raw)
        ? raw.slice(0, PERK_SLOT_COUNT).map((v) => (typeof v === "string" ? v : null))
        : [];

    while (slots.length < PERK_SLOT_COUNT) slots.push(null);

    return slots;
}

// A random (not deterministic) same-tier perk, excluding PTB content —
// only called when a slot actually needs a stand-in, and the result gets
// persisted immediately so it doesn't change again until it's cleared.
function rollPtbSubstitute(tier: string): string | null {
    const pool = getPerkPool(tier as PerkTierKey, false);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Fills in a stand-in for any slot currently holding a PTB perk that
// doesn't already have one recorded, leaving existing ones untouched.
function ensurePtbSubstitutes(
    perkSlots: (EquippedPerk | null)[],
    substitutes: (string | null)[],
): (string | null)[] {
    return perkSlots.map((slot, i) => {
        if (substitutes[i]) return substitutes[i];
        if (slot && isPtbPerk(slot.name)) return rollPtbSubstitute(slot.tier);
        return substitutes[i] ?? null;
    });
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

function normalizeKillerTierlist(raw: unknown): KillerTierlistKey {
    return (KILLER_TIERLIST_KEYS as readonly string[]).includes(raw as string)
        ? (raw as KillerTierlistKey)
        : DEFAULT_KILLER_TIERLIST;
}

// Validated against the PTB-inclusive ladder, regardless of the current PTB
// toggle — so a saved killer tied to PTB content is never discarded just
// because the player currently has PTB content switched off.
function normalizeKillerName(raw: unknown, legacyIndex: unknown, inclusiveLadder: KillerLadderEntry[]): string {
    if (typeof raw === "string" && inclusiveLadder.some((k) => k.img_name === raw)) {
        return raw;
    }

    const idx = Number(legacyIndex);
    if (Number.isFinite(idx) && idx >= 0 && idx < inclusiveLadder.length) {
        return inclusiveLadder[idx].img_name;
    }

    return inclusiveLadder[0].img_name;
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
    current: Pick<AppStorage, "points" | "wantedCards" | "perkSlots" | "addonSlots" | "killerName">,
): { baseline: GameStateSnapshot; freshlyCaptured: boolean } {
    const existing = saved.logBaseline as Partial<GameStateSnapshot> | undefined;

    if (existing && typeof existing === "object" && typeof existing.points === "number") {
        // Saves captured before perk/add-on/killer tracking existed only
        // have points/wantedCards here. Backfill the rest the same way
        // those were originally trusted: whatever's already on the save
        // the first time this richer check sees it. One-time, same as
        // the points/wantedCards policy — never re-captured after this.
        const hasSlotData =
            Array.isArray(existing.perkSlots) && Array.isArray(existing.addonSlots) && typeof existing.killerName === "string";

        return {
            baseline: {
                points: existing.points,
                wantedCards: existing.wantedCards ?? {},
                perkSlots: hasSlotData ? existing.perkSlots! : current.perkSlots,
                addonSlots: hasSlotData ? existing.addonSlots! : current.addonSlots,
                killerName: hasSlotData ? existing.killerName! : current.killerName,
            },
            freshlyCaptured: false,
        };
    }

    if (eventLog.length > 0) {
        // Log entries exist but no baseline was ever recorded (shouldn't
        // happen in practice, but defend against it) — assume a neutral
        // starting point and trust the log's own E/A/Y/R/M entries to
        // reconstruct the real state.
        return {
            baseline: {
                points: 0,
                wantedCards: {},
                perkSlots: current.perkSlots.map(() => null),
                addonSlots: current.addonSlots.map(() => 0),
                killerName: "",
            },
            freshlyCaptured: false,
        };
    }

    return {
        baseline: {
            points: current.points,
            wantedCards: current.wantedCards,
            perkSlots: current.perkSlots,
            addonSlots: current.addonSlots,
            killerName: current.killerName,
        },
        freshlyCaptured: true,
    };
}

function buildInitialState(saved: Partial<AppStorage> & { killerIndex?: number }): AppStorage {
    let eventLog = normalizeEventLog(saved.eventLog);
    let logHash = typeof saved.logHash === "string" ? saved.logHash : GENESIS_HASH;

    const killerTierlist = normalizeKillerTierlist(saved.killerTierlist);
    const ptbActive = typeof saved.ptbActive === "boolean" ? saved.ptbActive : true;
    const inclusiveLadder = buildKillerLadder(killerTierlist, true);

    const points = saved.points ?? 0;
    const wantedCards = saved.wantedCards ?? {};
    const killerName = normalizeKillerName(saved.killerName, saved.killerIndex, inclusiveLadder);
    const perkSlots = normalizePerkSlots(saved.perkSlots);
    const addonSlots = normalizeAddonSlots(saved.addonSlots);
    const perkSlotPtbSubstitutes = ptbActive
        ? normalizePerkSlotPtbSubstitutes(saved.perkSlotPtbSubstitutes)
        : ensurePtbSubstitutes(perkSlots, normalizePerkSlotPtbSubstitutes(saved.perkSlotPtbSubstitutes));

    const { baseline, freshlyCaptured } = normalizeLogBaseline(saved, eventLog, {
        points,
        wantedCards,
        perkSlots,
        addonSlots,
        killerName,
    });
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
        points,
        inventory: initialInventory,
        wantedCards,
        killerName,
        reachedMaxKiller: saved.reachedMaxKiller === true,
        perkSlots,
        perkSlotPtbSubstitutes,
        addonSlots,
        pendingPerk: saved.pendingPerk ?? null,
        gameMode: saved.gameMode === "sheriff" || saved.gameMode === "blacklist" ? saved.gameMode : null,
        singleKillerMode: saved.singleKillerMode === true,
        perkMode: saved.perkMode === "progression" ? "progression" : "normal",
        killerTierlist,
        ptbActive,
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
    return verifyRun(state.eventLog, state.logHash, state.logBaseline, {
        points: state.points,
        wantedCards: state.wantedCards,
        perkSlots: state.perkSlots,
        addonSlots: state.addonSlots,
        killerName: state.killerName,
    });
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

export function getKillerTierlist() {
    return appStorage.get().killerTierlist;
}

export function isPtbActive() {
    return appStorage.get().ptbActive;
}

export function setPtbActive(value: boolean) {
    const currentState = appStorage.get();

    // Turning PTB off: lock in a stand-in for any PTB perk currently
    // equipped, right now, so it stays the same across reloads and
    // further toggling instead of being re-picked each time. Turning it
    // back on leaves any already-rolled stand-ins in place, dormant,
    // ready to be reused the next time PTB goes off again.
    const perkSlotPtbSubstitutes = value
        ? currentState.perkSlotPtbSubstitutes
        : ensurePtbSubstitutes(currentState.perkSlots, currentState.perkSlotPtbSubstitutes);

    const newState = { ...currentState, ptbActive: value, perkSlotPtbSubstitutes };
    appStorage.set(newState);
    saveState(newState);
}

export function startRun(options: {
    singleKillerMode: boolean;
    perkMode: PerkMode;
    gameMode: GameMode;
    killerTierlist: KillerTierlistKey;
    ptbActive: boolean;
    killerName?: string;
}) {
    const currentState = appStorage.get();
    const inclusiveLadder = buildKillerLadder(options.killerTierlist, true);
    const killerName =
        options.killerName && inclusiveLadder.some((k) => k.img_name === options.killerName)
            ? options.killerName
            : currentState.killerName;

    const logPatch = withLogEntry(
        currentState,
        "M",
        `${options.gameMode}:${options.singleKillerMode ? "single" : "free"}:${options.perkMode}:${options.killerTierlist}:${options.ptbActive ? "ptb" : "live"}:${killerName}`,
    );

    const newState: AppStorage = {
        ...currentState,
        singleKillerMode: options.singleKillerMode,
        perkMode: options.perkMode,
        gameMode: options.gameMode,
        killerTierlist: options.killerTierlist,
        ptbActive: options.ptbActive,
        killerName,
        ...logPatch,
    };
    appStorage.set(newState);
    saveState(newState);
}

// ---------- killer ladder ----------
// What's currently offered/selectable — respects the PTB toggle.
export function getActiveLadder(state: AppStorage = appStorage.get()): KillerLadderEntry[] {
    return buildKillerLadder(state.killerTierlist, state.ptbActive);
}

// Everything that could ever exist for this tierlist, PTB included — used so
// a saved killer tied to PTB content still resolves correctly even while
// PTB is toggled off.
export function getInclusiveLadder(state: AppStorage = appStorage.get()): KillerLadderEntry[] {
    return buildKillerLadder(state.killerTierlist, true);
}

export function getCurrentKiller(state: AppStorage = appStorage.get()): KillerLadderEntry {
    const active = getActiveLadder(state);
    const found = active.find((k) => k.img_name === state.killerName);
    if (found) return found;

    const inclusive = getInclusiveLadder(state);
    return inclusive.find((k) => k.img_name === state.killerName) ?? active[0] ?? inclusive[0];
}

export function getKillerLadderPosition(name: string = appStorage.get().killerName): number {
    const idx = getActiveLadder().findIndex((k) => k.img_name === name);
    return idx === -1 ? 0 : idx;
}

export function isMaxKiller(name: string = appStorage.get().killerName): boolean {
    const ladder = getActiveLadder();
    return getKillerLadderPosition(name) >= ladder.length - 1;
}

function pickRandomKillerName(excludeName: string): string {
    const ladder = getActiveLadder();
    if (ladder.length <= 1) return excludeName;

    let next = excludeName;
    while (next === excludeName) {
        next = ladder[Math.floor(Math.random() * ladder.length)].img_name;
    }
    return next;
}

export function getPerkSlots() {
    return appStorage.get().perkSlots;
}

// What to actually show for each slot — the real equipped perk, except a
// PTB one while PTB is off, which shows its persisted stand-in instead
// (rolled once in setPtbActive/equipPendingPerk/godSetPerkSlot, never
// re-rolled here).
export function getDisplayPerkSlots(state: AppStorage = appStorage.get()): (EquippedPerk | null)[] {
    if (state.ptbActive) return state.perkSlots;

    return state.perkSlots.map((slot, i) => {
        if (!slot || !isPtbPerk(slot.name)) return slot;
        const substitute = state.perkSlotPtbSubstitutes[i];
        return substitute ? { name: substitute, tier: slot.tier } : slot;
    });
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

function rollPerkForTier(tier: PerkTierKey, currentSlots: (EquippedPerk | null)[]): string | null {
    const pool = getPerkPool(tier, appStorage.get().ptbActive);
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
            const ladder = getActiveLadder(currentState);
            const position = getKillerLadderPosition(currentState.killerName);
            const nextPosition = Math.min(position + 1, ladder.length - 1);
            const newKiller = ladder[nextPosition].img_name;
            patch.killerName = newKiller;
            if (nextPosition >= ladder.length - 1) {
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

    // A new purchase replaces whatever stand-in was tracked for the old
    // perk in this slot. Roll a fresh one immediately if the new perk is
    // itself PTB content and PTB happens to be off right now (e.g. it was
    // rolled while PTB was on, then left pending across a toggle).
    const perkSlotPtbSubstitutes = [...currentState.perkSlotPtbSubstitutes];
    perkSlotPtbSubstitutes[slotIndex] =
        !currentState.ptbActive && isPtbPerk(pending.name) ? rollPtbSubstitute(pending.tier) : null;

    const logPatch = withLogEntry(currentState, "E", `${slotIndex}:${pending.name}:${pending.tier}`);

    const newState: AppStorage = { ...currentState, perkSlots, perkSlotPtbSubstitutes, pendingPerk: null, ...logPatch };
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
    const currentState = appStorage.get();
    if (!getInclusiveLadder(currentState).some((k) => k.img_name === name)) return;
    const newState = { ...currentState, killerName: name };
    appStorage.set(newState);
    saveState(newState);
}

export function godSetKillerTierlist(tierlist: KillerTierlistKey) {
    const newState = { ...appStorage.get(), killerTierlist: tierlist };
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

    const perkSlotPtbSubstitutes = [...currentState.perkSlotPtbSubstitutes];
    perkSlotPtbSubstitutes[slotIndex] =
        perk && !currentState.ptbActive && isPtbPerk(perk.name) ? rollPtbSubstitute(perk.tier) : null;

    const newState = { ...currentState, perkSlots, perkSlotPtbSubstitutes };
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
