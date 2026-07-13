import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Local, user-assigned nicknames for shared-wallet co-signers. The signer model
 * only ever stores public keys/addresses (never names), so these labels are a
 * pure display convenience that lets a member recognise "Crownz" instead of a
 * truncated key on the approval screen.
 *
 * Keyed by the canonical signerKey (`ed25519:<hex>` / `webauthn:<hex>` /
 * `delegated:<addr>`). Plain AsyncStorage — a public-key→label map is not
 * sensitive.
 */
const STORAGE_KEY = 'latch.signerNicknames.v1';

interface SignerNicknamesState {
  nicknames: Record<string, string>;
  hydrated: boolean;
  rehydrate: () => Promise<void>;
  setNickname: (signerKey: string, name: string) => void;
}

export const useSignerNicknames = create<SignerNicknamesState>((set, get) => ({
  nicknames: {},
  hydrated: false,
  rehydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ nicknames: raw ? JSON.parse(raw) : {}, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setNickname: (signerKey, name) => {
    const trimmed = name.trim();
    const next = { ...get().nicknames };
    if (trimmed) next[signerKey] = trimmed;
    else delete next[signerKey];
    set({ nicknames: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },
}));
