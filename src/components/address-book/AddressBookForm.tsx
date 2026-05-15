import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as Clipboard from 'expo-clipboard';
import { Formik } from 'formik';
import React from 'react';
import { Image, TextInput, TouchableOpacity } from 'react-native';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import NetworkSelectSheet from './NetworkSelectSheet';

const AddressBookSchema = Yup.object().shape({
  network: Yup.string().required('Required'),
  label: Yup.string().required('Required'),
  address: Yup.string().required('Required'),
});

const NETWORKS = [
  { name: 'Solana', icon: require('@/src/assets/token/solana.png') },
  { name: 'Ethereum', icon: require('@/src/assets/token/eth.png') },
  { name: 'Stellar', icon: require('@/src/assets/token/stellar.png') },
  { name: 'Ripple', icon: require('@/src/assets/token/ripple.png') },
  { name: 'Polkadot', icon: require('@/src/assets/token/pokadot.png') },
];

interface AddressBookFormProps {
  onSubmit: (values: any, formikHelpers: any) => void;
}

const AddressBookForm = ({ onSubmit }: AddressBookFormProps) => {
  const theme = useTheme<Theme>();
  const [showNetworkSelect, setShowNetworkSelect] = React.useState(false);

  return (
    <Formik
      initialValues={{ network: 'Solana', label: '', address: '' }}
      validationSchema={AddressBookSchema}
      onSubmit={onSubmit}
    >
      {({ handleChange, handleBlur, handleSubmit, values, setFieldValue, isValid, dirty }) => (
        <Box flex={1}>
          <Box flex={1} paddingHorizontal="m" pt="m">
            <Box mb="l">
              <Text variant="p7" color="textPrimary" fontWeight="600" mb="s">
                Network
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowNetworkSelect(true)}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor="bg900"
                  borderRadius={12}
                  paddingHorizontal="m"
                  height={56}
                  borderWidth={1}
                  borderColor="gray900"
                >
                  <Box flexDirection="row" alignItems="center">
                    <Image
                      source={NETWORKS.find((n) => n.name === values.network)?.icon}
                      style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
                    />
                    <Text variant="p6" color="textPrimary">
                      {values.network}
                    </Text>
                  </Box>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </Box>
              </TouchableOpacity>
            </Box>

            <Box mb="l">
              <Text variant="p7" color="textPrimary" fontWeight="600" mb="s">
                Label
              </Text>
              <Input
                placeholder="Label your address"
                onChangeText={handleChange('label')}
                onBlur={handleBlur('label')}
                value={values.label}
              />
            </Box>

            <Box mb="l">
              <Text variant="p7" color="textPrimary" fontWeight="600" mb="s">
                Wallet Address
              </Text>
              <Box
                flexDirection="row"
                alignItems="center"
                backgroundColor="bg900"
                borderRadius={12}
                paddingHorizontal="m"
                minHeight={56}
                borderWidth={1}
                borderColor="gray900"
                paddingVertical="s"
              >
                <TextInput
                  placeholder="Input an address"
                  placeholderTextColor={theme.colors.textSecondary}
                  onChangeText={handleChange('address')}
                  onBlur={handleBlur('address')}
                  value={values.address}
                  multiline
                  style={{
                    flex: 1,
                    color: theme.colors.textPrimary,
                    fontSize: 16,
                    fontFamily: 'SFproRegular',
                    marginRight: 8,
                  }}
                />
                {values.address ? (
                  <TouchableOpacity onPress={() => setFieldValue('address', '')}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={async () => {
                      const text = await Clipboard.getStringAsync();
                      setFieldValue('address', text);
                    }}
                  >
                    <Box backgroundColor="bg800" px="m" py="xs" borderRadius={8}>
                      <Text variant="p8" color="textPrimary" fontWeight="600">
                        Paste
                      </Text>
                    </Box>
                  </TouchableOpacity>
                )}
              </Box>
            </Box>

            <Box position="absolute" bottom={40} width="100%" left={theme.spacing.m}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSubmit()}
                disabled={!(isValid && dirty)}
              >
                <Box
                  height={56}
                  backgroundColor={isValid && dirty ? 'primary' : 'bg900'}
                  borderRadius={28}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text
                    variant="p6"
                    color={isValid && dirty ? 'black' : 'textSecondary'}
                    fontWeight="700"
                  >
                    Save Address
                  </Text>
                </Box>
              </TouchableOpacity>
            </Box>
          </Box>

          {showNetworkSelect && (
            <NetworkSelectSheet
              networks={NETWORKS}
              selectedNetwork={values.network}
              onSelect={(name) => {
                setFieldValue('network', name);
                setShowNetworkSelect(false);
              }}
              onClose={() => setShowNetworkSelect(false)}
            />
          )}
        </Box>
      )}
    </Formik>
  );
};

export default AddressBookForm;
