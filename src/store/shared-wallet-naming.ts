import { create } from 'zustand';

/**
 * Queue of auto-detected shared-wallet addresses awaiting a name from the user.
 * The background discovery sweep enqueues addresses instead of silently adding
 * them; SharedWalletNamingModal drains the queue one at a time, letting the user
 * name each wallet before it's stored (the verified add happens on submit).
 *
 * `dismissed` holds addresses the user tapped "Not now" on. It's session-scoped
 * (in-memory) on purpose: discovery runs every foreground, so without it a
 * declined wallet would re-prompt within 30s. Being added to a shared wallet is
 * worth re-surfacing eventually, so we let a fresh app launch re-offer it rather
 * than persisting the dismissal forever (the wallet also stays addable by hand).
 */
interface SharedWalletNamingState {
  queue: string[];
  dismissed: string[];
  // Returns true if newly enqueued, false if already pending or dismissed (dedup).
  enqueue: (address: string) => boolean;
  dequeue: () => void;
  // Drop the head of the queue and suppress it for the rest of this session.
  dismiss: (address: string) => void;
}

export const useSharedWalletNaming = create<SharedWalletNamingState>((set, get) => ({
  queue: [],
  dismissed: [],
  enqueue: (address) => {
    const { queue, dismissed } = get();
    if (queue.includes(address) || dismissed.includes(address)) return false;
    set((s) => ({ queue: [...s.queue, address] }));
    return true;
  },
  dequeue: () => set((s) => ({ queue: s.queue.slice(1) })),
  dismiss: (address) =>
    set((s) => ({
      queue: s.queue.filter((a) => a !== address),
      dismissed: s.dismissed.includes(address) ? s.dismissed : [...s.dismissed, address],
    })),
}));
