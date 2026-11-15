<script lang="ts">
  import { page } from '$app/stores';
  import { Bookmark, Compass, Home, Layers, Search, Settings, Sparkles } from '@lucide/svelte';
  import { favoritesStore } from '$lib/stores/favorites.svelte';

  const links = [
    { href: '/', label: 'Home', Icon: Home },
    { href: '/explore', label: 'Browse', Icon: Compass },
    { href: '/categories', label: 'Moments', Icon: Layers },
    { href: '/saved', label: 'My List', Icon: Bookmark }
  ];

  function isActive(href: string) {
    return href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
  }
</script>

<header class="site-header" class:site-header--hero={$page.url.pathname === '/'}>
  <div class="site-header__inner">
    <a href="/" class="brand" aria-label="Ask Zaen">
      <span class="brand-mark" aria-hidden="true">
        <Sparkles size={16} />
      </span>
      <span class="brand-text">
        <span class="brand-name">Ask Zaen</span>
      </span>
    </a>

    <nav class="desktop-nav" aria-label="Primary navigation">
      {#each links as link}
        {@const Icon = link.Icon}
        <a href={link.href} class="motion-press" class:active={isActive(link.href)}>
          <span>{link.label}</span>
          {#if link.href === '/saved' && favoritesStore.count > 0}
            <span class="nav-count motion-badge-pop" aria-label={`${favoritesStore.count} saved items`}>{favoritesStore.count}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="header-tools">
      <a href="/explore" class="header-tool motion-press" aria-label="Search the library">
        <Search size={18} />
      </a>
      <a href="/account" class="header-tool motion-press" aria-label="Open settings">
        <Settings size={18} />
      </a>
    </div>
  </div>
</header>

<nav class="mobile-bottom-nav" class:mobile-bottom-nav--hero={$page.url.pathname === '/'} aria-label="Mobile navigation">
  {#each links as link}
    {@const Icon = link.Icon}
    <a href={link.href} class="motion-press" class:active={isActive(link.href)}>
      <span class="mobile-bottom-nav__icon">
        <Icon size={19} />
        {#if link.href === '/saved' && favoritesStore.count > 0}
          <span class="mobile-bottom-nav__dot motion-badge-pop" aria-label={`${favoritesStore.count} saved shows`}></span>
        {/if}
      </span>
      <span>{link.label}</span>
    </a>
  {/each}
</nav>
