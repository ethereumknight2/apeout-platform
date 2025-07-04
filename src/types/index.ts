import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// ===== CORE TYPES =====

export interface TokenData {
  name: string;
  symbol: string;
  mint: PublicKey;
  decimals: number;
  volume: number;
  holders: number;
  price?: number;
  change24h?: number;
  marketCap?: number;
  logoUri?: string;
}

export interface UserTokenBalance {
  mint: PublicKey;
  balance: number;
  uiAmount: number;
}

// ===== STAKING TYPES =====

export type StakingTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond';

export interface StakingInfo {
  tier: StakingTier;
  multiplier: number;
  minAmount: number;
  maxAmount?: number;
}

export interface UserStakingData {
  stakedAmount: number;
  tier: StakingTier;
  multiplier: number;
  estimatedDailyRewards: number;
  lastStakeTime?: number;
  pendingRewards?: number;
}

// ===== REWARD TYPES =====

export interface RewardClaim {
  claimKey: string;
  amount: number;
  timestamp: number;
  txHash: string;
  type: 'LP' | 'FEE';
}

export interface LPRewardInfo {
  tokenMint: PublicKey;
  userBalance: number;
  totalSupply: number;
  estimatedReward: number;
  snapshotTime: number;
  eligible: boolean;
  claimed: boolean;
}

export interface FeeRewardInfo {
  dayId: number;
  userShare: number;
  totalFees: number;
  rewardAmount: number;
  multiplier: number;
  eligible: boolean;
  claimed: boolean;
}

// ===== PROGRAM ACCOUNT TYPES =====

export interface RewardsPool {
  dayId: BN;
  totalRewards: BN;
  totalVolume: BN;
  bump: number;
}

export interface ClaimRecord {
  claimed: boolean;
  amount: BN;
  claimTime?: BN;
}

export interface DistributionState {
  tokenMint: PublicKey;
  totalLp: BN;
  claimedLp: BN;
  snapshotTime: BN;
  bump: number;
}

export interface LPVault {
  tokenMint: PublicKey;
  totalLp: BN;
  isActive: boolean;
  bump: number;
}

export interface ProjectTracker {
  tokenMint: PublicKey;
  launchTime: BN;
  lastTradeTs: BN;
  volume3d: BN;
  athPrice: BN;
  currentPrice: BN;
  status: TokenStatus;
  bump: number;
}

// ===== ENUMS =====

export enum TokenStatus {
  Active = 'Active',
  Warning = 'Warning',
  Dead = 'Dead'
}

export enum TransactionType {
  Stake = 'stake',
  Unstake = 'unstake',
  ClaimLP = 'claim_lp',
  ClaimFee = 'claim_fee'
}

// ===== API TYPES =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface TokenPrice {
  mint: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

// ===== PROGRAM INSTRUCTION TYPES =====

export interface StakeInstructionData {
  amount: BN;
}

export interface UnstakeInstructionData {
  amount: BN;
}

export interface ClaimLPInstructionData {
  userTokenBalance: BN;
  totalSupplyAtSnapshot: BN;
}

export interface ClaimFeeInstructionData {
  userTokenBalance: BN;
  totalSupply: BN;
}

// ===== ERROR TYPES =====

export interface ProgramError {
  code: number;
  name: string;
  msg: string;
}

export interface TransactionError {
  type: string;
  message: string;
  logs?: string[];
}

// ===== WALLET TYPES =====

export interface WalletContextState {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  disconnecting: boolean;
}

// ===== SNAPSHOT TYPES =====

export interface SnapshotInfo {
  timestamp: number;
  totalSupply?: number;
  blockHeight?: number;
  merkleRoot?: string;
}

export interface HolderSnapshot {
  address: string;
  balance: number;
  percentage: number;
}

// ===== CONFIGURATION TYPES =====

export interface NetworkConfig {
  name: string;
  rpcEndpoint: string;
  wsEndpoint?: string;
  programIds: {
    feeRewards: string;
    holderDistribution: string;
    lpCustody: string;
    statusTracker: string;
  };
  tokenMints: {
    apeout: string;
    usdc?: string;
    sol?: string;
  };
}

export interface AppConfig {
  network: NetworkConfig;
  features: {
    staking: boolean;
    rewards: boolean;
    lpClaims: boolean;
  };
  ui: {
    refreshInterval: number;
    maxRetries: number;
    debounceMs: number;
  };
}

// ===== UTILITY TYPES =====

export type Awaitable<T> = T | Promise<T>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ===== COMPONENT PROP TYPES =====

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TokenComponentProps extends BaseComponentProps {
  tokenMint: PublicKey;
}

export interface LoadingProps {
  loading?: boolean;
  error?: string | null;
}

// ===== FORM TYPES =====

export interface StakeFormData {
  amount: string;
  slippage?: number;
}

export interface ClaimFormData {
  confirmTerms: boolean;
  estimatedGas?: number;
}

// ===== CHART/ANALYTICS TYPES =====

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PriceHistory {
  mint: string;
  data: ChartDataPoint[];
  timeframe: '1H' | '24H' | '7D' | '30D';
}

export interface VolumeData {
  period: string;
  volume: number;
  trades: number;
  uniqueUsers: number;
}

// ===== EXPORT ALL =====

export * from './anchor';

// Re-export commonly used Solana types
export type { PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';