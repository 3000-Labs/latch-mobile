import { Ionicons } from '@expo/vector-icons';
import { Input as UKInput, InputProps as UKInputProps } from '@ui-kitten/components';
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import theme from '../../theme/theme';

interface Props extends UKInputProps {
  showPasswordToggle?: boolean;
}

const Input: React.FC<Props> = ({ showPasswordToggle, secureTextEntry, ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const toggleVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const renderIcon = (iconProps: any) => (
    <TouchableOpacity onPress={toggleVisibility} style={{ paddingHorizontal: 8 }}>
      <Ionicons
        name={isPasswordVisible ? 'lock-open-outline' : 'lock-closed-outline'}
        size={20}
        color={theme.colors.gray500}
      />
    </TouchableOpacity>
  );

  const errorBorderColor = props.status === 'danger' ? '#EA471E' : undefined;

  return (
    <UKInput
      size="large"
      {...props}
      secureTextEntry={secureTextEntry && !isPasswordVisible}
      accessoryRight={secureTextEntry ? renderIcon : props.accessoryRight}
      style={[{ borderRadius: 14, borderColor: errorBorderColor }, props.style]}
      textStyle={{
        color: theme.colors.white,
      }}
    />
  );
};

export default Input;
