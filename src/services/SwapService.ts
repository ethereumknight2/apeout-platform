import { BN } from '@coral-xyz/anchor';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { AnchorPrograms } from '../anchor/programs';
import { PDAHelper } from '../anchor/pdas';

export class SwapService {
  constructor(private programs: AnchorPrograms) {}

  async initializeSwapPool(
    tokenMint: PublicKey,
    tokenAmount: number,
    solAmount: number,
    creatorTokenAccount: PublicKey,
    custodyProgram: PublicKey
  ) {
    const [swapPoolPDA] = await PDAHelper.getSwapPoolPDA(tokenMint);
    const [lpMintPDA] = await PDAHelper.getLPMintPDA(tokenMint);
    const [poolTokenAccountPDA] = await PDAHelper.getPoolTokenAccountPDA(tokenMint);
    const [poolSolAccountPDA] = await PDAHelper.getPoolSolAccountPDA(tokenMint);
    const [custodyLPAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('custody_lp'), tokenMint.toBuffer()],
      custodyProgram
    );

    return this.programs.apeoutSwap.methods
      .initSwapPool(new BN(tokenAmount), new BN(solAmount))
      .accounts({
        swapPool: swapPoolPDA,
        tokenMint,
        lpMint: lpMintPDA,
        creatorTokenAccount,
        poolTokenAccount: poolTokenAccountPDA,
        poolSolAccount: poolSolAccountPDA,
        custodyLpAccount: custodyLPAccountPDA,
        custodyProgram,
        creator: this.programs.apeoutSwap.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
  }

  async executeSwap(
    tokenMint: PublicKey,
    amountIn: number,
    minimumAmountOut: number,
    isSolToToken: boolean,
    userTokenAccount: PublicKey
  ) {
    const [swapPoolPDA] = await PDAHelper.getSwapPoolPDA(tokenMint);
    const [poolTokenAccountPDA] = await PDAHelper.getPoolTokenAccountPDA(tokenMint);
    const [poolSolAccountPDA] = await PDAHelper.getPoolSolAccountPDA(tokenMint);

    return this.programs.apeoutSwap.methods
      .executeSwap(new BN(amountIn), new BN(minimumAmountOut), isSolToToken)
      .accounts({
        swapPool: swapPoolPDA,
        poolTokenAccount: poolTokenAccountPDA,
        poolSolAccount: poolSolAccountPDA,
        userTokenAccount,
        user: this.programs.apeoutSwap.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      });
  }

  async getPrice(tokenMint: PublicKey) {
    const [swapPoolPDA] = await PDAHelper.getSwapPoolPDA(tokenMint);
    
    return this.programs.apeoutSwap.methods
      .getPrice()
      .accounts({
        swapPool: swapPoolPDA,
      });
  }

  async getSwapPoolData(tokenMint: PublicKey) {
    const [swapPoolPDA] = await PDAHelper.getSwapPoolPDA(tokenMint);
    return this.programs.apeoutSwap.account.swapPool.fetch(swapPoolPDA);
  }

  async addLiquidity(
    tokenMint: PublicKey,
    tokenAmount: number,
    solAmount: number,
    minLpTokens: number,
    userTokenAccount: PublicKey,
    userLpAccount: PublicKey
  ) {
    const [swapPoolPDA] = await PDAHelper.getSwapPoolPDA(tokenMint);
    const [lpMintPDA] = await PDAHelper.getLPMintPDA(tokenMint);
    const [poolTokenAccountPDA] = await PDAHelper.getPoolTokenAccountPDA(tokenMint);
    const [poolSolAccountPDA] = await PDAHelper.getPoolSolAccountPDA(tokenMint);

    return this.programs.apeoutSwap.methods
      .addLiquidity(new BN(tokenAmount), new BN(solAmount), new BN(minLpTokens))
      .accounts({
        swapPool: swapPoolPDA,
        lpMint: lpMintPDA,
        poolTokenAccount: poolTokenAccountPDA,
        poolSolAccount: poolSolAccountPDA,
        userTokenAccount,
        userLpAccount,
        user: this.programs.apeoutSwap.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      });
  }
}