// Centralized Svelte 5 Reactive Rune Store for User Favorites and Preferences

class FavoritesStore {
  ids = $state<string[]>([]);
  bedtimeMode = $state<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ck-favs');
        this.ids = stored ? JSON.parse(stored) : [];
        this.bedtimeMode = localStorage.getItem('ck-bedtime') === 'true';
      } catch {
        this.ids = [];
        this.bedtimeMode = false;
      }

      window.addEventListener('storage', (e) => {
        if (e.key === 'ck-favs') {
          try {
            this.ids = e.newValue ? JSON.parse(e.newValue) : [];
          } catch {
            this.ids = [];
          }
        }
        if (e.key === 'ck-bedtime') {
          this.bedtimeMode = e.newValue === 'true';
        }
      });
    }
  }

  has(id: string): boolean {
    return this.ids.includes(id);
  }

  toggle(id: string) {
    if (this.ids.includes(id)) {
      this.ids = this.ids.filter((item) => item !== id);
    } else {
      this.ids = [...this.ids, id];
    }
    this.persist();
  }

  remove(id: string) {
    this.ids = this.ids.filter((item) => item !== id);
    this.persist();
  }

  clear() {
    this.ids = [];
    this.persist();
  }

  toggleBedtime() {
    this.bedtimeMode = !this.bedtimeMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ck-bedtime', this.bedtimeMode ? 'true' : 'false');
    }
  }

  get count(): number {
    return this.ids.length;
  }

  private persist() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ck-favs', JSON.stringify(this.ids));
      window.dispatchEvent(new Event('ck-favs-changed'));
    }
  }
}

export const favoritesStore = new FavoritesStore();
