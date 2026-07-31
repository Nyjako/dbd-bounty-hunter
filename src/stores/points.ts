import { atom } from "nanostores";

// Types for inventory system
interface InventoryItem {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    category?: "perk" | "add-on" | "killer";
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
        quantity: 4,
        category: "perk",
    },
    {
        id: "d-tier-perk",
        name: "D Tier Perk",
        description: "Basic techniques learned on the trail.",
        price: 25,
        quantity: 4,
        category: "perk",
    },
    {
        id: "c-tier-perk",
        name: "C Tier Perk",
        description: "Reliable skills earned through countless hunts.",
        price: 50,
        quantity: 4,
        category: "perk",
    },
    // {
    //     id: "b-tier-perk",
    //     name: "B Tier Perk",
    //     description:
    //     "The first steps of a killer finding their path.",
    //     price: 10,
    //     quantity: 4,
    //     category: "perk"
    // },
    {
        id: "a-tier-perk",
        name: "A Tier Perk",
        description: "Powerful techniques feared across the Deadlands.",
        price: 75,
        quantity: 4,
        category: "perk",
    },
    {
        id: "s-tier-perk",
        name: "S Tier Perk",
        description:
            "Abilities spoken of in whispers. Only the deadliest hunters reach this level.",
        price: 100,
        quantity: 4,
        category: "perk",
    },

    {
        id: "killer-upgrade",
        name: "Killer Upgrade",
        description:
            "Become a more deadly presence across the Deadlands. Each upgrade pushes you beyond your limits, unlocking stronger ways to track, pressure, and eliminate your prey.",
        price: 25,
        quantity: 7,
        category: "killer",
    },
    {
        id: "killer-upgrade-free",
        name: "Free Killer Upgrade (2 wins in a row)",
        description:
            "Two successful hunts prove your mastery. Earn a free upgrade and continue building your killer's legend.",
        price: 0,
        quantity: 7,
        category: "killer",
    },

    {
        id: "add-on",
        name: "Add-on upgrade",
        description:
            "Reinforce your tools of the hunt with improved modifications and forbidden craftsmanship. Better gear gives you new ways to control the trial and claim your bounty.",
        price: 0,
        quantity: 7,
        category: "add-on",
    },
];

// Store state
export interface AppStorage {
    points: number;
    inventory: InventoryItem[];
    ownedItems: OwnedItem[];
    wantedCards: Record<string, boolean>;
}

const initialAppStorage: AppStorage = {
    points: savedState.points ?? 0,
    inventory: savedState.inventory ?? initialInventory,
    ownedItems: savedState.ownedItems ?? [],
    wantedCards: savedState.wantedCards ?? {},
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
            item.id === id
                ? { ...item, ...updates }
                : item
        ),
    };

    appStorage.set(newState);
    saveState(newState);
}

export function removeInventoryItem(id: string) {

    const currentState = appStorage.get();

    const newState = {
        ...currentState,
        inventory: currentState.inventory.filter(
            (item) => item.id !== id
        ),
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

// Helper to purchase an item
export function purchaseItem(itemId: string) {
    const currentState = appStorage.get();
    const item = currentState.inventory.find(
        (item) => item.id === itemId
    );

    if (!item || !canAffordItem(itemId) || item.quantity <= 0) {
        return false;
    }

    const updatedInventory = currentState.inventory.map((i) =>
        i.id === itemId
            ? { ...i, quantity: i.quantity - 1 }
            : i
    );

    const existingOwned = currentState.ownedItems.find(
        (i) => i.id === itemId
    );

    let updatedOwned;

    if (existingOwned) {
        updatedOwned = currentState.ownedItems.map((i) =>
            i.id === itemId
                ? {
                      ...i,
                      quantity: i.quantity + 1,
                  }
                : i
        );
    } else {
        updatedOwned = [
            ...currentState.ownedItems,
            {
                id: item.id,
                name: item.name,
                description: item.description,
                quantity: 1,
                category: item.category,
            },
        ];
    }

    const newState = {
        ...currentState,
        points: currentState.points - currentState.inventory.find((item) => item.id === itemId).price,
        inventory: updatedInventory,
        ownedItems: updatedOwned,
    };

    appStorage.set(newState);
    saveState(newState);

    return true;
}

export interface OwnedItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    category?: "perk" | "add-on" | "killer";
}

function saveState(state: AppStorage) {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );
    } catch {
        // storage unavailable
    }
}

export function getWantedCardState(name: string): boolean {
    return appStorage.get().wantedCards[name] ?? false;
}

export function setWantedCardState(name: string, value: boolean) {
    const currentState = appStorage.get();

    const newState = {
        ...currentState,
        wantedCards: {
            ...currentState.wantedCards,
            [name]: value,
        },
    };

    appStorage.set(newState);
    saveState(newState);
}
