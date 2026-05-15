import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LAST_UPDATED = 'May 14, 2026';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section = ({ title, children }: SectionProps) => (
  <Box mb="l">
    <Text variant="h10" color="textPrimary" fontWeight="700" mb="s">
      {title}
    </Text>
    {children}
  </Box>
);

const Body = ({ children }: { children: React.ReactNode }) => (
  <Text variant="p7" color="textSecondary" lineHeight={22}>
    {children}
  </Text>
);

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicySheet = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? theme.colors.cardbg : theme.colors.mainBackground,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY }],
            maxHeight: SCREEN_HEIGHT * 0.9,
            minHeight: 500,
          },
        ]}
      >
        <BottomSheetHandle />

        {/* Header */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="m"
          py="m"
          mb="m"
        >
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <Text variant="h10" color="textPrimary" fontWeight="700">
            Privacy Policy
          </Text>

          <Box width={40} />
        </Box>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="p7" color="textSecondary" mb="l">
            Last updated: {LAST_UPDATED}
          </Text>

          <Section title="Overview">
            <Body>
              Latch is a self-custodial Stellar blockchain wallet. We do not control or have access to
              your private keys, recovery phrase, or funds at any time. This policy explains what
              limited data we collect, why we collect it, and how it is handled.
            </Body>
          </Section>

          <Section title="Information We Collect">
            <Body>
              We collect the minimum information necessary to operate the app:{'\n\n'}
              • Device identifiers and operating system version for crash reporting and diagnostics.
              {'\n'}
              • App usage data (screens visited, features used) to improve the product. This data is
              anonymised and not linked to your identity.{'\n'}
              • Email address, if you voluntarily provide it during account setup or for recovery
              purposes.{'\n\n'}
              We do not collect your name, phone number, government ID, or any financial information
              beyond what is visible on the public Stellar blockchain.
            </Body>
          </Section>

          <Section title="Information We Do Not Collect">
            <Body>
              We never collect or transmit:{'\n\n'}
              • Your recovery phrase (mnemonic){'\n'}
              • Your private keys or seed data{'\n'}
              • Your biometric data (Face ID / Touch ID is handled entirely by your device OS){'\n'}
              • Your PIN{'\n\n'}
              All sensitive wallet credentials are stored exclusively in your device&apos;s secure enclave
              via Expo SecureStore and never leave your device.
            </Body>
          </Section>

          <Section title="Blockchain Data">
            <Body>
              Transactions you initiate are broadcast to the Stellar network and become permanently
              visible on the public blockchain. This is inherent to how blockchain technology works
              and is outside our control. Anyone with your wallet address can view your transaction
              history on a public block explorer.
            </Body>
          </Section>

          <Section title="Third-Party Services">
            <Body>
              Latch interacts with the following third-party services:{'\n\n'}
              • Stellar Network (Horizon & Soroban RPC) — to fetch balances and submit transactions.
              {'\n'}
              • Supabase — for over-the-air app updates. No personal data is shared.{'\n\n'}
              Each third-party service operates under its own privacy policy. We recommend reviewing
              them independently.
            </Body>
          </Section>

          <Section title="Data Storage & Security">
            <Body>
              Sensitive data (keys, PIN, biometric flags) is stored in your device&apos;s secure enclave
              and never transmitted to our servers. Anonymised analytics data may be stored on
              servers located in the European Union or United States. We apply industry-standard
              security practices to protect any data we do hold.
            </Body>
          </Section>

          <Section title="Children's Privacy">
            <Body>
              Latch is not directed at children under the age of 18. We do not knowingly collect
              personal information from minors. If you believe a minor has provided us with personal
              information, please contact us and we will delete it promptly.
            </Body>
          </Section>

          <Section title="Your Rights">
            <Body>
              Depending on your jurisdiction, you may have the right to access, correct, or delete
              personal data we hold about you. To exercise these rights, contact us at the address
              below. Because wallet credentials are stored only on your device, deleting the app
              removes them entirely — we have no ability to recover them on your behalf.
            </Body>
          </Section>

          <Section title="Changes to This Policy">
            <Body>
              We may update this policy from time to time. When we do, we will update the
              &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the app
              after changes are posted constitutes your acceptance of the revised policy.
            </Body>
          </Section>

          <Section title="Contact Us">
            <Body>
              If you have any questions about this Privacy Policy, please contact us at:{'\n\n'}
              support@getlatch.co
            </Body>
          </Section>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default PrivacyPolicySheet;
