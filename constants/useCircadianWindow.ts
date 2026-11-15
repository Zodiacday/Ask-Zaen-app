import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { CircadianWindow, getCircadianWindow } from './sanctuaryAlgorithm';

/**
 * Live circadian window hook.
 * Computes the active window synchronously on render (so `ageTier` changes take
 * effect immediately without cascading effects) and subscribes to a 60s timer +
 * `AppState` foreground listener that triggers a re-render ONLY when the circadian
 * window actually crosses a boundary.
 */
export function useCircadianWindow(ageTier?: string | null): CircadianWindow {
  const [, setTransitionTick] = useState(0);
  const currentWindow = getCircadianWindow(new Date(), ageTier);

  useEffect(() => {
    let lastObserved = getCircadianWindow(new Date(), ageTier);

    const checkTransition = () => {
      const next = getCircadianWindow(new Date(), ageTier);
      if (next !== lastObserved) {
        lastObserved = next;
        setTransitionTick((t) => t + 1);
      }
    };

    const intervalId = setInterval(checkTransition, 60_000);
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkTransition();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [ageTier]);

  return currentWindow;
}
