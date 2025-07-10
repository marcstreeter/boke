import React from 'react';
import { useNavigationTransition, useNavigate } from '../hooks/useNavigationTransition';

export function NavigationExample() {
  // Example 1: Using the hook for automatic transition handling
  const { isNavigating, opacity } = useNavigationTransition({
    duration: 600,
    onTransitionStart: () => console.log('Navigation started'),
    onTransitionEnd: () => console.log('Navigation ended'),
  });

  // Example 2: Using programmatic navigation with transitions
  const { navigate } = useNavigate({ duration: 800 });

  const handleCustomNavigation = () => {
    // This will fade out, then navigate
    navigate('/some-other-page');
  };

  return (
    <div
      style={{
        transition: 'opacity 600ms ease-out',
        opacity,
      }}
    >
      <h1>Navigation with Transitions</h1>

      {/* Regular links will automatically trigger fade-out */}
      <a href="/about">About Page (auto-transition)</a>

      {/* Programmatic navigation */}
      <button onClick={handleCustomNavigation}>
        Navigate Programmatically
      </button>

      {/* Show loading state during navigation */}
      {isNavigating && (
        <div className="loading-overlay">
          Navigating...
        </div>
      )}
    </div>
  );
}

// Example 3: Simplified background component with navigation transition
export function BackgroundWithTransition() {
  const { opacity } = useNavigationTransition({
    duration: 1000,
    enabled: true,
  });

  return (
    <div
      className="fixed inset-0 bg-linear-to-br from-blue-500 to-purple-600"
      style={{
        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity,
        zIndex: -1,
      }}
    />
  );
}

// Example 4: Custom transition effects
export function CustomTransitionBackground() {
  const { isNavigating } = useNavigationTransition({
    duration: 1200,
  });

  return (
    <div
      className="fixed inset-0"
      style={{
        transform: isNavigating ? 'scale(1.1)' : 'scale(1)',
        opacity: isNavigating ? 0 : 1,
        filter: isNavigating ? 'blur(20px)' : 'blur(0px)',
        transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: -1,
      }}
    >
      {/* Your background content */}
    </div>
  );
}

// Example 5: Integration with Three.js/Canvas elements
export function CanvasBackgroundWithTransition({ children }: { children: React.ReactNode }) {
  const { isNavigating, opacity } = useNavigationTransition({
    duration: 800,
    onTransitionStart: () => {
      // You could pause animations, reduce quality, etc.
      console.log('Preparing canvas for transition');
    },
  });

  return (
    <div
      className="fixed inset-0"
      style={{
        transition: 'all 800ms ease-in-out',
        opacity,
        transform: isNavigating ? 'translateY(50px)' : 'translateY(0)',
        filter: isNavigating ? 'brightness(0.5)' : 'brightness(1)',
      }}
    >
      {children}
    </div>
  );
}
