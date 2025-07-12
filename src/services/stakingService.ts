// services/stakingService.ts
import { PublicKey } from '@solana/web3.js';
// Note: Transaction, SystemProgram, BN, etc. will be imported when we implement real contract calls
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
   * Get user's staking information
   */
  async getStakingInfo(): Promise<StakingInfo> {
    try {
      const { state } = this.context;
      
      // Use the existing context state
      const stakedAmount = state.stakedAmount || 0;
      const availableBalance = state.apeoutBalance || 0;
      const stakingTier = state.userStakingTier || 'Bronze';
      const multiplier = state.stakingMultiplier || 1.0;

      return {
        stakedAmount,
        stakingTier: stakingTier as 'Bronze' | 'Silver' | 'Gold' | 'Diamond',
        multiplier,
        availableBalance
      };
    } catch (error) {
      console.error("Error getting staking info:", error);
      return {
        stakedAmount: 0,
        stakingTier: 'Bronze',
        multiplier: 1.0,
        availableBalance: 0
      };
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
        
        // TODO: Implement real staking call when contract is ready
        // For now, use the context's existing staking function
        await this.context.stakeTokens(amount);
        
        return {
          success: true,
          signature: "ANCHOR_STAKE_" + Date.now()
        };
      } else {
        // Use the existing context staking function
        console.log("Using context staking function...");
        await this.context.stakeTokens(amount);
        
        return {
          success: true,
          signature: "MOCK_STAKE_" + Date.now()
        };
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
        
        // TODO: Implement real unstaking call when contract is ready
        // For now, use the context's existing unstaking function
        await this.context.unstakeTokens(amount);
        
        return {
          success: true,
          signature: "ANCHOR_UNSTAKE_" + Date.now()
        };
      } else {
        // Use the existing context unstaking function
        console.log("Using context unstaking function...");
        await this.context.unstakeTokens(amount);
        
        return {
          success: true,
          signature: "MOCK_UNSTAKE_" + Date.now()
        };
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