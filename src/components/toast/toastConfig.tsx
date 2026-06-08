import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import CustomToast, { type ToastVariant } from './CustomToast';

type ToastActionProps = {
  actionLabel?: string;
  onAction?: () => void;
};

function ToastRow(variant: ToastVariant, params: ToastConfigParams<ToastActionProps>) {
  const { text1, text2, props } = params;
  return (
    <CustomToast
      variant={variant}
      text1={text1}
      text2={text2}
      actionLabel={props?.actionLabel}
      onAction={props?.onAction}
    />
  );
}

export const toastConfig: ToastConfig = {
  success: (params) => ToastRow('success', params),
  error: (params) => ToastRow('error', params),
  info: (params) => ToastRow('info', params),
  update: (params) => ToastRow('update', params),
};
