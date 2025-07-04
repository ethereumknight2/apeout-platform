import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAppContext } from "../context/AppContext";

const EnhancedStakingDashboard: React.FC = () => {
  const { connected } = useWallet();
  const { state } = useAppContext();

  const getTierProgress = () => {
    const staked = state.stakedAmount || 0;
    let nextTierThreshold = 100;
    let currentProgress = 0;

    if (staked >= 5000) {
      nextTierThreshold = 5000;
      currentProgress = 100;
    } else if (staked >= 1000) {
      nextTierThreshold = 5000;
      currentProgress = (staked / nextTierThreshold) * 100;
    } else if (staked >= 100) {
      nextTierThreshold = 1000;
      currentProgress = (staked / nextTierThreshold) * 100;
    } else {
      nextTierThreshold = 100;
      currentProgress = (staked / nextTierThreshold) * 100;
    }

    return {
      progress: Math.min(currentProgress, 100),
      nextThreshold: nextTierThreshold,
      tokensNeeded: Math.max(nextTierThreshold - staked, 0),
    };
  };

  const tierInfo = getTierProgress();

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Diamond":
        return "💎";
      case "Gold":
        return "🥇";
      case "Silver":
        return "🥈";
      case "Bronze":
        return "🥉";
      default:
        return "🔰";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Diamond":
        return "#b9f2ff";
      case "Gold":
        return "#ffd700";
      case "Silver":
        return "#c0c0c0";
      case "Bronze":
        return "#cd7f32";
      default:
        return "#44ff99";
    }
  };

  return (
    <div className="staking-dashboard enhanced">
      <h3>🦍 Staking Overview</h3>

      {connected ? (
        <div className="staking-content">
          <div className="current-status">
            <div className="status-card">
              <div className="tier-display">
                <span className="tier-icon">
                  {getTierIcon(state.userStakingTier)}
                </span>
                <div className="tier-info">
                  <h4>{state.userStakingTier} Tier</h4>
                  <p>{state.stakingMultiplier}x Multiplier</p>
                </div>
              </div>

              <div className="staked-amount">
                <label>Total Staked:</label>
                <span className="amount">{state.stakedAmount || 0} APEOUT</span>
              </div>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <h4>Progress to Next Tier</h4>
              <span className="progress-percent">
                {Math.round(tierInfo.progress)}%
              </span>
            </div>

            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  background: "#333",
                  width: "100%",
                  height: "16px",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  className="progress-fill"
                  style={{
                    background: `linear-gradient(90deg, ${getTierColor(
                      state.userStakingTier
                    )}, #44ff99)`,
                    width: `${tierInfo.progress}%`,
                    height: "100%",
                    borderRadius: "8px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {tierInfo.progress < 100 && (
              <div className="progress-details">
                <p>
                  <strong>
                    {tierInfo.tokensNeeded.toLocaleString()} more APEOUT
                  </strong>{" "}
                  needed for next tier
                </p>
                <small>
                  Next threshold: {tierInfo.nextThreshold.toLocaleString()}{" "}
                  APEOUT
                </small>
              </div>
            )}

            {tierInfo.progress >= 100 &&
              state.userStakingTier === "Diamond" && (
                <div className="max-tier">
                  <p>🎉 Congratulations! You've reached the highest tier!</p>
                </div>
              )}
          </div>

          <div className="tier-breakdown">
            <h4>All Staking Tiers</h4>
            <div className="tier-list">
              <div
                className={`tier-item ${
                  state.userStakingTier === "Bronze" ? "active" : ""
                }`}
              >
                <span className="tier-icon">🥉</span>
                <div className="tier-details">
                  <strong>Bronze</strong>
                  <span>0 - 99 APEOUT</span>
                  <span className="multiplier">1.0x rewards</span>
                </div>
              </div>

              <div
                className={`tier-item ${
                  state.userStakingTier === "Silver" ? "active" : ""
                }`}
              >
                <span className="tier-icon">🥈</span>
                <div className="tier-details">
                  <strong>Silver</strong>
                  <span>100 - 999 APEOUT</span>
                  <span className="multiplier">1.1x rewards</span>
                </div>
              </div>

              <div
                className={`tier-item ${
                  state.userStakingTier === "Gold" ? "active" : ""
                }`}
              >
                <span className="tier-icon">🥇</span>
                <div className="tier-details">
                  <strong>Gold</strong>
                  <span>1,000 - 4,999 APEOUT</span>
                  <span className="multiplier">1.5x rewards</span>
                </div>
              </div>

              <div
                className={`tier-item ${
                  state.userStakingTier === "Diamond" ? "active" : ""
                }`}
              >
                <span className="tier-icon">💎</span>
                <div className="tier-details">
                  <strong>Diamond</strong>
                  <span>5,000+ APEOUT</span>
                  <span className="multiplier">2.0x rewards</span>
                </div>
              </div>
            </div>
          </div>

          <div className="benefits-section">
            <h4>Staking Benefits</h4>
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">🎁</span>
                <div>
                  <strong>Trading Fee Rewards</strong>
                  <p>Earn daily SOL from platform trading fees</p>
                </div>
              </div>

              <div className="benefit-item">
                <span className="benefit-icon">💰</span>
                <div>
                  <strong>LP Token Claims</strong>
                  <p>Get LP tokens when projects become inactive</p>
                </div>
              </div>

              <div className="benefit-item">
                <span className="benefit-icon">📈</span>
                <div>
                  <strong>Reward Multipliers</strong>
                  <p>Higher tiers = bigger reward multipliers</p>
                </div>
              </div>

              <div className="benefit-item">
                <span className="benefit-icon">🏆</span>
                <div>
                  <strong>Priority Access</strong>
                  <p>Early access to new features and tokens</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="connect-prompt">
          <p>Please connect your wallet to view staking information.</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedStakingDashboard;
