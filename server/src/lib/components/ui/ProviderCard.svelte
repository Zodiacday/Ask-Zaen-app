<script lang="ts">
  let {
    label,
    key,
    query
  } = $props<{
    label: string;
    key: string;
    query: string;
  }>();
</script>

<a
  class={`provider-card provider-card--${key} motion-press`}
  href={`/explore?platform=${encodeURIComponent(query)}`}
  aria-label={`Browse ${label} titles`}
>
  <div class="provider-card__logo" aria-hidden="true">
    {#if key === 'youtube'}
      <!-- YouTube Authentic Play Icon -->
      <svg viewBox="0 0 28 20" width="26" height="18" fill="none" class="brand-icon">
        <path d="M27.4 3.08A3.5 3.5 0 0 0 24.94.62C22.76 0 14 0 14 0S5.24 0 3.06.62A3.5 3.5 0 0 0 .6 3.08C0 5.28 0 9.87 0 9.87s0 4.59.6 6.79a3.5 3.5 0 0 0 2.46 2.46c2.18.62 10.94.62 10.94.62s8.76 0 10.94-.62a3.5 3.5 0 0 0 2.46-2.46c.6-2.2.6-6.79.6-6.79s0-4.59-.6-6.79z" fill="#FF0000"/>
        <path d="M11.16 14.1l7.28-4.23-7.28-4.23v8.46z" fill="#FFFFFF"/>
      </svg>
    {:else if key === 'apple'}
      <!-- Apple Official Silhouette Icon -->
      <svg viewBox="0 0 170 170" width="20" height="20" fill="currentColor" class="brand-icon text-slate-900">
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.79-11.97-14.24-7.29-10.98-13.1-23.75-17.44-38.32-4.34-14.56-6.52-28.47-6.52-41.72 0-16.14 4.09-29.6 12.28-40.38 8.19-10.78 18.67-16.32 31.45-16.63 4.35 0 9.54 1.25 15.58 3.75 6.04 2.5 9.94 3.8 11.71 3.91 2.39 0 6.64-1.39 12.74-4.17 6.1-2.78 11.37-4.04 15.82-3.78 12.06.87 21.84 5.39 29.35 13.56-10.66 6.42-15.88 15.34-15.66 26.76.22 8.92 3.65 16.48 10.3 22.68 6.65 6.2 14.54 9.68 23.68 10.44-2.5 7.4-5.37 14.75-8.62 22.04zM119.22 33.15c0-7.39 2.67-14.45 8.01-21.18 5.34-6.73 11.96-10.72 19.86-11.97.22 1.09.33 2.18.33 3.26 0 7.39-2.73 14.53-8.2 21.42-5.47 6.89-12.16 10.87-20.08 11.93-.11-1.08-.22-2.17-.22-3.26z"/>
      </svg>
    {:else if key === 'netflix'}
      <!-- Netflix 'N' Ribbon Icon -->
      <svg viewBox="0 0 111 200" width="16" height="22" fill="none" class="brand-icon">
        <path d="M0 0h36v200H0z" fill="#E50914"/>
        <path d="M75 0h36v200H75z" fill="#E50914"/>
        <path d="M0 0l75 200h36L36 0H0z" fill="#B81D24"/>
        <path d="M0 0l75 200h36L36 0H0z" fill="#E50914" opacity=".2"/>
      </svg>
    {:else if key === 'disney'}
      <!-- Disney+ Signature Arc Icon -->
      <svg viewBox="0 0 28 20" width="22" height="18" fill="none" class="brand-icon">
        <path d="M13.2 2C6.8 2 2 6.5 2 12c0 4.1 2.7 7.7 6.8 9.1-.3-1.4-.4-3-.2-4.5.3-2.1 1.2-4.1 2.6-5.7 1.8-2 4.2-3.3 6.9-3.8 1.4-.2 2.8-.2 4.1.2-1.9-3-5.2-5.3-9-5.3z" fill="#113CCF"/>
        <path d="M22 6c-3.5 0-6.8 1.2-9.4 3.4-2.8 2.3-4.6 5.6-5 9.2-.1.9-.1 1.8 0 2.7 1.7.5 3.6.7 5.4.7 6.6 0 12-4.5 12-10 0-2.4-1.1-4.6-3-6z" fill="#3B82F6" opacity=".8"/>
        <path d="M24 10.5h-1.5V9h-1v1.5H20v1h1.5V13h1v-1.5H24v-1z" fill="#113CCF"/>
      </svg>
    {/if}
  </div>

  <span class="provider-card__name">{label}</span>
</a>

<style>
  .provider-card {
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    padding: 12px 22px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(24px) saturate(130%);
    -webkit-backdrop-filter: blur(24px) saturate(130%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 4px 18px rgba(74, 63, 56, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    text-decoration: none;
    transition: transform 0.25s var(--ease-apple), box-shadow 0.25s ease, border-color 0.25s ease;
    cursor: pointer;
  }

  .provider-card:hover {
    transform: translateY(-3px) scale(1.015);
    background: #FFFFFF;
    border-color: var(--terracotta-border);
    box-shadow: 0 10px 28px rgba(74, 63, 56, 0.16);
  }

  .provider-card:focus-visible {
    outline: 2px solid var(--terracotta);
    outline-offset: 2px;
  }

  .provider-card__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .provider-card__name {
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.015em;
  }

  .provider-card--youtube:hover .provider-card__name {
    color: #E62117;
  }

  .provider-card--netflix:hover .provider-card__name {
    color: #E50914;
  }

  .provider-card--disney:hover .provider-card__name {
    color: #113CCF;
  }

  .provider-card--apple:hover .provider-card__name {
    color: #000000;
  }
</style>
