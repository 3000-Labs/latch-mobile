import { PropsWithChildren, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '@shopify/restyle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme<Theme>();

  return (
    <Box>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <Text variant="h10" color="textPrimary">{isOpen ? '▾' : '▸'}</Text>
        <Text variant="h10" color="textPrimary">{title}</Text>
      </TouchableOpacity>
      {isOpen && (
        <Box marginTop="xs" marginLeft="l">
          {children}
        </Box>
      )}
    </Box>
  );
}
