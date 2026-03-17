# Marathon Upgrade Planner — Project Status

## What We're Building
A client-side Angular app where you select target upgrades across Marathon (2026) factions and get a prioritized action plan: which factions to level, what salvage to collect, and where on each map to find it.

## Completed Data (ALL DONE)

### Maps (`data/maps.json`)
- 4 maps with named zones: Dire Marsh (12), Outpost (9), Perimeter (10), Cryo Archive (placeholder)

### Salvage (`data/salvage.json`)
- 57 items across 5 tiers: Prestige, Superior, Deluxe, Enhanced, Standard
- Cross-referenced from tauceti.gg + Fandom wiki; tauceti.gg is price source of truth
- Drone Resin added during Arachne faction work (was missing from initial scrape)

### Factions (`data/factions/*.json`) — ALL 6 COMPLETE
| Faction | Capstones | Upgrades | VIP-gated |
|---------|-----------|----------|-----------|
| CyberAcme | 6 | 18 | 3 |
| NuCaloric | 6 | 21 | 1 |
| Traxus | 6 | 18 | 1 |
| MIDA | 6 | 18 | 2 |
| Arachne | 6 | 18 | 1 |
| Sekiguchi | 6 | 24 | 1 |
| **Total** | **36** | **117** | **9** |

### Key Data Model Decisions
- **No cross-upgrade prerequisites** — upgrades are gated only by faction rank, credits, salvage, and VIP rank
- **Within an upgrade**, ranks must be purchased in order (rank 1 before rank 2)
- **Capstones** gated by total upgrade node count per faction
- **VIP Rank** mechanism still unknown; modeled as `vipRankRequired` field
- **Categories**: Inventory, Function, Stat, Armory (+ Technology on one MIDA upgrade)

### Data Sourcing Method
tauceti.gg uses Next.js RSC. Best method: cURL from Chrome DevTools Network tab → parse RSC response with `data/parse_rsc.js`.

## Next Step: Build the Angular App

### PRD Core Features
1. **Upgrade Browser** — view all upgrades by faction, filter/search
2. **Target Selection** — pick desired upgrades + specific ranks
3. **Action Plan** — faction level priorities, salvage shopping list grouped by map/zone, total credit cost
4. **Progress Tracking** — mark current faction levels, owned upgrades (localStorage)

### Tech
- Angular (client-side only, no backend)
- Static JSON data files in `assets/data/`
- localStorage for user state
- No visual map overlays in v1
