use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint, Burn};

declare_id!("423GhdzXo7gogEHQz5Np2FfmF28P3B3acHufnU8WcHey");

#[program]
pub mod lp_custody {
    use super::*;

    /// Initialize LP vault for a new token
    pub fn initialize_lp_vault(ctx: Context<InitializeLPVault>) -> Result<()> {
        let vault = &mut ctx.accounts.lp_vault;
        vault.bump = *ctx.bumps.get("lp_vault").unwrap();
        vault.token_mint = ctx.accounts.token_mint.key();
        vault.lp_mint = Pubkey::default(); // Will be set when LP tokens are deposited
        vault.total_lp = 0;
        vault.is_active = true;
        vault.lp_available_for_claims = 0;
        vault.total_claimed = 0;
        vault.swap_pool = Pubkey::default(); // Will be set when swap pool is created
        
        msg!("LP vault initialized for token {}", vault.token_mint);
        Ok(())
    }

    /// Accept LP tokens from the swap contract (called during token launch)
    pub fn deposit_lp_from_swap(
        ctx: Context<DepositLPFromSwap>,
        lp_amount: u64
    ) -> Result<()> {
        let vault = &mut ctx.accounts.lp_vault;
        
        require!(vault.is_active, ErrorCode::TokenIsDead);
        require!(lp_amount > 0, ErrorCode::InvalidAmount);

        // If this is the first deposit, set the LP mint and swap pool
        if vault.lp_mint == Pubkey::default() {
            vault.lp_mint = ctx.accounts.lp_mint.key();
            vault.swap_pool = ctx.accounts.swap_pool.key();
        }

        // Verify the LP mint matches
        require!(vault.lp_mint == ctx.accounts.lp_mint.key(), ErrorCode::InvalidLPMint);

        // Transfer LP tokens from swap pool to custody vault
        let seeds = &[
            b"swap_pool",
            vault.token_mint.as_ref(),
            &[ctx.accounts.swap_pool.bump],
        ];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source_lp_account.to_account_info(),
                    to: ctx.accounts.vault_lp_account.to_account_info(),
                    authority: ctx.accounts.swap_pool.to_account_info(),
                },
                &[seeds],
            ),
            lp_amount,
        )?;

        vault.total_lp += lp_amount;

        msg!("Deposited {} LP tokens to custody for token {}", lp_amount, vault.token_mint);
        Ok(())
    }

    /// Regular LP deposit (for additional liquidity later)
    pub fn deposit_lp(ctx: Context<DepositLP>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.lp_vault;
        
        require!(vault.is_active, ErrorCode::TokenIsDead);
        require!(amount > 0, ErrorCode::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.from_lp_account.to_account_info(),
                    to: ctx.accounts.vault_lp_account.to_account_info(),
                    authority: ctx.accounts.from.to_account_info(),
                },
            ),
            amount,
        )?;

        vault.total_lp += amount;

        msg!("Regular LP deposit: {} tokens", amount);
        Ok(())
    }

    /// Prepare LP distribution when token is declared dead
    pub fn prepare_lp_distribution(ctx: Context<PrepareLPDistribution>) -> Result<()> {
        let tracker = &ctx.accounts.tracker;
        
        require!(tracker.status == TokenStatus::Dead, ErrorCode::TokenStillActive);
        
        // Extract values before borrowing vault mutably
        let vault_bump;
        let token_mint;
        let _lp_available_for_claims;
        
        {
            let vault = &ctx.accounts.lp_vault;
            require!(vault.lp_available_for_claims == 0, ErrorCode::AlreadyPrepared);
            vault_bump = vault.bump;
            token_mint = vault.token_mint;
            _lp_available_for_claims = vault.lp_available_for_claims;
        }

        // Get total LP tokens in vault
        let total_lp = ctx.accounts.vault_lp_account.amount;
        
        // Calculate splits: 80% to holders, 20% to platform
        let platform_fee = total_lp * 20 / 100;
        let holder_distribution = total_lp - platform_fee;

        // Burn the LP tokens to release underlying assets from swap pool
        let vault_seeds = &[
            b"vault",
            token_mint.as_ref(),
            &[vault_bump],
        ];

        // First, burn LP tokens to get underlying assets back
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    from: ctx.accounts.vault_lp_account.to_account_info(),
                    authority: ctx.accounts.lp_vault.to_account_info(),
                },
                &[vault_seeds],
            ),
            total_lp,
        )?;

        // Disable the swap pool
        let cpi_accounts = apeout_swap::cpi::accounts::DisablePool {
            swap_pool: ctx.accounts.swap_pool.to_account_info(),
            authority: ctx.accounts.lp_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.apeout_swap_program.to_account_info();
        let vault_seeds_slice: &[&[&[u8]]] = &[vault_seeds];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, vault_seeds_slice);
        
        apeout_swap::cpi::disable_pool(cpi_ctx)?;

        // After burning LP, the underlying SOL and tokens are returned to pool
        // We need to extract them and distribute

        // Transfer platform fee (20% of underlying SOL) to platform
        let pool_sol_balance = ctx.accounts.pool_sol_account.lamports();
        let platform_sol_fee = pool_sol_balance * 20 / 100;
        
        **ctx.accounts.pool_sol_account.to_account_info().try_borrow_mut_lamports()? -= platform_sol_fee;
        **ctx.accounts.platform_treasury.to_account_info().try_borrow_mut_lamports()? += platform_sol_fee;

        // Transfer platform fee (20% of underlying tokens) to platform
        let pool_token_balance = ctx.accounts.pool_token_account.amount;
        let platform_token_fee = pool_token_balance * 20 / 100;

        let swap_pool_seeds = &[
            b"swap_pool",
            token_mint.as_ref(),
            &[ctx.accounts.swap_pool.bump],
        ];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_token_account.to_account_info(),
                    to: ctx.accounts.platform_token_account.to_account_info(),
                    authority: ctx.accounts.swap_pool.to_account_info(),
                },
                &[swap_pool_seeds],
            ),
            platform_token_fee,
        )?;

        // Update vault state AFTER all operations
        let vault = &mut ctx.accounts.lp_vault;
        vault.lp_available_for_claims = holder_distribution;
        vault.is_active = false; // No more deposits allowed

        msg!("LP distribution prepared: {} LP burned, assets distributed", total_lp);
        msg!("Platform fee: {} SOL + {} tokens", platform_sol_fee, platform_token_fee);
        msg!("Available for holder claims: {} (value equivalent)", holder_distribution);

        Ok(())
    }

    /// Allow individual holders to claim their share of underlying assets
    pub fn claim_holder_lp(
        ctx: Context<ClaimHolderLP>, 
        holder_token_balance_at_death: u64,
        total_supply_at_death: u64
    ) -> Result<()> {
        let vault = &ctx.accounts.lp_vault;
        let claim_record = &mut ctx.accounts.claim_record;
        
        require!(!claim_record.claimed, ErrorCode::AlreadyClaimed);
        require!(vault.lp_available_for_claims > 0, ErrorCode::NoLPAvailable);
        require!(holder_token_balance_at_death > 0, ErrorCode::NoTokensAtDeath);

        // Calculate holder's proportional share of remaining assets
        let holder_share_percentage = (holder_token_balance_at_death as u128 * 100) / total_supply_at_death as u128;
        
        // Get current balances in the pool (after platform fee was taken)
        let pool_sol_balance = ctx.accounts.pool_sol_account.lamports();
        let pool_token_balance = ctx.accounts.pool_token_account.amount;

        // Calculate holder's share of SOL and tokens
        let holder_sol_share = (pool_sol_balance as u128 * holder_share_percentage / 100) as u64;
        let holder_token_share = (pool_token_balance as u128 * holder_share_percentage / 100) as u64;

        require!(holder_sol_share > 0 || holder_token_share > 0, ErrorCode::ShareTooSmall);

        // Transfer SOL to holder
        if holder_sol_share > 0 {
            **ctx.accounts.pool_sol_account.to_account_info().try_borrow_mut_lamports()? -= holder_sol_share;
            **ctx.accounts.holder.to_account_info().try_borrow_mut_lamports()? += holder_sol_share;
        }

        // Transfer tokens to holder
        if holder_token_share > 0 {
            let swap_pool_seeds = &[
                b"swap_pool",
                vault.token_mint.as_ref(),
                &[ctx.accounts.swap_pool.bump],
            ];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.pool_token_account.to_account_info(),
                        to: ctx.accounts.holder_token_account.to_account_info(),
                        authority: ctx.accounts.swap_pool.to_account_info(),
                    },
                    &[swap_pool_seeds],
                ),
                holder_token_share,
            )?;
        }

        // Update claim record
        claim_record.claimed = true;
        claim_record.sol_claimed = holder_sol_share;
        claim_record.tokens_claimed = holder_token_share;
        claim_record.claim_time = Clock::get()?.unix_timestamp;

        // Update vault totals
        let vault = &mut ctx.accounts.lp_vault;
        vault.total_claimed += 1; // Count of claims, not amount

        msg!("Holder {} claimed {} SOL + {} tokens", 
             ctx.accounts.holder.key(), holder_sol_share, holder_token_share);

        Ok(())
    }

    /// Validate trade direction - block buys for dead tokens
    pub fn validate_swap(ctx: Context<ValidateSwap>, is_buy: bool) -> Result<()> {
        let tracker = &ctx.accounts.tracker;
        
        if tracker.status == TokenStatus::Dead && is_buy {
            return Err(ErrorCode::BuysDisabledForDeadToken.into());
        }
        
        // Sells are always allowed
        Ok(())
    }
}

// ===== ACCOUNT CONTEXTS =====

#[derive(Accounts)]
pub struct InitializeLPVault<'info> {
    #[account(
        init, 
        payer = payer, 
        seeds = [b"vault", token_mint.key().as_ref()], 
        bump, 
        space = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 32 + 1
    )]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositLPFromSwap<'info> {
    #[account(
        mut, 
        seeds = [b"vault", token_mint.key().as_ref()], 
        bump = lp_vault.bump
    )]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    pub lp_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub source_lp_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = lp_mint,
        token::authority = lp_vault,
    )]
    pub vault_lp_account: Account<'info, TokenAccount>,
    
    #[account(seeds = [b"swap_pool", token_mint.key().as_ref()], bump)]
    pub swap_pool: Account<'info, SwapPool>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositLP<'info> {
    #[account(mut, seeds = [b"vault", token_mint.key().as_ref()], bump = lp_vault.bump)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub from: Signer<'info>,
    #[account(mut)]
    pub from_lp_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_lp_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PrepareLPDistribution<'info> {
    #[account(mut, seeds = [b"vault", token_mint.key().as_ref()], bump = lp_vault.bump)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    pub lp_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub vault_lp_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool SOL account
    #[account(mut)]
    pub pool_sol_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub platform_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Platform treasury SOL account
    #[account(mut)]
    pub platform_treasury: AccountInfo<'info>,
    
    #[account(mut, seeds = [b"swap_pool", token_mint.key().as_ref()], bump)]
    pub swap_pool: Account<'info, SwapPool>,
    
    #[account(seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    
    /// CHECK: ApeOut swap program
    pub apeout_swap_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimHolderLP<'info> {
    #[account(seeds = [b"vault", token_mint.key().as_ref()], bump = lp_vault.bump)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool SOL account
    #[account(mut)]
    pub pool_sol_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub holder_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub holder: Signer<'info>,
    
    #[account(
        init,
        payer = holder,
        seeds = [b"claim", token_mint.key().as_ref(), holder.key().as_ref()],
        bump,
        space = 8 + 1 + 8 + 8 + 8
    )]
    pub claim_record: Account<'info, ClaimRecord>,
    
    #[account(seeds = [b"swap_pool", token_mint.key().as_ref()], bump)]
    pub swap_pool: Account<'info, SwapPool>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateSwap<'info> {
    #[account(seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_mint: Account<'info, Mint>,
}

// ===== DATA STRUCTURES =====

#[account]
pub struct LPVault {
    pub token_mint: Pubkey,            // Token this vault is for
    pub lp_mint: Pubkey,               // LP token mint (set when first deposit)
    pub bump: u8,                      // PDA bump
    pub total_lp: u64,                 // Total LP tokens held
    pub is_active: bool,               // Whether vault accepts deposits
    pub lp_available_for_claims: u64,  // LP equivalent available for claims
    pub total_claimed: u64,            // Number of successful claims
    pub swap_pool: Pubkey,             // Associated swap pool
}

#[account]
pub struct ClaimRecord {
    pub claimed: bool,                 // Whether user has claimed
    pub sol_claimed: u64,              // Amount of SOL claimed
    pub tokens_claimed: u64,           // Amount of tokens claimed
    pub claim_time: i64,               // When claim was made
}

// External account structures (imported from other programs)
#[account]
pub struct ProjectTracker {
    pub token_mint: Pubkey,
    pub launch_time: i64,
    pub last_trade_ts: i64,
    pub volume_3d: u64,
    pub ath_price: u64,
    pub current_price: u64,
    pub status: TokenStatus,
    pub death_snapshot_time: i64,
}

#[account]
pub struct SwapPool {
    pub token_mint: Pubkey,
    pub token_reserve: u64,
    pub sol_reserve: u64,
    pub lp_mint: Pubkey,
    pub total_lp_supply: u64,
    pub fee_rate: u16,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TokenStatus {
    Active,
    Warning,
    Dead,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Token is already marked as dead.")]
    TokenIsDead,
    #[msg("Token is still active and cannot have LP distributed.")]
    TokenStillActive,
    #[msg("Buys are disabled for dead tokens. Sells are still allowed.")]
    BuysDisabledForDeadToken,
    #[msg("LP distribution already prepared.")]
    AlreadyPrepared,
    #[msg("Already claimed LP rewards.")]
    AlreadyClaimed,
    #[msg("No LP available for claims.")]
    NoLPAvailable,
    #[msg("User held no tokens at time of death.")]
    NoTokensAtDeath,
    #[msg("Calculated share is too small.")]
    ShareTooSmall,
    #[msg("Insufficient LP in vault for this claim.")]
    InsufficientLP,
    #[msg("Invalid amount provided.")]
    InvalidAmount,
    #[msg("LP mint does not match vault configuration.")]
    InvalidLPMint,
}