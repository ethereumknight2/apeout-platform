// services/dailyRewardsService.ts
import { PublicKey } from '@solana/web3.js';
import { useAppContext } from '../context/AppContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface DailyRewardInfo {
  dayId: number;
  date: Date;
  isEligible: boolean;
  rewardAmount: number; // in SOL
  userTokenBalance: number;
  stakingMultiplier: number;
  stakingTier: string;
  alreadyClaimed: boolean;
  claimDeadline: Date;
}

export interface RewardClaimResult {
  success: boolean;
  signature?: string;
  amountClaimed?: number;
  error?: string;
}

class DailyRewardsService {
  private context: any;
  private connection: any;
  private wallet: any;

  constructor(context: any, connection: any, wallet: any) {
    this.context = context;
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Get reward information for a specific day
   */
  async getDayRewardInfo(dayId: number): Promise<DailyRewardInfo> {
    // Calculate date for the day first (outside try block)
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (30 - dayId));
    const date = baseDate;

    try {
      console.log(`🎁 Getting reward info for day ${dayId}...`);

      const { state } = this.context;

      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.feeRewards) {
        console.log("Using real fee rewards contract...");
        
        try {
          const rewardVaultPDA = await this.getRewardVaultPDA(dayId);
          const rewardData = await state.anchorPrograms.feeRewards.account.rewardVault.fetch(rewardVaultPDA);
          
          return this.parseRewardDataFromChain(rewardData, dayId, date, state);
        } catch (error) {
          console.warn("Failed to fetch reward data from chain:", error);
          return this.getEmptyRewardInfo(dayId, date);
        }
      } else {
        console.log("Anchor not ready or fee rewards program not available");
        return this.getEmptyRewardInfo(dayId, date);
      }

    } catch (error) {
      console.error(`Error getting day ${dayId} reward info:`, error);
      return this.getEmptyRewardInfo(dayId, date);
    }
  }

  /**
   * Get empty reward info when no data is available
   */
  private getEmptyRewardInfo(dayId: number, date: Date): DailyRewardInfo {
    return {
      dayId,
      date,
      isEligible: false,
      rewardAmount: 0,
      userTokenBalance: 0,
      stakingMultiplier: 1.0,
      stakingTier: 'Bronze',
      alreadyClaimed: false,
      claimDeadline: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Parse reward data from blockchain
   */
  private parseRewardDataFromChain(rewardData: any, dayId: number, date: Date, state: any): DailyRewardInfo {
    const userKey = this.wallet.publicKey?.toString();
    const userReward = userKey ? rewardData.userRewards?.[userKey] : null;
    
    const isEligible = userReward ? userReward.isEligible : false;
    const userTokenBalance = userReward ? userReward.tokenBalance : 0;
    const rewardAmount = userReward ? userReward.rewardAmount / 1e9 : 0; // Convert lamports to SOL
    
    // Get staking info from context
    const stakingMultiplier = state.stakingMultiplier || 1.0;
    const stakingTier = state.userStakingTier || 'Bronze';
    
    // Check if already claimed
    const alreadyClaimed = state.claimedRewards.has(`FEE_${dayId}`);
    
    // Claim deadline (7 days after the day)
    const claimDeadline = new Date(date);
    claimDeadline.setDate(claimDeadline.getDate() + 7);

    return {
      dayId,
      date,
      isEligible,
      rewardAmount,
      userTokenBalance,
      stakingMultiplier,
      stakingTier,
      alreadyClaimed,
      claimDeadline
    };
  }

  /**
   * Get PDA for reward vault
   */
  private async getRewardVaultPDA(dayId: number): Promise<PublicKey> {
    const { state } = this.context;
    const [rewardVaultPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('reward_vault'),
        Buffer.from(dayId.toString()),
      ],
      state.anchorPrograms.feeRewards.programId
    );
    return rewardVaultPDA;
  }

  /**
   * Get reward info for multiple days
   */
  async getMultipleDaysRewardInfo(dayIds: number[]): Promise<DailyRewardInfo[]> {
    const rewardInfos = await Promise.all(
      dayIds.map(dayId => this.getDayRewardInfo(dayId))
    );
    return rewardInfos;
  }

  /**
   * Get the last 7 days of reward info
   */
  async getLastWeekRewards(): Promise<DailyRewardInfo[]> {
    const dayIds = Array.from({ length: 7 }, (_, i) => 30 - i); // Last 7 days
    return this.getMultipleDaysRewardInfo(dayIds);
  }

  /**
   * Claim reward for a specific day
   */
  async claimDayReward(dayId: number): Promise<RewardClaimResult> {
    try {
      console.log(`💰 Claiming reward for day ${dayId}...`);

      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;
      
      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.feeRewards) {
        console.log("Using real fee rewards contract...");
        
        try {
          const rewardVaultPDA = await this.getRewardVaultPDA(dayId);
          
          const tx = await state.anchorPrograms.feeRewards.methods
            .claimDayReward(dayId)
            .accounts({
              rewardVault: rewardVaultPDA,
              claimer: this.wallet.publicKey,
            })
            .rpc();
          
          // Mark as claimed in context
          const claimKey = `FEE_${dayId}`;
          state.claimedRewards.add(claimKey);
          
          // Get the reward amount
          const rewardInfo = await this.getDayRewardInfo(dayId);
          const amountClaimed = rewardInfo.rewardAmount;
          
          return {
            success: true,
            signature: tx,
            amountClaimed
          };
        } catch (error) {
          console.error("Blockchain claim failed:", error);
          throw error;
        }
      } else {
        throw new Error("Fee rewards program not available");
      }

    } catch (error) {
      console.error("❌ Reward claim failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reward claim failed'
      };
    }
  }

  /**
   * Get total claimable rewards across all days
   */
  async getTotalClaimableRewards(): Promise<{ totalAmount: number; claimableDays: number[] }> {
    try {
      const lastWeekRewards = await this.getLastWeekRewards();
      
      const claimableRewards = lastWeekRewards.filter(reward => 
        reward.isEligible && 
        !reward.alreadyClaimed && 
        new Date() < reward.claimDeadline
      );

      const totalAmount = claimableRewards.reduce((sum, reward) => sum + reward.rewardAmount, 0);
      const claimableDays = claimableRewards.map(reward => reward.dayId);

      return { totalAmount, claimableDays };
    } catch (error) {
      console.error("Error calculating total claimable rewards:", error);
      return { totalAmount: 0, claimableDays: [] };
    }
  }

  /**
   * Batch claim multiple days of rewards
   */
  async claimMultipleDays(dayIds: number[]): Promise<RewardClaimResult[]> {
    const results: RewardClaimResult[] = [];
    
    for (const dayId of dayIds) {
      try {
        const result = await this.claimDayReward(dayId);
        results.push(result);
        
        // Small delay between claims to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to claim day ${dayId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return results;
  }
}

// Hook to use the daily rewards service
export const useDailyRewards = () => {
  const context = useAppContext();
  const { connection } = useConnection();
  const wallet = useWallet();

  return new DailyRewardsService(context, connection, wallet);
};