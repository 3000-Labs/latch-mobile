/**
 * latch://cosign?d=<base64url packet> — deep-link entry for a shared-wallet
 * approval packet shared by another member ("Share with next signer").
 *
 * Thin redirect: forwards the payload into /cosign-review, which decodes it,
 * imports the packet, and shows the approve/submit surface. Kept separate so
 * the public deep-link path stays the documented `latch://cosign`
 * (docs/multisig-p2p-cosign.md) while the implementation lives in cosign-review.
 */

import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CosignDeepLink() {
  const { d, data } = useLocalSearchParams<{ d?: string; data?: string }>();
  const params = d ? { d } : data ? { data } : {};
  return <Redirect href={{ pathname: '/cosign-review', params }} />;
}
