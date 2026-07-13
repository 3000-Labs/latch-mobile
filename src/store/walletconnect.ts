import { type WalletKitTypes } from '@reown/walletkit';
import { type SessionTypes } from '@walletconnect/types';
import { create } from 'zustand';

interface WalletConnectState {
  pendingProposal: WalletKitTypes.SessionProposal | null;
  pendingRequest: WalletKitTypes.SessionRequest | null;
  activeSessions: Record<string, SessionTypes.Struct>;
  setPendingProposal: (p: WalletKitTypes.SessionProposal | null) => void;
  setPendingRequest: (r: WalletKitTypes.SessionRequest | null) => void;
  setActiveSessions: (s: Record<string, SessionTypes.Struct>) => void;
}

export const useWalletConnectStore = create<WalletConnectState>((set) => ({
  pendingProposal: null,
  pendingRequest: null,
  activeSessions: {},
  setPendingProposal: (p) => set({ pendingProposal: p }),
  setPendingRequest: (r) => set({ pendingRequest: r }),
  setActiveSessions: (s) => set({ activeSessions: s }),
}));
