<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowLeft, Compass, Filter, Layers, Sparkles, X } from '@lucide/svelte';
  import type { CategoryInfo, ReviewedResource } from '$lib/types';
  import { DEFAULT_CATEGORIES, fetchCategories, fetchCategoryMedia } from '$lib/categories';
  import CategoryCard from '$lib/components/CategoryCard.svelte';
  import ShowCard from '$lib/components/ShowCard.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { autoAnimate, pressable } from '$lib/animations';

  let categories = $state<CategoryInfo[]>(DEFAULT_CATEGORIES);
  let selectedTab = $state('all');
  let activeCategory = $state<CategoryInfo | null>(null);
  let categoryItems = $state<ReviewedResource[]>([]);
  let isLoadingItems = $state(false);
  let currentPage = $state(1);
  let totalItems = $state(0);
  let totalPages = $state(1);
  const pageSize = 18;

  const tabOptions = [
    { value: 'all', label: 'All Dimensions' },
    { value: 'music', label: 'Music & Audio' },
    { value: 'show', label: 'Classic Shows' },
    { value: 'video', label: 'Calm Videos' },
    { value: 'warning', label: 'Sensory Boundary' }
  ];

  let filteredCategories = $derived(
    categories.filter((cat) => {
      if (selectedTab === 'all') return true;
      if (selectedTab === 'music') return cat.mediaType === 'music';
      if (selectedTab === 'show') return cat.mediaType === 'show' || (cat.id === 'disney' && cat.mediaType === 'all');
      if (selectedTab === 'video') return cat.mediaType === 'video' && cat.id !== 'bad';
      if (selectedTab === 'warning') return cat.id === 'bad';
      return true;
    })
  );

  async function selectCategory(cat: CategoryInfo, pageNum = 1) {
    activeCategory = cat;
    currentPage = pageNum;
    isLoadingItems = true;
    try {
      const res = await fetchCategoryMedia(cat.id, pageNum, pageSize);
      categoryItems = res.items;
      totalItems = res.total;
      totalPages = res.pages;
    } catch {
      categoryItems = [];
      totalItems = 0;
      totalPages = 1;
    } finally {
      isLoadingItems = false;
    }
  }

  function handlePageChange(newPage: number) {
    if (activeCategory) {
      selectCategory(activeCategory, newPage);
      const shelfElem = document.getElementById('category-shelf');
      shelfElem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function closeShelf() {
    activeCategory = null;
    categoryItems = [];
  }

  onMount(async () => {
    const fetched = await fetchCategories();
    categories = fetched;

    // Check for category id in URL params
    const initialId = $page.url.searchParams.get('id');
    if (initialId) {
      const match = categories.find((c) => c.id === initialId);
      if (match) {
        selectCategory(match);
      }
    }
  });
</script>

<svelte:head>
  <title>Dimensions & Categories — Ask Zaen</title>
  <meta name="description" content="Explore classified dimensions: Bedtime audio, toddler sing-alongs, PBS Kids, Nick Jr., Disney, and certified low-stimulation videos." />
</svelte:head>

<main class="page-categories pb-24">
  <!-- Minimalist Ceramic Header -->
  <header class="sanctuary-hero border-b border-ceramic-border/60 bg-white/70 backdrop-blur-xl py-12 px-6">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="max-w-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-4 border border-slate-200/80">
          <Layers size={13} class="text-slate-800" />
          <span>Classified Taxonomy</span>
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.15]">
          Curated Dimensions.
        </h1>
        <p class="mt-3 text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
          381,562 media assets classified by frequency, developmental pacing, and sensory tempo.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a
          href="/explore"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold tracking-wide hover:bg-slate-800 transition-colors shadow-sm motion-press"
          use:pressable
        >
          <Compass size={15} />
          <span>Full Library</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Navigation Filters -->
  <div class="max-w-6xl mx-auto px-6 py-8">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
      <SegmentedControl
        options={tabOptions}
        value={selectedTab}
        onChange={(v) => selectedTab = v}
        ariaLabel="Category dimensions"
      />
      <div class="text-xs text-slate-500 font-medium">
        <span>Showing {filteredCategories.length} dimensions</span>
      </div>
    </div>

    <!-- Category Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8" use:autoAnimate>
      {#each filteredCategories as cat (cat.id)}
        <CategoryCard
          category={cat}
          active={activeCategory?.id === cat.id}
          onSelect={(c) => selectCategory(c, 1)}
        />
      {/each}
    </div>
  </div>

  <!-- Live Shelf / Modal Inspection Area -->
  {#if activeCategory}
    <section id="category-shelf" class="max-w-6xl mx-auto px-6 mt-12 scroll-mt-24" use:autoAnimate>
      <div class="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] backdrop-blur-2xl p-6 sm:p-8 shadow-[var(--shadow-ambient)] relative overflow-hidden text-[var(--ink)]">
        <!-- Shelf Top Bar -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--hairline)]">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)] text-xs font-semibold mb-2">
              <Sparkles size={13} />
              <span>{activeCategory.badge}</span>
              <span class="opacity-40">•</span>
              <span>{activeCategory.ageRange}</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight">
              {activeCategory.title}
            </h2>
            <p class="text-sm sm:text-base text-[var(--muted)] mt-1 max-w-2xl">
              {activeCategory.tagline}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <a
              href={`/explore?category=${activeCategory.id}`}
              class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--canvas-secondary)] text-[var(--ink)] text-xs font-medium hover:bg-[var(--terracotta-soft)] hover:text-[var(--terracotta-dark)] border border-[var(--hairline-subtle)] transition-colors motion-press"
              use:pressable
            >
              <Compass size={14} />
              <span>Explore in Search</span>
            </a>
            <button
              type="button"
              class="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas-secondary)] transition-colors motion-press"
              onclick={closeShelf}
              aria-label="Close category shelf"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <!-- Shelf Media Content -->
        <div class="mt-8">
          {#if isLoadingItems}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
              {#each Array(6) as _}
                <div class="h-56 rounded-2xl bg-[var(--canvas-secondary)]"></div>
              {/each}
            </div>
          {:else if categoryItems.length === 0}
            <EmptyState
              title="No media found in this category"
              description="Check back shortly or explore the broader catalog."
              actionText="Return to all dimensions"
              onAction={closeShelf}
            />
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {#each categoryItems as item (item.id)}
                <ShowCard resource={item} />
              {/each}
            </div>

            <!-- Shelf Pagination -->
            {#if totalPages > 1}
              <div class="mt-10 pt-6 border-t border-slate-100 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  pageCount={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </section>
  {/if}
</main>
