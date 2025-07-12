use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint, MintTo};

declare_id!("SwApCoNtRaCt1111111111111111111111111111111");

#[program]
pub mod apeout_swap {
    use super::*;

    /// Initialize a new swap pool with immediate LP creation
    pub fn init_swap_pool(
        ctx: Context<InitSwapPool>,
        token_amount: u64,
        sol_amount: u64
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        // Extract values before borrowing issues
        let token_mint = ctx.accounts.token_mint.key();
        let lp_mint = ctx.accounts.lp_mint.key();
        let bump = *ctx.bumps.get("swap_pool").unwrap();
        
        // Transfer tokens from creator to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.pool_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // Transfer SOL from creator to pool
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? -= sol_amount;
        **ctx.accounts.pool_sol_account.to_account_info().try_borrow_mut_lamports()? += sol_amount;

        // Calculate initial LP tokens using geometric mean (sqrt(x * y))
        let initial_lp = (token_amount as f64 * sol_amount as f64).sqrt() as u64;
        
        // Create seeds for signing
        let seeds = &[
            b"swap_pool",
            token_mint.as_ref(),
            &[bump],
        ];
        
        // Mint LP tokens to custody contract (100% locked)
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.custody_lp_account.to_account_info(),
                    authority: ctx.accounts.swap_pool.to_account_info(),
                },
                &[seeds],
            ),
            initial_lp,
        )?;

        // Initialize pool data AFTER token operations
        let swap_pool = &mut ctx.accounts.swap_pool;
        swap_pool.token_mint = token_mint;
        swap_pool.token_reserve = token_amount;
        swap_pool.sol_reserve = sol_amount;
        swap_pool.lp_mint = lp_mint;
        swap_pool.total_lp_supply = initial_lp;
        swap_pool.fee_rate = 30; // 0.3% fee (30 basis points)
        swap_pool.is_active = true;
        swap_pool.created_at = clock.unix_timestamp;
        swap_pool.bump = bump;

        msg!("Swap pool initialized: {} tokens, {} SOL, {} LP tokens minted",
             token_amount, sol_amount, initial_lp);

        Ok(())
    }

    /// Execute a swap (SOL -> Token or Token -> SOL)
    pub fn execute_swap(
        ctx: Context<ExecuteSwap>,
        amount_in: u64,
        minimum_amount_out: u64,
        is_sol_to_token: bool
    ) -> Result<()> {
        require!(amount_in > 0, SwapError::InvalidAmount);

        // Extract values before borrowing issues
        let token_mint;
        let bump;
        let sol_reserve;
        let token_reserve;
        let fee_rate;
        let _is_active;
        
        {
            let swap_pool = &ctx.accounts.swap_pool;
            require!(swap_pool.is_active, SwapError::PoolInactive);
            
            token_mint = swap_pool.token_mint;
            bump = swap_pool.bump;
            sol_reserve = swap_pool.sol_reserve;
            token_reserve = swap_pool.token_reserve;
            fee_rate = swap_pool.fee_rate;
            _is_active = swap_pool.is_active;
        }

        let (amount_out, fee_amount) = if is_sol_to_token {
            // SOL -> Token swap
            let amount_out = calculate_swap_output(
                amount_in,
                sol_reserve,
                token_reserve,
                fee_rate
            )?;
            
            require!(amount_out >= minimum_amount_out, SwapError::SlippageExceeded);
            require!(amount_out <= token_reserve, SwapError::InsufficientLiquidity);

            // Transfer SOL from user to pool
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? -= amount_in;
            **ctx.accounts.pool_sol_account.to_account_info().try_borrow_mut_lamports()? += amount_in;

            // Create seeds for signing
            let seeds = &[
                b"swap_pool",
                token_mint.as_ref(),
                &[bump],
            ];

            // Transfer tokens from pool to user
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.pool_token_account.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.swap_pool.to_account_info(),
                    },
                    &[seeds],
                ),
                amount_out,
            )?;

            (amount_out, amount_in * (fee_rate as u64) / 10000)
        } else {
            // Token -> SOL swap
            let amount_out = calculate_swap_output(
                amount_in,
                token_reserve,
                sol_reserve,
                fee_rate
            )?;

            require!(amount_out >= minimum_amount_out, SwapError::SlippageExceeded);
            require!(amount_out <= sol_reserve, SwapError::InsufficientLiquidity);

            // Transfer tokens from user to pool
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token_account.to_account_info(),
                        to: ctx.accounts.pool_token_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
            )?;

            // Transfer SOL from pool to user
            **ctx.accounts.pool_sol_account.to_account_info().try_borrow_mut_lamports()? -= amount_out;
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount_out;

            (amount_out, amount_in * (fee_rate as u64) / 10000)
        };

        // Update reserves AFTER all token operations
        let swap_pool = &mut ctx.accounts.swap_pool;
        if is_sol_to_token {
            swap_pool.sol_reserve += amount_in;
            swap_pool.token_reserve -= amount_out;
        } else {
            swap_pool.token_reserve += amount_in;
            swap_pool.sol_reserve -= amount_out;
        }

        msg!("Swap executed: {} in, {} out, {} fee", amount_in, amount_out, fee_amount);

        Ok(())
    }

    /// Get current token price in SOL
    pub fn get_price(ctx: Context<GetPrice>) -> Result<u64> {
        let swap_pool = &ctx.accounts.swap_pool;
        
        if swap_pool.token_reserve == 0 {
            return Ok(0);
        }

        // Price = SOL reserve / Token reserve (scaled by 1e9 for precision)
        let price = (swap_pool.sol_reserve as u128 * 1_000_000_000) / swap_pool.token_reserve as u128;
        
        Ok(price as u64)
    }

    /// Add liquidity to existing pool (for future use)
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        token_amount: u64,
        sol_amount: u64,
        min_lp_tokens: u64
    ) -> Result<()> {
        require!(token_amount > 0 && sol_amount > 0, SwapError::InvalidAmount);

        // Extract values before borrowing issues
        let token_mint;
        let bump;
        let total_lp_supply;
        let token_reserve;
        let sol_reserve;
        
        {
            let swap_pool = &ctx.accounts.swap_pool;
            require!(swap_pool.is_active, SwapError::PoolInactive);
            
            token_mint = swap_pool.token_mint;
            bump = swap_pool.bump;
            total_lp_supply = swap_pool.total_lp_supply;
            token_reserve = swap_pool.token_reserve;
            sol_reserve = swap_pool.sol_reserve;
        }

        // Calculate LP tokens to mint based on current reserves
        let lp_tokens = if total_lp_supply == 0 {
            (token_amount as f64 * sol_amount as f64).sqrt() as u64
        } else {
            std::cmp::min(
                (token_amount as u128 * total_lp_supply as u128 / token_reserve as u128) as u64,
                (sol_amount as u128 * total_lp_supply as u128 / sol_reserve as u128) as u64,
            )
        };

        require!(lp_tokens >= min_lp_tokens, SwapError::SlippageExceeded);

        // Transfer tokens and SOL
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            token_amount,
        )?;

        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? -= sol_amount;
        **ctx.accounts.pool_sol_account.to_account_info().try_borrow_mut_lamports()? += sol_amount;

        // Create seeds for signing
        let seeds = &[
            b"swap_pool",
            token_mint.as_ref(),
            &[bump],
        ];

        // Mint LP tokens to user
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.user_lp_account.to_account_info(),
                    authority: ctx.accounts.swap_pool.to_account_info(),
                },
                &[seeds],
            ),
            lp_tokens,
        )?;

        // Update reserves and supply
        let swap_pool = &mut ctx.accounts.swap_pool;
        swap_pool.token_reserve += token_amount;
        swap_pool.sol_reserve += sol_amount;
        swap_pool.total_lp_supply += lp_tokens;

        msg!("Liquidity added: {} tokens, {} SOL, {} LP tokens", 
             token_amount, sol_amount, lp_tokens);

        Ok(())
    }

    /// Disable pool (called when token dies)
    pub fn disable_pool(ctx: Context<DisablePool>) -> Result<()> {
        let swap_pool = &mut ctx.accounts.swap_pool;
        swap_pool.is_active = false;
        
        msg!("Pool disabled for token {}", swap_pool.token_mint);
        Ok(())
    }
}

// Helper function to calculate swap output using constant product formula
fn calculate_swap_output(
    amount_in: u64,
    reserve_in: u64,
    reserve_out: u64,
    fee_rate: u16
) -> Result<u64> {
    require!(reserve_in > 0 && reserve_out > 0, SwapError::InsufficientLiquidity);
    
    // Apply fee (fee_rate is in basis points, e.g., 30 = 0.3%)
    let amount_in_with_fee = amount_in * (10000 - fee_rate as u64) / 10000;
    
    // Constant product formula: (x + dx) * (y - dy) = x * y
    // Solving for dy: dy = y * dx / (x + dx)
    let amount_out = (reserve_out as u128 * amount_in_with_fee as u128) 
        / (reserve_in as u128 + amount_in_with_fee as u128);
    
    Ok(amount_out as u64)
}

// ===== ACCOUNT CONTEXTS =====

#[derive(Accounts)]
pub struct InitSwapPool<'info> {
    #[account(
        init,
        payer = creator,
        seeds = [b"swap_pool", token_mint.key().as_ref()],
        bump,
        space = 8 + 32 + 8 + 8 + 32 + 8 + 2 + 1 + 8 + 1
    )]
    pub swap_pool: Account<'info, SwapPool>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = swap_pool,
        seeds = [b"lp_mint", token_mint.key().as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = swap_pool,
        seeds = [b"pool_token", token_mint.key().as_ref()],
        bump
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool SOL account (PDA)
    #[account(
        mut,
        seeds = [b"pool_sol", token_mint.key().as_ref()],
        bump
    )]
    pub pool_sol_account: AccountInfo<'info>,
    
    #[account(
        init,
        payer = creator,
        token::mint = lp_mint,
        token::authority = custody_program,
        seeds = [b"custody_lp", token_mint.key().as_ref()],
        bump
    )]
    pub custody_lp_account: Account<'info, TokenAccount>,
    
    /// CHECK: LP custody program
    pub custody_program: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    #[account(
        mut,
        seeds = [b"swap_pool", swap_pool.token_mint.as_ref()],
        bump = swap_pool.bump
    )]
    pub swap_pool: Account<'info, SwapPool>,
    
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool SOL account
    #[account(mut)]
    pub pool_sol_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetPrice<'info> {
    #[account(seeds = [b"swap_pool", swap_pool.token_mint.as_ref()], bump = swap_pool.bump)]
    pub swap_pool: Account<'info, SwapPool>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"swap_pool", swap_pool.token_mint.as_ref()],
        bump = swap_pool.bump
    )]
    pub swap_pool: Account<'info, SwapPool>,
    
    pub lp_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool SOL account
    #[account(mut)]
    pub pool_sol_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_lp_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisablePool<'info> {
    #[account(
        mut,
        seeds = [b"swap_pool", swap_pool.token_mint.as_ref()],
        bump = swap_pool.bump
    )]
    pub swap_pool: Account<'info, SwapPool>,
    pub authority: Signer<'info>, // Should be project status tracker
}

// ===== DATA STRUCTURES =====

#[account]
pub struct SwapPool {
    pub token_mint: Pubkey,        // The token being traded
    pub token_reserve: u64,        // Token reserve in pool
    pub sol_reserve: u64,          // SOL reserve in pool  
    pub lp_mint: Pubkey,           // LP token mint
    pub total_lp_supply: u64,      // Total LP tokens minted
    pub fee_rate: u16,             // Fee in basis points (30 = 0.3%)
    pub is_active: bool,           // Pool active status
    pub created_at: i64,           // Pool creation timestamp
    pub bump: u8,                  // PDA bump
}

#[error_code]
pub enum SwapError {
    #[msg("Pool is not active.")]
    PoolInactive,
    #[msg("Invalid amount provided.")]
    InvalidAmount,
    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
    #[msg("Insufficient liquidity in pool.")]
    InsufficientLiquidity,
    #[msg("Mathematical overflow occurred.")]
    MathOverflow,
}