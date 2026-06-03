/**
 * cosign.ts — REST client for the wallet-backend cosign request queue.
 *
 * Endpoints documented in docs/multisig-build-plan.md Phase B1.
 *
 * Auth model (Phase A1): every endpoint requires a Bearer token but
 * authorization is NOT principal-scoped — anyone with a valid token can
 * read/write requests for any smart account they specify. On-chain
 * __check_auth is the authoritative signer check at submission time.
 *
 * Token shape: accepts either an email-scope or a wallet-scope Latch JWT.
 * Callers (typically a React Query hook) are responsible for fetching a
 * valid token; this module does not refresh on 401.
 */

const API_ROOT = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL ?? '';
const API_BASE = `${API_ROOT}/v1/cosign/requests`;

export interface CosignSignature {
  id: string;
  signerKey: string;
  authEntryXdr: string;
  createdAt: string;
}

export type CosignStatus = 'pending' | 'submitted' | 'cancelled' | 'expired';

export interface CosignRequest {
  id: string;
  smartAccountAddress: string;
  unsignedTxXdr: string;
  network: string;
  threshold: number;
  status: CosignStatus;
  submittedTxHash: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  signatures: CosignSignature[];
  signatureCount: number;
}

export class CosignApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface RawCosignSignature {
  id: string;
  signer_key: string;
  auth_entry_xdr: string;
  created_at: string;
}

interface RawCosignRequest {
  id: string;
  smart_account_address: string;
  unsigned_tx_xdr: string;
  network: string;
  threshold: number;
  status: CosignStatus;
  submitted_tx_hash?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  signatures: RawCosignSignature[];
  signature_count: number;
}

function adaptSignature(s: RawCosignSignature): CosignSignature {
  return {
    id: s.id,
    signerKey: s.signer_key,
    authEntryXdr: s.auth_entry_xdr,
    createdAt: s.created_at,
  };
}

function adaptRequest(r: RawCosignRequest): CosignRequest {
  return {
    id: r.id,
    smartAccountAddress: r.smart_account_address,
    unsignedTxXdr: r.unsigned_tx_xdr,
    network: r.network,
    threshold: r.threshold,
    status: r.status,
    submittedTxHash: r.submitted_tx_hash ?? null,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    signatures: (r.signatures ?? []).map(adaptSignature),
    signatureCount: r.signature_count,
  };
}

// XHR transport — matches the rest of the latch-mobile API surface so
// Soroban/wallet-backend calls go through the platform TLS stack on Android.
function xhr(
  method: string,
  url: string,
  body: string | null,
  token: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(method, url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Accept', 'application/json');
    req.setRequestHeader('Authorization', `Bearer ${token}`);
    req.timeout = 30000;
    req.onload = () => {
      let parsed: any = null;
      if (req.responseText) {
        try {
          parsed = JSON.parse(req.responseText);
        } catch {
          parsed = null;
        }
      }
      resolve({ status: req.status, body: parsed });
    };
    req.onerror = () => reject(new Error('Network error'));
    req.ontimeout = () => reject(new Error('Request timed out'));
    req.send(body);
  });
}

async function call<T>(
  method: string,
  path: string,
  body: object | null,
  token: string,
): Promise<T | null> {
  const { status, body: resp } = await xhr(
    method,
    `${API_BASE}${path}`,
    body ? JSON.stringify(body) : null,
    token,
  );

  if (status >= 200 && status < 300) {
    // 204 No Content has no body — return null.
    if (status === 204) return null;
    return (resp?.data ?? null) as T | null;
  }

  const err = resp?.error;
  throw new CosignApiError(
    err?.message ?? `Request failed (${status})`,
    err?.code ?? `HTTP_${status}`,
    status,
  );
}

export interface CreateCosignRequestParams {
  smartAccountAddress: string;
  unsignedTxXdr: string;
  network: 'testnet' | 'mainnet';
  threshold: number;
}

export async function createCosignRequest(
  token: string,
  params: CreateCosignRequestParams,
): Promise<CosignRequest> {
  const raw = await call<RawCosignRequest>(
    'POST',
    '',
    {
      smart_account_address: params.smartAccountAddress,
      unsigned_tx_xdr: params.unsignedTxXdr,
      network: params.network,
      threshold: params.threshold,
    },
    token,
  );
  if (!raw) throw new CosignApiError('empty create response', 'INTERNAL_ERROR', 500);
  return adaptRequest(raw);
}

/**
 * List non-terminal pending cosign requests for the given smart account.
 * Required to pass the smart_account_address query parameter — see
 * docs/multisig-build-plan.md Phase A1 for the scoping rationale.
 */
export async function listCosignRequests(
  token: string,
  smartAccountAddress: string,
): Promise<CosignRequest[]> {
  const path = `?smart_account_address=${encodeURIComponent(smartAccountAddress)}`;
  const raw = await call<{ requests: RawCosignRequest[] }>('GET', path, null, token);
  return (raw?.requests ?? []).map(adaptRequest);
}

export async function getCosignRequest(token: string, id: string): Promise<CosignRequest> {
  const raw = await call<RawCosignRequest>('GET', `/${id}`, null, token);
  if (!raw) throw new CosignApiError('not found', 'NOT_FOUND', 404);
  return adaptRequest(raw);
}

/**
 * Attach a partial signature to a pending request. The backend de-dupes by
 * `signerKey` so a device replaying its own signature returns
 * `DUPLICATE_SIGNATURE`.
 *
 * @param signerKey     Canonical signer identifier (G-address for Ed25519,
 *                      hex pubkey for External signers). Must match the
 *                      Signer entry the contract will accept on-chain.
 * @param authEntryXdr  Base64-encoded SorobanAuthorizationEntry XDR
 *                      containing this device's AuthPayload for the
 *                      shared invocation.
 */
export async function addCosignSignature(
  token: string,
  id: string,
  signerKey: string,
  authEntryXdr: string,
): Promise<CosignRequest> {
  const raw = await call<RawCosignRequest>(
    'POST',
    `/${id}/signatures`,
    {
      signer_key: signerKey,
      auth_entry_xdr: authEntryXdr,
    },
    token,
  );
  if (!raw) throw new CosignApiError('empty add-signature response', 'INTERNAL_ERROR', 500);
  return adaptRequest(raw);
}

/**
 * Record the on-chain submission tx hash. The request transitions to
 * `submitted` and stops appearing in list responses.
 */
export async function markCosignSubmitted(
  token: string,
  id: string,
  txHash: string,
): Promise<void> {
  await call<void>('POST', `/${id}/submission`, { tx_hash: txHash }, token);
}

/** Cancel a pending request. Idempotent: cancelling twice still returns 204. */
export async function cancelCosignRequest(token: string, id: string): Promise<void> {
  await call<void>('DELETE', `/${id}`, null, token);
}
