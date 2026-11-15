<script lang="ts">
  import { Search } from '@lucide/svelte';
  import type { Component } from 'svelte';

  let {
    title,
    description,
    icon: Icon = Search,
    actionText,
    actionHref,
    onAction
  } = $props<{
    title: string;
    description: string;
    icon?: Component<{ size?: number; class?: string }>;
    actionText?: string;
    actionHref?: string;
    onAction?: () => void;
  }>();
</script>

<div class="empty-state-card">
  <div class="empty-state-icon">
    <Icon size={24} />
  </div>
  <h2>{title}</h2>
  <p>{description}</p>

  {#if actionText}
    {#if actionHref}
      <a href={actionHref} class="btn-primary empty-action">
        {actionText}
      </a>
    {:else if onAction}
      <button type="button" onclick={onAction} class="btn-secondary empty-action">
        {actionText}
      </button>
    {/if}
  {/if}
</div>

<style>
  .empty-state-card {
    max-width: 440px;
    margin: 48px auto;
    padding: 44px 28px;
    border-radius: var(--radius-squircle-lg);
    background: var(--surface);
    border: 1px solid var(--hairline);
    box-shadow: var(--shadow-ambient);
    text-align: center;
  }

  .empty-state-icon {
    width: 52px;
    height: 52px;
    margin: 0 auto 16px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  h2 {
    font-size: 22px;
    margin-bottom: 8px;
    font-family: var(--font-serif);
    color: var(--ink);
  }

  p {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
    margin-bottom: 22px;
  }

  .empty-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
</style>
