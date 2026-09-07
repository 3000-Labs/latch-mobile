import * as SecureStore from 'expo-secure-store';
import { readOnboardingPasskey, requireOnboardingPasskey } from '../onboarding-passkey';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn() }));
jest.mock('@/src/store/wallet', () => ({ SECURE_KEYS: {
  CREDENTIAL_ID: 'id', KEY_DATA_HEX: 'data', PASSKEY_KIND: 'kind',
} }));

describe('onboarding credential reuse', () => {
  function saved(record: Record<string, string>) {
    jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => record[key] ?? null);
  }
  it('allows initial enrollment but blocks deployment without a credential', async () => {
    saved({});
    expect(await readOnboardingPasskey()).toBeNull();
    await expect(requireOnboardingPasskey()).rejects.toThrow('before deploying');
  });
  it.each(['local', ''])('rejects a saved credential with kind %p', async (kind) => {
    saved({ id: 'fixture-id', data: 'fixture-public-data', kind });
    await expect(readOnboardingPasskey()).rejects.toThrow('not a platform passkey');
    await expect(requireOnboardingPasskey()).rejects.toThrow('not a platform passkey');
  });
  it.each(['id', 'data'])('rejects a partial record missing %s', async (missing) => {
    const record: Record<string, string> = { id: 'fixture-id', data: 'fixture-public-data', kind: 'platform' };
    delete record[missing];
    saved(record);
    await expect(requireOnboardingPasskey()).rejects.toThrow('incomplete');
  });
  it('returns the same saved platform signer on repeated deployment reads', async () => {
    saved({ id: 'fixture-id', data: 'fixture-public-data', kind: 'platform' });
    const expected = { credentialId: 'fixture-id', keyDataHex: 'fixture-public-data' };
    expect(await requireOnboardingPasskey()).toEqual(expected);
    expect(await requireOnboardingPasskey()).toEqual(expected);
  });
});
