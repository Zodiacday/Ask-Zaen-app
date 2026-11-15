<script lang="ts">
  import { CheckCircle2, Eye, Sparkles, Volume2 } from '@lucide/svelte';

  let {
    cutRate = 0,
    acousticTone = 'Gentle Dialogue',
    reviewScope = 'Playback Verified',
    confidence = 'high',
    isBad = false
  } = $props<{
    cutRate: number;
    acousticTone?: string;
    reviewScope?: string;
    confidence?: string;
    isBad?: boolean;
  }>();
</script>

<div class="sensory-instrument-panel">
  <div class="instrument-header">
    <Sparkles size={13} class="text-[var(--sage)]" />
    <span>Sensory Diagnostics</span>
  </div>

  <div class="instrument-grid">
    <!-- Cut Rate Complication Tile -->
    <div class="instrument-tile">
      <div class="tile-label">
        <Eye size={13} />
        <span>Optical Pace</span>
      </div>
      <div class="tile-value font-mono" class:is-bad={isBad} class:is-calm={!isBad}>
        {cutRate.toFixed(1)} cuts / min
      </div>
      <div class="tile-subtext">
        {isBad ? 'Exceeds 15/min limit' : 'Under 15/min calm limit'}
      </div>
    </div>

    <!-- Acoustic Tone Complication Tile -->
    <div class="instrument-tile">
      <div class="tile-label">
        <Volume2 size={13} />
        <span>Acoustic Tone</span>
      </div>
      <div class="tile-value text-[var(--ink)]">
        {acousticTone}
      </div>
      <div class="tile-subtext">
        {isBad ? 'Abrupt audio cues' : 'No jarring shriek effects'}
      </div>
    </div>

    <!-- Verification Scope Complication Tile -->
    <div class="instrument-tile">
      <div class="tile-label">
        <CheckCircle2 size={13} />
        <span>Review Scope</span>
      </div>
      <div class="tile-value text-[var(--ink)]">
        {reviewScope}
      </div>
      <div class="tile-subtext">
        {confidence} confidence level
      </div>
    </div>
  </div>
</div>

<style>
  .sensory-instrument-panel {
    padding: 20px;
    border-radius: var(--radius-squircle-md);
    background: var(--surface);
    border: 1px solid var(--hairline);
    box-shadow: var(--shadow-ambient);
    color: var(--ink);
  }

  .instrument-header {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--terracotta);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .instrument-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 12px;
  }

  @media (min-width: 640px) {
    .instrument-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .instrument-tile {
    padding: 14px;
    border-radius: var(--radius-squircle-sm);
    background: var(--canvas-secondary);
    border: 1px solid var(--hairline-subtle);
  }

  .tile-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 4px;
  }

  .tile-value {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ink);
  }

  .tile-value.is-calm {
    color: var(--sage-dark);
  }

  .tile-value.is-bad {
    color: var(--terracotta);
  }

  .tile-subtext {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
  }
</style>
