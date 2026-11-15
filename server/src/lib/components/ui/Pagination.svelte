<script lang="ts">
  import { ArrowLeft, ArrowRight } from '@lucide/svelte';

  let { 
    currentPage = 1, 
    pageCount = 1, 
    onPageChange,
    ariaLabel = 'Pagination'
  } = $props<{
    currentPage: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    ariaLabel?: string;
  }>();
</script>

{#if pageCount > 1}
  <nav class="pagination-dock" aria-label={ariaLabel}>
    <button 
      type="button" 
      onclick={() => onPageChange(Math.max(1, currentPage - 1))} 
      disabled={currentPage <= 1} 
      aria-label="Previous page"
      class="pagination-btn"
    >
      <ArrowLeft size={15} />
    </button>

    <span class="pagination-status">
      Page {currentPage} of {pageCount}
    </span>

    <button 
      type="button" 
      onclick={() => onPageChange(Math.min(pageCount, currentPage + 1))} 
      disabled={currentPage >= pageCount} 
      aria-label="Next page"
      class="pagination-btn"
    >
      <ArrowRight size={15} />
    </button>
  </nav>
{/if}

<style>
  .pagination-dock {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-glass);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 3px 6px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--hairline);
    box-shadow: var(--shadow-ambient);
  }

  .pagination-btn {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid var(--hairline);
    color: var(--ink);
    transition: all 0.2s var(--ease-apple);
  }

  .pagination-btn:hover:not(:disabled) {
    border-color: var(--terracotta-border);
    color: #FFFFFF;
    background: var(--terracotta);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(200, 100, 50, 0.25);
  }

  .pagination-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .pagination-status {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
  }
</style>
