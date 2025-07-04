use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("StatusTrack1111111111111111111111111111111111111");

#[program]
pub mod project_status_tracker {
    use super::*;

    pub fn initialize_tracker(ctx: Context<InitializeTracker>) -> Result<()> {
        ctx.accounts.tracker.token_mint = ctx.accounts.token_mint.key();
        ctx.accounts.tracker.launch_time = Clock::get()?.unix_timestamp;
        ctx.accounts.tracker.volume_3d = 0;
        ctx.accounts.tracker.ath_price = 0;
        ctx.accounts.tracker.current_price = 0;
        ctx.accounts.tracker.last_trade_ts = Clock::get()?.unix_timestamp;
        ctx.accounts.tracker.status = TokenStatus::Active;
        ctx.accounts.tracker.death_snapshot_time = 0; // Track when death occurred
        Ok(())
    }

    pub fn update_stats(
        ctx: Context<UpdateStats>,
        volume_delta: u64,
        current_price: u64
    ) -> Result<()> {
        let tracker = &mut ctx.accounts.tracker;
        
        // Only update stats if token is not dead
        require!(tracker.status != TokenStatus::Dead, ErrorCode::TokenIsDead);
        
        tracker.volume_3d += volume_delta;
        tracker.current_price = current_price;

        if current_price > tracker.ath_price {
            tracker.ath_price = current_price;
        }

        tracker.last_trade_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Simplified death check: Only age + volume threshold
    pub fn check_and_flag_dead(ctx: Context<CheckAndFlagDead>) -> Result<()> {
        let tracker = &mut ctx.accounts.tracker;
        let now = Clock::get()?.unix_timestamp;

        // Skip if already dead
        if tracker.status == TokenStatus::Dead {
            return Ok(());
        }

        let age_in_seconds = now - tracker.launch_time;
        let min_age = 259_200; // 3 days in seconds
        let vol_threshold = 15_000_000_000; // 15 SOL in lamports

        // SIMPLIFIED CRITERIA: Age >= 3 days AND total volume < 15 SOL
        if age_in_seconds >= min_age && tracker.volume_3d < vol_threshold {
            tracker.status = TokenStatus::Dead;
            tracker.death_snapshot_time = now; // Record when death occurred for LP claims
            
            msg!("Token {} declared DEAD - Age: {} days, Volume: {} SOL", 
                tracker.token_mint, 
                age_in_seconds / 86400, 
                tracker.volume_3d / 1_000_000_000
            );
        } 
        // Warning if approaching death criteria
        else if age_in_seconds >= (min_age - 86400) { // 1 day before minimum age
            if tracker.volume_3d < (vol_threshold * 2) { // Within 2x of death threshold
                tracker.status = TokenStatus::Warning;
            }
        }

        Ok(())
    }

    /// Allow sells but block buys for dead tokens
    pub fn validate_trade_direction(
        ctx: Context<ValidateTrade>, 
        is_buy: bool
    ) -> Result<()> {
        let tracker = &ctx.accounts.tracker;
        
        if tracker.status == TokenStatus::Dead && is_buy {
            return Err(ErrorCode::BuysDisabledForDeadToken.into());
        }
        
        // Sells are always allowed, even for dead tokens
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeTracker<'info> {
    #[account(init, payer = payer, seeds = [b"tracker", token_mint.key().as_ref()], bump, space = 8 + 160)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStats<'info> {
    #[account(mut, seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct CheckAndFlagDead<'info> {
    #[account(mut, seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct ValidateTrade<'info> {
    #[account(seeds = [b"tracker", token_mint.key().as_ref()], bump)]
    pub tracker: Account<'info, ProjectTracker>,
    pub token_mint: Account<'info, Mint>,
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
    pub death_snapshot_time: i64, // When token was declared dead (for LP claims)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TokenStatus {
    Active,
    Warning,
    Dead,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Token is dead - no more stat updates allowed.")]
    TokenIsDead,
    #[msg("Token is dead - buys are disabled. Sells are still allowed.")]
    BuysDisabledForDeadToken,
}