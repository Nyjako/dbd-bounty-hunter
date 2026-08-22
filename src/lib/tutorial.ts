// Whether the player has been through the onboarding tutorial. Deliberately
// its own localStorage key, completely separate from the game save
// ("game-storage") — so "Delete All Progress" and importing a save never
// touch it, and a fresh run doesn't force returning players through it again.
const TUTORIAL_KEY = "bounty-hunter-tutorial-seen";

export function hasSeenTutorial(): boolean {
    if (typeof window === "undefined" || !window.localStorage) return true;

    try {
        return window.localStorage.getItem(TUTORIAL_KEY) === "1";
    } catch {
        return true;
    }
}

export function markTutorialSeen() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
        // storage unavailable
    }
}
