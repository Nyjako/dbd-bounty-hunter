import { perks } from "../data/perks";

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Prefixes the community-authored PERKS_TIERS list tends to drop but the
// auto-generated perks.ts map (built from the official icon filenames) keeps.
const PREFIXES = ["hex", "scourgehook", "booncircleof", "boon"];

function stripPrefix(norm: string): string {
    for (const prefix of PREFIXES) {
        if (norm.startsWith(prefix)) return norm.slice(prefix.length);
    }
    return norm;
}

// A short list of true typos, renames, and spelling drift (US/UK) in the
// generated icon map that normalization alone can't bridge.
const ALIASES: Record<string, string> = {
    awakenedawareness: "awakenedawarenesss",
    franklinsdemise: "franklinsloss",
    batteriesinclude: "batteriesincluded",
    bloodfavour: "bloodfavor",
    overcharge: "generatorovercharge",
    rancor: "hatred",
    floodsofrage: "floodofrage",
    darknessrevealed: "darknessrevelated",
    cruellimits: "cruelconfinement",
    thanatophobia: "thatanophobia",
    shatteredhope: "boondestroyer",
    machinelearning: "selfaware",
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

// Resolves a perk name as written in PERKS_TIERS to its icon, tolerating the
// naming drift between that hand-authored list and the auto-generated
// perks.ts map. Returns undefined (no icon, not an error) if nothing in the
// icon pack matches at all — some perks simply aren't in it yet.
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
