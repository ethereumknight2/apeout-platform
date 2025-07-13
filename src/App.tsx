import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import TrendingTicker from "./components/TrendingTicker";
import TokenDiscovery from "./components/TokenDiscovery";
import WalletConnectHeader from "./components/WalletConnectHeader";
import SwapInterface from "./components/SwapInterface";
import LaunchToken from "./components/TokenLaunch";
import TokenDetail from "./components/TokenDetailPage";
import LiveLaunchFeed from "./components/LiveLaunchFeed";
import DoomCountdown from "./components/DoomCountdown";
import ProjectStatusDashboard from "./components/ProjectStatusDashboard";

// Enhanced components with real blockchain integration
import ApeoutStakingDashboard from "./components/ApeoutStakingDashboard"; // Enhanced
import EnhancedLPClaim from "./components/EnhancedLPClaim"; // Enhanced
import EnhancedFeeRewards from "./components/EnhancedFeeRewards"; // Enhanced
import DailyApeOutAwards from "./components/DailyApeOutAwards"; // Enhanced

import { AppProvider } from "./context/AppContext";

import "./styles.css";

// Type definitions - Updated to include awards
type ViewType = "dashboard" | "trade" | "status" | "launch" | "awards";

// Fixed PublicKey creation with proper error handling
let APEOUT_TOKEN_MINT: PublicKey;
let SAMPLE_TOKEN_MINT: PublicKey;

try {
  const apeoutMintEnv = import.meta.env.VITE_APEOUT_TOKEN_MINT;
  console.log("VITE_APEOUT_TOKEN_MINT =", apeoutMintEnv);

  if (!apeoutMintEnv || apeoutMintEnv.length < 32) {
    throw new Error("Missing or malformed APEOUT_TOKEN_MINT");
  }
  APEOUT_TOKEN_MINT = new PublicKey(apeoutMintEnv);
} catch (e) {
  console.error("Invalid APEOUT_TOKEN_MINT in .env:", e);
  // Fallback to USDC if env var fails
  APEOUT_TOKEN_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
}

// Sample token is wrapped SOL
try {
  SAMPLE_TOKEN_MINT = new PublicKey("So11111111111111111111111111111111111112");
} catch (e) {
  console.error("Error creating SAMPLE_TOKEN_MINT:", e);
  // This shouldn't fail, but just in case
  SAMPLE_TOKEN_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
}

// Mock token data for SwapInterface component
const mockTokenData = {
  name: "ApeOut Token",
  symbol: "APEOUT",
  price: 0.045,
  volume24h: 156.7,
  holders: 1247,
  marketCap: 450000,
  status: "Active" as const,
  lpPool: 89.4,
  ageInDays: 2,
};

function App() {
  // State using React.useState to avoid conflicts
  const [activeView, setActiveView] = React.useState<ViewType>("dashboard");
  const [selectedTokenDetail, setSelectedTokenDetail] = React.useState<
    string | null
  >(null);

  const handleTokenClick = (tokenId: string) => {
    // Handle token click - show detailed view
    console.log("Token clicked:", tokenId);
    setSelectedTokenDetail(tokenId);
    setActiveView("trade"); // Switch to trade view to show token details
  };

  const handleBackToDiscovery = () => {
    setSelectedTokenDetail(null);
    setActiveView("dashboard");
  };

  return (
    <AppProvider>
      <div className="app">
        <WalletConnectHeader />

        {/* Live Launch Feed - shows across all views */}
        <LiveLaunchFeed />

        <h1 className="main-title">🦍 Welcome to ApeOut</h1>

        <div className="app-navigation">
          <button
            className={`nav-btn ${activeView === "launch" ? "active" : ""}`}
            onClick={() => setActiveView("launch")}
          >
            🚀 Create Token
          </button>
          <button
            className={`nav-btn ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            🔍 Discover Tokens
          </button>
          <button
            className={`nav-btn ${activeView === "trade" ? "active" : ""}`}
            onClick={() => setActiveView("trade")}
          >
            💱 Trade
          </button>
          <button
            className={`nav-btn ${activeView === "awards" ? "active" : ""}`}
            onClick={() => setActiveView("awards")}
          >
            🏆 Daily Awards
          </button>
          <button
            className={`nav-btn ${activeView === "status" ? "active" : ""}`}
            onClick={() => setActiveView("status")}
          >
            🔍 Project Status
          </button>
        </div>

        {activeView === "launch" && (
          <section className="section">
            <LaunchToken />
          </section>
        )}

        {activeView === "dashboard" && (
          <>
            {/* Trending Tokens Ticker at the top */}
            <TrendingTicker />

            {/* Main Token Discovery - this is now the primary content */}
            <section className="section token-discovery-main">
              <TokenDiscovery onTokenClick={handleTokenClick} />
            </section>

            {/* Doom Countdown - Critical alerts */}
            <DoomCountdown />

            {/* Secondary sections in a grid layout - NOW WITH ENHANCED COMPONENTS */}
            <div className="secondary-sections">
              <section className="section">
                <h2>💰 Claim LP Rewards</h2>
                <EnhancedLPClaim />
              </section>

              <section className="section">
                <h2>🔥 Enhanced Fee Rewards</h2>
                <EnhancedFeeRewards dayId={Math.floor(Date.now() / 86400000)} />
              </section>

              <section className="section">
                <h2>🦍 $APEOUT Staking</h2>
                <ApeoutStakingDashboard tokenMint={APEOUT_TOKEN_MINT} />
              </section>
            </div>
          </>
        )}

        {activeView === "trade" && (
          <>
            {selectedTokenDetail ? (
              <TokenDetail
                tokenId={selectedTokenDetail}
                onBack={handleBackToDiscovery}
              />
            ) : (
              <section className="section">
                <h2>💱 Token Trading</h2>

                <SwapInterface
                  tokenMint={APEOUT_TOKEN_MINT}
                  tokenSymbol={mockTokenData.symbol}
                  tokenName={mockTokenData.name}
                  tokenPrice={mockTokenData.price}
                />
              </section>
            )}
          </>
        )}

        {/* ENHANCED AWARDS VIEW - Now uses real blockchain data */}
        {activeView === "awards" && (
          <section className="section full-width">
            <DailyApeOutAwards />
          </section>
        )}

        {/* CLEAN PROJECT STATUS VIEW - Just the main dashboard */}
        {activeView === "status" && (
          <section className="section">
            <ProjectStatusDashboard />
          </section>
        )}

        <footer className="footer">
          <div className="footer-content">
            <p>
              ApeOut Platform — Revolutionary token launch with automatic LP
              redistribution
            </p>
            <div className="footer-stats">
              <span>🔒 100% LP Locked</span>
              <span>💀 Auto Death Detection</span>
              <span>🎁 Fair Redistribution</span>
              <span>🚀 No Rug Pulls</span>
              <span>🏆 Daily SOL Awards</span>
            </div>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}

export default App;