import TokenIcon from '@/src/components/shared/TokenIcon';
import { type TokenConfig } from '@/src/constants/known-tokens';
import { useTokenIcon } from '@/src/hooks/use-token-list';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import Box from '../shared/Box';
import Text from '../shared/Text';

interface Props {
  token: TokenConfig;
  isDark: boolean;
  onRemove: () => void;
}

const TrackedTokenRow = ({ token, isDark, onRemove }: Props) => {
  const iconUrl = useTokenIcon(token.code, token.issuer);
  const subtitle = token.sacContractId ?? token.issuer ?? '';

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={isDark ? 'gray900' : 'white'}
      padding="m"
      borderRadius={16}
      mb="s"
      style={!isDark ? { borderWidth: 1, borderColor: '#F5F5F5' } : {}}
    >
      <Box backgroundColor={isDark ? 'black' : 'text400'} borderRadius={22} mr="m">
        <TokenIcon iconUrl={iconUrl} size={44} />
      </Box>
      <Box flex={1}>
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {token.code}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs" numberOfLines={1}>
          {subtitle}
        </Text>
      </Box>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </Box>
  );
};

export default TrackedTokenRow;
