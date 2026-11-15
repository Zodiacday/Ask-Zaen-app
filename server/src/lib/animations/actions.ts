import autoAnimateLib from '@formkit/auto-animate';
import { animate } from 'motion';

/**
 * Apple-style tactile press action.
 * Compresses the target on pointerdown and springs back smoothly on release.
 */
export function pressable(node: HTMLElement, options: { scale?: number; stiffness?: number; damping?: number } = {}) {
  const targetScale = options.scale ?? 0.96;

  function onPointerDown() {
    animate(node, { scale: targetScale }, { duration: 0.12, ease: [0.16, 1, 0.3, 1] });
  }

  function onPointerUp() {
    animate(
      node,
      { scale: 1 },
      {
        type: 'spring',
        stiffness: options.stiffness ?? 450,
        damping: options.damping ?? 24
      }
    );
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointerleave', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointerleave', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
    }
  };
}

/**
 * Tactile spring hover lift.
 * Elevated squircle hover with subtle depth lift.
 */
export function springHover(node: HTMLElement, options: { y?: number; scale?: number } = {}) {
  const targetY = options.y ?? -3;
  const targetScale = options.scale ?? 1.015;

  function onMouseEnter() {
    animate(
      node,
      { y: targetY, scale: targetScale },
      {
        type: 'spring',
        stiffness: 380,
        damping: 26
      }
    );
  }

  function onMouseLeave() {
    animate(
      node,
      { y: 0, scale: 1 },
      {
        type: 'spring',
        stiffness: 380,
        damping: 28
      }
    );
  }

  node.addEventListener('mouseenter', onMouseEnter);
  node.addEventListener('mouseleave', onMouseLeave);

  return {
    destroy() {
      node.removeEventListener('mouseenter', onMouseEnter);
      node.removeEventListener('mouseleave', onMouseLeave);
    }
  };
}

/**
 * Elastic Heart / Bookmark burst micro-interaction.
 * Triggers an energetic yet organic Apple Health-like heartbeat burst on favorite toggle.
 */
export function heartBurst(node: HTMLElement) {
  return {
    trigger() {
      animate(
        node,
        {
          scale: [1, 1.42, 0.92, 1.15, 1],
          rotate: [0, -12, 12, -4, 0]
        },
        {
          duration: 0.55,
          ease: [0.34, 1.56, 0.64, 1]
        }
      );
    }
  };
}

/**
 * 3D Tactile Gyroscope Tilt for showcase banners and media cards.
 */
export function tilt(node: HTMLElement, options: { maxTilt?: number } = {}) {
  const max = options.maxTilt ?? 7;

  function onMouseMove(e: MouseEvent) {
    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -max;
    const rotateY = ((x - centerX) / centerX) * max;

    animate(
      node,
      {
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`
      },
      { duration: 0.15, ease: 'easeOut' }
    );
  }

  function onMouseLeave() {
    animate(
      node,
      {
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)'
      },
      {
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    );
  }

  node.addEventListener('mousemove', onMouseMove);
  node.addEventListener('mouseleave', onMouseLeave);

  return {
    destroy() {
      node.removeEventListener('mousemove', onMouseMove);
      node.removeEventListener('mouseleave', onMouseLeave);
    }
  };
}

/**
 * Staggered fade and slide entrance for lists and card grids.
 */
export function staggerEntrance(node: HTMLElement, selector: string = ':scope > *', delay: number = 0.04) {
  const children = Array.from(node.querySelectorAll(selector)) as HTMLElement[];
  if (!children.length) return;

  children.forEach((child, index) => {
    animate(
      child,
      { opacity: [0, 1], y: [16, 0], scale: [0.98, 1] },
      {
        duration: 0.45,
        delay: index * delay,
        ease: [0.16, 1, 0.3, 1]
      }
    );
  });
}

/**
 * Svelte wrapper action for AutoAnimate.
 * Smoothly animates DOM insertions, removals, and reordering without layout jumps.
 */
export function autoAnimate(node: HTMLElement, options?: Parameters<typeof autoAnimateLib>[1]) {
  const controller = autoAnimateLib(node, options ?? { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  return {
    destroy() {
      if (controller && typeof controller.destroy === 'function') {
        controller.destroy();
      }
    }
  };
}

/**
 * Smooth Number Ticker micro-animation.
 * Springs from current value to target value.
 */
export function numberTicker(node: HTMLElement, initialValue: number = 0) {
  let currentValue = initialValue;

  return {
    update(nextValue: number) {
      if (currentValue === nextValue) return;
      const start = currentValue;
      const change = nextValue - start;
      const duration = 500;
      const startTime = performance.now();

      function step(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Apple spring ease
        const eased = 1 - Math.pow(1 - progress, 3);
        const interpolated = Math.round(start + change * eased);
        node.textContent = interpolated.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          currentValue = nextValue;
          node.textContent = nextValue.toLocaleString();
        }
      }

      requestAnimationFrame(step);
    }
  };
}
