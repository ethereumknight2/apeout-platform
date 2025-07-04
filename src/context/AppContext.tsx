import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

// Types
interface AppState {
  loading: boolean;
  error: string | null;
  apeoutBalance: number | null;
  stakedAmount: number | null;
  userStakingTier: string;
  stakingMultiplier: number;
  claimedRewards: Set<string>;
}

interface AppContextType {
  state: AppState;
  stakeTokens: (amount: number) => Promise<void>;
  unstakeTokens: (amount: number) => Promise<void>;
  claimLPRewards: (
    tokenMint: PublicKey,
    userBalance: number,
    totalSupply: number
  ) => Promise<string>;
  claimFeeRewards: (
    dayId: number,
    userBalance: number,
    totalSupply: number
  ) => Promise<string>;
  // New functions for dead token LP claims
  claimDeadTokenLP: (tokenMint: PublicKey, amount: number) => Promise<string>;
  swapSOLForToken: (tokenMint: PublicKey, solAmount: number) => Promise<string>;
  swapTokenForSOL: (
    tokenMint: PublicKey,
    tokenAmount: number
  ) => Promise<string>;
  checkTokenStatus: (
    tokenMint: PublicKey
  ) => Promise<"Active" | "Warning" | "Dead">;
  getProjectStatuses: () => Promise<any[]>;
  setError: (error: string | null) => void;
  refreshBalances: () => Promise<void>;
}

// Action types - Fixed to handle null values properly
type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_APEOUT_BALANCE"; payload: number | null }
  | { type: "SET_STAKED_AMOUNT"; payload: number | null }
  | { type: "SET_STAKING_TIER"; payload: { tier: string; multiplier: number } }
  | { type: "ADD_CLAIMED_REWARD"; payload: string }
  | { type: "RESET_STATE" };

// Initial state
const initialState: AppState = {
  loading: false,
  error: null,
  apeoutBalance: null,
  stakedAmount: null,
  userStakingTier: "Bronze",
  stakingMultiplier: 1.0,
  claimedRewards: new Set(),
};

// Reducer - Fixed to handle all action types
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_APEOUT_BALANCE":
      return { ...state, apeoutBalance: action.payload };
    case "SET_STAKED_AMOUNT":
      return {
        ...state,
        stakedAmount: action.payload,
        userStakingTier: calculateStakingTier(action.payload || 0).tier,
        stakingMultiplier: calculateStakingTier(action.payload || 0).multiplier,
      };
    case "SET_STAKING_TIER":
      return {
        ...state,
        userStakingTier: action.payload.tier,
        stakingMultiplier: action.payload.multiplier,
      };
    case "ADD_CLAIMED_REWARD":
      return {
        ...state,
        claimedRewards: new Set([...state.claimedRewards, action.payload]),
      };
    case "RESET_STATE":
      return { ...initialState, claimedRewards: new Set() };
    default:
      return state;
  }
}

// Helper functions
const calculateStakingTier = (stakedAmount: number) => {
  if (stakedAmount >= 5000) {
    return { tier: "Diamond", multiplier: 2.0 };
  } else if (stakedAmount >= 1000) {
    return { tier: "Gold", multiplier: 1.5 };
  } else if (stakedAmount >= 100) {
    return { tier: "Silver", multiplier: 1.1 };
  } else {
    return { tier: "Bronze", multiplier: 1.0 };
  }
};

// Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  // Create APEOUT_TOKEN_MINT safely
  console.log("Creating APEOUT_TOKEN_MINT...");

  let APEOUT_TOKEN_MINT: PublicKey;
  try {
    // Try env var first
    const envVar = import.meta.env.VITE_APEOUT_TOKEN_MINT;
    console.log("Env var value:", envVar, "Type:", typeof envVar);

    if (envVar && typeof envVar === "string") {
      APEOUT_TOKEN_MINT = new PublicKey(envVar);
      console.log("SUCCESS: Using env var:", APEOUT_TOKEN_MINT.toString());
    } else {
      // Fallback to wrapped SOL
      APEOUT_TOKEN_MINT = new PublicKey(
        "So11111111111111111111111111111111111112"
      );
      console.log(
        "SUCCESS: Using wrapped SOL fallback:",
        APEOUT_TOKEN_MINT.toString()
      );
    }
  } catch (error) {
    console.error("Failed to create APEOUT_TOKEN_MINT:", error);
    // Last resort - system program
    APEOUT_TOKEN_MINT = new PublicKey("11111111111111111111111111111112");
    console.log(
      "SUCCESS: Using system program fallback:",
      APEOUT_TOKEN_MINT.toString()
    );
  }

  // Get token balance
  const getTokenBalance = async (tokenMint: PublicKey): Promise<number> => {
    if (!publicKey) return 0;

    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMint,
        publicKey
      );

      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      return Number(tokenAccount.amount) / Math.pow(10, 6); // Assuming 6 decimals
    } catch (error) {
      console.log("Token account not found or error:", error);
      return 0;
    }
  };

  // Refresh balances
  const refreshBalances = async () => {
    if (!publicKey) return;

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // Get APEOUT balance
      const apeoutBalance = await getTokenBalance(APEOUT_TOKEN_MINT);
      dispatch({ type: "SET_APEOUT_BALANCE", payload: apeoutBalance });

      // TODO: Get staked amount from your staking program
      // For now, using mock data
      const stakedAmount = Math.floor(Math.random() * 1000);
      dispatch({ type: "SET_STAKED_AMOUNT", payload: stakedAmount });
    } catch (error) {
      console.error("Error refreshing balances:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to refresh balances" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Stake tokens
  const stakeTokens = async (amount: number): Promise<void> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // TODO: Implement actual staking program call
      console.log("Staking", amount, "APEOUT tokens");

      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update balances (mock)
      const newApeoutBalance = Math.max(0, (state.apeoutBalance || 0) - amount);
      const newStakedAmount = (state.stakedAmount || 0) + amount;

      dispatch({ type: "SET_APEOUT_BALANCE", payload: newApeoutBalance });
      dispatch({ type: "SET_STAKED_AMOUNT", payload: newStakedAmount });
    } catch (error) {
      console.error("Staking failed:", error);
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Unstake tokens
  const unstakeTokens = async (amount: number): Promise<void> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // TODO: Implement actual unstaking program call
      console.log("Unstaking", amount, "APEOUT tokens");

      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update balances (mock)
      const newApeoutBalance = (state.apeoutBalance || 0) + amount;
      const newStakedAmount = Math.max(0, (state.stakedAmount || 0) - amount);

      dispatch({ type: "SET_APEOUT_BALANCE", payload: newApeoutBalance });
      dispatch({ type: "SET_STAKED_AMOUNT", payload: newStakedAmount });
    } catch (error) {
      console.error("Unstaking failed:", error);
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Claim LP rewards
  const claimLPRewards = async (
    tokenMint: PublicKey,
    userBalance: number,
    totalSupply: number
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // TODO: Implement actual LP rewards claim using holder_distribution.rs
      console.log("Claiming LP rewards for token:", tokenMint.toString());

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const claimKey = `LP_${tokenMint.toString()}`;
      dispatch({ type: "ADD_CLAIMED_REWARD", payload: claimKey });

      // Return mock transaction hash
      return "5j7GcZ3rK9L4mVxNpQrT8wE1fYhBs2nAcXdR6vU4pW3Q";
    } catch (error) {
      console.error("LP claim failed:", error);
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Claim fee rewards
  const claimFeeRewards = async (
    dayId: number,
    userBalance: number,
    totalSupply: number
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // TODO: Implement actual fee rewards claim using fee_rewards.rs
      console.log("Claiming fee rewards for day:", dayId);

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const claimKey = `FEE_${dayId}`;
      dispatch({ type: "ADD_CLAIMED_REWARD", payload: claimKey });

      // Return mock transaction hash
      return "8k2HfL9mR5N7qYxPwBtE6sZ3vU1nAjXcK4gT7rW9dF5M";
    } catch (error) {
      console.error("Fee claim failed:", error);
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // NEW: Claim dead token LP rewards
  const claimDeadTokenLP = async (
    tokenMint: PublicKey,
    amount: number
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // TODO: Implement actual dead token LP claim using lp_custody_with_tracker.rs
      console.log(
        "Claiming dead token LP for:",
        tokenMint.toString(),
        "Amount:",
        amount
      );

      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const claimKey = `DEAD_LP_${tokenMint.toString()}`;
      dispatch({ type: "ADD_CLAIMED_REWARD", payload: claimKey });

      // Return mock transaction hash
      return "3hQXYZ123fakeTXexampleHashDEADLP";
    } catch (error) {
      console.error("Dead token LP claim failed:", error);
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // NEW: Swap SOL for tokens
  const swapSOLForToken = async (
    tokenMint: PublicKey,
    solAmount: number
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      // TODO: Implement actual swap call to your AMM
      console.log(
        "Swapping",
        solAmount,
        "SOL for token:",
        tokenMint.toString()
      );

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Return mock transaction hash
      return "3hQXYZ123fakeTXexampleHashSWAP";
    } catch (error) {
      console.error("Swap failed:", error);
      throw error;
    }
  };

  // NEW: Swap tokens for SOL
  const swapTokenForSOL = async (
    tokenMint: PublicKey,
    tokenAmount: number
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      // TODO: Implement actual swap call to your AMM
      console.log(
        "Swapping",
        tokenAmount,
        "tokens for SOL. Token:",
        tokenMint.toString()
      );

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Return mock transaction hash
      return "3hQXYZ123fakeTXexampleHashSWAP";
    } catch (error) {
      console.error("Swap failed:", error);
      throw error;
    }
  };

  // NEW: Check token status (Active/Warning/Dead)
  const checkTokenStatus = async (
    tokenMint: PublicKey
  ): Promise<"Active" | "Warning" | "Dead"> => {
    try {
      // TODO: Implement actual status check using project_status_tracker.rs
      console.log("Checking status for token:", tokenMint.toString());

      // Mock logic based on token mint for demo
      const mintString = tokenMint.toString();
      if (mintString.includes("dead") || Math.random() < 0.2) {
        return "Dead";
      } else if (Math.random() < 0.3) {
        return "Warning";
      } else {
        return "Active";
      }
    } catch (error) {
      console.error("Status check failed:", error);
      return "Active"; // Default to active on error
    }
  };

  // NEW: Get all project statuses for the dashboard
  const getProjectStatuses = async (): Promise<any[]> => {
    try {
      // TODO: Implement actual API call to get all project statuses
      console.log("Fetching all project statuses");

      // Mock data for now - using valid PublicKey strings
      const mockProjects = [
        {
          tokenMint: "So11111111111111111111111111111111111112",
          name: "DEADAPE",
          symbol: "DAPE",
          status: "Dead",
          lpPool: 45.5,
          userLPClaim: 2.34,
          ageInDays: 8,
          volume3d: 8.2,
          lastTradeTime: Date.now() - 86400000 * 2,
          athPrice: 0.089,
          currentPrice: 0.002,
          priceDropPercent: 97.8,
          holders: 342,
          canClaimLP: true,
          lpClaimDeadline: Date.now() + 86400000 * 30,
        },
        {
          tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          name: "WARNFROG",
          symbol: "WFROG",
          status: "Warning",
          lpPool: 23.1,
          userLPClaim: 0,
          ageInDays: 6,
          volume3d: 12.8,
          lastTradeTime: Date.now() - 86400000 * 0.8,
          athPrice: 0.045,
          currentPrice: 0.004,
          priceDropPercent: 91.1,
          holders: 198,
          canClaimLP: false,
        },
        {
          tokenMint: "So11111111111111111111111111111111111112",
          name: "APEOUT",
          symbol: "APEOUT",
          status: "Active",
          lpPool: 156.7,
          userLPClaim: 0,
          ageInDays: 2,
          volume3d: 89.4,
          lastTradeTime: Date.now() - 300000,
          athPrice: 0.067,
          currentPrice: 0.055,
          priceDropPercent: 17.9,
          holders: 1247,
          canClaimLP: false,
        },
      ];

      return mockProjects;
    } catch (error) {
      console.error("Failed to fetch project statuses:", error);
      return [];
    }
  };

  // Set error
  const setError = (error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  };

  // Effect to refresh balances when wallet connects/disconnects
  useEffect(() => {
    if (publicKey) {
      refreshBalances();
    } else {
      // Reset state when wallet disconnects
      dispatch({ type: "RESET_STATE" });
    }
  }, [publicKey]);

  const contextValue: AppContextType = {
    state,
    stakeTokens,
    unstakeTokens,
    claimLPRewards,
    claimFeeRewards,
    claimDeadTokenLP, // NEW
    swapSOLForToken, // NEW
    swapTokenForSOL, // NEW
    checkTokenStatus, // NEW
    getProjectStatuses, // NEW
    setError,
    refreshBalances,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
