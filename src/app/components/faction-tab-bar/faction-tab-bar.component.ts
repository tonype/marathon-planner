import { Component, input, output } from '@angular/core';
import { Faction } from '../../models/types';

@Component({
  selector: 'app-faction-tab-bar',
  standalone: true,
  template: `
    <div class="flex gap-1 p-2 bg-surface-1 border-b border-surface-3">
      @for (faction of factions(); track faction.id) {
        <button
          class="px-4 py-2 text-sm font-semibold rounded-t-md transition-all duration-150 cursor-pointer"
          [style.background-color]="activeFactionId() === faction.id ? faction.color : 'transparent'"
          [style.color]="activeFactionId() === faction.id ? '#0a0a0a' : faction.color"
          [style.border-color]="faction.color"
          [class.border-b-2]="activeFactionId() !== faction.id"
          [class.opacity-60]="activeFactionId() !== faction.id"
          [class.hover:opacity-100]="activeFactionId() !== faction.id"
          (click)="tabSelected.emit(faction.id)"
        >
          {{ faction.name }}
        </button>
      }
    </div>
  `,
})
export class FactionTabBarComponent {
  factions = input.required<Faction[]>();
  activeFactionId = input.required<string>();
  tabSelected = output<string>();
}
