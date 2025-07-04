import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import type { AnchorWallet } from '@/types/anchor';
import { PROGRAM_IDS } from './constants';

// ===== PROVIDER UTILITIES =====

/**
 * Create Anchor provider from wallet and connection
 */
export function createProvider(connection: Connection, wallet: AnchorWallet): AnchorProvider {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

/**
 * Get program instance
 */
export function getProgram<T = Program>(
  programId: PublicKey,
  provider: AnchorProvider,
  idl?: any
): T {
  if (!idl) {
    throw new Error('IDL required for program initialization');
  }
  return new Program(idl, programId, provider) as T;
}

// ===== PDA UTILITIES =====

/**
 * Find program derived address with seed
 */
export async function findPDA(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Get rewards pool PDA
 */
export async function getRewardsPoolPDA(dayId: number): Promise<[PublicKey, number]> {
  return findPDA(
    [Buffer.from('reward'), new BN(dayId).toArrayLike(Buffer, 'le', 8)],
    PROGRAM_IDS.FEE_REWARDS
  );
}

/**
 * Get claim record PDA
 */
export async function getClaimRecordPDA(
  rewardsPool: PublicKey,
  user: PublicKey
): Promise<[PublicKey, number]> {
  return findPDA(
    [Buffer.from('claim'), rewardsPool.toBuffer(), user.toBuffer()],
    PROGRAM_IDS.FEE_REWARDS
  );
}

/**
 * Get distribution state PDA
 */
export async function getDistributionStatePDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
  return findPDA(
    [Buffer.from('dist'), tokenMint.toBuffer()],
    PROGRAM_IDS.HOLDER_DISTRIBUTION
  );
}

/**
 * Get LP vault PDA
 */
export async function getLPVaultPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
  return findPDA(
    [Buffer.from('vault'), tokenMint.toBuffer()],
    PROGRAM_IDS.LP_CUSTODY
  );
}

/**
 * Get project tracker PDA
 */
export async function getProjectTrackerPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
  return findPDA(
    [Buffer.from('tracker'), tokenMint.toBuffer()],
    PROGRAM_IDS.STATUS_TRACKER
  );
}

/**
 * Get user claim record PDA for LP distribution
 */
export async function getUserClaimRecordPDA(
  user: PublicKey,
  tokenMint: PublicKey
): Promise<[PublicKey, number]> {
  return findPDA(
    [Buffer.from('claim'), user.toBuffer(), tokenMint.toBuffer()],
    PROGRAM_IDS.HOLDER_DISTRIBUTION
  );
}

// ===== TOKEN UTILITIES =====

/**
 * Get associated token address
 */
export async function getATA(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(mint, owner);
}

/**
 * Create associated token account instruction
 */
export function createATAInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): web3.TransactionInstruction {
  return web3.createAssociatedTokenAccountInstruction(
    payer,
    associatedToken,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

// ===== INSTRUCTION BUILDING =====

/**
 * Build initialize rewards pool instruction accounts
 */
export async function buildInitializeRewardsPoolAccounts(
  dayId: number,
  payer: PublicKey
) {
  const [rewardsPool, bump] = await getRewardsPoolPDA(dayId);
  
  return {
    rewardsPool,
    payer,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Build claim rewards instruction accounts
 */
export async function buildClaimRewardsAccounts(
  dayId: number,
  user: PublicKey
) {
  const [rewardsPool] = await getRewardsPoolPDA(dayId);
  const [claimRecord] = await getClaimRecordPDA(rewardsPool, user);
  
  return {
    rewardsPool,
    user,
    claimRecord,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Build initialize distribution instruction accounts
 */
export async function buildInitializeDistributionAccounts(
  tokenMint: PublicKey,
  payer: PublicKey
) {
  const [distributionState] = await getDistributionStatePDA(tokenMint);
  
  return {
    distributionState,
    tokenMint,
    payer,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Build claim LP instruction accounts
 */
export async function buildClaimLPAccounts(
  tokenMint: PublicKey,
  user: PublicKey,
  vaultTokenAccount: PublicKey
) {
  const [distributionState] = await getDistributionStatePDA(tokenMint);
  const [userClaimRecord] = await getUserClaimRecordPDA(user, tokenMint);
  const userTokenAccount = await getATA(tokenMint, user);
  
  return {
    distributionState,
    tokenMint,
    vaultTokenAccount,
    userTokenAccount,
    userClaimRecord,
    user,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Build initialize LP vault instruction accounts
 */
export async function buildInitializeLPVaultAccounts(
  tokenMint: PublicKey,
  payer: PublicKey
) {
  const [lpVault] = await getLPVaultPDA(tokenMint);
  
  return {
    lpVault,
    tokenMint,
    payer,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Build deposit LP instruction accounts
 */
export async function buildDepositLPAccounts(
  tokenMint: PublicKey,
  from: PublicKey,
  vaultTokenAccount: PublicKey
) {
  const [lpVault] = await getLPVaultPDA(tokenMint);
  const fromTokenAccount = await getATA(tokenMint, from);
  
  return {
    lpVault,
    tokenMint,
    from,
    fromTokenAccount,
    vaultTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  };
}

/**
 * Build liquidate LP instruction accounts
 */
export async function buildLiquidateLPAccounts(
  tokenMint: PublicKey,
  vaultTokenAccount: PublicKey,
  platformVault: PublicKey,
  distributionVault: PublicKey,
  payer: PublicKey
) {
  const [lpVault] = await getLPVaultPDA(tokenMint);
  const [tracker] = await getProjectTrackerPDA(tokenMint);
  const [distributionState] = await getDistributionStatePDA(tokenMint);
  
  return {
    lpVault,
    tokenMint,
    vaultTokenAccount,
    platformVault,
    distributionVault,
    tracker,
    distributionState,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    payer,
    holderProgram: PROGRAM_IDS.HOLDER_DISTRIBUTION,
  };
}

/**
 * Build initialize tracker instruction accounts
 */
export async function buildInitializeTrackerAccounts(
  tokenMint: PublicKey,
  payer: PublicKey
) {
  const [tracker] = await getProjectTrackerPDA(tokenMint);
  
  return {
    tracker,
    tokenMint,
    payer,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Build update stats instruction accounts
 */
export async function buildUpdateStatsAccounts(tokenMint: PublicKey) {
  const [tracker] = await getProjectTrackerPDA(tokenMint);
  
  return {
    tracker,
    tokenMint,
  };
}

// ===== TRANSACTION UTILITIES =====

/**
 * Send and confirm transaction with retries
 */
export async function sendAndConfirmTransactionWithRetry(
  connection: Connection,
  transaction: web3.Transaction,
  signers: web3.Keypair[],
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        signers,
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      );
      return signature;
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Simulate transaction before sending
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: web3.Transaction,
  signers: web3.Keypair[]
): Promise<web3.RpcResponseAndContext<web3.SimulatedTransactionResponse>> {
  // Add recent blockhash if not present
  if (!transaction.recentBlockhash) {
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
  }
  
  // Sign transaction
  transaction.sign(...signers);
  
  return connection.simulateTransaction(transaction);
}

// ===== ACCOUNT FETCHING =====

/**
 * Fetch multiple accounts with error handling
 */
export async function fetchMultipleAccounts(
  connection: Connection,
  addresses: PublicKey[]
): Promise<(web3.AccountInfo<Buffer> | null)[]> {
  try {
    const accounts = await connection.getMultipleAccountsInfo(addresses);
    return accounts;
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    return addresses.map(() => null);
  }
}

/**
 * Fetch program accounts with filters
 */
export async function fetchProgramAccounts(
  connection: Connection,
  programId: PublicKey,
  filters?: web3.GetProgramAccountsFilter[]
): Promise<web3.ProgramAccount[]> {
  try {
    return await connection.getProgramAccounts(programId, {
      filters: filters || [],
      encoding: 'base64',
    });
  } catch (error) {
    console.error('Failed to fetch program accounts:', error);
    return [];
  }
}

// ===== BN UTILITIES =====

/**
 * Convert number to BN with decimals
 */
export function toBN(amount: number, decimals: number = 6): BN {
  return new BN(amount * Math.pow(10, decimals));
}

/**
 * Convert BN to number with decimals
 */
export function fromBN(amount: BN, decimals: number = 6): number {
  return amount.toNumber() / Math.pow(10, decimals);
}

/**
 * Check if BN is zero
 */
export function isZeroBN(amount: BN): boolean {
  return amount.isZero();
}

/**
 * Safe BN arithmetic operations
 */
export const BNMath = {
  add: (a: BN, b: BN): BN => a.add(b),
  sub: (a: BN, b: BN): BN => a.sub(b),
  mul: (a: BN, b: BN): BN => a.mul(b),
  div: (a: BN, b: BN): BN => a.div(b),
  mod: (a: BN, b: BN): BN => a.mod(b),
  max: (a: BN, b: BN): BN => a.gt(b) ? a : b,
  min: (a: BN, b: BN): BN => a.lt(b) ? a : b,
};

// ===== ERROR HANDLING =====

/**
 * Parse Anchor program error
 */
export function parseAnchorError(error: any): { code?: number; message: string } {
  if (error.error && error.error.errorCode) {
    return {
      code: error.error.errorCode.number,
      message: error.error.errorMessage || error.message || 'Program error',
    };
  }
  
  if (error.logs) {
    // Try to extract error from logs
    const errorLog = error.logs.find((log: string) => 
      log.includes('Error:') || log.includes('failed:')
    );
    if (errorLog) {
      return { message: errorLog };
    }
  }
  
  return { message: error.message || 'Unknown program error' };
}

/**
 * Check if error is insufficient funds
 */
export function isInsufficientFundsError(error: any): boolean {
  const message = error.message || '';
  return message.includes('insufficient funds') || 
         message.includes('Attempt to debit an account but found no record of a prior credit');
}

/**
 * Check if error is slippage tolerance exceeded
 */
export function isSlippageError(error: any): boolean {
  const message = error.message || '';
  return message.includes('slippage tolerance exceeded') ||
         message.includes('Price impact too high');
}