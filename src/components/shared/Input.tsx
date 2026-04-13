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
        name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
        size={20}
        color={theme.colors.gray500}
      />
    </TouchableOpacity>
  );

  return (
    <UKInput
      size='large'
      {...props}
      secureTextEntry={secureTextEntry && !isPasswordVisible}
      accessoryRight={secureTextEntry && showPasswordToggle ? renderIcon : props.accessoryRight}
      style={[{ borderRadius: 14 }, props.style]}
      textStyle={{
        color: theme.colors.white
      }}
    />
  );
};

export default Input;
