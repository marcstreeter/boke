import React from "react";

export interface GrainOverlayProps {
  opacity?: number;
  blendMode?:
    | "multiply"
    | "overlay"
    | "screen"
    | "normal"
    | "soft-light"
    | "hard-light";
  animate?: boolean;
  grainSize?: "fine" | "medium" | "coarse";
}

export function GrainOverlay({
  opacity = 0.08,
  blendMode = "overlay",
  animate = true,
  grainSize = "medium",
}: GrainOverlayProps): React.JSX.Element {
  const grainSizeMap = {
    fine: 0.85,
    medium: 0.64,
    coarse: 0.45,
  };

  const baseFrequency = grainSizeMap[grainSize];

  return (
    <>
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="grain-static">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFrequency}
              numOctaves="4"
              seed="5"
            />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA
                type="discrete"
                tableValues="0 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 1"
              />
            </feComponentTransfer>
          </filter>

          {animate && (
            <filter id="grain-animated">
              <feTurbulence
                type="fractalNoise"
                baseFrequency={baseFrequency}
                numOctaves="4"
                seed="5"
              >
                <animate
                  attributeName="seed"
                  values="0;1;2;3;4;5;6;7;8;9;10"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA
                  type="discrete"
                  tableValues="0 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 .5 1"
                />
              </feComponentTransfer>
            </filter>
          )}
        </defs>
      </svg>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity,
          mixBlendMode: blendMode,
          filter: `url(#grain-${animate ? "animated" : "static"})`,
          willChange: animate ? "filter" : "auto",
        }}
      />

      {/* Alternative CSS-only grain for better performance */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: opacity * 0.5,
          mixBlendMode: blendMode,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='turbulence' baseFrequency='${baseFrequency}' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />
    </>
  );
}

// Pure CSS grain overlay (most performant)
export function CSSGrainOverlay({
  opacity = 0.08,
  blendMode = "overlay",
}: Pick<GrainOverlayProps, "opacity" | "blendMode">): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        mixBlendMode: blendMode,
        background: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.03) 2px,
            rgba(255, 255, 255, 0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.03) 2px,
            rgba(255, 255, 255, 0.03) 4px
          ),
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          )
        `,
      }}
    />
  );
}

// High-quality film grain effect
export function FilmGrainOverlay({
  opacity = 0.1,
  blendMode = "overlay",
  speed = "normal",
}: GrainOverlayProps & {
  speed?: "slow" | "normal" | "fast";
}): React.JSX.Element {
  const animationDuration = {
    slow: "3s",
    normal: "1.5s",
    fast: "0.5s",
  }[speed];

  return (
    <>
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 25%); }
          90% { transform: translate(-10%, 10%); }
        }

        .film-grain {
          animation: grain ${animationDuration} steps(10) infinite;
          background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMC8yOS8xMiKqq3kAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAABHklEQVRoge2ZsQ3DMAxEn4W5T1bJBp4hW3gEjdIJMoJH8AgeIRt4hEzgDbJJdlAKpbCgH0WmJYJf4CDwfPI/UZSKMcYYY4wxf4/HYrEI8G2M+fZ9P3Ech1EURUmSJGldr9fXOI6vAL68s9vtPkKI0FpbAahaaw0hhJAkSVLe7/cf7/Ner58HnHNO13Wd1lpfAVz6vr9prTVjjDnOuVPnue/ekiSJ67qu67rutm3b9Xa7bQoh2q7rbvP5/K7I5XJ5b9t2XRSlMAyD8/n8R5H1ev1pjAlUVZVSylJK6TjnzjnnrJSyBBCEYdjG2E/TNKmUspRSSimllFIqVQZwmUwmZ6+kvu83SZLE1lp0XddZa83/QyOEuBVCfBljjDHGmP/IH5YAXmWEj5tPAAAAAElFTkSuQmCC");
          width: 200%;
          height: 200%;
        }
      `}</style>

      <div
        className="film-grain pointer-events-none absolute -inset-1/2"
        style={{
          opacity,
          mixBlendMode: blendMode,
        }}
      />
    </>
  );
}

// Preset grain configurations
export const grainPresets = {
  subtle: {
    opacity: 0.04,
    blendMode: "overlay" as const,
    grainSize: "fine" as const,
  },
  medium: {
    opacity: 0.08,
    blendMode: "overlay" as const,
    grainSize: "medium" as const,
  },
  heavy: {
    opacity: 0.12,
    blendMode: "multiply" as const,
    grainSize: "coarse" as const,
  },
  film: {
    opacity: 0.15,
    blendMode: "soft-light" as const,
    grainSize: "medium" as const,
    animate: true,
  },
} as const;

// Usage example component
export function GrainExample() {
  return (
    <div className="relative h-screen w-full bg-linear-to-br from-purple-600 to-blue-600">
      {/* Content */}
      <div className="relative z-10 p-8">
        <h1 className="text-4xl font-bold text-white">Your Content Here</h1>
      </div>

      {/* Apply grain overlay */}
      <GrainOverlay {...grainPresets.medium} />
    </div>
  );
}
