import { create } from 'zustand';

interface LoadingOverlayState {
  visible: boolean;
  text?: string;
  subText?: string;
  show: (text?: string, subText?: string) => void;
  hide: () => void;
}

export const useLoadingOverlay = create<LoadingOverlayState>((set) => ({
  visible: false,
  text: undefined,
  subText: undefined,
  show: (text, subText) => set({ visible: true, text, subText }),
  hide: () => set({ visible: false, text: undefined, subText: undefined }),
}));
