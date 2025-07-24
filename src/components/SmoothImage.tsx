"use client";
import { useState, useEffect } from "react";

interface SmoothImageProps {
  src: string;
  base64Src?: string;
  alt: string;
  className?: string;
}

export function SmoothImage({ src, base64Src, alt, className = "" }: SmoothImageProps) {
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);

  useEffect(() => {
    // Preload the full-size image
    const img = new Image();
    img.onload = () => {
      setFullImageSrc(src);
      setFullImageLoaded(true);
    };
    img.onerror = () => {
      // If full image fails to load, still mark as "loaded" to stop showing base64
      setFullImageLoaded(true);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // Show base64 immediately if available, otherwise show full image
  const shouldShowBase64 = base64Src && !fullImageLoaded;
  const imageSrc = shouldShowBase64 ? base64Src : (fullImageSrc || src);

  return (
    <div className="relative">
      <img
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${className} ${
          shouldShowBase64 ? "opacity-90" : "opacity-100"
        }`}
      />

      {/* Loading indicator for when we have no cached image */}
      {!base64Src && !fullImageLoaded && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300"></div>
        </div>
      )}
    </div>
  );
}
