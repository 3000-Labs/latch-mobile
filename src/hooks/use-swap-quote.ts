import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getActiveSwapProvider } from '@/src/services/swap/registry';
import type { SwapQuote } from '@/src/services/swap/types';

export interface UseSwapQuoteArgs {
  fromSacId?: string;
  toSacId?: string;
  /** Human-readable input amount; quote runs only when > 0 */
  amountIn: string;
  /** Slippage tolerance in basis points (default 50 = 0.5%) */
  slippageBps?: number;
  /** Provider id; defaults to the active (first) provider */
  providerId?: string;
}

/**
 * Fetches a live swap quote from the active liquidity provider. Debounce the
 * `amountIn` at the call site (the screen) so we don't quote on every keystroke.
 */
export function useSwapQuote({
  fromSacId,
  toSacId,
  amountIn,
  slippageBps = 50,
  providerId,
}: UseSwapQuoteArgs) {
  const provider = getActiveSwapProvider(providerId);
  const amountNum = parseFloat(amountIn);
  const enabled = !!fromSacId && !!toSacId && fromSacId !== toSacId && amountNum > 0;

  return useQuery<SwapQuote>({
    queryKey: ['swap-quote', provider.id, fromSacId, toSacId, amountIn, slippageBps],
    queryFn: async () => {
      if (__DEV__) {
        console.log('[swap-quote] → fetch', {
          provider: provider.id,
          fromSacId,
          toSacId,
          amountIn,
          slippageBps,
        });
      }
      try {
        const quote = await provider.getQuote({
          fromSacId: fromSacId!,
          toSacId: toSacId!,
          amountIn,
          slippageBps,
        });
        if (__DEV__) {
          console.log('[swap-quote] ✓ result', {
            amountOut: quote.amountOut,
            minReceived: quote.minReceived,
            rate: quote.rate,
            priceImpactPct: quote.priceImpactPct,
          });
        }
        return quote;
      } catch (err) {
        if (__DEV__) {
          console.log('[swap-quote] ✗ error', err instanceof Error ? err.message : err);
        }
        throw err;
      }
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    retry: 1,
  });
}
