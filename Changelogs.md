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
