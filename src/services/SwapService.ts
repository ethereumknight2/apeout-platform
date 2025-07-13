// services/swapService.ts
import { BN } from '@coral-xyz/anchor';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { useAppContext } from '../context/AppContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface TokenInfo {
  mint: PublicKey;
  name: string;
  symbol: string;
  logoUrl?: string;
  decimals: number;
  isNative?: boolean;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  minimumReceived: number;
  fees: {
    platformFee: number;
    slippageFee: number;
    total: number;
  };
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
}

class SwapService {
  private context: any;
  private connection: any;
  private wallet: any;

  // Supported tokens - only SOL, APEOUT, and platform-created tokens
  private readonly SUPPORTED_TOKENS: TokenInfo[] = [
    {
      mint: new PublicKey("So11111111111111111111111111111111111112"), // Wrapped SOL
      name: "Solana",
      symbol: "SOL",
      logoUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
      decimals: 9,
      isNative: true
    }
    // APEOUT token will be added dynamically when it's created
    // Platform-created tokens will be added dynamically
  ];

  constructor(context: any, connection: any, wallet: any) {
    this.context = context;
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Get list of available tokens for swapping
   */
  async getAvailableTokens(): Promise<TokenInfo[]> {
    try {
      const { state } = this.context;
      const availableTokens = [...this.SUPPORTED_TOKENS];

      // Add APEOUT token if it exists
      if (state.apeoutTokenMint) {
        availableTokens.push({
          mint: new PublicKey(state.apeoutTokenMint),
          name: "ApeOut Token",
          symbol: "APEOUT",
          logoUrl: "/apeout-logo.png", // Platform logo
          decimals: 9
        });
      }

      // Add platform-created tokens
      if (state.anchorReady && state.anchorPrograms?.apeoutSwap) {
        const platformTokens = await this.fetchPlatformTokens();
        availableTokens.push(...platformTokens);
      }

      return availableTokens;
    } catch (error) {
      console.error("Error getting available tokens:", error);
      return this.SUPPORTED_TOKENS;
    }
  }

  /**
   * Fetch tokens created on the platform
   */
  private async fetchPlatformTokens(): Promise<TokenInfo[]> {
    try {
      const { state } = this.context;
      const platformTokens: TokenInfo[] = [];

      // TODO: Query all swap pools to get platform-created tokens
      // This would involve fetching all swap pool accounts and extracting token info
      
      return platformTokens;
    } catch (error) {
      console.error("Error fetching platform tokens:", error);
      return [];
    }
  }

  /**
   * Get user's token balance
   */
  async getTokenBalance(tokenMint: PublicKey): Promise<number> {
    try {
      if (!this.wallet.publicKey) return 0;

      // Handle SOL balance
      if (tokenMint.equals(new PublicKey("So11111111111111111111111111111111111112"))) {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        return balance / 1e9; // Convert lamports to SOL
      }

      // Handle SPL token balance
      const tokenAccount = await getAssociatedTokenAddress(tokenMint, this.wallet.publicKey);
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      return accountInfo.value.uiAmount || 0;
    } catch (error) {
      console.warn(`Could not fetch balance for token ${tokenMint.toString()}:`, error);
      return 0;
    }
  }

  /**
   * Get swap quote
   */
  async getSwapQuote(
    inputToken: PublicKey,
    outputToken: PublicKey,
    inputAmount: number,
    slippagePercent: number = 1
  ): Promise<SwapQuote | null> {
    try {
      const { state } = this.context;

      if (!state.anchorReady || !state.anchorPrograms?.apeoutSwap) {
        throw new Error("Swap program not available");
      }

      // Determine which token is the platform token (non-SOL)
      const solMint = new PublicKey("So11111111111111111111111111111111111112");
      const tokenMint = inputToken.equals(solMint) ? outputToken : inputToken;
      const isSolToToken = inputToken.equals(solMint);

      // Get swap pool data
      const swapPoolData = await this.getSwapPoolData(tokenMint);
      
      if (!swapPoolData) {
        throw new Error("Swap pool not found for this token");
      }

      // Calculate output amount using constant product formula
      const inputReserve = isSolToToken ? swapPoolData.solReserves : swapPoolData.tokenReserves;
      const outputReserve = isSolToToken ? swapPoolData.tokenReserves : swapPoolData.solReserves;

      const inputAmountBN = new BN(inputAmount * 1e9); // Convert to base units
      const outputAmountBN = this.calculateSwapOutput(inputAmountBN, inputReserve, outputReserve);
      const outputAmount = outputAmountBN.toNumber() / 1e9;

      // Calculate fees
      const platformFee = inputAmount * 0.005; // 0.5% platform fee
      const slippageFee = inputAmount * (slippagePercent / 100);
      const totalFees = platformFee + slippageFee;

      // Calculate minimum received after slippage
      const minimumReceived = outputAmount * (1 - slippagePercent / 100);

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(inputAmountBN, inputReserve, outputReserve);

      return {
        inputAmount,
        outputAmount,
        priceImpact,
        minimumReceived,
        fees: {
          platformFee,
          slippageFee,
          total: totalFees
        }
      };
    } catch (error) {
      console.error("Error getting swap quote:", error);
      return null;
    }
  }

  /**
   * Calculate swap output using constant product formula
   */
  private calculateSwapOutput(inputAmount: BN, inputReserve: BN, outputReserve: BN): BN {
    // (x + dx) * (y - dy) = x * y
    // dy = (y * dx) / (x + dx)
    const numerator = outputReserve.mul(inputAmount);
    const denominator = inputReserve.add(inputAmount);
    return numerator.div(denominator);
  }

  /**
   * Calculate price impact percentage
   */
  private calculatePriceImpact(inputAmount: BN, inputReserve: BN, outputReserve: BN): number {
    const outputAmount = this.calculateSwapOutput(inputAmount, inputReserve, outputReserve);
    const currentPrice = outputReserve.div(inputReserve);
    const newPrice = outputReserve.sub(outputAmount).div(inputReserve.add(inputAmount));
    const priceImpact = currentPrice.sub(newPrice).div(currentPrice).toNumber();
    return Math.abs(priceImpact * 100);
  }

  /**
   * Get swap pool data
   */
  async getSwapPoolData(tokenMint: PublicKey) {
    try {
      const { state } = this.context;
      const [swapPoolPDA] = await this.getSwapPoolPDA(tokenMint);
      return await state.anchorPrograms.apeoutSwap.account.swapPool.fetch(swapPoolPDA);
    } catch (error) {
      console.error("Error fetching swap pool data:", error);
      return null;
    }
  }

  /**
   * Get swap pool PDA
   */
  private async getSwapPoolPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
    const { state } = this.context;
    return PublicKey.findProgramAddressSync(
      [Buffer.from('swap_pool'), tokenMint.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );
  }

  /**
   * Execute swap
   */
  async executeSwap(
    inputToken: PublicKey,
    outputToken: PublicKey,
    inputAmount: number,
    minimumOutputAmount: number
  ): Promise<SwapResult> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;

      if (!state.anchorReady || !state.anchorPrograms?.apeoutSwap) {
        throw new Error("Swap program not available");
      }

      // Determine which token is the platform token (non-SOL)
      const solMint = new PublicKey("So11111111111111111111111111111111111112");
      const tokenMint = inputToken.equals(solMint) ? outputToken : inputToken;
      const isSolToToken = inputToken.equals(solMint);

      // Get user token account for the non-SOL token
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, this.wallet.publicKey);

      const tx = await state.anchorPrograms.apeoutSwap.methods
        .executeSwap(
          new BN(inputAmount * 1e9), // Convert to base units
          new BN(minimumOutputAmount * 1e9),
          isSolToToken
        )
        .accounts({
          swapPool: (await this.getSwapPoolPDA(tokenMint))[0],
          poolTokenAccount: (await this.getPoolTokenAccountPDA(tokenMint))[0],
          poolSolAccount: (await this.getPoolSolAccountPDA(tokenMint))[0],
          userTokenAccount,
          user: this.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return {
        success: true,
        signature: tx
      };
    } catch (error) {
      console.error("Swap execution failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    }
  }

  /**
   * Get pool token account PDA
   */
  private async getPoolTokenAccountPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
    const { state } = this.context;
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool_token'), tokenMint.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );
  }

  /**
   * Get pool SOL account PDA
   */
  private async getPoolSolAccountPDA(tokenMint: PublicKey): Promise<[PublicKey, number]> {
    const { state } = this.context;
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool_sol'), tokenMint.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );
  }

  /**
   * Check if a token has a swap pool
   */
  async hasSwapPool(tokenMint: PublicKey): Promise<boolean> {
    try {
      const poolData = await this.getSwapPoolData(tokenMint);
      return poolData !== null;
    } catch {
      return false;
    }
  }
}

// Hook to use the swap service
export const useSwapService = () => {
  const context = useAppContext();
  const { connection } = useConnection();
  const wallet = useWallet();

  return new SwapService(context, connection, wallet);
};