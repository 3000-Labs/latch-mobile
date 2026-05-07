import { restoreStellarWallet, StellarWallet } from '@/src/lib/seed-wallet';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// SecureStore keys
export const SECURE_KEYS = {
  MNEMONIC: 'latch_mnemonic',
  SMART_ACCOUNT: 'latch_smart_account',
  PIN: 'latch_pin',
  PENDING_MNEMONIC: 'latch_pending_mnemonic',
  CREDENTIAL_ID: 'latch_credential_id',
  KEY_DATA_HEX: 'latch_key_data_hex',
  PASSKEY_PRIVATE_KEY: 'latch_passkey_private_key',
  PASSKEY_REQUIRES_BIOMETRIC: 'latch_passkey_requires_biometric',
  // Latch backend auth tokens
  ACCESS_TOKEN: 'latch_access_token',
  REFRESH_TOKEN: 'latch_refresh_token',
  USER_EMAIL: 'latch_user_email',
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
      const [mnemonic, smartAccountAddress] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC),
        SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT),
      ]);

      // Always restore the smart account address — passkey users have no mnemonic
      // but still have a deployed C address.
      if (!mnemonic && !smartAccountAddress) return false;

      const wallet = mnemonic ? restoreStellarWallet(mnemonic) : null;

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
      SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.USER_EMAIL),
      SecureStore.deleteItemAsync(SECURE_KEYS.CREDENTIAL_ID),
      SecureStore.deleteItemAsync(SECURE_KEYS.KEY_DATA_HEX),
      SecureStore.deleteItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY),
      // CREDENTIAL_ID, KEY_DATA_HEX, and PASSKEY_PRIVATE_KEY are intentionally
      // preserved — they are the user's on-chain identity. Deleting them causes
      // createPasskeyCredential() to generate a fresh random P-256 keypair on the
      // next flow, producing a different account_salt and therefore a different
      // smart account address.
    ]);
    set({ pendingWallet: null, activeWallet: null, smartAccountAddress: null });
  },
}));
