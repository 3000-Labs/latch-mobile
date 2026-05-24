import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface AddMemberButtonProps {
  onPress: () => void;
}

const AddMemberButton: React.FC<AddMemberButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        bg={'bg11'}
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#3A3A3A',
          borderRadius: 16,
          paddingVertical: 24,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        }}
      >
        <Text color="textPrimary" style={{ fontSize: 18, marginRight: 8 }}>
          +
        </Text>
        <Text variant="h10" color="textPrimary">
          Add Member
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

export default AddMemberButton;
