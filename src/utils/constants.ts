import { PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import type { NetworkConfig, StakingInfo } from '@/types';

// ===== ENVIRONMENT CONSTANTS =====

export const ENV = {
  NETWORK: (import.meta.env.VITE_NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Devnet,
  RPC_ENDPOINT: import.meta.env.VITE_RPC_ENDPOINT || 'https://api.devnet.solana.com',
  WS_ENDPOINT: import.meta.env.VITE_WEBSOCKET_URL,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
} as const;

// ===== PROGRAM IDS =====

export const PROGRAM_IDS = {
  FEE_REWARDS: new PublicKey(
    import.meta.env.VITE_FEE_REWARDS_PROGRAM_ID || 
    'FeeReward111111111111111111111111111111111111'
  ),
  HOLDER_DISTRIBUTION: new PublicKey(
    import.meta.env.VITE_HOLDER_DISTRIBUTION_PROGRAM_ID || 
    'HolderDist1111111111111111111111111111111111111'
  ),
  LP_CUSTODY: new PublicKey(
    import.meta.env.VITE_LP_CUSTODY_PROGRAM_ID || 
    'LPCustody1111111111111111111111111111111111111'
  ),
  STATUS_TRACKER: new PublicKey(
    import.meta.env.VITE_STATUS_TRACKER_PROGRAM_ID || 
    'StatusTrack1111111111111111111111111111111111111'
  ),
} as const;

// ===== TOKEN MINTS =====

export const TOKEN_MINTS = {
  APEOUT: new PublicKey(
    import.meta.env.VITE_APEOUT_TOKEN_MINT || 
    '11111111111111111111111111111111'
  ),
  SAMPLE: new PublicKey(
    import.meta.env.VITE_SAMPLE_TOKEN_MINT || 
    '22222222222222222222222222222222'
  ),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC mainnet
  SOL: new PublicKey('So11111111111111111111111111111111111112'), // Wrapped SOL
} as const;

// ===== STAKING TIERS =====

export const STAKING_TIERS: Record<string, StakingInfo> = {
  BRONZE: {
    tier: 'Bronze',
    multiplier: 1.0,
    minAmount: 0,
    maxAmount: 99,
  },
  SILVER: {
    tier: 'Silver',
    multiplier: 1.1,
    minAmount: 100,
    maxAmount: 999,
  },
  GOLD: {
    tier: 'Gold',
    multiplier: 1.5,
    minAmount: 1000,
    maxAmount: 4999,
  },
  DIAMOND: {
    tier: 'Diamond',
    multiplier: 2.0,
    minAmount: 5000,
  },
} as const;

// ===== REWARD CONSTANTS =====

export const REWARDS = {
  BASE_DAILY_RATE: 0.005, // 0.5% daily base rate
  PLATFORM_FEE_PERCENTAGE: 20, // 20% platform fee on LP liquidation
  HOLDER_DISTRIBUTION_PERCENTAGE: 80, // 80% to holders
  MIN_CLAIM_AMOUNT: 0.001, // Minimum claimable amount in SOL
  MAX_CLAIM_PER_DAY: 100, // Maximum claims per day per user
} as const;

// ===== TOKEN LIFECYCLE =====

export const TOKEN_LIFECYCLE = {
  WARNING_THRESHOLD_DAYS: 3, // Days without trades for warning
  DEATH_THRESHOLD_DAYS: 7, // Days without trades for death
  MIN_VOLUME_THRESHOLD: 15, // Minimum SOL volume (3 days)
  PRICE_DROP_THRESHOLD: 0.1, // 90% drop from ATH
  MIN_AGE_FOR_DEATH_DAYS: 3, // Minimum age before can be marked dead
} as const;

// ===== UI CONSTANTS =====

export const UI = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  DEBOUNCE_MS: 500, // Input debounce
  MAX_RETRIES: 3, // Max API retries
  TRANSACTION_TIMEOUT: 60000, // 60 seconds
  ANIMATION_DURATION: 300, // CSS transition duration
  MOBILE_BREAKPOINT: 768, // Mobile breakpoint in px
} as const;

// ===== DISPLAY FORMATS =====

export const DISPLAY = {
  TOKEN_DECIMALS: 6,
  SOL_DECIMALS: 9,
  PRICE_DECIMALS: 4,
  PERCENTAGE_DECIMALS: 2,
  MAX_SYMBOL_LENGTH: 10,
  MAX_NAME_LENGTH: 25,
} as const;

// ===== VALIDATION RULES =====

export const VALIDATION = {
  MIN_STAKE_AMOUNT: 0.1,
  MAX_STAKE_AMOUNT: 1000000,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 8,
} as const;

// ===== NETWORK CONFIGURATIONS =====

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet Beta',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
    programIds: {
      feeRewards: 'FeeReward111111111111111111111111111111111111',
      holderDistribution: 'HolderDist1111111111111111111111111111111111111',
      lpCustody: 'LPCustody1111111111111111111111111111111111111',
      statusTracker: 'StatusTrack1111111111111111111111111111111111111',
    },
    tokenMints: {
      apeout: '11111111111111111111111111111111',
      usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      sol: 'So11111111111111111111111111111111111112',
    },
  },
  devnet: {
    name: 'Devnet',
    rpcEndpoint: 'https://api.devnet.solana.com',
    wsEndpoint: 'wss://api.devnet.solana.com',
    programIds: {
      feeRewards: 'FeeReward111111111111111111111111111111111111',
      holderDistribution: 'HolderDist1111111111111111111111111111111111111',
      lpCustody: 'LPCustody1111111111111111111111111111111111111',
      statusTracker: 'StatusTrack1111111111111111111111111111111111111',
    },
    tokenMints: {
      apeout: '11111111111111111111111111111111',
      usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC devnet
      sol: 'So11111111111111111111111111111111111112',
    },
  },
  testnet: {
    name: 'Testnet',
    rpcEndpoint: 'https://api.testnet.solana.com',
    programIds: {
      feeRewards: 'FeeReward111111111111111111111111111111111111',
      holderDistribution: 'HolderDist1111111111111111111111111111111111111',
      lpCustody: 'LPCustody1111111111111111111111111111111111111',
      statusTracker: 'StatusTrack1111111111111111111111111111111111111',
    },
    tokenMints: {
      apeout: '11111111111111111111111111111111',
      sol: 'So11111111111111111111111111111111111112',
    },
  },
} as const;

// ===== ERROR MESSAGES =====

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  INVALID_AMOUNT: 'Please enter a valid amount',
  ALREADY_CLAIMED: 'Rewards have already been claimed',
  NOT_ELIGIBLE: 'You are not eligible for this reward',
  TOKEN_NOT_FOUND: 'Token not found',
  PROGRAM_ERROR: 'Program execution error',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// ===== SUCCESS MESSAGES =====

export const SUCCESS_MESSAGES = {
  TRANSACTION_SENT: 'Transaction sent successfully',
  STAKE_SUCCESS: 'Tokens staked successfully',
  UNSTAKE_SUCCESS: 'Tokens unstaked successfully',
  CLAIM_SUCCESS: 'Rewards claimed successfully',
  WALLET_CONNECTED: 'Wallet connected successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;

// ===== FEATURE FLAGS =====

export const FEATURES = {
  STAKING: import.meta.env.VITE_ENABLE_STAKING !== 'false',
  REWARDS: import.meta.env.VITE_ENABLE_REWARDS !== 'false',
  LP_CLAIMS: import.meta.env.VITE_ENABLE_LP_CLAIMS !== 'false',
  ANALYTICS: import.meta.env.VITE_ANALYTICS_ID !== undefined,
  DEBUG_LOGGING: import.meta.env.VITE_SHOW_CONSOLE_LOGS === 'true',
} as const;

// ===== API ENDPOINTS =====

export const API_ENDPOINTS = {
  TOKENS: '/api/tokens',
  PRICES: '/api/prices',
  VOLUME: '/api/volume',
  HOLDERS: '/api/holders',
  REWARDS: '/api/rewards',
  CLAIMS: '/api/claims',
  SNAPSHOTS: '/api/snapshots',
  LEADERBOARD: '/api/leaderboard',
} as const;

// ===== CACHE KEYS =====

export const CACHE_KEYS = {
  TOKEN_BALANCES: 'token_balances',
  USER_STAKES: 'user_stakes',
  TOKEN_PRICES: 'token_prices',
  REWARD_CLAIMS: 'reward_claims',
  TRENDING_TOKENS: 'trending_tokens',
} as const;

// ===== LOCAL STORAGE KEYS =====

export const STORAGE_KEYS = {
  WALLET_PREFERENCE: 'apeout_wallet_preference',
  USER_SETTINGS: 'apeout_user_settings',
  THEME_PREFERENCE: 'apeout_theme',
  RECENT_TRANSACTIONS: 'apeout_recent_tx',
} as const;

// ===== CHART COLORS =====

export const CHART_COLORS = {
  PRIMARY: '#667eea',
  SECONDARY: '#764ba2',
  SUCCESS: '#10b981',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
  GRADIENT_START: '#667eea',
  GRADIENT_END: '#764ba2',
} as const;

// ===== SOCIAL LINKS =====

export const SOCIAL_LINKS = {
  TWITTER: 'https://twitter.com/apeout',
  DISCORD: 'https://discord.gg/apeout',
  TELEGRAM: 'https://t.me/apeout',
  GITHUB: 'https://github.com/apeout/platform',
  DOCS: 'https://docs.apeout.com',
} as const;