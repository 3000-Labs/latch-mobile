import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/src/theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PermissionsInfoModal = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Box
          flex={1}
          justifyContent="flex-end"
          paddingHorizontal="m"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TouchableWithoutFeedback>
            <Box backgroundColor="bg11" borderRadius={24} padding="m">
              {/* Header */}
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="l">
                <Text variant="h8" color="textPrimary" fontWeight="700">
                  How permissions work
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </Box>

              {/* Sections */}
              <Box mb="l">
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
                  Temporary Keys
                </Text>
                <Text variant="p7" color="textSecondary" lineHeight={22}>
                  When you connect an app, Latch creates a temporary Session Key that can act on
                  your behalf.
                </Text>
              </Box>

              <Box mb="l">
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
                  Strict Limits
                </Text>
                <Text variant="p7" color="textSecondary" lineHeight={22}>
                  These keys cannot transfer your full balance or change settings. They are strictly
                  bound to limits you approve.
                </Text>
              </Box>

              <Box>
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
                  Auto-Expiration
                </Text>
                <Text variant="p7" color="textSecondary" lineHeight={22}>
                  You never have to remember to disconnect. Sessions expire automatically and revoke
                  themselves.
                </Text>
              </Box>
            </Box>
          </TouchableWithoutFeedback>
        </Box>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default PermissionsInfoModal;
