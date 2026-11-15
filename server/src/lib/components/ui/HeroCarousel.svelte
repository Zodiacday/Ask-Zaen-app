<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, ChevronLeft, ChevronRight, Heart, Info, Play } from '@lucide/svelte';
  import type { Resource } from '$lib/types';
  import { favoritesStore } from '$lib/stores/favorites.svelte';
  import { getHeroBackdropUrl, getHighResImageUrl, parseCutRate, parseStimulationScore } from '$lib/utils/format';
  import ProviderCard from './ProviderCard.svelte';

  let {
    items = [],
    providers = [
      { label: 'YouTube', key: 'youtube', query: 'YouTube' },
      { label: 'Netflix', key: 'netflix', query: 'Netflix' },
      { label: 'Disney+', key: 'disney', query: 'Disney' },
      { label: 'Apple TV+', key: 'apple', query: 'Apple' }
    ],
    autoRotateInterval = 7000
  } = $props<{
    items: Resource[];
    providers?: Array<{ label: string; key: string; query: string }>;
    autoRotateInterval?: number;
  }>();

  let activeIndex = $state(0);
  let isPaused = $state(false);

  let currentItem = $derived(items[activeIndex] ?? items[0]);
  let cleanTitle = $derived(
    currentItem?.title
      ? currentItem.title.split('|')[0].replace(/\s*\+\s*More.*$/i, '').trim()
      : 'A quieter way to watch'
  );
  let isSaved = $derived(currentItem ? favoritesStore.has(currentItem.id) : false);

  let cutRate = $derived(parseCutRate(currentItem?.reviewerNotes));
  let pacingStandard = $derived(
    cutRate !== null && cutRate > 0
      ? `${cutRate.toFixed(1)} cuts/min`
      : currentItem?.signals?.visualPace === 'low'
        ? 'Gentle Transitions'
        : 'Steady Transitions'
  );
  let stimulationScore = $derived(parseStimulationScore(currentItem?.reviewerNotes));
  let stimulationDisplay = $derived(
    stimulationScore !== null
      ? `Gentle (${stimulationScore}/100)`
      : currentItem?.stimulation_level === 'low'
        ? 'Gentle & Low'
        : 'Moderate'
  );
  let audioProfile = $derived(
    currentItem?.signals?.soundIntensity === 'low'
      ? 'Soft Acoustics'
      : 'Balanced Audio'
  );
  let targetAgeDisplay = $derived(
    currentItem?.age ? `Ages ${currentItem.age}` : 'All Ages'
  );
  let auditStatus = $derived(
    currentItem?.reviewScope === 'full'
      ? 'Full Playback Certified'
      : currentItem?.reviewScope === 'sampled'
        ? 'Sampled Audit'
        : 'Pacing Certified'
  );
  let realSummary = $derived(
    currentItem?.parentNote || currentItem?.shortReason || currentItem?.description || 'Gentle stories and songs for softer screen time.'
  );

  function nextSlide() {
    if (items.length > 0) {
      activeIndex = (activeIndex + 1) % items.length;
    }
  }

  function prevSlide() {
    if (items.length > 0) {
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    }
  }

  function toggleFavorite() {
    if (currentItem) {
      favoritesStore.toggle(currentItem.id);
    }
  }

  onMount(() => {
    const timer = setInterval(() => {
      if (!isPaused && items.length > 1) {
        nextSlide();
      }
    }, autoRotateInterval);

    return () => clearInterval(timer);
  });
</script>

<section
  class="hero-carousel"
  aria-label="Featured showcase"
  onmouseenter={() => isPaused = true}
  onmouseleave={() => isPaused = false}
  onfocusin={() => isPaused = true}
  onfocusout={() => isPaused = false}
>
  <!-- Backdrop Slides -->
  <div class="hero-carousel__backdrops" aria-hidden="true">
    {#each items as item, idx (item.id)}
      <div
        class="hero-carousel__backdrop-slide"
        class:is-active={idx === activeIndex}
      >
        {#if item.imageUrl}
          <img
            src={getHeroBackdropUrl(item.imageUrl)}
            alt=""
            class="hero-carousel__img"
            onerror={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              if (el.src.includes('maxresdefault.jpg')) {
                el.src = el.src.replace('maxresdefault.jpg', 'sddefault.jpg');
              } else if (el.src.includes('sddefault.jpg')) {
                el.src = el.src.replace('sddefault.jpg', 'hqdefault.jpg');
              } else if (item.imageUrl && el.src !== item.imageUrl) {
                el.src = item.imageUrl;
              }
            }}
          />
        {/if}
      </div>
    {/each}
  </div>

  <div class="hero-carousel__scrim"></div>

  <!-- Main Hero Grid Content -->
  <div class="hero-carousel__grid">
    <div class="hero-carousel__left">
      <h1 class="hero-carousel__title">{cleanTitle}</h1>

      <div class="hero-carousel__meta" aria-label="Content attributes">
        <span class="hero-carousel__badge">
          {currentItem?.stimulation_level === 'low' ? 'Quiet Pace' : 'Moderate Pace'}
        </span>
        <span class="hero-carousel__dot">•</span>
        <span>Ages {currentItem?.age || '0–5'}</span>
        <span class="hero-carousel__dot">•</span>
        <span>{currentItem?.platform || 'Curated'}</span>
        <span class="hero-carousel__dot">•</span>
        <span class="hero-carousel__quality">4K HDR</span>
      </div>

      <p class="hero-carousel__synopsis">
        {realSummary}
      </p>

      <div class="hero-carousel__actions">
        <a
          class="hero-action hero-action--play motion-press"
          href={currentItem?.linkUrl || (currentItem ? `/shows/${currentItem.id}` : '/explore')}
          target={currentItem?.linkUrl ? '_blank' : undefined}
          rel={currentItem?.linkUrl ? 'noreferrer' : undefined}
        >
          <Play size={18} fill="currentColor" />
          <span>Play</span>
        </a>

        <button
          class="hero-action hero-action--icon motion-press"
          class:is-favorite={isSaved}
          type="button"
          onclick={toggleFavorite}
          aria-label={isSaved ? 'Remove from My List' : 'Add to My List'}
        >
          <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        <a
          class="hero-action hero-action--icon motion-press"
          href={currentItem ? `/shows/${currentItem.id}` : '/explore'}
          aria-label="View content details and review notes"
        >
          <Info size={20} />
        </a>
      </div>
    </div>

    <!-- Frosted Complication Card with Real Data -->
    <div class="hero-carousel__right">
      <div class="hero-meta-glass">
        <div class="hero-meta-glass__header">
          <span class="hero-meta-glass__provider">{currentItem?.platform || 'Ask Zaen Curated'}</span>
          <span class="hero-meta-glass__status">{auditStatus}</span>
        </div>
        <div class="hero-meta-glass__rows">
          <div class="hero-meta-glass__row">
            <span class="label">Stimulation</span>
            <span class="value val-calm">{stimulationDisplay}</span>
          </div>
          <div class="hero-meta-glass__row">
            <span class="label">Pacing Standard</span>
            <span class="value">{pacingStandard}</span>
          </div>
          <div class="hero-meta-glass__row">
            <span class="label">Target Age</span>
            <span class="value">{targetAgeDisplay}</span>
          </div>
          <div class="hero-meta-glass__row">
            <span class="label">Audio Profile</span>
            <span class="value">{audioProfile}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Side Chevron Buttons (Netflix Billboard style) -->
  {#if items.length > 1}
    <button
      type="button"
      class="hero-carousel__arrow hero-carousel__arrow--left motion-press"
      onclick={prevSlide}
      aria-label="Previous featured title"
    >
      <ChevronLeft size={28} />
    </button>

    <button
      type="button"
      class="hero-carousel__arrow hero-carousel__arrow--right motion-press"
      onclick={nextSlide}
      aria-label="Next featured title"
    >
      <ChevronRight size={28} />
    </button>
  {/if}

  <!-- Slide Indicator Pills -->
  <div class="hero-carousel__indicators" aria-label="Featured slides">
    {#each items as item, index (item.id)}
      <button
        class="hero-indicator"
        class:is-active={index === activeIndex}
        type="button"
        onclick={() => activeIndex = index}
        aria-label={`Go to slide ${index + 1}`}
      >
        <span class="hero-indicator__bar"></span>
      </button>
    {/each}
  </div>

  <!-- Premium Provider Cards Bar -->
  {#if providers.length > 0}
    <div class="hero-providers">
      <div class="hero-providers__header">
        <h2>Browse by provider</h2>
        <a href="/explore">
          <span>See all</span>
          <ArrowRight size={14} />
        </a>
      </div>
      <div class="hero-providers__rail">
        {#each providers as provider}
          <ProviderCard label={provider.label} key={provider.key} query={provider.query} />
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .hero-carousel {
    position: relative;
    min-height: 70vh;
    max-height: 750px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
    color: #FFFFFF;
  }

  @media (max-width: 768px) {
    .hero-carousel {
      min-height: 580px;
      max-height: none;
    }
  }

  .hero-carousel__backdrops {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .hero-carousel__backdrop-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.8s ease-in-out;
    pointer-events: none;
  }

  .hero-carousel__backdrop-slide.is-active {
    opacity: 1;
    pointer-events: auto;
  }

  .hero-carousel__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    transform: none;
    transition: opacity 0.8s ease-in-out;
  }

  .hero-carousel__backdrop-slide.is-active .hero-carousel__img {
    transform: none;
  }

  .hero-carousel__scrim {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(to right, rgba(20, 16, 13, 0.86) 0%, rgba(20, 16, 13, 0.52) 34%, rgba(20, 16, 13, 0.08) 64%, transparent 80%),
      linear-gradient(to bottom, transparent 65%, rgba(250, 248, 245, 0.45) 86%, rgba(250, 248, 245, 0.96) 97%, #FAF8F5 100%),
      linear-gradient(to bottom, rgba(20, 16, 13, 0.45) 0%, transparent 20%);
  }

  .hero-carousel__grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr;
    align-items: flex-end;
    gap: 32px;
    width: 100%;
    max-width: 1380px;
    margin: 0 auto;
    padding: 120px 6vw 144px;
  }

  @media (min-width: 1024px) {
    .hero-carousel__grid {
      grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
      gap: 48px;
    }
  }

  .hero-carousel__left {
    max-width: 680px;
  }

  .hero-carousel__title {
    margin: 0 0 14px;
    color: #FFFFFF;
    text-shadow: 0 3px 20px rgba(0, 0, 0, 0.85);
    font-family: var(--font-serif);
    font-size: clamp(2.4rem, 4.4vw, 4.2rem);
    font-weight: 400;
    letter-spacing: -0.04em;
    line-height: 1.02;
    text-wrap: balance;
  }

  .hero-carousel__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 18px;
  }

  .hero-carousel__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .hero-carousel__dot {
    color: rgba(255, 255, 255, 0.4);
    font-size: 10px;
  }

  .hero-carousel__quality {
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.32);
    color: rgba(255, 255, 255, 0.92);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .hero-carousel__synopsis {
    max-width: 580px;
    margin: 0 0 28px;
    color: rgba(255, 255, 255, 0.88);
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
    font-size: 15px;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-carousel__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hero-action {
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.25s var(--ease-apple);
    text-decoration: none;
    cursor: pointer;
  }

  .hero-action--play {
    padding: 0 28px;
    background: var(--terracotta);
    color: #FFFFFF;
    box-shadow: 0 6px 20px rgba(200, 100, 50, 0.35);
  }

  .hero-action--play:hover {
    background: var(--terracotta-dark);
    transform: translateY(-2px);
    box-shadow: 0 10px 26px rgba(200, 100, 50, 0.45);
  }

  .hero-action--icon {
    width: 48px;
    height: 48px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: #FFFFFF;
  }

  .hero-action--icon:hover,
  .hero-action--icon.is-favorite {
    background: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    color: #FFFFFF;
  }

  .hero-action--icon.is-favorite {
    color: var(--terracotta-soft);
  }

  .hero-carousel__right {
    display: flex;
    justify-content: flex-start;
  }

  @media (min-width: 1024px) {
    .hero-carousel__right {
      justify-content: flex-end;
    }
  }

  /* Chevron Arrows */
  .hero-carousel__arrow {
    position: absolute;
    top: 42%;
    transform: translateY(-50%);
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(28, 22, 19, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    z-index: 10;
    cursor: pointer;
    transition: all 0.25s var(--ease-apple);
    opacity: 0.6;
  }

  .hero-carousel:hover .hero-carousel__arrow {
    opacity: 0.9;
  }

  .hero-carousel__arrow:hover {
    opacity: 1;
    background: rgba(28, 22, 19, 0.7);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-50%) scale(1.08);
  }

  .hero-carousel__arrow--left {
    left: 2vw;
  }

  .hero-carousel__arrow--right {
    right: 2vw;
  }

  @media (max-width: 768px) {
    .hero-carousel__arrow {
      display: none;
    }
  }

  /* Bottom Indicator Pills */
  .hero-carousel__indicators {
    position: absolute;
    right: 6vw;
    bottom: 115px;
    display: flex;
    align-items: center;
    gap: 7px;
    z-index: 10;
  }

  .hero-indicator {
    width: 20px;
    height: 14px;
    padding: 0;
    display: grid;
    place-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .hero-indicator__bar {
    width: 8px;
    height: 8px;
    display: block;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.35);
    transition: width 0.24s var(--ease-apple), background 0.24s ease;
  }

  .hero-indicator.is-active .hero-indicator__bar {
    width: 28px;
    background: #FFFFFF;
  }

  /* Provider Bar at the Bottom */
  .hero-providers {
    position: absolute;
    right: 6vw;
    bottom: 24px;
    left: 6vw;
    z-index: 5;
  }

  .hero-providers__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 16px;
  }

  .hero-providers__header h2 {
    margin: 0;
    color: #FFFFFF;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.03em;
  }

  .hero-providers__header a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
    font-size: 12px;
    font-weight: 700;
  }

  .hero-providers__header a:hover {
    color: #FFFFFF;
  }

  .hero-providers__rail {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }


  @media (max-width: 640px) {
    .hero-providers__rail {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
