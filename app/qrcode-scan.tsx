import AddressResultCard from '@/src/components/scan/AddressResultCard';
import ScannerFrame from '@/src/components/scan/ScannerFrame';
import URLInputSheet from '@/src/components/scan/URLInputSheet';
import Box from '@/src/components/shared/Box';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QRScanScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');

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

  const handleBarcodeScanned = (data: string) => {
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
              // Navigate to send screen with address
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
              // Logic for connecting via URL
              if (inputUrl) {
                console.log('Connecting to:', inputUrl);
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default QRScanScreen;
