import { hash, xdr } from "@stellar/stellar-sdk";

/**
 * SHA-256 of ENVELOPE_TYPE_SOROBAN_AUTHORIZATION preimage.
 * Must match stellar-base `authorizeEntry` (see @stellar/stellar-base/lib/auth.js).
 */
export function hashSorobanAuthPayload(
  authEntry: xdr.SorobanAuthorizationEntry,
  networkPassphrase: string
): Buffer {
  const clone = xdr.SorobanAuthorizationEntry.fromXDR(authEntry.toXDR());
  const addrAuth = clone.credentials().address();
  const networkId = hash(Buffer.from(networkPassphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId,
      nonce: addrAuth.nonce(),
      invocation: clone.rootInvocation(),
      signatureExpirationLedger: addrAuth.signatureExpirationLedger(),
    })
  );
  return hash(preimage.toXDR());
}

/**
 * Merge multiple SorobanAuthorizationEntry values for the SAME context
 * (same root invocation, nonce, expiration, and credentials address) into
 * one entry whose AuthPayload carries all signatures.
 *
 * Per the OZ stellar-accounts contract (see
 * reference/latch-contracts/RESEARCH_LOG.md "AuthPayload — The Current
 * Signing Standard"), the signature field of each entry is an AuthPayload
 * struct:
 *
 *   AuthPayload {
 *     context_rule_ids: [u32],
 *     signers: Map<Signer, bytes>,
 *   }
 *
 * Aggregation rules:
 *   - All inputs must share the same `context_rule_ids` vector.
 *   - The `signers` maps are unioned. Duplicate signer keys are an error
 *     (each device signs at most once per context).
 *   - The output map is sorted by canonical ScVal byte ordering, which is
 *     what the Soroban runtime requires.
 *
 * Throws if entries are incompatible. Returns a fresh entry; inputs are
 * not mutated.
 */
export function aggregateAuthEntries(
  entries: xdr.SorobanAuthorizationEntry[],
): xdr.SorobanAuthorizationEntry {
  if (entries.length === 0) {
    throw new Error('aggregateAuthEntries: at least one entry is required');
  }
  if (entries.length === 1) {
    // Defensive copy so callers can't mutate ours.
    return xdr.SorobanAuthorizationEntry.fromXDR(entries[0].toXDR());
  }

  // Clone the first entry as the basis; we'll overwrite its signature.
  const base = xdr.SorobanAuthorizationEntry.fromXDR(entries[0].toXDR());
  const baseCreds = base.credentials().address();
  const baseRoot = base.rootInvocation();
  const baseNonceBytes = base.credentials().address().nonce().toString();
  const baseExpiration = baseCreds.signatureExpirationLedger();
  const baseAddressXdr = baseCreds.address().toXDR().toString('base64');
  const baseRootXdr = baseRoot.toXDR().toString('base64');

  const allPairs: { keyXdr: Buffer; entry: xdr.ScMapEntry }[] = [];
  let canonicalRuleIds: xdr.ScVal | undefined;
  const seenSignerKeys = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.credentials().switch().name !== 'sorobanCredentialsAddress') {
      throw new Error(
        `aggregateAuthEntries: entry ${i} has non-address credentials (got ${entry.credentials().switch().name})`,
      );
    }
    const creds = entry.credentials().address();
    if (creds.address().toXDR().toString('base64') !== baseAddressXdr) {
      throw new Error(`aggregateAuthEntries: entry ${i} credentials address differs`);
    }
    if (creds.nonce().toString() !== baseNonceBytes) {
      throw new Error(`aggregateAuthEntries: entry ${i} nonce differs`);
    }
    if (creds.signatureExpirationLedger() !== baseExpiration) {
      throw new Error(`aggregateAuthEntries: entry ${i} signatureExpirationLedger differs`);
    }
    if (entry.rootInvocation().toXDR().toString('base64') !== baseRootXdr) {
      throw new Error(`aggregateAuthEntries: entry ${i} rootInvocation differs`);
    }

    const { contextRuleIds, signerEntries } = parseAuthPayload(creds.signature(), i);

    if (canonicalRuleIds === undefined) {
      canonicalRuleIds = contextRuleIds;
    } else if (
      canonicalRuleIds.toXDR().toString('base64') !== contextRuleIds.toXDR().toString('base64')
    ) {
      throw new Error(`aggregateAuthEntries: entry ${i} context_rule_ids differs`);
    }

    for (const mapEntry of signerEntries) {
      const keyXdr = mapEntry.key().toXDR();
      const keyB64 = keyXdr.toString('base64');
      if (seenSignerKeys.has(keyB64)) {
        throw new Error(
          `aggregateAuthEntries: entry ${i} duplicates a signer already present in an earlier entry`,
        );
      }
      seenSignerKeys.add(keyB64);
      allPairs.push({ keyXdr, entry: mapEntry });
    }
  }

  // Soroban Map ScVal keys must be in canonical byte order.
  allPairs.sort((a, b) => Buffer.compare(a.keyXdr, b.keyXdr));

  const mergedSignersMap = xdr.ScVal.scvMap(allPairs.map((p) => p.entry));

  // Rebuild the AuthPayload struct in alphabetical key order
  // (context_rule_ids < signers).
  const mergedAuthPayload = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('context_rule_ids'),
      val: canonicalRuleIds!,
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signers'),
      val: mergedSignersMap,
    }),
  ]);

  base.credentials().address().signature(mergedAuthPayload);
  return base;
}

interface ParsedAuthPayload {
  contextRuleIds: xdr.ScVal;
  signerEntries: xdr.ScMapEntry[];
}

// stellar-sdk's ScSymbol is a Buffer, and Buffer.prototype.toString() is broken
// under the RN/Hermes polyfill (returns comma-joined decimal bytes instead of
// the string). Symbol names are ASCII, so decode via charCodes — same flaw as
// the toXDR('base64') / functionName() reads fixed elsewhere.
function scSymbolName(sym: unknown): string {
  if (typeof sym === 'string') return sym;
  const bytes = sym instanceof Uint8Array ? sym : new Uint8Array(sym as ArrayBufferLike);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function parseAuthPayload(signature: xdr.ScVal, entryIndex: number): ParsedAuthPayload {
  if (signature.switch().name !== 'scvMap') {
    throw new Error(
      `aggregateAuthEntries: entry ${entryIndex} signature is not an ScMap (AuthPayload struct expected)`,
    );
  }
  const entries = signature.map();
  if (!entries) {
    throw new Error(`aggregateAuthEntries: entry ${entryIndex} signature map is empty`);
  }

  let contextRuleIds: xdr.ScVal | undefined;
  let signersMap: xdr.ScVal | undefined;
  for (const e of entries) {
    const key = e.key();
    if (key.switch().name !== 'scvSymbol') continue;
    const sym = scSymbolName(key.sym());
    if (sym === 'context_rule_ids') contextRuleIds = e.val();
    else if (sym === 'signers') signersMap = e.val();
  }
  if (!contextRuleIds) {
    throw new Error(`aggregateAuthEntries: entry ${entryIndex} missing context_rule_ids`);
  }
  if (!signersMap || signersMap.switch().name !== 'scvMap') {
    throw new Error(`aggregateAuthEntries: entry ${entryIndex} missing or malformed signers map`);
  }
  const signerEntries = signersMap.map();
  if (!signerEntries) {
    throw new Error(`aggregateAuthEntries: entry ${entryIndex} signers map is empty`);
  }
  return { contextRuleIds, signerEntries };
}
