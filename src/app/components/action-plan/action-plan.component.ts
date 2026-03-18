import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { PlannerService } from '../../services/planner.service';
import { SalvageItem } from '../../models/types';

interface ShoppingEntry {
  item: SalvageItem;
  quantity: number;
}

interface MapGroup {
  mapName: string;
  zones: { zoneName: string; items: ShoppingEntry[] }[];
}

@Component({
  selector: 'app-action-plan',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="h-full overflow-y-auto p-6">
      @if (wantList().length === 0) {
        <div class="flex flex-col items-center justify-center h-full text-neutral-500">
          <p class="text-lg mb-2">No upgrades in your plan yet</p>
          <p class="text-sm">Browse factions and add upgrades to get started.</p>
        </div>
      } @else {
        <!-- Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-surface-2 rounded-lg p-4 border border-surface-3">
            <div class="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total Credits</div>
            <div class="text-2xl font-bold text-amber-300">{{ planner.totalCredits() | number }}</div>
          </div>
          <div class="bg-surface-2 rounded-lg p-4 border border-surface-3">
            <div class="text-xs text-neutral-500 uppercase tracking-wide mb-1">Upgrades Planned</div>
            <div class="text-2xl font-bold text-neutral-200">{{ wantList().length }}</div>
          </div>
          <div class="bg-surface-2 rounded-lg p-4 border border-surface-3">
            <div class="text-xs text-neutral-500 uppercase tracking-wide mb-1">Salvage Types</div>
            <div class="text-2xl font-bold text-neutral-200">{{ planner.totalSalvage().size }}</div>
          </div>
        </div>

        <!-- Faction Priorities -->
        <section class="mb-8">
          <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Faction Levels Required</h2>
          <div class="space-y-2">
            @for (entry of factionPriorities(); track entry.factionId) {
              <div class="flex items-center gap-4 bg-surface-2 rounded px-4 py-3 border border-surface-3">
                <span class="font-semibold text-sm" [style.color]="entry.color">{{ entry.name }}</span>
                <div class="flex items-center gap-2 ml-auto">
                  <span class="text-xs text-neutral-500">Current:</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    class="w-16 px-2 py-1 text-sm bg-surface-3 border border-surface-4 rounded text-neutral-200 text-center outline-none"
                    [ngModel]="entry.currentLevel"
                    (ngModelChange)="setFactionLevel(entry.factionId, $event)"
                  />
                  <span class="text-xs text-neutral-500">Required:</span>
                  <span class="text-sm font-bold" [class.text-red-400]="entry.currentLevel < entry.requiredLevel" [class.text-green-400]="entry.currentLevel >= entry.requiredLevel">
                    {{ entry.requiredLevel }}
                  </span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Want List -->
        <section class="mb-8">
          <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Planned Upgrades</h2>
          <div class="space-y-1">
            @for (item of wantListDetails(); track item.key) {
              <div class="flex items-center justify-between bg-surface-2 rounded px-4 py-2 border border-surface-3">
                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold px-2 py-0.5 rounded" [style.background-color]="item.factionColor" style="color: #0a0a0a">
                    {{ item.factionName }}
                  </span>
                  <span class="text-sm text-neutral-200">{{ item.upgradeName }}</span>
                  <span class="text-xs text-neutral-500">Rank {{ item.targetRank }}</span>
                </div>
                <button
                  class="text-xs text-neutral-500 hover:text-red-400 cursor-pointer px-2 py-1"
                  (click)="planner.removeFromWantList(item.factionId, item.upgradeId)"
                >
                  &#x2715;
                </button>
              </div>
            }
          </div>
        </section>

        <!-- Shopping List by Map -->
        <section class="mb-8">
          <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Salvage Shopping List</h2>
          @for (group of shoppingByMap(); track group.mapName) {
            <div class="mb-4">
              <h3 class="text-sm font-bold text-neutral-300 mb-2 px-1">{{ group.mapName }}</h3>
              @for (zone of group.zones; track zone.zoneName) {
                <div class="ml-4 mb-2">
                  <div class="text-xs text-neutral-500 mb-1">{{ zone.zoneName }}</div>
                  @for (entry of zone.items; track entry.item.id) {
                    <div class="flex items-center justify-between px-3 py-1.5 rounded bg-surface-2 mb-1">
                      <div class="flex items-center gap-2">
                        <span
                          class="text-xs font-bold px-1.5 py-0.5 rounded"
                          [style.background-color]="getTierColor(entry.item.tier)"
                          style="color: #0a0a0a"
                        >{{ entry.item.tier.charAt(0) }}</span>
                        <span class="text-sm text-neutral-300">{{ entry.item.name }}</span>
                      </div>
                      <span class="text-sm font-bold text-neutral-300">x{{ entry.quantity }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (otherSourceItems().length > 0) {
            <div class="mb-4">
              <h3 class="text-sm font-bold text-neutral-300 mb-2 px-1">Other Sources</h3>
              @for (entry of otherSourceItems(); track entry.item.id) {
                <div class="flex items-center justify-between px-3 py-1.5 rounded bg-surface-2 mb-1 ml-4">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-xs font-bold px-1.5 py-0.5 rounded"
                      [style.background-color]="getTierColor(entry.item.tier)"
                      style="color: #0a0a0a"
                    >{{ entry.item.tier.charAt(0) }}</span>
                    <span class="text-sm text-neutral-300">{{ entry.item.name }}</span>
                    <span class="text-xs text-neutral-500">
                      ({{ entry.item.sources.other.join(', ') }})
                    </span>
                  </div>
                  <span class="text-sm font-bold text-neutral-300">x{{ entry.quantity }}</span>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class ActionPlanComponent {
  private data = inject(DataService);
  planner = inject(PlannerService);

  wantList = this.planner.wantList;

  wantListDetails = computed(() => {
    const factions = this.data.factions();
    return this.planner.wantList().map(w => {
      const faction = factions.find(f => f.id === w.factionId);
      const upgrade = faction?.upgrades.find(u => u.id === w.upgradeId);
      return {
        key: `${w.factionId}:${w.upgradeId}`,
        factionId: w.factionId,
        upgradeId: w.upgradeId,
        factionName: faction?.name ?? w.factionId,
        factionColor: faction?.color ?? '#888',
        upgradeName: upgrade?.name ?? w.upgradeId,
        targetRank: w.targetRank,
      };
    });
  });

  factionPriorities = computed(() => {
    const required = this.planner.requiredFactionLevels();
    const factions = this.data.factions();
    return [...required.entries()]
      .map(([factionId, requiredLevel]) => {
        const faction = factions.find(f => f.id === factionId);
        return {
          factionId,
          name: faction?.name ?? factionId,
          color: faction?.color ?? '#888',
          currentLevel: this.planner.getFactionLevel(factionId),
          requiredLevel,
        };
      })
      .sort((a, b) => (b.requiredLevel - b.currentLevel) - (a.requiredLevel - a.currentLevel));
  });

  /** Group salvage needs by map > zone */
  shoppingByMap = computed(() => {
    const needed = this.planner.totalSalvage();
    const salvageMap = this.data.salvageMap();
    const mapMap = this.data.mapMap();

    // Build map -> zone -> items structure
    const mapGroups = new Map<string, Map<string, ShoppingEntry[]>>();

    for (const [salvageId, qty] of needed) {
      const item = salvageMap.get(salvageId);
      if (!item) continue;
      const entry: ShoppingEntry = { item, quantity: qty };

      for (const src of item.sources.maps) {
        const gameMap = mapMap.get(src.mapId);
        if (!gameMap) continue;

        if (!mapGroups.has(src.mapId)) mapGroups.set(src.mapId, new Map());
        const zoneMap = mapGroups.get(src.mapId)!;

        const zones = src.zones.length > 0 ? src.zones : ['All Zones'];
        for (const zoneId of zones) {
          const zoneName = zoneId === 'All Zones'
            ? 'All Zones'
            : gameMap.zones.find(z => z.id === zoneId)?.name ?? zoneId;
          if (!zoneMap.has(zoneName)) zoneMap.set(zoneName, []);
          zoneMap.get(zoneName)!.push(entry);
        }
      }
    }

    const result: MapGroup[] = [];
    for (const [mapId, zoneMap] of mapGroups) {
      const gameMap = mapMap.get(mapId);
      const zones = [...zoneMap.entries()].map(([zoneName, items]) => ({ zoneName, items }));
      result.push({ mapName: gameMap?.name ?? mapId, zones });
    }
    return result;
  });

  /** Items with no map source */
  otherSourceItems = computed(() => {
    const needed = this.planner.totalSalvage();
    const salvageMap = this.data.salvageMap();
    const result: ShoppingEntry[] = [];
    for (const [salvageId, qty] of needed) {
      const item = salvageMap.get(salvageId);
      if (!item) continue;
      if (item.sources.maps.length === 0 && item.sources.other.length > 0) {
        result.push({ item, quantity: qty });
      }
    }
    return result;
  });

  setFactionLevel(factionId: string, level: number) {
    this.planner.setFactionLevel(factionId, level);
  }

  getTierColor(tier: string): string {
    const colors: Record<string, string> = {
      Prestige: '#fbbf24',
      Superior: '#a78bfa',
      Deluxe: '#60a5fa',
      Enhanced: '#34d399',
      Standard: '#9ca3af',
    };
    return colors[tier] ?? '#9ca3af';
  }
}
