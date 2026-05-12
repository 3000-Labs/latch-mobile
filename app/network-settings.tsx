import NetworkItem from '@/src/components/network/NetworkItem';
import Box from '@/src/components/shared/Box';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

const NETWORKS = [
  { id: 'public', name: 'Public Network', description: 'Standard production environment' },
  { id: 'testnet', name: 'Testnet', description: 'Environment for testing' },
  { id: 'futurenet', name: 'Futurenet', description: 'Environment for early features' },
];

const NetworkSettings = () => {
  const router = useRouter();
  const [selectedNetwork, setSelectedNetwork] = React.useState('public');

  const handleBack = () => {
    router.back();
  };

  return (
    <Box
      flex={1}
      backgroundColor="cardbg"
      style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
    >
      <StatusBar style="light" />

      <UtilityHeader title="Network" onBack={handleBack} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}>
        {NETWORKS.map((network) => (
          <TouchableOpacity
            key={network.id}
            activeOpacity={0.7}
            onPress={() => setSelectedNetwork(network.id)}
          >
            <NetworkItem
              name={network.name}
              description={network.description}
              isSelected={selectedNetwork === network.id}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Box>
  );
};

export default NetworkSettings;
