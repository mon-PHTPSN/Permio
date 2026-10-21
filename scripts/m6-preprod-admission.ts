import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { inspect } from 'node:util';
import { parse } from 'dotenv';
import { PreprodConnectionProfile, PREPROD_GENESIS_HASH } from '../packages/midnight-authorization/src/preprod-profile.ts';
import type { PreprodCheckpointSecret, PreprodCheckpointSnapshots } from '../packages/midnight-authorization/src/preprod-checkpoint.ts';
import type { MidnightProvider } from '@midnight-ntwrk/midnight-js-types';

export { PREPROD_GENESIS_HASH };
export const PREPROD_ADMISSION_TIMEOUT_MS = 3_600_000;
export type PreprodAdmissionScope = 'check' | 'deployment' | 'governance' | 'allocation' | 'credential-binding' | 'slot-state';
export interface PreprodAdmissionArguments {
  scope: PreprodAdmissionScope; config: string; checkpoint: string;
  accountIndexVariable: string; mnemonicVariable: string; proofServer: string;
}
const failure = (): never => { throw Error('Preprod admission: invalid explicit controls or private local inputs; details withheld'); };

/** Preserve only public candidate IDs before sending, so uncertain outcomes can be reconciled. */
export function observePreprodSubmissions(provider: MidnightProvider,
  emit: (event: string, data: Readonly<Record<string, unknown>>) => void): MidnightProvider {
  return { async submitTx(transaction) {
    const transactionIds = transaction.identifiers();
    if (!Array.isArray(transactionIds) || transactionIds.length < 1 || transactionIds.length > 64 ||
      !transactionIds.every(id => typeof id === 'string' && /^(?:00|01)[0-9a-f]{64}$/i.test(id))) throw Error('invalid-public-transaction-identifiers');
    emit('preprod-transaction-submission-attempt', { transactionIds: [...transactionIds], transactionBytesLogged: false,
      submissionOrFinalityAsserted: false });
    const transactionId = await provider.submitTx(transaction);
    if (typeof transactionId !== 'string' || !/^(?:00|01)[0-9a-f]{64}$/i.test(transactionId) ||
      !transactionIds.includes(transactionId)) throw Error('unexpected-submission-result-reconcile-before-retry');
    emit('preprod-transaction-submission-returned', { transactionId, finalityAsserted: false });
    return transactionId;
  } };
}

/** No positional secrets, implicit Local Dev fallback or arbitrary proof destination. */
export function parsePreprodAdmissionArguments(args: readonly string[]): PreprodAdmissionArguments {
  const modes = new Map<string, PreprodAdmissionScope>([['--check', 'check'], ['--submit-deployment', 'deployment'],
    ['--submit-governance', 'governance'], ['--submit-allocation', 'allocation'],
    ['--submit-credential-binding', 'credential-binding'], ['--submit-slot-state', 'slot-state']]);
  const allowed = ['--local-config', '--checkpoint', '--account-index-var', '--mnemonic-var', '--proof-server'];
  if (args.length !== 12 || args[0] !== '--preprod' || !modes.has(args[1]!)) failure();
  const options = new Map<string, string>();
  for (let index = 2; index < args.length; index += 2) {
    const key = args[index]!, value = args[index + 1]!;
    if (!allowed.includes(key) || options.has(key) || !value || value.startsWith('--')) failure();
    options.set(key, value);
  }
  const get = (key: string) => options.get(key) ?? failure();
  for (const key of ['--account-index-var', '--mnemonic-var']) if (!/^[A-Z][A-Z0-9_]{1,80}$/.test(get(key))) failure();
  // Validate the same allowlist without obtaining any real provider credential.
  new PreprodConnectionProfile('nightpreprod_synthetic_validation_only', get('--proof-server'));
  return { scope: modes.get(args[1]!)!, config: path.resolve(get('--local-config')),
    checkpoint: path.resolve(get('--checkpoint')), accountIndexVariable: get('--account-index-var'),
    mnemonicVariable: get('--mnemonic-var'), proofServer: get('--proof-server') };
}

async function privateFile(file: string, gitDirectory: string, maximum: number): Promise<string> {
  execFileSync('git', ['check-ignore', '--quiet', '--', file], { cwd: gitDirectory, stdio: 'ignore', timeout: 10_000 });
  try { execFileSync('git', ['ls-files', '--error-unmatch', '--', file], { cwd: gitDirectory, stdio: 'ignore', timeout: 10_000 }); }
  catch (error) { if ((error as { status?: number }).status !== 1) failure(); else {
    const meta = await lstat(file);
    if (!meta.isFile() || meta.isSymbolicLink() || meta.size < 1 || meta.size > maximum) failure();
    return readFile(file, 'utf8');
  } }
  return failure();
}

/** Read the credential only for the explicitly intended provider, never a wallet in check mode. */
export async function loadPreprodAdmissionProfile(options: PreprodAdmissionArguments): Promise<PreprodConnectionProfile> {
  try {
    const config = parse(await privateFile(options.config, path.dirname(options.config), 1024 ** 2));
    return new PreprodConnectionProfile(config.BLOCKFROST_PROJECT_ID!, options.proofServer);
  } catch { return failure(); }
}

/** The returned private data is for the owned SDK worker only; safe default inspection omits it. */
export async function loadPreprodAdmissionWallet(options: PreprodAdmissionArguments) {
  try {
    if (options.scope === 'check') failure();
    const config = parse(await privateFile(options.config, path.dirname(options.config), 1024 ** 2));
    const index = config[options.accountIndexVariable], value = config[options.mnemonicVariable];
    if (typeof index !== 'string' || !/^(0|[1-9][0-9]*)$/.test(index) || Number(index) > 0x7fffffff || !value?.trim()) failure();
    const load = async () => Object.fromEntries(await Promise.all(['shielded', 'unshielded', 'dust'].map(async key =>
      [key, await privateFile(path.join(options.checkpoint, `${key}.json`), path.dirname(options.config), 32 * 1024 ** 2)]))) as PreprodCheckpointSnapshots;
    const snapshots = await load();
    const hashes = (input: PreprodCheckpointSnapshots) => Object.values(input).map(text => createHash('sha256').update(text).digest('hex'));
    const before = hashes(snapshots);
    const safe = () => ({ privateWalletInputsLoaded: true, componentCount: 3, secretValuesOmitted: true });
    return Object.freeze({ secret: { kind: 'mnemonic', value, accountIndex: Number(index) } as PreprodCheckpointSecret,
      snapshots, async verifyUnchanged() {
        try { if (JSON.stringify(before) !== JSON.stringify(hashes(await load()))) failure(); }
        catch { failure(); }
      }, toJSON: safe, [inspect.custom]: safe });
  } catch { return failure(); }
}
