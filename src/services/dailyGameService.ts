// services/dailyGameService.ts
import { PublicKey } from '@solana/web3.js';
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
    // Calculate date for the day first (outside try block)
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (30 - dayId));
    const date = baseDate;

    try {
      console.log(`🎮 Getting daily game info for day ${dayId}...`);

      const { state } = this.context;

      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.dailyGameVault) {
        console.log("Using real daily game vault...");
        
        try {
          // Try to fetch real game data from blockchain
          const gameVaultPDA = await this.getGameVaultPDA(dayId);
          const gameData = await state.anchorPrograms.dailyGameVault.account.gameVault.fetch(gameVaultPDA);
          
          return this.parseGameDataFromChain(gameData, dayId, date);
        } catch (error) {
          console.warn("Failed to fetch game data from chain:", error);
          return this.getEmptyDailyGameInfo(dayId, date);
        }
      } else {
        console.log("Anchor not ready or game vault program not available");
        return this.getEmptyDailyGameInfo(dayId, date);
      }

    } catch (error) {
      console.error(`Error getting daily game info for day ${dayId}:`, error);
      return this.getEmptyDailyGameInfo(dayId, date);
    }
  }

  /**
   * Get empty daily game info when no data is available
   */
  private getEmptyDailyGameInfo(dayId: number, date: Date): DailyGameInfo {
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
      date,
      totalRewards: 0,
      categories: this.GAME_CATEGORIES,
      winners: {},
      userStatus: defaultUserStatus
    };
  }

  /**
   * Parse game data from blockchain
   */
  private parseGameDataFromChain(gameData: any, dayId: number, date: Date): DailyGameInfo {
    const winners: { [categoryId: number]: string | null } = {};
    const userStatus: { [categoryId: number]: UserCategoryStatus } = {};
    
    for (const category of this.GAME_CATEGORIES) {
      const categoryData = gameData.categories?.[category.id];
      winners[category.id] = categoryData?.winner?.toString() || null;
      
      const isWinner = winners[category.id] === this.wallet.publicKey?.toString();
      const { state } = this.context;
      const alreadyClaimed = state.claimedRewards.has(`GAME_${dayId}_${category.id}`);
      const rewardAmount = isWinner ? (gameData.totalRewards * category.rewardPercentage) / 100 : 0;
      
      userStatus[category.id] = {
        isWinner,
        canClaim: isWinner && !alreadyClaimed && rewardAmount > 0,
        alreadyClaimed,
        rewardAmount,
        userMetric: categoryData?.userMetric || undefined,
        leaderPosition: categoryData?.leaderPosition || undefined
      };
    }

    return {
      dayId,
      date,
      totalRewards: gameData.totalRewards || 0,
      categories: this.GAME_CATEGORIES,
      winners,
      userStatus
    };
  }

  /**
   * Get PDA for game vault
   */
  private async getGameVaultPDA(dayId: number): Promise<PublicKey> {
    const { state } = this.context;
    const [gameVaultPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game_vault'),
        Buffer.from(dayId.toString()),
      ],
      state.anchorPrograms.dailyGameVault.programId
    );
    return gameVaultPDA;
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
        
        try {
          const gameVaultPDA = await this.getGameVaultPDA(dayId);
          
          const tx = await state.anchorPrograms.dailyGameVault.methods
            .claimCategoryReward(dayId, categoryId)
            .accounts({
              gameVault: gameVaultPDA,
              claimer: this.wallet.publicKey,
            })
            .rpc();
          
          // Mark as claimed in context
          const claimKey = `GAME_${dayId}_${categoryId}`;
          state.claimedRewards.add(claimKey);
          
          // Calculate claimed amount
          const gameInfo = await this.getDailyGameInfo(dayId);
          const amountClaimed = (gameInfo.totalRewards * category.rewardPercentage) / 100;
          
          return {
            success: true,
            signature: tx,
            category: category.name,
            amountClaimed
          };
        } catch (error) {
          console.error("Blockchain claim failed:", error);
          throw error;
        }
      } else {
        throw new Error("Daily game vault program not available");
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
      const { state } = this.context;
      
      if (state.anchorReady && state.anchorPrograms?.dailyGameVault) {
        // Try to fetch real leaderboard data
        const gameVaultPDA = await this.getGameVaultPDA(dayId);
        const gameData = await state.anchorPrograms.dailyGameVault.account.gameVault.fetch(gameVaultPDA);
        
        const categoryData = gameData.categories?.[categoryId];
        if (categoryData?.leaderboard) {
          return categoryData.leaderboard.map((entry: any, index: number) => ({
            rank: index + 1,
            wallet: entry.wallet.toString(),
            metric: entry.metric || 0,
            isWinner: index === 0
          }));
        }
      }
      
      // Return empty leaderboard if no data available
      return [];
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