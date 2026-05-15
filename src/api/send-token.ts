import {
  Account,
  Address,
  Contract,
  hash,
  Keypair,
  nativeToScVal,
  rpc,
  StrKey,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { sorobanCall, toBase64, txToBase64 } from './smart-account';

export interface SendTokenParams {
  sacContractId: string;
  fromCAddress: string;
  toAddress: string;
  amountHuman: string;
  decimals: number;
  userKeypair: Keypair;
  rpcUrl: string;
  networkPassphrase: string;
  horizonUrl: string;
}

function signAuthEntry(
  authBase64: string,
  fromCAddress: string,
  expirationLedger: number,
  networkPassphrase: string,
  userKeypair: Keypair,
): string {
  const entry = xdr.SorobanAuthorizationEntry.fromXDR(authBase64, 'base64');
  const creds = entry.credentials();

  if (creds.switch().name !== 'sorobanCredentialsAddress') return authBase64;

  const addrCreds = creds.address();
  let credAddress: string;
  try {
    credAddress = Address.fromScAddress(addrCreds.address()).toString();
  } catch {
    return authBase64;
  }
  if (credAddress !== fromCAddress) return authBase64;

  addrCreds.signatureExpirationLedger(expirationLedger);

  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId: hash(Buffer.from(networkPassphrase)),
      nonce: addrCreds.nonce(),
      signatureExpirationLedger: expirationLedger,
      invocation: entry.rootInvocation(),
    }),
  );

  const sig = userKeypair.sign(hash(preimage.toXDR()));

  // Signature format matches the factory smart account's __check_auth expectation:
  // Vec<{ public_key: BytesN<32>, signature: BytesN<64> }>
  addrCreds.signature(
    xdr.ScVal.scvVec([
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('public_key'),
          val: xdr.ScVal.scvBytes(Buffer.from(userKeypair.rawPublicKey())),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('signature'),
          val: xdr.ScVal.scvBytes(Buffer.from(sig)),
        }),
      ]),
    ]),
  );

  return toBase64(new Uint8Array(entry.toXDR()));
}

export async function sendToken(
  params: SendTokenParams,
): Promise<{ success: boolean; hash?: string; error?: string }> {
  const {
    sacContractId,
    fromCAddress,
    toAddress,
    amountHuman,
    decimals,
    userKeypair,
    rpcUrl,
    networkPassphrase,
    horizonUrl,
  } = params;

  try {
    const bundlerSecret = process.env.EXPO_PUBLIC_BUNDLER_SECRET;
    if (!bundlerSecret) throw new Error('Missing EXPO_PUBLIC_BUNDLER_SECRET');

    if (
      !StrKey.isValidEd25519PublicKey(toAddress) &&
      !StrKey.isValidContract(toAddress)
    ) {
      throw new Error('Invalid recipient address');
    }

    const bundlerKeypair = Keypair.fromSecret(bundlerSecret);

    // 1. Fetch bundler account sequence from Horizon (bundler is the tx fee source)
    const accountResp = await fetch(`${horizonUrl}/accounts/${bundlerKeypair.publicKey()}`);
    if (!accountResp.ok) throw new Error(`Bundler account not found: HTTP ${accountResp.status}`);
    const accountData = await accountResp.json();
    const bundlerAccount = new Account(bundlerKeypair.publicKey(), accountData.sequence);

    // 2. Convert human-readable amount to i128 base units
    const amountRaw = BigInt(Math.round(parseFloat(amountHuman) * 10 ** decimals));

    // 3. Build the SAC transfer transaction
    const contract = new Contract(sacContractId);
    const tx = new TransactionBuilder(bundlerAccount, {
      fee: '200000',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'transfer',
          new Address(fromCAddress).toScVal(),
          new Address(toAddress).toScVal(),
          nativeToScVal(amountRaw, { type: 'i128' }),
        ),
      )
      .setTimeout(300)
      .build();

    // 4. Simulate to get auth entries + resource fees
    const rawSim = await sorobanCall(rpcUrl, 'simulateTransaction', {
      transaction: txToBase64(tx),
    });

    if (rawSim.error) {
      const msg = String(rawSim.error);
      if (msg.includes('Error(Contract, #10)') || msg.toLowerCase().includes('resulting balance')) {
        throw new Error('Insufficient balance — please try a smaller amount.');
      }
      throw new Error(`Simulation failed: ${msg}`);
    }

    if (typeof rawSim.transactionData !== 'string') {
      throw new Error('Token contract does not exist on this network.');
    }

    // 5. Sign auth entries for the smart account (C-address must authorize the transfer)
    const expirationLedger: number = rawSim.latestLedger + 100;
    const rawAuth: string[] = rawSim.results?.[0]?.auth ?? [];
    const signedAuth = rawAuth.map((authBase64: string) =>
      signAuthEntry(authBase64, fromCAddress, expirationLedger, networkPassphrase, userKeypair),
    );

    // 6. Inject signed auth entries and assemble with resource fees
    if (rawSim.results?.[0]) {
      rawSim.results[0].auth = signedAuth;
    }
    const assembled = rpc.assembleTransaction(tx, rawSim).build();

    // 7. Bundler signs the transaction envelope (fee payer)
    assembled.sign(bundlerKeypair);

    // 8. Submit
    const sendRaw = await sorobanCall(rpcUrl, 'sendTransaction', {
      transaction: txToBase64(assembled),
    });

    if (sendRaw.status === 'ERROR') {
      throw new Error(`Transaction rejected: ${sendRaw.errorResultXdr ?? JSON.stringify(sendRaw)}`);
    }

    const txHash: string = sendRaw.hash;

    // 9. Poll until settled
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await sorobanCall(rpcUrl, 'getTransaction', { hash: txHash });
      if (poll.status === 'SUCCESS') return { success: true, hash: txHash };
      if (poll.status === 'FAILED') {
        return { success: false, error: `Transaction failed on-chain.` };
      }
    }

    return { success: false, error: 'Transaction timed out after 30 seconds.' };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}
