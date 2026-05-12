import { deriveWalletAtIndex, restoreStellarWallet, StellarWallet } from '@/src/lib/seed-wallet';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// SecureStore keys
export const SECURE_KEYS = {
  MNEMONIC: 'latch_mnemonic',
  SMART_ACCOUNT: 'latch_smart_account', // legacy key — account 0's C-address (kept for migration)
  ACCOUNTS: 'latch_accounts',           // JSON: WalletAccount[]
  ACTIVE_ACCOUNT_INDEX: 'latch_active_account_index',
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

/**
 * One wallet account derived from the user's seed phrase.
 * Passkey users always have exactly one entry (index -1, no mnemonic derivation).
 */
export interface WalletAccount {
  /** BIP-44 account index (m/44'/148'/{index}'). -1 for passkey accounts. */
  index: number;
  /** Display name, e.g. "Account 1" */
  name: string;
  /** G... Stellar public key */
  gAddress: string;
  /** Raw hex public key (used for smart account deployment) */
  publicKeyHex: string;
  /** Deployed C-address on Stellar, null if not yet deployed */
  smartAccountAddress: string | null;
  /** Passkey credential ID (hex). Present only on passkey accounts added after account 0. */
  credentialId?: string;
}

/**
 * Return the SecureStore key names for the passkey credential at a given list position.
 * Index 0 uses the original non-indexed keys for backward compatibility.
 * Index 1+ uses indexed keys so each passkey account stores its own credential.
 */
export function getPasskeyStorageKeys(listIndex: number): {
  credentialId: string;
  keyDataHex: string;
  privateKey: string;
  requiresBiometric: string;
} {
  if (listIndex === 0) {
    return {
      credentialId: SECURE_KEYS.CREDENTIAL_ID,
      keyDataHex: SECURE_KEYS.KEY_DATA_HEX,
      privateKey: SECURE_KEYS.PASSKEY_PRIVATE_KEY,
      requiresBiometric: SECURE_KEYS.PASSKEY_REQUIRES_BIOMETRIC,
    };
  }
  return {
    credentialId: `latch_credential_id_${listIndex}`,
    keyDataHex: `latch_key_data_hex_${listIndex}`,
    privateKey: `latch_passkey_private_key_${listIndex}`,
    requiresBiometric: `latch_passkey_requires_biometric_${listIndex}`,
  };
}

interface WalletStore {
  /** Wallet generated during onboarding — not yet committed to storage */
  pendingWallet: StellarWallet | null;

  /** In-memory mnemonic for the current session (loaded from SecureStore on rehydrate) */
  mnemonic: string | null;

  /** All derived accounts for this seed */
  accounts: WalletAccount[];

  /** Index into `accounts` for the currently active account */
  activeAccountIndex: number;

  // ─── Derived shortcuts (backward-compatible with existing screens) ────────
  /** Full keypair for the active account (null for passkey users) */
  activeWallet: StellarWallet | null;
  /** Deployed C-address for the active account */
  smartAccountAddress: string | null;

  // ─── Legacy setters (called by deploy-account.tsx) ────────────────────────
  setPendingWallet: (wallet: StellarWallet) => void;
  clearPendingWallet: () => void;
  setActiveWallet: (wallet: StellarWallet) => void;
  setSmartAccountAddress: (address: string) => void;

  // ─── Multi-account actions ────────────────────────────────────────────────
  /**
   * Derive the next BIP-44 account and add it to the list.
   * Only works for mnemonic users; returns null for passkey users.
   */
  addAccount: () => Promise<WalletAccount | null>;

  /**
   * Add a new passkey-backed account. The caller is responsible for generating and
   * persisting the P-256 credential before calling this (via storePasskeyCredentialAtIndex).
   */
  addPasskeyAccount: (credentialId: string, publicKeyHex: string) => Promise<WalletAccount>;

  /** Switch the active account to the given list position. */
  switchAccount: (listIndex: number) => Promise<void>;

  /** Rename an account by its list position. */
  renameAccount: (listIndex: number, name: string) => Promise<void>;

  /**
   * Called after a new account is deployed on-chain. Updates its C-address
   * in both the in-memory list and SecureStore.
   */
  updateAccountSmartAddress: (bip44Index: number, smartAddress: string) => Promise<void>;

  /**
   * Restore wallet + accounts from SecureStore.
   * Handles migration from the old single-account format automatically.
   * Returns true if a wallet was found.
   */
  rehydrateWallet: () => Promise<boolean>;

  /** Full reset — used on logout / account removal */
  clearAll: () => Promise<void>;
}

/** Persist the accounts array to SecureStore. */
async function persistAccounts(accounts: WalletAccount[]): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  pendingWallet: null,
  mnemonic: null,
  accounts: [],
  activeAccountIndex: 0,
  activeWallet: null,
  smartAccountAddress: null,

  // ─── Legacy setters ───────────────────────────────────────────────────────

  setPendingWallet: (wallet) => set({ pendingWallet: wallet }),
  clearPendingWallet: () => set({ pendingWallet: null }),

  /**
   * Called by deploy-account.tsx after importing a phrase.
   * Syncs the full keypair into activeWallet and patches accounts[0].
   */
  setActiveWallet: (wallet) => {
    const { accounts } = get();
    if (accounts.length === 0) {
      // Store not yet initialised — just set the shortcut
      set({ activeWallet: wallet });
      return;
    }
    // Keep account 0 public fields in sync
    const updated = accounts.map((a) =>
      a.index === 0
        ? { ...a, gAddress: wallet.gAddress, publicKeyHex: wallet.publicKeyHex }
        : a,
    );
    persistAccounts(updated).catch(() => {});
    set({ activeWallet: wallet, accounts: updated });
  },

  /**
   * Called by deploy-account.tsx after the smart account is deployed.
   * Updates the active account's C-address.
   */
  setSmartAccountAddress: (address) => {
    const { accounts, activeAccountIndex } = get();
    if (accounts.length === 0) {
      set({ smartAccountAddress: address });
      return;
    }
    const updated = accounts.map((a, i) =>
      i === activeAccountIndex ? { ...a, smartAccountAddress: address } : a,
    );
    persistAccounts(updated).catch(() => {});
    // Also write the legacy key so app/index.tsx can still find it
    SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, address).catch(() => {});
    set({ smartAccountAddress: address, accounts: updated });
  },

  // ─── Multi-account actions ─────────────────────────────────────────────────

  addAccount: async () => {
    const { mnemonic, accounts } = get();
    if (!mnemonic) return null; // passkey users cannot add accounts

    // Next BIP-44 index is one beyond the highest existing index
    const nextIndex = accounts.reduce((max, a) => Math.max(max, a.index), -1) + 1;
    const wallet = deriveWalletAtIndex(mnemonic, nextIndex);

    const newAccount: WalletAccount = {
      index: nextIndex,
      name: `Account ${accounts.length + 1}`,
      gAddress: wallet.gAddress,
      publicKeyHex: wallet.publicKeyHex,
      smartAccountAddress: null,
    };

    const updated = [...accounts, newAccount];
    await persistAccounts(updated);
    set({ accounts: updated });
    return newAccount;
  },

  addPasskeyAccount: async (credentialId, publicKeyHex) => {
    const { accounts } = get();
    const newAccount: WalletAccount = {
      // Passkey accounts use negative indices: account 0 = -1 (from onboarding),
      // subsequent accounts = -(listIndex + 1)
      index: -(accounts.length + 1),
      name: `Account ${accounts.length + 1}`,
      gAddress: '',
      publicKeyHex,
      smartAccountAddress: null,
      credentialId,
    };
    const updated = [...accounts, newAccount];
    await persistAccounts(updated);
    set({ accounts: updated });
    return newAccount;
  },

  switchAccount: async (listIndex) => {
    const { mnemonic, accounts } = get();
    const account = accounts[listIndex];
    if (!account) return;

    const activeWallet = mnemonic ? deriveWalletAtIndex(mnemonic, account.index) : null;

    await SecureStore.setItemAsync(
      SECURE_KEYS.ACTIVE_ACCOUNT_INDEX,
      String(listIndex),
    );

    // Update the legacy SMART_ACCOUNT key so app/index.tsx still works
    if (account.smartAccountAddress) {
      await SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, account.smartAccountAddress);
    }

    set({
      activeAccountIndex: listIndex,
      activeWallet,
      smartAccountAddress: account.smartAccountAddress,
    });
  },

  renameAccount: async (listIndex, name) => {
    const { accounts } = get();
    const updated = accounts.map((a, i) => (i === listIndex ? { ...a, name } : a));
    await persistAccounts(updated);
    set({ accounts: updated });
  },

  updateAccountSmartAddress: async (bip44Index, smartAddress) => {
    const { accounts, activeAccountIndex } = get();
    const updated = accounts.map((a) =>
      a.index === bip44Index ? { ...a, smartAccountAddress: smartAddress } : a,
    );
    await persistAccounts(updated);

    const activeAccount = updated[activeAccountIndex];
    const isActive = activeAccount?.index === bip44Index;

    // Update legacy key whenever account 0 (the primary) is deployed
    if (bip44Index === 0 || isActive) {
      await SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, smartAddress);
    }

    set({
      accounts: updated,
      ...(isActive ? { smartAccountAddress: smartAddress } : {}),
    });
  },

  // ─── Rehydration ──────────────────────────────────────────────────────────

  rehydrateWallet: async () => {
    try {
      const [
        accountsJson,
        activeIndexStr,
        mnemonic,
        legacySmartAccount,
      ] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.ACCOUNTS),
        SecureStore.getItemAsync(SECURE_KEYS.ACTIVE_ACCOUNT_INDEX),
        SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC),
        SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT),
      ]);

      // ── Case 1: no wallet at all ──────────────────────────────────────────
      if (!accountsJson && !mnemonic && !legacySmartAccount) return false;

      let accounts: WalletAccount[];
      let activeAccountIndex = 0;

      if (accountsJson) {
        // ── Case 2: new multi-account format ─────────────────────────────────
        accounts = JSON.parse(accountsJson) as WalletAccount[];
        activeAccountIndex = activeIndexStr ? parseInt(activeIndexStr, 10) : 0;
      } else {
        // ── Case 3: migrate old single-account format ─────────────────────────
        if (mnemonic) {
          const wallet = restoreStellarWallet(mnemonic);
          accounts = [
            {
              index: 0,
              name: 'Account 1',
              gAddress: wallet.gAddress,
              publicKeyHex: wallet.publicKeyHex,
              smartAccountAddress: legacySmartAccount ?? null,
            },
          ];
        } else {
          // Passkey user — no mnemonic, single account entry
          accounts = [
            {
              index: -1,
              name: 'Account 1',
              gAddress: '',
              publicKeyHex: '',
              smartAccountAddress: legacySmartAccount ?? null,
            },
          ];
        }
        // Persist the migrated format so next launch skips this branch
        await persistAccounts(accounts);
      }

      // Derive the in-memory keypair for the active account
      const activeAccount = accounts[activeAccountIndex] ?? accounts[0];
      const activeWallet =
        mnemonic && activeAccount.index >= 0
          ? deriveWalletAtIndex(mnemonic, activeAccount.index)
          : null;

      set({
        mnemonic,
        accounts,
        activeAccountIndex,
        activeWallet,
        smartAccountAddress: activeAccount.smartAccountAddress,
      });

      return true;
    } catch {
      return false;
    }
  },

  // ─── Full reset ────────────────────────────────────────────────────────────

  clearAll: async () => {
    const { accounts } = get();

    // Delete indexed passkey keys for accounts beyond account 0
    const indexedPasskeyDeletions = accounts
      .slice(1)
      .flatMap((_, i) => {
        const keys = getPasskeyStorageKeys(i + 1);
        return [
          SecureStore.deleteItemAsync(keys.credentialId),
          SecureStore.deleteItemAsync(keys.keyDataHex),
          SecureStore.deleteItemAsync(keys.privateKey),
          SecureStore.deleteItemAsync(keys.requiresBiometric),
        ];
      });

    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.MNEMONIC),
      SecureStore.deleteItemAsync(SECURE_KEYS.SMART_ACCOUNT),
      SecureStore.deleteItemAsync(SECURE_KEYS.ACCOUNTS),
      SecureStore.deleteItemAsync(SECURE_KEYS.ACTIVE_ACCOUNT_INDEX),
      SecureStore.deleteItemAsync(SECURE_KEYS.PIN),
      SecureStore.deleteItemAsync(SECURE_KEYS.PENDING_MNEMONIC),
      SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.USER_EMAIL),
      SecureStore.deleteItemAsync(SECURE_KEYS.CREDENTIAL_ID),
      SecureStore.deleteItemAsync(SECURE_KEYS.KEY_DATA_HEX),
      SecureStore.deleteItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY),
      ...indexedPasskeyDeletions,
    ]);
    set({
      pendingWallet: null,
      mnemonic: null,
      accounts: [],
      activeAccountIndex: 0,
      activeWallet: null,
      smartAccountAddress: null,
    });
  },
}));
