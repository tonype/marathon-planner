import { Component, input, output, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Upgrade, Faction } from '../../models/types';
import { DataService } from '../../services/data.service';
import { PlannerService } from '../../services/planner.service';

@Component({
  selector: 'app-upgrade-detail',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (upgrade(); as upg) {
      <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-surface-3">
          <h2 class="text-lg font-bold text-neutral-100">{{ upg.name }}</h2>
          <p class="text-sm text-neutral-400 mt-1">{{ upg.description }}</p>
          <span class="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-surface-3 text-neutral-400">
            {{ upg.category }}
          </span>
        </div>

        <!-- Add to plan controls -->
        <div class="p-4 border-b border-surface-3 flex items-center gap-3">
          @if (isWanted()) {
            <button
              class="px-4 py-2 text-sm font-medium rounded cursor-pointer transition-colors bg-surface-3 text-neutral-300 hover:bg-surface-4"
              (click)="removeFromPlan()"
            >
              Remove from Plan
            </button>
            <span class="text-xs text-neutral-500">Target: Rank {{ wantedRank() }}</span>
          } @else {
            <span class="text-xs text-neutral-500 mr-2">Add to plan:</span>
            @for (rank of upg.ranks; track rank.rank) {
              <button
                class="px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors hover:opacity-80"
                [style.background-color]="factionColor()"
                [style.color]="'#0a0a0a'"
                (click)="addToPlan(rank.rank)"
              >
                Rank {{ rank.rank }}
              </button>
            }
          }
        </div>

        <!-- Rank tabs -->
        <div class="flex gap-1 px-4 pt-3">
          @for (rank of upg.ranks; track rank.rank) {
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-t cursor-pointer transition-colors"
              [class.bg-surface-2]="activeRank() === rank.rank"
              [class.text-neutral-200]="activeRank() === rank.rank"
              [class.bg-surface-1]="activeRank() !== rank.rank"
              [class.text-neutral-500]="activeRank() !== rank.rank"
              (click)="activeRank.set(rank.rank)"
            >
              Rank {{ rank.rank }}
              @if (planner.isOwned(factionId(), upg.id, rank.rank)) {
                <span class="text-green-400 ml-1">&#10003;</span>
              }
            </button>
          }
        </div>

        <!-- Rank detail -->
        @if (activeRankData(); as rank) {
          <div class="flex-1 overflow-y-auto p-4 bg-surface-2 mx-0">
            <!-- Requirements -->
            <div class="mb-4">
              <h3 class="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Requirements</h3>
              <div class="flex flex-wrap gap-3">
                @if (rank.vipRankRequired) {
                  <div class="text-sm px-3 py-1.5 rounded bg-surface-3">
                    <span class="text-amber-400">VIP Rank {{ rank.vipRankRequired }}</span>
                  </div>
                } @else if (rank.factionLevelRequired) {
                  <div class="text-sm px-3 py-1.5 rounded bg-surface-3">
                    Faction Level <span class="font-bold text-neutral-200">{{ rank.factionLevelRequired }}</span>
                  </div>
                }
                <div class="text-sm px-3 py-1.5 rounded bg-surface-3">
                  <span class="text-amber-300">{{ rank.creditCost | number }}</span> Credits
                </div>
              </div>
            </div>

            <!-- Effect -->
            <div class="mb-4">
              <h3 class="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Effect</h3>
              <p class="text-sm text-neutral-300">{{ rank.effect }}</p>
            </div>

            <!-- Salvage -->
            @if (rank.salvage.length > 0) {
              <div class="mb-4">
                <h3 class="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Salvage Required</h3>
                <div class="space-y-2">
                  @for (s of rank.salvage; track s.salvageId) {
                    @if (getSalvage(s.salvageId); as item) {
                      <div class="flex items-center justify-between px-3 py-2 rounded bg-surface-3">
                        <div class="flex items-center gap-2">
                          <span
                            class="text-xs font-bold px-1.5 py-0.5 rounded"
                            [style.background-color]="getTierColor(item.tier)"
                            [style.color]="'#0a0a0a'"
                          >{{ item.tier.charAt(0) }}</span>
                          <span class="text-sm text-neutral-200">{{ item.name }}</span>
                        </div>
                        <span class="text-sm font-bold text-neutral-300">x{{ s.quantity }}</span>
                      </div>
                    }
                  }
                </div>
              </div>
            }

            <!-- Own toggle -->
            <div class="mt-4 pt-4 border-t border-surface-3">
              @if (planner.isOwned(factionId(), upg.id, activeRank())) {
                <button
                  class="px-4 py-2 text-sm font-medium rounded cursor-pointer bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/50"
                  (click)="toggleOwned(upg.id, activeRank())"
                >
                  &#10003; Owned — Click to Unmark
                </button>
              } @else {
                <button
                  class="px-4 py-2 text-sm font-medium rounded cursor-pointer bg-surface-3 text-neutral-400 hover:bg-surface-4 hover:text-neutral-300"
                  (click)="toggleOwned(upg.id, activeRank())"
                >
                  Mark as Owned
                </button>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="h-full flex items-center justify-center text-neutral-500 text-sm">
        Select an upgrade to view details
      </div>
    }
  `,
})
export class UpgradeDetailComponent {
  private data = inject(DataService);
  planner = inject(PlannerService);

  upgrade = input<Upgrade | null>(null);
  factionId = input<string>('');
  factionColor = input<string>('#888');

  activeRank = signal(1);

  isWanted = computed(() =>
    this.planner.isWanted(this.factionId(), this.upgrade()?.id ?? '')
  );

  wantedRank = computed(() =>
    this.planner.getWantedRank(this.factionId(), this.upgrade()?.id ?? '')
  );

  activeRankData = computed(() => {
    const upg = this.upgrade();
    if (!upg) return null;
    return upg.ranks.find(r => r.rank === this.activeRank()) ?? upg.ranks[0] ?? null;
  });

  getSalvage(id: string) {
    return this.data.salvageMap().get(id) ?? null;
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

  addToPlan(rank: number) {
    const upg = this.upgrade();
    if (upg) {
      this.planner.addToWantList(this.factionId(), upg.id, rank);
    }
  }

  removeFromPlan() {
    const upg = this.upgrade();
    if (upg) {
      this.planner.removeFromWantList(this.factionId(), upg.id);
    }
  }

  toggleOwned(upgradeId: string, rank: number) {
    if (this.planner.isOwned(this.factionId(), upgradeId, rank)) {
      this.planner.unmarkOwned(this.factionId(), upgradeId, rank);
    } else {
      this.planner.markOwned(this.factionId(), upgradeId, rank);
    }
  }
}
