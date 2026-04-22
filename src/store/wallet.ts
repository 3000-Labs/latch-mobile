import { create } from 'zustand';
import { StellarWallet } from '@/src/lib/seed-wallet';

interface WalletStore {
  pendingWallet: StellarWallet | null;
  setPendingWallet: (wallet: StellarWallet) => void;
  clearPendingWallet: () => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  pendingWallet: null,
  setPendingWallet: (wallet) => set({ pendingWallet: wallet }),
  clearPendingWallet: () => set({ pendingWallet: null }),
}));
