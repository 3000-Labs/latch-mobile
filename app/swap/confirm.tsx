import Box from '@/src/components/shared/Box';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ConfirmSwap = () => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const [mevProtection, setMevProtection] = useState(false);

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* Header */}
      <Box
        height={56}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="m"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontFamily="SFproSemibold">
          Confirm Swap
        </Text>
      </Box>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* From Section */}
        <Box mt="m">
          <Text variant="p7" color="textSecondary" mb="s">
            From
          </Text>
          <Box
            backgroundColor="bg900"
            borderRadius={18}
            padding="m"
            flexDirection="row"
            alignItems="center"
          >
            <Box
              width={44}
              height={44}
              borderRadius={12}
              backgroundColor="bg800"
              justifyContent="center"
              alignItems="center"
              mr="m"
            >
              <Image
                source={require('@/src/assets/token/stellar.png')}
                style={{ width: 24, height: 24 }}
              />
            </Box>
            <Box flex={1}>
              <Text variant="h10" color="textPrimary">
                Unlimited Stellar
              </Text>
              <Text variant="p8" color="textSecondary">
                To: 0xb300...c7028d
              </Text>
            </Box>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="pencil-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Box>
        </Box>

        {/* Spend Section */}
        <Box mt="m">
          <Text variant="p7" color="textSecondary" mb="s">
            Spend
          </Text>
          <Box
            backgroundColor="bg900"
            borderRadius={18}
            padding="m"
            flexDirection="row"
            alignItems="center"
          >
            <Box
              width={44}
              height={44}
              borderRadius={12}
              backgroundColor="bg800"
              justifyContent="center"
              alignItems="center"
              mr="m"
            >
              <Image
                source={require('@/src/assets/token/stellar.png')}
                style={{ width: 24, height: 24 }}
              />
            </Box>
            <Box flex={1}>
              <Text variant="h9" color="textPrimary">
                -1 USDT
              </Text>
              <Text variant="p8" color="textSecondary">
                ≈$1.00056
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Receive Section */}
        <Box mt="m">
          <Text variant="p7" color="textSecondary" mb="s">
            Receive (Estimated)
          </Text>
          <Box
            backgroundColor="bg900"
            borderRadius={18}
            padding="m"
            flexDirection="row"
            alignItems="center"
          >
            <Box
              width={44}
              height={44}
              borderRadius={12}
              backgroundColor="bg800"
              justifyContent="center"
              alignItems="center"
              mr="m"
            >
              <Image
                source={require('@/src/assets/token/stellar.png')}
                style={{ width: 24, height: 24 }}
              />
            </Box>
            <Box flex={1}>
              <Text variant="h9" color="textPrimary">
                +0.00084181 Tet
              </Text>
              <Text variant="p8" color="textSecondary">
                ≈$1.00306 (+0.25%)
              </Text>
            </Box>
            <Box>
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
            </Box>
          </Box>
        </Box>

        {/* Details Section */}
        <Box mt="xl">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="p7" color="textSecondary">
              MEV Protection
            </Text>
            <Switch value={mevProtection} onValueChange={setMevProtection} />
          </Box>

          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="p7" color="textSecondary">
              Gas Account
            </Text>
            <TouchableOpacity style={styles.detailValueRow}>
              <Text variant="p7" color="textPrimary" mr="xs">
                0x6A4A...95670d
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Box>

          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="p7" color="textSecondary">
              Network Fee
            </Text>
            <TouchableOpacity style={styles.detailValueRow}>
              <Text variant="p7" color="textPrimary" mr="xs">
                Fast | 0.00004619 BNB ($0.05493)
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Box>

          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="p7" color="textSecondary">
              Min. Received
            </Text>
            <Text variant="p7" color="textPrimary">
              0.000838 BNB
            </Text>
          </Box>

          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="p7" color="textSecondary">
              Provider
            </Text>
            <Box flexDirection="row" alignItems="center">
              <Image
                source={require('@/src/assets/images/LiquidMesh.png')}
                style={{ width: 18, height: 18, borderRadius: 4, marginRight: 6 }}
              />
              <Text variant="p7" color="textPrimary">
                LiquidMesh
              </Text>
            </Box>
          </Box>

          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="p7" color="textSecondary">
              Receive Address
            </Text>
            <Text variant="p7" color="textPrimary">
              0x6A4A...95670d
            </Text>
          </Box>
        </Box>
      </ScrollView>

      {/* Footer Buttons */}
      <Box
        paddingHorizontal="m"
        paddingBottom="m"
        flexDirection="row"
        justifyContent="space-between"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          style={[styles.footerButton, styles.cancelButton]}
          onPress={() => router.back()}
        >
          <Text variant="h10" color="textPrimary">
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.dismissTo({
              pathname: '/(auth)/thank-you',
              params: {
                title: 'Your Swap was successful',
                subtext: 'Swap was goood',
                buttonLabel: 'Go to Dashboard',
                imageSource: 'success',
              },
            })
          }
          style={[styles.footerButton, styles.confirmButton]}
        >
          <Text variant="h10" color="bgDark900" style={{ fontWeight: '600' }}>
            Confirm Swap
          </Text>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.48,
  },
  cancelButton: {
    backgroundColor: '#1C1C1E',
  },
  confirmButton: {
    backgroundColor: '#FFAD00',
  },
});

export default ConfirmSwap;
