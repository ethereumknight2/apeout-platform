import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS } from './programs';

export class PDAHelper {
  // Token Launcher PDAs
  static getTokenLaunchPDA(creator: PublicKey, tokenName: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('token_launch'), creator.toBuffer(), Buffer.from(tokenName)],
      PROGRAM_IDS.tokenLauncher
    );
  }

  // Swap Pool PDAs
  static getSwapPoolPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('swap_pool'), tokenMint.toBuffer()],
      PROGRAM_IDS.apeoutSwap
    );
  }

  static getPoolTokenAccountPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool_token'), tokenMint.toBuffer()],
      PROGRAM_IDS.apeoutSwap
    );
  }

  static getPoolSolAccountPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool_sol'), tokenMint.toBuffer()],
      PROGRAM_IDS.apeoutSwap
    );
  }

  static getLPMintPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), tokenMint.toBuffer()],
      PROGRAM_IDS.apeoutSwap
    );
  }

  // Project Status Tracker PDAs
  static getProjectTrackerPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('tracker'), tokenMint.toBuffer()],
      PROGRAM_IDS.projectStatusTracker
    );
  }

  // LP Custody PDAs
  static getLPVaultPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), tokenMint.toBuffer()],
      PROGRAM_IDS.lpCustody
    );
  }

  // Daily Game PDAs
  static getDailyGameVaultPDA(dayId: number): [PublicKey, number] {
    const dayIdBuffer = Buffer.alloc(8);
    dayIdBuffer.writeBigUInt64LE(BigInt(dayId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from('daily_game'), dayIdBuffer],
      PROGRAM_IDS.dailyGameVault
    );
  }

  // Fee Rewards PDAs
  static getRewardsPoolPDA(dayId: number): [PublicKey, number] {
    const dayIdBuffer = Buffer.alloc(8);
    dayIdBuffer.writeBigUInt64LE(BigInt(dayId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from('reward'), dayIdBuffer],
      PROGRAM_IDS.feeRewards
    );
  }

  // Category Tracker PDAs
  static getDailyTrackerPDA(dayId: number): [PublicKey, number] {
    const dayIdBuffer = Buffer.alloc(8);
    dayIdBuffer.writeBigUInt64LE(BigInt(dayId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from('daily_tracker'), dayIdBuffer],
      PROGRAM_IDS.categoryTracker
    );
  }

  static getTokenVolumeTrackerPDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('token_volume'), tokenMint.toBuffer()],
      PROGRAM_IDS.categoryTracker
    );
  }

  // Holder Distribution PDAs
  static getDistributionStatePDA(tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('dist'), tokenMint.toBuffer()],
      PROGRAM_IDS.holderDistribution
    );
  }

  static getClaimRecordPDA(user: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('claim'), user.toBuffer(), tokenMint.toBuffer()],
      PROGRAM_IDS.holderDistribution
    );
  }
}