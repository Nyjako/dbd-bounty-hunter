const CHANGELOG_KEY = "bounty-hunter-changelog-seen-version";

export function getLastSeenChangelogVersion(): string | null {
    if (typeof window === "undefined" || !window.localStorage) return null;

    try {
        return window.localStorage.getItem(CHANGELOG_KEY);
    } catch {
        return null;
    }
}

export function setLastSeenChangelogVersion(title: string) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.setItem(CHANGELOG_KEY, title);
    } catch {
        // storage unavailable
    }
}
