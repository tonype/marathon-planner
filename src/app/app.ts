import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DataService } from './services/data.service';
import { PlannerService } from './services/planner.service';
import { FactionTabBarComponent } from './components/faction-tab-bar/faction-tab-bar.component';
import { UpgradeListComponent } from './components/upgrade-list/upgrade-list.component';
import { UpgradeDetailComponent } from './components/upgrade-detail/upgrade-detail.component';
import { ActionPlanComponent } from './components/action-plan/action-plan.component';
import { CircuitBgComponent } from './components/circuit-bg/circuit-bg.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FactionTabBarComponent,
    UpgradeListComponent,
    UpgradeDetailComponent,
    ActionPlanComponent,
    CircuitBgComponent,
    AudioPlayerComponent,
    DecimalPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  data = inject(DataService);
  planner = inject(PlannerService);

  activeView = signal<'browse' | 'plan'>('browse');
  activeFactionId = signal('cyberacme');
  selectedUpgradeId = signal<string | null>(null);

  activeFaction = computed(() =>
    this.data.factions().find(f => f.id === this.activeFactionId()) ?? null
  );

  selectedUpgrade = computed(() => {
    const faction = this.activeFaction();
    const id = this.selectedUpgradeId();
    if (!faction || !id) return null;
    return faction.upgrades.find(u => u.id === id) ?? null;
  });

  wantedUpgradeIdsForFaction = computed(() => {
    const factionId = this.activeFactionId();
    const ids = new Set<string>();
    for (const w of this.planner.wantList()) {
      if (w.factionId === factionId) ids.add(w.upgradeId);
    }
    return ids;
  });

  selectUpgrade(id: string) {
    this.selectedUpgradeId.set(id);
  }
}
