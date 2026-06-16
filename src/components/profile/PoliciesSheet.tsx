import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Formik } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';

import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { SHEET_HEIGHT } from '@/src/constants/constants';
import { usePermissions } from '@/src/store/permissions';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import SessionKeyTokenPicker, { largestBalanceCode, useHeldTokens } from './SessionKeyTokenPicker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface PolicyFormValues {
  threshold: number;
  spendAmount: string;
  spendAsset: string;
}

const PoliciesSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const { accounts, activeAccountIndex } = useWalletStore();
  const activeAccount = accounts[activeAccountIndex];
  const accountAddress = activeAccount?.smartAccountAddress ?? '';
  const isMultisig = !!activeAccount?.isMultisig;
  const signerCount = Math.max(activeAccount?.devices?.length ?? 1, 1);

  const { byAccount, rehydrate, setThreshold, setSpendLimit } = usePermissions();
  const policies = byAccount[accountAddress]?.policies;

  const tokens = useHeldTokens();
  const [pickerVisible, setPickerVisible] = useState(false);

  const validationSchema = Yup.object().shape({
    threshold: Yup.number()
      .integer()
      .min(1, 'Minimum is 1')
      .max(signerCount, `Cannot exceed ${signerCount} signer(s)`)
      .required(),
    spendAmount: Yup.string().test(
      'positive',
      'Enter a valid amount',
      (v) => !v || (!isNaN(Number(v)) && Number(v) > 0),
    ),
  });

  const initialValues: PolicyFormValues = {
    threshold: policies?.threshold ?? 1,
    spendAmount: policies?.spendLimit?.amount ?? '',
    spendAsset: policies?.spendLimit?.asset ?? largestBalanceCode(tokens),
  };

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      rehydrate();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        mass: 1,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY, rehydrate]);

  const handleSave = (values: PolicyFormValues) => {
    if (!isMultisig) setThreshold(accountAddress, values.threshold);
    setSpendLimit(
      accountAddress,
      values.spendAmount ? { amount: values.spendAmount, asset: values.spendAsset } : null,
    );
    Toast.show({ type: 'success', text1: 'Policies saved' });
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? theme.colors.cardbg : theme.colors.mainBackground,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
              height: SHEET_HEIGHT,
            },
          ]}
        >
          <BottomSheetHandle />

          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal="m"
            py="m"
            mb="m"
          >
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="h10" color="textPrimary" fontWeight="700">
              Policies
            </Text>
            <Box width={20} />
          </Box>

          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSave}
          >
            {({ values, errors, touched, setFieldValue, handleChange, handleSubmit }) => {
              const decThreshold = () =>
                setFieldValue('threshold', Math.max(1, values.threshold - 1));
              const incThreshold = () =>
                setFieldValue('threshold', Math.min(signerCount, values.threshold + 1));

              return (
                <>
                  <KeyboardAwareScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
                    bottomOffset={16}
                  >
                    {/* Threshold policy */}
                    <Box backgroundColor="bg11" borderRadius={24} padding="l" mb="l">
                      <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
                        Approval Threshold
                      </Text>
                      <Text variant="p7" color="textSecondary" lineHeight={22} mb="l">
                        How many signers must approve a transaction (M of {signerCount}). A higher
                        threshold adds security but needs more devices to sign.
                      </Text>

                      <Box
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="space-between"
                        backgroundColor={isDark ? 'gray900' : 'cardbg'}
                        borderRadius={16}
                        padding="m"
                      >
                        <TouchableOpacity
                          onPress={decThreshold}
                          disabled={isMultisig || values.threshold <= 1}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name="remove-circle-outline"
                            size={32}
                            color={
                              isMultisig || values.threshold <= 1
                                ? theme.colors.btnDisabled
                                : theme.colors.textPrimary
                            }
                          />
                        </TouchableOpacity>

                        <Text variant="h7" color="textPrimary" fontWeight="700">
                          {values.threshold} of {signerCount}
                        </Text>

                        <TouchableOpacity
                          onPress={incThreshold}
                          disabled={isMultisig || values.threshold >= signerCount}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={32}
                            color={
                              isMultisig || values.threshold >= signerCount
                                ? theme.colors.btnDisabled
                                : theme.colors.textPrimary
                            }
                          />
                        </TouchableOpacity>
                      </Box>
                      {touched.threshold && errors.threshold && (
                        <Text color="inputError" variant="p7" mt="xs">
                          {errors.threshold}
                        </Text>
                      )}
                      {isMultisig && (
                        <Text variant="p7" color="textSecondary" mt="s" lineHeight={20}>
                          Changing the threshold on a shared wallet requires approval from the
                          existing signers and isn&apos;t available here yet.
                        </Text>
                      )}
                    </Box>

                    {/* Spending-limit policy */}
                    <Box backgroundColor="bg11" borderRadius={24} padding="l" mb="l">
                      <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
                        Spending Limit
                      </Text>
                      <Text variant="p7" color="textSecondary" lineHeight={22} mb="m">
                        A cap on how much can move from this wallet.
                      </Text>

                      <Box
                        borderRadius={12}
                        padding="m"
                        mb="m"
                        flexDirection="row"
                        alignItems="flex-start"
                        style={{
                          backgroundColor: isDark ? 'rgba(255, 184, 0, 0.1)' : '#FFF4E6',
                        }}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={theme.colors.primary800}
                          style={{ marginRight: 8, marginTop: 1 }}
                        />
                        <Text
                          variant="p7"
                          color="textSecondary"
                          lineHeight={20}
                          style={{ flex: 1 }}
                        >
                          Spending limits aren&apos;t enforced on-chain yet — this is a saved
                          preference. It will be enforced once the limit policy ships.
                        </Text>
                      </Box>

                      <Input
                        placeholder="0.00"
                        value={values.spendAmount}
                        onChangeText={handleChange('spendAmount')}
                        keyboardType="decimal-pad"
                        rightElement={
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setPickerVisible(true)}
                          >
                            <Box
                              flexDirection="row"
                              alignItems="center"
                              backgroundColor={isDark ? 'gray800' : 'cardbg'}
                              paddingHorizontal="m"
                              py="s"
                              borderRadius={12}
                            >
                              <Text variant="p6" color="textPrimary" fontWeight="700">
                                {values.spendAsset}
                              </Text>
                              <Ionicons
                                name="chevron-down"
                                size={14}
                                color={isDark ? '#fff' : '#000'}
                                style={{ marginLeft: 4 }}
                              />
                            </Box>
                          </TouchableOpacity>
                        }
                      />
                      <SessionKeyTokenPicker
                        visible={pickerVisible}
                        tokens={tokens}
                        onClose={() => setPickerVisible(false)}
                        onSelect={(token) => {
                          setFieldValue('spendAsset', token.code);
                          setPickerVisible(false);
                        }}
                      />
                      {touched.spendAmount && errors.spendAmount && (
                        <Text color="inputError" variant="p7" mt="xs">
                          {errors.spendAmount}
                        </Text>
                      )}
                    </Box>
                  </KeyboardAwareScrollView>

                  {/* Footer */}
                  <Box position="absolute" bottom={50} left={16} right={16}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleSubmit()}>
                      <Box
                        height={48}
                        backgroundColor="primary"
                        borderRadius={32}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text variant="h10" color="black" fontWeight="700">
                          Save Policies
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  </Box>
                </>
              );
            }}
          </Formik>
        </Animated.View>
      </View>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default PoliciesSheet;
