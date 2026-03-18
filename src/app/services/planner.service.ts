import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { UserState, WantListEntry, OwnedEntry, Faction } from '../models/types';
import { DataService } from './data.service';

const STORAGE_KEY = 'marathon-planner-state';

function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { factionLevels: {}, wantList: [], owned: [] };
}

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private data = inject(DataService);

  readonly userState = signal<UserState>(loadState());

  readonly wantList = computed(() => this.userState().wantList);
  readonly owned = computed(() => this.userState().owned);
  readonly factionLevels = computed(() => this.userState().factionLevels);

  constructor() {
    effect(() => {
      const state = this.userState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  private update(fn: (state: UserState) => UserState) {
    this.userState.update(s => fn(structuredClone(s)));
  }

  addToWantList(factionId: string, upgradeId: string, targetRank: number) {
    this.update(s => {
      const idx = s.wantList.findIndex(
        w => w.factionId === factionId && w.upgradeId === upgradeId
      );
      if (idx >= 0) {
        s.wantList[idx].targetRank = targetRank;
      } else {
        s.wantList.push({ factionId, upgradeId, targetRank });
      }
      return s;
    });
  }

  removeFromWantList(factionId: string, upgradeId: string) {
    this.update(s => {
      s.wantList = s.wantList.filter(
        w => !(w.factionId === factionId && w.upgradeId === upgradeId)
      );
      return s;
    });
  }

  isWanted(factionId: string, upgradeId: string): boolean {
    return this.wantList().some(
      w => w.factionId === factionId && w.upgradeId === upgradeId
    );
  }

  getWantedRank(factionId: string, upgradeId: string): number | null {
    const entry = this.wantList().find(
      w => w.factionId === factionId && w.upgradeId === upgradeId
    );
    return entry?.targetRank ?? null;
  }

  markOwned(factionId: string, upgradeId: string, rank: number) {
    this.update(s => {
      const exists = s.owned.some(
        o => o.factionId === factionId && o.upgradeId === upgradeId && o.rank === rank
      );
      if (!exists) {
        s.owned.push({ factionId, upgradeId, rank });
      }
      return s;
    });
  }

  unmarkOwned(factionId: string, upgradeId: string, rank: number) {
    this.update(s => {
      s.owned = s.owned.filter(
        o => !(o.factionId === factionId && o.upgradeId === upgradeId && o.rank === rank)
      );
      return s;
    });
  }

  isOwned(factionId: string, upgradeId: string, rank: number): boolean {
    return this.owned().some(
      o => o.factionId === factionId && o.upgradeId === upgradeId && o.rank === rank
    );
  }

  setFactionLevel(factionId: string, level: number) {
    this.update(s => {
      s.factionLevels[factionId] = level;
      return s;
    });
  }

  getFactionLevel(factionId: string): number {
    return this.factionLevels()[factionId] ?? 0;
  }

  /** Total credits needed for all wanted ranks minus owned */
  readonly totalCredits = computed(() => {
    let total = 0;
    const factions = this.data.factions();
    for (const want of this.wantList()) {
      const faction = factions.find(f => f.id === want.factionId);
      const upgrade = faction?.upgrades.find(u => u.id === want.upgradeId);
      if (!upgrade) continue;
      for (const rank of upgrade.ranks) {
        if (rank.rank > want.targetRank) continue;
        if (this.owned().some(o =>
          o.factionId === want.factionId && o.upgradeId === want.upgradeId && o.rank === rank.rank
        )) continue;
        total += rank.creditCost;
      }
    }
    return total;
  });

  /** Aggregate salvage needed across all wanted ranks minus owned */
  readonly totalSalvage = computed(() => {
    const salvageNeeded = new Map<string, number>();
    const factions = this.data.factions();
    for (const want of this.wantList()) {
      const faction = factions.find(f => f.id === want.factionId);
      const upgrade = faction?.upgrades.find(u => u.id === want.upgradeId);
      if (!upgrade) continue;
      for (const rank of upgrade.ranks) {
        if (rank.rank > want.targetRank) continue;
        if (this.owned().some(o =>
          o.factionId === want.factionId && o.upgradeId === want.upgradeId && o.rank === rank.rank
        )) continue;
        for (const s of rank.salvage) {
          salvageNeeded.set(s.salvageId, (salvageNeeded.get(s.salvageId) ?? 0) + s.quantity);
        }
      }
    }
    return salvageNeeded;
  });

  /** Required faction levels based on wanted upgrades */
  readonly requiredFactionLevels = computed(() => {
    const required = new Map<string, number>();
    const factions = this.data.factions();
    for (const want of this.wantList()) {
      const faction = factions.find(f => f.id === want.factionId);
      const upgrade = faction?.upgrades.find(u => u.id === want.upgradeId);
      if (!upgrade) continue;
      for (const rank of upgrade.ranks) {
        if (rank.rank > want.targetRank) continue;
        if (rank.factionLevelRequired) {
          const current = required.get(want.factionId) ?? 0;
          required.set(want.factionId, Math.max(current, rank.factionLevelRequired));
        }
      }
    }
    return required;
  });
}
