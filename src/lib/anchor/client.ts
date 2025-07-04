import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  AnchorProvider,
  BN,
  Program,
  web3
} from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';

export class ApeOutClient {
  private connection: Connection;
  private provider: AnchorProvider;
  
  // Program IDs
  readonly feeRewardsProgramId: PublicKey;
  readonly holderDistributionProgramId: PublicKey;
  readonly lpCustodyProgramId: PublicKey;
  readonly projectStatusTrackerProgramId: PublicKey;

  constructor(
    connection: Connection,
    wallet: WalletContextState,
    programIds: {
      feeRewards: string;
      holderDistribution: string;
      lpCustody: string;
      projectStatusTracker: string;
    }
  ) {
    this.connection = connection;
    this.provider = new AnchorProvider(connection, wallet as any, {
      commitment: 'confirmed'
    });
    
    this.feeRewardsProgramId = new PublicKey(programIds.feeRewards);
    this.holderDistributionProgramId = new PublicKey(programIds.holderDistribution);
    this.lpCustodyProgramId = new PublicKey(programIds.lpCustody);
    this.projectStatusTrackerProgramId = new PublicKey(programIds.projectStatusTracker);
  }

  // Helper to derive PDAs
  async deriveTrackerPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('tracker'), tokenMint.toBuffer()],
      this.projectStatusTrackerProgramId
    );
  }

  async deriveLPVaultPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), tokenMint.toBuffer()],
      this.lpCustodyProgramId
    );
  }

  async deriveRewardsPoolPDA(dayId: number): Promise<[PublicKey, number]> {
    const dayIdBuffer = Buffer.alloc(8);
    dayIdBuffer.writeBigUInt64LE(BigInt(dayId));
    
    return PublicKey.findProgramAddressSync(
      [Buffer.from('reward'), dayIdBuffer],
      this.feeRewardsProgramId
    );
  }

  // Utility method to send and confirm transactions
  async sendAndConfirmTransaction(transaction: Transaction): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.provider.wallet.publicKey;

    const signedTx = await this.provider.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize());
    
    await this.connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }

  // Get comprehensive token info
  async getTokenInfo(tokenMint: PublicKey) {
    const pdas = {
      tracker: (await this.deriveTrackerPDA(tokenMint))[0],
      lpVault: (await this.deriveLPVaultPDA(tokenMint))[0]
    };
    
    try {
      // For now, return mock data since we don't have deployed programs yet
      return {
        tracker: {
          tokenMint,
          status: 'Active',
          volume3d: new BN(1000000),
          currentPrice: new BN(45000),
          athPrice: new BN(50000),
          launchTime: new BN(Date.now() / 1000 - 86400),
          deathSnapshotTime: new BN(0)
        },
        lpVault: null,
        pdas
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return { tracker: null, lpVault: null, pdas };
    }
  }
}
