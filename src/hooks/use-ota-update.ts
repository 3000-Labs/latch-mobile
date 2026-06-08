import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';

// Industry-standard OTA flow: silently download a pending update in the
// background, then surface a non-blocking "tap to restart" prompt instead
// of force-reloading mid-session. The user picks the moment to apply it.
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let checking = false;
    // One prompt per fetched update — avoids re-toasting on every foreground.
    let prompted = false;

    const promptRestart = () => {
      if (prompted) {
        return;
      }
      prompted = true;
      Toast.show({
        type: 'update',
        text1: 'Update ready',
        text2: 'A new version is ready to install.',
        autoHide: false,
        props: {
          actionLabel: 'Restart',
          onAction: () => {
            Toast.hide();
            void Updates.reloadAsync();
          },
        },
      });
    };

    const checkAndFetch = async () => {
      if (checking || prompted) {
        return;
      }
      checking = true;
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) {
          return;
        }
        await Updates.fetchUpdateAsync();
        promptRestart();
      } catch {
        // Non-fatal — the default background fetch still applies the update
        // on the next cold launch.
      } finally {
        checking = false;
      }
    };

    void checkAndFetch();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void checkAndFetch();
      }
    });

    return () => sub.remove();
  }, []);
}
