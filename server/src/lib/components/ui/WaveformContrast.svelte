<script lang="ts">
  // Self-contained neurobiology comparative waveform visualization
</script>

<div class="waveform-contrast-grid">
  <!-- Rapid Pacing (High Stimulation) Card -->
  <div class="waveform-card is-rapid">
    <div class="card-header">
      <span class="card-tag tag-rapid">Rapid Pacing</span>
      <span class="card-metric metric-rapid">60–90 cuts / min</span>
    </div>
    <h3 class="card-title">Constant Orienting Reflex</h3>
    <p class="card-desc">
      Every visual cut forces the brainstem to re-orient spatial attention, triggering repeated cortisol surges and mental fatigue.
    </p>

    <!-- Jagged Red Waveform SVG with nervous jitter micro-animation -->
    <div class="svg-container">
      <svg class="waveform-svg text-[var(--terracotta)] is-rapid-anim" viewBox="0 0 300 60" fill="none" preserveAspectRatio="none">
        <path d="M0,30 L10,8 L15,52 L25,12 L35,48 L45,5 L55,55 L65,15 L75,50 L85,8 L95,52 L105,12 L115,48 L125,5 L135,55 L145,15 L155,50 L165,8 L175,52 L185,12 L195,48 L205,5 L215,55 L225,15 L235,50 L245,8 L255,52 L265,12 L275,48 L285,10 L300,30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <div class="timeline-labels">
      <span>0s</span>
      <span>Hyper-arousal & tantrum risk</span>
      <span>60s</span>
    </div>
  </div>

  <!-- Calm Standard (Low Stimulation) Card -->
  <div class="waveform-card is-calm">
    <div class="card-header">
      <span class="card-tag tag-calm">Calm Standard</span>
      <span class="card-metric metric-calm">&lt; 15 cuts / min</span>
    </div>
    <h3 class="card-title">Harmonic Narrative Absorption</h3>
    <p class="card-desc">
      Long, gentle continuous takes give young minds cognitive breathing room to process storylines and calmly regulate attention.
    </p>

    <!-- Smooth Green Waveform SVG with harmonic breathing and scanning glow -->
    <div class="svg-container relative">
      <svg class="waveform-svg text-[var(--sage)] is-calm-anim" viewBox="0 0 300 60" fill="none" preserveAspectRatio="none">
        <path d="M0,30 Q37.5,5 75,30 T150,30 T225,30 T300,30" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        <path class="motion-wave-scan opacity-70" d="M0,30 Q37.5,5 75,30 T150,30 T225,30 T300,30" stroke="#74A892" stroke-width="4.5" stroke-linecap="round" />
      </svg>
    </div>
    <div class="timeline-labels">
      <span>0s</span>
      <span>Sustained focus & smooth landing</span>
      <span>60s</span>
    </div>
  </div>
</div>

<style>
  .waveform-contrast-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (min-width: 768px) {
    .waveform-contrast-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .waveform-card {
    padding: 24px;
    border-radius: var(--radius-squircle-md);
    background: var(--surface);
    box-shadow: var(--shadow-ambient);
    border: 1px solid var(--hairline);
    color: var(--ink);
  }

  .waveform-card.is-rapid {
    border-color: var(--terracotta-border);
  }

  .waveform-card.is-calm {
    border-color: var(--sage-border);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .card-tag {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .tag-rapid {
    color: var(--terracotta);
  }

  .tag-calm {
    color: var(--sage);
  }

  .card-metric {
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 700;
    font-family: monospace;
  }

  .metric-rapid {
    background: var(--terracotta-soft);
    color: var(--terracotta-dark);
  }

  .metric-calm {
    background: var(--sage-soft);
    color: var(--sage-dark);
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 4px;
  }

  .card-desc {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .svg-container {
    height: 76px;
    width: 100%;
    background: var(--canvas-secondary);
    border-radius: var(--radius-squircle-sm);
    display: flex;
    align-items: center;
    padding: 0 12px;
    border: 1px solid var(--hairline-subtle);
    overflow: hidden;
  }

  .waveform-svg {
    width: 100%;
    height: 52px;
  }

  .is-calm-anim path:first-child {
    animation: calm-wave-breathe 4s ease-in-out infinite;
    transform-origin: center;
  }

  .is-rapid-anim path {
    animation: rapid-jitter 0.8s ease-in-out infinite alternate;
    transform-origin: center;
  }

  @keyframes calm-wave-breathe {
    0%, 100% {
      transform: scaleY(1);
      opacity: 0.9;
    }
    50% {
      transform: scaleY(0.85);
      opacity: 1;
    }
  }

  @keyframes rapid-jitter {
    0% { transform: translateY(0); }
    100% { transform: translateY(-1.5px); }
  }

  .timeline-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--muted);
    margin-top: 8px;
    font-family: monospace;
  }
</style>
