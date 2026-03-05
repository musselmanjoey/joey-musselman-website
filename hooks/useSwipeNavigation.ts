import { useRef, useCallback } from "react";

interface SwipeNavigationOptions {
  onNext: () => void;
  onPrev: () => void;
  swipeThreshold?: number;
}

export function useSwipeNavigation({
  onNext,
  onPrev,
  swipeThreshold = 50,
}: SwipeNavigationOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchHandled = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea, [role="button"]')) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (dx > swipeThreshold) {
        onPrev();
      } else if (dx < -swipeThreshold) {
        onNext();
      } else {
        onNext();
      }

      touchHandled.current = true;
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [onNext, onPrev, swipeThreshold]
  );

  const handleClick = useCallback(() => {
    if (touchHandled.current) {
      touchHandled.current = false;
      return;
    }
    onNext();
  }, [onNext]);

  return { handleTouchStart, handleTouchEnd, handleClick };
}
