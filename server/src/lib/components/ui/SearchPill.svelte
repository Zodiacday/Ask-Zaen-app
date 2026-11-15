<script lang="ts">
  import { Search, X } from '@lucide/svelte';

  let {
    value = '',
    placeholder = 'Search...',
    onInput,
    onClear,
    onSubmit,
    accentColor = 'sage',
    size = 'md'
  } = $props<{
    value: string;
    placeholder?: string;
    onInput?: (val: string) => void;
    onClear?: () => void;
    onSubmit?: (val: string) => void;
    accentColor?: 'sage' | 'terracotta';
    size?: 'sm' | 'md' | 'lg';
  }>();

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    onSubmit?.(value);
  }

  function handleClear() {
    onClear?.();
    onInput?.('');
  }
</script>

<form onsubmit={handleSubmit} class="search-pill-form" role="search">
  <div class="search-pill-container size-{size} accent-{accentColor}">
    <span class="search-pill-icon" aria-hidden="true">
      <Search size={size === 'lg' ? 19 : 17} />
    </span>

    <input
      type="search"
      {value}
      oninput={(e) => onInput?.(e.currentTarget.value)}
      {placeholder}
      class="search-pill-input"
      aria-label={placeholder}
    />

    {#if value}
      <button
        type="button"
        onclick={handleClear}
        class="search-pill-clear"
        aria-label="Clear search"
      >
        <X size={15} />
      </button>
    {/if}
  </div>
</form>

<style>
  .search-pill-form {
    width: 100%;
  }

  .search-pill-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    border-radius: var(--radius-pill);
    background: var(--surface);
    border: 1px solid var(--hairline);
    backdrop-filter: blur(12px);
    transition: all 0.25s var(--ease-apple);
    box-shadow: var(--shadow-ambient);
  }

  .search-pill-container.accent-sage:focus-within {
    border-color: var(--sage);
    box-shadow: 0 0 0 3px var(--sage-soft), var(--shadow-ambient);
  }

  .search-pill-container.accent-terracotta:focus-within {
    border-color: var(--terracotta);
    box-shadow: 0 0 0 3px var(--terracotta-soft), var(--shadow-ambient);
  }

  .search-pill-container.size-sm {
    padding: 0 10px;
    height: 38px;
  }

  .search-pill-container.size-md {
    padding: 0 12px;
    height: 44px;
  }

  .search-pill-container.size-lg {
    padding: 0 16px;
    height: 50px;
    box-shadow: var(--shadow-ambient);
  }

  .search-pill-icon {
    display: inline-flex;
    align-items: center;
    color: var(--muted);
    flex-shrink: 0;
    margin-right: 8px;
  }

  .search-pill-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--ink);
    padding: 0;
  }

  .search-pill-input:focus {
    outline: none;
  }

  .search-pill-input::placeholder {
    color: var(--muted);
  }

  .search-pill-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 50%;
    color: var(--muted);
    transition: color 0.15s, background-color 0.15s;
    margin-left: 6px;
  }

  .search-pill-clear:hover {
    color: var(--ink);
    background-color: rgba(0, 0, 0, 0.06);
  }
</style>
