use anchor_lang::prelude::*;

declare_id!("FWVc9huqjX9XbPJ8BZ1KFmz572pyqXRtsF5gFRVTEx97");


#[program]
pub mod category_tracker {
    use super::*;

    /// Initialize daily tracking for a specific day
    pub fn initialize_day_tracking(ctx: Context<InitializeDayTracking>, day_id: u64) -> Result<()> {
        let tracker = &mut ctx.accounts.daily_tracker;
        tracker.day_id = day_id;
        tracker.bump = *ctx.bumps.get("daily_tracker").unwrap();
        
        // Initialize all category leaders as None
        tracker.most_traded_token_leader = None;
        tracker.most_traded_volume = 0;
        tracker.lp_mvp_leader = None;
        tracker.lp_mvp_amount = 0;
        tracker.early_buyer_leader = None;
        tracker.early_buyer_points = 0;
        tracker.smart_money_leader = None;
        tracker.smart_money_win_rate = 0;
        tracker.profit_champion_leader = None;
        tracker.profit_champion_amount = 0;
        
        msg!("Day tracking initialized for day {}", day_id);
        Ok(())
    }

    /// Initialize token volume tracker
    pub fn initialize_token_tracker(
        ctx: Context<InitializeTokenTracker>,
        token_mint: Pubkey,
        creator: Pubkey
    ) -> Result<()> {
        let tracker = &mut ctx.accounts.token_volume_tracker;
        tracker.token_mint = token_mint;
        tracker.creator = creator;
        tracker.total_volume = 0;
        tracker.unique_traders = 0;
        
        msg!("Token tracker initialized for {} (creator: {})", token_mint, creator);
        Ok(())
    }

    /// Initialize LP tracker
    pub fn initialize_lp_tracker(
        ctx: Context<InitializeLPTracker>,
        lp_provider: Pubkey,
        day_id: u64
    ) -> Result<()> {
        let tracker = &mut ctx.accounts.lp_tracker;
        tracker.provider = lp_provider;
        tracker.total_liquidity = 0;
        tracker.pools_count = 0;
        tracker.day_id = day_id;
        
        msg!("LP tracker initialized for {} on day {}", lp_provider, day_id);
        Ok(())
    }

    /// Initialize early buy tracker
    pub fn initialize_early_buy_tracker(
        ctx: Context<InitializeEarlyBuyTracker>,
        buyer: Pubkey,
        token_mint: Pubkey,
        day_id: u64
    ) -> Result<()> {
        let tracker = &mut ctx.accounts.early_buy_tracker;
        tracker.buyer = buyer;
        tracker.token_mint = token_mint;
        tracker.purchase_order = 0;
        tracker.total_points = 0;
        tracker.day_id = day_id;
        
        msg!("Early buy tracker initialized for {} on token {} day {}", buyer, token_mint, day_id);
        Ok(())
    }

    /// Initialize trading tracker
    pub fn initialize_trading_tracker(
        ctx: Context<InitializeTradingTracker>,
        trader: Pubkey,
        day_id: u64
    ) -> Result<()> {
        let tracker = &mut ctx.accounts.trading_tracker;
        tracker.trader = trader;
        tracker.wins = 0;
        tracker.losses = 0;
        tracker.win_rate = 0;
        tracker.total_profit = 0;
        tracker.total_loss = 0;
        tracker.day_id = day_id;
        
        msg!("Trading tracker initialized for {} on day {}", trader, day_id);
        Ok(())
    }

    /// Initialize profit tracker
    pub fn initialize_profit_tracker(
        ctx: Context<InitializeProfitTracker>,
        trader: Pubkey,
        day_id: u64
    ) -> Result<()> {
        let tracker = &mut ctx.accounts.profit_tracker;
        tracker.trader = trader;
        tracker.total_spent = 0;
        tracker.total_received = 0;
        tracker.net_profit = 0;
        tracker.day_id = day_id;
        
        msg!("Profit tracker initialized for {} on day {}", trader, day_id);
        Ok(())
    }

    /// Track token creation and trading volume for Most Traded Token category
    pub fn record_token_trade(
        ctx: Context<RecordTokenTrade>,
        volume_delta: u64
    ) -> Result<()> {
        let token_tracker = &mut ctx.accounts.token_volume_tracker;
        let daily_tracker = &mut ctx.accounts.daily_tracker;
        
        // Update token-specific volume
        token_tracker.total_volume += volume_delta;
        
        // Update daily leaderboard if this is now the highest
        if token_tracker.total_volume > daily_tracker.most_traded_volume {
            daily_tracker.most_traded_token_leader = Some(token_tracker.creator);
            daily_tracker.most_traded_volume = token_tracker.total_volume;
        }
        
        msg!("Token {} volume updated: {} (creator: {})", 
             token_tracker.token_mint, token_tracker.total_volume, token_tracker.creator);
        Ok(())
    }

    /// Track LP provision for LP MVP category
    pub fn record_lp_provision(
        ctx: Context<RecordLPProvision>,
        liquidity_added: u64
    ) -> Result<()> {
        let lp_tracker = &mut ctx.accounts.lp_tracker;
        let daily_tracker = &mut ctx.accounts.daily_tracker;
        
        // Update LP provider's total
        lp_tracker.total_liquidity += liquidity_added;
        
        // Update daily leaderboard if this is now the highest
        if lp_tracker.total_liquidity > daily_tracker.lp_mvp_amount {
            daily_tracker.lp_mvp_leader = Some(lp_tracker.provider);
            daily_tracker.lp_mvp_amount = lp_tracker.total_liquidity;
        }
        
        msg!("LP added: {} by {} (total: {})", 
             liquidity_added, lp_tracker.provider, lp_tracker.total_liquidity);
        Ok(())
    }

    /// Track early buying for Early Buyer category
    pub fn record_early_buy(
        ctx: Context<RecordEarlyBuy>,
        purchase_order: u32
    ) -> Result<()> {
        let early_tracker = &mut ctx.accounts.early_buy_tracker;
        let daily_tracker = &mut ctx.accounts.daily_tracker;
        
        // Only count if within first 10 buyers
        require!(purchase_order <= 10, CategoryError::TooLateForEarlyBuyer);
        
        // Calculate points: 1st buyer = 10 points, 10th buyer = 1 point
        let points = 11 - purchase_order;
        
        early_tracker.purchase_order = purchase_order;
        early_tracker.total_points += points;
        
        // Update daily leaderboard if this buyer now has the most points
        if early_tracker.total_points > daily_tracker.early_buyer_points {
            daily_tracker.early_buyer_leader = Some(early_tracker.buyer);
            daily_tracker.early_buyer_points = early_tracker.total_points;
        }
        
        msg!("Early buyer #{} for token {}: {} (+{} points, total: {})", 
             purchase_order, early_tracker.token_mint, early_tracker.buyer, 
             points, early_tracker.total_points);
        Ok(())
    }

    /// Track trading performance for Smart Money category
    pub fn record_trade_outcome(
        ctx: Context<RecordTradeOutcome>,
        is_profitable: bool,
        profit_loss: i64
    ) -> Result<()> {
        let trading_tracker = &mut ctx.accounts.trading_tracker;
        let daily_tracker = &mut ctx.accounts.daily_tracker;
        
        // Update trading stats
        if is_profitable {
            trading_tracker.wins += 1;
            trading_tracker.total_profit += profit_loss.abs() as u64;
        } else {
            trading_tracker.losses += 1;
            trading_tracker.total_loss += profit_loss.abs() as u64;
        }
        
        // Calculate win rate (only if minimum 5 trades)
        let total_trades = trading_tracker.wins + trading_tracker.losses;
        if total_trades >= 5 {
            let win_rate = (trading_tracker.wins * 100) / total_trades;
            trading_tracker.win_rate = win_rate;
            
            // Update daily leaderboard if this is now the highest win rate
            if win_rate > daily_tracker.smart_money_win_rate {
                daily_tracker.smart_money_leader = Some(trading_tracker.trader);
                daily_tracker.smart_money_win_rate = win_rate;
            }
        }
        
        msg!("Trade outcome for {}: {} (win rate: {}% from {} trades)", 
             trading_tracker.trader, is_profitable, trading_tracker.win_rate, total_trades);
        Ok(())
    }

    /// Track profit for Profit Champion category
    pub fn record_profit(
        ctx: Context<RecordProfit>,
        buy_amount: u64,
        sell_amount: u64
    ) -> Result<()> {
        let profit_tracker = &mut ctx.accounts.profit_tracker;
        let daily_tracker = &mut ctx.accounts.daily_tracker;
        
        // Update profit tracking
        profit_tracker.total_spent += buy_amount;
        profit_tracker.total_received += sell_amount;
        
        // Calculate net profit
        let net_profit = (profit_tracker.total_received as i64) - (profit_tracker.total_spent as i64);
        profit_tracker.net_profit = net_profit;
        
        // Update daily leaderboard if this is now the highest profit (and positive)
        if net_profit > 0 && net_profit > daily_tracker.profit_champion_amount {
            daily_tracker.profit_champion_leader = Some(profit_tracker.trader);
            daily_tracker.profit_champion_amount = net_profit;
        }
        
        msg!("Profit update for {}: {} net profit", profit_tracker.trader, net_profit);
        Ok(())
    }

    /// Get current daily leaders for integration with daily_game_vault
    pub fn get_daily_leaders(ctx: Context<GetDailyLeaders>) -> Result<DailyLeaders> {
        let tracker = &ctx.accounts.daily_tracker;
        
        Ok(DailyLeaders {
            most_traded_token: tracker.most_traded_token_leader,
            lp_mvp: tracker.lp_mvp_leader,
            early_buyer: tracker.early_buyer_leader,
            smart_money: tracker.smart_money_leader,
            profit_champion: tracker.profit_champion_leader,
        })
    }
}

// ===== ACCOUNT CONTEXTS =====

#[derive(Accounts)]
#[instruction(day_id: u64)]
pub struct InitializeDayTracking<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"daily_tracker", day_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 8 + 1 + (32 * 5) + (8 * 5) + 4
    )]
    pub daily_tracker: Account<'info, DailyTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeTokenTracker<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"token_volume", token_mint.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 8 + 4
    )]
    pub token_volume_tracker: Account<'info, TokenVolumeTracker>,
    /// CHECK: Token mint address
    pub token_mint: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lp_provider: Pubkey, day_id: u64)]
pub struct InitializeLPTracker<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"lp_tracker", lp_provider.key().as_ref(), day_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 32 + 8 + 4 + 8
    )]
    pub lp_tracker: Account<'info, LPTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(buyer: Pubkey, token_mint: Pubkey, day_id: u64)]
pub struct InitializeEarlyBuyTracker<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"early_buy", buyer.key().as_ref(), token_mint.key().as_ref(), day_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 32 + 32 + 4 + 4 + 8
    )]
    pub early_buy_tracker: Account<'info, EarlyBuyTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(trader: Pubkey, day_id: u64)]
pub struct InitializeTradingTracker<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"trading", trader.key().as_ref(), day_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 32 + 4 + 4 + 4 + 8 + 8 + 8
    )]
    pub trading_tracker: Account<'info, TradingTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(trader: Pubkey, day_id: u64)]
pub struct InitializeProfitTracker<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"profit", trader.key().as_ref(), day_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 32 + 8 + 8 + 8 + 8
    )]
    pub profit_tracker: Account<'info, ProfitTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordTokenTrade<'info> {
    #[account(mut)]
    pub token_volume_tracker: Account<'info, TokenVolumeTracker>,
    #[account(mut)]
    pub daily_tracker: Account<'info, DailyTracker>,
}

#[derive(Accounts)]
pub struct RecordLPProvision<'info> {
    #[account(mut)]
    pub lp_tracker: Account<'info, LPTracker>,
    #[account(mut)]
    pub daily_tracker: Account<'info, DailyTracker>,
}

#[derive(Accounts)]
pub struct RecordEarlyBuy<'info> {
    #[account(mut)]
    pub early_buy_tracker: Account<'info, EarlyBuyTracker>,
    #[account(mut)]
    pub daily_tracker: Account<'info, DailyTracker>,
}

#[derive(Accounts)]
pub struct RecordTradeOutcome<'info> {
    #[account(mut)]
    pub trading_tracker: Account<'info, TradingTracker>,
    #[account(mut)]
    pub daily_tracker: Account<'info, DailyTracker>,
}

#[derive(Accounts)]
pub struct RecordProfit<'info> {
    #[account(mut)]
    pub profit_tracker: Account<'info, ProfitTracker>,
    #[account(mut)]
    pub daily_tracker: Account<'info, DailyTracker>,
}

#[derive(Accounts)]
pub struct GetDailyLeaders<'info> {
    #[account(seeds = [b"daily_tracker", daily_tracker.day_id.to_le_bytes().as_ref()], bump = daily_tracker.bump)]
    pub daily_tracker: Account<'info, DailyTracker>,
}

// ===== DATA STRUCTURES =====

#[account]
pub struct DailyTracker {
    pub day_id: u64,
    pub bump: u8,
    // Category leaders
    pub most_traded_token_leader: Option<Pubkey>,
    pub most_traded_volume: u64,
    pub lp_mvp_leader: Option<Pubkey>,
    pub lp_mvp_amount: u64,
    pub early_buyer_leader: Option<Pubkey>,
    pub early_buyer_points: u32,
    pub smart_money_leader: Option<Pubkey>,
    pub smart_money_win_rate: u32,
    pub profit_champion_leader: Option<Pubkey>,
    pub profit_champion_amount: i64,
}

#[account]
pub struct TokenVolumeTracker {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub total_volume: u64,
    pub unique_traders: u32,
}

#[account]
pub struct LPTracker {
    pub provider: Pubkey,
    pub total_liquidity: u64,
    pub pools_count: u32,
    pub day_id: u64,
}

#[account]
pub struct EarlyBuyTracker {
    pub buyer: Pubkey,
    pub token_mint: Pubkey,
    pub purchase_order: u32,
    pub total_points: u32,
    pub day_id: u64,
}

#[account]
pub struct TradingTracker {
    pub trader: Pubkey,
    pub wins: u32,
    pub losses: u32,
    pub win_rate: u32,
    pub total_profit: u64,
    pub total_loss: u64,
    pub day_id: u64,
}

#[account]
pub struct ProfitTracker {
    pub trader: Pubkey,
    pub total_spent: u64,
    pub total_received: u64,
    pub net_profit: i64,
    pub day_id: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DailyLeaders {
    pub most_traded_token: Option<Pubkey>,
    pub lp_mvp: Option<Pubkey>,
    pub early_buyer: Option<Pubkey>,
    pub smart_money: Option<Pubkey>,
    pub profit_champion: Option<Pubkey>,
}

#[error_code]
pub enum CategoryError {
    #[msg("Purchase order too high for early buyer category (max 10).")]
    TooLateForEarlyBuyer,
    #[msg("Minimum 5 trades required for Smart Money category.")]
    InsufficientTrades,
}