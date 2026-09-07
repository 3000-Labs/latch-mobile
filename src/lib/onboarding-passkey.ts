import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from '@/src/store/wallet';

/** Read the onboarding signer without creating or replacing any credential. */
export async function readOnboardingPasskey() {
  const [credentialId, keyDataHex, kind] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.CREDENTIAL_ID),
    SecureStore.getItemAsync(SECURE_KEYS.KEY_DATA_HEX),
    SecureStore.getItemAsync(SECURE_KEYS.PASSKEY_KIND),
  ]);
  if (!credentialId && !keyDataHex && !kind) return null;
  if (kind !== 'platform') {
    throw new Error('The saved credential is not a platform passkey. Setup cannot continue with this credential.');
  }
  if (!credentialId || !keyDataHex) {
    throw new Error('Passkey setup is incomplete. Your saved credential has not been replaced.');
  }
  return { credentialId, keyDataHex };
}

export async function requireOnboardingPasskey() {
  const credential = await readOnboardingPasskey();
  if (!credential) throw new Error('Create your platform passkey in wallet setup before deploying.');
  return credential;
}
