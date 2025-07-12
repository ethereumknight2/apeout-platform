use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("HoLDERDiST1111111111111111111111111111111111");

#[program]
pub mod holder_distribution {
    use super::*;

    /// Initialize distribution from dead token LP liquidation
    pub fn initialize_from_lp_liquidation(
        ctx: Context<InitializeFromLPLiquidation>,
        total_distribution: u64,
        token_death_time: i64
    ) -> Result<()> {
        let state = &mut ctx.accounts.distribution_state;
        let lp_vault = &ctx.accounts.lp_vault;
        
        // Verify LP liquidation was triggered and LP is available
        require!(lp_vault.lp_available_for_claims > 0, ErrorCode::NoLPAvailable);
        require!(lp_vault.death_triggered_at > 0, ErrorCode::LPNotLiquidated);
        
        state.token_mint = ctx.accounts.token_mint.key();
        state.total_lp = total_distribution;
        state.claimed_lp = 0;
        state.snapshot_time = token_death_time; // Use death time as snapshot
        state.bump = *ctx.bumps.get("distribution_state").unwrap();
        state.is_from_death = true;

        msg!("Distribution initialized from dead token LP liquidation: {} LP available", total_distribution);
        
        Ok(())
    }

    pub fn initialize_distribution(
        ctx: Context<InitializeDistribution>,
        total_distribution: u64
    ) -> Result<()> {
        let state = &mut ctx.accounts.distribution_state;
        state.token_mint = ctx.accounts.token_mint.key();
        state.total_lp = total_distribution;
        state.claimed_lp = 0;
        state.snapshot_time = Clock::get()?.unix_timestamp;
        state.bump = *ctx.bumps.get("distribution_state").unwrap();
        state.is_from_death = false;
        Ok(())
    }

    /// Claim LP from dead token liquidation (uses death-time snapshot)
    pub fn claim_lp_from_dead_token(
        ctx: Context<ClaimLPFromDeadToken>, 
        user_token_balance_at_death: u64, 
        total_supply_at_death: u64
    ) -> Result<()> {
        require!(user_token_balance_at_death > 0, ErrorCode::NothingToClaim);
        require!(ctx.accounts.distribution_state.claimed_lp < ctx.accounts.distribution_state.total_lp, ErrorCode::AllRewardsClaimed);
        require!(ctx.accounts.distribution_state.is_from_death, ErrorCode::NotFromDeadToken);

        let user_share = (user_token_balance_at_death as u128 * ctx.accounts.distribution_state.total_lp as u128) / total_supply_at_death as u128;
        let user_share_u64 = user_share as u64;

        if ctx.accounts.user_claim_record.claimed {
            return Err(ErrorCode::AlreadyClaimed.into());
        }

        let bump = ctx.accounts.distribution_state.bump;
        let token_mint_key = ctx.accounts.token_mint.key();

        token::transfer(
            ctx.accounts
                .transfer_context()
                .with_signer(&[&[b"dist", token_mint_key.as_ref(), &[bump]]]),
            user_share_u64,
        )?;

        ctx.accounts.user_claim_record.claimed = true;
        ctx.accounts.user_claim_record.claimed_amount = user_share_u64;
        ctx.accounts.user_claim_record.claim_time = Clock::get()?.unix_timestamp;
        ctx.accounts.distribution_state.claimed_lp += user_share_u64;

        msg!("Dead token holder {} claimed {} LP tokens", ctx.accounts.user.key(), user_share_u64);

        Ok(())
    }

    pub fn claim_lp(ctx: Context<ClaimLP>, user_token_balance: u64, total_supply_at_snapshot: u64) -> Result<()> {
        require!(user_token_balance > 0, ErrorCode::NothingToClaim);
        require!(ctx.accounts.distribution_state.claimed_lp < ctx.accounts.distribution_state.total_lp, ErrorCode::AllRewardsClaimed);

        let user_share = (user_token_balance as u128 * ctx.accounts.distribution_state.total_lp as u128) / total_supply_at_snapshot as u128;
        let user_share_u64 = user_share as u64;

        if ctx.accounts.user_claim_record.claimed {
            return Err(ErrorCode::AlreadyClaimed.into());
        }

        let bump = ctx.accounts.distribution_state.bump;
        let token_mint_key = ctx.accounts.token_mint.key();

        token::transfer(
            ctx.accounts
                .transfer_context()
                .with_signer(&[&[b"dist", token_mint_key.as_ref(), &[bump]]]),
            user_share_u64,
        )?;

        ctx.accounts.user_claim_record.claimed = true;
        ctx.accounts.distribution_state.claimed_lp += user_share_u64;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(total_distribution: u64, token_death_time: i64)]
pub struct InitializeFromLPLiquidation<'info> {
    #[account(init, payer = payer, seeds = [b"dist", token_mint.key().as_ref()], bump, space = 8 + 32 + 8 + 8 + 8 + 1 + 1)]
    pub distribution_state: Account<'info, DistributionState>,
    pub token_mint: Account<'info, Mint>,
    #[account(seeds = [b"vault", token_mint.key().as_ref()], bump)]
    pub lp_vault: Account<'info, LPVault>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(total_distribution: u64)]
pub struct InitializeDistribution<'info> {
    #[account(init, payer = payer, seeds = [b"dist", token_mint.key().as_ref()], bump, space = 8 + 32 + 8 + 8 + 8 + 1 + 1)]
    pub distribution_state: Account<'info, DistributionState>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimLPFromDeadToken<'info> {
    #[account(mut, seeds = [b"dist", token_mint.key().as_ref()], bump = distribution_state.bump)]
    pub distribution_state: Account<'info, DistributionState>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = user,
        seeds = [b"claim", user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + 1 + 8 + 8
    )]
    pub user_claim_record: Account<'info, DeadTokenClaimRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimLP<'info> {
    #[account(mut, seeds = [b"dist", token_mint.key().as_ref()], bump = distribution_state.bump)]
    pub distribution_state: Account<'info, DistributionState>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = user,
        seeds = [b"claim", user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + 1
    )]
    pub user_claim_record: Account<'info, ClaimRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> ClaimLPFromDeadToken<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.vault_token_account.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.distribution_state.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

impl<'info> ClaimLP<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.vault_token_account.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.distribution_state.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

#[account]
pub struct DistributionState {
    pub token_mint: Pubkey,
    pub total_lp: u64,
    pub claimed_lp: u64,
    pub snapshot_time: i64,
    pub bump: u8,
    pub is_from_death: bool, // Track if this distribution is from a dead token
}

#[account]
pub struct ClaimRecord {
    pub claimed: bool,
}

#[account]
pub struct DeadTokenClaimRecord {
    pub claimed: bool,
    pub claimed_amount: u64,
    pub claim_time: i64,
}

// Reference struct for LP Vault (from lp_custody program)
#[account]
pub struct LPVault {
    pub token_mint: Pubkey,
    pub bump: u8,
    pub total_lp: u64,
    pub is_active: bool,
    pub lp_available_for_claims: u64,
    pub total_claimed: u64,
    pub death_triggered_at: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("User has already claimed rewards.")]
    AlreadyClaimed,
    #[msg("No rewards to claim.")]
    NothingToClaim,
    #[msg("All rewards have been claimed.")]
    AllRewardsClaimed,
    #[msg("No LP available for claims.")]
    NoLPAvailable,
    #[msg("LP liquidation not triggered yet.")]
    LPNotLiquidated,
    #[msg("Distribution not from dead token.")]
    NotFromDeadToken,
}