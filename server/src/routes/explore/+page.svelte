<script lang="ts">
  import { RotateCcw, SlidersHorizontal, Sparkles } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import ShowCard from '$lib/components/ShowCard.svelte';
  import SearchPill from '$lib/components/ui/SearchPill.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { autoAnimate } from '$lib/animations';
  import { CURATED_RESOURCES } from '$lib/curated-data';

  let query = $state('');
  let filterCategory = $state('all');
  let filterStim = $state('all');
  let filterAge = $state('all');
  let filterPlatform = $state('all');
  let currentPage = $state(1);
  const pageSize = 36;

  const categoryOptions = [
    { value: 'all', label: 'All Media' },
    { value: 'pbs', label: 'PBS Kids' },
    { value: 'nick_jr', label: 'Nick Jr.' },
    { value: 'disney', label: 'Disney' },
    { value: 'bbc', label: 'BBC Story' },
    { value: 'bedtime', label: 'Bedtime' },
    { value: 'nursery', label: 'Sing-Alongs' }
  ];

  const ageOptions = [
    { value: 'all', label: 'All Ages' },
    { value: '0', label: '0–2' },
    { value: '2', label: '2+' },
    { value: '4', label: '4+' },
    { value: '6', label: '6+' },
    { value: '8', label: '8+' }
  ];

  const paceOptions = [
    { value: 'all', label: 'All Paces' },
    { value: 'low', label: 'Quiet (<15 cuts)' }
  ];

  const platformOptions = [
    { value: 'all', label: 'All Platforms' },
    { value: 'YouTube', label: 'YouTube' },
    { value: 'Netflix', label: 'Netflix' },
    { value: 'Disney', label: 'Disney+' },
    { value: 'PBS', label: 'PBS Kids' }
  ];

  onMount(() => {
    const q = $page.url.searchParams.get('q');
    const stimulation = $page.url.searchParams.get('stimulation');
    const age = $page.url.searchParams.get('age');
    const cat = $page.url.searchParams.get('category');
    if (q) query = q;
    if (stimulation) filterStim = stimulation;
    if (age) filterAge = age;
    if (cat) filterCategory = cat;
  });

  let hasActiveFilters = $derived(query.trim() !== '' || filterCategory !== 'all' || filterStim !== 'all' || filterAge !== 'all' || filterPlatform !== 'all');

  let filtered = $derived(CURATED_RESOURCES.filter((resource) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery
      || resource.title.toLowerCase().includes(normalizedQuery)
      || (resource.description ?? '').toLowerCase().includes(normalizedQuery)
      || resource.platform.toLowerCase().includes(normalizedQuery)
      || resource.parentNote.toLowerCase().includes(normalizedQuery);
      
    const matchesStimulation = filterStim === 'all' || resource.stimulation_level === filterStim;
    const matchesAge = filterAge === 'all' || resource.age.includes(filterAge);
    const matchesPlatform = filterPlatform === 'all' || resource.platform.toLowerCase().includes(filterPlatform.toLowerCase());
    
    const matchesCategory = filterCategory === 'all'
      || (filterCategory === 'pbs' && (resource.platform === 'PBS' || (resource.description ?? '').toLowerCase().includes('pbs') || resource.title.toLowerCase().includes('arthur')))
      || (filterCategory === 'disney' && (resource.platform === 'Disney' || resource.title.toLowerCase().includes('disney')))
      || (filterCategory === 'bedtime' && (resource.title.toLowerCase().includes('lullaby') || resource.title.toLowerCase().includes('sleep') || (resource.description ?? '').toLowerCase().includes('sleep')))
      || (filterCategory === 'nursery' && (resource.title.toLowerCase().includes('rhyme') || resource.title.toLowerCase().includes('song') || resource.platform.toLowerCase().includes('youtube')))
      || (filterCategory === 'nick_jr' && (resource.title.toLowerCase().includes('blue') || resource.title.toLowerCase().includes('bear') || resource.title.toLowerCase().includes('dora')))
      || (filterCategory === 'bbc' && (resource.title.toLowerCase().includes('teletubbies') || resource.title.toLowerCase().includes('bob')));
    
    return matchesQuery && matchesStimulation && matchesAge && matchesPlatform && matchesCategory;
  }));

  let pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
  let pageItems = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

  function updateQuery(val: string) {
    query = val;
    currentPage = 1;
  }

  function setCategory(val: string) {
    filterCategory = val;
    currentPage = 1;
  }

  function setStim(val: string) {
    filterStim = val;
    currentPage = 1;
  }

  function setAge(val: string) {
    filterAge = val;
    currentPage = 1;
  }

  function setPlatform(val: string) {
    filterPlatform = val;
    currentPage = 1;
  }

  function clearFilters() {
    query = '';
    filterCategory = 'all';
    filterStim = 'all';
    filterAge = 'all';
    filterPlatform = 'all';
    currentPage = 1;
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage;
    window.scrollTo({ top: 80, behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title>The Library - Ask Zaen</title>
  <meta name="description" content="Browse 3,239 curated children's shows with verified low stimulation pacing and parent notes." />
</svelte:head>

<div class="page-wrap library-page">
  <!-- Apple Editorial Header -->
  <header class="mb-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p class="section-number">The archive</p>
        <h1 class="text-3xl sm:text-4xl font-serif font-normal text-[var(--ink)] mb-2">The Quiet Library</h1>
        <p class="text-sm text-[var(--muted)] max-w-xl">
          3,239 verified low-stimulation titles with empirical camera cut metrics and transparent caregiver notes.
        </p>
      </div>
      <div class="px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--hairline)] shadow-sm text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-2 self-start md:self-auto">
        <Sparkles size={14} class="text-[var(--sage)]" />
        <span><strong>{filtered.length.toLocaleString()}</strong> titles available</span>
      </div>
    </div>
  </header>

  <!-- Liquid Glass Filter Strip -->
  <section class="p-4 sm:p-5 rounded-[var(--radius-squircle-md)] bg-[var(--surface-glass)] backdrop-blur-xl border border-[var(--hairline)] shadow-[var(--shadow-ambient)] mb-8" aria-label="Search and filter controls">
    <!-- Reusable Search Pill -->
    <div class="mb-4">
      <SearchPill
        value={query}
        onInput={updateQuery}
        placeholder="Search by title, character, creator, or topic..."
        size="md"
      />
    </div>

    <!-- Category Dimensions Row -->
    <div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
      <SegmentedControl
        options={categoryOptions}
        value={filterCategory}
        onChange={setCategory}
        ariaLabel="Category filter"
      />
    </div>

    <!-- Reusable Segmented Control Filter Rows -->
    <div class="flex flex-wrap items-center gap-3 text-xs">
      <SegmentedControl
        options={paceOptions}
        value={filterStim}
        onChange={setStim}
        ariaLabel="Pace filter"
      />

      <SegmentedControl
        options={ageOptions}
        value={filterAge}
        onChange={setAge}
        ariaLabel="Age filter"
      />

      <SegmentedControl
        options={platformOptions}
        value={filterPlatform}
        onChange={setPlatform}
        ariaLabel="Platform filter"
      />

      {#if hasActiveFilters}
        <button
          type="button"
          onclick={clearFilters}
          class="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--terracotta)] hover:bg-[var(--terracotta-soft)] transition-colors"
        >
          <RotateCcw size={12} />
          Reset filters
        </button>
      {/if}
    </div>
  </section>

  <!-- Results Header & Top Pagination -->
  {#if filtered.length > 0}
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <p class="text-xs font-semibold text-[var(--muted)] inline-flex items-center gap-1.5">
        <SlidersHorizontal size={13} />
        Showing {pageItems.length} of {filtered.length.toLocaleString()} titles
      </p>

      <Pagination
        {currentPage}
        {pageCount}
        onPageChange={handlePageChange}
        ariaLabel="Top library pagination"
      />
    </div>

    <!-- Squircle Card Grid with autoAnimate micro-interactions -->
    <div class="show-grid" use:autoAnimate>
      {#each pageItems as show (show.id)}
        <ShowCard resource={show} />
      {/each}
    </div>

    <!-- Reusable Bottom Pagination -->
    {#if pageCount > 1}
      <div class="flex justify-center mt-12 mb-6">
        <Pagination
          {currentPage}
          {pageCount}
          onPageChange={handlePageChange}
          ariaLabel="Bottom library pagination"
        />
      </div>
    {/if}
  {:else}
    <!-- Reusable Empty State -->
    <EmptyState
      title="No quiet matches found"
      description="Try searching with broader terms or clear your active filters to view the full library."
      actionText="Clear all filters"
      onAction={clearFilters}
    />
  {/if}
</div>


