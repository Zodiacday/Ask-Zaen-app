<script lang="ts">
  import { onMount } from 'svelte';
  import { Clock, Film, Globe, Sparkles, Tv, Users } from '@lucide/svelte';
  import { fetchTVmazeEnrichment, type TVmazeEnrichment } from '$lib/services/tvmaze';

  let { title, onPosterLoaded } = $props<{
    title: string;
    onPosterLoaded?: (posterUrl: string) => void;
  }>();

  let loading = $state(true);
  let enrichment = $state<TVmazeEnrichment | null>(null);

  onMount(async () => {
    loading = true;
    try {
      const data = await fetchTVmazeEnrichment(title);
      enrichment = data;
      if (data?.posterOriginal && onPosterLoaded) {
        onPosterLoaded(data.posterOriginal);
      }
    } finally {
      loading = false;
    }
  });
</script>

{#if enrichment}
  <section class="mt-8 pt-8 border-t border-[var(--hairline)]" aria-labelledby="studio-meta-heading">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Tv size={16} class="text-[var(--sage)]" />
        <h2 id="studio-meta-heading" class="text-base font-serif font-medium text-[var(--ink)]">
          Studio Metadata & Production
        </h2>
      </div>
      {#if enrichment.officialSite}
        <a 
          href={enrichment.officialSite} 
          target="_blank" 
          rel="noreferrer" 
          class="text-xs text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1 transition-colors"
        >
          <span>Official site</span>
          <Globe size={11} />
        </a>
      {/if}
    </div>

    <!-- Complication Badges Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <!-- Network / Studio -->
      <div class="p-3.5 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm">
        <span class="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">Network / Broadcaster</span>
        <span class="text-xs font-semibold text-[var(--ink)] font-mono truncate block">
          {enrichment.network || 'Independent'}
        </span>
      </div>

      <!-- Episode Duration -->
      <div class="p-3.5 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm">
        <span class="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">Average Runtime</span>
        <span class="text-xs font-semibold text-[var(--sage)] font-mono flex items-center gap-1">
          <Clock size={12} />
          {enrichment.averageRuntime ? `${enrichment.averageRuntime} min / ep` : 'Varies'}
        </span>
      </div>

      <!-- Premiere & Status -->
      <div class="p-3.5 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm">
        <span class="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">Release Status</span>
        <span class="text-xs font-semibold text-[var(--ink)] font-mono truncate block">
          {enrichment.premiered ? `${enrichment.premiered} · ${enrichment.status || 'Active'}` : (enrichment.status || 'Active')}
        </span>
      </div>

      <!-- Total Cataloged Episodes -->
      <div class="p-3.5 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm">
        <span class="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">Catalog Scope</span>
        <span class="text-xs font-semibold text-[var(--ink)] font-mono truncate block">
          {enrichment.episodes.length > 0 ? `${enrichment.episodes.length} episodes` : 'Standard Series'}
        </span>
      </div>
    </div>

    <!-- Cast / Voice Actors Strip (if available) -->
    {#if enrichment.cast.length > 0}
      <div class="mb-6">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] mb-3">
          <Users size={13} />
          <span>Key Voice Cast</span>
        </div>
        <div class="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {#each enrichment.cast as member}
            <div class="flex items-center gap-2.5 p-2 pr-3 rounded-full bg-[var(--surface)] border border-[var(--hairline)] shadow-xs flex-shrink-0">
              {#if member.image}
                <img 
                  src={member.image} 
                  alt={member.personName} 
                  class="w-7 h-7 rounded-full object-cover bg-stone-100" 
                  loading="lazy" 
                />
              {:else}
                <div class="w-7 h-7 rounded-full bg-[var(--canvas-secondary)] flex items-center justify-center text-[10px] font-semibold text-[var(--muted)]">
                  {member.personName[0]}
                </div>
              {/if}
              <div class="text-left">
                <div class="text-[11px] font-semibold text-[var(--ink)] leading-tight">{member.personName}</div>
                <div class="text-[10px] text-[var(--muted)] leading-tight">{member.characterName}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Sample Episodes Guide Strip (if available) -->
    {#if enrichment.episodes.length > 0}
      <div>
        <div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] mb-3">
          <Film size={13} />
          <span>Sample Episodes & Timings</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {#each enrichment.episodes.slice(0, 3) as ep}
            <div class="p-3 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-xs flex flex-col justify-between">
              {#if ep.image}
                <div class="aspect-video w-full rounded-md overflow-hidden bg-[var(--canvas-secondary)] mb-2 relative">
                  <img src={ep.image} alt={ep.name} class="w-full h-full object-cover" loading="lazy" />
                  {#if ep.runtime}
                    <span class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-sm bg-black/70 backdrop-blur-xs text-[10px] font-mono font-medium text-white">
                      {ep.runtime}m
                    </span>
                  {/if}
                </div>
              {/if}
              <div>
                <span class="text-[10px] font-mono text-[var(--muted)] block">S{ep.season} · E{ep.number}</span>
                <h4 class="text-xs font-semibold text-[var(--ink)] truncate mb-1">{ep.name}</h4>
                {#if ep.summary}
                  <p class="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed">{ep.summary}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{:else if loading}
  <div class="mt-6 py-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)] opacity-60">
    <Sparkles size={13} class="animate-spin text-[var(--sage)]" />
    <span>Checking studio records...</span>
  </div>
{/if}
