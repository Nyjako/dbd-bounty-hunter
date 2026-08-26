import RoseMarigold    from '../icons/legendary_characters/Alan - Rose Marigold.png';
import SagaAnderson    from '../icons/legendary_characters/Alan - Saga Anderson.png';
import CybilBennett    from '../icons/legendary_characters/Cheryl - Cybil Bennett.png';
import HinakoShimizu   from '../icons/legendary_characters/Cheryl - Hinako Shimizu.png';
import JamesSunderland from '../icons/legendary_characters/Cheryl - James Sunderland.png';
import LisaGarland     from '../icons/legendary_characters/Cheryl - Lisa Garland.png';
import Maria           from '../icons/legendary_characters/Cheryl - Maria.png';
import EddieMunson     from '../icons/legendary_characters/Dustin - Eddie Munson.png';
import RainCarradine   from '../icons/legendary_characters/Ellen - Rain Carradine.png';
import WilliamHudson   from '../icons/legendary_characters/Ellen - William Hudson.png';
import ClaireRedfield  from '../icons/legendary_characters/Jill - Claire Redfield.png';
import ShevaAlomar     from '../icons/legendary_characters/Jill - Sheva Alomar.png';
import CarlosOliviera  from '../icons/legendary_characters/Leon - Carlos Oliviera.png';
import ChirsRedfield   from '../icons/legendary_characters/Leon - Chirs Redfield.png';
import MaggieRhee      from '../icons/legendary_characters/Michonne - Maggie Rhee.png';
import RobinBuckley    from '../icons/legendary_characters/Nancy - Robin Buckley.png';
import Tubarao         from '../icons/legendary_characters/Renato - Tubarao.png';
import DarylDixon      from '../icons/legendary_characters/Rick - Daryl Dixon.png';
import GlennRhee       from '../icons/legendary_characters/Rick - Glenn Rhee.png';
import JonathanByers   from '../icons/legendary_characters/Steve - Jonathan Byers.png';
import Alucard         from '../icons/legendary_characters/Trevor - Alucard.png';
import RichterBelmont  from '../icons/legendary_characters/Trevor - Richter Belmont.png';
import SomaCruz        from '../icons/legendary_characters/Trevor - Soma Cruz.png';
import GeraltOfRivia   from '../icons/legendary_characters/Vittorio - Geralt of Rivia.png';

export const CHARACTER_TIERS = {
    LEGENDARY: [
        { price: 7,  img: RoseMarigold,    name: "Rose Marigold",    corresponding_character: "Alan Wake"        },
        { price: 7,  img: SagaAnderson,    name: "Saga Anderson",    corresponding_character: "Alan Wake"        },
        { price: 3,  img: CybilBennett,    name: "Cybil Bennett",    corresponding_character: "Cheryl Mason"     },
        { price: 3,  img: HinakoShimizu,   name: "Hinako Shimizu",   corresponding_character: "Cheryl Mason"     },
        { price: 3,  img: JamesSunderland, name: "James Sunderland", corresponding_character: "Cheryl Mason"     },
        { price: 3,  img: LisaGarland,     name: "Lisa Garland",     corresponding_character: "Cheryl Mason"     },
        { price: 3,  img: Maria,           name: "Maria",            corresponding_character: "Cheryl Mason"     },
        { price: 8,  img: EddieMunson,     name: "Eddie Munson",     corresponding_character: "Dustin Henderson" },
        { price: 8,  img: RainCarradine,   name: "Rain Carradine",   corresponding_character: "Ellen Ripley"     },
        { price: 8,  img: WilliamHudson,   name: "William Hudson",   corresponding_character: "Ellen Ripley"     },
        { price: 4,  img: ClaireRedfield,  name: "Claire Redfield",  corresponding_character: "Jill Valentine"   },
        { price: 4,  img: ShevaAlomar,     name: "Sheva Alomar",     corresponding_character: "Jill Valentine"   },
        { price: 4,  img: CarlosOliviera,  name: "Carlos Oliviera",  corresponding_character: "Leon S Kennedy"   },
        { price: 4,  img: ChirsRedfield,   name: "Chirs Redfield",   corresponding_character: "Leon S Kennedy"   },
        { price: 12, img: MaggieRhee,      name: "Maggie Rhee",      corresponding_character: "Michonne Grimes"  },
        { price: 5,  img: RobinBuckley,    name: "Robin Buckley",    corresponding_character: "Nancy Wheeler"    },
        { price: 7,  img: Tubarao,         name: "Tubarao",          corresponding_character: "Renato Lyra"      },
        { price: 5,  img: DarylDixon,      name: "Daryl Dixon",      corresponding_character: "Rick Grimes"      },
        { price: 5,  img: GlennRhee,       name: "Glenn Rhee",       corresponding_character: "Rick Grimes"      },
        { price: 5,  img: JonathanByers,   name: "Jonathan Byers",   corresponding_character: "Steve Harrington" },
        { price: 5,  img: Alucard,         name: "Alucard",          corresponding_character: "Trevor Belmont"   },
        { price: 5,  img: RichterBelmont,  name: "Richter Belmont",  corresponding_character: "Trevor Belmont"   },
        { price: 5,  img: SomaCruz,        name: "Soma Cruz",        corresponding_character: "Trevor Belmont"   },
        { price: 5,  img: GeraltOfRivia,   name: "Geralt of Rivia",  corresponding_character: "Vittorio Toscano" },
    ],

    MAIN_BOUNTY: {
        worth: 20,
        survivor: "The Troupe",
    },

    S: [ // 10
        "Haddie Kaur",
        "Dustin Henderson",
        "Michonne Grimes",
        "Gabriel Soma",
        "Jonah Vasquez",
        "Yoichi Asakawa",
        "Ashley J Williams",
    ],
    A: [ // 6
        "The Troupe",
        "Ellen Ripley",
        "Jeff Johansen",
        "Laurie Strode",
        "Alan Wake",
        "Eleven",
        "Detective David Tapp",
        "Quentin Smith",
        "Elodie Rakoto",
    ],
    B: [ // 5
        "Thalita Lyra",
        "Zarina Kassir",
        "Trevor Belmont",
        "Jane Romero",
        "Adam Francis",
        "Nicolas Cage",
        "Felix Richter",
        "Shane Wiigwaas",
        "Orela Rose",
    ],
    C: [ // 3
        "Renato Lyra",
        "Steve Harrington",
        "Yun Jin Lee",
        "Nancy Wheeler",
        "Vittorio Toscano",
        "Rebecca Chambers",
        "Rick Grimes",
        "Taurie Cain",
        "Jill Valentine",
        "David King",
    ],
    D: [ // 2
        "Nea Karlsson",
        "William Bill Overbeck",
        "Leon S Kennedy",
        "Mikaela Reid",
        "Claudette Morel",
        "Kwon Tae Young",
        "Yui Kimura",
        "Ada Wong",
        "Jake Park",
    ],
    E: [ // 1
        "Sable Ward",
        "Dwight Fairfield",
        "Kate Denson",
        "Vee Boonyasak",
        "Cheryl Mason",
        "Lara Croft",
        "Ace Visconti",
        "Feng Min",
        "Meg Thomas",
        "Aurora"
    ],
}

export const PERKS_TIERS = {
    S: [
        "Corrupt Intervention",
        "Pain Resonance",
        "Dead Man Switch",
        "Ruin",
        "Thrill of the Hunt",
        "Turn Back the Clock",
        "Eruption",
        "Pop Goes the Weasel",
    ],
    A: [
        "Grim Embrace",
        "Deadlock",
        "Undying",
        "No Way Out",
        "No One Escapes Death",
        "Lethal Pursuer",
        "Blood Favour",
        "Hive Mind",
        "Nowhere to Hide",
        "Agitation",
        "BBQ and Chili",
        "Tinkerer",
        "Secret Project",
        "A Nurses Calling",
        "Sloppy Butcher",
        "Surge",
        "Pentimento",
    ],
    C: [
        "Devour Hope",
        "Wretched Fate",
        "Bamboozle",
        "Unforeseen",
        "Friends Till the End",
        "Furtive Chase",
        "Dissolution",
        "Floods of Rage",
        "Discordance",
        "Coup De Grace",
        "Starstruck",
        "Call of Brine",
        "Dragons Grip",
        "Enduring",
        "Fire Up",
        "Gift of Pain",
        "Thrilling Tremors",
        "Jagged Compass",
        "Crowd Control",
        "Predator",
        "Rapid Brutality",
        "Remember Me",
        "Merciless Storm",
        "Terminus",
        "Coulrophobia",
        "Phantom Fear",
        "The Third Seal",
        "Alien Instinct",
        "Brutal Strength",
        "Leverage",
        "Rancor",
        "Mindbreaker",
        "Genetic Limits",
        "Overwhelming Presence",
        "Hangmans Trick",
        "Retribution",
        "Haunted Ground",
        "Forever Entwined",
        "Zanshin Tactics",
        "Infectious Fright",
        "Ultimate Weapon",
        "Languid Touch",
        "Save the Best for Last",
        "Plaything",
        "Oppression",
        "Franklins Demise",
        "Silent Shadow",
        "Celestial Witness",
        "Lay Waste",
    ],
    D: [
        "Gearhead",
        "Spies from the Shadows",
        "Human Greed",
        "Trail of Torment",
        "Surveillance",
        "Deerstalker",
        "Deathbound",
        "Huntress Lullaby",
        "Face the Darkness",
        "Nemesis",
        "Machine Learning",
        "Weave Attunement",
        "Game Afoot",
        "Dominance",
        "Spirit Fury",
        "Make Your Choice",
        "Hubris",
        "Play with Your Food",
        "Im All Ears",
        "Monitor and Abuse",
        "Forced Hesitation",
        "Forced Penance",
        "Superior Anatomy",
        "Batteries Include",
        "Darkness Revealed",
        "Whispers",
        "Awakened Awareness",
        "Dark Devotion",
        "Thwack",
        "Dark Arrogance",
        "Blood Warden",
        "Monstrous Shrine",
        "Overcharge",
        "Ravenous",
        "Bitter Murmur",
        "Thanatophobia",
        "Dying Light",
        "Blood Echo",
        "Lightborn",
        "Cruel Limits",
        "Mad Grit",
        "Hysteria",
        "Beast of Prey",
        "Unbound",
        "All Shaking Thunder",
        "Hoarder",
        "Septic Touch",
        "Knock Out",
        "Wandering Eye",
        "Iron Maiden",
        "Nothing but Misery",
        "Help Wanted",
        "None Are Free",
        "Overture of Doom",
        "Two Can Play",
        "Unrelenting",
        "Territorial Imperative",
        "Iron Grasp",
        "Shadowborn",
        "Bloodhound",
        "Unnerving Presence",
        "Stridor",
        "Rampage",
        "Scared To Death",
        "Under Your Thumb",
    ],
    F: [
        "Insidious",
        "No Quarter",
        "Distressing",
        "Undone",
        "Haywire",
        "Shattered Hope",
    ],
};

export const KILLER_TIERS = {
    S: [
        { img_name: "The Nurse",       display_name: "The Nurse"       },
        { img_name: "The Animatronic", display_name: "The Animatronic" },
    ],
    A: [
        { img_name: "The Hillbilly",   display_name: "The Hillbilly"   },
        { img_name: "The Slasher",     display_name: "The Slasher"     },
        { img_name: "The Ghoul",       display_name: "The Ghoul"       },
        { img_name: "The Twins",       display_name: "The Twins"       },
        { img_name: "The Dracula",     display_name: "The Dracula"     },
        { img_name: "The Singularity", display_name: "The Singularity" },
        { img_name: "The Plague",      display_name: "The Plague"      },
        { img_name: "The Oni",         display_name: "The Oni"         },
    ],
    B: [
        { img_name: "The Blight",       display_name: "The Blight"       },
        { img_name: "The Spirit",       display_name: "The Spirit"       },
        { img_name: "The First",        display_name: "The First"        },
        { img_name: "The Krasue",       display_name: "The Krasue"       },
        { img_name: "The Nightmare",    display_name: "The Nightmare"    },
        { img_name: "The Artist",       display_name: "The Artist"       },
        { img_name: "The Houndmaster",  display_name: "The Houndmaster"  },
        { img_name: "The Master Mind",  display_name: "The Master Mind"  },
        { img_name: "The Shape",        display_name: "The Shape"        },
        { img_name: "The Deathslinger", display_name: "The Deathslinger" },
        { img_name: "The Unknown",      display_name: "The Unknown"      },
    ],
    C: [
        { img_name: "The Cenobite",    display_name: "The Cenobite"    },
        { img_name: "The Lich",        display_name: "The Lich"        },
        { img_name: "The Clown",       display_name: "The Clown"       },
        { img_name: "The Executioner", display_name: "The Executioner" },
        { img_name: "The Wraith",      display_name: "The Wraith"      },
        { img_name: "The Nemesis",     display_name: "The Nemesis"     },
        { img_name: "The Knight",      display_name: "The Knight"      },
        { img_name: "The Yerkes",      display_name: "The Chucky"      }, // Chucky
        { img_name: "The Xenomorph",   display_name: "The Xenomorph"   },
        { img_name: "The Trickster",   display_name: "The Trickster"   },
    ],
    D: [
        { img_name: "The Cannibal",   display_name: "The Cannibal"   },
        { img_name: "The Huntress",   display_name: "The Huntress"   },
        { img_name: "The Demogorgon", display_name: "The Demogorgon" },
        { img_name: "The Doctor",     display_name: "The Doctor"     },
        { img_name: "The Legion",     display_name: "The Legion"     },
        { img_name: "The Pig",        display_name: "The Pig"        },
        { img_name: "The Onryo",      display_name: "The Onryo"      },
        { img_name: "The Dredge",     display_name: "The Dredge"     },
    ],
    F: [
        { img_name: "The Hag",            display_name: "The Hag"            },
        { img_name: "The Skull Merchant", display_name: "The Skull Merchant" },
        { img_name: "The Trapper",        display_name: "The Trapper"        },
        { img_name: "The Ghostface",      display_name: "The Ghostface"      },
    ],
};

export interface KillerLadderEntry {
    img_name: string;
    display_name: string;
    tier: keyof typeof KILLER_TIERS;
}

// The order the player climbs through killers, weakest to strongest:
// tier by tier from F up to S, and *within* each tier, last-listed-first —
// e.g. in F: Ghostface -> Trapper -> Skull Merchant -> Hag, then on to D
// starting from The Dredge down to The Cannibal, and so on.
const KILLER_TIER_ORDER: (keyof typeof KILLER_TIERS)[] = ["F", "D", "C", "B", "A", "S"];

export const KILLER_LADDER: KillerLadderEntry[] = KILLER_TIER_ORDER.flatMap((tier) =>
    [...KILLER_TIERS[tier]].reverse().map((killer) => ({ ...killer, tier })),
);
