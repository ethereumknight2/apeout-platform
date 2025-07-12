import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, Connection, Keypair } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  transfer
} from '@solana/spl-token';

// Types
interface AppState {
  apeoutBalance: number;
  stakedAmount: number;
  stakingMultiplier: number;
  userStakingTier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  claimedRewards: Set<string>;
  anchorReady: boolean;
  anchorPrograms: {
    feeRewards?: any;
    lpCustody?: any;
    apeoutStaking?: any;
    dailyGameVault?: any;
    projectStatusTracker?: any;
  };
  tradingHistory: Array<{
    date: string;
    volume: number;
    tokens: string[];
    profit: number;
  }>;
  lpPositions: Array<{
    tokenMint: string;
    tokenSymbol: string;
    balance: number;
    isActive: boolean;
  }>;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    timestamp: number;
  }>;
}

interface AppContextType {
  state: AppState;
  error: string | null;
  loading: boolean;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  claimFeeRewards: (dayId: number, userBalance: number, totalSupply: number) => Promise<string>;
  claimLPRewards: (tokenMint: PublicKey, userTokenBalance: number, totalSupply: number) => Promise<string>;
  claimRealLPRewards: (tokenMint: PublicKey, userTokenBalance: number, totalSupply: number) => Promise<string>;
  stakeTokens: (amount: number) => Promise<void>;
  unstakeTokens: (amount: number) => Promise<void>;
  refreshBalance: () => Promise<void>;
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateTradingHistory: (volume: number, tokens: string[], profit: number) => void;
  updateLPPositions: (positions: Array<{ tokenMint: string; tokenSymbol: string; balance: number; isActive: boolean }>) => void;
  sendTransaction: (transaction: Transaction) => Promise<string>;
  createTokenAccount: (mintAddress: PublicKey) => Promise<PublicKey>;
  getTokenBalance: (mintAddress: PublicKey) => Promise<number>;
  transferTokens: (mintAddress: PublicKey, recipient: PublicKey, amount: number) => Promise<string>;
  getSOLBalance: () => Promise<number>;
  airdropSOL: (amount: number) => Promise<string>;
  simulateTransaction: (transaction: Transaction) => Promise<any>;
  initializeAnchorPrograms: () => Promise<void>;
  checkClaimEligibility: (dayId: number) => Promise<boolean>;
  calculateStakingRewards: (amount: number, duration: number) => number;
  getStakingTierInfo: (stakedAmount: number) => { tier: string; multiplier: number; nextTier?: string; nextTierAmount?: number };
  exportUserData: () => Promise<any>;
  importUserData: (data: any) => Promise<void>;
  resetUserData: () => Promise<void>;
}

interface AppProviderProps {
  children: ReactNode;
}

// Mock data for development
const MOCK_TRADING_HISTORY = [
  { date: '2024-01-15', volume: 15000, tokens: ['SOL', 'USDC'], profit: 234.56 },
  { date: '2024-01-14', volume: 8500, tokens: ['RAY', 'SRM'], profit: -45.23 },
  { date: '2024-01-13', volume: 22000, tokens: ['ORCA', 'MNGO'], profit: 567.89 },
];

const MOCK_LP_POSITIONS = [
  { tokenMint: 'So11111111111111111111111111111111111111112', tokenSymbol: 'SOL', balance: 1250.5, isActive: true },
  { tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenSymbol: 'USDC', balance: 890.25, isActive: true },
  { tokenMint: 'DeadToken111111111111111111111111111111111', tokenSymbol: 'DEAD', balance: 500.0, isActive: false },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { publicKey, connected, signTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  
  const [state, setState] = useState<AppState>({
    apeoutBalance: 0,
    stakedAmount: 0,
    stakingMultiplier: 1.0,
    userStakingTier: 'Bronze',
    claimedRewards: new Set<string>(),
    anchorReady: false,
    anchorPrograms: {},
    tradingHistory: MOCK_TRADING_HISTORY,
    lpPositions: MOCK_LP_POSITIONS,
    notifications: []
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      initializeApp();
    } else {
      resetAppState();
    }
  }, [connected, publicKey]);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Initializing app for wallet:', publicKey?.toString());
      
      await Promise.all([
        initializeAnchorPrograms(),
        refreshBalance(),
        loadUserData()
      ]);
      
      addNotification('success', 'Wallet connected successfully!');
    } catch (err) {
      console.error('❌ App initialization failed:', err);
      setError('Failed to initialize application');
      addNotification('error', 'Failed to initialize application');
    } finally {
      setLoading(false);
    }
  };

  const resetAppState = () => {
    setState({
      apeoutBalance: 0,
      stakedAmount: 0,
      stakingMultiplier: 1.0,
      userStakingTier: 'Bronze',
      claimedRewards: new Set<string>(),
      anchorReady: false,
      anchorPrograms: {},
      tradingHistory: [],
      lpPositions: [],
      notifications: []
    });
    setError(null);
    setLoading(false);
  };

  const initializeAnchorPrograms = async (): Promise<void> => {
    try {
      console.log('🔧 Initializing Anchor programs...');
      
      // TODO: Initialize actual Anchor programs when contracts are deployed
      // For now, we'll simulate the initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setState(prev => ({
        ...prev,
        anchorReady: true,
        anchorPrograms: {
          feeRewards: null, // Will be actual program instance
          lpCustody: null,
          apeoutStaking: null,
          dailyGameVault: null,
          projectStatusTracker: null
        }
      }));
      
      console.log('✅ Anchor programs initialized');
    } catch (err) {
      console.error('❌ Failed to initialize Anchor programs:', err);
      throw new Error('Failed to initialize blockchain programs');
    }
  };

  const refreshBalance = async (): Promise<void> => {
    if (!publicKey || !connection) return;

    try {
      console.log('💰 Refreshing balance...');
      
      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      console.log('SOL Balance:', solBalance / 1e9);
      
      // Mock APEOUT balance for now - replace with actual token account query
      const mockApeoutBalance = Math.floor(Math.random() * 100000) + 10000;
      const mockStaked = Math.floor(Math.random() * 50000);
      
      // Calculate staking tier based on staked amount
      const stakingInfo = getStakingTierInfo(mockStaked);
      
      setState(prev => ({
        ...prev,
        apeoutBalance: mockApeoutBalance,
        stakedAmount: mockStaked,
        stakingMultiplier: stakingInfo.multiplier,
        userStakingTier: stakingInfo.tier as 'Bronze' | 'Silver' | 'Gold' | 'Diamond'
      }));

      console.log('✅ Balance refreshed successfully');
    } catch (err) {
      console.error('❌ Error refreshing balance:', err);
      throw new Error('Failed to refresh balance');
    }
  };

  const loadUserData = async () => {
    try {
      console.log('📖 Loading user data...');
      
      // Load user's trading history and LP positions
      // This would typically come from an API or indexer
      const userTradingHistory = [...MOCK_TRADING_HISTORY];
      const userLPPositions = [...MOCK_LP_POSITIONS];
      
      setState(prev => ({
        ...prev,
        tradingHistory: userTradingHistory,
        lpPositions: userLPPositions
      }));
      
      console.log('✅ User data loaded');
    } catch (err) {
      console.error('❌ Error loading user data:', err);
      // Don't throw here, this is not critical
    }
  };

  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string): void => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, notification]
    }));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id: string): void => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  };

  const clearNotifications = (): void => {
    setState(prev => ({
      ...prev,
      notifications: []
    }));
  };

  const updateTradingHistory = (volume: number, tokens: string[], profit: number): void => {
    const newEntry = {
      date: new Date().toISOString().split('T')[0],
      volume,
      tokens,
      profit
    };
    
    setState(prev => ({
      ...prev,
      tradingHistory: [newEntry, ...prev.tradingHistory].slice(0, 100) // Keep last 100 entries
    }));
  };

  const updateLPPositions = (positions: Array<{ tokenMint: string; tokenSymbol: string; balance: number; isActive: boolean }>): void => {
    setState(prev => ({
      ...prev,
      lpPositions: positions
    }));
  };

  const sendTransaction = async (transaction: Transaction): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('📤 Sending transaction...');
      
      // Get recent blockhash
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Sign transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('✅ Transaction confirmed:', signature);
      return signature;
    } catch (err) {
      console.error('❌ Transaction failed:', err);
      throw err;
    }
  };

  const createTokenAccount = async (mintAddress: PublicKey): Promise<PublicKey> => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🏗️ Creating token account for:', mintAddress.toString());
      
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        Keypair.generate(), // This would be the fee payer keypair
        mintAddress,
        publicKey
      );
      
      console.log('✅ Token account created:', tokenAccount.address.toString());
      return tokenAccount.address;
    } catch (err) {
      console.error('❌ Failed to create token account:', err);
      throw err;
    }
  };

  const getTokenBalance = async (mintAddress: PublicKey): Promise<number> => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenAccount = await getAssociatedTokenAddress(mintAddress, publicKey);
      const account = await getAccount(connection, tokenAccount);
      return Number(account.amount);
    } catch (err) {
      if (err instanceof TokenAccountNotFoundError) {
        return 0;
      }
      throw err;
    }
  };

  const transferTokens = async (mintAddress: PublicKey, recipient: PublicKey, amount: number): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`💸 Transferring ${amount} tokens to ${recipient.toString()}`);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintAddress, publicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintAddress, recipient);
      
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          amount
        )
      );
      
      const signature = await sendTransaction(transaction);
      console.log('✅ Token transfer successful:', signature);
      return signature;
    } catch (err) {
      console.error('❌ Token transfer failed:', err);
      throw err;
    }
  };

  const getSOLBalance = async (): Promise<number> => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (err) {
      console.error('❌ Failed to get SOL balance:', err);
      throw err;
    }
  };

  const airdropSOL = async (amount: number): Promise<string> => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`🪂 Airdropping ${amount} SOL...`);
      
      const signature = await connection.requestAirdrop(publicKey, amount * 1e9);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('✅ Airdrop successful:', signature);
      return signature;
    } catch (err) {
      console.error('❌ Airdrop failed:', err);
      throw err;
    }
  };

  const simulateTransaction = async (transaction: Transaction): Promise<any> => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🧪 Simulating transaction...');
      
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      const result = await connection.simulateTransaction(transaction);
      console.log('✅ Transaction simulation result:', result);
      return result;
    } catch (err) {
      console.error('❌ Transaction simulation failed:', err);
      throw err;
    }
  };

  const claimFeeRewards = async (dayId: number, userBalance: number, totalSupply: number): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`💰 Claiming fee rewards for day ${dayId}...`);
      
      if (state.anchorReady && state.anchorPrograms.feeRewards) {
        // TODO: Use actual Anchor program
        console.log('Using Anchor fee rewards program...');
        
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as claimed
        setState(prev => ({
          ...prev,
          claimedRewards: new Set(prev.claimedRewards).add(`FEE_${dayId}`)
        }));
        
        const signature = `ANCHOR_FEE_${dayId}_${Date.now()}`;
        addNotification('success', `Fee rewards claimed for day ${dayId}!`);
        return signature;
      } else {
        // Mock implementation
        console.log('Using mock fee rewards claim...');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as claimed
        setState(prev => ({
          ...prev,
          claimedRewards: new Set(prev.claimedRewards).add(`FEE_${dayId}`)
        }));
        
        const signature = `MOCK_FEE_${dayId}_${Date.now()}`;
        addNotification('success', `Fee rewards claimed for day ${dayId}!`);
        return signature;
      }
    } catch (err) {
      console.error('❌ Fee rewards claim failed:', err);
      addNotification('error', `Failed to claim fee rewards for day ${dayId}`);
      throw err;
    }
  };

  const claimLPRewards = async (tokenMint: PublicKey, userTokenBalance: number, totalSupply: number): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`💰 Claiming LP rewards for ${tokenMint.toString()}...`);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as claimed
      setState(prev => ({
        ...prev,
        claimedRewards: new Set(prev.claimedRewards).add(`LP_${tokenMint.toString()}`)
      }));
      
      const signature = `MOCK_LP_${tokenMint.toString().slice(0, 8)}_${Date.now()}`;
      addNotification('success', `LP rewards claimed for ${tokenMint.toString().slice(0, 8)}...`);
      return signature;
    } catch (err) {
      console.error('❌ LP rewards claim failed:', err);
      addNotification('error', 'Failed to claim LP rewards');
      throw err;
    }
  };

  const claimRealLPRewards = async (tokenMint: PublicKey, userTokenBalance: number, totalSupply: number): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`💰 Claiming real LP rewards for ${tokenMint.toString()}...`);
      
      if (state.anchorReady && state.anchorPrograms.lpCustody) {
        // TODO: Use actual Anchor program
        console.log('Using Anchor LP custody program...');
        
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as claimed
        setState(prev => ({
          ...prev,
          claimedRewards: new Set(prev.claimedRewards).add(`LP_${tokenMint.toString()}`)
        }));
        
        const signature = `ANCHOR_LP_${tokenMint.toString().slice(0, 8)}_${Date.now()}`;
        addNotification('success', `LP rewards claimed for ${tokenMint.toString().slice(0, 8)}...`);
        return signature;
      } else {
        // Fall back to mock implementation
        return await claimLPRewards(tokenMint, userTokenBalance, totalSupply);
      }
    } catch (err) {
      console.error('❌ Real LP rewards claim failed:', err);
      addNotification('error', 'Failed to claim LP rewards');
      throw err;
    }
  };

  const stakeTokens = async (amount: number): Promise<void> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`🏦 Staking ${amount} tokens...`);
      
      if (state.anchorReady && state.anchorPrograms.apeoutStaking) {
        // TODO: Use actual Anchor program
        console.log('Using Anchor staking program...');
        
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Mock implementation
        console.log('Using mock staking...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update state
      setState(prev => {
        const newStaked = prev.stakedAmount + amount;
        const newBalance = prev.apeoutBalance - amount;
        
        // Recalculate tier
        const stakingInfo = getStakingTierInfo(newStaked);
        
        return {
          ...prev,
          stakedAmount: newStaked,
          apeoutBalance: newBalance,
          stakingMultiplier: stakingInfo.multiplier,
          userStakingTier: stakingInfo.tier as 'Bronze' | 'Silver' | 'Gold' | 'Diamond'
        };
      });
      
      addNotification('success', `Successfully staked ${amount} APEOUT tokens!`);
      console.log('✅ Staking successful');
    } catch (err) {
      console.error('❌ Staking failed:', err);
      addNotification('error', `Failed to stake ${amount} tokens`);
      throw err;
    }
  };

  const unstakeTokens = async (amount: number): Promise<void> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`🏦 Unstaking ${amount} tokens...`);
      
      if (state.anchorReady && state.anchorPrograms.apeoutStaking) {
        // TODO: Use actual Anchor program
        console.log('Using Anchor staking program...');
        
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Mock implementation
        console.log('Using mock unstaking...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update state
      setState(prev => {
        const newStaked = prev.stakedAmount - amount;
        const newBalance = prev.apeoutBalance + amount;
        
        // Recalculate tier
        const stakingInfo = getStakingTierInfo(newStaked);
        
        return {
          ...prev,
          stakedAmount: newStaked,
          apeoutBalance: newBalance,
          stakingMultiplier: stakingInfo.multiplier,
          userStakingTier: stakingInfo.tier as 'Bronze' | 'Silver' | 'Gold' | 'Diamond'
        };
      });
      
      addNotification('success', `Successfully unstaked ${amount} APEOUT tokens!`);
      console.log('✅ Unstaking successful');
    } catch (err) {
      console.error('❌ Unstaking failed:', err);
      addNotification('error', `Failed to unstake ${amount} tokens`);
      throw err;
    }
  };

  const checkClaimEligibility = async (dayId: number): Promise<boolean> => {
    try {
      // Check if user has trading activity on this day
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - (30 - dayId));
      const dayString = dayDate.toISOString().split('T')[0];
      
      const hasActivity = state.tradingHistory.some(entry => entry.date === dayString);
      const alreadyClaimed = state.claimedRewards.has(`FEE_${dayId}`);
      
      return hasActivity && !alreadyClaimed;
    } catch (err) {
      console.error('❌ Error checking claim eligibility:', err);
      return false;
    }
  };

  const calculateStakingRewards = (amount: number, duration: number): number => {
    // Base APY: 5%
    const baseAPY = 0.05;
    const multiplier = state.stakingMultiplier;
    
    // Calculate daily reward
    const dailyRate = (baseAPY * multiplier) / 365;
    const totalReward = amount * dailyRate * duration;
    
    return totalReward;
  };

  const getStakingTierInfo = (stakedAmount: number): { tier: string; multiplier: number; nextTier?: string; nextTierAmount?: number } => {
    if (stakedAmount >= 100000) {
      return { tier: 'Diamond', multiplier: 2.0 };
    } else if (stakedAmount >= 50000) {
      return { tier: 'Gold', multiplier: 1.5, nextTier: 'Diamond', nextTierAmount: 100000 };
    } else if (stakedAmount >= 25000) {
      return { tier: 'Silver', multiplier: 1.1, nextTier: 'Gold', nextTierAmount: 50000 };
    } else {
      return { tier: 'Bronze', multiplier: 1.0, nextTier: 'Silver', nextTierAmount: 25000 };
    }
  };

  const exportUserData = async (): Promise<any> => {
    try {
      const userData = {
        walletAddress: publicKey?.toString(),
        apeoutBalance: state.apeoutBalance,
        stakedAmount: state.stakedAmount,
        stakingTier: state.userStakingTier,
        claimedRewards: Array.from(state.claimedRewards),
        tradingHistory: state.tradingHistory,
        lpPositions: state.lpPositions,
        exportDate: new Date().toISOString()
      };
      
      console.log('📤 Exporting user data...');
      return userData;
    } catch (err) {
      console.error('❌ Error exporting user data:', err);
      throw err;
    }
  };

  const importUserData = async (data: any): Promise<void> => {
    try {
      console.log('📥 Importing user data...');
      
      setState(prev => ({
        ...prev,
        apeoutBalance: data.apeoutBalance || prev.apeoutBalance,
        stakedAmount: data.stakedAmount || prev.stakedAmount,
        userStakingTier: data.stakingTier || prev.userStakingTier,
        claimedRewards: new Set(data.claimedRewards || []),
        tradingHistory: data.tradingHistory || prev.tradingHistory,
        lpPositions: data.lpPositions || prev.lpPositions
      }));
      
      addNotification('success', 'User data imported successfully!');
    } catch (err) {
      console.error('❌ Error importing user data:', err);
      addNotification('error', 'Failed to import user data');
      throw err;
    }
  };

  const resetUserData = async (): Promise<void> => {
    try {
      console.log('🔄 Resetting user data...');
      
      setState(prev => ({
        ...prev,
        apeoutBalance: 0,
        stakedAmount: 0,
        stakingMultiplier: 1.0,
        userStakingTier: 'Bronze',
        claimedRewards: new Set(),
        tradingHistory: [],
        lpPositions: []
      }));
      
      addNotification('info', 'User data reset successfully');
    } catch (err) {
      console.error('❌ Error resetting user data:', err);
      addNotification('error', 'Failed to reset user data');
      throw err;
    }
  };

  const contextValue: AppContextType = {
    state,
    error,
    loading,
    setError,
    setLoading,
    claimFeeRewards,
    claimLPRewards,
    claimRealLPRewards,
    stakeTokens,
    unstakeTokens,
    refreshBalance,
    addNotification,
    removeNotification,
    clearNotifications,
    updateTradingHistory,
    updateLPPositions,
    sendTransaction,
    createTokenAccount,
    getTokenBalance,
    transferTokens,
    getSOLBalance,
    airdropSOL,
    simulateTransaction,
    initializeAnchorPrograms,
    checkClaimEligibility,
    calculateStakingRewards,
    getStakingTierInfo,
    exportUserData,
    importUserData,
    resetUserData
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};