# DBD 10.3.0-PTB Art the Clown | Fix

* Single Killer mode no longer asks you to pick a tierlist — it never climbs a ladder, so the choice was meaningless there.
* Save verification now also replays perk slots, add-on slots, and the current killer from the action log, not just points and kills — editing any of those directly without a matching log entry now correctly shows up as a mismatch instead of being silently accepted as valid.
* Added a Back button to the run setup steps, so a wrong choice doesn't mean starting over.
* The tierlist preview's killer list no longer wraps mid-name — each killer is now its own tag instead of one long line of text.
* Links in the changelog (wiki, GitHub) are now clickable instead of plain text.
* Opening a second tierlist preview no longer leaves the first one stacked below it — only one preview shows at a time.
* A PTB perk equipped in a slot now shows a same-tier stand-in while PTB is toggled off, instead of staying displayed as content that's no longer active. Turning PTB back on without buying anything new for that slot brings the real perk back — toggling it off and on never actually changes what's equipped. That stand-in is now rolled randomly once and saved, so it stays the same across reloads and repeated toggling instead of changing every time.

# DBD 10.3.0-PTB Art the Clown

## Added

* Two new legendary survivors — 2B (Feng Min) and A2 (Yui Kimura) — and upgraded portraits for every legendary character, sourced from https://deadbydaylight.wiki.gg/wiki/Category:Legendary_Characters.
* Two more killer tierlists alongside the original: Casual Tierlist and Release Order (killers in the order they actually launched). The original ranking is now named Alex's Tierlist and stays the default.
* Picking a tierlist is now its own step when starting a run, with a preview of each list's ranking before you commit.
* PTB content toggle: killers, perks, and survivors staged for the current public test build (Art the Clown/The Terrifier, his perks, Sienna Shaw) can be switched on or off at any time — from the new Run Settings panel in the store, or God Mode — without ever touching progress you've already earned on that content. Defaults to on for this update.

## Fixed

* Long character names ("Detective David Tapp", "William Bill Overbeck") no longer wrap to two lines and push their card taller than its neighbors, shifting the rest of the row.
* Filling a perk slot in the store no longer stretches the other slots in that row — every slot now renders at a constant size.
* A few Casual Tierlist killers (The Dark Lord, The Mastermind, The Ghost Face) were keyed to portraits that don't exist, so they rendered with no image.

# DBD 10.1.0 Chorus of sin | Save Integrity

## Added

* Saves and exports now go through a small cipher compiled to WebAssembly before being written to storage or downloaded, instead of plain readable JSON.
* Every meaningful action this run (kills, undos, purchases, perk placements, killer changes, the Main Bounty) is recorded into a compact, tamper-evident history alongside the save. A completed run's points and kills can be checked against that history to confirm they line up with how they were actually earned.
* Saves from before this history existed are picked up as a trusted starting point rather than treated as suspicious — a save can't be held to a standard it predates. This trust is a deliberate, adjustable policy, not a permanent exemption.
* Players on a save without full action history now see a one-time notice explaining what that means and that it's trusted for now, not permanently.
* The event log's hashing now runs through a WASM-compiled FNV-1a (via GOBLIN, https://github.com/Nyjako/GOBLIN) instead of a hand-written JS version.

# DBD 10.1.0 Chorus of sin | FIX #3

## Bug fixes

* Fixed the Main Bounty paying the survivor's normal tier reward on top of its own 20 points instead of a flat 20, and made claiming it undoable by clicking again.
* Fixed Single Killer mode always starting on The Ghostface with no way to choose — it now offers a killer picker before the run starts.
* Fixed the changelog not showing anything on a genuine first visit; it now shows the full history instead of silently marking it as read.
* Fixed the changelog's close button not matching the rest of the site's styling.

# DBD 10.1.0 Chorus of sin | FIX #2

## Bug fixes

* Fixed a deeper issue with how a player's current killer was stored: it was saved as a plain position in the killer ladder, so adding, removing, or moving a killer between tiers could silently shift what that saved position pointed at. Your killer is now saved by name instead, so future roster changes won't move anyone onto a different killer than the one they were actually playing.

# DBD 10.1.0 Chorus of sin | FIX #1

## Added missing killer

* The Judgment (A)

# DBD 10.1.0 Chorus of sin

## Changes

### Character rarity

`Points earned before the update won't get upgraded.`

* Elodie Rakoto (S -> A)
* Ashley J Williams (A -> S)
* Dustin Henderson (A -> S)
* Jeff Johansen (B -> A)
* Orela Rose (A -> B)
* Alan Wake (B -> A)
* Renato Lyra (B -> C)
* Zarina Kassir (C -> B)
* Trevor Belmont (C -> B)
* David King (B -> C)
* Shane Wiigwaas (D -> B)
* William Bill Overbeck (C -> D)
* Jake Park (C -> D)
* Jill Valentine (D -> C)

## Added

### Survivor

* Aurora (E)

### Main bounty

The Main Bounty is a bounty worth 20 points and can only be redeemed once per challenge! The Main Bounty is the last survivor we killed in our latest bounty challenge!
After the Main Bounty is hunted, it moves back to its normal position on the board.

### Judgment perks

* Celestial Witness (C)
* Under Your Thumb (D)
* Lay Waste (C)

### Run setup

* Starting a run now walks through three quick choices instead of one screen: Single Killer or Free Roam, Open Shop or Earned Tiers for perks, then The Sheriff's List or The Black List.
* Added Single Killer mode. No killer upgrades or rerolls — you run the same killer for the whole challenge.
* Added Earned Tiers, a perk progression mode. You start on F-tier perks only; buying 4 perks of a tier unlocks the next one, all the way up to S.

### Onboarding

* Added a short tutorial for first-time visitors, with a "?" button to reopen it any time.
* Added a proper "Start the Hunt" button on the homepage. The nav link alone was too easy to miss.

### Changelog

* Added this changelog. New entries pop up automatically the first time you visit after an update, and the "📜" button reopens the full history whenever you want it.

## Danger Zone

* Added Export Save and Import Save, so a run can be backed up or carried over to another device.

## Bug fixes

* Fixed the perk shop letting you buy another perk roll while one you'd already bought was still waiting to be placed in a slot, which could bury a pending perk under a newer one before you ever got to choose where it went. The shop now locks every perk tier (showing "place your perk first") until the pending one is placed.

# DBD 10.0.0 Jason

## Website

* Built the original landing page: challenge overview, the pitch video, starting conditions, the Bounty Points table, the shop and killer-upgrade rules, links to the YouTube channel and Twitch, and a footer with credits.
* Restyled the whole site (landing page, hunt page, wanted board, store) with one consistent look.

## Bounty board

* Survivors can now be hunted more than once. Each portrait shows a running kill count with a small button to undo a misclick.
* Killed survivors stay on the board and keep tracking further kills instead of locking after the first one.
* Added a completion screen for when every survivor on the board has been hunted, with options to keep playing or clear progress and start over.
* Added The Sheriff's List and The Black List game modes. In The Sheriff's List, a legendary skin shares its kill count with its original character; in The Black List, every legendary is tracked and paid out on its own.

## Character sheet

* Rebuilt the shop into a Character Sheet: your current killer's portrait and rank, 4 perk slots, and 2 add-on slots, all in one place.
* Perk purchases roll a random, not-already-equipped perk from the tier you bought; you choose which slot to place it in, permanently replacing whatever was there.
* Add-on slots show their current rarity tier and can be upgraded one tier at a time.
* Added the full killer ladder, climbed by winning 2 matches in a row (a free upgrade) or by spending points. Reaching the top killer switches upgrades into rerolls, so there's always a new killer to try.
* Removed purchase-count limits from the shop. Nothing runs out of stock any more; perk tiers, add-ons, and killer upgrades can always be bought if you can afford them.
* Added Delete All Progress to wipe a save clean.

## Fixes

* Fixed several perks not showing their icon in a slot, caused by naming differences between the perk list and the generated icon set (casing, "Hex"/"Scourge Hook"/"Boon" prefixes, a couple of typos and spelling variants).
* Fixed the killer reroll losing its lock and offering a paid upgrade again after rerolling past the top killer.
* Fixed legendary skins and their base character not staying in sync in The Sheriff's List mode.
* Fixed the "run complete" screen showing immediately instead of only once the board is actually cleared.
