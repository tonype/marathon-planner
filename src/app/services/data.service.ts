import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Faction, SalvageItem, GameMap } from '../models/types';

const FACTION_FILES = [
  'cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi'
];

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  readonly factions = signal<Faction[]>([]);
  readonly salvageItems = signal<SalvageItem[]>([]);
  readonly maps = signal<GameMap[]>([]);
  readonly loaded = signal(false);

  readonly salvageMap = computed(() => {
    const map = new Map<string, SalvageItem>();
    for (const item of this.salvageItems()) {
      map.set(item.id, item);
    }
    return map;
  });

  readonly mapMap = computed(() => {
    const map = new Map<string, GameMap>();
    for (const m of this.maps()) {
      map.set(m.id, m);
    }
    return map;
  });

  constructor() {
    this.loadAll();
  }

  private loadAll() {
    const factionRequests = FACTION_FILES.map(f =>
      this.http.get<Faction>(`assets/data/factions/${f}.json`)
    );

    forkJoin({
      factions: forkJoin(factionRequests),
      salvage: this.http.get<SalvageItem[]>('assets/data/salvage.json'),
      maps: this.http.get<GameMap[]>('assets/data/maps.json'),
    }).subscribe(({ factions, salvage, maps }) => {
      this.factions.set(factions);
      this.salvageItems.set(salvage);
      this.maps.set(maps);
      this.loaded.set(true);
    });
  }
}
