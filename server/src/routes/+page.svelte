<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { ArrowRight } from '@lucide/svelte';
  import HeroCarousel from '$lib/components/ui/HeroCarousel.svelte';
  import RowCarousel from '$lib/components/ui/RowCarousel.svelte';
  import { CURATED_RESOURCES } from '$lib/curated-data';
  import type { Resource } from '$lib/types';

  onMount(() => {
    const scrollY = page.url.searchParams.get('scroll');
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY, 10));
    }
  });

  // Ensure every displayed series/video has a verified, non-empty image thumbnail
  const hasImage = (resource: Resource) => Boolean(resource.imageUrl && resource.imageUrl.trim().length > 0);

  const quietContent = CURATED_RESOURCES.filter((resource) => resource.stimulation_level === 'low' && hasImage(resource));
  // Curate verified pristine HD calm shows for the upper billboard section
  const verifiedHeroIds = ['show-11', 'show-12', 'show-13', 'show-24', 'show-38', 'show-42', 'show-49'];
  const heroItems = verifiedHeroIds
    .map((id) => CURATED_RESOURCES.find((r) => r.id === id))
    .filter((r): r is Resource => Boolean(r && hasImage(r)));
  const quietShelf = quietContent.slice(0, 16);
  const toddlerShelf = CURATED_RESOURCES.filter((resource) => (resource.age.includes('0') || resource.age.includes('2')) && hasImage(resource)).slice(0, 16);
  const preschoolShelf = CURATED_RESOURCES.filter((resource) => (resource.age.includes('3') || resource.age.includes('4') || resource.age.includes('5')) && hasImage(resource)).slice(0, 16);
  const musicShelf = CURATED_RESOURCES.filter((resource) => {
    const t = resource.title.toLowerCase();
    return (t.includes('song') || t.includes('rhyme') || t.includes('music') || t.includes('nursery')) && hasImage(resource);
  }).slice(0, 16);

  const providers = [
    { label: 'YouTube', key: 'youtube', query: 'YouTube' },
    { label: 'Netflix', key: 'netflix', query: 'Netflix' },
    { label: 'Disney+', key: 'disney', query: 'Disney' },
    { label: 'Apple TV+', key: 'apple', query: 'Apple' }
  ];
</script>

<svelte:head>
  <title>Ask Zaen — A quieter place to find something good</title>
  <meta name="description" content="A calm, visual way for parents to discover gentle shows, songs, and stories for their kids." />
</svelte:head>

<div class="streaming-home">
  <!-- Top Billboard Carousel -->
  <HeroCarousel items={heroItems} {providers} autoRotateInterval={7000} />

  <div class="streaming-discovery" aria-label="Discover calm content">
    <!-- Moments Quick Rail: Direct titles, no subheaders, bigger typography -->
    <section class="streaming-section" aria-labelledby="moments-title">
      <div class="streaming-section__heading">
        <h2 id="moments-title">Browse by moment</h2>
        <a href="/categories">All moments <ArrowRight size={14} /></a>
      </div>
      <div class="moment-rail">
        <a class="moment-tile motion-press" href="/explore?stimulation=low">
          <span>Bedtime</span>
        </a>
        <a class="moment-tile motion-press" href="/explore?age=2">
          <span>Little Ones</span>
        </a>
        <a class="moment-tile motion-press" href="/explore?age=4">
          <span>Curious Minds</span>
        </a>
        <a class="moment-tile motion-press" href="/categories?id=nursery">
          <span>Songs & Rhymes</span>
        </a>
      </div>
    </section>

    <!-- Netflix-style Shelves: Clean direct titles, no subheaders, large typography -->
    <RowCarousel
      title="Quiet Picks"
      href="/explore?stimulation=low"
      items={quietShelf}
    />

    <RowCarousel
      title="Little Ones"
      href="/explore?age=2"
      items={toddlerShelf}
    />

    {#if preschoolShelf.length > 0}
      <RowCarousel
        title="Preschool"
        href="/explore?age=4"
        items={preschoolShelf}
      />
    {/if}

    {#if musicShelf.length > 0}
      <RowCarousel
        title="Songs & Rhymes"
        href="/categories?id=nursery"
        items={musicShelf}
      />
    {/if}

    <!-- Ask Zaen Trust Banner -->
    <section class="streaming-trust" aria-labelledby="trust-title">
      <div>
        <p class="streaming-section__eyebrow">The Ask Zaen promise</p>
        <h2 id="trust-title">A better kind of screen time.</h2>
      </div>
      <p>Every pick is reviewed for pacing, sound, and how gently the story comes to rest.</p>
      <a href="/account">How we choose <ArrowRight size={14} /></a>
    </section>
  </div>
</div>
