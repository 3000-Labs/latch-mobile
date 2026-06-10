/**
 * cosign.ts — REST client for the wallet-backend cosign request queue, with a
 * client-side E2E encryption boundary (docs/multisig-encrypted-queue.md, step 3).
 *
 * Endpoints: docs/multisig-build-plan.md Phase B1. Auth (Phase A1): every
 * endpoint takes a Bearer token but authorization is NOT principal-scoped —
 * on-chain __check_auth is the authoritative signer check at submit. Token is
 * supplied by the caller; this module does not refresh on 401.
 *
 * ── Encryption boundary ─────────────────────────────────────────────────────
 * `unsigned_tx_xdr` and each `auth_entry_xdr` are AES-256-GCM encrypted under
 * the wallet's WCK (src/lib/cosign-crypto + wallet-cosign-key) before they leave
 * the device, and decrypted on read. The server stores ciphertext only. Callers
 * of this module always see PLAINTEXT base64 XDR — the crypto is internal.
 *
 * `smart_account_address` (the WCK lookup key), `signer_key`, `network`, and
 * `threshold` stay plaintext: all are public on-chain, and signer_key must stay
 * clear so the backend's dedupe constraint works.
 *
 * Transport: raw XHR (Android TLS via OkHttp), matching the rest of the API.
 */

import { decryptForWallet, encryptForWallet } from '@/src/lib/cosign-crypto';
import { getWalletCosignKey } from '@/src/lib/wallet-cosign-key';

const API_ROOT = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL ?? '';
const API_BASE = `${API_ROOT}/v1/cosign/requests`;

export interface CosignSignature {
  id: string;
  signerKey: string;
  /** PLAINTEXT base64 SorobanAuthorizationEntry XDR (decrypted on read). */
  authEntryXdr: string;
  createdAt: string;
}

export type CosignStatus = 'pending' | 'submitted' | 'cancelled' | 'expired';

export interface CosignRequest {
  id: string;
  smartAccountAddress: string;
  /** PLAINTEXT assembled tx base64 XDR (decrypted on read). */
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

// ─── crypto boundary ──────────────────────────────────────────────────────────

async function wckFor(account: string): Promise<Uint8Array> {
  const wck = await getWalletCosignKey(account);
  if (!wck) {
    throw new CosignApiError(
      "This wallet's encryption key isn't on this device. Import it from the wallet-key link first.",
      'WCK_MISSING',
      0,
    );
  }
  return wck;
}

/** Adapt + decrypt a raw request into the plaintext shape callers consume. */
async function decryptRequest(r: RawCosignRequest): Promise<CosignRequest> {
  const account = r.smart_account_address; // plaintext — the WCK lookup key + AAD
  const wck = await wckFor(account);
  return {
    id: r.id,
    smartAccountAddress: account,
    unsignedTxXdr: decryptForWallet(wck, r.unsigned_tx_xdr, account),
    network: r.network,
    threshold: r.threshold,
    status: r.status,
    submittedTxHash: r.submitted_tx_hash ?? null,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    signatures: (r.signatures ?? []).map((s) => ({
      id: s.id,
      signerKey: s.signer_key,
      authEntryXdr: decryptForWallet(wck, s.auth_entry_xdr, account),
      createdAt: s.created_at,
    })),
    signatureCount: r.signature_count,
  };
}

// ─── transport ────────────────────────────────────────────────────────────────

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

// ─── endpoints ────────────────────────────────────────────────────────────────

export interface CreateCosignRequestParams {
  smartAccountAddress: string;
  /** PLAINTEXT assembled tx base64 XDR — encrypted here before it's sent. */
  unsignedTxXdr: string;
  network: 'testnet' | 'mainnet';
  threshold: number;
}

export async function createCosignRequest(
  token: string,
  params: CreateCosignRequestParams,
): Promise<CosignRequest> {
  const wck = await wckFor(params.smartAccountAddress);
  const raw = await call<RawCosignRequest>(
    'POST',
    '',
    {
      smart_account_address: params.smartAccountAddress,
      unsigned_tx_xdr: encryptForWallet(wck, params.unsignedTxXdr, params.smartAccountAddress),
      network: params.network,
      threshold: params.threshold,
    },
    token,
  );
  if (!raw) throw new CosignApiError('empty create response', 'INTERNAL_ERROR', 500);
  return decryptRequest(raw);
}

/**
 * List non-terminal cosign requests for a smart account. The
 * `smart_account_address` query param is required (Phase A1 scoping).
 */
export async function listCosignRequests(
  token: string,
  smartAccountAddress: string,
): Promise<CosignRequest[]> {
  const path = `?smart_account_address=${encodeURIComponent(smartAccountAddress)}`;
  const raw = await call<{ requests: RawCosignRequest[] }>('GET', path, null, token);
  return Promise.all((raw?.requests ?? []).map(decryptRequest));
}

export async function getCosignRequest(token: string, id: string): Promise<CosignRequest> {
  const raw = await call<RawCosignRequest>('GET', `/${id}`, null, token);
  if (!raw) throw new CosignApiError('not found', 'NOT_FOUND', 404);
  return decryptRequest(raw);
}

/**
 * Attach a partial signature. `account` is needed to locate the WCK that
 * encrypts `authEntryXdr` and must equal the request's smart-account address.
 * The backend de-dupes by `signerKey` (kept plaintext).
 *
 * @param signerKey     Canonical signer id (hex device pubkey) — must match the
 *                      Signer the contract accepts on-chain.
 * @param authEntryXdr  PLAINTEXT base64 SorobanAuthorizationEntry XDR; encrypted
 *                      here before it's sent.
 */
export async function addCosignSignature(
  token: string,
  id: string,
  account: string,
  signerKey: string,
  authEntryXdr: string,
): Promise<CosignRequest> {
  const wck = await wckFor(account);
  const raw = await call<RawCosignRequest>(
    'POST',
    `/${id}/signatures`,
    {
      signer_key: signerKey,
      auth_entry_xdr: encryptForWallet(wck, authEntryXdr, account),
    },
    token,
  );
  if (!raw) throw new CosignApiError('empty add-signature response', 'INTERNAL_ERROR', 500);
  return decryptRequest(raw);
}

/** Record the on-chain submission tx hash; request transitions to `submitted`. */
export async function markCosignSubmitted(token: string, id: string, txHash: string): Promise<void> {
  await call<void>('POST', `/${id}/submission`, { tx_hash: txHash }, token);
}

/** Cancel a pending request. Idempotent (cancelling twice still returns 204). */
export async function cancelCosignRequest(token: string, id: string): Promise<void> {
  await call<void>('DELETE', `/${id}`, null, token);
}
