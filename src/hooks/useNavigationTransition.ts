import { useEffect, useState, useCallback } from 'react';

interface UseNavigationTransitionOptions {
  duration?: number;
  onTransitionStart?: () => void;
  onTransitionEnd?: () => void;
  enabled?: boolean;
}

interface UseNavigationTransitionReturn {
  isNavigating: boolean;
  startTransition: (callback: () => void) => void;
  opacity: number;
}

/**
 * Hook to handle smooth transitions when navigating away from the current page
 * Works with both Astro View Transitions API and regular navigation
 */
export function useNavigationTransition({
  duration = 800,
  onTransitionStart,
  onTransitionEnd,
  enabled = true,
}: UseNavigationTransitionOptions = {}): UseNavigationTransitionReturn {
  const [isNavigating, setIsNavigating] = useState(false);
  const [opacity, setOpacity] = useState(1);

  const startTransition = useCallback((callback: () => void) => {
    if (!enabled) {
      callback();
      return;
    }

    setIsNavigating(true);
    setOpacity(0);
    onTransitionStart?.();

    setTimeout(() => {
      callback();
      onTransitionEnd?.();
    }, duration);
  }, [duration, enabled, onTransitionStart, onTransitionEnd]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    // Handle Astro View Transitions
    const handleBeforeSwap = () => {
      setIsNavigating(true);
      setOpacity(0);
      onTransitionStart?.();
    };

    // Handle regular link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (!link || !link.href || link.href.startsWith('#') || link.target) {
        return;
      }

      // Check if it's an internal navigation
      try {
        const currentUrl = new URL(window.location.href);
        const linkUrl = new URL(link.href, window.location.href);

        // Only handle same-origin navigation
        if (linkUrl.origin === currentUrl.origin) {
          e.preventDefault();
          startTransition(() => {
            window.location.href = link.href;
          });
        }
      } catch (error) {
        // Invalid URL, let the browser handle it
        console.error('Invalid URL:', error);
      }
    };

    // Handle browser back/forward navigation
    const handlePopState = () => {
      setIsNavigating(true);
      setOpacity(0);
      onTransitionStart?.();
    };

    // Listen for Astro's View Transitions API
    document.addEventListener('astro:before-swap', handleBeforeSwap);

    // Listen for regular navigation
    document.addEventListener('click', handleClick);

    // Listen for browser navigation
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('astro:before-swap', handleBeforeSwap);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, startTransition, onTransitionStart]);

  // Reset state after navigation (for Astro View Transitions)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleAfterSwap = () => {
      setIsNavigating(false);
      setOpacity(1);
      onTransitionEnd?.();
    };

    document.addEventListener('astro:after-swap', handleAfterSwap);

    return () => {
      document.removeEventListener('astro:after-swap', handleAfterSwap);
    };
  }, [onTransitionEnd]);

  return {
    isNavigating,
    startTransition,
    opacity,
  };
}

/**
 * Hook specifically for programmatic navigation with transitions
 */
export function useNavigate(options?: UseNavigationTransitionOptions) {
  const { startTransition } = useNavigationTransition(options);

  const navigate = useCallback((url: string, options?: { replace?: boolean }) => {
    startTransition(() => {
      if (options?.replace) {
        window.location.replace(url);
      } else {
        window.location.href = url;
      }
    });
  }, [startTransition]);

  const navigateBack = useCallback(() => {
    startTransition(() => {
      window.history.back();
    });
  }, [startTransition]);

  const navigateForward = useCallback(() => {
    startTransition(() => {
      window.history.forward();
    });
  }, [startTransition]);

  return {
    navigate,
    navigateBack,
    navigateForward,
  };
}
