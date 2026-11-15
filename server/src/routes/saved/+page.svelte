<script lang="ts">
  import { Check, Heart, Share2, Trash2 } from '@lucide/svelte';
  import ShowCard from '$lib/components/ShowCard.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { autoAnimate } from '$lib/animations';
  import { favoritesStore } from '$lib/stores/favorites.svelte';
  import { CURATED_RESOURCES } from '$lib/curated-data';

  let copied = $state(false);

  let shows = $derived(CURATED_RESOURCES.filter((show) => favoritesStore.has(show.id)));

  function handleClearAll() {
    if (confirm('Clear all saved titles from your local list?')) {
      favoritesStore.clear();
    }
  }

  async function shareList() {
    const names = shows.map((show) => show.title).join('\n• ');
    try {
      await navigator.clipboard.writeText(`Ask Zaen Curated List:\n• ${names}\n\nExplore more calm picks at Ask Zaen.`);
      copied = true;
      setTimeout(() => copied = false, 2500);
    } catch {
      copied = false;
    }
  }
</script>

<svelte:head>
  <title>My List - Ask Zaen</title>
  <meta name="description" content="Your private on-device collection of calm, slow-paced children's shows." />
</svelte:head>

<div class="page-wrap">
  <!-- Apple Editorial Header -->
  <header class="mb-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p class="section-number">Private Collection</p>
        <h1 class="text-3xl sm:text-4xl font-serif font-normal text-[var(--ink)] mb-2">My Saved List</h1>
        <p class="text-sm text-[var(--muted)] max-w-xl">
          Keep the shows that bring calm to your home close at hand. Stored 100% locally on this device.
        </p>
      </div>

      {#if shows.length > 0}
        <div class="flex items-center gap-2.5 self-start md:self-auto">
          <button 
            type="button" 
            onclick={shareList}
            class="motion-press px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--hairline)] shadow-sm text-xs font-semibold text-[var(--ink)] hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5"
          >
            {#if copied}
              <Check size={14} class="text-[var(--sage)]" />
              <span>Copied to clipboard</span>
            {:else}
              <Share2 size={14} />
              <span>Share list</span>
            {/if}
          </button>

          <button 
            type="button" 
            onclick={handleClearAll}
            class="motion-press px-3.5 py-2 rounded-full text-xs font-semibold text-[var(--muted)] hover:text-[var(--terracotta)] hover:bg-[var(--terracotta-soft)] transition-colors inline-flex items-center gap-1"
            title="Clear all saved titles"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      {/if}
    </div>
  </header>

  {#if shows.length === 0}
    <EmptyState
      icon={Heart}
      title="Your list is empty"
      description="Save shows while exploring to create a ready-to-play sanctuary shelf for your family."
      actionText="Browse the library"
      actionHref="/explore"
    />
  {:else}
    <div class="mb-5">
      <p class="text-xs font-semibold text-[var(--muted)]">
        {shows.length} saved title{shows.length === 1 ? '' : 's'} ready
      </p>
    </div>

    <div class="show-grid" use:autoAnimate>
      {#each shows as show (show.id)}
        <ShowCard resource={show} />
      {/each}
    </div>
  {/if}
</div>


