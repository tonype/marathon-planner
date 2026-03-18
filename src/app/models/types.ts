export interface GameMap {
  id: string;
  name: string;
  description: string;
  zones: Zone[];
}

export interface Zone {
  id: string;
  name: string;
}

export interface SalvageItem {
  id: string;
  name: string;
  tier: 'Prestige' | 'Superior' | 'Deluxe' | 'Enhanced' | 'Standard';
  price: number;
  description: string;
  sources: {
    maps: { mapId: string; zones: string[] }[];
    other: string[];
  };
  usage: string[];
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  description: string;
  agent: string;
  capstones: Capstone[];
  upgrades: Upgrade[];
}

export interface Capstone {
  level: number;
  name: string;
  nodesRequired: number;
  rankRequired: number;
  description: string;
}

export interface Upgrade {
  id: string;
  name: string;
  category: UpgradeCategory;
  description: string;
  ranks: UpgradeRank[];
}

export type UpgradeCategory = 'Inventory' | 'Function' | 'Stat' | 'Armory' | 'Technology';

export interface UpgradeRank {
  rank: number;
  factionLevelRequired?: number;
  vipRankRequired?: number;
  creditCost: number;
  salvage: { salvageId: string; quantity: number }[];
  effect: string;
  titleOverride?: string;
}

export interface WantListEntry {
  factionId: string;
  upgradeId: string;
  targetRank: number;
}

export interface UserState {
  factionLevels: Record<string, number>;
  wantList: WantListEntry[];
  owned: OwnedEntry[];
}

export interface OwnedEntry {
  factionId: string;
  upgradeId: string;
  rank: number;
}
