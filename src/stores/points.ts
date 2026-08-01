import { atom } from "nanostores";
import { PERKS_TIERS } from "../data/data_storage";

// Types for inventory system
interface InventoryItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category?: "perk" | "add-on" | "killer";
    // Only set on category: "perk" items — which PERKS_TIERS bucket to roll from.
    perkTier?: keyof typeof PERKS_TIERS;
}

export interface EquippedPerk {
    name: string;
    tier: string;
}

const STORAGE_KEY = "game-storage";

function readStoredState(): Partial<AppStorage> {
    if (typeof window === "undefined" || !window.localStorage) {
        return {};
    }

    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return {};
        }

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

// Killer rank ladder — starts at the bottom, caps out at S.
export const KILLER_RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;

// Add-on slot rarity ladder.
export const ADDON_TIERS = ["None", "Brown", "Yellow", "Green", "Purple", "Iridescent"] as const;

const PERK_SLOT_COUNT = 4;
const ADDON_SLOT_COUNT = 2;

// Store state
export interface AppStorage {
    points: number;
    inventory: InventoryItem[];
    wantedCards: Record<string, number>;
    killerRank: (typeof KILLER_RANKS)[number];
    perkSlots: (EquippedPerk | null)[];
    addonSlots: number[];
    // A perk that's been rolled (and paid for) but not placed in a slot yet.
    // Persisted so a reload doesn't lose it before the player picks a slot.
    pendingPerk: EquippedPerk | null;
}

function normalizePerkSlots(raw: unknown): (EquippedPerk | null)[] {
    if (!Array.isArray(raw)) {
        return Array(PERK_SLOT_COUNT).fill(null);
    }

    const slots = raw.slice(0, PERK_SLOT_COUNT).map((entry) => {
        if (entry && typeof entry === "object" && "name" in entry) {
            return entry as EquippedPerk;
        }
        // Backwards compatibility, in case an earlier shape ever stored plain strings.
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

const initialAppStorage: AppStorage = {
    points: savedState.points ?? 0,
    // The catalog itself is static and code-defined — always start fresh from
    // here rather than trusting a possibly-stale saved shape.
    inventory: initialInventory,
    wantedCards: savedState.wantedCards ?? {},
    killerRank: (KILLER_RANKS as readonly string[]).includes(savedState.killerRank as string)
        ? (savedState.killerRank as (typeof KILLER_RANKS)[number])
        : KILLER_RANKS[0],
    perkSlots: normalizePerkSlots(savedState.perkSlots),
    addonSlots: normalizeAddonSlots(savedState.addonSlots),
    pendingPerk: savedState.pendingPerk ?? null,
};

// Main store with TypeScript typing
export const appStorage = atom<AppStorage>(initialAppStorage);

// Point management functions
export function setPoints(value: number) {
    const newState = {
        ...appStorage.get(),
        points: value,
    };

    appStorage.set(newState);

    saveState(newState);
}

export function addPoints(amount: number) {
    const currentState = appStorage.get();
    setPoints(currentState.points + amount);
}

export function getPoints() {
    return appStorage.get().points;
}

// Inventory management functions
export function getInventory() {
    return appStorage.get().inventory;
}

export function updateInventoryItem(
    id: string,
    updates: Partial<InventoryItem>,
) {
    const currentState = appStorage.get();

    const newState = {
        ...currentState,
        inventory: currentState.inventory.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
        ),
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

// Helper to check if player can afford an item
export function canAffordItem(itemId: string): boolean {
    const currentState = appStorage.get();
    const item = currentState.inventory.find((item) => item.id === itemId);
    return item ? currentState.points >= item.price : false;
}

export function canAffordAddonUpgrade(): boolean {
    return canAffordItem("add-on");
}

export function getKillerRank() {
    return appStorage.get().killerRank;
}

export function isMaxKillerRank(rank: string = getKillerRank()): boolean {
    return rank === KILLER_RANKS[KILLER_RANKS.length - 1];
}

function nextRank(current: string): (typeof KILLER_RANKS)[number] {
    const idx = (KILLER_RANKS as readonly string[]).indexOf(current);
    if (idx === -1) return KILLER_RANKS[0];
    return KILLER_RANKS[Math.min(idx + 1, KILLER_RANKS.length - 1)];
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

// Picks a random, not-currently-equipped perk from the given tier.
// Returns null if every perk in that tier is already equipped (rare, but
// possible on the smallest tiers).
function rollPerkForTier(
    tier: keyof typeof PERKS_TIERS,
    currentSlots: (EquippedPerk | null)[],
): string | null {
    const pool = PERKS_TIERS[tier] ?? [];
    const equippedNames = new Set(currentSlots.filter(Boolean).map((s) => s!.name));
    const available = pool.filter((name) => !equippedNames.has(name));

    if (available.length === 0) return null;

    return available[Math.floor(Math.random() * available.length)];
}

// Helper to purchase a "perk" or "killer" item. Add-on purchases go through
// purchaseAddonUpgrade() instead, since they need a target slot.
export function purchaseItem(itemId: string): boolean {
    const currentState = appStorage.get();
    const item = currentState.inventory.find((item) => item.id === itemId);

    if (!item || item.category === "add-on") return false;
    if (!canAffordItem(itemId)) return false;

    let patch: Partial<AppStorage> = {
        points: currentState.points - item.price,
    };

    if (item.category === "killer") {
        if (isMaxKillerRank(currentState.killerRank)) return false;
        patch.killerRank = nextRank(currentState.killerRank);
    } else if (item.category === "perk") {
        if (!item.perkTier) return false;

        const rolled = rollPerkForTier(item.perkTier, currentState.perkSlots);
        if (!rolled) return false; // every perk in this tier is already equipped

        patch.pendingPerk = { name: rolled, tier: item.perkTier };
    }

    const newState = { ...currentState, ...patch };

    appStorage.set(newState);
    saveState(newState);

    return true;
}

// Place a rolled (pending) perk into one of the 4 slots, permanently
// replacing whatever was equipped there before.
export function equipPendingPerk(slotIndex: number): boolean {
    const currentState = appStorage.get();
    const pending = currentState.pendingPerk;

    if (!pending) return false;
    if (slotIndex < 0 || slotIndex >= currentState.perkSlots.length) return false;

    const perkSlots = [...currentState.perkSlots];
    perkSlots[slotIndex] = pending;

    const newState: AppStorage = {
        ...currentState,
        perkSlots,
        pendingPerk: null,
    };

    appStorage.set(newState);
    saveState(newState);

    return true;
}

// Buy an add-on upgrade for a specific slot, bumping its rarity tier by one.
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

function saveState(state: AppStorage) {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }

    try {
        // The inventory catalog is static and code-defined — no need to persist it.
        const { inventory, ...persisted } = state;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
        // storage unavailable
    }
}

// Number of times a given survivor has been sacrificed this run.
// (Older saves stored a boolean here; coerce those to 0/1 so existing
// progress doesn't get wiped out.)
export function getWantedCardKills(name: string): number {
    const raw = appStorage.get().wantedCards[name];

    if (typeof raw === "boolean") {
        return raw ? 1 : 0;
    }

    return raw ?? 0;
}

export function setWantedCardKills(name: string, value: number) {
    const currentState = appStorage.get();

    const newState = {
        ...currentState,
        wantedCards: {
            ...currentState.wantedCards,
            [name]: Math.max(0, value),
        },
    };

    appStorage.set(newState);
    saveState(newState);
}
