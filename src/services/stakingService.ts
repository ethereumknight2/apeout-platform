// services/stakingService.ts
import { PublicKey } from '@solana/web3.js';
import { useAppContext } from '../context/AppContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface StakingInfo {
  stakedAmount: number;
  stakingTier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  multiplier: number;
  availableBalance: number;
}

export interface StakeResult {
  success: boolean;
  signature?: string;
  error?: string;
}

class StakingService {
  private context: any;
  private connection: any;
  private wallet: any;

  constructor(context: any, connection: any, wallet: any) {
    this.context = context;
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Get user's staking information from blockchain
   */
  async getStakingInfo(): Promise<StakingInfo> {
    try {
      const { state } = this.context;
      
      if (!this.wallet.publicKey) {
        return this.getEmptyStakingInfo();
      }

      // Use blockchain data if available
      if (state.anchorReady && state.anchorPrograms?.apeoutStaking) {
        console.log("Fetching staking info from blockchain...");
        
        try {
          const userStakePDA = await this.getUserStakePDA(this.wallet.publicKey);
          const stakeData = await state.anchorPrograms.apeoutStaking.account.userStake.fetch(userStakePDA);
          
          const stakedAmount = stakeData.stakedAmount.toNumber();
          const stakingTier = this.calculateTier(stakedAmount);
          const multiplier = this.getMultiplierForTier(stakingTier);
          
          // Get available balance from token account
          const availableBalance = await this.getTokenBalance();
          
          return {
            stakedAmount,
            stakingTier,
            multiplier,
            availableBalance
          };
        } catch (error) {
          console.warn("Failed to fetch staking data from chain:", error);
          // If user stake account doesn't exist, return empty with available balance
          const availableBalance = await this.getTokenBalance();
          return {
            stakedAmount: 0,
            stakingTier: 'Bronze',
            multiplier: 1.0,
            availableBalance
          };
        }
      } else {
        console.log("Anchor not ready or staking program not available");
        return this.getEmptyStakingInfo();
      }
    } catch (error) {
      console.error("Error getting staking info:", error);
      return this.getEmptyStakingInfo();
    }
  }

  /**
   * Get empty staking info when no data is available
   */
  private getEmptyStakingInfo(): StakingInfo {
    return {
      stakedAmount: 0,
      stakingTier: 'Bronze',
      multiplier: 1.0,
      availableBalance: 0
    };
  }

  /**
   * Get user's token balance
   */
  private async getTokenBalance(): Promise<number> {
    try {
      if (!this.wallet.publicKey) return 0;
      
      // TODO: Replace with actual APEOUT token mint
      const APEOUT_MINT = new PublicKey("YOUR_APEOUT_TOKEN_MINT_HERE");
      
      // Get associated token account
      const { getAssociatedTokenAddress } = await import('@solana/spl-token');
      const tokenAccount = await getAssociatedTokenAddress(
        APEOUT_MINT,
        this.wallet.publicKey
      );
      
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      return accountInfo.value.uiAmount || 0;
    } catch (error) {
      console.warn("Could not fetch token balance:", error);
      return 0;
    }
  }

  /**
   * Get PDA for user stake account
   */
  private async getUserStakePDA(userPubkey: PublicKey): Promise<PublicKey> {
    const { state } = this.context;
    const [userStakePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('user_stake'),
        userPubkey.toBuffer(),
      ],
      state.anchorPrograms.apeoutStaking.programId
    );
    return userStakePDA;
  }

  /**
   * Calculate staking tier based on staked amount
   */
  private calculateTier(stakedAmount: number): 'Bronze' | 'Silver' | 'Gold' | 'Diamond' {
    if (stakedAmount >= 5000) return 'Diamond';
    if (stakedAmount >= 1000) return 'Gold';
    if (stakedAmount >= 100) return 'Silver';
    return 'Bronze';
  }

  /**
   * Get multiplier for a given tier
   */
  private getMultiplierForTier(tier: string): number {
    switch (tier) {
      case 'Diamond': return 2.0;
      case 'Gold': return 1.5;
      case 'Silver': return 1.1;
      case 'Bronze': return 1.0;
      default: return 1.0;
    }
  }

  /**
   * Stake APEOUT tokens
   */
  async stakeTokens(amount: number): Promise<StakeResult> {
    try {
      console.log(`🏦 Staking ${amount} APEOUT tokens...`);

      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;
      
      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.apeoutStaking) {
        console.log("Using real Anchor staking...");
        
        try {
          const userStakePDA = await this.getUserStakePDA(this.wallet.publicKey);
          
          // TODO: Replace with actual APEOUT token mint and accounts
          const APEOUT_MINT = new PublicKey("YOUR_APEOUT_TOKEN_MINT_HERE");
          const { getAssociatedTokenAddress } = await import('@solana/spl-token');
          const userTokenAccount = await getAssociatedTokenAddress(
            APEOUT_MINT,
            this.wallet.publicKey
          );
          
          const tx = await state.anchorPrograms.apeoutStaking.methods
            .stakeTokens(new (await import('@coral-xyz/anchor')).BN(amount * 1e9)) // Convert to base units
            .accounts({
              userStake: userStakePDA,
              userTokenAccount: userTokenAccount,
              tokenMint: APEOUT_MINT,
              staker: this.wallet.publicKey,
            })
            .rpc();
          
          return {
            success: true,
            signature: tx
          };
        } catch (error) {
          console.error("Blockchain staking failed:", error);
          throw error;
        }
      } else {
        throw new Error("Staking program not available");
      }

    } catch (error) {
      console.error("❌ Staking failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Staking failed'
      };
    }
  }

  /**
   * Unstake APEOUT tokens
   */
  async unstakeTokens(amount: number): Promise<StakeResult> {
    try {
      console.log(`🏦 Unstaking ${amount} APEOUT tokens...`);

      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;
      
      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.apeoutStaking) {
        console.log("Using real Anchor unstaking...");
        
        try {
          const userStakePDA = await this.getUserStakePDA(this.wallet.publicKey);
          
          // TODO: Replace with actual APEOUT token mint and accounts
          const APEOUT_MINT = new PublicKey("YOUR_APEOUT_TOKEN_MINT_HERE");
          const { getAssociatedTokenAddress } = await import('@solana/spl-token');
          const userTokenAccount = await getAssociatedTokenAddress(
            APEOUT_MINT,
            this.wallet.publicKey
          );
          
          const tx = await state.anchorPrograms.apeoutStaking.methods
            .unstakeTokens(new (await import('@coral-xyz/anchor')).BN(amount * 1e9)) // Convert to base units
            .accounts({
              userStake: userStakePDA,
              userTokenAccount: userTokenAccount,
              tokenMint: APEOUT_MINT,
              staker: this.wallet.publicKey,
            })
            .rpc();
          
          return {
            success: true,
            signature: tx
          };
        } catch (error) {
          console.error("Blockchain unstaking failed:", error);
          throw error;
        }
      } else {
        throw new Error("Staking program not available");
      }

    } catch (error) {
      console.error("❌ Unstaking failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unstaking failed'
      };
    }
  }

  /**
   * Get estimated daily rewards
   */
  async getEstimatedDailyRewards(): Promise<number> {
    try {
      const stakingInfo = await this.getStakingInfo();
      
      // Base daily reward rate: 0.5% of staked amount
      const baseRate = 0.005;
      const dailyReward = stakingInfo.stakedAmount * baseRate * stakingInfo.multiplier;
      
      return dailyReward;
    } catch (error) {
      console.error("Error calculating daily rewards:", error);
      return 0;
    }
  }
}

// Hook to use the staking service
export const useStaking = () => {
  const context = useAppContext();
  const { connection } = useConnection();
  const wallet = useWallet();

  return new StakingService(context, connection, wallet);
};