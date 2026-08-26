import { atom } from "nanostores";
import { PERKS_TIERS, KILLER_LADDER, CHARACTER_TIERS } from "../data/data_storage";

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

function readStoredState(): Partial<AppStorage> {
    if (typeof window === "undefined" || !window.localStorage) {
        return {};
    }

    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return {};
        return JSON.parse(saved);
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

// Perk progression mode order — 4 purchases of one tier unlocks the next.
export const PERK_TIER_ORDER: (keyof typeof PERKS_TIERS)[] = ["F", "D", "C", "A", "S"];
export const PERK_TIER_UNLOCK_COUNT = 4;

const PERK_SLOT_COUNT = 4;
const ADDON_SLOT_COUNT = 2;

export interface AppStorage {
    points: number;
    inventory: InventoryItem[];
    wantedCards: Record<string, number>;
    killerIndex: number;
    reachedMaxKiller: boolean;
    perkSlots: (EquippedPerk | null)[];
    addonSlots: number[];
    pendingPerk: EquippedPerk | null;
    gameMode: GameMode | null;
    singleKillerMode: boolean;
    perkMode: PerkMode;
    perkTierPurchaseCounts: Record<string, number>;
    mainBountyClaimed: boolean;
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

function normalizeKillerIndex(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n >= KILLER_LADDER.length) return 0;
    return n;
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

function buildInitialState(saved: Partial<AppStorage>): AppStorage {
    return {
        points: saved.points ?? 0,
        inventory: initialInventory,
        wantedCards: saved.wantedCards ?? {},
        killerIndex: normalizeKillerIndex(saved.killerIndex),
        reachedMaxKiller: saved.reachedMaxKiller === true,
        perkSlots: normalizePerkSlots(saved.perkSlots),
        addonSlots: normalizeAddonSlots(saved.addonSlots),
        pendingPerk: saved.pendingPerk ?? null,
        gameMode: saved.gameMode === "sheriff" || saved.gameMode === "blacklist" ? saved.gameMode : null,
        singleKillerMode: saved.singleKillerMode === true,
        perkMode: saved.perkMode === "progression" ? "progression" : "normal",
        perkTierPurchaseCounts: normalizePerkTierPurchaseCounts(saved.perkTierPurchaseCounts),
        mainBountyClaimed: saved.mainBountyClaimed === true,
    };
}

export const appStorage = atom<AppStorage>(buildInitialState(savedState));

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

// ---------- run setup (chosen once, before the first visit to the board) ----------
export function getGameMode() {
    return appStorage.get().gameMode;
}

export function isSingleKillerMode() {
    return appStorage.get().singleKillerMode;
}

export function getPerkMode() {
    return appStorage.get().perkMode;
}

// Commits all run-setup choices in one go and persists them.
export function startRun(options: {
    singleKillerMode: boolean;
    perkMode: PerkMode;
    gameMode: GameMode;
    killerIndex?: number;
}) {
    const currentState = appStorage.get();
    const newState: AppStorage = {
        ...currentState,
        singleKillerMode: options.singleKillerMode,
        perkMode: options.perkMode,
        gameMode: options.gameMode,
        killerIndex:
            options.killerIndex !== undefined
                ? normalizeKillerIndex(options.killerIndex)
                : currentState.killerIndex,
    };
    appStorage.set(newState);
    saveState(newState);
}

// ---------- killer ladder ----------
export function getKillerIndex() {
    return appStorage.get().killerIndex;
}

export function getCurrentKiller() {
    return KILLER_LADDER[appStorage.get().killerIndex];
}

export function isMaxKiller(index: number = getKillerIndex()): boolean {
    return index >= KILLER_LADDER.length - 1;
}

function pickRandomKillerIndex(excludeIndex: number): number {
    if (KILLER_LADDER.length <= 1) return excludeIndex;

    let next = excludeIndex;
    while (next === excludeIndex) {
        next = Math.floor(Math.random() * KILLER_LADDER.length);
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
            patch.killerIndex = pickRandomKillerIndex(currentState.killerIndex);
        } else {
            const nextIndex = Math.min(currentState.killerIndex + 1, KILLER_LADDER.length - 1);
            patch.killerIndex = nextIndex;
            if (nextIndex >= KILLER_LADDER.length - 1) {
                patch.reachedMaxKiller = true;
            }
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

    const newState: AppStorage = { ...currentState, perkSlots, pendingPerk: null };
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

    const newState: AppStorage = {
        ...currentState,
        points: currentState.points - item.price,
        addonSlots,
    };
    appStorage.set(newState);
    saveState(newState);

    return true;
}

// ---------- main bounty ----------
// A flat, one-per-run bounty. Toggling it off again (undoing a misclick)
// reverses both the points and the claimed flag.
export function toggleMainBounty(): { claimed: boolean; delta: number } {
    const currentState = appStorage.get();
    const claimed = !currentState.mainBountyClaimed;

    const newState: AppStorage = { ...currentState, mainBountyClaimed: claimed };
    appStorage.set(newState);
    saveState(newState);

    return { claimed, delta: claimed ? MAIN_BOUNTY.worth : -MAIN_BOUNTY.worth };
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
    return JSON.stringify(persisted, null, 2);
}

export function importSave(json: string): { success: boolean; error?: string } {
    let parsed: unknown;

    try {
        parsed = JSON.parse(json);
    } catch {
        return { success: false, error: "That file isn't valid JSON." };
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { success: false, error: "That file doesn't look like a save." };
    }

    const freshState = buildInitialState(parsed as Partial<AppStorage>);
    appStorage.set(freshState);
    saveState(freshState);

    return { success: true };
}

function saveState(state: AppStorage) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        const { inventory, ...persisted } = state;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
        // storage unavailable
    }
}

export function getWantedCardKills(name: string): number {
    const raw = appStorage.get().wantedCards[name];
    if (typeof raw === "boolean") return raw ? 1 : 0;
    return raw ?? 0;
}

export function setWantedCardKills(name: string, value: number) {
    const currentState = appStorage.get();
    const newState = {
        ...currentState,
        wantedCards: { ...currentState.wantedCards, [name]: Math.max(0, value) },
    };
    appStorage.set(newState);
    saveState(newState);
}
