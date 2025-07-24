import { atom } from "nanostores";
import { useStore } from "@nanostores/react";

export interface BackgroundState {
  isLoading: boolean;
  currentImageUrl?: string;
  backgroundOpacity: number;
  textureLoaded: boolean;
}

// Create the background state store
export const $backgroundState = atom<BackgroundState>({
  isLoading: false,
  currentImageUrl: undefined,
  backgroundOpacity: 0,
  textureLoaded: false,
});

// Helper functions for updating the store
export const setBackgroundState = (updates: Partial<BackgroundState>) => {
  $backgroundState.set({
    ...$backgroundState.get(),
    ...updates,
  });
};

export const updateBackgroundOpacity = (opacity: number) => {
  setBackgroundState({ backgroundOpacity: opacity });
};

export const updateBackgroundImage = (imageUrl?: string) => {
  setBackgroundState({ currentImageUrl: imageUrl });
};

export const setBackgroundLoading = (isLoading: boolean) => {
  setBackgroundState({ isLoading });
};

export const setTextureLoaded = (loaded: boolean) => {
  setBackgroundState({ textureLoaded: loaded });
};

// React hook for components
export const useBackgroundState = () => {
  const backgroundState = useStore($backgroundState);

  return {
    backgroundState,
    setBackgroundState,
    updateBackgroundOpacity,
    updateBackgroundImage,
    setBackgroundLoading,
    setTextureLoaded,
  };
};
