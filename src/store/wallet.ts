import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { restoreStellarWallet, StellarWallet } from '@/src/lib/seed-wallet';

// SecureStore keys
export const SECURE_KEYS = {
  MNEMONIC: 'latch_mnemonic',
  SMART_ACCOUNT: 'latch_smart_account',
  PIN: 'latch_pin',
  PENDING_MNEMONIC: 'latch_pending_mnemonic',
} as const;

interface WalletStore {
  /** Wallet generated during onboarding — not yet committed to storage */
  pendingWallet: StellarWallet | null;

  /** The committed, active wallet loaded from SecureStore after onboarding */
  activeWallet: StellarWallet | null;

  /** Deployed C-address of the smart account on Stellar */
  smartAccountAddress: string | null;

  // ─── Setters ──────────────────────────────────────────────────────────────
  setPendingWallet: (wallet: StellarWallet) => void;
  clearPendingWallet: () => void;

  setActiveWallet: (wallet: StellarWallet) => void;
  setSmartAccountAddress: (address: string) => void;

  /**
   * Restore wallet + smart account from SecureStore.
   * Call this once on app launch (e.g., from a root layout effect).
   * Returns true if a wallet was found.
   */
  rehydrateWallet: () => Promise<boolean>;

  /** Full reset — used on logout / account removal */
  clearAll: () => Promise<void>;
}

export const useWalletStore = create<WalletStore>((set) => ({
  pendingWallet: null,
  activeWallet: null,
  smartAccountAddress: null,

  setPendingWallet: (wallet) => set({ pendingWallet: wallet }),
  clearPendingWallet: () => set({ pendingWallet: null }),

  setActiveWallet: (wallet) => set({ activeWallet: wallet }),
  setSmartAccountAddress: (address) => set({ smartAccountAddress: address }),

  rehydrateWallet: async () => {
    try {
      const mnemonic = await SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC);
      if (!mnemonic) return false;

      const wallet = restoreStellarWallet(mnemonic);
      const smartAccountAddress = await SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT);

      set({
        activeWallet: wallet,
        smartAccountAddress: smartAccountAddress ?? null,
      });
      return true;
    } catch {
      return false;
    }
  },

  clearAll: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.MNEMONIC),
      SecureStore.deleteItemAsync(SECURE_KEYS.SMART_ACCOUNT),
      SecureStore.deleteItemAsync(SECURE_KEYS.PIN),
      SecureStore.deleteItemAsync(SECURE_KEYS.PENDING_MNEMONIC),
    ]);
    set({ pendingWallet: null, activeWallet: null, smartAccountAddress: null });
  },
}));
