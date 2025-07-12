use anchor_lang::prelude::*;

declare_id!("BHYV3jQD32izKpfatST8kVtJ6Mcdwe9S7xgUDBUkQaqU");

#[program]
pub mod fee_rewards {
    use super::*;

    pub fn initialize_rewards_pool(ctx: Context<InitializePool>, day_id: u64) -> Result<()> {
        let pool = &mut ctx.accounts.rewards_pool;
        pool.day_id = day_id;
        pool.total_rewards = 0;
        pool.total_volume = 0;
        pool.bump = *ctx.bumps.get("rewards_pool").unwrap();
        Ok(())
    }

    /// NEW: Split trading fees 3 ways - holders, games, platform
    pub fn record_trade_fee(
        ctx: Context<RecordFee>,
        fee_amount: u64,
        trade_volume: u64
    ) -> Result<()> {
        // Split: 75% holders, 15% games, 10% platform
        let holder_cut = fee_amount * 75 / 100;
        let game_cut = fee_amount * 15 / 100;
        let platform_cut = fee_amount - holder_cut - game_cut; // remaining 10%

        // 1. Add to holders reward pool
        let rewards_pool = &mut ctx.accounts.rewards_pool;
        rewards_pool.total_rewards += holder_cut;
        rewards_pool.total_volume += trade_volume;

        // 2. Add to daily game reward vault
        let game_vault = &mut ctx.accounts.daily_game_vault;
        game_vault.total_rewards += game_cut;

        // 3. Transfer to platform treasury
        **ctx.accounts.platform_wallet.try_borrow_mut_lamports()? += platform_cut;

        msg!("Fee split: {}% holders ({}), {}% games ({}), {}% platform ({})", 
             75, holder_cut, 15, game_cut, 10, platform_cut);

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimReward>, user_token_balance: u64, total_supply: u64, apeout_staked: u64) -> Result<()> {
        if ctx.accounts.claim_record.claimed {
            return Err(FeeRewardError::AlreadyClaimed.into());
        }

        let base_share = (user_token_balance as u128)
            .checked_mul(ctx.accounts.rewards_pool.total_rewards as u128)
            .unwrap()
            / (total_supply as u128);

        let multiplier = get_multiplier(apeout_staked);
        let boosted = (base_share as f64 * multiplier) as u64;

        ctx.accounts.claim_record.claimed = true;
        ctx.accounts.claim_record.amount = boosted;

        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += boosted;
        **ctx.accounts.rewards_pool.to_account_info().try_borrow_mut_lamports()? -= boosted;

        Ok(())
    }
}

fn get_multiplier(staked: u64) -> f64 {
    if staked >= 5000_000000 { 2.0 }
    else if staked >= 1000_000000 { 1.5 }
    else if staked >= 100_000000 { 1.1 }
    else { 1.0 }
}

#[derive(Accounts)]
#[instruction(day_id: u64)]
pub struct InitializePool<'info> {
    #[account(init, payer = payer, seeds = [b"reward", day_id.to_le_bytes().as_ref()], bump, space = 8 + 8 + 8 + 8 + 1)]
    pub rewards_pool: Account<'info, RewardsPool>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordFee<'info> {
    #[account(mut, seeds = [b"reward", rewards_pool.day_id.to_le_bytes().as_ref()], bump = rewards_pool.bump)]
    pub rewards_pool: Account<'info, RewardsPool>,
    
    #[account(mut, seeds = [b"daily_game", rewards_pool.day_id.to_le_bytes().as_ref()], bump)]
    pub daily_game_vault: Account<'info, DailyGameVault>,
    
    /// CHECK: This is a platform-owned treasury account
    #[account(mut)]
    pub platform_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut, seeds = [b"reward", rewards_pool.day_id.to_le_bytes().as_ref()], bump = rewards_pool.bump)]
    pub rewards_pool: Account<'info, RewardsPool>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        seeds = [b"claim", rewards_pool.key().as_ref(), user.key().as_ref()],
        bump,
        space = 8 + 1 + 8
    )]
    pub claim_record: Account<'info, ClaimRecord>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct RewardsPool {
    pub day_id: u64,
    pub total_rewards: u64,
    pub total_volume: u64,
    pub bump: u8,
}

#[account]
pub struct DailyGameVault {
    pub day_id: u64,
    pub total_rewards: u64,
    pub bump: u8,
}

#[account]
pub struct ClaimRecord {
    pub claimed: bool,
    pub amount: u64,
}

#[error_code]
pub enum FeeRewardError {
    #[msg("Reward already claimed")]
    AlreadyClaimed,
}