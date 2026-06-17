import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  // Track whether we've ever gone offline so we don't show "Back online" on first mount.
  const wentOffline = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;

      if (!online) {
        wentOffline.current = true;
        setIsOnline(false);
        Toast.show({
          type: 'error',
          text1: 'No internet connection',
          text2: 'Check your network and try again.',
          visibilityTime: 0,
          autoHide: false,
        });
      } else {
        setIsOnline(true);
        if (wentOffline.current) {
          Toast.show({ type: 'success', text1: 'Back online' });
        }
      }
    });

    return unsub;
  }, []);

  return isOnline;
}
