// services/dailyRewardsService.ts
import { PublicKey } from '@solana/web3.js';
// Note: Transaction, SystemProgram, BN, etc. will be imported when we implement real contract calls
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
    try {
      console.log(`🎁 Getting reward info for day ${dayId}...`);

      const { state } = this.context;
      
      // Calculate date for the day
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (30 - dayId));
      const date = baseDate;

      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.feeRewards) {
        console.log("Using real fee rewards contract...");
        
        // TODO: Implement real reward fetching
        // For now, return mock data
        return this.getMockDayRewardInfo(dayId, date, state);
      } else {
        // Use mock data
        return this.getMockDayRewardInfo(dayId, date, state);
      }

    } catch (error) {
      console.error(`Error getting day ${dayId} reward info:`, error);
      
      // Return default info
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (30 - dayId));
      
      return {
        dayId,
        date: baseDate,
        isEligible: false,
        rewardAmount: 0,
        userTokenBalance: 0,
        stakingMultiplier: 1.0,
        stakingTier: 'Bronze',
        alreadyClaimed: false,
        claimDeadline: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      };
    }
  }

  /**
   * Get mock reward info for testing
   */
  private getMockDayRewardInfo(dayId: number, date: Date, state: any): DailyRewardInfo {
    // Get user's trading activity for this day (simplified)
    const hasTraded = Math.random() > 0.3; // 70% chance of having traded
    const userTokenBalance = hasTraded ? Math.floor(Math.random() * 100000) + 1000 : 0;

    // Get staking info from context
    const stakingMultiplier = state.stakingMultiplier || 1.0;
    const stakingTier = state.userStakingTier || 'Bronze';

    // Calculate reward amount
    let rewardAmount = 0;
    if (hasTraded) {
      const baseReward = 0.001; // Base 0.001 SOL
      const userShare = userTokenBalance / 1000000; // Mock total supply
      const scaledReward = baseReward * userShare * 1000; // Scale up for visibility
      rewardAmount = scaledReward * stakingMultiplier;
    }

    // Check if already claimed
    const alreadyClaimed = state.claimedRewards.has(`FEE_${dayId}`);

    // Claim deadline (7 days after the day)
    const claimDeadline = new Date(date);
    claimDeadline.setDate(claimDeadline.getDate() + 7);

    return {
      dayId,
      date,
      isEligible: hasTraded,
      rewardAmount,
      userTokenBalance,
      stakingMultiplier,
      stakingTier,
      alreadyClaimed,
      claimDeadline
    };
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
        
        // TODO: Implement real reward claim
        // For now, use the context's existing claim function
        const signature = await this.context.claimFeeRewards(
          dayId,
          50000, // Mock user balance
          1000000 // Mock total supply
        );
        
        // Get the reward amount
        const rewardInfo = await this.getDayRewardInfo(dayId);
        const amountClaimed = rewardInfo.rewardAmount;
        
        return {
          success: true,
          signature,
          amountClaimed
        };
      } else {
        // Use the existing context claim function
        console.log("Using context claim function...");
        const signature = await this.context.claimFeeRewards(
          dayId,
          50000, // Mock user balance
          1000000 // Mock total supply
        );
        
        // Get the reward amount
        const rewardInfo = await this.getDayRewardInfo(dayId);
        const amountClaimed = rewardInfo.rewardAmount;
        
        return {
          success: true,
          signature,
          amountClaimed
        };
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