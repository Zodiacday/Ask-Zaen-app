<script lang="ts">
  import { ArrowRight, ArrowUpRight, ShieldAlert } from '@lucide/svelte';
  import SearchPill from '$lib/components/ui/SearchPill.svelte';
  import WaveformContrast from '$lib/components/ui/WaveformContrast.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { BAD_RESOURCES } from '$lib/curated-data';

  let query = $state('');
  let currentPage = $state(1);
  const pageSize = 30;
  const badCount = BAD_RESOURCES.length;

  let filteredBad = $derived(BAD_RESOURCES.filter((resource) => {
    const term = query.trim().toLowerCase();
    return !term || [resource.title, resource.description, resource.platform, resource.shortReason, resource.parentNote]
      .some((value) => (value ?? '').toLowerCase().includes(term));
  }));
  let pageCount = $derived(Math.max(1, Math.ceil(filteredBad.length / pageSize)));
  let pageItems = $derived(filteredBad.slice((currentPage - 1) * pageSize, currentPage * pageSize));

  function updateQuery(value: string) {
    query = value;
    currentPage = 1;
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage;
    window.scrollTo({ top: 380, behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title>The Boundary - Ask Zaen</title>
  <meta name="description" content="Transparent documentation of 3,139 titles held out of the calm shelf due to rapid optical cuts or hyper-stimulation cues." />
</svelte:head>

<div class="page-wrap bad-page">
  <!-- Concise Header -->
  <header class="mb-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl sm:text-4xl font-serif font-normal text-[var(--ink)] mb-1.5">The Boundary</h1>
        <p class="text-sm text-[var(--muted)] max-w-xl">
          Titles held out from the calm shelf due to rapid camera cuts or high sensory arousal.
        </p>
      </div>
      <div class="px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--terracotta-border)] shadow-sm text-xs font-semibold text-[var(--terracotta-dark)] inline-flex items-center gap-2 self-start md:self-auto">
        <ShieldAlert size={14} />
        <span><strong>{badCount.toLocaleString()}</strong> excluded titles</span>
      </div>
    </div>
  </header>

  <!-- Reusable Neurobiology Waveform Comparison Component -->
  <section class="mb-10" aria-label="Visual pacing comparison">

    <WaveformContrast />
  </section>

  <!-- Reusable Fluid Search Pill Component -->
  <section class="p-4 rounded-[var(--radius-squircle-md)] bg-[var(--surface-glass)] backdrop-blur-xl border border-[var(--hairline)] shadow-[var(--shadow-ambient)] mb-6" aria-label="Search excluded titles">
    <SearchPill
      value={query}
      onInput={updateQuery}
      placeholder="Search title, channel, creator, or review reasoning..."
      accentColor="terracotta"
      size="md"
    />
  </section>

  <!-- Status Bar & Top Pagination -->
  <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
    <p class="text-xs font-semibold text-[var(--muted)]">
      Showing {pageItems.length} of {filteredBad.length.toLocaleString()} titles held out
    </p>

    <Pagination
      {currentPage}
      {pageCount}
      onPageChange={handlePageChange}
      ariaLabel="Top boundary pagination"
    />
  </div>

  <!-- Diagnostic Title Cards -->
  {#if pageItems.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10" aria-label="List of excluded titles">
      {#each pageItems as show (show.id)}
        <article class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--surface)] border border-[var(--hairline)] hover:border-[var(--terracotta-border)] shadow-[var(--shadow-ambient)] transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-3 mb-2.5">
              <span class="px-2.5 py-0.5 rounded-full bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)] text-xs font-semibold border border-[var(--terracotta-border)]">
                Not Approved
              </span>
              <span class="text-xs text-[var(--muted)] font-medium">
                {show.platform} • Ages {show.age || 'Unspecified'}
              </span>
            </div>

            <h3 class="text-base font-semibold text-[var(--ink)] mb-1 leading-snug">
              <a href={`/shows/${show.id}`} class="hover:text-[var(--terracotta)] transition-colors">
                {show.title}
              </a>
            </h3>

            {#if show.metadataOnly}
              <p class="text-xs text-amber-700 font-medium mb-1.5">
                Listing review only; full playback not certified.
              </p>
            {/if}

            <p class="text-xs text-[var(--terracotta-dark)] font-medium mb-2 leading-relaxed">
              {show.shortReason}
            </p>

            <p class="text-xs text-[var(--muted)] leading-relaxed line-clamp-3 mb-4">
              {show.parentNote}
            </p>
          </div>

          <div class="pt-3 border-t border-[var(--hairline-subtle)] flex items-center justify-between text-xs">
            <a href={`/shows/${show.id}`} class="font-semibold text-[var(--ink)] hover:text-[var(--terracotta)] inline-flex items-center gap-1 transition-colors">
              Full diagnostic note <ArrowRight size={12} />
            </a>
            <div class="flex items-center gap-2">
              {#each show.evidence.slice(0, 1) as evidence}
                <a href={evidence.url} target="_blank" rel="noreferrer" class="text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-0.5">
                  Source <ArrowUpRight size={11} />
                </a>
              {/each}
            </div>
          </div>
        </article>
      {/each}
    </div>

    <!-- Reusable Bottom Pagination -->
    {#if filteredBad.length > pageSize}
      <div class="flex justify-center mb-10">
        <Pagination
          {currentPage}
          {pageCount}
          onPageChange={handlePageChange}
          ariaLabel="Bottom boundary pagination"
        />
      </div>
    {/if}
  {:else}
    <EmptyState
      title="No boundary reviews match that search"
      description="Try searching another title, channel, or symptom description."
      actionText="Clear search"
      onAction={() => updateQuery('')}
    />
  {/if}
</div>


