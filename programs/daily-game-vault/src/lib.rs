use anchor_lang::prelude::*;

declare_id!("5DhpMM7Qbi7HK8H2LJJjvBqLCmasQVwqirexo61UpikF");

#[program]
pub mod daily_game_vault {
    use super::*;

    /// Initialize daily game vault for a specific day
    pub fn initialize_day(ctx: Context<InitializeDay>, day_id: u64) -> Result<()> {
        let vault = &mut ctx.accounts.daily_game_vault;
        vault.day_id = day_id;
        vault.total_rewards = 0;
        vault.bump = *ctx.bumps.get("daily_game_vault").unwrap();
        
        // Initialize all category winners as None
        vault.most_traded_token = None;
        vault.lp_mvp = None;
        vault.early_buyer = None;
        vault.smart_money = None;
        vault.profit_champion = None;

        msg!("Daily game vault initialized for day {}", day_id);
        Ok(())
    }

    /// Manual record activity (for backend updates)
    pub fn record_activity(
        ctx: Context<RecordActivity>,
        category: u8,
        participant: Pubkey,
        metric_value: u64
    ) -> Result<()> {
        let vault = &mut ctx.accounts.daily_game_vault;
        
        match category {
            0 => vault.most_traded_token = Some(participant),
            1 => vault.lp_mvp = Some(participant),
            2 => vault.early_buyer = Some(participant),
            3 => vault.smart_money = Some(participant),
            4 => vault.profit_champion = Some(participant),
            _ => return Err(GameError::InvalidCategory.into()),
        }

        msg!("Category {} winner updated: {} with value {}", category, participant, metric_value);
        Ok(())
    }

    /// Claim daily game reward for a specific category (weighted rewards)
    pub fn claim_game_reward(
        ctx: Context<ClaimGameReward>,
        category: u8
    ) -> Result<()> {
        let vault = &ctx.accounts.daily_game_vault;
        let claimer = ctx.accounts.user.key();

        // Verify the claimer is the winner for this category
        let is_winner = match category {
            0 => vault.most_traded_token == Some(claimer),
            1 => vault.lp_mvp == Some(claimer),
            2 => vault.early_buyer == Some(claimer),
            3 => vault.smart_money == Some(claimer),
            4 => vault.profit_champion == Some(claimer),
            _ => return Err(GameError::InvalidCategory.into()),
        };

        require!(is_winner, GameError::NotWinner);

        // Check if already claimed
        let claim_record = &mut ctx.accounts.claim_record;
        require!(!claim_record.claimed, GameError::AlreadyClaimed);

        // Calculate weighted reward based on category importance
        let reward_amount = match category {
            0 => vault.total_rewards * 30 / 100, // Most Traded Token: 30%
            1 => vault.total_rewards * 25 / 100, // LP MVP: 25%
            2 => vault.total_rewards * 20 / 100, // Early Buyer: 20%
            3 => vault.total_rewards * 15 / 100, // Smart Money: 15%
            4 => vault.total_rewards * 10 / 100, // Profit Champion: 10%
            _ => return Err(GameError::InvalidCategory.into()),
        };

        require!(reward_amount > 0, GameError::NoRewardsAvailable);

        // Transfer reward to winner
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += reward_amount;
        **ctx.accounts.daily_game_vault.to_account_info().try_borrow_mut_lamports()? -= reward_amount;

        // Mark as claimed
        claim_record.claimed = true;
        claim_record.category = category;
        claim_record.amount = reward_amount;
        claim_record.claim_time = Clock::get()?.unix_timestamp;

        msg!("Category {} winner {} claimed {} lamports", category, claimer, reward_amount);
        Ok(())
    }

    /// Get category winner info
    pub fn get_category_winner(
        ctx: Context<GetCategoryWinner>,
        category: u8
    ) -> Result<Option<Pubkey>> {
        let vault = &ctx.accounts.daily_game_vault;
        
        let winner = match category {
            0 => vault.most_traded_token,
            1 => vault.lp_mvp,
            2 => vault.early_buyer,
            3 => vault.smart_money,
            4 => vault.profit_champion,
            _ => return Err(GameError::InvalidCategory.into()),
        };

        Ok(winner)
    }

    /// Add rewards to the vault (called by fee_rewards contract)
    pub fn add_rewards(ctx: Context<AddRewards>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.daily_game_vault;
        vault.total_rewards += amount;
        
        msg!("Added {} rewards to daily game vault (total: {})", amount, vault.total_rewards);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(day_id: u64)]
pub struct InitializeDay<'info> {
    #[account(init, payer = payer, seeds = [b"daily_game", day_id.to_le_bytes().as_ref()], bump, space = 8 + 8 + 8 + 1 + (32 * 5))]
    pub daily_game_vault: Account<'info, DailyGameVault>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordActivity<'info> {
    #[account(mut, seeds = [b"daily_game", daily_game_vault.day_id.to_le_bytes().as_ref()], bump = daily_game_vault.bump)]
    pub daily_game_vault: Account<'info, DailyGameVault>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimGameReward<'info> {
    #[account(mut, seeds = [b"daily_game", daily_game_vault.day_id.to_le_bytes().as_ref()], bump = daily_game_vault.bump)]
    pub daily_game_vault: Account<'info, DailyGameVault>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        seeds = [b"game_claim", daily_game_vault.key().as_ref(), user.key().as_ref()],
        bump,
        space = 8 + 1 + 1 + 8 + 8
    )]
    pub claim_record: Account<'info, GameClaimRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetCategoryWinner<'info> {
    #[account(seeds = [b"daily_game", daily_game_vault.day_id.to_le_bytes().as_ref()], bump = daily_game_vault.bump)]
    pub daily_game_vault: Account<'info, DailyGameVault>,
}

#[derive(Accounts)]
pub struct AddRewards<'info> {
    #[account(mut, seeds = [b"daily_game", daily_game_vault.day_id.to_le_bytes().as_ref()], bump = daily_game_vault.bump)]
    pub daily_game_vault: Account<'info, DailyGameVault>,
    pub authority: Signer<'info>, // Should be fee_rewards program
}

#[account]
pub struct DailyGameVault {
    pub day_id: u64,
    pub total_rewards: u64,
    pub bump: u8,
    // Category winners (5 categories)
    pub most_traded_token: Option<Pubkey>, // 0: Most traded token creator - 30%
    pub lp_mvp: Option<Pubkey>,           // 1: LP MVP - 25%
    pub early_buyer: Option<Pubkey>,      // 2: Early buyer - 20%
    pub smart_money: Option<Pubkey>,      // 3: Smart Money - 15%
    pub profit_champion: Option<Pubkey>,  // 4: Profit Champion - 10%
}

#[account]
pub struct GameClaimRecord {
    pub claimed: bool,
    pub category: u8,
    pub amount: u64,
    pub claim_time: i64,
}

#[error_code]
pub enum GameError {
    #[msg("You are not the winner in this category.")]
    NotWinner,
    #[msg("Invalid reward category.")]
    InvalidCategory,
    #[msg("Reward already claimed for this category.")]
    AlreadyClaimed,
    #[msg("No rewards available in vault.")]
    NoRewardsAvailable,
}