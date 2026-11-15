<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { Resource } from '$lib/types';
  import ShowCard from '$lib/components/ShowCard.svelte';

  let {
    title,
    eyebrow = '',
    href = '',
    items = []
  } = $props<{
    title: string;
    eyebrow?: string;
    href?: string;
    items: Resource[];
  }>();

  let trackEl = $state<HTMLDivElement | null>(null);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(true);

  function updateScrollState() {
    if (!trackEl) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackEl;
    canScrollLeft = scrollLeft > 12;
    canScrollRight = scrollLeft + clientWidth < scrollWidth - 12;
  }

  function scroll(direction: 'left' | 'right') {
    if (!trackEl) return;
    const scrollAmount = trackEl.clientWidth * 0.75;
    trackEl.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }

  onMount(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  });
</script>

<section class="row-carousel-section" aria-label={title}>
  <div class="row-carousel-header">
    <div class="row-carousel-header__left">
      {#if eyebrow}
        <p class="row-carousel-eyebrow">{eyebrow}</p>
      {/if}
      <h2 class="row-carousel-title">{title}</h2>
    </div>

    {#if href}
      <a {href} class="row-carousel-see-all">
        <span>See all</span>
        <ArrowRight size={14} />
      </a>
    {/if}
  </div>

  <div class="row-carousel-wrapper">
    <!-- Left Navigation Button -->
    {#if canScrollLeft}
      <button
        type="button"
        class="row-carousel-nav row-carousel-nav--prev motion-press"
        onclick={() => scroll('left')}
        aria-label={`Scroll ${title} left`}
      >
        <ChevronLeft size={22} />
      </button>
    {/if}

    <!-- Scroll Track -->
    <div
      class="row-carousel-track"
      bind:this={trackEl}
      onscroll={updateScrollState}
      aria-label={`${title} carousel`}
    >
      {#each items as resource (resource.id)}
        <div class="row-carousel-item">
          <ShowCard {resource} />
        </div>
      {/each}
    </div>

    <!-- Right Navigation Button -->
    {#if canScrollRight}
      <button
        type="button"
        class="row-carousel-nav row-carousel-nav--next motion-press"
        onclick={() => scroll('right')}
        aria-label={`Scroll ${title} right`}
      >
        <ChevronRight size={22} />
      </button>
    {/if}
  </div>
</section>

<style>
  .row-carousel-section {
    max-width: 1240px;
    margin: 0 auto 52px;
    position: relative;
  }

  .row-carousel-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .row-carousel-eyebrow {
    margin: 0 0 4px;
    color: var(--terracotta);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .row-carousel-title {
    margin: 0;
    color: var(--ink);
    font-family: var(--font-serif);
    font-size: clamp(26px, 2.6vw, 34px);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.15;
  }

  .row-carousel-see-all {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: var(--terracotta);
    font-size: 12px;
    font-weight: 700;
    transition: color 0.2s, transform 0.2s;
  }

  .row-carousel-see-all:hover {
    color: var(--terracotta-dark);
    transform: translateX(2px);
  }

  .row-carousel-wrapper {
    position: relative;
    width: 100%;
  }

  .row-carousel-track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 6px 2px 18px;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .row-carousel-track::-webkit-scrollbar {
    display: none;
  }

  .row-carousel-item {
    flex: 0 0 256px;
    scroll-snap-align: start;
  }

  @media (max-width: 640px) {
    .row-carousel-item {
      flex: 0 0 220px;
    }
  }

  /* Floating Chevron Navigation */
  .row-carousel-nav {
    position: absolute;
    top: 38%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--hairline);
    color: var(--ink);
    box-shadow: 0 6px 20px rgba(74, 63, 56, 0.16);
    z-index: 10;
    cursor: pointer;
    transition: all 0.22s var(--ease-apple);
    opacity: 0.92;
  }

  .row-carousel-nav:hover {
    background: #FFFFFF;
    color: var(--terracotta);
    border-color: var(--terracotta-border);
    transform: translateY(-50%) scale(1.08);
    box-shadow: 0 8px 26px rgba(74, 63, 56, 0.24);
    opacity: 1;
  }

  .row-carousel-nav--prev {
    left: -18px;
  }

  .row-carousel-nav--next {
    right: -18px;
  }

  @media (max-width: 768px) {
    .row-carousel-nav {
      display: none; /* Mobile touch swipe is preferred */
    }
  }
</style>
