// services/tokenLauncherService.ts
import { BN } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { useAppContext } from '../context/AppContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface TokenLaunchData {
  name: string;
  symbol: string;
  description: string;
  imageFile?: File;
  socialLinks?: {
    telegram?: string;
    twitter?: string;
    website?: string;
  };
  initialSupply: number;
  lpSolAmount: number; // SOL to add to LP (in SOL, not lamports)
  lpTokenPercentage: number; // Percentage of supply for LP
}

export interface LaunchResult {
  success: boolean;
  signature?: string;
  tokenMint?: PublicKey;
  error?: string;
  launchData?: {
    name: string;
    symbol: string;
    totalSupply: number;
    lpCreated: boolean;
    tradingActive: boolean;
  };
}

export interface LaunchedTokenInfo {
  creator: PublicKey;
  tokenMint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  initialSupply: number;
  lpSolAmount: number;
  lpTokenAmount: number;
  launchTime: number;
}

class TokenLauncherService {
  private context: any;
  private connection: any;
  private wallet: any;

  constructor(context: any, connection: any, wallet: any) {
    this.context = context;
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Launch a new token with automatic LP creation
   */
  async launchToken(tokenData: TokenLaunchData): Promise<LaunchResult> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const { state } = this.context;

      if (!state.anchorReady || !state.anchorPrograms?.tokenLauncher) {
        throw new Error("Token launcher program not available");
      }

      console.log("🚀 Starting token launch process...");

      // Validate fair tokenomics
      if (tokenData.lpTokenPercentage < 95 || tokenData.lpTokenPercentage > 99) {
        throw new Error("LP token percentage must be between 95% and 99% for fair tokenomics");
      }

      // Step 1: Upload metadata and get URI
      const metadataUri = await this.uploadMetadata(tokenData);

      // Step 2: Generate token mint with "ape" ending
      const tokenMint = await this.generateApeTokenMint();

      // Step 3: Calculate LP amounts
      const totalSupply = tokenData.initialSupply * 1e6; // Convert to base units (6 decimals)
      const lpTokenAmount = Math.floor(totalSupply * (tokenData.lpTokenPercentage / 100));
      const lpSolAmount = Math.floor(tokenData.lpSolAmount * 1e9); // Convert SOL to lamports

      console.log(`💰 LP Setup: ${lpTokenAmount / 1e6} tokens + ${lpSolAmount / 1e9} SOL`);

      // Step 4: Get all required PDAs and accounts
      const accounts = await this.prepareLaunchAccounts(tokenMint);

      // Step 5: Execute the launch transaction
      const tx = await state.anchorPrograms.tokenLauncher.methods
        .launchToken(
          tokenData.name,
          tokenData.symbol,
          metadataUri,
          new BN(totalSupply),
          new BN(lpSolAmount),
          new BN(lpTokenAmount)
        )
        .accounts({
          launchData: accounts.launchData,
          tokenMint: tokenMint.publicKey,
          creatorTokenAccount: accounts.creatorTokenAccount,
          launchTokenTempAccount: accounts.launchTokenTempAccount,
          projectTracker: accounts.projectTracker,
          lpVault: accounts.lpVault,
          swapPool: accounts.swapPool,
          lpMint: accounts.lpMint,
          poolTokenAccount: accounts.poolTokenAccount,
          poolSolAccount: accounts.poolSolAccount,
          custodyLpAccount: accounts.custodyLpAccount,
          projectStatusTrackerProgram: state.anchorPrograms.projectStatusTracker.programId,
          lpCustodyProgram: state.anchorPrograms.lpCustody.programId,
          apeoutSwapProgram: state.anchorPrograms.apeoutSwap.programId,
          creator: this.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([tokenMint])
        .rpc();

      console.log("✅ Token launched successfully!");
      console.log("📄 Transaction:", tx);
      console.log("🪙 Token Mint:", tokenMint.publicKey.toString());

      return {
        success: true,
        signature: tx,
        tokenMint: tokenMint.publicKey,
        launchData: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          totalSupply: tokenData.initialSupply,
          lpCreated: true,
          tradingActive: true
        }
      };

    } catch (error) {
      console.error("❌ Token launch failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token launch failed'
      };
    }
  }

  /**
   * Generate a token mint keypair that ends with "ape"
   */
  private async generateApeTokenMint(): Promise<Keypair> {
    console.log("🔍 Generating token mint ending with 'ape'...");
    
    let attempts = 0;
    const maxAttempts = 10000;

    while (attempts < maxAttempts) {
      const keypair = Keypair.generate();
      const pubkeyStr = keypair.publicKey.toString();
      
      // Check if the last 3 characters (before base58 padding) spell "ape"
      if (pubkeyStr.toLowerCase().endsWith('ape') || 
          pubkeyStr.slice(-4, -1).toLowerCase() === 'ape') {
        console.log(`✅ Found ape-ending mint after ${attempts + 1} attempts: ${pubkeyStr}`);
        return keypair;
      }
      
      attempts++;
      
      // Log progress every 1000 attempts
      if (attempts % 1000 === 0) {
        console.log(`🔄 Generated ${attempts} keypairs, still searching for 'ape' ending...`);
      }
    }

    console.warn("⚠️ Could not generate 'ape' ending mint after max attempts, using random mint");
    return Keypair.generate();
  }

  /**
   * Prepare all accounts needed for token launch
   */
  private async prepareLaunchAccounts(tokenMint: Keypair) {
    const { state } = this.context;

    // Launch data PDA
    const [launchData] = PublicKey.findProgramAddressSync(
      [Buffer.from('launch_data'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.tokenLauncher.programId
    );

    // Creator token account
    const creatorTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      this.wallet.publicKey
    );

    // Temporary token account for launch process
    const [launchTokenTempAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('temp_tokens'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.tokenLauncher.programId
    );

    // Project tracker PDA (from project_status_tracker program)
    const [projectTracker] = PublicKey.findProgramAddressSync(
      [Buffer.from('tracker'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.projectStatusTracker.programId
    );

    // LP vault PDA (from lp_custody program)
    const [lpVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_vault'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.lpCustody.programId
    );

    // Swap pool PDAs (from apeout_swap program)
    const [swapPool] = PublicKey.findProgramAddressSync(
      [Buffer.from('swap_pool'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );

    const [poolTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool_token'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );

    const [poolSolAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool_sol'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.apeoutSwap.programId
    );

    const [custodyLpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('custody_lp'), tokenMint.publicKey.toBuffer()],
      state.anchorPrograms.lpCustody.programId
    );

    return {
      launchData,
      creatorTokenAccount,
      launchTokenTempAccount,
      projectTracker,
      lpVault,
      swapPool,
      lpMint,
      poolTokenAccount,
      poolSolAccount,
      custodyLpAccount
    };
  }

  /**
   * Upload token metadata to IPFS or storage service
   */
  private async uploadMetadata(tokenData: TokenLaunchData): Promise<string> {
    try {
      console.log("📤 Uploading token metadata...");

      // Create metadata object
      const metadata = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description,
        image: "", // Will be set after image upload
        external_url: tokenData.socialLinks?.website || "",
        attributes: [
          {
            trait_type: "Platform",
            value: "ApeOut Terminal"
          },
          {
            trait_type: "Launch Type",
            value: "Bonding Curve"
          }
        ],
        properties: {
          category: "image",
          creators: [
            {
              address: this.wallet.publicKey.toString(),
              share: 100
            }
          ]
        },
        socialLinks: tokenData.socialLinks || {}
      };

      // Upload image if provided
      if (tokenData.imageFile) {
        const imageUrl = await this.uploadImage(tokenData.imageFile);
        metadata.image = imageUrl;
      }

      // Upload metadata JSON
      // TODO: Replace with actual IPFS/Arweave upload
      const metadataUrl = await this.uploadJson(metadata);
      
      console.log("✅ Metadata uploaded:", metadataUrl);
      return metadataUrl;

    } catch (error) {
      console.error("❌ Metadata upload failed:", error);
      // Return fallback metadata URI
      return `data:application/json,${encodeURIComponent(JSON.stringify({
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description
      }))}`;
    }
  }

  /**
   * Upload image to storage service
   */
  private async uploadImage(imageFile: File): Promise<string> {
    // TODO: Implement actual image upload to IPFS/Arweave/CDN
    console.log("📸 Uploading image:", imageFile.name);
    
    // For now, return a placeholder URL
    // In production, this would upload to IPFS, Arweave, or your CDN
    return `https://apeout-images.com/${Date.now()}-${imageFile.name}`;
  }

  /**
   * Upload JSON metadata to storage service
   */
  private async uploadJson(metadata: any): Promise<string> {
    // TODO: Implement actual JSON upload to IPFS/Arweave
    console.log("📄 Uploading metadata JSON");
    
    // For now, return a data URI
    // In production, this would upload to IPFS or Arweave
    return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
  }

  /**
   * Get launch information for a token
   */
  async getLaunchInfo(tokenMint: PublicKey): Promise<LaunchedTokenInfo | null> {
    try {
      const { state } = this.context;

      if (!state.anchorReady || !state.anchorPrograms?.tokenLauncher) {
        return null;
      }

      const [launchDataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('launch_data'), tokenMint.toBuffer()],
        state.anchorPrograms.tokenLauncher.programId
      );

      const launchData = await state.anchorPrograms.tokenLauncher.account.launchData.fetch(launchDataPDA);

      return {
        creator: launchData.creator,
        tokenMint: launchData.tokenMint,
        name: launchData.name,
        symbol: launchData.symbol,
        uri: launchData.uri,
        initialSupply: launchData.initialSupply.toNumber(),
        lpSolAmount: launchData.lpSolAmount.toNumber(),
        lpTokenAmount: launchData.lpTokenAmount.toNumber(),
        launchTime: launchData.launchTime
      };

    } catch (error) {
      console.error("Error getting launch info:", error);
      return null;
    }
  }

  /**
   * Get all tokens launched by a specific creator
   */
  async getTokensByCreator(creator: PublicKey): Promise<LaunchedTokenInfo[]> {
    try {
      const { state } = this.context;

      if (!state.anchorReady || !state.anchorPrograms?.tokenLauncher) {
        return [];
      }

      // Get all launch data accounts for this creator
      const accounts = await state.anchorPrograms.tokenLauncher.account.launchData.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: creator.toBase58()
          }
        }
      ]);

      return accounts.map((account: any) => ({
        creator: account.account.creator,
        tokenMint: account.account.tokenMint,
        name: account.account.name,
        symbol: account.account.symbol,
        uri: account.account.uri,
        initialSupply: account.account.initialSupply.toNumber(),
        lpSolAmount: account.account.lpSolAmount.toNumber(),
        lpTokenAmount: account.account.lpTokenAmount.toNumber(),
        launchTime: account.account.launchTime
      }));

    } catch (error) {
      console.error("Error getting tokens by creator:", error);
      return [];
    }
  }

  /**
   * Get all launched tokens (most recent first)
   */
  async getAllLaunchedTokens(limit: number = 50): Promise<LaunchedTokenInfo[]> {
    try {
      const { state } = this.context;

      if (!state.anchorReady || !state.anchorPrograms?.tokenLauncher) {
        return [];
      }

      const accounts = await state.anchorPrograms.tokenLauncher.account.launchData.all();

      return accounts
        .map((account: any) => ({
          creator: account.account.creator,
          tokenMint: account.account.tokenMint,
          name: account.account.name,
          symbol: account.account.symbol,
          uri: account.account.uri,
          initialSupply: account.account.initialSupply.toNumber(),
          lpSolAmount: account.account.lpSolAmount.toNumber(),
          lpTokenAmount: account.account.lpTokenAmount.toNumber(),
          launchTime: account.account.launchTime
        }))
        .sort((a: LaunchedTokenInfo, b: LaunchedTokenInfo) => b.launchTime - a.launchTime) // Most recent first
        .slice(0, limit);

    } catch (error) {
      console.error("Error getting all launched tokens:", error);
      return [];
    }
  }

  /**
   * Estimate launch cost with fair tokenomics info
   */
  getLaunchCost(): { solCost: number; breakdown: any } {
    // Base costs for accounts and LP
    const accountCreationCost = 0.01; // SOL for account creation
    const minimumLPSol = 0.02; // Minimum SOL for LP
    const platformFee = 0.005; // Platform fee

    return {
      solCost: accountCreationCost + minimumLPSol + platformFee,
      breakdown: {
        accountCreation: accountCreationCost,
        minimumLP: minimumLPSol,
        platformFee: platformFee,
        total: accountCreationCost + minimumLPSol + platformFee,
        tokenomicsNote: "95-99% of tokens go to LP for fair trading (creator gets 1-5%)"
      }
    };
  }
}

// Hook to use the token launcher service
export const useTokenLauncher = () => {
  const context = useAppContext();
  const { connection } = useConnection();
  const wallet = useWallet();

  return new TokenLauncherService(context, connection, wallet);
};