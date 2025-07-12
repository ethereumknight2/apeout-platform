use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint, MintTo};

declare_id!("ToKeNLaUnChEr111111111111111111111111111111");

#[program]
pub mod token_launcher {
    use super::*;

    /// Launch a new token with immediate LP creation and custody lock
    pub fn launch_token(
        ctx: Context<LaunchToken>,
        name: String,
        symbol: String,
        uri: String,
        initial_supply: u64,
        lp_sol_amount: u64, // Amount of SOL to add to LP (e.g., 0.02 SOL = 20_000_000 lamports)
        lp_token_amount: u64, // Amount of tokens to add to LP
    ) -> Result<()> {
        require!(name.len() <= 32, LaunchError::NameTooLong);
        require!(symbol.len() <= 10, LaunchError::SymbolTooLong);
        require!(uri.len() <= 200, LaunchError::UriTooLong);
        require!(initial_supply > 0, LaunchError::InvalidSupply);
        require!(lp_sol_amount >= 10_000_000, LaunchError::InsufficientLPFunding); // Min 0.01 SOL
        require!(lp_token_amount > 0, LaunchError::InvalidLPTokenAmount);

        let launch_data = &mut ctx.accounts.launch_data;
        let clock = Clock::get()?;

        // Store launch information
        launch_data.creator = ctx.accounts.creator.key();
        launch_data.token_mint = ctx.accounts.token_mint.key();
        launch_data.name = name.clone();
        launch_data.symbol = symbol.clone();
        launch_data.uri = uri;
        launch_data.initial_supply = initial_supply;
        launch_data.lp_sol_amount = lp_sol_amount;
        launch_data.lp_token_amount = lp_token_amount;
        launch_data.launch_time = clock.unix_timestamp;
        launch_data.bump = *ctx.bumps.get("launch_data").unwrap();

        // Step 1: Mint initial supply to creator
let token_mint_key = ctx.accounts.token_mint.key();
let seeds = &[
    b"launch_data",
    token_mint_key.as_ref(),
    &[launch_data.bump],
];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.launch_data.to_account_info(),
                },
                &[seeds],
            ),
            initial_supply,
        )?;

        // Step 2: Register with project status tracker
        let cpi_accounts = project_status_tracker::cpi::accounts::InitializeTracker {
            tracker: ctx.accounts.project_tracker.to_account_info(),
            token_mint: ctx.accounts.token_mint.to_account_info(),
            payer: ctx.accounts.creator.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_program = ctx.accounts.project_status_tracker_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        project_status_tracker::cpi::initialize_tracker(cpi_ctx)?;

        // Step 3: Initialize LP vault in custody
        let cpi_accounts = lp_custody::cpi::accounts::InitializeLPVault {
            lp_vault: ctx.accounts.lp_vault.to_account_info(),
            token_mint: ctx.accounts.token_mint.to_account_info(),
            payer: ctx.accounts.creator.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_program = ctx.accounts.lp_custody_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        lp_custody::cpi::initialize_lp_vault(cpi_ctx)?;

        // Step 4: Transfer LP tokens from creator to launch contract temporarily
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.launch_token_temp_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            lp_token_amount,
        )?;

        // Step 5: Initialize swap pool with LP
        let cpi_accounts = apeout_swap::cpi::accounts::InitSwapPool {
            swap_pool: ctx.accounts.swap_pool.to_account_info(),
            token_mint: ctx.accounts.token_mint.to_account_info(),
            lp_mint: ctx.accounts.lp_mint.to_account_info(),
            creator_token_account: ctx.accounts.launch_token_temp_account.to_account_info(),
            pool_token_account: ctx.accounts.pool_token_account.to_account_info(),
            pool_sol_account: ctx.accounts.pool_sol_account.to_account_info(),
            custody_lp_account: ctx.accounts.custody_lp_account.to_account_info(),
            custody_program: ctx.accounts.lp_custody_program.to_account_info(),
            creator: ctx.accounts.launch_data.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_program = ctx.accounts.apeout_swap_program.to_account_info();
        let seeds_slice: &[&[&[u8]]] = &[seeds];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds_slice);
        
        apeout_swap::cpi::init_swap_pool(cpi_ctx, lp_token_amount, lp_sol_amount)?;

        // Step 6: Transfer SOL from creator to cover LP creation
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? -= lp_sol_amount;
        **ctx.accounts.launch_data.to_account_info().try_borrow_mut_lamports()? += lp_sol_amount;

        msg!("Token launched successfully: {} ({})", name, symbol);
        msg!("LP created: {} tokens + {} SOL", lp_token_amount, lp_sol_amount);
        msg!("LP tokens locked in custody contract");

        Ok(())
    }

    /// Get launch information for a token
    pub fn get_launch_info(ctx: Context<GetLaunchInfo>) -> Result<LaunchInfo> {
        let launch_data = &ctx.accounts.launch_data;
        
        Ok(LaunchInfo {
            creator: launch_data.creator,
            token_mint: launch_data.token_mint,
            name: launch_data.name.clone(),
            symbol: launch_data.symbol.clone(),
            uri: launch_data.uri.clone(),
            initial_supply: launch_data.initial_supply,
            lp_sol_amount: launch_data.lp_sol_amount,
            lp_token_amount: launch_data.lp_token_amount,
            launch_time: launch_data.launch_time,
        })
    }

    /// Emergency function to update token metadata (creator only)
    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        new_name: Option<String>,
        new_symbol: Option<String>,
        new_uri: Option<String>
    ) -> Result<()> {
        let launch_data = &mut ctx.accounts.launch_data;
        
        require!(
            ctx.accounts.creator.key() == launch_data.creator,
            LaunchError::UnauthorizedUpdate
        );

        if let Some(name) = new_name {
            require!(name.len() <= 32, LaunchError::NameTooLong);
            launch_data.name = name;
        }

        if let Some(symbol) = new_symbol {
            require!(symbol.len() <= 10, LaunchError::SymbolTooLong);
            launch_data.symbol = symbol;
        }

        if let Some(uri) = new_uri {
            require!(uri.len() <= 200, LaunchError::UriTooLong);
            launch_data.uri = uri;
        }

        msg!("Token metadata updated for {}", launch_data.token_mint);
        Ok(())
    }
}

// ===== ACCOUNT CONTEXTS =====

#[derive(Accounts)]
pub struct LaunchToken<'info> {
    #[account(
        init,
        payer = creator,
        seeds = [b"launch_data", token_mint.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 32 + 10 + 200 + 8 + 8 + 8 + 8 + 1
    )]
    pub launch_data: Account<'info, LaunchData>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = launch_data,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    // Temporary account to hold tokens for LP creation
    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = launch_data,
        seeds = [b"temp_tokens", token_mint.key().as_ref()],
        bump
    )]
    pub launch_token_temp_account: Account<'info, TokenAccount>,

    // Cross-program accounts
    /// CHECK: Project tracker account (created by CPI)
    #[account(mut)]
    pub project_tracker: AccountInfo<'info>,

    /// CHECK: LP vault account (created by CPI)
    #[account(mut)]
    pub lp_vault: AccountInfo<'info>,

    /// CHECK: Swap pool account (created by CPI)
    #[account(mut)]
    pub swap_pool: AccountInfo<'info>,

    /// CHECK: LP mint account (created by CPI)
    #[account(mut)]
    pub lp_mint: AccountInfo<'info>,

    /// CHECK: Pool token account (created by CPI)
    #[account(mut)]
    pub pool_token_account: AccountInfo<'info>,

    /// CHECK: Pool SOL account (created by CPI)
    #[account(mut)]
    pub pool_sol_account: AccountInfo<'info>,

    /// CHECK: Custody LP account (created by CPI)
    #[account(mut)]
    pub custody_lp_account: AccountInfo<'info>,

    // Programs
    /// CHECK: Project status tracker program
    pub project_status_tracker_program: AccountInfo<'info>,

    /// CHECK: LP custody program
    pub lp_custody_program: AccountInfo<'info>,

    /// CHECK: ApeOut swap program
    pub apeout_swap_program: AccountInfo<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetLaunchInfo<'info> {
    #[account(seeds = [b"launch_data", launch_data.token_mint.as_ref()], bump = launch_data.bump)]
    pub launch_data: Account<'info, LaunchData>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(
        mut,
        seeds = [b"launch_data", launch_data.token_mint.as_ref()],
        bump = launch_data.bump
    )]
    pub launch_data: Account<'info, LaunchData>,
    pub creator: Signer<'info>,
}

// ===== DATA STRUCTURES =====

#[account]
pub struct LaunchData {
    pub creator: Pubkey,           // Token creator
    pub token_mint: Pubkey,        // Token mint address
    pub name: String,              // Token name
    pub symbol: String,            // Token symbol
    pub uri: String,               // Metadata URI
    pub initial_supply: u64,       // Total tokens minted
    pub lp_sol_amount: u64,        // SOL added to LP
    pub lp_token_amount: u64,      // Tokens added to LP
    pub launch_time: i64,          // Launch timestamp
    pub bump: u8,                  // PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct LaunchInfo {
    pub creator: Pubkey,
    pub token_mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub initial_supply: u64,
    pub lp_sol_amount: u64,
    pub lp_token_amount: u64,
    pub launch_time: i64,
}

#[error_code]
pub enum LaunchError {
    #[msg("Token name is too long (max 32 characters).")]
    NameTooLong,
    #[msg("Token symbol is too long (max 10 characters).")]
    SymbolTooLong,
    #[msg("Metadata URI is too long (max 200 characters).")]
    UriTooLong,
    #[msg("Initial supply must be greater than 0.")]
    InvalidSupply,
    #[msg("Insufficient SOL for LP creation (minimum 0.01 SOL).")]
    InsufficientLPFunding,
    #[msg("LP token amount must be greater than 0.")]
    InvalidLPTokenAmount,
    #[msg("Only the token creator can update metadata.")]
    UnauthorizedUpdate,
}