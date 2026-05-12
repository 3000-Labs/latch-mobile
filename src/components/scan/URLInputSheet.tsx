import { useTheme } from '@shopify/restyle';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface URLInputSheetProps {
  url: string;
  onChangeUrl: (text: string) => void;
  onConnect: () => void;
}

const URLInputSheet = ({ url, onChangeUrl, onConnect }: URLInputSheetProps) => {
  const theme = useTheme<Theme>();

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    onChangeUrl(text);
  };

  return (
    <Box
      backgroundColor="cardbg"
      borderTopLeftRadius={32}
      borderTopRightRadius={32}
      padding="m"
      paddingBottom="xl"
    >
      <Text variant="p6" color="textWhite" fontWeight="700" mb="m">
        Input URL
      </Text>

      <Box
        flexDirection="row"
        alignItems="center"
        backgroundColor="bg900"
        borderRadius={12}
        paddingHorizontal="m"
        height={56}
        borderWidth={1}
        borderColor="gray900"
        mb="l"
      >
        <TextInput
          placeholder="https://lobstr.co/"
          placeholderTextColor={theme.colors.textSecondary}
          value={url}
          onChangeText={onChangeUrl}
          style={{
            flex: 1,
            color: theme.colors.textWhite,
            fontSize: 16,
            fontFamily: 'SFproRegular',
          }}
        />
        <TouchableOpacity activeOpacity={0.7} onPress={handlePaste}>
          <Box backgroundColor="primary" px="m" py="xs" borderRadius={8}>
            <Text variant="p8" color="black" fontWeight="700">
              Paste
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>

      <TouchableOpacity activeOpacity={0.8} onPress={onConnect}>
        <Box
          height={56}
          backgroundColor={url ? 'primary' : 'btnDisabled'}
          borderRadius={28}
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="p6" color="black" fontWeight="700">
            Connect
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default URLInputSheet;
