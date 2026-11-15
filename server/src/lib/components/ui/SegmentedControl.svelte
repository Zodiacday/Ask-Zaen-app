<script lang="ts">
  let {
    options = [],
    value = '',
    onChange,
    ariaLabel = 'Filter options'
  } = $props<{
    options: { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
    ariaLabel?: string;
  }>();
</script>

<div class="segmented-control" role="group" aria-label={ariaLabel}>
  {#each options as opt}
    <button
      type="button"
      onclick={() => onChange(opt.value)}
      class="segmented-btn"
      class:is-active={value === opt.value}
      aria-pressed={value === opt.value}
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .segmented-control {
    display: inline-flex;
    align-items: center;
    background: var(--canvas-secondary);
    padding: 3px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--hairline-subtle);
    gap: 2px;
  }

  .segmented-btn {
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    transition: all 0.2s var(--ease-apple);
    white-space: nowrap;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .segmented-btn:hover {
    color: var(--ink);
  }

  .segmented-btn.is-active {
    background: var(--surface);
    color: var(--ink);
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(74, 63, 56, 0.08);
  }
</style>
