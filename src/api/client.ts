import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      gcTime: 1000 * 60 * 10,
    },
  },
});

// Pause interval refetches while the app is backgrounded so polling queries
// (cosign, history, portfolio) don't keep hammering the per-wallet rate-limit
// bucket when the user isn't looking. React Query's refetchIntervalInBackground
// defaults to false, but in React Native that only takes effect once focus is
// driven off AppState — RN has no window-focus events of its own.
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});
