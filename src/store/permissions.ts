import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  createSessionKey as svcCreateSessionKey,
  revokeSessionKey as svcRevokeSessionKey,
  setThresholdPolicy as svcSetThreshold,
  type CreateSessionKeyParams,
} from '@/src/lib/permissions-service';

/**
 * Session keys + account policies, keyed by the account's smart-account
 * C-address so each wallet has its own set. Plain AsyncStorage — this holds
 * only non-sensitive metadata (names, allowed actions, expiry, limit values).
 * NO key material lives here; PHASE 2's ephemeral session-key secrets go to
 * SecureStore via SECURE_KEYS, never here.
 *
 * State writes route through src/lib/permissions-service.ts so the on-chain
 * wiring (PHASE 2) can be added there without touching this store or the UI.
 */
const STORAGE_KEY = 'latch.permissions.v1';

export type SessionKeyAction = 'transfer' | 'swap' | 'offers';

export interface SessionKey {
  /** Local id now; becomes the on-chain context-rule id in PHASE 2. */
  id: string;
  name: string;
  /** Scope — maps to a CallContract allowlist on-chain. */
  allowedActions: SessionKeyAction[];
  /** e.g. "1 Day"; maps to a valid_until ledger on-chain. */
  durationLabel: string;
  /** Epoch ms the key expires, derived from durationLabel at creation. */
  expiresAt: number;
  /** Display only — not enforced on-chain (no spend-limit policy contract). */
  spendingLimit: string;
  createdAt: number;
  status: 'active' | 'revoked';
}

export interface SpendLimit {
  amount: string;
  asset: string;
}

export interface AccountPolicies {
  /** Mirrors the on-chain admin-rule threshold (M of N). */
  threshold: number | null;
  /** Saved preference — not enforced on-chain yet. */
  spendLimit: SpendLimit | null;
}

interface PerAccount {
  sessionKeys: SessionKey[];
  policies: AccountPolicies;
}

const emptyAccount = (): PerAccount => ({
  sessionKeys: [],
  policies: { threshold: null, spendLimit: null },
});

interface PermissionsState {
  byAccount: Record<string, PerAccount>;
  hydrated: boolean;
  rehydrate: () => Promise<void>;
  addSessionKey: (account: string, params: CreateSessionKeyParams) => Promise<void>;
  revokeSessionKey: (account: string, id: string) => Promise<void>;
  setThreshold: (account: string, threshold: number) => Promise<void>;
  setSpendLimit: (account: string, limit: SpendLimit | null) => void;
}

export const usePermissions = create<PermissionsState>((set, get) => {
  const persist = (byAccount: Record<string, PerAccount>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(byAccount)).catch(() => {});
  };

  const update = (account: string, fn: (prev: PerAccount) => PerAccount) => {
    const prev = get().byAccount[account] ?? emptyAccount();
    const byAccount = { ...get().byAccount, [account]: fn(prev) };
    set({ byAccount });
    persist(byAccount);
  };

  return {
    byAccount: {},
    hydrated: false,

    rehydrate: async () => {
      if (get().hydrated) return;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        set({ byAccount: raw ? JSON.parse(raw) : {}, hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    addSessionKey: async (account, params) => {
      const key = await svcCreateSessionKey(account, params);
      update(account, (prev) => ({ ...prev, sessionKeys: [key, ...prev.sessionKeys] }));
    },

    revokeSessionKey: async (account, id) => {
      const key = get().byAccount[account]?.sessionKeys.find((k) => k.id === id);
      if (!key) return;
      await svcRevokeSessionKey(account, key);
      update(account, (prev) => ({
        ...prev,
        sessionKeys: prev.sessionKeys.map((k) =>
          k.id === id ? { ...k, status: 'revoked' as const } : k,
        ),
      }));
    },

    setThreshold: async (account, threshold) => {
      await svcSetThreshold(account, threshold);
      update(account, (prev) => ({ ...prev, policies: { ...prev.policies, threshold } }));
    },

    setSpendLimit: (account, limit) => {
      update(account, (prev) => ({ ...prev, policies: { ...prev.policies, spendLimit: limit } }));
    },
  };
});
