import { PropsWithChildren, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

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
