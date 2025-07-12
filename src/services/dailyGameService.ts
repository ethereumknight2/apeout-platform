// services/dailyGameService.ts
import { PublicKey } from '@solana/web3.js';
// Note: Transaction, SystemProgram, BN, etc. will be imported when we implement real contract calls
import { useAppContext } from '../context/AppContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface GameCategory {
  id: number;
  name: string;
  description: string;
  rewardPercentage: number;
  icon: string;
}

export interface DailyGameInfo {
  dayId: number;
  date: Date;
  totalRewards: number; // in SOL
  categories: GameCategory[];
  winners: { [categoryId: number]: string | null };
  userStatus: { [categoryId: number]: UserCategoryStatus };
}

export interface UserCategoryStatus {
  isWinner: boolean;
  canClaim: boolean;
  alreadyClaimed: boolean;
  rewardAmount: number;
  userMetric?: number;
  leaderPosition?: number;
}

export interface GameClaimResult {
  success: boolean;
  signature?: string;
  category: string;
  amountClaimed?: number;
  error?: string;
}

class DailyGameService {
  private context: any;
  private connection: any;
  private wallet: any;

  // Game categories definition
  private readonly GAME_CATEGORIES: GameCategory[] = [
    {
      id: 0,
      name: "Most Traded Token",
      description: "Creator of the token with highest volume",
      rewardPercentage: 30,
      icon: "🚀"
    },
    {
      id: 1,
      name: "LP MVP",
      description: "Provided the most liquidity",
      rewardPercentage: 25,
      icon: "💰"
    },
    {
      id: 2,
      name: "Early Buyer",
      description: "First to buy a successful token",
      rewardPercentage: 20,
      icon: "⚡"
    },
    {
      id: 3,
      name: "Smart Money",
      description: "Best trading performance",
      rewardPercentage: 15,
      icon: "🧠"
    },
    {
      id: 4,
      name: "Profit Champion",
      description: "Highest absolute profit",
      rewardPercentage: 10,
      icon: "🏆"
    }
  ];

  constructor(context: any, connection: any, wallet: any) {
    this.context = context;
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Get daily game information for a specific day
   */
  async getDailyGameInfo(dayId: number): Promise<DailyGameInfo> {
    try {
      console.log(`🎮 Getting daily game info for day ${dayId}...`);

      const { state } = this.context;

      // Calculate date for the day
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (30 - dayId));
      const date = baseDate;

      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.dailyGameVault) {
        console.log("Using real daily game vault...");
        
        // TODO: Implement real game data fetching
        // For now, return mock data
        return this.getMockDailyGameInfo(dayId, date, state);
      } else {
        // Use mock data
        return this.getMockDailyGameInfo(dayId, date, state);
      }

    } catch (error) {
      console.error(`Error getting daily game info for day ${dayId}:`, error);
      
      // Return default info
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (30 - dayId));
      
      const defaultUserStatus: { [categoryId: number]: UserCategoryStatus } = {};
      for (const category of this.GAME_CATEGORIES) {
        defaultUserStatus[category.id] = {
          isWinner: false,
          canClaim: false,
          alreadyClaimed: false,
          rewardAmount: 0
        };
      }

      return {
        dayId,
        date: baseDate,
        totalRewards: 0,
        categories: this.GAME_CATEGORIES,
        winners: {},
        userStatus: defaultUserStatus
      };
    }
  }

  /**
   * Get mock daily game info for testing
   */
  private getMockDailyGameInfo(dayId: number, date: Date, state: any): DailyGameInfo {
    // Mock total rewards (varies by day)
    const totalRewards = Math.random() * 2 + 0.5; // 0.5-2.5 SOL

    // Mock winners (some categories have winners, some don't)
    const winners: { [categoryId: number]: string | null } = {};
    for (const category of this.GAME_CATEGORIES) {
      const hasWinner = Math.random() > 0.3; // 70% chance of having a winner
      if (hasWinner) {
        const isUserWinner = Math.random() > 0.8; // 20% chance user is winner
        winners[category.id] = isUserWinner ? 
          this.wallet.publicKey?.toString() || null : 
          PublicKey.unique().toString();
      } else {
        winners[category.id] = null;
      }
    }

    // Generate user status for each category
    const userStatus: { [categoryId: number]: UserCategoryStatus } = {};
    
    for (const category of this.GAME_CATEGORIES) {
      const isWinner = winners[category.id] === this.wallet.publicKey?.toString();
      const rewardAmount = isWinner ? (totalRewards * category.rewardPercentage) / 100 : 0;
      const alreadyClaimed = state.claimedRewards.has(`GAME_${dayId}_${category.id}`);
      
      userStatus[category.id] = {
        isWinner,
        canClaim: isWinner && !alreadyClaimed && rewardAmount > 0,
        alreadyClaimed,
        rewardAmount,
        userMetric: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) + 100 : undefined,
        leaderPosition: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 1 : undefined
      };
    }

    return {
      dayId,
      date,
      totalRewards,
      categories: this.GAME_CATEGORIES,
      winners,
      userStatus
    };
  }

  /**
   * Claim reward for winning a category
   */
  async claimCategoryReward(dayId: number, categoryId: number): Promise<GameClaimResult> {
    try {
      console.log(`🏆 Claiming reward for day ${dayId}, category ${categoryId}...`);

      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;
      const category = this.GAME_CATEGORIES.find(c => c.id === categoryId);
      
      if (!category) {
        throw new Error(`Invalid category ID: ${categoryId}`);
      }

      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.dailyGameVault) {
        console.log("Using real daily game vault...");
        
        // TODO: Implement real game reward claim
        // For now, simulate the claim and update context state
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as claimed in context
        const claimKey = `GAME_${dayId}_${categoryId}`;
        this.context.setError(null);
        
        // Calculate claimed amount
        const gameInfo = await this.getDailyGameInfo(dayId);
        const amountClaimed = (gameInfo.totalRewards * category.rewardPercentage) / 100;
        
        // Add to claimed rewards
        state.claimedRewards.add(claimKey);
        
        return {
          success: true,
          signature: "ANCHOR_GAME_CLAIM_" + Date.now(),
          category: category.name,
          amountClaimed
        };
      } else {
        // Use mock implementation
        console.log("Using mock game reward claim...");
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as claimed in context
        const claimKey = `GAME_${dayId}_${categoryId}`;
        this.context.setError(null);
        
        // Calculate claimed amount
        const gameInfo = await this.getDailyGameInfo(dayId);
        const amountClaimed = (gameInfo.totalRewards * category.rewardPercentage) / 100;
        
        // Add to claimed rewards
        state.claimedRewards.add(claimKey);
        
        return {
          success: true,
          signature: "MOCK_GAME_CLAIM_" + Date.now(),
          category: category.name,
          amountClaimed
        };
      }

    } catch (error) {
      console.error("❌ Game reward claim failed:", error);
      return {
        success: false,
        category: this.GAME_CATEGORIES.find(c => c.id === categoryId)?.name || 'Unknown',
        error: error instanceof Error ? error.message : 'Game reward claim failed'
      };
    }
  }

  /**
   * Get all claimable game rewards across multiple days
   */
  async getAllClaimableRewards(dayIds: number[]): Promise<{
    totalAmount: number;
    claimableRewards: Array<{
      dayId: number;
      categoryId: number;
      categoryName: string;
      amount: number;
    }>;
  }> {
    try {
      const claimableRewards: Array<{
        dayId: number;
        categoryId: number;
        categoryName: string;
        amount: number;
      }> = [];

      for (const dayId of dayIds) {
        const gameInfo = await this.getDailyGameInfo(dayId);
        
        for (const [categoryId, status] of Object.entries(gameInfo.userStatus)) {
          if (status.canClaim && status.rewardAmount > 0) {
            const category = this.GAME_CATEGORIES.find(c => c.id === parseInt(categoryId));
            if (category) {
              claimableRewards.push({
                dayId,
                categoryId: parseInt(categoryId),
                categoryName: category.name,
                amount: status.rewardAmount
              });
            }
          }
        }
      }

      const totalAmount = claimableRewards.reduce((sum, reward) => sum + reward.amount, 0);

      return { totalAmount, claimableRewards };

    } catch (error) {
      console.error("Error getting all claimable game rewards:", error);
      return { totalAmount: 0, claimableRewards: [] };
    }
  }

  /**
   * Batch claim multiple category rewards
   */
  async claimMultipleRewards(claims: Array<{ dayId: number; categoryId: number }>): Promise<GameClaimResult[]> {
    const results: GameClaimResult[] = [];
    
    for (const { dayId, categoryId } of claims) {
      try {
        const result = await this.claimCategoryReward(dayId, categoryId);
        results.push(result);
        
        // Small delay between claims
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const category = this.GAME_CATEGORIES.find(c => c.id === categoryId);
        results.push({
          success: false,
          category: category?.name || 'Unknown',
          error: `Failed to claim day ${dayId}, category ${categoryId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return results;
  }

  /**
   * Get leaderboard for a specific day and category
   */
  async getCategoryLeaderboard(dayId: number, categoryId: number): Promise<Array<{
    rank: number;
    wallet: string;
    metric: number;
    isWinner: boolean;
  }>> {
    try {
      // TODO: Implement actual leaderboard query
      // This would query indexed data for trading activity, LP provision, etc.
      
      // Simulate leaderboard for demo
      const leaderboard = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        wallet: PublicKey.unique().toString(),
        metric: Math.floor(Math.random() * 100000) + 1000,
        isWinner: i === 0 // First place is winner
      }));

      return leaderboard;
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }
}

// Hook to use the daily game service
export const useDailyGame = () => {
  const context = useAppContext();
  const { connection } = useConnection();
  const wallet = useWallet();

  return new DailyGameService(context, connection, wallet);
};