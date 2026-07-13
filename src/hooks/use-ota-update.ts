import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';

// Reads `extra.otaCritical` from the incoming update's manifest. Set it on a
// publish (via `extra` in app.config.js) only when a fix must reach users
// immediately — e.g. `eas update` after flipping the flag on.
function isCriticalUpdate(manifest: unknown): boolean {
  const extra = (manifest as { extra?: { expoClient?: { extra?: Record<string, unknown> } } })?.extra
    ?.expoClient?.extra;
  return extra?.otaCritical === true;
}

// OTA policy: normal updates download silently and apply on the next cold
// launch (no UI — matches every major consumer app). Only updates explicitly
// flagged critical surface a non-blocking "Restart" prompt so the user can
// apply the fix without waiting for a natural relaunch.
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let checking = false;
    // One prompt per session — avoids re-toasting on every foreground.
    let prompted = false;

    const promptRestart = () => {
      if (prompted) {
        return;
      }
      prompted = true;
      Toast.show({
        type: 'update',
        text1: 'Update available',
        text2: 'An important update is ready to install.',
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

    const check = async () => {
      if (checking || prompted) {
        return;
      }
      checking = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) {
          return;
        }
        // Non-critical updates are left to expo-updates' automatic
        // background fetch — they apply silently on the next cold launch.
        if (!isCriticalUpdate(result.manifest)) {
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

    void check();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void check();
      }
    });

    return () => sub.remove();
  }, []);
}
