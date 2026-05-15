import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { maskAddress } from '@/src/utils';

interface Signer {
  id: string;
  name: string;
  address: string;
  isPrimary?: boolean;
}

interface Props {
  signer: Signer;
  onDelete?: (id: string) => void;
}

function RightAction({ dragX, onDelete }: { dragX: SharedValue<number>; onDelete: () => void }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(dragX.value, [-80, 0], [0, 80], 'clamp') }],
  }));
  const theme = useTheme<Theme>();

  return (
    <TouchableOpacity onPress={onDelete} activeOpacity={0.8} style={styles.deleteAction}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="trash-outline" size={24} color={theme.colors.inputError} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const SwipeableSignerItem = ({ signer, onDelete }: Props) => {
  const theme = useTheme<Theme>();

  const renderRightActions = (_progress: SharedValue<number>, dragX: SharedValue<number>) => (
    <RightAction dragX={dragX} onDelete={() => onDelete?.(signer.id)} />
  );

  const Content = (
    <Box
      backgroundColor="bg11"
      borderRadius={24}
      padding="l"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      mb="m"
    >
      <Box>
        <Text variant="h11" color="textPrimary" fontWeight="700" mb="xs">
          {signer.name}
        </Text>
        <Text variant="p7" color="textSecondary">
          C:{maskAddress(signer.address)}
        </Text>
      </Box>

      {signer.isPrimary && (
        <Box
          paddingHorizontal="m"
          paddingVertical="xs"
          borderRadius={8}
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
        >
          <Text variant="h12" color="primary700" fontWeight="700">
            Primary
          </Text>
        </Box>
      )}
    </Box>
  );

  if (signer.isPrimary) {
    return Content;
  }

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      {Content}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 0,
  },
  deleteAction: {
    // backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '80%',
    borderRadius: 24,
    marginLeft: -10,
    marginBottom: 16,
  },
});

export default SwipeableSignerItem;
