import { perks } from "../data/perks";

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PREFIXES = ["hex", "scourgehook", "booncircleof", "boon"];

function stripPrefix(norm: string): string {
    for (const prefix of PREFIXES) {
        if (norm.startsWith(prefix)) return norm.slice(prefix.length);
    }
    return norm;
}

// generated icon map that normalization alone can't bridge.
const ALIASES: Record<string, string> = {
    awakenedawareness: "awakenedawarenesss", // typo in the generated map
    franklinsdemise: "franklinsloss", // perk was renamed in-game
    batteriesinclude: "batteriesincluded",
    bloodfavour: "bloodfavor", // US/UK spelling
    overcharge: "generatorovercharge",
};

const perkByNorm = new Map<string, string>();
const perkByStrippedNorm = new Map<string, string>();

for (const key of Object.keys(perks)) {
    const n = normalize(key);
    perkByNorm.set(n, key);
    perkByStrippedNorm.set(stripPrefix(n), key);
}

function lookup(norm: string): string | undefined {
    return perkByNorm.get(norm) ?? perkByStrippedNorm.get(norm) ?? perkByStrippedNorm.get(stripPrefix(norm));
}

export function getPerkIcon(name: string): (typeof perks)[string] | undefined {
    if (perks[name]) return perks[name];

    const n = normalize(name);
    const direct = lookup(n);
    if (direct) return perks[direct];

    const aliasTarget = ALIASES[n];
    if (aliasTarget) {
        const aliased = lookup(aliasTarget);
        if (aliased) return perks[aliased];
    }

    return undefined;
}
