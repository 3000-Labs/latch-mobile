import TokenIcon from '@/src/components/shared/TokenIcon';
import { type TokenConfig } from '@/src/constants/known-tokens';
import { useTokenIcon } from '@/src/hooks/use-token-list';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import Box from '../shared/Box';
import Text from '../shared/Text';
import { TouchableOpacity } from 'react-native';

interface Props {
  token: TokenConfig;
  tracked: boolean;
  onAdd: () => void;
  onRemove: () => void;
  isDark: boolean;
  theme: Theme;
}

const WellKnownTokenRow = ({ token, tracked, onAdd, onRemove, isDark, theme }: Props) => {
  const iconUrl = useTokenIcon(token.code, token.issuer);

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={isDark ? 'gray900' : 'white'}
      padding="m"
      borderRadius={16}
      mb="s"
      style={
        !isDark
          ? {
              borderWidth: 1,
              borderColor: '#F5F5F5',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }
          : {}
      }
    >
      <Box backgroundColor={isDark ? 'black' : 'text400'} borderRadius={22} mr="m">
        <TokenIcon iconUrl={iconUrl} size={44} />
      </Box>
      <Box flex={1}>
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {token.code}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs" numberOfLines={1}>
          {token.name}
        </Text>
      </Box>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={tracked ? onRemove : onAdd}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Box
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={tracked ? 'danger900' : 'primary700'}
          justifyContent="center"
          alignItems="center"
        >
          <Ionicons name={tracked ? 'remove' : 'add'} size={18} color="#000" />
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default WellKnownTokenRow;
