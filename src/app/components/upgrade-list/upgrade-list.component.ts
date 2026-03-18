import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Upgrade, UpgradeCategory } from '../../models/types';

type FilterCategory = 'All' | 'Inventory' | 'Function' | 'Stat' | 'Armory';

@Component({
  selector: 'app-upgrade-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col h-full">
      <!-- Search -->
      <div class="p-3 border-b border-surface-3">
        <input
          type="text"
          placeholder="Search upgrades..."
          class="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-neutral-400"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
        />
      </div>

      <!-- Category filters -->
      <div class="flex flex-wrap gap-1 p-3 border-b border-surface-3">
        @for (cat of categories; track cat) {
          <button
            class="px-3 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
            [class.bg-surface-4]="activeFilter() === cat"
            [class.text-white]="activeFilter() === cat"
            [class.bg-surface-2]="activeFilter() !== cat"
            [class.text-neutral-400]="activeFilter() !== cat"
            [class.hover:bg-surface-3]="activeFilter() !== cat"
            (click)="activeFilter.set(cat)"
          >
            {{ cat }}
          </button>
        }
      </div>

      <!-- Upgrade list -->
      <div class="flex-1 overflow-y-auto">
        @for (upgrade of filteredUpgrades(); track upgrade.id) {
          <button
            class="w-full text-left px-4 py-3 border-b border-surface-2 cursor-pointer transition-colors"
            [class.bg-surface-2]="selectedUpgradeId() === upgrade.id"
            [class.hover:bg-surface-1]="selectedUpgradeId() !== upgrade.id"
            (click)="upgradeSelected.emit(upgrade.id)"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-neutral-200">{{ upgrade.name }}</span>
              <div class="flex items-center gap-2">
                @if (wantedUpgradeIds().has(upgrade.id)) {
                  <span class="text-xs" [style.color]="factionColor()">&#9733;</span>
                }
                <span class="text-xs px-2 py-0.5 rounded bg-surface-3 text-neutral-400">
                  {{ upgrade.category }}
                </span>
              </div>
            </div>
            <div class="text-xs text-neutral-500 mt-1">
              {{ upgrade.ranks.length }} rank{{ upgrade.ranks.length !== 1 ? 's' : '' }}
            </div>
          </button>
        } @empty {
          <div class="p-4 text-sm text-neutral-500 text-center">No upgrades match your search.</div>
        }
      </div>
    </div>
  `,
})
export class UpgradeListComponent {
  upgrades = input.required<Upgrade[]>();
  selectedUpgradeId = input<string | null>(null);
  factionColor = input<string>('#888');
  wantedUpgradeIds = input<Set<string>>(new Set());
  upgradeSelected = output<string>();

  searchQuery = signal('');
  activeFilter = signal<FilterCategory>('All');

  categories: FilterCategory[] = ['All', 'Inventory', 'Function', 'Stat', 'Armory'];

  filteredUpgrades = computed(() => {
    let upgrades = this.upgrades();
    const query = this.searchQuery().toLowerCase();
    const filter = this.activeFilter();

    if (filter !== 'All') {
      upgrades = upgrades.filter(u =>
        filter === 'Function'
          ? u.category === 'Function' || u.category === 'Technology'
          : u.category === filter
      );
    }

    if (query) {
      upgrades = upgrades.filter(u => u.name.toLowerCase().includes(query));
    }

    return upgrades;
  });
}
