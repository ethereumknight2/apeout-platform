// services/lpClaimService.ts
import { PublicKey } from '@solana/web3.js';
import { useAppContext } from '../context/AppContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface LPClaimInfo {
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  isClaimable: boolean;
  userTokenBalanceAtDeath: number;
  totalSupplyAtDeath: number;
  estimatedSolReward: number;
  estimatedTokenReward: number;
  deathTimestamp: number;
  claimDeadline: number;
  alreadyClaimed: boolean;
}

export interface ClaimResult {
  success: boolean;
  signature?: string;
  solClaimed?: number;
  tokensClaimed?: number;
  error?: string;
}

class LPClaimService {
  private context: any;
  private connection: any;
  private wallet: any;

  constructor(context: any, connection: any, wallet: any) {
    this.context = context;
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Get all claimable LP rewards for dead tokens
   */
  async getClaimableRewards(): Promise<LPClaimInfo[]> {
    try {
      console.log("🔍 Fetching claimable LP rewards...");

      const { state } = this.context;
      
      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.lpCustody) {
        console.log("Using real LP custody contract...");
        
        try {
          const claimableTokens = await this.fetchClaimableTokensFromChain();
          return claimableTokens;
        } catch (error) {
          console.warn("Failed to fetch claimable tokens from chain:", error);
          return [];
        }
      } else {
        console.log("Anchor not ready or LP custody program not available");
        return [];
      }

    } catch (error) {
      console.error("❌ Error fetching claimable rewards:", error);
      return [];
    }
  }

  /**
   * Fetch claimable tokens from blockchain
   */
  private async fetchClaimableTokensFromChain(): Promise<LPClaimInfo[]> {
    const { state } = this.context;
    const claimableTokens: LPClaimInfo[] = [];

    if (!this.wallet.publicKey) {
      return [];
    }

    try {
      // Get all dead token accounts where user has claims
      const userClaimsPDA = await this.getUserClaimsPDA(this.wallet.publicKey);
      const userClaimsData = await state.anchorPrograms.lpCustody.account.userClaims.fetch(userClaimsPDA);
      
      for (const claim of userClaimsData.claims || []) {
        if (!claim.claimed && claim.userTokenBalance > 0) {
          const tokenInfo = await this.getTokenInfo(claim.tokenMint);
          
          claimableTokens.push({
            tokenMint: claim.tokenMint.toString(),
            tokenName: tokenInfo.name || 'Unknown Token',
            tokenSymbol: tokenInfo.symbol || 'UNK',
            isClaimable: true,
            userTokenBalanceAtDeath: claim.userTokenBalance,
            totalSupplyAtDeath: claim.totalSupplyAtDeath,
            estimatedSolReward: claim.estimatedSolReward / 1e9, // Convert lamports to SOL
            estimatedTokenReward: claim.estimatedTokenReward,
            deathTimestamp: claim.deathTimestamp,
            claimDeadline: claim.claimDeadline,
            alreadyClaimed: state.claimedRewards.has(`LP_${claim.tokenMint.toString()}`)
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user claims:", error);
    }

    return claimableTokens;
  }

  /**
   * Get PDA for user claims account
   */
  private async getUserClaimsPDA(userPubkey: PublicKey): Promise<PublicKey> {
    const { state } = this.context;
    const [userClaimsPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('user_claims'),
        userPubkey.toBuffer(),
      ],
      state.anchorPrograms.lpCustody.programId
    );
    return userClaimsPDA;
  }

  /**
   * Get token info (name, symbol) - this could be from metadata or a registry
   */
  private async getTokenInfo(tokenMint: PublicKey): Promise<{ name?: string; symbol?: string }> {
    try {
      // TODO: Implement actual token metadata fetching
      // For now, return placeholder data
      return {
        name: `Token ${tokenMint.toString().slice(0, 8)}`,
        symbol: `T${tokenMint.toString().slice(0, 4)}`.toUpperCase()
      };
    } catch (error) {
      console.error("Error fetching token info:", error);
      return {};
    }
  }

  /**
   * Claim LP rewards for a specific dead token
   */
  async claimLPRewards(
    tokenMintAddress: string,
    userTokenBalanceAtDeath: number,
    totalSupplyAtDeath: number
  ): Promise<ClaimResult> {
    try {
      console.log(`💰 Claiming LP rewards for token ${tokenMintAddress}...`);

      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;
      const tokenMint = new PublicKey(tokenMintAddress);
      
      // Use the enhanced Anchor version if available
      if (state.anchorReady && state.anchorPrograms?.lpCustody) {
        console.log("Using real LP custody contract...");
        
        try {
          const userClaimsPDA = await this.getUserClaimsPDA(this.wallet.publicKey);
          
          const tx = await state.anchorPrograms.lpCustody.methods
            .claimLpRewards(tokenMint)
            .accounts({
              userClaims: userClaimsPDA,
              tokenMint: tokenMint,
              claimer: this.wallet.publicKey,
            })
            .rpc();
          
          // Mark as claimed in context
          const claimKey = `LP_${tokenMintAddress}`;
          state.claimedRewards.add(claimKey);
          
          // Calculate claimed amounts from transaction logs or fetch updated state
          const userSharePercentage = userTokenBalanceAtDeath / totalSupplyAtDeath;
          const solClaimed = userSharePercentage * 0.5; // This should come from actual transaction result
          const tokensClaimed = userSharePercentage * 1000; // This should come from actual transaction result
          
          return {
            success: true,
            signature: tx,
            solClaimed,
            tokensClaimed
          };
        } catch (error) {
          console.error("Blockchain claim failed:", error);
          throw error;
        }
      } else {
        throw new Error("LP custody program not available");
      }

    } catch (error) {
      console.error("❌ LP claim failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LP claim failed'
      };
    }
  }

  /**
   * Check if a specific token has claimable LP rewards
   */
  async hasClaimableRewards(tokenMintAddress: string): Promise<boolean> {
    try {
      const rewards = await this.getClaimableRewards();
      return rewards.some(reward => 
        reward.tokenMint === tokenMintAddress && 
        reward.isClaimable && 
        !reward.alreadyClaimed
      );
    } catch {
      return false;
    }
  }
}

// Hook to use the LP claim service
export const useLPClaim = () => {
  const context = useAppContext();
  const { connection } = useConnection();
  const wallet = useWallet();

  return new LPClaimService(context, connection, wallet);
};