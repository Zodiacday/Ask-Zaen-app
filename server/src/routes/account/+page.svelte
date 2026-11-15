<script lang="ts">
  import { ArrowRight, Bookmark, Heart, Lock, Moon, Settings, ShieldCheck, Sparkles, User } from '@lucide/svelte';
  import { favoritesStore } from '$lib/stores/favorites.svelte';
  import MotionPlayground from '$lib/components/ui/MotionPlayground.svelte';
</script>

<svelte:head>
  <title>Sanctuary Profile & Settings - Ask Zaen</title>
  <meta name="description" content="Local preferences and on-device privacy settings for your Ask Zaen experience." />
</svelte:head>

<div class="page-wrap">
  <!-- Apple Settings Header -->
  <header class="mb-8">
    <div class="flex items-center gap-3.5 mb-2">
      <div class="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--hairline)] shadow-sm flex items-center justify-center text-[var(--sage)]">
        <User size={22} />
      </div>
      <div>
        <h1 class="text-2xl sm:text-3xl font-serif font-normal text-[var(--ink)]">Sanctuary Profile</h1>
        <p class="text-xs sm:text-sm text-[var(--muted)]">On-device caregiver preferences & library statistics.</p>
      </div>
    </div>
  </header>

  <!-- Metric Tile Complications (Apple Health / Watch tiles) -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)]">
      <div class="flex items-center justify-between text-[var(--muted)] mb-2">
        <span class="text-xs font-semibold">Saved Library</span>
        <Heart size={16} class="text-[var(--sage)]" />
      </div>
      <div class="text-3xl font-serif font-normal text-[var(--ink)] mb-0.5 font-mono">
        {favoritesStore.count}
      </div>
      <p class="text-xs text-[var(--muted)]">Curated quiet titles</p>
    </div>

    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)]">
      <div class="flex items-center justify-between text-[var(--muted)] mb-2">
        <span class="text-xs font-semibold">Pacing Standard</span>
        <Sparkles size={16} class="text-[var(--sage)]" />
      </div>
      <div class="text-3xl font-serif font-normal text-[var(--ink)] mb-0.5 font-mono">
        &lt; 15
      </div>
      <p class="text-xs text-[var(--muted)]">Max camera cuts / minute</p>
    </div>

    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)]">
      <div class="flex items-center justify-between text-[var(--muted)] mb-2">
        <span class="text-xs font-semibold">Privacy State</span>
        <ShieldCheck size={16} class="text-[var(--sage)]" />
      </div>
      <div class="text-3xl font-serif font-normal text-[var(--ink)] mb-0.5 font-mono">
        100%
      </div>
      <p class="text-xs text-[var(--muted)]">On-device, zero trackers</p>
    </div>
  </div>

  <!-- Sanctuary Preferences Panel -->
  <section class="p-6 rounded-[var(--radius-squircle-lg)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)] mb-8" aria-labelledby="prefs-title">
    <h2 id="prefs-title" class="text-lg font-serif font-medium mb-4 flex items-center gap-2">
      <Settings size={18} class="text-[var(--sage)]" />
      <span>Sensory Preferences</span>
    </h2>

    <div class="divide-y divide-[var(--hairline-subtle)]">
      <!-- Bedtime Preference Row -->
      <div class="py-4 flex items-center justify-between gap-4">
        <div>
          <div class="text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Moon size={15} class="text-indigo-600" /> Bedtime Quiet Filtering
          </div>
          <p class="text-xs text-[var(--muted)] mt-0.5">
            Prioritizes titles with acoustic scores and under 8 cuts per minute for nighttime winding down.
          </p>
        </div>
        <button
          type="button"
          onclick={() => favoritesStore.toggleBedtime()}
          class="w-12 h-7 rounded-full transition-colors duration-200 relative p-0.5 flex items-center {favoritesStore.bedtimeMode ? 'bg-[var(--sage)]' : 'bg-stone-300'}"
          aria-label="Toggle bedtime filtering"
        >
          <span class="w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 {favoritesStore.bedtimeMode ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>

      <!-- Quick Action Row -->
      <div class="py-4 flex items-center justify-between gap-4">
        <div>
          <div class="text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Bookmark size={15} class="text-[var(--sage)]" /> Quick Access
          </div>
          <p class="text-xs text-[var(--muted)] mt-0.5">
            Jump directly to your personal saved library of titles.
          </p>
        </div>
        <a href="/saved" class="motion-press px-4 py-2 rounded-full bg-[var(--canvas-secondary)] hover:bg-stone-200/80 text-xs font-semibold text-[var(--ink)] border border-[var(--hairline)] inline-flex items-center gap-1 transition-colors">
          <span>Open My List</span>
          <ArrowRight size={13} />
        </a>
      </div>
    </div>
  </section>

  <!-- Interactive Apple Motion & Micro-Animation Library Lab -->
  <section class="mb-8" aria-label="Interactive Motion Library">
    <MotionPlayground />
  </section>

  <!-- Apple Privacy Architecture Notice -->
  <section class="p-6 rounded-[var(--radius-squircle-md)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)]" aria-labelledby="privacy-title">
    <div class="flex items-start gap-3.5">
      <div class="w-9 h-9 rounded-full bg-[var(--sage-soft)] text-[var(--sage)] flex items-center justify-center flex-shrink-0">
        <Lock size={17} />
      </div>
      <div>
        <h3 id="privacy-title" class="text-sm font-semibold text-[var(--ink)] mb-1">Architecture of Quiet Privacy</h3>
        <p class="text-xs text-[var(--muted)] leading-relaxed">
          Zero tracking. No account or cookies required. Your preferences and saved list stay strictly on this device.
        </p>
      </div>
    </div>
  </section>
</div>

