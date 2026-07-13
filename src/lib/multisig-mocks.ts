/**
 * multisig-mocks.ts — fixture factories for the multisig UI dev sandbox.
 *
 * Returns objects shaped like the wire types from src/api/multisig.ts so
 * the components rendered against them are exactly what'll consume real
 * API responses once the backend is wired through.
 *
 * Used by app/dev/multisig-states.tsx. Not imported from production code.
 */

import type { MultisigInvite, MultisigWallet } from '@/src/api/multisig';

const SAMPLE_CREATOR_C = 'CALPHACALPHACALPHACALPHACALPHACALPHACALPHACALPHACAL00000';
const SAMPLE_MEMBER_C1 = 'CMEMBER1MEMBER1MEMBER1MEMBER1MEMBER1MEMBER1MEMBER1MEMBE0';
const SAMPLE_MEMBER_C2 = 'CMEMBER2MEMBER2MEMBER2MEMBER2MEMBER2MEMBER2MEMBER2MEMBE0';
const SAMPLE_DEPLOYED_C = 'CGROUP000000GROUP000000GROUP000000GROUP000000GROUP00000';

const SAMPLE_TX_HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

const NOW = '2026-06-06T12:00:00Z';
const FUTURE = '2026-06-13T12:00:00Z';

function invite(overrides: Partial<MultisigInvite>): MultisigInvite {
  return {
    id: 'invite-id',
    inviteeEmail: null,
    boundCAddress: null,
    state: 'pending',
    expiresAt: FUTURE,
    respondedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

function wallet(overrides: Partial<MultisigWallet>): MultisigWallet {
  return {
    id: 'wallet-id',
    name: 'Treasury',
    threshold: 2,
    state: 'pending_invites',
    cAddress: null,
    creatorCAddress: SAMPLE_CREATOR_C,
    creatorUserId: 'creator-user-id',
    deployTxHash: null,
    expiresAt: FUTURE,
    cancelledReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    invites: [],
    ...overrides,
  };
}

export const mockPendingInvitesWallet = (): MultisigWallet =>
  wallet({
    id: 'mock-pending-1',
    name: 'Family Wallet',
    state: 'pending_invites',
    invites: [
      invite({
        id: 'inv-paste-1',
        boundCAddress: SAMPLE_MEMBER_C1,
        state: 'accepted',
        respondedAt: NOW,
      }),
      invite({
        id: 'inv-email-1',
        inviteeEmail: 'sarah@example.com',
        state: 'pending',
      }),
      invite({
        id: 'inv-email-2',
        inviteeEmail: 'james@example.com',
        state: 'pending',
      }),
    ],
  });

export const mockReadyToDeployWallet = (): MultisigWallet =>
  wallet({
    id: 'mock-ready-1',
    name: 'Treasury',
    state: 'ready_to_deploy',
    threshold: 3,
    invites: [
      invite({
        id: 'inv-1',
        boundCAddress: SAMPLE_MEMBER_C1,
        state: 'accepted',
        respondedAt: NOW,
      }),
      invite({
        id: 'inv-2',
        inviteeEmail: 'sarah@example.com',
        boundCAddress: SAMPLE_MEMBER_C2,
        state: 'accepted',
        respondedAt: NOW,
      }),
      invite({
        id: 'inv-3',
        inviteeEmail: 'james@example.com',
        boundCAddress: SAMPLE_DEPLOYED_C,
        state: 'accepted',
        respondedAt: NOW,
      }),
    ],
  });

export const mockDeployedWallet = (): MultisigWallet =>
  wallet({
    id: 'mock-deployed-1',
    name: 'Treasury',
    state: 'deployed',
    threshold: 2,
    cAddress: SAMPLE_DEPLOYED_C,
    deployTxHash: SAMPLE_TX_HASH,
    invites: [
      invite({
        id: 'inv-1',
        boundCAddress: SAMPLE_MEMBER_C1,
        state: 'accepted',
        respondedAt: NOW,
      }),
      invite({
        id: 'inv-2',
        inviteeEmail: 'sarah@example.com',
        boundCAddress: SAMPLE_MEMBER_C2,
        state: 'accepted',
        respondedAt: NOW,
      }),
    ],
  });

export const mockCancelledWallet = (): MultisigWallet =>
  wallet({
    id: 'mock-cancelled-1',
    name: 'Team Pool',
    state: 'cancelled',
    cancelledReason: 'Invite declined by member',
    invites: [
      invite({
        id: 'inv-1',
        boundCAddress: SAMPLE_MEMBER_C1,
        state: 'accepted',
        respondedAt: NOW,
      }),
      invite({
        id: 'inv-2',
        inviteeEmail: 'sarah@example.com',
        state: 'declined',
        respondedAt: NOW,
      }),
    ],
  });

// A pending invitation as seen from the *invitee's* side. The shape is
// the parent wallet — the InvitationCard cherry-picks the invite that
// belongs to the caller.
export const mockInvitationForMe = (): { wallet: MultisigWallet; myInviteId: string } => {
  const w = wallet({
    id: 'mock-invite-1',
    name: 'Group Wallet',
    state: 'pending_invites',
    threshold: 2,
    invites: [
      invite({
        id: 'inv-paste-1',
        boundCAddress: SAMPLE_MEMBER_C1,
        state: 'accepted',
        respondedAt: NOW,
      }),
      invite({
        id: 'inv-me',
        inviteeEmail: 'me@example.com',
        state: 'pending',
      }),
    ],
  });
  return { wallet: w, myInviteId: 'inv-me' };
};
