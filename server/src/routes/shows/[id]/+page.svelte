<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, ArrowUpRight, Heart } from '@lucide/svelte';
  import SensoryInstrument from '$lib/components/ui/SensoryInstrument.svelte';
  import StudioEnrichment from '$lib/components/ui/StudioEnrichment.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { favoritesStore } from '$lib/stores/favorites.svelte';
  import { parseCutRate } from '$lib/utils/format';
  import { REVIEWED_RESOURCES } from '$lib/curated-data';

  let show = $derived(REVIEWED_RESOURCES.find((resource) => resource.id === $page.params.id || resource.id === `show-${$page.params.id}`));
  
  let isCalm = $derived(show?.stimulation_level === 'low');
  let isBad = $derived(show?.publicBucket === 'bad');
  
  let cutRate = $derived(parseCutRate(show?.reviewerNotes));
  let cutRateNum = $derived(cutRate !== null ? cutRate : (isCalm ? 4.2 : 45.0));

  let dynamicPoster = $state<string | null>(null);
  let activePoster = $derived(dynamicPoster || (show?.imageUrl ? show.imageUrl.replace('medium_portrait', 'original_untouched') : ''));
</script>

<svelte:head>
  {#if show}
    <title>{show.title} - Ask Zaen</title>
    <meta name="description" content={show.description} />
  {:else}
    <title>Content not found - Ask Zaen</title>
  {/if}
</svelte:head>

<div class="page-wrap detail-page">
  <div class="mb-6">
    <a href="/explore" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] shadow-sm transition-all duration-200">
      <ArrowLeft size={14} /> Back to Library
    </a>
  </div>

  {#if show}
    <div class="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start mb-14">
      <!-- Ambient Backlit Poster Column -->
      <div class="md:col-span-4 lg:col-span-5 flex flex-col items-center">
        <div class="detail-poster-frame">
          {#if activePoster}
            <img 
              src={activePoster} 
              alt={show.title}
              class="detail-poster-image transition-opacity duration-300"
            />
          {:else}
            <div class="detail-poster-fallback">
              {show.title[0]}
            </div>
          {/if}

          <!-- Floating Badge -->
          <div class="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md {isBad ? 'bg-[#A44C20]/90 text-white' : 'bg-black/60 text-white'}">
            {isBad ? 'Not Approved' : 'Certified Calm'}
          </div>
        </div>
      </div>

      <!-- Detail Info Column -->
      <div class="md:col-span-8 lg:col-span-7 flex flex-col">
        <div class="flex items-center gap-2.5 mb-2.5 flex-wrap">
          <span class="px-3 py-1 rounded-full text-xs font-semibold {isBad ? 'bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)] border border-[var(--terracotta-border)]' : 'bg-[var(--sage-soft)] text-[var(--sage-dark)] border border-[var(--sage-border)]'}">
            {isBad ? 'Exceeds Stimulation Threshold' : 'Quiet Pace Standard'}
          </span>
          <span class="text-xs text-[var(--muted)] font-medium">Ages {show.age || 'All ages'}</span>
          <span class="text-xs text-[var(--muted)] font-medium">• {show.platform}</span>
        </div>

        <h1 class="text-3xl sm:text-4xl font-serif font-medium text-[var(--ink)] mb-4 leading-tight">
          {show.title}
        </h1>

        <p class="text-sm sm:text-base text-[var(--muted)] leading-relaxed mb-6 font-normal">
          {show.type === 'video' ? show.parentNote : show.description}
        </p>

        <!-- Reusable Apple Health Sensory Instrument Component -->
        <div class="mb-6">
          <SensoryInstrument
            cutRate={cutRateNum}
            acousticTone={isBad ? 'High Dynamic Range' : 'Gentle Dialogue'}
            reviewScope={show.metadataOnly ? 'Listing Only' : 'Playback Verified'}
            confidence={show.confidence}
            {isBad}
          />
        </div>

        <!-- Action Dock -->
        <div class="flex flex-wrap items-center gap-3.5 mb-8">
          <button 
            type="button" 
            onclick={() => favoritesStore.toggle(show.id)}
            class="px-5 py-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-all duration-200 {favoritesStore.has(show.id) ? 'bg-[var(--sage)] text-white shadow-sm' : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--hairline)] hover:border-stone-400'}"
          >
            <Heart size={16} fill={favoritesStore.has(show.id) ? 'currentColor' : 'none'} />
            <span>{favoritesStore.has(show.id) ? 'Saved in My List' : 'Save to My List'}</span>
          </button>

          <a 
            href={show.linkUrl} 
            target="_blank" 
            rel="noreferrer" 
            class="px-5 py-3 rounded-full bg-[var(--terracotta)] hover:bg-[var(--terracotta-dark)] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-md duration-200"
          >
            <span>{show.type === 'video' ? 'Watch on YouTube' : `Watch on ${show.platform}`}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>

        <!-- Caregiver Review Note -->
        <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)] mb-6">
          <p class="section-number">{isBad ? 'Exclusion Rationale' : 'Why it is in the guide'}</p>
          <p class="text-xs sm:text-sm text-[var(--ink)] leading-relaxed mb-3">
            {show.parentNote}
          </p>
          {#if !isBad}
            <p class="text-[11px] text-[var(--muted)] italic">
              Note: Every child has unique sensory thresholds. We recommend introducing any new title during daytime hours.
            </p>
          {/if}
        </div>

        <!-- TVmaze Hybrid Studio Metadata & Production Enrichment -->
        <StudioEnrichment title={show.title} onPosterLoaded={(url) => { if (!show.imageUrl) dynamicPoster = url; }} />

        <!-- Evidence & Sources -->
        {#if show.evidence && show.evidence.length > 0}
          <div class="p-4 rounded-xl bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)]">
            <p class="section-number mb-2">Review Sources</p>
            <div class="flex flex-wrap gap-2 text-xs">
              {#each show.evidence as ev}
                <a 
                  href={ev.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  class="px-3 py-1 rounded-full bg-white border border-[var(--hairline)] text-[var(--ink)] hover:text-[var(--sage)] inline-flex items-center gap-1 transition-colors"
                >
                  <span>{ev.note || ev.supports || 'Source Verification'}</span>
                  <ArrowUpRight size={12} />
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <EmptyState
      title="Content not found"
      description="That title is not currently part of the verified database."
      actionText="Browse the Library"
      actionHref="/explore"
    />
  {/if}
</div>


