<script lang="ts">
  import { ArrowRight, Heart } from '@lucide/svelte';
  import type { Resource } from '../types';
  import { favoritesStore } from '$lib/stores/favorites.svelte';
  import { parseCutRate, getHighResImageUrl } from '$lib/utils/format';

  let { resource, isFavorite, onToggleFavorite } = $props<{
    resource: Resource;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
  }>();

  let favoriteActive = $derived(isFavorite !== undefined ? isFavorite : favoritesStore.has(resource.id));

  let reviewIncomplete = $derived(resource.metadataOnly || resource.reviewScope === 'sampled');
  let calmClass = $derived(reviewIncomplete
    ? 'show-card__calm--medium'
    : resource.stimulation_level === 'low'
      ? 'show-card__calm--low'
      : resource.stimulation_level === 'medium'
        ? 'show-card__calm--medium'
        : 'show-card__calm--high');
        
  let calmLabel = $derived(resource.reviewScope === 'sampled'
    ? resource.classification === 'low' ? 'provisional' : 'not approved'
    : resource.stimulation_level === 'low'
      ? 'quiet'
      : resource.stimulation_level === 'medium'
        ? 'steady'
        : 'not approved');

  let cutRate = $derived(parseCutRate(resource.reviewerNotes));
  let cutRateBadge = $derived(cutRate !== null && cutRate > 0 ? `${cutRate.toFixed(1)} cuts/m` : calmLabel);

  let isBursting = $state(false);

  function handleToggle(e: MouseEvent) {
    e.preventDefault();
    isBursting = true;
    setTimeout(() => { isBursting = false; }, 500);

    if (onToggleFavorite) {
      onToggleFavorite();
    } else {
      favoritesStore.toggle(resource.id);
    }
  }
</script>

<article class="show-card">
  <div class="show-card__media">
    <a href={`/shows/${resource.id}`} class="show-card__media-link motion-shimmer-wrap" aria-label={`View ${resource.title}`}>
      {#if resource.imageUrl}
        <img
          src={getHighResImageUrl(resource.imageUrl)}
          alt={resource.title}
          loading="lazy"
          onerror={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el.src.includes('maxresdefault.jpg')) {
              el.src = el.src.replace('maxresdefault.jpg', 'sddefault.jpg');
            } else if (el.src.includes('sddefault.jpg')) {
              el.src = el.src.replace('sddefault.jpg', 'hqdefault.jpg');
            } else if (resource.imageUrl && el.src !== resource.imageUrl) {
              el.src = resource.imageUrl;
            }
          }}
        />
      {:else}
        <span class="show-card__fallback"><span>{resource.title[0]}</span></span>
      {/if}

      <span class={`show-card__calm ${calmClass}`}>
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80 {resource.stimulation_level === 'low' ? 'motion-breathe' : ''}" aria-hidden="true"></span>
        {cutRateBadge}
      </span>
    </a>

    <button
      type="button"
      class="show-card__favorite motion-press"
      class:is-favorite={favoriteActive}
      class:motion-heart-pop={isBursting}
      onclick={handleToggle}
      aria-label={favoriteActive ? 'Remove from favorites' : 'Add to favorites'}
    >
      {#if isBursting}
        <span class="motion-ripple-halo"></span>
      {/if}
      <Heart size={16} fill={favoriteActive ? 'currentColor' : 'none'} />
    </button>
  </div>

  <div class="show-card__body">
    {#if resource.platform}
      <div class="show-card__meta">
        <span>{resource.platform}</span>
      </div>
    {/if}
    <a href={`/shows/${resource.id}`} class="show-card__title">{resource.title}</a>
    <a href={`/shows/${resource.id}`} class="show-card__open">Read note <ArrowRight size={13} /></a>
  </div>
</article>

