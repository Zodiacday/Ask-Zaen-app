<script lang="ts">
  import { Sparkles, Heart, Activity, Layers, Shuffle, Plus, Minus, Move } from '@lucide/svelte';
  import { pressable, tilt, autoAnimate } from '$lib/animations';

  // State for interactive demonstrations
  let heartTriggered = $state(false);
  let liveCounter = $state(42);
  let counterPopping = $state(false);
  let demoItems = $state(['Bluey', 'Mister Rogers', 'Trash Truck', 'Tumble Leaf']);

  function triggerHeart() {
    heartTriggered = false;
    // microtask cycle to retrigger animation
    setTimeout(() => {
      heartTriggered = true;
      setTimeout(() => heartTriggered = false, 600);
    }, 10);
  }

  function incrementCounter() {
    liveCounter += 1;
    counterPopping = true;
    setTimeout(() => counterPopping = false, 350);
  }

  function decrementCounter() {
    if (liveCounter > 0) {
      liveCounter -= 1;
      counterPopping = true;
      setTimeout(() => counterPopping = false, 350);
    }
  }

  function shuffleItems() {
    demoItems = [...demoItems].sort(() => Math.random() - 0.5);
  }

  function addItem() {
    const candidates = ['Little Bear', 'Kipper', 'Frog and Toad', 'Puffin Rock', 'Daniel Tiger'];
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    demoItems = [...demoItems, `${next} #${demoItems.length + 1}`];
  }

  function removeItem(index: number) {
    demoItems = demoItems.filter((_, i) => i !== index);
  }
</script>

<div class="motion-lab rounded-[var(--radius-squircle-lg)] bg-[var(--surface)] border border-[var(--hairline)] shadow-[var(--shadow-ambient)] p-6 sm:p-8">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-full bg-[var(--sage-soft)] text-[var(--sage)] flex items-center justify-center">
      <Sparkles size={20} />
    </div>
    <div>
      <h2 class="text-xl font-serif font-medium text-[var(--ink)]">Apple Motion & Micro-Animation Library</h2>
      <p class="text-xs text-[var(--muted)]">Interactive tactile physics, spring curves, and sensory micro-interactions.</p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    <!-- 1. Tactile Button Press -->
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs font-semibold text-[var(--muted)] mb-2">
          <span>01 · Tactile Press</span>
          <Activity size={14} class="text-[var(--sage)]" />
        </div>
        <h3 class="text-sm font-semibold text-[var(--ink)] mb-1">Apple Spring Compression</h3>
        <p class="text-xs text-[var(--muted)] mb-4">Compresses to 96% on pointer-down and returns with snappy spring physics.</p>
      </div>
      <button
        type="button"
        use:pressable
        class="w-full py-2.5 px-4 rounded-full bg-[var(--surface)] border border-[var(--hairline)] shadow-sm text-xs font-semibold text-[var(--ink)] text-center cursor-pointer hover:bg-stone-50 transition-colors"
      >
        Press & Hold Me
      </button>
    </div>

    <!-- 2. Elastic Heart Burst -->
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs font-semibold text-[var(--muted)] mb-2">
          <span>02 · Elastic Burst</span>
          <Heart size={14} class="text-rose-500" />
        </div>
        <h3 class="text-sm font-semibold text-[var(--ink)] mb-1">Favorite Haptic Pop</h3>
        <p class="text-xs text-[var(--muted)] mb-4">Multi-stage scale-wobble with expanding ceramic ripple halo.</p>
      </div>
      <div class="flex items-center justify-center py-2">
        <button
          type="button"
          onclick={triggerHeart}
          class="relative w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--hairline)] shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-50/50 transition-colors cursor-pointer {heartTriggered ? 'motion-heart-pop' : ''}"
          aria-label="Trigger favorite burst"
        >
          {#if heartTriggered}
            <span class="motion-ripple-halo"></span>
          {/if}
          <Heart size={22} fill={heartTriggered ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>

    <!-- 3. Ambient Breathing Aura -->
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs font-semibold text-[var(--muted)] mb-2">
          <span>03 · Ambient Aura</span>
          <Sparkles size={14} class="text-[var(--sage)]" />
        </div>
        <h3 class="text-sm font-semibold text-[var(--ink)] mb-1">Sinusoidal Calm Breath</h3>
        <p class="text-xs text-[var(--muted)] mb-4">Continuous 4s biological breathing cycle for verified quiet indicators.</p>
      </div>
      <div class="flex items-center justify-center gap-3 py-3">
        <span class="w-3.5 h-3.5 rounded-full bg-[var(--sage)] motion-breathe"></span>
        <span class="text-xs font-semibold text-[var(--sage-dark)] font-mono">0.0 cuts / min pace</span>
      </div>
    </div>

    <!-- 4. 3D Parallax Squircle Tilt -->
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs font-semibold text-[var(--muted)] mb-2">
          <span>04 · Gyroscope Tilt</span>
          <Move size={14} class="text-indigo-600" />
        </div>
        <h3 class="text-sm font-semibold text-[var(--ink)] mb-1">3D Continuous Parallax</h3>
        <p class="text-xs text-[var(--muted)] mb-4">Calculates mouse vector to deliver subtle dimensional perspective.</p>
      </div>
      <div
        use:tilt={{ maxTilt: 12 }}
        class="p-4 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm text-center cursor-default select-none transition-shadow hover:shadow-[var(--shadow-elevated)]"
      >
        <span class="text-xs font-semibold text-[var(--ink)]">Hover to Tilt Surface</span>
      </div>
    </div>

    <!-- 5. Glass Specular Shimmer -->
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs font-semibold text-[var(--muted)] mb-2">
          <span>05 · Specular Shimmer</span>
          <Layers size={14} class="text-amber-600" />
        </div>
        <h3 class="text-sm font-semibold text-[var(--ink)] mb-1">Refractive Light Sweep</h3>
        <p class="text-xs text-[var(--muted)] mb-4">Linear-gradient sweep simulating light skimming across frosted ceramic.</p>
      </div>
      <div class="motion-shimmer-wrap p-4 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm text-center cursor-pointer">
        <span class="text-xs font-semibold text-[var(--ink)]">Hover for Light Beam</span>
      </div>
    </div>

    <!-- 6. Reactive Counter Pop -->
    <div class="p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs font-semibold text-[var(--muted)] mb-2">
          <span>06 · Badge Pop</span>
          <Sparkles size={14} class="text-purple-600" />
        </div>
        <h3 class="text-sm font-semibold text-[var(--ink)] mb-1">Elastic Numerical Spring</h3>
        <p class="text-xs text-[var(--muted)] mb-4">Scales and bounces the badge indicator on each state update.</p>
      </div>
      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          onclick={decrementCounter}
          class="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <Minus size={14} />
        </button>
        <span class="inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full bg-[var(--sage)] text-white font-mono font-semibold text-xs {counterPopping ? 'motion-badge-pop' : ''}">
          {liveCounter}
        </span>
        <button
          type="button"
          onclick={incrementCounter}
          class="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  </div>

  <!-- 7. Auto-Animate Grid Reflow Demonstration -->
  <div class="mt-6 p-5 rounded-[var(--radius-squircle-md)] bg-[var(--canvas-secondary)] border border-[var(--hairline-subtle)]">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <div class="text-xs font-semibold text-[var(--muted)] mb-1">07 · Zero-Layout-Jump Reflow (AutoAnimate)</div>
        <h3 class="text-sm font-semibold text-[var(--ink)]">Smooth Fluid List Transitions</h3>
        <p class="text-xs text-[var(--muted)]">Add, remove, or shuffle cards to see them smoothly translate without instant snapping.</p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onclick={shuffleItems}
          class="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-xs font-semibold text-[var(--ink)] hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5"
        >
          <Shuffle size={13} />
          Shuffle
        </button>
        <button
          type="button"
          onclick={addItem}
          class="px-3 py-1.5 rounded-full bg-[var(--sage)] text-white text-xs font-semibold hover:bg-[var(--sage-dark)] transition-colors inline-flex items-center gap-1.5"
        >
          <Plus size={13} />
          Add Item
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" use:autoAnimate>
      {#each demoItems as item, idx (item)}
        <div class="p-3.5 rounded-[var(--radius-squircle-sm)] bg-[var(--surface)] border border-[var(--hairline)] shadow-sm flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-[var(--ink)] truncate">{item}</span>
          <button
            type="button"
            onclick={() => removeItem(idx)}
            class="text-[var(--muted)] hover:text-[var(--terracotta)] text-xs p-1"
            title="Remove item"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  </div>
</div>
