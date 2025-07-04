use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("LPCustody1111111111111111111111111111111111111");

#[program]
pub mod lp_custody {
    use super::*;

    pub fn initialize_lp_vault(ctx: Context<InitializeLPVault>) -> Result<()> {
        ctx.accounts.lp_vault.bump = *ctx.bumps.get("lp_vault").unwrap();
        ctx.accounts.lp_vault.token_mint = ctx.accounts.token_mint.key();
        ctx.accounts.lp_vault.total_lp = 0;
        ctx.accounts.lp_vault.is_active = true;
        ctx.accounts.lp_vault.lp_available_for_claims = 0;
        ctx.accounts.lp_vault.total_claimed = 0;
        Ok(())
    }

    pub fn deposit_lp(ctx: Context<DepositLP>, amount: u64) -> Result<()> {
        require!(ctx.accounts.lp_vault.is_active, ErrorCode::TokenIsDead);

        token::transfer(
            ctx.accounts
                .transfer_context()
                .with_signer(&[&[b"vault", ctx.accounts.token_mint.key().as_ref(), &[ctx.accounts.lp_vault.bump]]]),
            amount,
        )?;

        ctx.accounts.lp_vault.total_lp += amount;
        Ok(())
    }

    /// Initialize LP distribution when token is declared dead
    pub fn prepare_lp_distribution(ctx: Context<PrepareLPDistribution>) -> Result<()> {
        let tracker = &ctx.accounts.tracker;
        let lp_vault = &mut ctx.accounts.lp_vault;

        require!(tracker.status == TokenStatus::Dead, ErrorCode::TokenStillActive);
        require!(lp_vault.lp_available_for_claims == 0, ErrorCode::AlreadyPrepared);

        let total_lp = ctx.accounts.vault_token_account.amount;
        let platform_fee = total_lp * 20 / 100;
        let holder_distribution = total_lp - platform_fee;

        // Transfer platform fee immediately
        token::transfer(
            ctx.accounts
                .platform_transfer_context()
                .with_signer(&[&[b"vault", ctx.accounts.token_mint.key().as_ref(), &[ctx.accounts.lp_vault.bump]]]),
            platform_fee,
        )?;

        // Mark LP as available for claims (80% stays in vault for holder claims)
        lp_vault.lp_available_for_claims = holder_distribution;
        lp_vault.is_active = false; // No more deposits allowed

        msg!("LP distribution prepared: {} available for claims, {} sent to platform", 
             holder_distribution, platform_fee);

        Ok(())
    }

    /// Allow individual holders to claim their share of LP
    pub fn claim_holder_lp(
        ctx: Context<ClaimHolderLP>, 
        holder_token_balance_at_death: u64,
        total_supply_at_death: u64
    ) -> Result<()> {
        let lp_vault = &mut ctx.accounts.lp_vault;
        let claim_record = &mut ctx.accounts.claim_record;

        require!(!claim_record.claimed, ErrorCode::AlreadyClaimed);
        require!(lp_vault.lp_available_for_claims > 0, ErrorCode::NoLPAvailable);
        require!(holder_token_balance_at_death > 0, ErrorCode::NoTokensAtDeath);

        // Calculate holder's proportional share
        let holder_lp_share = (holder_token_balance_at_death as u128)
            .checked_mul(lp_vault.lp_available_for_claims as u128)
            .unwrap()
            .checked_div(total_supply_at_death as u128)
            .unwrap() as u64;

        require!(holder_lp_share > 0, ErrorCode::ShareTooSmall);
        require!(holder_lp_share <= lp_vault.lp_available_for_claims, ErrorCode::InsufficientLP);

        // Transfer LP tokens to holder
        token::transfer(
            ctx.accounts
                .transfer_context()
                .with_signer(&[&[b"vault", ctx.accounts.token_mint.key().as_ref(), &[ctx.accounts.lp_vault.bump]]]),
            holder_lp_share,
        )?;

        // Update records
        claim_record.claimed = true;
        claim_record.amount_claimed = holder_lp_share;
        claim_record.claim_time = Clock::get()?.unix_timestamp;

        lp_vault.lp_available_for_claims -= holder_lp_share;
        lp_vault.total_claimed += holder_lp_share;

        msg!("Holder {} claimed {} LP tokens", ctx.accounts.holder.key(), holder_lp_share);

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

#[derive(Accounts)]
#[instruction()]
pub struct InitializeLPVault<'info> {
    #[account(init, payer = payer, seeds = [b"vault", token_mint.key().as_ref()], bump, space = 8 + 96)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositLP<'info> {
    #[account(mut, seeds = [b"vault", token_mint.key().as_ref()], bump = lp_vault.bump)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub from: Signer<'info>,
    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PrepareLPDistribution<'info> {
    #[account(mut, seeds = [b"vault", token_mint.key().as_ref()], bump = lp_vault.bump)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub platform_vault: Account<'info, TokenAccount>,
    #[account(seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimHolderLP<'info> {
    #[account(mut, seeds = [b"vault", token_mint.key().as_ref()], bump = lp_vault.bump)]
    pub lp_vault: Account<'info, LPVault>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub holder_lp_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(
        init_if_needed, 
        payer = holder, 
        seeds = [b"claim", token_mint.key().as_ref(), holder.key().as_ref()], 
        bump, 
        space = 8 + 64
    )]
    pub claim_record: Account<'info, ClaimRecord>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateSwap<'info> {
    #[account(seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_mint: Account<'info, Mint>,
}

impl<'info> DepositLP<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.from_token_account.to_account_info(),
            to: self.vault_token_account.to_account_info(),
            authority: self.from.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

impl<'info> PrepareLPDistribution<'info> {
    fn platform_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.vault_token_account.to_account_info(),
            to: self.platform_vault.to_account_info(),
            authority: self.lp_vault.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

impl<'info> ClaimHolderLP<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.vault_token_account.to_account_info(),
            to: self.holder_lp_account.to_account_info(),
            authority: self.lp_vault.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

#[account]
pub struct LPVault {
    pub token_mint: Pubkey,
    pub bump: u8,
    pub total_lp: u64,
    pub is_active: bool,
    pub lp_available_for_claims: u64, // Amount available for holder claims
    pub total_claimed: u64, // Amount already claimed by holders
}

#[account]
pub struct ClaimRecord {
    pub claimed: bool,
    pub amount_claimed: u64,
    pub claim_time: i64,
}

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
}