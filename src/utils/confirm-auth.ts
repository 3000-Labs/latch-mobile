import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Prompt the user to confirm an action with biometrics or their device passcode.
 * Returns true if authenticated, false if cancelled or failed.
 */
export async function confirmAuth(promptMessage: string): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    // Device has no biometrics enrolled — skip the prompt and allow.
    // The app already requires a device passcode at setup time.
    return true;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    // disableDeviceFallback: false — if biometrics fail the OS shows the
    // device PIN/passcode prompt automatically.
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });

  return result.success;
}
