"use client";
import { useState, useEffect } from "react";
import { ScrollingText } from "./scrolling-text";
import { CrossFade } from "react-crossfade-simple";
import { FaLastfm } from "react-icons/fa";
import { LuFileWarning } from "react-icons/lu";

interface Track {
  name: string;
  artist: string;
  imageUrl: string;
  isCurrent: boolean;
}

const FM_KEY = "6f5ff9d828991a85bd78449a85548586";
const MAIN = "kanb";

const fetchTrack = async (): Promise<Track> => {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${MAIN}&api_key=${FM_KEY}&limit=1&format=json`,
  );
  const data = await res.json();
  let recentTrack = data?.recenttracks.track[0];
  return {
    name: recentTrack.name,
    artist: recentTrack.artist["#text"],
    imageUrl: recentTrack.image[recentTrack.image.length - 1]["#text"],
    isCurrent: recentTrack["@attr"]?.nowplaying == "true",
  };
};

export function LastFM() {
  const [data, setData] = useState<Track | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const getData = async () => {
      try {
        const track = await fetchTrack();
        if (isMounted) {
          setData(track);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
        }
      }
    };

    getData();
    interval = setInterval(getData, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (data) {
      console.log(data);
    }
  }, [data]);

  return (
    <CrossFade
      contentKey={(data?.name || "abc") + data?.artist + data?.imageUrl}
    >
      {data ? (
        <div className="justify-left flex h-full w-screen max-w-lg min-w-full flex-row items-center overflow-visible">
          <div className="h-20 overflow-visible">
            {data.imageUrl ===
            "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" ? (
              <div className="margin-auto ambilight z-20 mr-4 flex h-20 w-20 flex-col items-center justify-center self-center overflow-visible rounded-lg border border-gray-300/20 bg-pink-500/30 text-center text-sm text-gray-700 contain-content dark:border-neutral-600/30 dark:text-gray-400">
                <LuFileWarning className="mb-1 text-2xl" />
                <p>No cover found!</p>
              </div>
            ) : (
              <img
                src={data.imageUrl}
                alt="cover"
                className="margin-auto ambilight z-20 mr-4 max-h-20 max-w-20 self-center overflow-visible rounded-lg border border-gray-500/20 contain-content dark:border-neutral-600/30"
              />
            )}
          </div>
          <div className="items-left flex w-min max-w-[calc(95%-6rem)] flex-col justify-center leading-normal">
            <div className="w-max text-left text-sm text-gray-600 dark:text-gray-400">
              {data.isCurrent ? "Now Playing" : "Last Played"} on{" "}
              <a href={`https://www.last.fm/user/${MAIN}`} target="_blank">
                <FaLastfm className="hover:text-wisteria-500 dark:hover:text-wisteria-200 mb-0.5 inline text-base transition-colors duration-150" />
              </a>
            </div>
            <a
              href={`https://www.last.fm/music/${data.artist}/_/${data.name}`}
              target="_blank"
            >
              <ScrollingText
                className="hover:text-wisteria-500 dark:hover:text-wisteria-200 transition-colors duration-150"
                text={`${data.name}`}
              />
            </a>
            <a
              href={`https://www.last.fm/music/${data.artist}/`}
              target="_blank"
            >
              <ScrollingText
                className="hover:text-wisteria-500 dark:hover:text-wisteria-200 transition-colors duration-150"
                text={`${data.artist}`}
              />
            </a>
          </div>
        </div>
      ) : error ? (
        <div className="flex w-min max-w-[calc(95%-8rem)] flex-col items-center justify-center">
          <div className="text-left text-sm text-gray-400">{error.message}</div>
        </div>
      ) : (
        <div className="flex h-20 w-screen max-w-lg flex-col items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
          <noscript>
            <div className="text-sm text-gray-400">
              You'll need to enable JavaScript to view this content.
            </div>
          </noscript>
        </div>
      )}
    </CrossFade>
  );
}
