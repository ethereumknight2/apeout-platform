use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("HkMJu6JoeV2NEF5hos9kpttBNkvEMkURJcLiEWYvaWvv");

#[program]
pub mod holder_distribution {
    use super::*;

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
        Ok(())
    }

    pub fn claim_lp(ctx: Context<ClaimLP>, user_token_balance: u64, total_supply_at_snapshot: u64) -> Result<()> {
        require!(user_token_balance > 0, ErrorCode::NothingToClaim);
        require!(ctx.accounts.distribution_state.claimed_lp < ctx.accounts.distribution_state.total_lp, ErrorCode::AllRewardsClaimed);

        let user_share = (user_token_balance as u128 * ctx.accounts.distribution_state.total_lp as u128) / total_supply_at_snapshot as u128;
        let user_share_u64 = user_share as u64;

        // Check if this is a re-initialization attempt
        if ctx.accounts.user_claim_record.claimed {
            return Err(ErrorCode::AlreadyClaimed.into());
        }

        // Get the bump value before the transfer
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
#[instruction(total_distribution: u64)]
pub struct InitializeDistribution<'info> {
    #[account(init, payer = payer, seeds = [b"dist", token_mint.key().as_ref()], bump, space = 8 + 32 + 8 + 8 + 8 + 1)]
    pub distribution_state: Account<'info, DistributionState>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
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
}

#[account]
pub struct ClaimRecord {
    pub claimed: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("User has already claimed rewards.")]
    AlreadyClaimed,
    #[msg("No rewards to claim.")]
    NothingToClaim,
    #[msg("All rewards have been claimed.")]
    AllRewardsClaimed,
}