"use client";
import { useEffect } from "react";
import { useLastFM } from "../hooks/useLastFM";

import { setBackgroundState } from "../hooks/useBackgroundState";
import { ScrollingText } from "./scrolling-text";
import { CrossFade } from "react-crossfade-simple";
import { FaLastfm } from "react-icons/fa";
import { LuFileWarning } from "react-icons/lu";
import { SmoothImage } from "./SmoothImage";

const MAIN = "kanb";

// useQueryParam
function useQueryParam(param: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param) || undefined;
}

export function LastFMFullscreen() {
  let userParam = useQueryParam("user");
  let hideParam = Boolean(useQueryParam("hide"));
  const { data, error } = useLastFM(3000, userParam); // Removed unused 'loading'

  // Update background state when data changes
  useEffect(() => {
    const newOpacity = data?.imageUrl ? 0.65 : 0;
    setBackgroundState({
      currentImageUrl: data?.imageUrl,
      backgroundOpacity: newOpacity,
    });
  }, [data?.imageUrl, data]);

  if (hideParam) {
    return <></>;
  }

  return (
    <CrossFade
      contentKey={(data?.name || "abc") + data?.artist + data?.imageUrl}
      timeout={600}
    >
      {data ? (
        <div className="flex h-screen w-screen items-center justify-center">
          <div className="flex max-w-4xl flex-col items-center justify-center gap-4 p-8 text-center">
            {/* Album Art */}
            <div className="relative">
              {data.imageUrl ===
              "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" ? (
                <div className="flex h-80 w-80 flex-col items-center justify-center rounded-2xl border border-gray-300/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-gray-700 shadow-2xl backdrop-blur-sm dark:border-neutral-600/30 dark:text-gray-400">
                  <LuFileWarning className="mb-4 text-6xl" />
                  <p className="text-xl font-medium">No cover found</p>
                </div>
              ) : (
                <SmoothImage
                  src={data.imageUrl}
                  base64Src={data.base64Image}
                  alt="Album cover"
                  className="h-80 w-80 rounded-2xl border border-gray-300/20 object-cover shadow-2xl dark:border-neutral-600/30"
                />
              )}

              {/* Now Playing Indicator */}
              {data.isCurrent && (
                <div className="absolute -top-4 -right-4 flex items-center space-x-2 rounded-full bg-pink-600 px-2 py-1 font-mono text-sm font-medium text-white shadow-lg">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
                  <span>LIVE</span>
                </div>
              )}
            </div>

            {/* Track Information */}
            <div className="flex w-full max-w-2xl flex-col gap-2">
              {/* Status */}
              <div className="flex items-center justify-center text-base text-gray-800/50 dark:text-gray-200/50">
                <span>{data.isCurrent ? "Now Playing" : "Last Played"} on</span>
                <a
                  href={`https://www.last.fm/user/${MAIN}`}
                  target="_blank"
                  className="hover:text-wisteria-500 dark:hover:text-wisteria-200 ml-1.5 inline-flex items-center transition-colors duration-150"
                >
                  <FaLastfm className="text-xl" />
                </a>
              </div>

              {/* Track Name */}
              <div className="flex flex-col gap-2">
                <a
                  href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/_/${encodeURIComponent(data.name)}`}
                  target="_blank"
                  className="block"
                >
                  <ScrollingText
                    className="hover:text-wisteria-500 dark:hover:text-wisteria-200 text-4xl font-bold text-gray-900 transition-colors duration-150 dark:text-white"
                    text={data.name}
                  />
                </a>

                {/* Artist */}
                <a
                  href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/`}
                  target="_blank"
                  className="block"
                >
                  <ScrollingText
                    className="hover:text-wisteria-500 dark:hover:text-wisteria-200 text-2xl font-medium text-gray-700 transition-colors duration-150 dark:text-gray-300"
                    text={data.artist}
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-lg bg-red-100 p-6 dark:bg-red-900/20">
            <p className="text-lg text-red-700 dark:text-red-400">
              Failed to load Last.fm data
            </p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-500">
              {error.message}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center space-y-6">
          <div className="border-t-wisteria-500 dark:border-t-wisteria-400 h-16 w-16 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-600"></div>
          <div className="space-y-2 text-center">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Loading music data...
            </p>
            <noscript>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                You'll need to enable JavaScript to view this content.
              </p>
            </noscript>
          </div>
        </div>
      )}
    </CrossFade>
  );
}
