<script lang="ts">
  import type { CategoryInfo } from '$lib/types';
  import { pressable, springHover } from '$lib/animations';
  import {
    BookOpen,
    CloudSun,
    Moon,
    Music,
    PawPrint,
    Radio,
    ShieldCheck,
    Sparkles,
    TriangleAlert,
    Tv,
    ArrowUpRight
  } from '@lucide/svelte';

  let { category, active = false, onSelect } = $props<{
    category: CategoryInfo;
    active?: boolean;
    onSelect?: (category: CategoryInfo) => void;
  }>();

  const iconMap: Record<string, typeof Moon> = {
    Moon,
    Music,
    BookOpen,
    Tv,
    PawPrint,
    Sparkles,
    CloudSun,
    ShieldCheck,
    Radio,
    TriangleAlert
  };

  const IconComponent = $derived(iconMap[category.icon] || Sparkles);

  const isWarning = $derived(category.id === 'bad');
</script>

<button
  type="button"
  class="category-card motion-press text-left w-full"
  class:category-card--active={active}
  class:category-card--warning={isWarning}
  use:pressable
  use:springHover={{ scale: 1.015, y: -2 }}
  onclick={() => onSelect?.(category)}
  aria-label={`Browse ${category.title} category`}
>
  <div class="category-card__header">
    <div class="category-icon-halo" class:category-icon-halo--warning={isWarning}>
      <IconComponent size={20} class={isWarning ? 'text-amber-800' : 'text-[var(--terracotta)]'} />
    </div>
    <div class="category-card__badges">
      <span class="category-badge" class:category-badge--warning={isWarning}>
        {category.badge}
      </span>
      <span class="age-pill">
        {category.ageRange}
      </span>
    </div>
  </div>

  <div class="category-card__body">
    <div class="flex items-start justify-between gap-2">
      <h3 class="category-card__title">
        {category.title}
      </h3>
      <span class="category-arrow" aria-hidden="true">
        <ArrowUpRight size={16} />
      </span>
    </div>
    <p class="category-card__tagline">
      {category.tagline}
    </p>
  </div>

  <div class="category-card__footer">
    <div class="category-samples">
      {#each category.sampleTitles.slice(0, 3) as sample}
        <span class="sample-chip truncate max-w-[130px]">
          {sample}
        </span>
      {/each}
    </div>
    <div class="category-count">
      <span class="count-number">{category.count.toLocaleString()}</span>
      <span class="count-label">{category.mediaType === 'music' ? 'tracks' : category.mediaType === 'show' ? 'series' : 'titles'}</span>
    </div>
  </div>
</button>

<style>
  .category-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.25rem;
    border-radius: 1.25rem;
    background: var(--surface);
    border: 1px solid var(--hairline);
    box-shadow: var(--shadow-ambient);
    backdrop-filter: blur(16px);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .category-card:hover {
    border-color: var(--terracotta-border);
    box-shadow: var(--shadow-elevated);
    transform: translateY(-2px);
  }

  .category-card--active {
    border-color: var(--terracotta);
    background: #FFFFFF;
    box-shadow: 0 0 0 2px var(--terracotta), var(--shadow-elevated);
  }

  .category-card--warning {
    border-color: var(--amber-border);
    background: #FFFDF9;
  }

  .category-card--warning:hover {
    border-color: #D4A373;
  }

  .category-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .category-icon-halo {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.875rem;
    background: var(--canvas-secondary);
    border: 1px solid var(--hairline-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
  }

  .category-card:hover .category-icon-halo {
    transform: scale(1.05);
  }

  .category-icon-halo--warning {
    background: #FEF3C7;
    border-color: #FDE68A;
  }

  .category-card__badges {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .category-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    background: var(--terracotta-soft);
    color: var(--terracotta-dark);
    border: 1px solid var(--terracotta-border);
  }

  .category-badge--warning {
    background: #FEF3C7;
    color: #92400E;
    border-color: #FDE68A;
  }

  .age-pill {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    background: var(--canvas-secondary);
    color: var(--muted);
    border: 1px solid var(--hairline);
  }

  .category-card__body {
    margin-bottom: 1.25rem;
  }

  .category-card__title {
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.015em;
    line-height: 1.3;
    margin-bottom: 0.35rem;
  }

  .category-arrow {
    color: var(--muted);
    transition: transform 0.2s ease, color 0.2s ease;
  }

  .category-card:hover .category-arrow {
    transform: translate(2px, -2px);
    color: var(--terracotta);
  }

  .category-card__tagline {
    font-size: 0.8125rem;
    color: var(--muted);
    line-height: 1.45;
  }

  .category-card__footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 0.875rem;
    border-top: 1px solid var(--hairline);
  }

  .category-samples {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    flex: 1;
  }

  .sample-chip {
    font-size: 0.6875rem;
    color: var(--muted);
    background: var(--canvas-secondary);
    border: 1px solid var(--hairline-subtle);
    padding: 0.15rem 0.45rem;
    border-radius: 0.375rem;
  }

  .category-count {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .count-number {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .count-label {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-top: 0.15rem;
  }
</style>
