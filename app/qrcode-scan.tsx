import AddressResultCard from '@/src/components/scan/AddressResultCard';
import ScannerFrame from '@/src/components/scan/ScannerFrame';
import URLInputSheet from '@/src/components/scan/URLInputSheet';
import Box from '@/src/components/shared/Box';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import NetInfo from '@react-native-community/netinfo';
import { pairWithUri } from '@/src/lib/walletconnect';
import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAIRING_TIMEOUT_MS = 15_000;

const QRScanScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the screen loses focus (either because session_proposal navigated away,
  // or the user pressed back), clear any pending timeout and reset pairing state.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsPairing(false);
      };
    }, []),
  );

  if (!permission) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="mainBackground">
        <ActivityIndicator size="small" color="orange" />
      </Box>
    );
  }

  if (!permission.granted) {
    requestPermission();
    return (
      <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="mainBackground">
        {/* Permission Request UI could go here */}
      </Box>
    );
  }

  const handlePairUri = async (uri: string) => {
    if (!uri.startsWith('wc:')) {
      Alert.alert('Invalid URL', 'Please paste a valid WalletConnect URI starting with wc:');
      return;
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected || !net.isInternetReachable) {
      Alert.alert('No internet', 'Connect to the internet before pairing with WalletConnect.');
      return;
    }

    setIsPairing(true);

    timeoutRef.current = setTimeout(() => {
      setIsPairing(false);
      Alert.alert(
        'Connection failed',
        'Unable to reach the relay server. Check your internet connection and try again.',
      );
    }, PAIRING_TIMEOUT_MS);

    try {
      await pairWithUri(uri);
      // pairWithUri resolves once the request is sent; the session_proposal event
      // fires asynchronously in use-walletconnect.ts and navigates to /wc-session-proposal.
      // useFocusEffect cleanup above clears the timeout when the screen loses focus.
    } catch (e: any) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPairing(false);
      Alert.alert('WalletConnect', e?.message ?? 'Failed to pair');
    }
  };

  const handleCosignPayload = (data: string): boolean => {
    const trimmed = data.trim();
    // latch://cosign?d=<base64url> deep link from another owner's "Show QR".
    const dMatch = trimmed.match(/cosign\?(?:.*&)?d=([^&\s]+)/);
    if (dMatch) {
      router.replace({ pathname: '/cosign-review', params: { d: dMatch[1] } });
      return true;
    }
    // Raw packet JSON (fallback when shared as text and re-encoded into a QR).
    if (trimmed.startsWith('{') && trimmed.includes('"unsignedTxXdr"')) {
      router.replace({ pathname: '/cosign-review', params: { data: trimmed } });
      return true;
    }
    return false;
  };

  const handleBarcodeScanned = (data: string) => {
    if (data.startsWith('wc:')) {
      handlePairUri(data);
      return;
    }
    if (handleCosignPayload(data)) return;
    setScannedAddress(data);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <Box flex={1} backgroundColor="black">
      <StatusBar style="light" />

      {/* Scanner View */}
      <ScannerFrame onBarcodeScanned={handleBarcodeScanned} scanned={!!scannedAddress} />

      {/* Header Overlay */}
      <Box position="absolute" top={insets.top} left={0} right={0}>
        <UtilityHeader title="Scan QR Code" onBack={handleBack} showHandle={false} />
      </Box>

      {/* Logic for showing result or input */}
      {scannedAddress ? (
        <Box
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
          justifyContent="center"
          alignItems="center"
        >
          <AddressResultCard
            address={scannedAddress}
            onSend={() => {
              router.push({
                pathname: '/send-token',
                params: { address: scannedAddress },
              });
            }}
            onScanAgain={() => setScannedAddress(null)}
          />
        </Box>
      ) : (
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          style={{ paddingBottom: insets.bottom }}
        >
          <URLInputSheet
            url={inputUrl}
            onChangeUrl={setInputUrl}
            onConnect={() => {
              // A pasted cosign link routes to the approval screen; otherwise
              // treat the input as a WalletConnect URI.
              if (handleCosignPayload(inputUrl)) return;
              handlePairUri(inputUrl);
            }}
            isConnecting={isPairing}
          />
        </Box>
      )}
    </Box>
  );
};

export default QRScanScreen;
