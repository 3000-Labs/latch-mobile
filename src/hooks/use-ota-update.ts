import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// Collapses the two-launch OTA quirk: on cold launch (and on each
// foreground), fetch any pending update and reload into it in the same
// session instead of waiting for the user to force-quit twice.
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let checking = false;

    const checkAndApply = async () => {
      if (checking) {
        return;
      }
      checking = true;
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) {
          return;
        }
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        // Network/availability errors are non-fatal — the default
        // background fetch still applies the update on next cold launch.
      } finally {
        checking = false;
      }
    };

    void checkAndApply();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void checkAndApply();
      }
    });

    return () => sub.remove();
  }, []);
}
